/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next 16에서 experimental을 벗고 정식 기능이 됐다.
  // 존재하지 않는 경로로 <Link>를 걸면 타입 오류로 잡아준다 — 오타로 인한 404를 막는다.
  typedRoutes: true,
};

export default nextConfig;
