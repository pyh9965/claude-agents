import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for tech/IT content
 * Focuses on technical specifications and use cases
 */
const TECH_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'product_name',
    text: '다룰 제품이나 기술의 이름은 무엇인가요?',
    type: 'text',
    required: true,
    hint: '예: MacBook Pro M3, ChatGPT-4, React 18',
    mapsTo: 'referenceData.productName',
  },
  {
    id: 'specs_focus',
    text: '어떤 사양이나 기능에 집중하고 싶으신가요?',
    type: 'text',
    required: true,
    hint: '예: 성능, 배터리, AI 기능, 개발자 경험',
    mapsTo: 'referenceData.specsFocus',
  },
  {
    id: 'usage_purpose',
    text: '주로 어떤 용도로 사용하시나요?',
    type: 'text',
    required: true,
    hint: '예: 영상 편집, 개발, 게임, 업무',
    mapsTo: 'referenceData.usagePurpose',
  },
];

/**
 * Optional questions for tech/IT content
 * Provides comparative analysis and value assessment
 */
const TECH_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'comparison',
    text: '비교하고 싶은 다른 제품이나 기술이 있나요?',
    type: 'text',
    required: false,
    hint: '예: vs 윈도우 노트북, vs GPT-3.5, vs Vue',
    mapsTo: 'referenceData.comparison',
  },
  {
    id: 'price_value',
    text: '가격과 성능을 고려했을 때 어떻게 평가하시나요?',
    type: 'select',
    required: false,
    options: ['가성비 최고', '가격 대비 만족', '적정 수준', '다소 비쌈', '가성비 아쉬움'],
    mapsTo: 'referenceData.priceValue',
  },
  {
    id: 'pros_cons',
    text: '장점과 단점을 간단히 정리해주세요.',
    type: 'text',
    required: false,
    hint: '장점: ... / 단점: ...',
    mapsTo: 'referenceData.prosAndCons',
  },
  {
    id: 'technical_level',
    text: '이 제품/기술을 사용하려면 어느 정도의 기술 수준이 필요한가요?',
    type: 'select',
    required: false,
    options: ['초보자도 OK', '기본 지식 필요', '중급 이상', '전문가 수준'],
    mapsTo: 'referenceData.technicalLevel',
  },
  {
    id: 'rating',
    text: '종합 평가 점수를 매겨주세요 (1-5점)',
    type: 'scale',
    required: false,
    scaleRange: { min: 1, max: 5 },
    defaultValue: 4,
    mapsTo: 'referenceData.rating',
  },
  {
    id: 'recommend_to',
    text: '어떤 사람에게 추천하고 싶으신가요?',
    type: 'text',
    required: false,
    hint: '예: 개발자, 크리에이터, 학생, 일반 사용자',
    mapsTo: 'referenceData.recommendTo',
  },
  {
    id: 'future_outlook',
    text: '이 기술이나 제품의 미래 전망에 대해 어떻게 생각하시나요?',
    type: 'text',
    required: false,
    mapsTo: 'referenceData.futureOutlook',
  },
];

/**
 * Interview schema for tech/IT content (IT/테크)
 * Used by 태현 (IT/가전 리뷰 전문 작가)
 */
export const TECH_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: TECH_REQUIRED,
  optional: TECH_OPTIONAL,
};
