"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Comment } from "@/lib/types";

/**
 * 의견 한 개. 내가 쓴 것이면 수정·삭제 버튼이 보인다.
 * 남이 쓴 것과 같은 모양을 써야 하므로, 버튼 유무만 다르고 나머지는 똑같이 그린다.
 */
export default function CommentItem({ comment, mine }: { comment: Comment; mine: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);
  const [busy, setBusy] = useState(false);

  // 처음 저장될 때 DB가 두 시각에 같은 값을 넣는다. 그래서 더 나중이면 고친 것이다.
  const edited = comment.updated_at > comment.created_at;

  /** 수정과 삭제가 똑같이 반복하는 부분(보내기 → 실패하면 알림 → 화면 새로 그리기). */
  async function send(init: RequestInit, failMessage: string) {
    setBusy(true);
    const res = await fetch(`/api/ideas/${comment.idea_id}/comments/${comment.id}`, init);
    setBusy(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error?.message ?? failMessage);
      return false;
    }
    router.refresh();
    return true;
  }

  async function save() {
    const done = await send(
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      },
      "수정에 실패했습니다.",
    );
    // 실패했으면 고치던 화면을 그대로 둔다. 쓴 내용을 잃지 않게 하기 위해서다.
    if (done) setEditing(false);
  }

  async function remove() {
    // 지우면 되돌릴 수 없으므로 한 번 물어본다.
    if (!confirm("이 의견을 지울까요? 되돌릴 수 없어요.")) return;
    await send({ method: "DELETE" }, "삭제에 실패했습니다.");
  }

  function cancel() {
    setBody(comment.body); // 고치다 만 내용은 버리고 원래 글로 되돌린다
    setEditing(false);
  }

  return (
    <div className="card" style={{ display: "block" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <p className="meta" style={{ margin: 0, flex: 1, minWidth: 0 }}>
          {comment.profiles?.display_name ?? "익명"} ·{" "}
          {new Date(comment.created_at).toLocaleString("ko-KR")}
          {edited && <span style={{ marginLeft: 4 }}>(수정됨)</span>}
        </p>

        {mine && !editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn" onClick={() => setEditing(true)} disabled={busy}>
              수정
            </button>
            <button className="btn" onClick={remove} disabled={busy}>
              {busy ? "처리 중…" : "삭제"}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{ minHeight: 80, marginTop: 8 }}
            maxLength={1000}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <button className="btn primary" onClick={save} disabled={busy || !body.trim()}>
              {busy ? "저장 중…" : "저장"}
            </button>
            <button className="btn" onClick={cancel} disabled={busy}>
              취소
            </button>
          </div>
        </>
      ) : (
        <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{comment.body}</p>
      )}
    </div>
  );
}
