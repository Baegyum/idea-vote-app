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
  agree_count: number;
  disagree_count: number;
  created_at: string;
  updated_at: string;
  /** 조인해서 붙여오는 작성자 표시 이름 */
  profiles?: { display_name: string } | null;
}

/** 찬성이냐 반대냐. DB의 reaction_stance 와 같은 값이어야 한다. */
export type Stance = "agree" | "disagree";

export const STANCE_LABEL: Record<Stance, string> = {
  agree: "찬성",
  disagree: "반대",
};

/**
 * 한 사람이 한 아이디어에 남긴 찬반과 그 이유.
 * 사람당 하나뿐이라 "마음이 바뀌었다"는 새 행이 아니라 이 행을 고치는 일이 된다.
 */
export interface Reaction {
  idea_id: string;
  user_id: string;
  stance: Stance;
  reason: string;
  created_at: string;
  /** 고친 시각. created_at 과 다르면 화면에 "(수정됨)"을 붙인다. */
  updated_at: string;
  profiles?: { display_name: string } | null;
}

/** 자유 게시판의 글 한 개. 아이디어와 달리 찬반·회의 단계가 없다. */
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
 * 홈에서 쓰는 아이디어 요약.
 * 홈은 아이디어 목록을 사람별로 접어 보여주면서, 제목을 눌러 상세페이지로 갈 수 있고
 * 찬반 수도 그 자리에서 보여준다. 그 네 가지에 필요한 칸만 담는다.
 */
export type IdeaSummary = Pick<
  Idea,
  "id" | "author_id" | "title" | "agree_count" | "disagree_count" | "created_at"
>;
