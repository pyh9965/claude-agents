import { Metadata } from 'next';
import { GenerateForm } from '@/components/generate/generate-form';

export const metadata: Metadata = {
  title: '콘텐츠 생성 - 글또',
  description: 'AI 에이전트 팀이 네이버 블로그 콘텐츠를 생성합니다.',
};

export default function GeneratePage() {
  return (
    <div className="py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">콘텐츠 생성</h1>
          <p className="text-muted-foreground">
            주제와 유형을 선택하면 AI 에이전트 팀이 고품질 블로그 글을 작성합니다
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-naver p-6 sm:p-8">
          <GenerateForm />
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            🤖 8인의 AI 에이전트가 기획, 리서치, 글쓰기, 편집, SEO 최적화를 담당합니다
          </p>
        </div>
      </div>
    </div>
  );
}
