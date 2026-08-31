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
