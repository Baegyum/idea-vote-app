import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type IdeaSummary, type Post, type Profile } from "@/lib/types";
import PeopleList, { type MemberSummary } from "@/components/PeopleList";
import PostForm from "@/components/PostForm";

export const dynamic = "force-dynamic";

/** 한 번에 읽어올 아이디어 수 상한. 팀이 커져도 홈이 끝없이 무거워지지 않게 막는다. */
const IDEA_LIMIT = 200;
/** 게시판은 최신 글 위주로만 본다. */
const POST_LIMIT = 30;

/**
 * 홈 = 왼쪽에 팀원 요약, 가운데에 자유 게시판.
 * 아이디어 자체는 팀원별 개수·표수로만 요약하고, 본문은 상세 화면에서 본다.
 */
export default async function HomePage() {
  const supabase = await createClient();

  // 서로를 기다릴 이유가 없는 요청들이라 한꺼번에 보낸다. 하나씩 기다리면 홈이 그만큼 느려진다.
  const [{ data: auth }, { data: members }, { data: ideas }, { data: posts }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      // 홈은 아이디어를 사람별로 접어 보여주지만, 각 아이디어는 상세페이지로
      // 클릭해 들어갈 수 있어야 하므로 id·title 도 함께 가져온다.
      .from("ideas")
      .select("id, author_id, title, vote_count, created_at")
      .order("created_at", { ascending: false })
      .limit(IDEA_LIMIT),
    supabase
      .from("posts")
      .select("id, author_id, title, body, created_at, profiles!posts_author_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(POST_LIMIT),
  ]);
  const user = auth.user;

  // 한 번 받아온 아이디어를 사람별로 접는다. 사람 수만큼 쿼리를 날리지 않기 위해서다.
  const summary = new Map<
    string,
    { ideaCount: number; voteCount: number; latestIdeaAt: string; ideas: { id: string; title: string }[] }
  >();
  for (const idea of (ideas ?? []) as IdeaSummary[]) {
    const prev = summary.get(idea.author_id);
    if (prev) {
      prev.ideaCount += 1;
      prev.voteCount += idea.vote_count;
      prev.ideas.push({ id: idea.id, title: idea.title });
      // 아이디어는 최신순으로 받아왔으므로 처음 만난 것이 가장 최근이다.
    } else {
      summary.set(idea.author_id, {
        ideaCount: 1,
        voteCount: idea.vote_count,
        latestIdeaAt: idea.created_at,
        ideas: [{ id: idea.id, title: idea.title }],
      });
    }
  }

  const team: MemberSummary[] = ((members ?? []) as Profile[]).map((m) => {
    const s = summary.get(m.id);
    return {
      id: m.id,
      display_name: m.display_name,
      ideaCount: s?.ideaCount ?? 0,
      voteCount: s?.voteCount ?? 0,
      latestIdeaAt: s?.latestIdeaAt ?? null,
      ideas: s?.ideas ?? [],
    };
  });

  const board = (posts as Post[] | null) ?? [];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/ideas/new" className="btn primary">
          + 아이디어 올리기
        </Link>
      </div>

      <div className="home">
        {!team.length ? (
          <p className="empty">로그인하면 팀원 목록이 보입니다.</p>
        ) : (
          <PeopleList members={team} />
        )}

        <section className="feed">
          <h2 className="feed-title">게시판</h2>
          {user ? <PostForm /> : <p className="meta">글을 쓰려면 로그인하세요.</p>}

          {!board.length && <p className="empty">아직 올라온 글이 없어요.</p>}

          {board.map((post) => (
            <article key={post.id} className="card">
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3>{post.title}</h3>
                <p className="meta">
                  {post.profiles?.display_name ?? "알 수 없음"} ·{" "}
                  {new Date(post.created_at).toLocaleDateString("ko-KR")}
                </p>
                {post.body && <p className="post-body">{post.body}</p>}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
