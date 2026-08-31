import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { updateIdeaSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: { id: string } };

/** GET /api/ideas/:id — 아이디어 하나 + 댓글 */
export async function GET(_req: Request, { params }: Params) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("ideas")
      .select("*, profiles(display_name), comments(*, profiles(display_name))")
      .eq("id", params.id)
      .single();

    if (error) return fail("아이디어를 찾을 수 없습니다.", 404);
    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}

/** PATCH /api/ideas/:id — 제목/본문/상태 수정 (작성자 본인만, RLS가 강제) */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const patch = updateIdeaSchema.parse(await req.json());
    const supabase = createClient();

    const { data, error } = await supabase
      .from("ideas")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", params.id)
      .select()
      .single();

    if (error) return fail("수정 권한이 없거나 대상이 없습니다.", 403);
    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/ideas/:id */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const supabase = createClient();
    const { error } = await supabase.from("ideas").delete().eq("id", params.id);
    if (error) return fail("삭제 권한이 없습니다.", 403);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
