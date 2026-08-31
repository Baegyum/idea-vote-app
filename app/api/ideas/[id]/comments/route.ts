import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createCommentSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

type Params = { params: { id: string } };

/** GET /api/ideas/:id/comments */
export async function GET(_req: Request, { params }: Params) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(display_name)")
      .eq("idea_id", params.id)
      .order("created_at", { ascending: true });

    if (error) return fail(error.message, 500);
    return ok(data);
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/ideas/:id/comments */
export async function POST(req: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = createCommentSchema.parse(await req.json());
    const supabase = createClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({ idea_id: params.id, author_id: user.id, body: input.body })
      .select("*, profiles(display_name)")
      .single();

    if (error) return fail(error.message, 400);
    return ok(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
