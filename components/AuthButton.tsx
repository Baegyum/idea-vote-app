"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signInSchema } from "@/lib/validation";

/**
 * 이메일 매직링크 로그인.
 * 비밀번호를 우리가 직접 보관하지 않으므로 초보 팀에게 가장 안전한 방식이다.
 *
 * 이메일은 화면 안 입력칸으로 받는다. window.prompt() 는 앱 안에 들어 있는
 * 브라우저(카톡 등)와 일부 모바일 브라우저에서 차단되고, 그때 버튼이 아무 반응도
 * 하지 않아 "로그인이 고장났다"로 보인다.
 */
export default function AuthButton({ email }: { email: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function signIn(e: FormEvent) {
    e.preventDefault();

    const parsed = signInSchema.safeParse({ email: input });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setError(null);
    setSending(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);

    if (sendError) setError(`로그인 링크 전송 실패: ${sendError.message}`);
    else setSent(true);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  if (email) {
    return (
      <div className="meta">
        {email}{" "}
        <button className="btn" onClick={signOut} style={{ marginLeft: 8 }}>
          로그아웃
        </button>
      </div>
    );
  }

  if (sent) return <span className="meta">메일함에서 로그인 링크를 확인하세요 ✉️</span>;

  if (!open) {
    return (
      <button className="btn primary" onClick={() => setOpen(true)}>
        로그인
      </button>
    );
  }

  return (
    <form className="signin" onSubmit={signIn} noValidate>
      <input
        type="email"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="이메일 주소"
        aria-label="로그인할 이메일 주소"
        autoFocus
        disabled={sending}
      />
      <button className="btn primary" type="submit" disabled={sending}>
        {sending ? "보내는 중…" : "링크 받기"}
      </button>
      {error && <p className="signin-error">{error}</p>}
    </form>
  );
}
