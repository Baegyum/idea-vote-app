/**
 * 아이디 ↔ 이메일 변환.
 *
 * Supabase 로그인은 이메일 형식만 받는다. 하지만 팀원들에게 이메일을 입력받고
 * 싶지 않아서(메일 발송 한도에 걸리고, 초보자에게 단계만 늘어난다) 아이디 뒤에
 * 실제로 존재하지 않는 도메인을 붙여 쓴다. 화면에는 아이디만 보인다.
 */

/** 실제로 메일이 오가지 않는 도메인. 바깥으로 메일이 새어나가지 않게 .local 을 쓴다. */
const TEAM_DOMAIN = "team.local";

/** "gyumin" → "gyumin@team.local" */
export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${TEAM_DOMAIN}`;
}

/**
 * "gyumin@team.local" → "gyumin"
 *
 * 이메일로 가입했던 옛 계정은 도메인이 달라서 그대로 돌려준다.
 * 아이디인 척 잘라내면 다른 사람과 같은 이름으로 보일 수 있다.
 */
export function emailToUsername(email: string | null | undefined): string | null {
  if (!email) return null;
  const [name, domain] = email.split("@");
  return domain === TEAM_DOMAIN ? name : email;
}
