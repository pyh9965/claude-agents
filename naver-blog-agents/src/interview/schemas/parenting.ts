import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for parenting content type
 * 육아 콘텐츠 필수 질문
 */
const PARENTING_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'child_age',
    text: '아이의 연령대는 어떻게 되나요?',
    type: 'select',
    required: true,
    options: ['임신/출산', '신생아(0-12개월)', '영아(1-3세)', '유아(4-7세)', '초등 저학년', '초등 고학년', '청소년', '해당 없음'],
    hint: '콘텐츠의 주 대상이 되는 연령대를 선택해주세요',
    mapsTo: 'referenceData.childAge',
  },
  {
    id: 'topic_focus',
    text: '어떤 육아 주제를 다루시나요?',
    type: 'select',
    required: true,
    options: ['발달/성장', '건강/영양', '놀이/활동', '교육/학습', '육아용품', '부모 마음케어', '가족 관계', '기타'],
    hint: '가장 중점적으로 다룰 주제를 선택해주세요',
    mapsTo: 'referenceData.topicFocus',
  },
  {
    id: 'experience_type',
    text: '어떤 종류의 경험을 공유하시나요?',
    type: 'select',
    required: true,
    options: ['실제 경험담', '전문가 조언', '제품 사용 후기', '육아 정보', '고민 해결 과정', '일상 공유'],
    hint: '콘텐츠의 주된 내용 형식을 선택해주세요',
    mapsTo: 'referenceData.experienceType',
  },
];

/**
 * Optional questions for parenting content type
 * 육아 콘텐츠 선택 질문
 */
const PARENTING_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'products_used',
    text: '소개하고 싶은 육아 제품이나 서비스가 있나요?',
    type: 'text',
    required: false,
    hint: '예: 기저귀, 카시트, 놀이학습지, 육아 앱 (쉼표로 구분)',
    mapsTo: 'referenceData.productsUsed',
  },
  {
    id: 'safety_notes',
    text: '안전 주의사항이나 주의할 점이 있나요?',
    type: 'text',
    required: false,
    hint: '예: 연령 제한, 알레르기 주의, 사용법 주의사항',
    mapsTo: 'referenceData.safetyNotes',
  },
  {
    id: 'advice_for_others',
    text: '다른 부모님들께 전하고 싶은 조언이 있나요?',
    type: 'text',
    required: false,
    hint: '예: 시행착오를 통해 배운 점, 미리 알았으면 좋았을 정보',
    mapsTo: 'referenceData.adviceForOthers',
  },
  {
    id: 'budget_info',
    text: '비용 정보를 포함할까요?',
    type: 'boolean',
    required: false,
    defaultValue: false,
    hint: '제품이나 서비스의 가격대 정보',
    mapsTo: 'referenceData.includeBudget',
  },
  ...COMMON_QUESTIONS.filter(q => ['target_audience', 'tone', 'keywords'].includes(q.id)),
  {
    id: 'challenges_faced',
    text: '겪었던 어려움이나 고민이 있었나요?',
    type: 'text',
    required: false,
    hint: '예: 수면 교육 실패담, 편식 고민, 훈육 방법 시행착오',
    mapsTo: 'referenceData.challengesFaced',
  },
];

/**
 * Parenting content interview schema
 * 육아 콘텐츠 인터뷰 스키마
 */
export const PARENTING_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: PARENTING_REQUIRED,
  optional: PARENTING_OPTIONAL,
};
