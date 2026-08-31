// ESLint 9의 "flat config" 형식입니다.
// 예전 .eslintrc.json 을 대체하며, Next 16부터는 이 형식만 지원합니다.
//
// 실행: npm run lint

import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  ...coreWebVitals,
  ...typescript,
  {
    // 검사할 필요가 없는 폴더
    ignores: [".next/**", "node_modules/**", "next-env.d.ts"],
  },
  {
    rules: {
      // any 를 쓰면 타입 검사가 무력화된다. 에러까지는 아니고 경고로 알려준다.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default config;
