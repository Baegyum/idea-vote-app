"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewIdeaPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json?.error?.message ?? "저장에 실패했습니다.");
      return;
    }
    router.push(`/ideas/${json.data.id}`);
    router.refresh();
  }

  return (
    <main>
      <h2>새 아이디어</h2>
      <form onSubmit={submit}>
        <input
          placeholder="한 줄로 요약하면? (예: 동네 러닝 메이트 매칭 앱)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          required
        />
        <textarea
          placeholder={"어떤 문제를 푸나요?\n누가 쓰나요?\n왜 지금인가요?"}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
        />
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button className="btn primary" disabled={saving || title.trim().length < 2}>
          {saving ? "저장 중…" : "등록하기"}
        </button>
      </form>
    </main>
  );
}
