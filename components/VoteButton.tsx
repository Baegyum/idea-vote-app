"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * 투표 버튼. 서버 응답을 기다리지 않고 먼저 화면을 바꾸는 "낙관적 업데이트"를 쓴다.
 * 실패하면 원래 값으로 되돌린다.
 */
export default function VoteButton({
  ideaId,
  count,
  voted,
}: {
  ideaId: string;
  count: number;
  voted: boolean;
}) {
  const router = useRouter();
  const [optimistic, setOptimistic] = useState({ count, voted });
  const [pending, startTransition] = useTransition();

  async function toggle() {
    const next = { count: optimistic.voted ? optimistic.count - 1 : optimistic.count + 1, voted: !optimistic.voted };
    setOptimistic(next);

    const res = await fetch(`/api/ideas/${ideaId}/vote`, {
      method: next.voted ? "POST" : "DELETE",
    });

    if (!res.ok) {
      setOptimistic({ count, voted }); // 롤백
      const body = await res.json().catch(() => null);
      alert(body?.error?.message ?? "투표에 실패했습니다.");
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <button
      className={`vote ${optimistic.voted ? "on" : ""}`}
      onClick={toggle}
      disabled={pending}
      aria-pressed={optimistic.voted}
    >
      <strong>▲ {optimistic.count}</strong>
      <span>{optimistic.voted ? "투표함" : "투표"}</span>
    </button>
  );
}
