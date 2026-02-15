import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for lifestyle content type
 * 라이프스타일 콘텐츠 필수 질문
 */
const LIFESTYLE_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'lifestyle_topic',
    text: '라이프스타일의 어떤 영역을 다루시나요?',
    type: 'select',
    required: true,
    options: ['일상/루틴', '취미/여가', '인테리어/공간', '패션/뷰티', '건강/웰니스', '여행/문화', '기타'],
    hint: '가장 가까운 카테고리를 선택해주세요',
    mapsTo: 'referenceData.lifestyleTopic',
  },
  {
    id: 'personal_experience',
    text: '직접 경험하신 내용인가요? 어떤 경험을 공유하실건가요?',
    type: 'text',
    required: true,
    hint: '예: 3개월간 실천한 아침 루틴, 작은 방 꾸미기 프로젝트',
    mapsTo: 'referenceData.personalExperience',
  },
  {
    id: 'emotion_focus',
    text: '어떤 느낌을 전달하고 싶으신가요?',
    type: 'select',
    required: true,
    options: ['편안함/힐링', '활력/에너지', '설렘/기대', '따뜻함/위로', '영감/동기부여', '실용성/효율'],
    hint: '독자에게 전하고 싶은 감성을 선택해주세요',
    mapsTo: 'referenceData.emotionFocus',
  },
];

/**
 * Optional questions for lifestyle content type
 * 라이프스타일 콘텐츠 선택 질문
 */
const LIFESTYLE_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'products_mentioned',
    text: '소개하고 싶은 제품이나 장소가 있나요?',
    type: 'text',
    required: false,
    hint: '예: 무인양품 수납함, 한남동 카페, 요가 매트 (쉼표로 구분)',
    mapsTo: 'referenceData.productsMentioned',
  },
  {
    id: 'tips_to_share',
    text: '독자와 나누고 싶은 팁이나 노하우가 있나요?',
    type: 'text',
    required: false,
    hint: '예: 작은 공간 활용법, 시간 관리 비법, 예산 절약 팁',
    mapsTo: 'referenceData.tipsToShare',
  },
  {
    id: 'before_after',
    text: '변화 과정(비포/애프터)을 보여줄까요?',
    type: 'boolean',
    required: false,
    defaultValue: false,
    hint: '변화의 과정은 독자에게 동기부여가 됩니다',
    mapsTo: 'referenceData.includeBeforeAfter',
  },
  ...COMMON_QUESTIONS.filter(q => ['target_audience', 'tone', 'keywords'].includes(q.id)),
  {
    id: 'season_relevance',
    text: '계절이나 시기와 관련이 있나요?',
    type: 'text',
    required: false,
    hint: '예: 봄맞이, 새해 준비, 여름 휴가, 연말 정리',
    mapsTo: 'referenceData.seasonRelevance',
  },
];

/**
 * Lifestyle content interview schema
 * 라이프스타일 콘텐츠 인터뷰 스키마
 */
export const LIFESTYLE_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: LIFESTYLE_REQUIRED,
  optional: LIFESTYLE_OPTIONAL,
};
