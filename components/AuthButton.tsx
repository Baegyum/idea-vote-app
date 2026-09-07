"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * 머리말 오른쪽의 로그인 상태 표시.
 *
 * 로그인 자체는 /login 화면이 맡는다. 여기서 입력을 받지 않는 이유는
 * 비밀번호를 가려서 받으려면 제대로 된 폼이 필요하기 때문이다.
 */
export default function AuthButton({ username }: { username: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 서버 컴포넌트가 로그아웃 상태를 다시 읽게 한다.
    router.refresh();
  }

  if (username) {
    return (
      <div className="meta">
        {username}{" "}
        <button className="btn" onClick={signOut} style={{ marginLeft: 8 }}>
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <Link className="btn primary" href="/login">
      로그인
    </Link>
  );
}
