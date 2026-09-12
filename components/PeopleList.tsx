"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

export interface MemberSummary {
  id: string;
  display_name: string;
  ideaCount: number;
  voteCount: number;
  /** 이 사람이 가장 최근에 올린 아이디어 시각. 없으면 null. */
  latestIdeaAt: string | null;
  /** 이 사람이 올린 아이디어들. 클릭하면 상세페이지로 이동한다. */
  ideas: { id: string; title: string; vote_count: number }[];
}

const SEEN_KEY = "lastSeenIdeasAt";

/**
 * 이 화면을 연 순간의 "마지막으로 본 시각"을 한 번만 읽어 기억해둔다.
 * 아래에서 곧바로 시각을 새로 덮어쓰기 때문에, 매번 다시 읽으면 느낌표가 즉시 사라져 버린다.
 */
let seenAtLoad: string | null | undefined;
function getSeen() {
  if (seenAtLoad === undefined) seenAtLoad = localStorage.getItem(SEEN_KEY);
  return seenAtLoad;
}
/** 서버에는 브라우저 저장값이 없다. 첫 렌더를 서버와 똑같이 그려야 하이드레이션 오류가 안 난다. */
const getSeenOnServer = () => null;
/** 이 값은 이 화면이 떠 있는 동안 바뀌지 않으므로 구독할 것이 없다. */
const subscribe = () => () => {};

export default function PeopleList({ members }: { members: MemberSummary[] }) {
  const lastSeen = useSyncExternalStore(subscribe, getSeen, getSeenOnServer);
  // 펼쳐놓은 사람 한 명만 기억한다. 여러 명을 동시에 펼칠 수 있게 하면
  // 팀원이 늘었을 때 왼쪽이 다시 끝없이 길어져, 접어둔 뜻이 없어진다.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    // 지금 화면에서는 느낌표를 보여주고, 다음에 들어왔을 때 사라지게 한다.
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  }, []);

  return (
    <aside className="people">
      <h2 className="people-title">팀원</h2>
      {members.map((m) => {
        const open = openId === m.id;
        const hasIdeas = m.ideas.length > 0;

        return (
          <div key={m.id} className="person">
            {/* 올린 아이디어가 없는 사람은 펼칠 것이 없어 눌리지 않는다.
                화살표 자리는 그대로 둬서 이름 위치가 사람마다 어긋나지 않게 한다. */}
            <button
              type="button"
              className="person-toggle"
              disabled={!hasIdeas}
              aria-expanded={open}
              onClick={() => setOpenId(open ? null : m.id)}
            >
              <span className="person-arrow">{hasIdeas && (open ? "▾" : "▸")}</span>
              <span className="person-name">{m.display_name}</span>
              {lastSeen && m.latestIdeaAt && m.latestIdeaAt > lastSeen && (
                <span className="new-mark" title="새 아이디어">
                  ❗
                </span>
              )}
            </button>

            <p className="meta">
              아이디어 {m.ideaCount}개 · 받은 투표 {m.voteCount}표
            </p>

            {open && (
              <ul className="idea-links">
                {m.ideas.map((idea) => (
                  <li key={idea.id}>
                    <Link href={`/ideas/${idea.id}`}>{idea.title}</Link>
                    <span className="idea-votes">{idea.vote_count}표</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </aside>
  );
}
