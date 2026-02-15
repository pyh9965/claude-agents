/**
 * Tavily AI 검색 서비스
 *
 * Tavily는 AI 최적화 검색 API로, 팩트 추출과 할루시네이션 방지에 특화되어 있습니다.
 * - 무료: 1000회/월
 * - 특징: AI 기반 답변, 관련도 점수, 원본 콘텐츠 추출
 */

import { createLogger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';
import type {
  TavilySearchParams,
  TavilyResult,
  TavilyResponse,
  SearchResultItem,
} from '../types/research.js';
import type { Fact } from '../types/content.js';

const logger = createLogger('TavilyService');

/** Tavily API 기본 URL */
const TAVILY_API_URL = 'https://api.tavily.com/search';

/** 기본 검색 옵션 */
const DEFAULT_SEARCH_OPTIONS: Partial<TavilySearchParams> = {
  searchDepth: 'advanced',
  includeAnswer: true,
  includeRawContent: false,
  maxResults: 10,
};

/**
 * Tavily 검색 서비스 클래스
 */
export class TavilyService {
  private readonly apiKey: string | undefined;

  constructor() {
    const config = getConfig();
    this.apiKey = config.tavilyApiKey;
  }

  /**
   * API 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Tavily 검색 실행
   */
  async search(params: TavilySearchParams): Promise<TavilyResult[]> {
    if (!this.isAvailable()) {
      logger.warn('Tavily API 키가 설정되지 않았습니다.');
      return [];
    }

    const startTime = Date.now();
    const mergedParams = { ...DEFAULT_SEARCH_OPTIONS, ...params };

    logger.debug(`Tavily 검색 시작: "${params.query}"`);

    try {
      const response = await this.fetchWithTimeout(
        TAVILY_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: this.apiKey,
            query: mergedParams.query,
            search_depth: mergedParams.searchDepth,
            include_answer: mergedParams.includeAnswer,
            include_raw_content: mergedParams.includeRawContent,
            max_results: mergedParams.maxResults,
            include_domains: mergedParams.includeDomains,
            exclude_domains: mergedParams.excludeDomains,
          }),
        },
        10000 // 10초 타임아웃
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Tavily API 오류: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as TavilyResponse;
      const duration = Date.now() - startTime;

      logger.info(`Tavily 검색 완료: ${data.results?.length || 0}개 결과 (${duration}ms)`);

      return data.results || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Tavily 검색 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 검색 결과를 표준 형식으로 변환
   */
  async searchAsStandardItems(params: TavilySearchParams): Promise<SearchResultItem[]> {
    const results = await this.search(params);

    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
      publishedDate: result.publishedDate,
      source: 'tavily',
      score: result.score,
      rawContent: result.rawContent,
    }));
  }

  /**
   * 검색 결과에서 팩트 추출
   */
  async extractFacts(query: string): Promise<Fact[]> {
    const results = await this.search({
      query,
      searchDepth: 'advanced',
      includeAnswer: true,
      maxResults: 5,
    });

    const facts: Fact[] = [];

    for (const result of results) {
      // 각 결과의 콘텐츠를 팩트로 변환
      // Tavily는 이미 관련 콘텐츠를 추출해주므로 그대로 사용
      facts.push({
        content: result.content,
        source: result.title,
        reliability: this.calculateReliability(result.score),
        sourceType: 'tavily',
        sourceUrl: result.url,
        validationStatus: 'single-source',
        extractedAt: new Date(),
      });
    }

    return facts;
  }

  /**
   * AI 답변과 함께 검색
   */
  async searchWithAnswer(query: string): Promise<{ answer: string | null; results: TavilyResult[] }> {
    if (!this.isAvailable()) {
      return { answer: null, results: [] };
    }

    try {
      const response = await this.fetchWithTimeout(
        TAVILY_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: this.apiKey,
            query,
            search_depth: 'advanced',
            include_answer: true,
            max_results: 5,
          }),
        },
        15000 // AI 답변 생성에 더 긴 타임아웃
      );

      if (!response.ok) {
        throw new Error(`Tavily API 오류: ${response.status}`);
      }

      const data = (await response.json()) as TavilyResponse;

      return {
        answer: data.answer || null,
        results: data.results || [],
      };
    } catch (error) {
      logger.error(`Tavily 답변 검색 실패: ${error}`);
      return { answer: null, results: [] };
    }
  }

  /**
   * 관련도 점수를 신뢰도로 변환 (1-5)
   */
  private calculateReliability(score: number): number {
    // Tavily 점수는 0-1 범위
    // 1-5 범위로 변환
    if (score >= 0.8) return 5;
    if (score >= 0.6) return 4;
    if (score >= 0.4) return 3;
    if (score >= 0.2) return 2;
    return 1;
  }

  /**
   * 타임아웃 포함 fetch
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/** Tavily 서비스 싱글톤 */
let tavilyInstance: TavilyService | null = null;

/**
 * Tavily 서비스 인스턴스 가져오기
 */
export function getTavilyService(): TavilyService {
  if (!tavilyInstance) {
    tavilyInstance = new TavilyService();
  }
  return tavilyInstance;
}

/**
 * Tavily 서비스 인스턴스 초기화 (테스트용)
 */
export function resetTavilyService(): void {
  tavilyInstance = null;
}
