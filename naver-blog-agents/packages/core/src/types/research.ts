/**
 * 리서치 관련 타입 정의
 */

import type { SearchSourceType } from '../utils/config.js';
import type { Fact, Source } from './content.js';

/** 리서치 옵션 */
export interface ResearchOptions {
  /** 리서치 깊이 */
  depth: 'quick' | 'standard' | 'deep';
  /** 사용할 검색 소스 */
  sources: SearchSourceType[];
  /** 키워드 확장 여부 */
  expandKeywords: boolean;
  /** 교차검증 여부 */
  crossValidate: boolean;
  /** 최대 결과 수 */
  maxResults: number;
  /** 타임아웃 (ms) */
  timeout: number;
}

/** 기본 리서치 옵션 */
export const DEFAULT_RESEARCH_OPTIONS: ResearchOptions = {
  depth: 'deep',
  sources: ['tavily', 'google', 'firecrawl', 'naver'],
  expandKeywords: true,
  crossValidate: true,
  maxResults: 10,
  timeout: 180000, // 3분
};

/** 검색 결과 항목 */
export interface SearchResultItem {
  /** 제목 */
  title: string;
  /** URL */
  url: string;
  /** 요약/스니펫 */
  snippet: string;
  /** 발행일 */
  publishedDate?: string;
  /** 출처 */
  source?: string;
  /** 관련도 점수 (0-1) */
  score?: number;
  /** 원본 콘텐츠 (추출된 경우) */
  rawContent?: string;
}

/** 개별 소스의 검색 결과 */
export interface SearchSourceResult {
  /** 검색 소스 */
  source: SearchSourceType;
  /** 검색 쿼리 */
  query: string;
  /** 검색 결과 */
  results: SearchResultItem[];
  /** 검색 시간 */
  timestamp: Date;
  /** 검색 소요 시간 (ms) */
  duration: number;
  /** 에러 메시지 (실패 시) */
  error?: string;
}

/** 키워드 확장 결과 */
export interface KeywordExpansionResult {
  /** 원본 키워드 */
  original: string;
  /** 확장된 키워드 */
  expanded: string[];
  /** 동의어 */
  synonyms: string[];
  /** 관련 용어 */
  relatedTerms: string[];
}

/** 팩트 검증 결과 */
export interface FactValidationResult {
  /** 원본 팩트 */
  fact: Fact;
  /** 검증한 출처들 */
  validatedBy: Source[];
  /** 신뢰도 (0-1) */
  confidence: number;
  /** 검증 상태 */
  status: 'verified' | 'cross-validated' | 'single-source' | 'unverified';
  /** 충돌하는 정보가 있는 경우 */
  conflicts?: string[];
}

/** 통합 리서치 결과 */
export interface AggregatedResearchResult {
  /** 소스별 검색 결과 */
  sourceResults: SearchSourceResult[];
  /** 교차검증된 팩트 */
  crossValidatedFacts: Fact[];
  /** 확장된 키워드 */
  expandedKeywords: string[];
  /** 경쟁 URL들 */
  competitorUrls: string[];
  /** 총 검색 시간 (ms) */
  totalSearchTime: number;
  /** 경고 메시지 (미검증 팩트 등) */
  warnings: string[];
  /** 통계 */
  statistics: ResearchStatistics;
}

/** 리서치 통계 */
export interface ResearchStatistics {
  /** 총 검색 소스 수 */
  totalSources: number;
  /** 성공한 소스 수 */
  successfulSources: number;
  /** 총 결과 수 */
  totalResults: number;
  /** 추출된 팩트 수 */
  extractedFacts: number;
  /** 검증된 팩트 수 */
  verifiedFacts: number;
  /** 검증 비율 */
  verificationRate: number;
}

/** Deep Research 옵션 */
export interface DeepResearchOptions {
  /** 리서치 깊이 */
  depth: 'quick' | 'standard' | 'deep';
  /** 할루시네이션 방지 모드 */
  hallucinationMode: 'strict' | 'balanced' | 'permissive';
  /** 사용할 검색 소스 */
  sources?: SearchSourceType[];
  /** 키워드 확장 여부 */
  expandKeywords?: boolean;
  /** 교차검증 여부 */
  crossValidate?: boolean;
  /** 진행 상황 콜백 */
  onProgress?: (stage: string, progress: number) => void;
}

/** Tavily 검색 파라미터 */
export interface TavilySearchParams {
  /** 검색 쿼리 */
  query: string;
  /** 검색 깊이 */
  searchDepth?: 'basic' | 'advanced';
  /** AI 답변 포함 여부 */
  includeAnswer?: boolean;
  /** 원본 콘텐츠 포함 여부 */
  includeRawContent?: boolean;
  /** 최대 결과 수 */
  maxResults?: number;
  /** 포함할 도메인 */
  includeDomains?: string[];
  /** 제외할 도메인 */
  excludeDomains?: string[];
}

/** Tavily 검색 결과 */
export interface TavilyResult {
  /** 제목 */
  title: string;
  /** URL */
  url: string;
  /** 콘텐츠 */
  content: string;
  /** 관련도 점수 */
  score: number;
  /** 발행일 */
  publishedDate?: string;
  /** 원본 콘텐츠 */
  rawContent?: string;
}

/** Tavily API 응답 */
export interface TavilyResponse {
  /** 검색 쿼리 */
  query: string;
  /** AI 생성 답변 */
  answer?: string;
  /** 검색 결과 */
  results: TavilyResult[];
  /** 이미지 (있는 경우) */
  images?: string[];
}

/** Google 검색 파라미터 */
export interface GoogleSearchParams {
  /** 검색 쿼리 */
  query: string;
  /** 결과 수 (1-10) */
  num?: number;
  /** 시작 위치 */
  start?: number;
  /** 날짜 제한 (예: 'd7' = 7일) */
  dateRestrict?: string;
  /** 특정 사이트 검색 */
  siteSearch?: string;
  /** 언어 */
  language?: string;
}

/** Google 검색 결과 항목 */
export interface GoogleSearchResultItem {
  /** 제목 */
  title: string;
  /** 링크 */
  link: string;
  /** 스니펫 */
  snippet: string;
  /** 표시 링크 */
  displayLink?: string;
  /** 캐시 링크 */
  cacheId?: string;
}

/** Google 검색 응답 */
export interface GoogleSearchResponse {
  /** 검색 정보 */
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  /** 검색 결과 */
  items?: GoogleSearchResultItem[];
}

/** Firecrawl 크롤링 파라미터 */
export interface FirecrawlParams {
  /** URL */
  url: string;
  /** 출력 포맷 */
  formats?: ('markdown' | 'html' | 'rawHtml')[];
  /** 포함할 태그 */
  includeTags?: string[];
  /** 제외할 태그 */
  excludeTags?: string[];
  /** 타임아웃 (ms) */
  timeout?: number;
}

/** Firecrawl 크롤링 결과 */
export interface FirecrawlResult {
  /** 성공 여부 */
  success: boolean;
  /** 마크다운 콘텐츠 */
  markdown?: string;
  /** HTML 콘텐츠 */
  html?: string;
  /** 메타데이터 */
  metadata?: {
    title?: string;
    description?: string;
    ogImage?: string;
  };
  /** 에러 메시지 */
  error?: string;
}

/** Jina 추출 파라미터 */
export interface JinaParams {
  /** URL */
  url: string;
  /** 모드 */
  mode?: 'reader' | 'search';
}

/** Jina 추출 결과 */
export interface JinaResult {
  /** 마크다운 콘텐츠 */
  markdown: string;
  /** 이미지 URL들 */
  images: string[];
  /** 링크들 */
  links: string[];
  /** 제목 */
  title?: string;
}

/** 추출된 콘텐츠 */
export interface ExtractedContent {
  /** URL */
  url: string;
  /** 제목 */
  title: string;
  /** 마크다운 콘텐츠 */
  markdown: string;
  /** 이미지 URL들 */
  images: string[];
  /** 링크들 */
  links: string[];
  /** 추출 시간 */
  extractedAt: Date;
  /** 추출 소스 */
  extractedBy: 'firecrawl' | 'jina';
}
