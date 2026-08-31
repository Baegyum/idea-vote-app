"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ ideaId }: { ideaId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/ideas/${ideaId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error?.message ?? "등록에 실패했습니다.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 16 }}>
      <textarea
        placeholder="이 아이디어에 대한 의견을 남겨주세요"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ minHeight: 90 }}
        maxLength={1000}
      />
      <button className="btn primary" disabled={saving || !body.trim()}>
        {saving ? "등록 중…" : "의견 남기기"}
      </button>
    </form>
  );
}
