import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * 서버(서버 컴포넌트 / API 라우트)에서 쓰는 Supabase 클라이언트.
 * 쿠키에 담긴 로그인 세션을 읽어오기 때문에, 이 클라이언트로 하는 모든 쿼리는
 * DB의 RLS 정책("본인 것만 수정 가능" 등)을 그대로 통과해야 한다.
 */
export async function createClient() {
  // Next.js 15부터 cookies()는 비동기다. await를 빠뜨리면 Promise를 쿠키인 척 다루게 된다.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 미들웨어가 갱신을 담당하므로 무시해도 안전.
          }
        },
      },
    },
  );
}

/** 로그인한 사용자를 가져온다. 없으면 null. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
