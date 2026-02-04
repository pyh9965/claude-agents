import type { BaseInterviewSchema, InterviewQuestion } from '../types.js';
import { COMMON_QUESTIONS } from './base.js';

/**
 * Required questions for info content type
 * 정보성 콘텐츠 필수 질문
 */
const INFO_REQUIRED: InterviewQuestion[] = [
  ...COMMON_QUESTIONS.filter(q => q.id === 'topic_detail'),
  {
    id: 'content_depth',
    text: '어느 정도 깊이로 다룰까요?',
    type: 'select',
    required: true,
    options: ['입문자용 (쉽게)', '중급자용 (상세히)', '전문가용 (깊이있게)'],
    hint: '독자의 사전 지식 수준을 고려해주세요',
    mapsTo: 'referenceData.contentDepth',
  },
  {
    id: 'key_points',
    text: '반드시 포함해야 할 핵심 내용은 무엇인가요?',
    type: 'text',
    required: true,
    hint: '예: 설치 방법, 주의사항, 비용 정보 (쉼표로 구분)',
    mapsTo: 'referenceData.keyPoints',
  },
  {
    id: 'content_structure',
    text: '어떤 구조로 정보를 전달하고 싶으신가요?',
    type: 'select',
    required: true,
    options: ['단계별 가이드', '비교/분석형', 'Q&A 형식', '종합 설명'],
    defaultValue: '종합 설명',
    mapsTo: 'referenceData.contentStructure',
  },
];

/**
 * Optional questions for info content type
 * 정보성 콘텐츠 선택 질문
 */
const INFO_OPTIONAL: InterviewQuestion[] = [
  {
    id: 'examples_needed',
    text: '예시나 사례를 포함할까요?',
    type: 'boolean',
    required: false,
    defaultValue: true,
    hint: '구체적인 예시가 있으면 이해하기 쉬워집니다',
    mapsTo: 'referenceData.includeExamples',
  },
  {
    id: 'reference_sources',
    text: '참고할 출처나 자료가 있나요?',
    type: 'text',
    required: false,
    hint: '예: 공식 문서 URL, 통계 자료, 전문가 의견',
    mapsTo: 'referenceData.referenceSources',
  },
  ...COMMON_QUESTIONS.filter(q => ['target_audience', 'tone', 'keywords'].includes(q.id)),
  {
    id: 'visual_content',
    text: '표나 다이어그램을 포함할까요?',
    type: 'boolean',
    required: false,
    defaultValue: false,
    hint: '복잡한 정보는 시각화하면 효과적입니다',
    mapsTo: 'referenceData.includeVisuals',
  },
];

/**
 * Info content interview schema
 * 정보성 콘텐츠 인터뷰 스키마
 */
export const INFO_INTERVIEW_SCHEMA: BaseInterviewSchema = {
  required: INFO_REQUIRED,
  optional: INFO_OPTIONAL,
};
