import { notFound } from "next/navigation";
import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { STATUS_LABEL, type Comment, type Idea } from "@/lib/types";
import VoteButton from "@/components/VoteButton";
import CommentForm from "@/components/CommentForm";

export const dynamic = "force-dynamic";

export default async function IdeaDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await getCurrentUser();

  const { data: idea } = await supabase
    .from("ideas")
    .select("*, profiles(display_name)")
    .eq("id", params.id)
    .single<Idea>();

  if (!idea) notFound();

  const { data: comments } = await supabase
    .from("comments")
    .select("*, profiles(display_name)")
    .eq("idea_id", params.id)
    .order("created_at", { ascending: true });

  let voted = false;
  if (user) {
    const { data } = await supabase
      .from("votes")
      .select("idea_id")
      .eq("idea_id", params.id)
      .eq("voter_id", user.id)
      .maybeSingle();
    voted = !!data;
  }

  return (
    <main>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
        <VoteButton ideaId={idea.id} count={idea.vote_count} voted={voted} />
        <div>
          <h2 style={{ margin: 0 }}>
            {idea.title}
            <span className="badge">{STATUS_LABEL[idea.status]}</span>
          </h2>
          <p className="meta">
            {idea.profiles?.display_name ?? "익명"} ·{" "}
            {new Date(idea.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
      </div>

      <p style={{ whiteSpace: "pre-wrap", marginTop: 20 }}>{idea.body || "(설명 없음)"}</p>

      <h3 style={{ marginTop: 40 }}>의견 {comments?.length ?? 0}</h3>
      {(comments as Comment[] | null)?.map((c) => (
        <div key={c.id} className="card" style={{ display: "block" }}>
          <p className="meta" style={{ margin: 0 }}>
            {c.profiles?.display_name ?? "익명"} ·{" "}
            {new Date(c.created_at).toLocaleString("ko-KR")}
          </p>
          <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{c.body}</p>
        </div>
      ))}

      {user ? (
        <CommentForm ideaId={idea.id} />
      ) : (
        <p className="meta">의견을 남기려면 로그인하세요.</p>
      )}
    </main>
  );
}
