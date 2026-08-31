"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 이메일 매직링크 로그인.
 * 비밀번호를 우리가 직접 보관하지 않으므로 초보 팀에게 가장 안전한 방식이다.
 */
export default function AuthButton({ email }: { email: string | null }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function signIn() {
    const input = window.prompt("로그인할 이메일 주소를 입력하세요");
    if (!input) return;

    setSending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: input,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setSending(false);

    if (error) alert(`로그인 링크 전송 실패: ${error.message}`);
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

  return (
    <button className="btn primary" onClick={signIn} disabled={sending}>
      {sending ? "보내는 중…" : "로그인"}
    </button>
  );
}
