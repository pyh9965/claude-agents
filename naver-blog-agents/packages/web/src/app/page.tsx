import Link from 'next/link';
import { ArrowRight, Sparkles, Zap, Users, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Users,
    title: '8인의 전문 에이전트',
    description: '기획자, 리서처, 4명의 작가, 편집자, SEO 전문가가 협업합니다.',
  },
  {
    icon: Sparkles,
    title: 'AI 기반 콘텐츠 생성',
    description: 'Google Gemini를 활용한 고품질 블로그 콘텐츠를 자동 생성합니다.',
  },
  {
    icon: Zap,
    title: '네이버 블로그 최적화',
    description: '네이버 스마트에디터 호환 HTML과 SEO 최적화를 자동 적용합니다.',
  },
];

const contentTypes = [
  { type: 'info', name: '정보성', writer: '현우 선생님', emoji: '📚' },
  { type: 'marketing', name: '마케팅', writer: '지은 언니', emoji: '✨' },
  { type: 'review', name: '제품리뷰', writer: '태현', emoji: '⭐' },
  { type: 'food', name: '맛집리뷰', writer: '하린', emoji: '🍽️' },
  { type: 'travel', name: '여행', writer: '유진', emoji: '✈️' },
  { type: 'tech', name: '테크/IT', writer: '민석', emoji: '💻' },
  { type: 'lifestyle', name: '라이프스타일', writer: '수아', emoji: '🌸' },
  { type: 'parenting', name: '육아', writer: '예원맘', emoji: '👶' },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-naver-green-light to-white">
        <div className="container mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-naver mb-6">
            <Sparkles className="w-4 h-4 text-naver-green" />
            <span className="text-sm font-medium">AI 블로그 에이전트 팀</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            8인의 AI 에이전트가 만드는
            <br />
            <span className="text-naver-green">네이버 블로그</span> 콘텐츠
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            기획부터 SEO 최적화까지, 전문 AI 팀이 고품질 블로그 글을 자동으로 생성합니다.
            단 몇 분 만에 네이버 블로그에 바로 올릴 수 있는 콘텐츠를 받아보세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/generate">
                콘텐츠 생성하기
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/team">팀 소개 보기</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">주요 기능</h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card-naver text-center"
              >
                <div className="w-12 h-12 bg-naver-green-light rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-naver-green" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Content Types Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold text-center mb-4">8가지 콘텐츠 유형</h2>
          <p className="text-center text-muted-foreground mb-12">
            각 유형별 전문 작가가 최적화된 콘텐츠를 작성합니다
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {contentTypes.map((item) => (
              <div
                key={item.type}
                className="bg-white rounded-xl p-4 shadow-naver hover:shadow-naver-lg transition-shadow cursor-pointer"
              >
                <div className="text-3xl mb-2">{item.emoji}</div>
                <h3 className="font-semibold">{item.name}</h3>
                <p className="text-sm text-muted-foreground">{item.writer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-naver-green text-white">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하세요</h2>
          <p className="text-naver-green-light mb-8 max-w-xl mx-auto">
            주제만 입력하면 AI 에이전트 팀이 협업하여 완성도 높은 블로그 글을 생성합니다.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/generate">
              무료로 콘텐츠 생성하기
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
