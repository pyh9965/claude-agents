import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for product reviews
 * Focuses on product details and personal experience
 */
const REVIEW_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'product_name',
    text: '리뷰할 제품의 정확한 이름/모델명이 무엇인가요?',
    type: 'text',
    required: true,
    hint: '예: 삼성 갤럭시 S24 Ultra 512GB',
    mapsTo: 'referenceData.productName',
  },
  {
    id: 'purchase_info',
    text: '어디서 구매하셨나요? (구매처와 가격)',
    type: 'text',
    required: true,
    hint: '예: 온라인 쿠팡, 149만원 (할인가)',
    mapsTo: 'referenceData.purchaseInfo',
  },
  {
    id: 'usage_period',
    text: '얼마나 사용해보셨나요?',
    type: 'text',
    required: true,
    hint: '예: 2주일, 3개월 사용 중',
    mapsTo: 'referenceData.usagePeriod',
  },
  {
    id: 'pros',
    text: '장점이나 마음에 든 점을 알려주세요.',
    type: 'text',
    required: true,
    hint: '여러 개라면 쉼표로 구분해주세요',
    mapsTo: 'referenceData.pros',
  },
];

/**
 * Optional questions for product reviews
 * Provides balanced perspective and recommendations
 */
const REVIEW_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'cons',
    text: '단점이나 아쉬운 점이 있나요?',
    type: 'text',
    required: false,
    hint: '솔직한 의견을 알려주세요',
    mapsTo: 'referenceData.cons',
  },
  {
    id: 'comparison',
    text: '다른 제품과 비교해보셨나요? 어떤 제품과 비교하셨나요?',
    type: 'text',
    required: false,
    hint: '예: 아이폰 15 Pro와 비교',
    mapsTo: 'referenceData.comparison',
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
    text: '이 제품을 어떤 분들에게 추천하고 싶으신가요?',
    type: 'text',
    required: false,
    hint: '예: 사진 찍기 좋아하는 분, 학생, 직장인',
    mapsTo: 'referenceData.recommendTo',
  },
  {
    id: 'repurchase',
    text: '다시 구매할 의향이 있으신가요?',
    type: 'boolean',
    required: false,
    mapsTo: 'referenceData.repurchaseIntent',
  },
  {
    id: 'value_for_money',
    text: '가격 대비 만족도는 어떤가요?',
    type: 'select',
    required: false,
    options: ['매우 만족', '만족', '보통', '아쉬움', '불만족'],
    mapsTo: 'referenceData.valueForMoney',
  },
];

/**
 * Interview schema for product reviews (제품 리뷰)
 * Used by 태현 (IT/가전 리뷰 전문 작가)
 */
export const REVIEW_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: REVIEW_REQUIRED,
  optional: REVIEW_OPTIONAL,
};
