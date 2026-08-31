import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createCommentSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

// Next.js 15부터 params는 Promise다. 반드시 await 해서 꺼내 쓴다.
type Params = { params: Promise<{ id: string }> };

/** GET /api/ideas/:id/comments */
export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("comments")
      .select("*, profiles(display_name)")
      .eq("idea_id", id)
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
    const { id } = await params;
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = createCommentSchema.parse(await req.json());
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({ idea_id: id, author_id: user.id, body: input.body })
      .select("*, profiles(display_name)")
      .single();

    if (error) return fail(error.message, 400);
    return ok(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
