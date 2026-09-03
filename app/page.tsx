import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABEL, type IdeaSummary, type Profile } from "@/lib/types";
import VoteButton from "@/components/VoteButton";

export const dynamic = "force-dynamic";

/** 한 번에 읽어올 아이디어 수 상한. 팀이 커져도 홈이 끝없이 무거워지지 않게 막는다. */
const IDEA_LIMIT = 200;

/**
 * 홈 = 사람별 보드. 한 사람이 한 열을 차지해서, 누가 무엇을 냈는지 한눈에 보인다.
 * 열은 로그인한 적이 있는 사람(profiles에 행이 있는 사람)만큼 생긴다.
 */
export default async function HomePage() {
  const supabase = await createClient();

  // 서로를 기다릴 이유가 없는 세 요청이라 한꺼번에 보낸다. 하나씩 기다리면 홈이 그만큼 느려진다.
  const [{ data: auth }, { data: members }, { data: ideas }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("id, display_name").order("display_name"),
    supabase
      .from("ideas")
      .select("id, author_id, title, status, vote_count, comment_count")
      .order("created_at", { ascending: false })
      .limit(IDEA_LIMIT),
  ]);
  const user = auth.user;

  // 한 번 받아온 아이디어를 사람별로 나눠 담는다. 사람 수만큼 쿼리를 날리지 않기 위해서다.
  const byAuthor = new Map<string, IdeaSummary[]>();
  for (const idea of (ideas ?? []) as IdeaSummary[]) {
    const list = byAuthor.get(idea.author_id);
    if (list) list.push(idea);
    else byAuthor.set(idea.author_id, [idea]);
  }

  // 내가 투표한 아이디어 목록을 한 번의 쿼리로 가져와 표시에 반영한다.
  let myVotes = new Set<string>();
  if (user) {
    const { data } = await supabase.from("votes").select("idea_id").eq("voter_id", user.id);
    myVotes = new Set((data ?? []).map((v) => v.idea_id));
  }

  const team = (members ?? []) as Profile[];

  return (
    <main>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Link href="/ideas/new" className="btn primary">
          + 아이디어 올리기
        </Link>
      </div>

      {!team.length ? (
        <p className="empty">로그인하면 팀원별 아이디어 보드가 보입니다.</p>
      ) : (
        <div className="board">
          {team.map((member) => {
            const list = byAuthor.get(member.id) ?? [];
            const totalVotes = list.reduce((sum, idea) => sum + idea.vote_count, 0);

            return (
              <section key={member.id} className="column">
                <h3 className="owner">{member.display_name}</h3>
                <p className="meta">
                  아이디어 {list.length}개 · 받은 투표 {totalVotes}표
                </p>

                {!list.length && <p className="meta">아직 없어요.</p>}

                {list.map((idea) => (
                  <article key={idea.id} className="card">
                    <VoteButton
                      ideaId={idea.id}
                      count={idea.vote_count}
                      voted={myVotes.has(idea.id)}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link href={`/ideas/${idea.id}`}>
                        <h3>
                          {idea.title}
                          <span className="badge">{STATUS_LABEL[idea.status]}</span>
                        </h3>
                      </Link>
                      <p className="meta">댓글 {idea.comment_count}</p>
                    </div>
                  </article>
                ))}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
