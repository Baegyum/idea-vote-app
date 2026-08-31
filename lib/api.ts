import { NextResponse } from "next/server";
import { ZodError } from "zod";

/** API 응답 형태를 팀 전체가 똑같이 쓰도록 고정한다. */
export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ ok: false, error: { message, details } }, { status });
}

/** try/catch 안에서 던져진 에러를 일관된 응답으로 바꿔준다. */
export function handleError(e: unknown) {
  if (e instanceof ZodError) {
    return fail("입력값이 올바르지 않습니다.", 422, e.flatten().fieldErrors);
  }
  console.error(e);
  return fail("서버에서 문제가 발생했습니다.", 500);
}
