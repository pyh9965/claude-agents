import { Metadata } from 'next';

export const metadata: Metadata = {
  title: '팀 소개 - 글또',
  description: '글또 AI 에이전트 팀을 소개합니다.',
};

const team = [
  {
    emoji: '📋',
    name: '민준 팀장',
    role: '기획자 (Planner)',
    age: 38,
    description: '차분하고 전략적인 베테랑 기획자',
    traits: ['전략적 사고', '팀 조율', '일정 관리'],
    color: 'bg-blue-100 text-blue-700',
  },
  {
    emoji: '🔍',
    name: '수빈',
    role: '리서처 (Researcher)',
    age: 29,
    description: '꼼꼼한 팩트체커, 정보 수집의 달인',
    traits: ['정보 수집', '팩트체크', '자료 분석'],
    color: 'bg-purple-100 text-purple-700',
  },
  {
    emoji: '📚',
    name: '현우 선생님',
    role: '정보성 작가',
    age: 45,
    description: '쉬운 설명의 달인, 교육적 접근',
    traits: ['설명력', '교육적 글쓰기', '신뢰감'],
    color: 'bg-green-100 text-green-700',
  },
  {
    emoji: '✨',
    name: '지은 언니',
    role: '마케팅 작가',
    age: 33,
    description: '감성 스토리텔러, 트렌드 민감',
    traits: ['감성 글쓰기', '트렌드', '브랜딩'],
    color: 'bg-pink-100 text-pink-700',
  },
  {
    emoji: '⭐',
    name: '태현',
    role: '제품리뷰 작가',
    age: 27,
    description: '솔직한 장단점 분석, 실용주의',
    traits: ['분석력', '솔직함', '실용성'],
    color: 'bg-yellow-100 text-yellow-700',
  },
  {
    emoji: '🍽️',
    name: '하린',
    role: '맛집리뷰 작가',
    age: 31,
    description: '오감 묘사 전문, 감성적 표현',
    traits: ['감각 묘사', '분위기 전달', '맛 표현'],
    color: 'bg-orange-100 text-orange-700',
  },
  {
    emoji: '✏️',
    name: '서연 실장',
    role: '편집자 (Editor)',
    age: 40,
    description: '완벽주의자, 디테일의 여왕',
    traits: ['교정/교열', '일관성', '품질 관리'],
    color: 'bg-gray-100 text-gray-700',
  },
  {
    emoji: '🎯',
    name: '준서',
    role: 'SEO 전문가',
    age: 35,
    description: '데이터 기반 사고, 키워드 마스터',
    traits: ['SEO 최적화', '키워드 분석', '데이터'],
    color: 'bg-red-100 text-red-700',
  },
  {
    emoji: '✈️',
    name: '유진',
    role: '여행 작가',
    age: 32,
    description: '감성 여행 블로거, 사진 중심 스토리텔링',
    traits: ['여행 경험', '사진 활용', '코스 설계'],
    color: 'bg-sky-100 text-sky-700',
  },
  {
    emoji: '💻',
    name: '민석',
    role: '테크 작가',
    age: 35,
    description: 'IT 전문가, 스펙 비교의 달인',
    traits: ['기술 이해', '스펙 분석', '비교 리뷰'],
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    emoji: '🌸',
    name: '수아',
    role: '라이프스타일 작가',
    age: 28,
    description: '트렌디한 감성, 친근한 언니 같은 스타일',
    traits: ['트렌드', '일상 공유', '공감대'],
    color: 'bg-rose-100 text-rose-700',
  },
  {
    emoji: '👶',
    name: '예원맘',
    role: '육아 작가',
    age: 38,
    description: '경험 기반 육아 노하우, 따뜻한 조언',
    traits: ['육아 경험', '공감', '실용 정보'],
    color: 'bg-amber-100 text-amber-700',
  },
];

export default function TeamPage() {
  return (
    <div className="py-12 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold mb-4">글또 AI 에이전트 팀</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            12명의 전문 AI 에이전트가 협업하여 고품질 네이버 블로그 콘텐츠를 생성합니다.
            각 에이전트는 고유한 성격과 전문성을 갖추고 있습니다.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map((member) => (
            <div
              key={member.name}
              className="bg-white rounded-xl shadow-naver p-6 hover:shadow-naver-lg transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{member.emoji}</div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{member.name}</h3>
                  <p className={`text-sm px-2 py-0.5 rounded-full inline-block ${member.color}`}>
                    {member.role}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {member.age}세
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm">{member.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {member.traits.map((trait) => (
                  <span
                    key={trait}
                    className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Workflow Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-center mb-8">협업 워크플로우</h2>
          <div className="flex flex-wrap justify-center items-center gap-4">
            {[
              { step: '1', name: '기획', agent: '민준' },
              { step: '2', name: '리서치', agent: '수빈' },
              { step: '3', name: '글쓰기', agent: '작가' },
              { step: '4', name: '편집', agent: '서연' },
              { step: '5', name: 'SEO', agent: '준서' },
              { step: '6', name: '완성', agent: '팀' },
            ].map((item, index, array) => (
              <div key={item.step} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 bg-naver-green text-white rounded-full flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <p className="mt-2 font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.agent}</p>
                </div>
                {index < array.length - 1 && (
                  <div className="w-8 h-0.5 bg-naver-green mx-2 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
