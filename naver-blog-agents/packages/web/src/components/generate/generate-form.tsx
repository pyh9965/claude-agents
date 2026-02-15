'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const contentTypes = [
  { value: 'info', label: '📚 정보성', description: '가이드, How-to 콘텐츠' },
  { value: 'marketing', label: '✨ 마케팅', description: '브랜드, 협찬 콘텐츠' },
  { value: 'review', label: '⭐ 제품리뷰', description: 'IT, 가전 리뷰' },
  { value: 'food', label: '🍽️ 맛집리뷰', description: '맛집, 카페 리뷰' },
  { value: 'travel', label: '✈️ 여행', description: '여행 후기, 코스 추천' },
  { value: 'tech', label: '💻 테크/IT', description: 'IT, 앱/서비스 리뷰' },
  { value: 'lifestyle', label: '🌸 라이프스타일', description: '일상, 인테리어' },
  { value: 'parenting', label: '👶 육아', description: '육아 정보, 경험담' },
];

const tones = [
  { value: 'friendly', label: '친근한', description: '따뜻하고 친근한 톤' },
  { value: 'formal', label: '전문적', description: '신뢰감 있는 전문 톤' },
  { value: 'casual', label: '캐주얼', description: '편안하고 가벼운 톤' },
];

const formSchema = z.object({
  topic: z.string().min(1, '주제를 입력해주세요').max(200, '주제는 200자 이내로 입력해주세요'),
  type: z.enum(['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting']),
  keywords: z.string().optional(),
  tone: z.enum(['formal', 'casual', 'friendly']),
});

type FormData = z.infer<typeof formSchema>;

export function GenerateForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: '',
      type: 'info',
      keywords: '',
      tone: 'friendly',
    },
  });

  const selectedType = watch('type');
  const selectedTone = watch('tone');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: data.topic,
          type: data.type,
          keywords: data.keywords
            ? data.keywords.split(',').map((k) => k.trim()).filter(Boolean)
            : undefined,
          tone: data.tone,
        }),
      });

      if (!response.ok) {
        throw new Error('생성 요청에 실패했습니다');
      }

      const result = await response.json();
      router.push(`/generate/${result.jobId}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '오류 발생',
        description: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Topic Input */}
      <div className="space-y-2">
        <Label htmlFor="topic" className="text-base font-semibold">
          주제 <span className="text-red-500">*</span>
        </Label>
        <Input
          id="topic"
          placeholder="예: 강남역 맛집 추천, 아이폰 16 프로 리뷰"
          {...register('topic')}
          className="h-12 text-base"
        />
        {errors.topic && (
          <p className="text-sm text-red-500">{errors.topic.message}</p>
        )}
      </div>

      {/* Content Type Selection */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          콘텐츠 유형 <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {contentTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setValue('type', type.value as FormData['type'])}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedType === type.value
                  ? 'border-naver-green bg-naver-green-light ring-2 ring-naver-green'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Keywords Input */}
      <div className="space-y-2">
        <Label htmlFor="keywords" className="text-base font-semibold">
          키워드 <span className="text-muted-foreground text-sm">(선택)</span>
        </Label>
        <Input
          id="keywords"
          placeholder="쉼표로 구분 (예: 데이트, 분위기 좋은, 주차 가능)"
          {...register('keywords')}
        />
        <p className="text-xs text-muted-foreground">
          SEO 최적화에 활용됩니다
        </p>
      </div>

      {/* Tone Selection */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">
          톤 앤 매너 <span className="text-muted-foreground text-sm">(선택)</span>
        </Label>
        <div className="flex gap-3">
          {tones.map((tone) => (
            <button
              key={tone.value}
              type="button"
              onClick={() => setValue('tone', tone.value as FormData['tone'])}
              className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                selectedTone === tone.value
                  ? 'border-naver-green bg-naver-green-light'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{tone.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{tone.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        size="lg"
        className="w-full h-14 text-lg"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            생성 중...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            콘텐츠 생성하기
          </>
        )}
      </Button>
    </form>
  );
}
