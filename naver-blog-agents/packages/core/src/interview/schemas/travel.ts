import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for travel content
 * Focuses on destination and trip highlights
 */
const TRAVEL_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'destination',
    text: '어디를 여행하셨나요? (국가/도시/지역)',
    type: 'text',
    required: true,
    hint: '예: 일본 도쿄, 제주 서귀포, 부산 해운대',
    mapsTo: 'referenceData.destination',
  },
  {
    id: 'travel_period',
    text: '여행 기간은 어떻게 되나요?',
    type: 'text',
    required: true,
    hint: '예: 2024년 12월 23-26일 (3박 4일)',
    mapsTo: 'referenceData.travelPeriod',
  },
  {
    id: 'companions',
    text: '누구와 함께 여행하셨나요?',
    type: 'select',
    required: true,
    options: ['혼자', '친구', '연인', '가족', '단체'],
    mapsTo: 'referenceData.companions',
  },
  {
    id: 'highlights',
    text: '여행의 하이라이트나 꼭 추천하고 싶은 장소/경험을 알려주세요.',
    type: 'text',
    required: true,
    hint: '여러 개라면 쉼표로 구분해주세요',
    mapsTo: 'referenceData.highlights',
  },
];

/**
 * Optional questions for travel content
 * Provides practical information and tips
 */
const TRAVEL_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'accommodation',
    text: '어디에서 숙박하셨나요?',
    type: 'text',
    required: false,
    hint: '예: 신주쿠 호텔 ○○○, 게스트하우스',
    mapsTo: 'referenceData.accommodation',
  },
  {
    id: 'budget',
    text: '대략적인 여행 경비는 어느 정도였나요? (1인 기준)',
    type: 'text',
    required: false,
    hint: '예: 항공 50만원, 숙박 30만원, 식비/활동비 40만원',
    mapsTo: 'referenceData.budget',
  },
  {
    id: 'transportation',
    text: '주요 이동 수단은 무엇이었나요?',
    type: 'multiselect',
    required: false,
    options: ['대중교통', '렌터카', '택시', '도보', '자전거', '투어버스'],
    mapsTo: 'referenceData.transportation',
  },
  {
    id: 'tips',
    text: '여행 팁이나 주의사항이 있다면 알려주세요.',
    type: 'text',
    required: false,
    hint: '예: 사전 예약 필수, 현금 준비, 날씨 체크',
    mapsTo: 'referenceData.tips',
  },
  {
    id: 'rating',
    text: '이 여행지를 추천하시나요? (1-5점)',
    type: 'scale',
    required: false,
    scaleRange: { min: 1, max: 5 },
    defaultValue: 4,
    mapsTo: 'referenceData.rating',
  },
  {
    id: 'season_recommend',
    text: '어떤 계절에 방문하는 것을 추천하시나요?',
    type: 'multiselect',
    required: false,
    options: ['봄', '여름', '가을', '겨울', '사계절'],
    mapsTo: 'referenceData.seasonRecommend',
  },
  {
    id: 'revisit',
    text: '다시 방문하고 싶으신가요?',
    type: 'boolean',
    required: false,
    mapsTo: 'referenceData.revisitIntent',
  },
];

/**
 * Interview schema for travel content (여행)
 * Can be used by 지은 언니 (마케팅/여행) or 현우 선생님 (정보성 가이드)
 */
export const TRAVEL_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: TRAVEL_REQUIRED,
  optional: TRAVEL_OPTIONAL,
};
