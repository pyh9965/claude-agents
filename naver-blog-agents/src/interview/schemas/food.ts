import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for food/restaurant reviews
 * Focuses on dining experience and menu details
 */
const FOOD_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'restaurant_name',
    text: '리뷰할 식당/카페 이름이 무엇인가요?',
    type: 'text',
    required: true,
    mapsTo: 'referenceData.restaurantName',
  },
  {
    id: 'location',
    text: '위치(지역/역 근처)를 알려주세요.',
    type: 'text',
    required: true,
    hint: '예: 강남역 3번 출구, 홍대 주차장거리',
    mapsTo: 'referenceData.location',
  },
  {
    id: 'menu_ordered',
    text: '어떤 메뉴를 주문하셨나요? (메뉴명과 가격)',
    type: 'text',
    required: true,
    hint: '예: 까르보나라 파스타 15,000원, 아메리카노 4,500원',
    mapsTo: 'referenceData.menuOrdered',
  },
];

/**
 * Optional questions for food/restaurant reviews
 * Provides additional context and subjective evaluation
 */
const FOOD_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'visit_date',
    text: '언제 방문하셨나요?',
    type: 'text',
    required: false,
    hint: '예: 2024년 1월 15일 주말 저녁',
    mapsTo: 'referenceData.visitDate',
  },
  {
    id: 'companion',
    text: '누구와 함께 가셨나요?',
    type: 'select',
    required: false,
    options: ['혼자', '친구', '연인', '가족', '동료'],
    mapsTo: 'referenceData.companion',
  },
  {
    id: 'atmosphere',
    text: '매장 분위기는 어땠나요?',
    type: 'multiselect',
    required: false,
    options: ['조용함', '활기찬', '아늑함', '모던함', '인스타감성', '캐주얼', '고급스러움'],
    mapsTo: 'referenceData.atmosphere',
  },
  {
    id: 'rating',
    text: '추천 점수를 매겨주세요 (1-5점)',
    type: 'scale',
    required: false,
    scaleRange: { min: 1, max: 5 },
    defaultValue: 4,
    mapsTo: 'referenceData.rating',
  },
  {
    id: 'revisit',
    text: '재방문 의사가 있으신가요?',
    type: 'boolean',
    required: false,
    mapsTo: 'referenceData.revisitIntent',
  },
  {
    id: 'special_notes',
    text: '특별히 더 언급하고 싶은 내용이 있나요?',
    type: 'text',
    required: false,
    hint: '예: 주차 가능, 웨이팅 심함, 예약 필수',
    mapsTo: 'referenceData.specialNotes',
  },
];

/**
 * Interview schema for food/restaurant reviews (맛집 리뷰)
 * Used by 하린 (맛집 전문 작가)
 */
export const FOOD_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: FOOD_REQUIRED,
  optional: FOOD_OPTIONAL,
};
