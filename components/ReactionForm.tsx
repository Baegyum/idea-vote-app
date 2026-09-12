"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STANCE_LABEL, type Reaction, type Stance } from "@/lib/types";

/**
 * 내 찬반과 이유를 남기고 고치는 곳.
 *
 * 찬반 버튼만 먼저 눌러 끝낼 수 없게, 버튼과 이유 칸을 한 폼 안에 둔다.
 * 버튼은 "무엇을 저장할지" 고르는 것이고, 저장은 이유가 채워져야 열린다.
 */
export default function ReactionForm({ ideaId, mine }: { ideaId: string; mine: Reaction | null }) {
  const router = useRouter();
  const [stance, setStance] = useState<Stance | null>(mine?.stance ?? null);
  const [reason, setReason] = useState(mine?.reason ?? "");
  const [busy, setBusy] = useState(false);

  async function send(init: RequestInit, failMessage: string) {
    setBusy(true);
    const res = await fetch(`/api/ideas/${ideaId}/reaction`, init);
    setBusy(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error?.message ?? failMessage);
      return;
    }
    router.refresh();
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!stance) return;
    void send(
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stance, reason }),
      },
      "저장에 실패했습니다.",
    );
  }

  function remove() {
    // 무르면 이유까지 함께 사라지므로 한 번 물어본다.
    if (!confirm("남긴 찬반과 이유를 무를까요? 되돌릴 수 없어요.")) return;
    setStance(null);
    setReason("");
    void send({ method: "DELETE" }, "무르기에 실패했습니다.");
  }

  return (
    <form onSubmit={save} className="reaction-form">
      <h3>{mine ? "내 의견 고치기" : "이 아이디어에 대한 내 의견"}</h3>

      <div className="stance-picker">
        {(["agree", "disagree"] as Stance[]).map((s) => (
          <button
            key={s}
            type="button"
            className={`btn stance ${s} ${stance === s ? "on" : ""}`}
            aria-pressed={stance === s}
            onClick={() => setStance(s)}
            disabled={busy}
          >
            {s === "agree" ? "👍" : "👎"} {STANCE_LABEL[s]}
          </button>
        ))}
      </div>

      <textarea
        placeholder={
          stance
            ? `${STANCE_LABEL[stance]}하는 이유를 적어주세요`
            : "찬성이나 반대를 고르면 이유를 적을 수 있어요"
        }
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        disabled={!stance || busy}
        maxLength={1000}
        style={{ minHeight: 90 }}
      />

      <div className="reaction-actions">
        {/* 이유 없이 찬반만 남기는 것을 여기서 막는다. DB 에도 같은 제약이 걸려 있다. */}
        <button className="btn primary" disabled={!stance || !reason.trim() || busy}>
          {busy ? "저장 중…" : mine ? "고치기" : "남기기"}
        </button>
        {mine && (
          <button type="button" className="btn" onClick={remove} disabled={busy}>
            무르기
          </button>
        )}
      </div>
    </form>
  );
}
