/**
 * 검색 통합 서비스
 *
 * 여러 검색 소스(Tavily, Google, Firecrawl/Jina, Naver)를 통합하여
 * 멀티소스 검색을 수행합니다.
 */

import { createLogger } from '../utils/logger.js';
import { getConfig, type SearchSourceType } from '../utils/config.js';
import { getTavilyService, type TavilyService } from './tavily.js';
import { getGoogleSearchService, type GoogleSearchService } from './google-search.js';
import { getContentExtractorService, type ContentExtractorService } from './content-extractor.js';
import { getNaverAPIService, type NaverAPIService } from './naver-api.js';
import type {
  ResearchOptions,
  SearchSourceResult,
  SearchResultItem,
  AggregatedResearchResult,
  ResearchStatistics,
  ExtractedContent,
  DEFAULT_RESEARCH_OPTIONS,
} from '../types/research.js';
import type { Fact, Source } from '../types/content.js';

const logger = createLogger('SearchAggregatorService');

/**
 * 검색 통합 서비스 클래스
 */
export class SearchAggregatorService {
  private readonly tavily: TavilyService;
  private readonly google: GoogleSearchService;
  private readonly extractor: ContentExtractorService;
  private readonly naver: NaverAPIService;

  constructor() {
    this.tavily = getTavilyService();
    this.google = getGoogleSearchService();
    this.extractor = getContentExtractorService();
    this.naver = getNaverAPIService();
  }

  /**
   * 사용 가능한 검색 소스 목록
   */
  getAvailableSources(): SearchSourceType[] {
    const sources: SearchSourceType[] = [];
    if (this.tavily.isAvailable()) sources.push('tavily');
    if (this.google.isAvailable()) sources.push('google');
    if (this.extractor.isAvailable()) sources.push('firecrawl');
    if (this.naver.isAvailable()) sources.push('naver');
    return sources;
  }

  /**
   * 개별 소스에서 검색
   */
  private async searchSource(
    source: SearchSourceType,
    query: string,
    maxResults: number
  ): Promise<SearchSourceResult> {
    const startTime = Date.now();
    let results: SearchResultItem[] = [];
    let error: string | undefined;

    try {
      switch (source) {
        case 'tavily':
          results = await this.tavily.searchAsStandardItems({
            query,
            maxResults,
          });
          break;

        case 'google':
          results = await this.google.searchAsStandardItems({
            query,
            num: Math.min(maxResults, 10), // Google API 제한
          });
          break;

        case 'firecrawl':
          // Jina Search 사용
          results = await this.extractor.searchWithJina(query);
          break;

        case 'naver':
          // 블로그 + 뉴스 병렬 검색
          const [blogResults, newsResults] = await Promise.all([
            this.naver.searchBlog({ query, display: Math.ceil(maxResults / 2) }),
            this.naver.searchNews({ query, display: Math.ceil(maxResults / 2) }),
          ]);

          // 블로그 결과 변환
          const blogItems: SearchResultItem[] = blogResults.items.map((item) => ({
            title: this.stripHtml(item.title),
            url: item.link,
            snippet: this.stripHtml(item.description),
            publishedDate: item.postdate,
            source: `[블로그] ${item.bloggername}`,
          }));

          // 뉴스 결과 변환
          const newsItems: SearchResultItem[] = newsResults.items.map((item) => ({
            title: this.stripHtml(item.title),
            url: item.originallink || item.link,
            snippet: this.stripHtml(item.description),
            publishedDate: item.pubDate,
            source: '[뉴스]',
          }));

          // 결과 통합 (뉴스 우선 - 신뢰도 높음)
          results = [...newsItems, ...blogItems];
          break;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      logger.warn(`${source} 검색 실패: ${error}`);
    }

    return {
      source,
      query,
      results,
      timestamp: new Date(),
      duration: Date.now() - startTime,
      error,
    };
  }

  /**
   * 모든 활성화된 소스에서 검색
   */
  async searchAllSources(
    query: string,
    options: Partial<ResearchOptions> = {}
  ): Promise<AggregatedResearchResult> {
    const startTime = Date.now();
    const config = getConfig();
    const mergedOptions: ResearchOptions = {
      depth: options.depth || config.researchConfig.depth,
      sources: options.sources || config.researchConfig.enabledSources,
      expandKeywords: options.expandKeywords ?? true,
      crossValidate: options.crossValidate ?? true,
      maxResults: options.maxResults || config.researchConfig.maxResultsPerSource,
      timeout: options.timeout || 180000,
    };

    // 활성화된 소스만 필터링
    const availableSources = this.getAvailableSources();
    const sourcesToUse = mergedOptions.sources.filter((s) =>
      availableSources.includes(s)
    );

    if (sourcesToUse.length === 0) {
      logger.warn('사용 가능한 검색 소스가 없습니다.');
      return this.createEmptyResult(startTime);
    }

    logger.info(`검색 시작: "${query}" (소스: ${sourcesToUse.join(', ')})`);

    // 병렬 검색 실행
    const searchPromises = sourcesToUse.map((source) =>
      this.searchSource(source, query, mergedOptions.maxResults)
    );

    const sourceResults = await Promise.all(searchPromises);

    // 결과 집계
    const allResults = sourceResults.flatMap((sr) => sr.results);
    const deduplicatedResults = this.deduplicateResults(allResults);
    const competitorUrls = deduplicatedResults.slice(0, 10).map((r) => r.url);

    const statistics = this.calculateStatistics(sourceResults, []);

    return {
      sourceResults,
      crossValidatedFacts: [],
      expandedKeywords: [],
      competitorUrls,
      totalSearchTime: Date.now() - startTime,
      warnings: sourceResults.filter((sr) => sr.error).map((sr) => `${sr.source}: ${sr.error}`),
      statistics,
    };
  }

  /**
   * 깊은 검색 (키워드 확장 + 콘텐츠 추출 + 교차검증)
   */
  async deepSearch(
    query: string,
    keywords: string[],
    options: Partial<ResearchOptions> = {},
    onProgress?: (stage: string, progress: number) => void
  ): Promise<AggregatedResearchResult> {
    const startTime = Date.now();
    const config = getConfig();

    onProgress?.('initializing', 0.05);

    // 1. 메인 쿼리로 검색
    onProgress?.('searching_main', 0.1);
    const mainResults = await this.searchAllSources(query, options);

    // 2. 키워드별 추가 검색 (Deep 모드에서만)
    let keywordResults: SearchSourceResult[] = [];
    if (options.depth === 'deep' && keywords.length > 0) {
      onProgress?.('searching_keywords', 0.3);
      const keywordSearchPromises = keywords.slice(0, 3).map(async (kw) => {
        const results = await this.searchAllSources(kw, {
          ...options,
          maxResults: 5,
        });
        return results.sourceResults;
      });
      const keywordResultsArray = await Promise.all(keywordSearchPromises);
      keywordResults = keywordResultsArray.flat();
    }

    // 3. 상위 URL에서 콘텐츠 추출 (Deep 모드에서만)
    let extractedContents: ExtractedContent[] = [];
    if (options.depth === 'deep' && this.extractor.isAvailable()) {
      onProgress?.('extracting_content', 0.5);
      const topUrls = mainResults.competitorUrls.slice(0, 5);
      extractedContents = await this.extractor.extractFromMultipleUrls(topUrls, 2);
    }

    // 4. 팩트 추출 (Tavily 활용)
    let extractedFacts: Fact[] = [];
    if (this.tavily.isAvailable()) {
      onProgress?.('extracting_facts', 0.7);
      extractedFacts = await this.tavily.extractFacts(query);
    }

    // 5. 결과 통합
    onProgress?.('aggregating', 0.9);
    const allSourceResults = [...mainResults.sourceResults, ...keywordResults];
    const allUrls = new Set([
      ...mainResults.competitorUrls,
      ...keywordResults.flatMap((sr) => sr.results.map((r) => r.url)),
    ]);

    const statistics = this.calculateStatistics(allSourceResults, extractedFacts);

    onProgress?.('complete', 1.0);

    return {
      sourceResults: allSourceResults,
      crossValidatedFacts: extractedFacts,
      expandedKeywords: keywords,
      competitorUrls: Array.from(allUrls).slice(0, 20),
      totalSearchTime: Date.now() - startTime,
      warnings: mainResults.warnings,
      statistics,
    };
  }

  /**
   * 결과 중복 제거 (URL 기준)
   */
  private deduplicateResults(results: SearchResultItem[]): SearchResultItem[] {
    const seen = new Set<string>();
    return results.filter((item) => {
      const normalized = item.url.toLowerCase().replace(/\/$/, '');
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }

  /**
   * 통계 계산
   */
  private calculateStatistics(
    sourceResults: SearchSourceResult[],
    facts: Fact[]
  ): ResearchStatistics {
    const successfulSources = sourceResults.filter((sr) => !sr.error).length;
    const totalResults = sourceResults.reduce((sum, sr) => sum + sr.results.length, 0);
    const verifiedFacts = facts.filter(
      (f) => f.validationStatus === 'verified' || f.validationStatus === 'cross-validated'
    ).length;

    return {
      totalSources: sourceResults.length,
      successfulSources,
      totalResults,
      extractedFacts: facts.length,
      verifiedFacts,
      verificationRate: facts.length > 0 ? verifiedFacts / facts.length : 0,
    };
  }

  /**
   * 빈 결과 생성
   */
  private createEmptyResult(startTime: number): AggregatedResearchResult {
    return {
      sourceResults: [],
      crossValidatedFacts: [],
      expandedKeywords: [],
      competitorUrls: [],
      totalSearchTime: Date.now() - startTime,
      warnings: ['사용 가능한 검색 소스가 없습니다.'],
      statistics: {
        totalSources: 0,
        successfulSources: 0,
        totalResults: 0,
        extractedFacts: 0,
        verifiedFacts: 0,
        verificationRate: 0,
      },
    };
  }

  /**
   * HTML 태그 제거
   */
  private stripHtml(text: string): string {
    return text.replace(/<[^>]*>/g, '');
  }
}

/** 검색 통합 서비스 싱글톤 */
let searchAggregatorInstance: SearchAggregatorService | null = null;

/**
 * 검색 통합 서비스 인스턴스 가져오기
 */
export function getSearchAggregatorService(): SearchAggregatorService {
  if (!searchAggregatorInstance) {
    searchAggregatorInstance = new SearchAggregatorService();
  }
  return searchAggregatorInstance;
}

/**
 * 검색 통합 서비스 인스턴스 초기화 (테스트용)
 */
export function resetSearchAggregatorService(): void {
  searchAggregatorInstance = null;
}
