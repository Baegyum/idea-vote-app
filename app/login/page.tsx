"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { credentialsSchema, signUpSchema } from "@/lib/validation";
import { usernameToEmail } from "@/lib/auth";

type Mode = "signin" | "signup";

/**
 * 아이디·비밀번호 로그인 화면.
 *
 * 예전에는 window.prompt 로 이메일을 받아 매직링크를 보냈다. 두 가지가 문제였다.
 * 메일 발송이 한 시간에 몇 통으로 제한돼 팀원들이 로그인 자체를 못 했고,
 * prompt 창은 입력한 글자가 그대로 보여서 비밀번호를 받을 수 없다.
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "signup";

  /** 모드를 바꿀 때 비밀번호는 지운다. 남아 있으면 어느 쪽에 친 값인지 헷갈린다. */
  function switchTo(next: Mode) {
    setMode(next);
    setPassword("");
    setPasswordConfirm("");
    setError(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // 화면에서 먼저 걸러도 API 쪽 검증은 그대로 살아 있다. 여기서 막는 건
    // 서버까지 다녀오지 않고 바로 알려주기 위해서다.
    const parsed = isSignUp
      ? signUpSchema.safeParse({ username, password, passwordConfirm })
      : credentialsSchema.safeParse({ username, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const email = usernameToEmail(parsed.data.username);

    if (isSignUp) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: parsed.data.password,
        // DB가 표시 이름을 자동으로 만들어 주지만, 여기서 명시해 두면
        // 나중에 DB 쪽 규칙이 바뀌어도 이름이 엉뚱해지지 않는다.
        options: { data: { display_name: parsed.data.username } },
      });
      setBusy(false);

      if (signUpError) {
        setError(toKorean(signUpError.message));
        return;
      }
      // 가입은 됐는데 로그인 상태가 아니면, Supabase가 계정 확인을 요구하는 설정이다.
      if (!data.session) {
        setError(
          "가입은 됐는데 바로 로그인이 되지 않았어요. 규민에게 Supabase의 '이메일 확인(Confirm email)' 설정을 꺼달라고 해주세요.",
        );
        return;
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: parsed.data.password,
      });
      setBusy(false);

      if (signInError) {
        setError(toKorean(signInError.message));
        return;
      }
    }

    // 서버 컴포넌트가 로그인 상태를 다시 읽도록 새로고침한 뒤 홈으로 보낸다.
    router.replace("/");
    router.refresh();
  }

  return (
    <main style={{ maxWidth: 380, margin: "32px auto" }}>
      <div className="modes">
        <button
          type="button"
          className={isSignUp ? "" : "on"}
          onClick={() => switchTo("signin")}
          aria-pressed={!isSignUp}
        >
          로그인
        </button>
        <button
          type="button"
          className={isSignUp ? "on" : ""}
          onClick={() => switchTo("signup")}
          aria-pressed={isSignUp}
        >
          회원가입
        </button>
      </div>

      <h2 style={{ fontSize: 19, margin: "0 0 6px" }}>
        {isSignUp ? "아이디 새로 만들기" : "아이디로 들어가기"}
      </h2>
      <p className="meta" style={{ marginTop: 0, marginBottom: 22 }}>
        {isSignUp
          ? "쓸 아이디와 비밀번호를 정해주세요. 팀원들에게는 아이디만 보입니다."
          : "이미 만들어 둔 아이디와 비밀번호를 입력해주세요."}
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="username" className="meta field">
          아이디
        </label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={isSignUp ? "영문 소문자와 숫자, 3~20자" : "아이디"}
          autoComplete="username"
          autoCapitalize="none"
          autoFocus
        />

        <label htmlFor="password" className="meta field">
          비밀번호
        </label>
        <input
          id="password"
          name="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isSignUp ? "6자 이상" : "비밀번호"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
        />

        {isSignUp && (
          <>
            <label htmlFor="passwordConfirm" className="meta field">
              비밀번호 확인
            </label>
            <input
              id="passwordConfirm"
              name="passwordConfirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="위와 똑같이 한 번 더"
              autoComplete="new-password"
            />
          </>
        )}

        {error && (
          <p
            role="alert"
            className="meta"
            style={{ color: "var(--accent)", marginTop: 0, marginBottom: 14 }}
          >
            {error}
          </p>
        )}

        <button className="btn primary" type="submit" disabled={busy} style={{ width: "100%" }}>
          {busy ? "잠시만요…" : isSignUp ? "가입하고 시작하기" : "로그인"}
        </button>
      </form>
    </main>
  );
}

/** Supabase가 돌려주는 영어 오류를 팀원이 읽을 수 있는 문장으로 바꾼다. */
function toKorean(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "아이디나 비밀번호가 맞지 않아요. 아직 가입 전이라면 위에서 '회원가입'을 눌러주세요.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "이미 쓰고 있는 아이디예요. 다른 아이디로 해주세요.";
  }
  if (m.includes("email not confirmed")) {
    return "계정 확인이 안 된 상태예요. 규민에게 Supabase 설정을 확인해달라고 해주세요.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "요청이 너무 잦아요. 잠시 뒤에 다시 해주세요.";
  }
  if (m.includes("password")) {
    return "비밀번호가 조건에 맞지 않아요. 6자 이상으로 해주세요.";
  }
  return `문제가 생겼어요: ${message}`;
}
