import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { reactionSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

// Next.js 15부터 params는 Promise다. 반드시 await 해서 꺼내 쓴다.
type Params = { params: Promise<{ id: string }> };

/**
 * PUT /api/ideas/:id/reaction — 내 찬반과 이유를 남기거나 고친다
 *
 * 새로 남기는 것과 고치는 것을 한 곳에서 받는다. 한 사람이 한 아이디어에
 * 하나만 남길 수 있으므로(기본키가 막는다), "이미 있으면 덮어쓴다"가 곧 수정이다.
 * 화면이 "지금 내 것이 있는지" 몰라도 되게 하려고 upsert 를 쓴다.
 */
export async function PUT(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = reactionSchema.parse(await req.json());
    const supabase = await createClient();

    const { error } = await supabase.from("reactions").upsert(
      {
        idea_id: id,
        user_id: user.id,
        stance: input.stance,
        reason: input.reason,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "idea_id,user_id" },
    );

    if (error) return fail(error.message, 400);
    return ok({ saved: true });
  } catch (e) {
    return handleError(e);
  }
}

/** DELETE /api/ideas/:id/reaction — 내 찬반을 무른다 */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const supabase = await createClient();
    const { error } = await supabase
      .from("reactions")
      .delete()
      .eq("idea_id", id)
      // 남의 것을 지울 수 없게 RLS 가 막지만, 여기서도 본인으로 좁혀둔다.
      .eq("user_id", user.id);

    if (error) return fail(error.message, 400);
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
