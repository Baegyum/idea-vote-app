import Link from "next/link";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { STATUS_LABEL, type Idea } from "@/lib/types";
import VoteButton from "@/components/VoteButton";

export const dynamic = "force-dynamic";

/** 홈 = 아이디어 목록. 서버 컴포넌트라 DB에서 직접 읽어 HTML로 내려준다(빠르고 SEO에 유리). */
export default async function HomePage({
  searchParams,
}: {
  // Next.js 15부터 searchParams도 Promise다.
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: sortParam } = await searchParams;
  const sort = sortParam === "recent" ? "recent" : "hot";
  const supabase = await createClient();
  const user = await getCurrentUser();

  let query = supabase.from("ideas").select("*, profiles!ideas_author_id_fkey(display_name)").limit(30);
  query =
    sort === "hot"
      ? query.order("vote_count", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  const { data: ideas } = await query;

  // 내가 투표한 아이디어 목록을 한 번의 쿼리로 가져와 표시에 반영한다.
  let myVotes = new Set<string>();
  if (user) {
    const { data } = await supabase.from("votes").select("idea_id").eq("voter_id", user.id);
    myVotes = new Set((data ?? []).map((v) => v.idea_id));
  }

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="tabs">
          <Link href="/" className={sort === "hot" ? "on" : ""}>
            인기순
          </Link>
          <Link href="/?sort=recent" className={sort === "recent" ? "on" : ""}>
            최신순
          </Link>
        </div>
        <Link href="/ideas/new" className="btn primary">
          + 아이디어 올리기
        </Link>
      </div>

      {!ideas?.length && (
        <p className="empty">아직 아이디어가 없어요. 첫 번째로 올려보세요!</p>
      )}

      {(ideas as Idea[] | null)?.map((idea) => (
        <article key={idea.id} className="card">
          <VoteButton ideaId={idea.id} count={idea.vote_count} voted={myVotes.has(idea.id)} />
          <div style={{ flex: 1 }}>
            <Link href={`/ideas/${idea.id}`}>
              <h3>
                {idea.title}
                <span className="badge">{STATUS_LABEL[idea.status]}</span>
              </h3>
            </Link>
            <p className="meta">
              {idea.profiles?.display_name ?? "익명"} · 댓글 {idea.comment_count} ·{" "}
              {new Date(idea.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </article>
      ))}
    </main>
  );
}
