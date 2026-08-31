# 💡 아이디어 보드

팀의 아이디어를 모으고, 투표하고, 회의로 이어가는 웹앱.
**그리고 규민·재환·위진이 협업 개발을 몸으로 익히기 위한 연습 프로젝트.**

---

## 👋 처음 오셨나요?

| 나는 | 이 문서부터 |
|---|---|
| 재환 · 위진 (개발 처음) | **[docs/00-처음-시작하기.md](docs/00-처음-시작하기.md)** ← 여기부터, 순서대로 |
| 규민 (저장소 세팅) | [docs/03-규민용-저장소-세팅.md](docs/03-규민용-저장소-세팅.md) |
| 에러가 나서 멘붕 | [docs/04-막혔을때.md](docs/04-막혔을때.md) |

---

## 팀

| 이름 | 역할 |
|---|---|
| 규민 | 리드 · 리뷰 · 머지 · 배포 |
| 재환 | 개발 |
| 위진 | 개발 |

<!-- 재환, 위진: 첫 PR로 여기에 자기 소개 한 줄씩 추가해보세요! -->

---

## 기술 스택

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** (PostgreSQL + 인증 + Row Level Security)
- **Vercel** (배포)

## 빠른 실행

```bash
npm install
```
```bash
npm run dev
```

→ http://localhost:3000

## 문서

- [CLAUDE.md](CLAUDE.md) — 클로드 코드와 팀이 지키는 규칙
- [docs/01-git-기초.md](docs/01-git-기초.md) — 매일 쓰는 Git 명령어 7개
- [docs/02-회의-워크플로우.md](docs/02-회의-워크플로우.md) — Notion·카톡·GitHub 운영 방식
- [db/schema.sql](db/schema.sql) — 데이터베이스 설계
