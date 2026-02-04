import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for marketing content type
 * 마케팅 콘텐츠 필수 질문
 */
const MARKETING_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'brand_name',
    text: '홍보하려는 브랜드나 제품 이름은 무엇인가요?',
    type: 'text',
    required: true,
    hint: '예: 스타벅스, 아이폰 15 Pro, 제주 카멜리아힐',
    mapsTo: 'referenceData.brandName',
  },
  {
    id: 'target_action',
    text: '독자가 어떤 행동을 하길 원하시나요?',
    type: 'select',
    required: true,
    options: ['방문/구매', '브랜드 인지', '문의/상담', '공유/바이럴', '이벤트 참여'],
    hint: '콘텐츠의 최종 목표를 선택해주세요',
    mapsTo: 'referenceData.targetAction',
  },
  {
    id: 'key_benefits',
    text: '이 제품/서비스의 핵심 장점은 무엇인가요?',
    type: 'text',
    required: true,
    hint: '예: 합리적인 가격, 독특한 디자인, 뛰어난 성능 (쉼표로 구분)',
    mapsTo: 'referenceData.keyBenefits',
  },
];

/**
 * Optional questions for marketing content type
 * 마케팅 콘텐츠 선택 질문
 */
const MARKETING_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'collaboration_type',
    text: '협찬이나 제휴 관계인가요?',
    type: 'select',
    required: false,
    options: ['협찬 받음', '제휴/파트너십', '순수 경험 후기', '해당 없음'],
    defaultValue: '해당 없음',
    hint: '투명한 공개가 신뢰를 높입니다',
    mapsTo: 'referenceData.collaborationType',
  },
  {
    id: 'must_include',
    text: '반드시 언급해야 할 특정 내용이 있나요?',
    type: 'text',
    required: false,
    hint: '예: 이벤트 기간, 할인 코드, 특정 기능',
    mapsTo: 'referenceData.mustInclude',
  },
  {
    id: 'cta_style',
    text: '행동 유도 문구(CTA) 스타일을 선택해주세요.',
    type: 'select',
    required: false,
    options: ['적극적 (지금 바로!)', '부드러운 (한번 확인해보세요)', '정보 제공형 (상세 정보는...)', '없음'],
    defaultValue: '부드러운 (한번 확인해보세요)',
    mapsTo: 'referenceData.ctaStyle',
  },
  ...COMMON_QUESTIONS.filter(q => ['target_audience', 'tone', 'keywords'].includes(q.id)),
  {
    id: 'competitor_mention',
    text: '경쟁 제품과 비교할까요?',
    type: 'boolean',
    required: false,
    defaultValue: false,
    hint: '공정한 비교는 신뢰도를 높일 수 있습니다',
    mapsTo: 'referenceData.includeComparison',
  },
];

/**
 * Marketing content interview schema
 * 마케팅 콘텐츠 인터뷰 스키마
 */
export const MARKETING_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: MARKETING_REQUIRED,
  optional: MARKETING_OPTIONAL,
};
