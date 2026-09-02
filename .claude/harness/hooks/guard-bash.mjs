/**
 * Bash 명령 차단 훅 — 팀 규칙을 "부탁"에서 "차단"으로 바꾼다.
 *
 * CLAUDE.md 나 docs/ 는 읽어야 지켜지지만 이 파일은 읽지 않아도 지켜진다.
 * 종료 코드 2 = 명령 실행을 막고, stderr 내용을 클로드에게 전달한다.
 *
 * 메시지는 사용자가 아니라 클로드가 먼저 읽는다. 그래서 "무엇을 막았는지"와
 * "사용자에게 어떻게 설명할지"를 같이 적는다. 개발이 처음인 사람에게
 * 'push --force 가 차단됨' 같은 문장은 아무 정보도 주지 못한다.
 */
import { execSync } from "node:child_process";

/** 작업 공간(브랜치)을 만들어 주는 스킬 이름. 여기만 고치면 모든 메시지가 따라 바뀐다. */
const NEW_WORK_SKILL = "new-work";

/** 브랜치와 무관하게 항상 막는 명령들. 초보자가 검색해서 따라 치기 가장 쉬운 것들. */
const DANGEROUS = [
  {
    pattern: /git\s+push\b[^\n;&|]*\s(--force\b|--force-with-lease\b|-f\b)/,
    damage:
      "GitHub에 올라가 있는 팀원들의 작업을 지우고 내 것으로 덮어씁니다. 한번 지워지면 되돌릴 수 없습니다.",
    instead:
      "대신 평범한 올리기(git push)를 쓰세요. 그것도 거부당하면 남이 먼저 올린 게 있다는 뜻이니, 규민에게 물어보라고 안내하세요.",
  },
  {
    pattern: /git\s+reset\b[^\n;&|]*\s--hard\b/,
    damage:
      "아직 저장 지점을 만들지 않은 내 작업을 통째로 지웁니다. 휴지통에도 안 남고 되돌릴 수 없습니다.",
    instead:
      "먼저 git status 로 지금 무엇이 바뀌어 있는지 사용자와 함께 확인하세요. 그래도 되돌려야 한다면 규민에게 물어보라고 안내하세요.",
  },
  {
    pattern: /git\s+clean\b[^\n;&|]*\s-[a-zA-Z]*f/,
    damage:
      "아직 한 번도 저장 지점에 담은 적 없는 새 파일들을 전부 지웁니다. 되돌릴 수 없습니다.",
    instead:
      "먼저 git status 로 어떤 파일이 있는지 사용자와 함께 확인하세요. 지워도 되는 파일인지는 사용자가 정합니다.",
  },
];

/** main 에서 막는 명령들. main 으로 들어가는 길은 PR 하나뿐이다. */
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
      [
        "[하네스가 막았습니다]",
        "",
        `방금 실행하려던 명령은 ${rule.damage}`,
        "팀 규칙에서 금지한 명령이라 실행되지 않았습니다.",
        "",
        "사용자에게 위 내용을 전문용어 없이, 팀 문서의 비유대로 설명하세요.",
        rule.instead,
        "",
      ].join("\n"),
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
      [
        "[하네스가 막았습니다]",
        "",
        `지금 '${branch}' 에서 저장 지점을 만들거나 GitHub에 올리려고 했습니다.`,
        "",
        "사용자에게 아래 내용을 팀 문서(docs/01-git-기초.md)의 비유 그대로 설명하세요:",
        `- '${branch}' 은 인터넷에 실제로 올라가 있는, 완성된 코드가 사는 자리입니다`,
        "- 여기서 바로 고치면 팀 전체가 보는 화면이 곧바로 바뀌어서 위험합니다",
        "- 그래서 먼저 '내 복사본'을 만들어야 합니다. 그 안에서는 무엇을 하든 안전합니다",
        "- 다 되면 규민에게 합쳐달라고 요청(PR)하고, 규민이 확인해야 main 에 들어갑니다",
        "- 이 규칙은 규민을 포함한 팀 전원에게 똑같이 적용됩니다",
        "",
        `그 다음 ${NEW_WORK_SKILL} 스킬을 실행해서 내 복사본을 만드세요.`,
        `사용자가 직접 하고 싶어 하면 /${NEW_WORK_SKILL} 이라고 치면 된다고 알려주세요.`,
        "",
        "git 명령어를 직접 알려주지 마세요. 그 스킬이 순서대로 챙겨 줍니다.",
        "",
      ].join("\n"),
    );
  }
}

process.exit(0);
