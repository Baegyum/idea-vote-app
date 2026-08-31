import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** 메일의 매직링크를 클릭하면 여기로 돌아온다. 코드를 세션 쿠키로 교환한 뒤 홈으로 보낸다. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}/?error=auth`);
}
