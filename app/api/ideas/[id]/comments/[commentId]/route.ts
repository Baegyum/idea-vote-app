import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { updateCommentSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

// Next.js 15부터 params는 Promise다. 반드시 await 해서 꺼내 쓴다.
type Params = { params: Promise<{ id: string; commentId: string }> };

/**
 * PATCH /api/ideas/:id/comments/:commentId — 의견 수정
 *
 * "본인 것만 고칠 수 있다"는 규칙은 여기서 검사하지 않고 DB의 RLS에 맡긴다.
 * 코드로 막으면 우회가 가능하지만, DB가 막으면 어떤 경로로 와도 뚫리지 않는다.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { id, commentId } = await params;
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = updateCommentSchema.parse(await req.json());
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("comments")
      .update({ body: input.body, updated_at: new Date().toISOString() })
      .eq("id", commentId)
      // 주소의 아이디어와 실제로 이어진 의견인지도 같이 확인한다. 남의 글에 달린
      // 의견 번호를 끼워 넣어도 안 걸리게 하기 위해서다.
      .eq("idea_id", id)
      // 화면은 응답을 쓰지 않고 새로 그린다. 여기서 select 를 하는 건 "몇 행을
      // 고쳤는지" 알기 위해서라, 번호 한 칸만 돌려받으면 충분하다.
      .select("id")
      .maybeSingle();

    if (error) return fail(error.message, 400);
    // RLS가 막으면 에러 대신 "고친 행 0개"로 돌아온다. 그래서 없음도 권한 없음으로 본다.
    if (!data) return fail("수정 권한이 없거나 대상이 없습니다.", 403);
    return ok({ updated: true });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/ideas/:id/comments/:commentId — 의견 삭제 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id, commentId } = await params;
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("idea_id", id)
      .select("id")
      .maybeSingle();

    if (error) return fail(error.message, 400);
    if (!data) return fail("삭제 권한이 없거나 대상이 없습니다.", 403);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
