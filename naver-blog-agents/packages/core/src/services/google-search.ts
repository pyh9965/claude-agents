/**
 * Google Custom Search 서비스
 *
 * Google Custom Search API를 사용한 웹 검색 서비스입니다.
 * - 무료: 100회/일
 * - 유료: $5/1000회
 * - 특징: 높은 검색 품질, 다양한 필터 옵션
 */

import { createLogger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';
import type {
  GoogleSearchParams,
  GoogleSearchResultItem,
  GoogleSearchResponse,
  SearchResultItem,
} from '../types/research.js';

const logger = createLogger('GoogleSearchService');

/** Google Custom Search API URL */
const GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';

/** 기본 검색 옵션 */
const DEFAULT_SEARCH_OPTIONS: Partial<GoogleSearchParams> = {
  num: 10,
  language: 'ko',
};

/**
 * Google Custom Search 서비스 클래스
 */
export class GoogleSearchService {
  private readonly apiKey: string | undefined;
  private readonly searchEngineId: string | undefined;

  constructor() {
    const config = getConfig();
    this.apiKey = config.googleSearchApiKey;
    this.searchEngineId = config.googleSearchEngineId;
  }

  /**
   * API 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return !!(this.apiKey && this.searchEngineId);
  }

  /**
   * Google 검색 실행
   */
  async search(params: GoogleSearchParams): Promise<GoogleSearchResultItem[]> {
    if (!this.isAvailable()) {
      logger.warn('Google Search API 키 또는 엔진 ID가 설정되지 않았습니다.');
      return [];
    }

    const startTime = Date.now();
    const mergedParams = { ...DEFAULT_SEARCH_OPTIONS, ...params };

    logger.debug(`Google 검색 시작: "${params.query}"`);

    try {
      const url = new URL(GOOGLE_API_URL);
      url.searchParams.set('key', this.apiKey!);
      url.searchParams.set('cx', this.searchEngineId!);
      url.searchParams.set('q', mergedParams.query);
      url.searchParams.set('num', String(mergedParams.num || 10));

      if (mergedParams.start) {
        url.searchParams.set('start', String(mergedParams.start));
      }
      if (mergedParams.dateRestrict) {
        url.searchParams.set('dateRestrict', mergedParams.dateRestrict);
      }
      if (mergedParams.siteSearch) {
        url.searchParams.set('siteSearch', mergedParams.siteSearch);
      }
      if (mergedParams.language) {
        url.searchParams.set('lr', `lang_${mergedParams.language}`);
      }

      const response = await this.fetchWithTimeout(url.toString(), {}, 10000);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Search API 오류: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as GoogleSearchResponse;
      const duration = Date.now() - startTime;

      logger.info(`Google 검색 완료: ${data.items?.length || 0}개 결과 (${duration}ms)`);

      return data.items || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Google 검색 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 검색 결과를 표준 형식으로 변환
   */
  async searchAsStandardItems(params: GoogleSearchParams): Promise<SearchResultItem[]> {
    const results = await this.search(params);

    return results.map((result) => ({
      title: this.stripHtml(result.title),
      url: result.link,
      snippet: this.stripHtml(result.snippet),
      source: result.displayLink || 'google',
    }));
  }

  /**
   * 여러 쿼리로 병렬 검색
   */
  async searchMultipleQueries(
    queries: string[],
    options?: Partial<GoogleSearchParams>
  ): Promise<Map<string, SearchResultItem[]>> {
    const results = new Map<string, SearchResultItem[]>();

    // 병렬 실행 (단, API 제한을 고려해 최대 5개씩)
    const batchSize = 5;
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(async (query) => {
        try {
          const items = await this.searchAsStandardItems({ query, ...options });
          return { query, items };
        } catch (error) {
          logger.warn(`쿼리 "${query}" 검색 실패: ${error}`);
          return { query, items: [] };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const { query, items } of batchResults) {
        results.set(query, items);
      }

      // Rate limiting: 배치 간 100ms 대기
      if (i + batchSize < queries.length) {
        await this.delay(100);
      }
    }

    return results;
  }

  /**
   * 최근 N일 이내 결과만 검색
   */
  async searchRecent(
    query: string,
    days: number,
    options?: Partial<GoogleSearchParams>
  ): Promise<SearchResultItem[]> {
    return this.searchAsStandardItems({
      query,
      dateRestrict: `d${days}`,
      ...options,
    });
  }

  /**
   * 특정 사이트 내 검색
   */
  async searchInSite(
    query: string,
    site: string,
    options?: Partial<GoogleSearchParams>
  ): Promise<SearchResultItem[]> {
    return this.searchAsStandardItems({
      query: `${query} site:${site}`,
      ...options,
    });
  }

  /**
   * HTML 태그 제거
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
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

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/** Google 검색 서비스 싱글톤 */
let googleSearchInstance: GoogleSearchService | null = null;

/**
 * Google 검색 서비스 인스턴스 가져오기
 */
export function getGoogleSearchService(): GoogleSearchService {
  if (!googleSearchInstance) {
    googleSearchInstance = new GoogleSearchService();
  }
  return googleSearchInstance;
}

/**
 * Google 검색 서비스 인스턴스 초기화 (테스트용)
 */
export function resetGoogleSearchService(): void {
  googleSearchInstance = null;
}
