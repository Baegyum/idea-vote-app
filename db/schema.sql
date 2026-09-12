-- ============================================================
-- 아이디어 회의 앱 — 데이터베이스 스키마 (PostgreSQL / Supabase)
-- 실행 방법: Supabase 대시보드 > SQL Editor 에 붙여넣고 [Run]
-- ============================================================

-- ------------------------------------------------------------
-- 1) profiles : 로그인한 사람의 표시용 정보
--    Supabase의 auth.users 테이블(비밀번호 등 보관)을 직접 건드리지 않고,
--    화면에 보여줄 이름/아바타만 따로 보관한다.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 30),
  avatar_url  text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) ideas : 아이디어 본문
--    status 로 회의 단계를 관리한다 (백로그 → 논의중 → 채택 → 보류)
-- ------------------------------------------------------------
-- 이미 만들어져 있으면 건너뛴다. (이 파일을 두 번 실행해도 에러가 안 나게)
do $$ begin
  create type idea_status as enum ('backlog', 'discussing', 'adopted', 'parked');
exception when duplicate_object then null;
end $$;

create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  title       text not null check (char_length(title) between 2 and 80),
  body        text not null default '' check (char_length(body) <= 4000),
  status      idea_status not null default 'backlog',
  -- 집계 캐시: 매번 count(*) 하지 않고 트리거로 유지한다 (읽기 성능)
  agree_count    integer not null default 0,
  disagree_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 이미 만들어져 있던 DB 를 위한 정리. create table 은 표가 있으면 건너뛰므로
-- 투표·의견 시절의 칸은 여기서 직접 없애고, 찬성·반대 칸을 붙인다.
alter table public.ideas add column if not exists agree_count    integer not null default 0;
alter table public.ideas add column if not exists disagree_count integer not null default 0;
alter table public.ideas drop column if exists vote_count;
alter table public.ideas drop column if exists comment_count;

-- 인기순 정렬을 없앴으므로 그 인덱스도 지운다. 쓰지 않는 인덱스는 쓰기만 느리게 한다.
drop index if exists public.ideas_hot_idx;
create index if not exists ideas_recent_idx  on public.ideas (created_at desc);
create index if not exists ideas_status_idx  on public.ideas (status, created_at desc);

-- ------------------------------------------------------------
-- 3) reactions : 아이디어에 대한 찬성 / 반대와 그 이유
--
--    votes(투표)와 comments(의견)를 없애고 이 표 하나로 합쳤다. 찬성·반대는
--    이유 없이 세어봐야 왜 그런지 알 수 없고, 의견은 찬반과 따로 놀았기 때문이다.
--
--    (idea_id, user_id) 를 기본키로 잡아 한 사람이 한 아이디어에 하나만 남기게 한다.
--    그래서 "마음이 바뀌면 고친다"가 새 행이 아니라 이 행을 고치는 일이 된다.
--    reason 에 길이 제약을 걸어, 이유 없이 찬반만 누르는 것을 DB 가 막는다.
-- ------------------------------------------------------------
do $$ begin
  create type reaction_stance as enum ('agree', 'disagree');
exception when duplicate_object then null;
end $$;

create table if not exists public.reactions (
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  stance     reaction_stance not null,
  reason     text not null check (char_length(reason) between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

create index if not exists reactions_idea_idx on public.reactions (idea_id, created_at);

-- ------------------------------------------------------------
-- 3-1) 투표·의견 시절의 표 정리
--      ⚠️ 지금까지 쌓인 투표와 의견이 여기서 전부 사라진다. 되돌릴 수 없다.
--      트리거가 표를 붙잡고 있으므로 트리거 → 함수 → 표 순서로 지운다.
-- ------------------------------------------------------------
drop trigger if exists votes_sync    on public.votes;
drop trigger if exists comments_sync on public.comments;
drop function if exists public.sync_vote_count();
drop function if exists public.sync_comment_count();
drop table if exists public.votes;
drop table if exists public.comments;

-- ------------------------------------------------------------
-- 4-1) posts : 아이디어와 별개인 자유 게시판 (공지·잡담)
--      투표나 회의 단계가 없는 글이라 ideas 와 섞지 않고 따로 둔다.
-- ------------------------------------------------------------
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  title      text not null check (char_length(title) between 2 and 80),
  body       text not null default '' check (char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists posts_recent_idx on public.posts (created_at desc);

-- ------------------------------------------------------------
-- 5) 집계 캐시를 자동으로 맞춰주는 트리거
-- ------------------------------------------------------------
-- 찬성·반대 개수를 ideas 에 맞춰 둔다.
--
-- 넣기·지우기만 있던 투표와 달리, 찬성 → 반대로 "바꾸는" 일이 있다. 그래서
-- UPDATE 도 받아 옛 쪽은 하나 빼고 새 쪽은 하나 더한다. 이유만 고친 경우에는
-- stance 가 그대로라 아무것도 움직이지 않는다.
create or replace function public.sync_reaction_counts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op <> 'INSERT') then
    if (old.stance = 'agree') then
      update public.ideas set agree_count = greatest(agree_count - 1, 0) where id = old.idea_id;
    else
      update public.ideas set disagree_count = greatest(disagree_count - 1, 0) where id = old.idea_id;
    end if;
  end if;

  if (tg_op <> 'DELETE') then
    if (new.stance = 'agree') then
      update public.ideas set agree_count = agree_count + 1 where id = new.idea_id;
    else
      update public.ideas set disagree_count = disagree_count + 1 where id = new.idea_id;
    end if;
  end if;

  return null;
end $$;

drop trigger if exists reactions_sync on public.reactions;
create trigger reactions_sync after insert or update or delete on public.reactions
for each row execute function public.sync_reaction_counts();

-- 회원가입하면 profiles 행을 자동 생성
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 6) RLS(Row Level Security) — "누가 무엇을 할 수 있는가"를 DB가 강제
--    프런트엔드 코드를 우회해도 뚫리지 않는 마지막 방어선.
-- ------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.ideas     enable row level security;
alter table public.reactions enable row level security;
alter table public.posts     enable row level security;

-- 읽기: 로그인한 사람은 전부 볼 수 있다
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "read ideas" on public.ideas;
create policy "read ideas" on public.ideas for select to authenticated using (true);
drop policy if exists "read reactions" on public.reactions;
create policy "read reactions" on public.reactions for select to authenticated using (true);
drop policy if exists "read posts" on public.posts;
create policy "read posts" on public.posts for select to authenticated using (true);

-- 쓰기: 본인 것만
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "insert own idea" on public.ideas;
create policy "insert own idea" on public.ideas for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists "update own idea" on public.ideas;
create policy "update own idea" on public.ideas for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists "delete own idea" on public.ideas;
create policy "delete own idea" on public.ideas for delete to authenticated
  using (author_id = auth.uid());

-- 찬반은 남의 것을 대신 남기거나 고칠 수 없다. 세 가지를 모두 본인으로 묶는다.
drop policy if exists "insert own reaction" on public.reactions;
create policy "insert own reaction" on public.reactions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "update own reaction" on public.reactions;
create policy "update own reaction" on public.reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own reaction" on public.reactions;
create policy "delete own reaction" on public.reactions for delete to authenticated
  using (user_id = auth.uid());

-- 글 지우기 규칙은 아직 넣지 않는다. 지우는 화면이 없어서 쓰이지 않는 권한이 되고,
-- 스키마 변경은 규민의 승인을 거치므로 실제로 필요해질 때 같이 올린다.
drop policy if exists "insert own post" on public.posts;
create policy "insert own post" on public.posts for insert to authenticated
  with check (author_id = auth.uid());
