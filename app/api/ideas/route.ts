import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createIdeaSchema, listQuerySchema } from "@/lib/validation";
import { ok, fail, handleError } from "@/lib/api";

/**
 * GET /api/ideas?status=all&limit=20&cursor=...
 * 아이디어 목록. 항상 최신순이다. 커서 페이지네이션이라 데이터가 수만 건이 되어도 느려지지 않는다.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = listQuerySchema.parse(Object.fromEntries(url.searchParams));
    const supabase = await createClient();

    let query = supabase
      .from("ideas")
      .select("*, profiles!ideas_author_id_fkey(display_name)")
      .limit(q.limit);

    if (q.status !== "all") query = query.eq("status", q.status);

    query = query.order("created_at", { ascending: false });
    if (q.cursor) query = query.lt("created_at", q.cursor);

    const { data, error } = await query;
    if (error) return fail(error.message, 500);

    const nextCursor = data.length === q.limit ? data[data.length - 1].created_at : null;

    return ok({ items: data, nextCursor });
  } catch (e) {
    return handleError(e);
  }
}

/** POST /api/ideas — 새 아이디어 등록 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return fail("로그인이 필요합니다.", 401);

    const input = createIdeaSchema.parse(await req.json());
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ideas")
      .insert({ ...input, author_id: user.id })
      .select("*, profiles!ideas_author_id_fkey(display_name)")
      .single();

    if (error) return fail(error.message, 400);
    return ok(data, 201);
  } catch (e) {
    return handleError(e);
  }
}
