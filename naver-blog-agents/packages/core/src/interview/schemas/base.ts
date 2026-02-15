import type { InterviewQuestion } from '../types.js';

/**
 * Common questions shared across all content types
 * These are asked first before type-specific questions
 */
export const COMMON_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'topic_detail',
    text: '어떤 주제로 블로그 글을 작성하시나요? 구체적으로 알려주세요.',
    type: 'text',
    required: true,
    hint: '예: 강남역 근처 분위기 좋은 파스타 맛집',
    mapsTo: 'topic',
  },
  {
    id: 'target_audience',
    text: '이 글의 주요 독자는 누구인가요?',
    type: 'text',
    required: false,
    hint: '예: 20-30대 직장인, 데이트 장소를 찾는 커플',
    mapsTo: 'targetAudience',
  },
  {
    id: 'tone',
    text: '글의 톤을 선택해주세요.',
    type: 'select',
    required: false,
    options: ['formal (정중한)', 'casual (편안한)', 'friendly (친근한)'],
    defaultValue: 'friendly',
    mapsTo: 'tone',
  },
  {
    id: 'keywords',
    text: '블로그 글에 포함하고 싶은 키워드가 있나요?',
    type: 'text',
    required: false,
    hint: '예: 강남맛집, 데이트코스, 파스타 (쉼표로 구분)',
    mapsTo: 'referenceData.userKeywords',
  },
];
