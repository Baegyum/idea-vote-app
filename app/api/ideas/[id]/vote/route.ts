import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: { id: string } };

/**
 * POST /api/ideas/:id/vote — 투표하기
 * 중복 투표는 DB의 기본키 제약(idea_id, voter_id)이 막는다. 코드가 아니라 DB가 보장.
 */
export async function POST(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const supabase = createClient();
    const { error } = await supabase
      .from("votes")
      .insert({ idea_id: params.id, voter_id: user.id });

    // 23505 = unique_violation → 이미 투표함. 에러가 아니라 정상 상태로 취급.
    if (error && error.code !== "23505") return fail(error.message, 400);
    return ok({ voted: true });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/ideas/:id/vote — 투표 취소 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const supabase = createClient();
    const { error } = await supabase
      .from("votes")
      .delete()
      .eq("idea_id", params.id)
      .eq("voter_id", user.id);

    if (error) return fail(error.message, 400);
    return ok({ voted: false });
  } catch (e) {
    return handleError(e);
  }
}
