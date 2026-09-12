import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { STATUS_LABEL, STANCE_LABEL, type Idea, type Reaction } from "@/lib/types";
import ReactionForm from "@/components/ReactionForm";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({
  params,
}: {
  // Next.js 15부터 params는 Promise다.
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: idea } = await supabase
    .from("ideas")
    .select("*, profiles!ideas_author_id_fkey(display_name)")
    .eq("id", id)
    .single<Idea>();

  if (!idea) notFound();

  const { data } = await supabase
    .from("reactions")
    .select("*, profiles!reactions_user_id_fkey(display_name)")
    .eq("idea_id", id)
    .order("created_at", { ascending: true });

  const reactions = (data as Reaction[] | null) ?? [];
  // 내 것은 아래 폼이 이미 보여주므로, 목록에서는 남의 것만 나열한다.
  const mine = reactions.find((r) => r.user_id === user?.id) ?? null;
  const others = reactions.filter((r) => r.user_id !== user?.id);

  return (
    <main>
      <h2 style={{ margin: 0 }}>
        {idea.title}
        <span className="badge">{STATUS_LABEL[idea.status]}</span>
      </h2>
      <p className="meta">
        {idea.profiles?.display_name ?? "익명"} ·{" "}
        {new Date(idea.created_at).toLocaleString("ko-KR")}
      </p>

      <p style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>{idea.body || "(설명 없음)"}</p>

      <p className="tally">
        <span className="agree">👍 찬성 {idea.agree_count}</span>
        <span className="disagree">👎 반대 {idea.disagree_count}</span>
      </p>

      <h3 style={{ marginTop: 40 }}>팀원들의 의견 {others.length}</h3>
      {!others.length && <p className="empty">아직 다른 팀원이 남긴 의견이 없어요.</p>}
      {others.map((r) => (
        <div key={r.user_id} className={`card reaction ${r.stance}`} style={{ display: "block" }}>
          <p className="meta" style={{ margin: 0 }}>
            <span className={`stance-tag ${r.stance}`}>{STANCE_LABEL[r.stance]}</span>{" "}
            {r.profiles?.display_name ?? "익명"} ·{" "}
            {new Date(r.created_at).toLocaleString("ko-KR")}
            {r.updated_at > r.created_at && <span style={{ marginLeft: 4 }}>(수정됨)</span>}
          </p>
          <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{r.reason}</p>
        </div>
      ))}

      {user ? (
        <ReactionForm ideaId={idea.id} mine={mine} />
      ) : (
        <p className="meta">찬성·반대를 남기려면 로그인하세요.</p>
      )}
    </main>
  );
}
