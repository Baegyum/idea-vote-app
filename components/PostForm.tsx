"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    setSaving(false);

    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error?.message ?? "등록에 실패했습니다.");
      return;
    }
    setTitle("");
    setBody("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="post-form">
      <input
        placeholder="제목"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={80}
      />
      <textarea
        placeholder="팀에 공유할 내용을 적어주세요"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        style={{ minHeight: 90 }}
        maxLength={4000}
      />
      <button className="btn primary" disabled={saving || title.trim().length < 2}>
        {saving ? "올리는 중…" : "글 올리기"}
      </button>
    </form>
  );
}
