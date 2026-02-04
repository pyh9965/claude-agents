/**
 * 웹 검색 서비스
 *
 * 이 서비스는 웹 검색 기능을 제공합니다.
 * 실제 구현에서는 네이버 API 또는 다른 검색 API를 사용합니다.
 */

import { createLogger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const logger = createLogger('WebSearch');

/** 검색 결과 항목 */
export interface SearchResultItem {
  /** 제목 */
  title: string;
  /** URL */
  url: string;
  /** 요약/설명 */
  snippet: string;
  /** 발행일 */
  publishedDate?: string;
  /** 출처 */
  source?: string;
}

/** 검색 결과 */
export interface SearchResult {
  /** 쿼리 */
  query: string;
  /** 결과 항목들 */
  items: SearchResultItem[];
  /** 총 결과 수 */
  totalResults: number;
  /** 검색 시간 (ms) */
  searchTime: number;
}

/** 검색 옵션 */
export interface SearchOptions {
  /** 결과 수 */
  limit?: number;
  /** 언어 */
  language?: string;
  /** 국가 */
  country?: string;
  /** 정렬 방식 */
  sort?: 'relevance' | 'date';
  /** 날짜 범위 */
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  limit: 10,
  language: 'ko',
  country: 'KR',
  sort: 'relevance',
};

/**
 * 웹 검색 서비스 클래스
 */
export class WebSearchService {
  private readonly apiKey?: string;

  constructor() {
    const config = getConfig();
    this.apiKey = config.naverClientId;
  }

  /**
   * 웹 검색 실행
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult> {
    const startTime = Date.now();
    const mergedOptions = { ...DEFAULT_SEARCH_OPTIONS, ...options };

    logger.info(`검색 시작: "${query}"`);

    try {
      // 실제 구현에서는 API 호출
      // 현재는 mock 데이터 반환
      const items = await this.mockSearch(query, mergedOptions);

      const searchTime = Date.now() - startTime;
      logger.info(`검색 완료: ${items.length}개 결과 (${searchTime}ms)`);

      return {
        query,
        items,
        totalResults: items.length,
        searchTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`검색 실패: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 네이버 검색 API 호출 (실제 구현)
   */
  private async naverSearch(
    query: string,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    const config = getConfig();

    if (!config.naverClientId || !config.naverClientSecret) {
      throw new Error('네이버 API 키가 설정되지 않았습니다.');
    }

    const url = new URL('https://openapi.naver.com/v1/search/blog.json');
    url.searchParams.set('query', query);
    url.searchParams.set('display', String(options.limit || 10));
    url.searchParams.set('sort', options.sort === 'date' ? 'date' : 'sim');

    const response = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id': config.naverClientId,
        'X-Naver-Client-Secret': config.naverClientSecret,
      },
    });

    if (!response.ok) {
      throw new Error(`네이버 API 오류: ${response.status}`);
    }

    const data = await response.json() as { items: Array<{ title: string; link: string; description: string; postdate: string; bloggername: string }> };

    return data.items.map((item) => ({
      title: this.stripHtml(item.title),
      url: item.link,
      snippet: this.stripHtml(item.description),
      publishedDate: item.postdate,
      source: item.bloggername,
    }));
  }

  /**
   * Mock 검색 (개발/테스트용)
   */
  private async mockSearch(
    query: string,
    options: SearchOptions
  ): Promise<SearchResultItem[]> {
    // 시뮬레이션을 위한 지연
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Mock 데이터 반환
    return [
      {
        title: `${query} - 완벽 가이드`,
        url: 'https://example.com/guide',
        snippet: `${query}에 대한 상세한 가이드입니다. 초보자부터 전문가까지 모두를 위한 내용을 담았습니다.`,
        publishedDate: new Date().toISOString().split('T')[0],
        source: '전문가 블로그',
      },
      {
        title: `2025년 ${query} 트렌드`,
        url: 'https://example.com/trend',
        snippet: `올해 ${query} 분야의 최신 트렌드를 분석합니다. 주목해야 할 변화들을 정리했습니다.`,
        publishedDate: new Date().toISOString().split('T')[0],
        source: '트렌드 매거진',
      },
      {
        title: `${query} 비교 분석`,
        url: 'https://example.com/compare',
        snippet: `다양한 ${query} 옵션을 비교 분석합니다. 장단점을 상세히 알아봅니다.`,
        publishedDate: new Date().toISOString().split('T')[0],
        source: '리뷰 채널',
      },
    ].slice(0, options.limit || 10);
  }

  /**
   * HTML 태그 제거
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }

  /**
   * 관련 키워드 추출
   */
  async getRelatedKeywords(query: string): Promise<string[]> {
    // 실제 구현에서는 자동완성 API 등 활용
    return [
      `${query} 추천`,
      `${query} 후기`,
      `${query} 비교`,
      `${query} 가격`,
      `${query} 2025`,
    ];
  }

  /**
   * 트렌드 검색어 조회
   */
  async getTrendingKeywords(category?: string): Promise<string[]> {
    // 실제 구현에서는 트렌드 API 활용
    return [
      '맛집 추천',
      'IT 가젯',
      '여행지 추천',
      '뷰티 트렌드',
      '재테크 팁',
    ];
  }
}

/** 웹 검색 서비스 싱글톤 */
let webSearchInstance: WebSearchService | null = null;

export function getWebSearchService(): WebSearchService {
  if (!webSearchInstance) {
    webSearchInstance = new WebSearchService();
  }
  return webSearchInstance;
}
