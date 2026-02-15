import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  title: '글또 - 네이버 블로그 AI 에이전트',
  description: '8인의 AI 에이전트 팀이 만드는 네이버 블로그 콘텐츠',
  keywords: ['네이버 블로그', 'AI', '콘텐츠 생성', '블로그 글쓰기'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
