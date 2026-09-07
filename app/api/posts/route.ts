import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createPostSchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

/** POST /api/posts — 자유 게시판에 새 글 등록 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = createPostSchema.parse(await req.json());
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("posts")
      .insert({ ...input, author_id: user.id })
      .select("*, profiles!posts_author_id_fkey(display_name)")
      .single();

    if (error) return fail(error.message, 400);
    return ok(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
