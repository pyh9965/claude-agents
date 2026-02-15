/**
 * 콘텐츠 추출 서비스 (Firecrawl + Jina)
 *
 * 웹 페이지에서 콘텐츠를 추출하는 서비스입니다.
 * - Firecrawl: 웹 크롤링 및 마크다운 변환
 * - Jina Reader: AI 기반 콘텐츠 추출
 */

import { createLogger } from '../utils/logger.js';
import { getConfig } from '../utils/config.js';
import type {
  FirecrawlParams,
  FirecrawlResult,
  JinaParams,
  JinaResult,
  ExtractedContent,
  SearchResultItem,
} from '../types/research.js';

const logger = createLogger('ContentExtractorService');

/** Firecrawl API URL */
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v1/scrape';

/** Jina Reader API URL */
const JINA_READER_URL = 'https://r.jina.ai';

/** Jina Search API URL */
const JINA_SEARCH_URL = 'https://s.jina.ai';

/**
 * 콘텐츠 추출 서비스 클래스
 */
export class ContentExtractorService {
  private readonly firecrawlApiKey: string | undefined;
  private readonly jinaApiKey: string | undefined;

  constructor() {
    const config = getConfig();
    this.firecrawlApiKey = config.firecrawlApiKey;
    this.jinaApiKey = config.jinaApiKey;
  }

  /**
   * Firecrawl 사용 가능 여부
   */
  isFirecrawlAvailable(): boolean {
    return !!this.firecrawlApiKey;
  }

  /**
   * Jina 사용 가능 여부
   */
  isJinaAvailable(): boolean {
    return !!this.jinaApiKey;
  }

  /**
   * 서비스 사용 가능 여부 (하나라도 가능하면 true)
   */
  isAvailable(): boolean {
    return this.isFirecrawlAvailable() || this.isJinaAvailable();
  }

  /**
   * Firecrawl로 웹 페이지 크롤링
   */
  async crawlWithFirecrawl(params: FirecrawlParams): Promise<FirecrawlResult> {
    if (!this.isFirecrawlAvailable()) {
      return {
        success: false,
        error: 'Firecrawl API 키가 설정되지 않았습니다.',
      };
    }

    const startTime = Date.now();
    logger.debug(`Firecrawl 크롤링 시작: ${params.url}`);

    try {
      const response = await this.fetchWithTimeout(
        FIRECRAWL_API_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.firecrawlApiKey}`,
          },
          body: JSON.stringify({
            url: params.url,
            formats: params.formats || ['markdown'],
            includeTags: params.includeTags,
            excludeTags: params.excludeTags,
          }),
        },
        params.timeout || 30000
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Firecrawl API 오류: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as {
        data?: { markdown?: string; html?: string; metadata?: Record<string, unknown> };
      };
      const duration = Date.now() - startTime;

      logger.info(`Firecrawl 크롤링 완료: ${params.url} (${duration}ms)`);

      return {
        success: true,
        markdown: data.data?.markdown,
        html: data.data?.html,
        metadata: data.data?.metadata,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Firecrawl 크롤링 실패: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Jina Reader로 콘텐츠 추출
   */
  async extractWithJina(params: JinaParams): Promise<JinaResult | null> {
    const startTime = Date.now();
    logger.debug(`Jina Reader 추출 시작: ${params.url}`);

    try {
      const headers: Record<string, string> = {
        Accept: 'text/markdown',
      };

      if (this.jinaApiKey) {
        headers['Authorization'] = `Bearer ${this.jinaApiKey}`;
      }

      const response = await this.fetchWithTimeout(
        `${JINA_READER_URL}/${params.url}`,
        { headers },
        30000
      );

      if (!response.ok) {
        throw new Error(`Jina Reader API 오류: ${response.status}`);
      }

      const markdown = await response.text();
      const duration = Date.now() - startTime;

      logger.info(`Jina Reader 추출 완료: ${params.url} (${duration}ms)`);

      return {
        markdown,
        images: this.extractImages(markdown),
        links: this.extractLinks(markdown),
        title: this.extractTitle(markdown),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Jina Reader 추출 실패: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Jina Search로 웹 검색
   */
  async searchWithJina(query: string): Promise<SearchResultItem[]> {
    const startTime = Date.now();
    logger.debug(`Jina Search 시작: "${query}"`);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };

      if (this.jinaApiKey) {
        headers['Authorization'] = `Bearer ${this.jinaApiKey}`;
      }

      const response = await this.fetchWithTimeout(
        `${JINA_SEARCH_URL}/${encodeURIComponent(query)}`,
        { headers },
        15000
      );

      if (!response.ok) {
        throw new Error(`Jina Search API 오류: ${response.status}`);
      }

      const data = (await response.json()) as {
        data?: Array<{ title: string; url: string; content: string }>;
      };
      const duration = Date.now() - startTime;

      logger.info(`Jina Search 완료: ${data.data?.length || 0}개 결과 (${duration}ms)`);

      // Jina Search 결과를 표준 형식으로 변환
      return (data.data || []).map((item) => ({
        title: item.title,
        url: item.url,
        snippet: item.content,
        source: 'jina',
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Jina Search 실패: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 최적의 방법으로 콘텐츠 추출 (Firecrawl 우선, Jina 폴백)
   */
  async crawlAndExtract(url: string): Promise<ExtractedContent | null> {
    // Firecrawl 먼저 시도
    if (this.isFirecrawlAvailable()) {
      const firecrawlResult = await this.crawlWithFirecrawl({ url });
      if (firecrawlResult.success && firecrawlResult.markdown) {
        return {
          url,
          title: firecrawlResult.metadata?.title || this.extractTitle(firecrawlResult.markdown),
          markdown: firecrawlResult.markdown,
          images: this.extractImages(firecrawlResult.markdown),
          links: this.extractLinks(firecrawlResult.markdown),
          extractedAt: new Date(),
          extractedBy: 'firecrawl',
        };
      }
    }

    // Jina로 폴백
    const jinaResult = await this.extractWithJina({ url });
    if (jinaResult) {
      return {
        url,
        title: jinaResult.title || 'Untitled',
        markdown: jinaResult.markdown,
        images: jinaResult.images,
        links: jinaResult.links,
        extractedAt: new Date(),
        extractedBy: 'jina',
      };
    }

    return null;
  }

  /**
   * 여러 URL에서 병렬 추출
   */
  async extractFromMultipleUrls(
    urls: string[],
    maxConcurrent: number = 3
  ): Promise<ExtractedContent[]> {
    const results: ExtractedContent[] = [];

    // 동시성 제한을 위한 배치 처리
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (url) => {
        try {
          return await this.crawlAndExtract(url);
        } catch (error) {
          logger.warn(`URL "${url}" 추출 실패: ${error}`);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      for (const result of batchResults) {
        if (result) {
          results.push(result);
        }
      }

      // Rate limiting: 배치 간 500ms 대기
      if (i + maxConcurrent < urls.length) {
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * 마크다운에서 이미지 URL 추출
   */
  private extractImages(markdown: string): string[] {
    const regex = /!\[.*?\]\((.*?)\)/g;
    const images: string[] = [];
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      images.push(match[1]);
    }
    return images;
  }

  /**
   * 마크다운에서 링크 추출
   */
  private extractLinks(markdown: string): string[] {
    const regex = /\[.*?\]\((.*?)\)/g;
    const links: string[] = [];
    let match;
    while ((match = regex.exec(markdown)) !== null) {
      // 이미지 링크 제외
      if (!markdown.substring(match.index - 1, match.index).includes('!')) {
        links.push(match[1]);
      }
    }
    return links;
  }

  /**
   * 마크다운에서 제목 추출
   */
  private extractTitle(markdown: string): string {
    // 첫 번째 # 헤딩 찾기
    const match = markdown.match(/^#\s+(.+)$/m);
    return match ? match[1].trim() : 'Untitled';
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

/** 콘텐츠 추출 서비스 싱글톤 */
let contentExtractorInstance: ContentExtractorService | null = null;

/**
 * 콘텐츠 추출 서비스 인스턴스 가져오기
 */
export function getContentExtractorService(): ContentExtractorService {
  if (!contentExtractorInstance) {
    contentExtractorInstance = new ContentExtractorService();
  }
  return contentExtractorInstance;
}

/**
 * 콘텐츠 추출 서비스 인스턴스 초기화 (테스트용)
 */
export function resetContentExtractorService(): void {
  contentExtractorInstance = null;
}
