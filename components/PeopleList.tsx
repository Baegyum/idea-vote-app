"use client";

import { useEffect, useSyncExternalStore } from "react";

export interface MemberSummary {
  id: string;
  display_name: string;
  ideaCount: number;
  voteCount: number;
  /** 이 사람이 가장 최근에 올린 아이디어 시각. 없으면 null. */
  latestIdeaAt: string | null;
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

  useEffect(() => {
    // 지금 화면에서는 느낌표를 보여주고, 다음에 들어왔을 때 사라지게 한다.
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
  }, []);

  return (
    <aside className="people">
      <h2 className="people-title">팀원</h2>
      {members.map((m) => (
        <div key={m.id} className="person">
          <span className="person-name">
            {m.display_name}
            {lastSeen && m.latestIdeaAt && m.latestIdeaAt > lastSeen && (
              <span className="new-mark" title="새 아이디어">
                ❗
              </span>
            )}
          </span>
          <p className="meta">
            아이디어 {m.ideaCount}개 · 받은 투표 {m.voteCount}표
          </p>
        </div>
      ))}
    </aside>
  );
}
