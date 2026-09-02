/**
 * 세션 시작 브리핑 훅 — 클로드가 첫 마디를 하기 전에 "지금 어디에 있는지"를 알려준다.
 *
 * 이게 없으면, 엉뚱한 브랜치나 엉뚱한 폴더의 개발 서버를 보면서
 * 한참을 작업한 뒤에야 알아차리는 일이 생긴다.
 * 출력은 클로드의 대화 맥락에 그대로 들어간다.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const cwd = process.cwd();
const lines = [];

function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

const branch = git("rev-parse --abbrev-ref HEAD");
if (branch === null) {
  process.exit(0); // git 저장소가 아니면 브리핑할 것이 없다
}

lines.push(`현재 브랜치: ${branch}`);
if (branch === "main" || branch === "master") {
  lines.push(
    `주의: ${branch} 에 있습니다. 여기서는 저장 지점 만들기와 GitHub에 올리기가 하네스에 의해 차단됩니다.`,
    `코드를 고치기 전에 '내 복사본'을 먼저 만들어야 합니다. 사용자에게 "/new-work <하려는 작업 한 줄 설명>" 을 치라고 안내하세요.`,
  );
}

const dirty = git("status --porcelain");
if (dirty) {
  const count = dirty.split("\n").filter(Boolean).length;
  lines.push(`아직 저장 지점에 담기지 않은 변경: ${count}개 파일`);
}

// 개발 서버 포트를 다른 폴더의 프로젝트가 점유하고 있으면 알려준다.
// 이걸 모르면 고친 코드가 화면에 반영되지 않는 이유를 한참 헤매게 된다.
let port = 3000;
try {
  const launch = JSON.parse(readFileSync(join(cwd, ".claude", "launch.json"), "utf8"));
  port = launch?.configurations?.[0]?.port ?? 3000;
} catch {
  // launch.json 이 없으면 기본 포트로 확인한다
}

try {
  const netstat = execSync(`netstat -ano -p tcp`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 5000,
  });
  const row = netstat
    .split("\n")
    .find((l) => l.includes("LISTENING") && l.includes(`:${port} `));

  if (row) {
    const pid = row.trim().split(/\s+/).pop();
    const owner = execSync(
      `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter \\"ProcessId=${pid}\\").CommandLine"`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 8000 },
    ).trim();

    const here = owner.includes(cwd.replace(/\//g, "\\"));
    lines.push(
      here
        ? `개발 서버: ${port}번 포트에서 이 프로젝트가 실행 중입니다.`
        : `주의: ${port}번 포트를 다른 폴더의 프로젝트가 쓰고 있습니다. 브라우저에서 보이는 화면은 이 프로젝트가 아닐 수 있습니다.`,
    );
  }
} catch {
  // 포트 확인에 실패해도 세션을 막지 않는다
}

process.stdout.write(lines.join("\n") + "\n");
