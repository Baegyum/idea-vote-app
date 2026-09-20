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

/**
 * 찬성·반대와 그 이유.
 * 이유를 optional 로 두지 않는 것이 이 기능의 핵심이다. 찬반만 세면 왜 그런지
 * 알 수 없어서, 처음부터 이유를 함께 받도록 강제한다. DB 에도 같은 제약이 걸려 있다.
 */
export const reactionSchema = z.object({
  stance: z.enum(["agree", "disagree"]),
  reason: z.string().trim().min(1, "이유를 적어주세요").max(1000, "1000자 이하"),
});

/**
 * 로그인·회원가입에 쓰는 아이디와 비밀번호.
 *
 * 아이디를 영문 소문자와 숫자로 제한하는 이유: Supabase 로그인이 이메일 형식만
 * 받기 때문에 아이디 뒤에 도메인을 붙여 쓴다. 한글이나 공백, @ 같은 글자가
 * 들어가면 그 변환이 깨진다. lib/auth.ts 의 usernameToEmail() 참고.
 */
export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "아이디는 3자 이상이어야 해요")
    .max(20, "아이디는 20자까지만 쓸 수 있어요")
    .regex(/^[a-z0-9]+$/, "아이디는 영문 소문자와 숫자만 쓸 수 있어요"),
  password: z.string().min(6, "비밀번호는 6자 이상이어야 해요"),
});

/**
 * 회원가입에만 쓰는 규칙. 비밀번호를 두 번 받아 오타를 잡는다.
 * 로그인은 이미 정한 비밀번호를 치는 것이라 확인 칸이 필요 없다.
 */
export const signUpSchema = credentialsSchema
  .extend({ passwordConfirm: z.string() })
  .refine((v) => v.password === v.passwordConfirm, {
    message: "비밀번호가 서로 달라요. 다시 확인해주세요.",
    path: ["passwordConfirm"],
  });

// 인기순을 없앴다. 찬반은 "몇 명이 눌렀나"보다 "왜 그랬나"를 보는 것이라
// 수로 줄을 세우는 것이 뜻을 잃었다. 그래서 최신순만 남긴다.
export const listQuerySchema = z.object({
  status: z.enum(["all", "backlog", "discussing", "adopted", "parked"]).default("all"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;
export type Credentials = z.infer<typeof credentialsSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
