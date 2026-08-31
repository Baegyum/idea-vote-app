import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/supabase/server";
import AuthButton from "@/components/AuthButton";

export const metadata: Metadata = {
  title: "아이디어 보드",
  description: "팀의 아이디어를 모으고, 투표하고, 회의로 이어가는 보드",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="ko">
      <body>
        <div className="container">
          <header className="site">
            <Link href="/">
              <h1>💡 아이디어 보드</h1>
            </Link>
            <AuthButton email={user?.email ?? null} />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
