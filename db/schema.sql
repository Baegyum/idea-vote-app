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
  vote_count    integer not null default 0,
  comment_count integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 목록 화면의 기본 정렬(인기순/최신순)을 인덱스로 받쳐준다
create index if not exists ideas_hot_idx     on public.ideas (vote_count desc, created_at desc);
create index if not exists ideas_recent_idx  on public.ideas (created_at desc);
create index if not exists ideas_status_idx  on public.ideas (status, created_at desc);

-- ------------------------------------------------------------
-- 3) votes : 한 사람이 한 아이디어에 딱 한 번만 투표
--    (idea_id, voter_id) 를 기본키로 잡아 중복 투표를 DB가 막는다.
-- ------------------------------------------------------------
create table if not exists public.votes (
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  voter_id   uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, voter_id)
);

-- ------------------------------------------------------------
-- 4) comments : 아이디어에 대한 의견
-- ------------------------------------------------------------
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  idea_id    uuid not null references public.ideas(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists comments_idea_idx on public.comments (idea_id, created_at);

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
create or replace function public.sync_vote_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.ideas set vote_count = vote_count + 1 where id = new.idea_id;
  elsif (tg_op = 'DELETE') then
    update public.ideas set vote_count = greatest(vote_count - 1, 0) where id = old.idea_id;
  end if;
  return null;
end $$;

drop trigger if exists votes_sync on public.votes;
create trigger votes_sync after insert or delete on public.votes
for each row execute function public.sync_vote_count();

create or replace function public.sync_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    update public.ideas set comment_count = comment_count + 1 where id = new.idea_id;
  elsif (tg_op = 'DELETE') then
    update public.ideas set comment_count = greatest(comment_count - 1, 0) where id = old.idea_id;
  end if;
  return null;
end $$;

drop trigger if exists comments_sync on public.comments;
create trigger comments_sync after insert or delete on public.comments
for each row execute function public.sync_comment_count();

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
alter table public.profiles enable row level security;
alter table public.ideas    enable row level security;
alter table public.votes    enable row level security;
alter table public.comments enable row level security;
alter table public.posts    enable row level security;

-- 읽기: 로그인한 사람은 전부 볼 수 있다
drop policy if exists "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "read ideas" on public.ideas;
create policy "read ideas" on public.ideas for select to authenticated using (true);
drop policy if exists "read votes" on public.votes;
create policy "read votes" on public.votes for select to authenticated using (true);
drop policy if exists "read comments" on public.comments;
create policy "read comments" on public.comments for select to authenticated using (true);
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

drop policy if exists "insert own vote" on public.votes;
create policy "insert own vote" on public.votes for insert to authenticated
  with check (voter_id = auth.uid());
drop policy if exists "delete own vote" on public.votes;
create policy "delete own vote" on public.votes for delete to authenticated
  using (voter_id = auth.uid());

drop policy if exists "insert own comment" on public.comments;
create policy "insert own comment" on public.comments for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists "delete own comment" on public.comments;
create policy "delete own comment" on public.comments for delete to authenticated
  using (author_id = auth.uid());

drop policy if exists "insert own post" on public.posts;
create policy "insert own post" on public.posts for insert to authenticated
  with check (author_id = auth.uid());
drop policy if exists "delete own post" on public.posts;
create policy "delete own post" on public.posts for delete to authenticated
  using (author_id = auth.uid());
