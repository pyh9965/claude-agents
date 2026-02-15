'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PenLine, Users, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: '글쓰기', href: '/generate', icon: PenLine },
  { name: '팀 소개', href: '/team', icon: Users },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-naver-green rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl">글또</span>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            네이버 블로그 AI 에이전트
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-naver-green-light text-naver-green'
                    : 'text-muted-foreground hover:bg-gray-100 hover:text-foreground'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
