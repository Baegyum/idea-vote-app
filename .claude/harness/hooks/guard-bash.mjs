/**
 * Bash 명령 차단 훅 — 팀 규칙을 "부탁"에서 "차단"으로 바꾼다.
 *
 * CLAUDE.md 나 docs/ 는 읽어야 지켜지지만 이 파일은 읽지 않아도 지켜진다.
 * 종료 코드 2 = 명령 실행을 막고, stderr 내용을 클로드에게 전달한다.
 */
import { execSync } from "node:child_process";

/** 브랜치와 무관하게 항상 막는 명령들. 초보자가 검색해서 따라 치기 가장 쉬운 것들. */
const DANGEROUS = [
  {
    pattern: /git\s+push\b[^\n;&|]*\s(--force\b|--force-with-lease\b|-f\b)/,
    reason: "git push --force 는 GitHub에 있는 남의 작업을 덮어써서 지웁니다.",
    next: "git push",
  },
  {
    pattern: /git\s+reset\b[^\n;&|]*\s--hard\b/,
    reason: "git reset --hard 는 저장 안 한 내 작업을 되돌릴 수 없게 지웁니다.",
    next: "git status",
  },
  {
    pattern: /git\s+clean\b[^\n;&|]*\s-[a-zA-Z]*f/,
    reason: "git clean -f 는 아직 커밋 안 한 새 파일들을 전부 지웁니다.",
    next: "git status",
  },
];

/** main 브랜치에서 막는 명령들. main 에 들어가는 길은 PR 하나뿐이다. */
const WRITES_TO_REPO = /git\s+(commit|push)\b/;

function readStdin() {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
  });
}

function block(message) {
  process.stderr.write(message);
  process.exit(2);
}

const raw = await readStdin();
let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0); // 입력을 못 읽으면 작업을 막지 않는다 (훅 오류로 팀을 멈추지 않기)
}

const command = input?.tool_input?.command ?? "";
const cwd = input?.cwd ?? process.cwd();

for (const rule of DANGEROUS) {
  if (rule.pattern.test(command)) {
    block(
      `[하네스 차단] ${rule.reason}\n` +
        `팀 규칙에서 금지된 명령입니다. 정말 필요하면 규민에게 먼저 물어보세요.\n` +
        `지금은 대신 이걸 치세요: ${rule.next}\n`,
    );
  }
}

if (WRITES_TO_REPO.test(command)) {
  let branch = "";
  try {
    branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    process.exit(0); // git 저장소가 아니면 검사할 것이 없다
  }

  if (branch === "main" || branch === "master") {
    block(
      `[하네스 차단] 지금 ${branch} 브랜치 위에 있습니다.\n` +
        `${branch} 은 배포되는 진짜 코드라 직접 커밋/푸시할 수 없습니다.\n` +
        `이 규칙은 규민을 포함한 전원에게 똑같이 적용됩니다.\n` +
        `먼저 내 작업 사본(브랜치)을 만드세요:\n` +
        `git checkout -b feat/내가-할-일\n`,
    );
  }
}

process.exit(0);
