'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WorkflowProgress } from '@/components/progress/workflow-progress';
import { ContentPreview } from '@/components/preview/content-preview';

interface PageProps {
  params: { jobId: string };
}

export default function JobPage({ params }: PageProps) {
  const router = useRouter();
  const [isCompleted, setIsCompleted] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResult = async () => {
    try {
      const response = await fetch(`/api/generate/${params.jobId}/result`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setResult(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch result:', e);
    }
  };

  const handleComplete = () => {
    setIsCompleted(true);
    fetchResult();
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/generate"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            새 콘텐츠 생성
          </Link>
          <h1 className="text-3xl font-bold">
            {isCompleted ? '콘텐츠 생성 완료!' : '콘텐츠 생성 중...'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isCompleted
              ? '생성된 콘텐츠를 확인하고 복사하세요'
              : 'AI 에이전트 팀이 콘텐츠를 생성하고 있습니다'}
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Progress Section */}
          <div className="bg-white rounded-xl shadow-naver p-6">
            <h2 className="text-lg font-semibold mb-6">생성 진행 상황</h2>
            <WorkflowProgress
              jobId={params.jobId}
              onComplete={handleComplete}
              onError={handleError}
            />
          </div>

          {/* Preview Section */}
          <div className="bg-white rounded-xl shadow-naver p-6">
            <h2 className="text-lg font-semibold mb-6">콘텐츠 미리보기</h2>
            {isCompleted && result?.content ? (
              <ContentPreview content={result.content} />
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-4xl mb-4">😢</div>
                <p className="text-muted-foreground">콘텐츠 생성에 실패했습니다</p>
                <p className="text-sm text-red-500 mt-2">{error}</p>
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/generate">다시 시도하기</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-4xl mb-4 animate-pulse">✍️</div>
                <p className="text-muted-foreground">
                  콘텐츠 생성이 완료되면 여기에 표시됩니다
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Stats (only when completed) */}
        {isCompleted && result?.stats && (
          <div className="mt-8 bg-white rounded-xl shadow-naver p-6">
            <h2 className="text-lg font-semibold mb-4">생성 정보</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">주제</p>
                <p className="font-medium">{result.stats.topic}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">유형</p>
                <p className="font-medium">{result.stats.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">소요 시간</p>
                <p className="font-medium">
                  {((result.stats.duration || 0) / 1000).toFixed(1)}초
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SEO 점수</p>
                <p className="font-medium text-naver-green">
                  {result.content?.metadata?.seoScore || 0}/100
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
