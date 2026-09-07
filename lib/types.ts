export type IdeaStatus = "backlog" | "discussing" | "adopted" | "parked";

export const STATUS_LABEL: Record<IdeaStatus, string> = {
  backlog: "백로그",
  discussing: "논의중",
  adopted: "채택",
  parked: "보류",
};

export interface Idea {
  id: string;
  author_id: string;
  title: string;
  body: string;
  status: IdeaStatus;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  /** 조인해서 붙여오는 작성자 표시 이름 */
  profiles?: { display_name: string } | null;
  /** 내가 이 아이디어에 투표했는지 (서버에서 계산해 붙임) */
  voted_by_me?: boolean;
}

export interface Comment {
  id: string;
  idea_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | null;
}

/** 자유 게시판의 글 한 개. 아이디어와 달리 투표·회의 단계가 없다. */
export interface Post {
  id: string;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
  profiles?: { display_name: string } | null;
}

/** 로그인한 팀원. profiles 테이블의 한 행. */
export interface Profile {
  id: string;
  display_name: string;
}

/**
 * 목록·보드에서 쓰는 아이디어 요약.
 * 본문(body)은 상세 화면에서만 필요한데 행에서 가장 큰 칸이라, 목록에서는 빼고 가져온다.
 */
export type IdeaSummary = Pick<
  Idea,
  "id" | "author_id" | "title" | "status" | "vote_count" | "comment_count" | "created_at"
>;
