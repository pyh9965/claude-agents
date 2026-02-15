/**
 * 네이버 API 서비스
 */

import { createLogger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';

const logger = createLogger('NaverAPI');

/** 블로그 검색 결과 항목 */
export interface NaverBlogItem {
  title: string;
  link: string;
  description: string;
  bloggername: string;
  bloggerlink: string;
  postdate: string;
}

/** 뉴스 검색 결과 항목 */
export interface NaverNewsItem {
  title: string;
  originallink: string;
  link: string;
  description: string;
  pubDate: string;
}

/** 검색 응답 */
export interface NaverSearchResponse<T> {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: T[];
}

/** 검색 파라미터 */
export interface SearchParams {
  query: string;
  display?: number;
  start?: number;
  sort?: 'sim' | 'date';
}

/**
 * 네이버 API 서비스 클래스
 */
export class NaverAPIService {
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly baseUrl = 'https://openapi.naver.com/v1/search';

  constructor() {
    const config = getConfig();
    this.clientId = config.naverClientId;
    this.clientSecret = config.naverClientSecret;
  }

  /**
   * API 사용 가능 여부 확인
   */
  isAvailable(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * API 요청 헤더 생성
   */
  private getHeaders(): Record<string, string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('네이버 API 인증 정보가 설정되지 않았습니다.');
    }

    return {
      'X-Naver-Client-Id': this.clientId,
      'X-Naver-Client-Secret': this.clientSecret,
    };
  }

  /**
   * 블로그 검색
   */
  async searchBlog(params: SearchParams): Promise<NaverSearchResponse<NaverBlogItem>> {
    if (!this.isAvailable()) {
      logger.warn('네이버 API 키가 없어 mock 데이터를 반환합니다.');
      return this.mockBlogSearch(params);
    }

    const url = new URL(`${this.baseUrl}/blog.json`);
    url.searchParams.set('query', params.query);
    url.searchParams.set('display', String(params.display || 10));
    url.searchParams.set('start', String(params.start || 1));
    url.searchParams.set('sort', params.sort || 'sim');

    logger.debug(`블로그 검색: "${params.query}"`);

    try {
      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`네이버 API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as NaverSearchResponse<NaverBlogItem>;
      logger.debug(`블로그 검색 완료: ${data.total}개 결과`);

      return data;
    } catch (error) {
      logger.error(`블로그 검색 실패: ${error}`);
      throw error;
    }
  }

  /**
   * 뉴스 검색
   */
  async searchNews(params: SearchParams): Promise<NaverSearchResponse<NaverNewsItem>> {
    if (!this.isAvailable()) {
      logger.warn('네이버 API 키가 없어 mock 데이터를 반환합니다.');
      return this.mockNewsSearch(params);
    }

    const url = new URL(`${this.baseUrl}/news.json`);
    url.searchParams.set('query', params.query);
    url.searchParams.set('display', String(params.display || 10));
    url.searchParams.set('start', String(params.start || 1));
    url.searchParams.set('sort', params.sort || 'sim');

    logger.debug(`뉴스 검색: "${params.query}"`);

    try {
      const response = await fetch(url.toString(), {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        throw new Error(`네이버 API 오류: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as NaverSearchResponse<NaverNewsItem>;
      logger.debug(`뉴스 검색 완료: ${data.total}개 결과`);

      return data;
    } catch (error) {
      logger.error(`뉴스 검색 실패: ${error}`);
      throw error;
    }
  }

  /**
   * Mock 블로그 검색 (개발/테스트용)
   */
  private mockBlogSearch(params: SearchParams): NaverSearchResponse<NaverBlogItem> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

    return {
      lastBuildDate: now.toUTCString(),
      total: 3,
      start: 1,
      display: 3,
      items: [
        {
          title: `<b>${params.query}</b> 완벽 가이드`,
          link: 'https://blog.naver.com/example1',
          description: `${params.query}에 대한 상세한 가이드입니다.`,
          bloggername: '블로거1',
          bloggerlink: 'https://blog.naver.com/blogger1',
          postdate: dateStr,
        },
        {
          title: `2025년 <b>${params.query}</b> 트렌드`,
          link: 'https://blog.naver.com/example2',
          description: `올해 ${params.query} 분야의 최신 트렌드를 분석합니다.`,
          bloggername: '블로거2',
          bloggerlink: 'https://blog.naver.com/blogger2',
          postdate: dateStr,
        },
        {
          title: `<b>${params.query}</b> 후기`,
          link: 'https://blog.naver.com/example3',
          description: `${params.query}를 직접 경험하고 작성한 솔직 후기입니다.`,
          bloggername: '블로거3',
          bloggerlink: 'https://blog.naver.com/blogger3',
          postdate: dateStr,
        },
      ],
    };
  }

  /**
   * Mock 뉴스 검색 (개발/테스트용)
   */
  private mockNewsSearch(params: SearchParams): NaverSearchResponse<NaverNewsItem> {
    const now = new Date();

    return {
      lastBuildDate: now.toUTCString(),
      total: 2,
      start: 1,
      display: 2,
      items: [
        {
          title: `<b>${params.query}</b> 관련 최신 뉴스`,
          originallink: 'https://news.example.com/1',
          link: 'https://n.news.naver.com/1',
          description: `${params.query}와 관련된 최신 소식입니다.`,
          pubDate: now.toUTCString(),
        },
        {
          title: `<b>${params.query}</b> 시장 동향`,
          originallink: 'https://news.example.com/2',
          link: 'https://n.news.naver.com/2',
          description: `${params.query} 시장의 현재 동향을 분석합니다.`,
          pubDate: now.toUTCString(),
        },
      ],
    };
  }

  /**
   * HTML 태그 제거
   */
  static stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }
}

/** 네이버 API 서비스 싱글톤 */
let naverAPIInstance: NaverAPIService | null = null;

export function getNaverAPIService(): NaverAPIService {
  if (!naverAPIInstance) {
    naverAPIInstance = new NaverAPIService();
  }
  return naverAPIInstance;
}
