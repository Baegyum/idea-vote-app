import { z } from "zod";

/**
 * 입력값 검증 규칙을 한 곳에 모아둔다.
 * "프런트에서 막았으니 괜찮겠지"는 통하지 않는다 — API도 반드시 여기서 다시 검사한다.
 */

export const createIdeaSchema = z.object({
  title: z.string().trim().min(2, "제목은 2자 이상").max(80, "제목은 80자 이하"),
  body: z.string().trim().max(4000, "본문은 4000자 이하").default(""),
});

export const updateIdeaSchema = z.object({
  title: z.string().trim().min(2).max(80).optional(),
  body: z.string().trim().max(4000).optional(),
  status: z.enum(["backlog", "discussing", "adopted", "parked"]).optional(),
});

export const createPostSchema = z.object({
  title: z.string().trim().min(2, "제목은 2자 이상").max(80, "제목은 80자 이하"),
  body: z.string().trim().max(4000, "본문은 4000자 이하").default(""),
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(1, "내용을 입력하세요").max(1000, "1000자 이하"),
});

export const signInSchema = z.object({
  email: z.string().trim().email("이메일 주소 형식이 아닙니다"),
});

export const listQuerySchema = z.object({
  sort: z.enum(["hot", "recent"]).default("hot"),
  status: z.enum(["all", "backlog", "discussing", "adopted", "parked"]).default("all"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
