/**
 * 수빈 (리서처) 에이전트
 *
 * 멀티소스 Deep Research를 수행하는 리서처 에이전트입니다.
 * - Tavily, Google, Firecrawl/Jina, Naver 검색 통합
 * - 키워드 확장 및 교차검증 지원
 * - Balanced Mode 할루시네이션 방지
 */

import { BaseAgent, createAgentConfig, type AgentOptions } from './base-agent.js';
import type {
  AgentInput,
  ContentPlan,
  ResearchData,
  Fact,
  Source,
} from '../types/index.js';
import type {
  DeepResearchOptions,
  AggregatedResearchResult,
  SearchResultItem,
} from '../types/research.js';
import { getSearchAggregatorService, type SearchAggregatorService } from '../services/search-aggregator.js';
import { getKeywordExpander, type KeywordExpander } from '../utils/keyword-expander.js';
import { getCrossValidator, type CrossValidator } from '../utils/cross-validator.js';
import { getConfig } from '../utils/config.js';

/** 리서치 결과 인터페이스 */
export interface ResearcherResult {
  agentMessage: string;
  research: ResearchData;
}

/** 자금 계획 계산 결과 */
export interface FundingCalculation {
  totalPrice: number;
  ltvRatio: number;
  loanAmount: number;
  selfFunding: number;
  annualRate: number;
  monthlyInterest: number;
  summary: string;
}

/**
 * 분양가 기반 자금 계획 계산
 */
export function calculateFunding(
  priceInWon: number,
  ltvRatio: number = 0.6,
  annualRate: number = 0.05
): FundingCalculation {
  const loanAmount = Math.round(priceInWon * ltvRatio);
  const selfFunding = priceInWon - loanAmount;
  const monthlyInterest = Math.round(loanAmount * annualRate / 12);

  const priceInBillion = (priceInWon / 100000000).toFixed(2);
  const loanInBillion = (loanAmount / 100000000).toFixed(2);
  const selfInBillion = (selfFunding / 100000000).toFixed(2);
  const monthlyInMan = Math.round(monthlyInterest / 10000);

  const summary = `분양가 ${priceInBillion}억 기준, LTV ${ltvRatio * 100}% 적용 시 대출 ${loanInBillion}억, 자기자본 ${selfInBillion}억 필요. 중도금 이자 월 약 ${monthlyInMan}만 원 (연 ${annualRate * 100}% 가정)`;

  return {
    totalPrice: priceInWon,
    ltvRatio,
    loanAmount,
    selfFunding,
    annualRate,
    monthlyInterest,
    summary
  };
}

/**
 * 리서처 에이전트 클래스
 */
export class ResearcherAgent extends BaseAgent {
  private readonly searchAggregator: SearchAggregatorService;
  private readonly keywordExpander: KeywordExpander;
  private readonly crossValidator: CrossValidator;

  constructor(options: AgentOptions = {}) {
    const config = createAgentConfig(
      'researcher',
      {
        name: '수빈',
        age: 29,
        personality: '꼼꼼한 팩트체커, 출처 중시, 정보의 정확성에 집착',
        speakingStyle: [
          '확인해본 결과~',
          '출처에 따르면~',
          '여러 자료를 종합해보니까요~',
        ],
        expertise: [
          '정보 수집',
          '팩트체크',
          '경쟁 분석',
          '트렌드 파악',
          '멀티소스 리서치',
        ],
        background: '콘텐츠 리서치 5년 경력의 시니어 리서처',
      },
      'sonnet',
      ['web_search', 'web_fetch', 'tavily_search', 'google_search', 'firecrawl']
    );

    super(config, options);

    this.searchAggregator = getSearchAggregatorService();
    this.keywordExpander = getKeywordExpander();
    this.crossValidator = getCrossValidator();
  }

  /**
   * 리서치 요청 메시지 구성
   */
  private buildResearchMessage(
    plan: ContentPlan,
    referenceData?: Record<string, unknown>,
    searchResults?: AggregatedResearchResult
  ): string {
    let message = `## 리서치 요청

**콘텐츠 제목**: ${plan.title}
**핵심 메시지**: ${plan.keyMessage}
**타겟 키워드**: ${plan.targetKeywords.join(', ')}
**타겟 독자**: ${plan.targetAudienceDescription}

### 아웃라인
${plan.outline.map((item, i) => `
${i + 1}. **${item.heading}**
   - ${item.description}
   - 핵심 포인트: ${item.keyPoints.join(', ')}
`).join('')}

${plan.notes ? `### 기획자 노트\n${plan.notes}\n` : ''}
`;

    // 검색 결과가 있는 경우 추가
    if (searchResults && searchResults.sourceResults.length > 0) {
      message += `
---

## 🔍 실시간 검색 결과 (${searchResults.statistics.totalResults}개)

아래는 실시간 검색으로 수집된 정보입니다. 이 정보를 기반으로 팩트를 정리하세요.

`;

      for (const sourceResult of searchResults.sourceResults) {
        if (sourceResult.results.length > 0) {
          message += `### ${sourceResult.source.toUpperCase()} 검색 결과\n`;
          for (const result of sourceResult.results.slice(0, 5)) {
            message += `- **${result.title}**\n`;
            message += `  - URL: ${result.url}\n`;
            message += `  - 내용: ${result.snippet.substring(0, 200)}...\n\n`;
          }
        }
      }

      if (searchResults.crossValidatedFacts.length > 0) {
        message += `### 🎯 사전 추출된 팩트 (검증됨)\n`;
        for (const fact of searchResults.crossValidatedFacts) {
          message += `- ${fact.content} (신뢰도: ${fact.reliability}/5, 출처: ${fact.sourceUrl || fact.source || '검색결과'})\n`;
        }
      }

      message += `
---

위 검색 결과를 기반으로 팩트를 정리하세요.
**모든 팩트에 출처 URL을 반드시 포함**하세요.

`;
    }

    // 참조 데이터가 있는 경우 추가
    if (referenceData) {
      message += `
---

## ⚠️ 중요: 참조 데이터 제공됨

아래 참조 데이터가 제공되었습니다. **반드시 이 데이터의 정보만 사용**하세요.
데이터에 없는 정보는 추측하지 말고 "확인 필요" 또는 "정보 없음"으로 표기하세요.

### 참조 데이터 (JSON)
\`\`\`json
${JSON.stringify(referenceData, null, 2)}
\`\`\`

---

위 참조 데이터를 기반으로 콘텐츠 작성에 필요한 정보를 정리해주세요.
**절대 데이터에 없는 수치, 날짜, 이름 등을 추측하지 마세요.**

다음 항목을 포함해주세요:

1. **팩트 수집**: 참조 데이터에서 추출한 정확한 정보와 출처
2. **연관 키워드**: 데이터에서 도출할 수 있는 키워드
3. **누락 정보**: 데이터에 없어서 확인이 필요한 항목

모든 정보에는 출처를 명시하고, 신뢰도를 1-5점으로 평가해주세요.
`;
    } else if (!searchResults || searchResults.sourceResults.length === 0) {
      message += `
---

⚠️ **참조 데이터가 제공되지 않았습니다.**
구체적인 수치나 날짜는 "확인 필요"로 표기하고, 일반적인 정보만 제공하세요.

다음 항목을 포함해주세요:

1. **팩트 수집**: 일반적인 정보 (구체적 수치는 "확인 필요" 표기)
2. **연관 키워드**: 추가로 활용할 수 있는 키워드
3. **확인 필요 항목**: 정확한 팩트체크가 필요한 정보 목록

모든 정보에는 출처를 명시하고, 신뢰도를 1-5점으로 평가해주세요.
`;
    }

    return message;
  }

  /**
   * 특화 처리 로직
   */
  async processSpecific(input: AgentInput): Promise<ResearcherResult> {
    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('리서치 실패: ' + output.agentMessage);
    }

    return output.data as ResearcherResult;
  }

  /**
   * 리서치 실행 (Deep Research 지원)
   */
  async research(
    plan: ContentPlan,
    referenceData?: Record<string, unknown>,
    options?: DeepResearchOptions
  ): Promise<ResearcherResult> {
    const config = getConfig();
    const researchConfig = config.researchConfig;

    // 옵션 병합
    const opts: DeepResearchOptions = {
      depth: options?.depth || researchConfig.depth,
      hallucinationMode: options?.hallucinationMode || researchConfig.hallucinationMode,
      sources: options?.sources || researchConfig.enabledSources,
      expandKeywords: options?.expandKeywords ?? true,
      crossValidate: options?.crossValidate ?? true,
      onProgress: options?.onProgress,
    };

    this.logger.agent(this.config.id, `Deep Research 시작 (깊이: ${opts.depth}, 모드: ${opts.hallucinationMode})`);

    // ═══════════════════════════════════════════════════════════════
    // 🚀 최적화: 키워드 확장 + 초기 검색 병렬 실행
    // ═══════════════════════════════════════════════════════════════
    const availableSources = this.searchAggregator.getAvailableSources();
    let expandedKeywords: string[] = [...plan.targetKeywords];
    let searchResults: AggregatedResearchResult | null = null;

    // 병렬 작업 정의
    const parallelTasks: Promise<void>[] = [];

    // Task 1: 키워드 확장 (비동기)
    const keywordExpansionTask = async () => {
      if (opts.depth === 'deep' && opts.expandKeywords) {
        opts.onProgress?.('keyword_expansion', 0.1);
        this.logger.agent(this.config.id, '키워드 확장 중...');

        const expansionResults = await this.keywordExpander.expand(plan.targetKeywords);
        for (const result of expansionResults) {
          expandedKeywords.push(...result.expanded.slice(0, 3));
          expandedKeywords.push(...result.relatedTerms.slice(0, 2));
        }
        expandedKeywords = [...new Set(expandedKeywords)];
        this.logger.agent(this.config.id, `키워드 확장 완료: ${expandedKeywords.length}개`);
      }
    };

    // Task 2: 초기 검색 (메인 키워드로 즉시 시작)
    const initialSearchTask = async () => {
      if (availableSources.length > 0) {
        opts.onProgress?.('multi_source_search', 0.2);
        this.logger.agent(this.config.id, `초기 검색 시작 (소스: ${availableSources.join(', ')})`);

        try {
          // 메인 키워드로 먼저 검색 시작
          searchResults = await this.searchAggregator.searchAllSources(
            plan.title,
            {
              depth: opts.depth,
              sources: opts.sources?.filter(s => availableSources.includes(s)) || availableSources,
              maxResults: Math.ceil(researchConfig.maxResultsPerSource / 2),
            }
          );
          this.logger.agent(this.config.id, `초기 검색 완료: ${searchResults.statistics.totalResults}개 결과`);
        } catch (error) {
          this.logger.agent(this.config.id, `초기 검색 오류 (계속 진행): ${error}`);
        }
      }
    };

    // 두 작업 병렬 실행
    parallelTasks.push(keywordExpansionTask());
    if (availableSources.length > 0) {
      parallelTasks.push(initialSearchTask());
    }

    await Promise.all(parallelTasks);

    // 확장된 키워드로 추가 검색 (Deep 모드에서만)
    if (opts.depth === 'deep' && availableSources.length > 0 && expandedKeywords.length > plan.targetKeywords.length) {
      opts.onProgress?.('deep_search', 0.4);
      this.logger.agent(this.config.id, `확장 키워드 검색 시작 (${expandedKeywords.length - plan.targetKeywords.length}개 추가 키워드)`);

      try {
        const deepResults = await this.searchAggregator.deepSearch(
          plan.title,
          expandedKeywords.slice(plan.targetKeywords.length, plan.targetKeywords.length + 5), // 확장 키워드 5개만
          {
            depth: 'standard', // 추가 검색은 standard로 빠르게
            sources: opts.sources?.filter(s => availableSources.includes(s)) || availableSources,
            expandKeywords: false,
            crossValidate: false, // 나중에 일괄 검증
            maxResults: 5,
            timeout: 60000, // 1분 제한
          }
        );

        // 결과 병합
        if (searchResults !== null && deepResults) {
          const current = searchResults as AggregatedResearchResult;
          current.sourceResults.push(...deepResults.sourceResults);
          current.competitorUrls.push(...deepResults.competitorUrls);
          current.crossValidatedFacts.push(...deepResults.crossValidatedFacts);
          current.statistics.totalResults += deepResults.statistics.totalResults;
        } else if (deepResults) {
          searchResults = deepResults;
        }

        this.logger.agent(
          this.config.id,
          `검색 완료: ${searchResults?.statistics.totalResults || 0}개 결과, ${searchResults?.crossValidatedFacts.length || 0}개 팩트`
        );
      } catch (error) {
        this.logger.agent(this.config.id, `확장 검색 오류 (계속 진행): ${error}`);
      }
    } else if (availableSources.length === 0) {
      this.logger.agent(this.config.id, '사용 가능한 검색 API가 없습니다. LLM 기반 리서치로 진행합니다.');
    }

    // Stage 3: LLM 기반 팩트 정리
    opts.onProgress?.('llm_analysis', 0.7);
    const message = this.buildResearchMessage(plan, referenceData, searchResults || undefined);

    const input: AgentInput = {
      message,
      context: {
        title: plan.title,
        keywords: expandedKeywords,
        hasReferenceData: !!referenceData,
        hasSearchResults: !!searchResults,
        searchSources: availableSources,
      },
    };

    const result = await this.processSpecific(input);

    // Stage 4: 검색 결과와 병합
    if (searchResults) {
      // 검색에서 추출된 팩트 추가
      for (const fact of searchResults.crossValidatedFacts) {
        // 중복 확인
        const isDuplicate = result.research.facts.some(
          f => f.content === fact.content || f.sourceUrl === fact.sourceUrl
        );
        if (!isDuplicate) {
          result.research.facts.push(fact);
        }
      }

      // 소스 정보 추가
      for (const sourceResult of searchResults.sourceResults) {
        for (const item of sourceResult.results.slice(0, 3)) {
          const existingSource = result.research.sources.find(s => s.url === item.url);
          if (!existingSource) {
            result.research.sources.push({
              url: item.url,
              title: item.title,
              publishedDate: item.publishedDate,
              sourceType: sourceResult.source as any,
            });
          }
        }
      }

      // 확장된 키워드 추가
      result.research.relatedKeywords = [
        ...new Set([...result.research.relatedKeywords, ...expandedKeywords]),
      ];
    }

    // Stage 5: 교차검증 (Balanced Mode)
    if (opts.crossValidate && opts.hallucinationMode !== 'permissive') {
      opts.onProgress?.('cross_validation', 0.85);
      this.logger.agent(this.config.id, '팩트 교차검증 중...');

      const validationResults = await this.crossValidator.validateFacts(
        result.research.facts,
        result.research.sources,
        searchResults?.sourceResults.flatMap(sr => sr.results)
      );

      // 검증된 팩트로 업데이트
      result.research.facts = validationResults.map(vr => vr.fact);

      // Balanced Mode 경고 생성
      if (opts.hallucinationMode === 'balanced') {
        const warnings = this.crossValidator.generateBalancedModeWarnings(result.research.facts);
        if (warnings.length > 0) {
          this.logger.agent(this.config.id, `검증 경고: ${warnings.join(', ')}`);
        }
      }

      // Strict Mode: 미검증 팩트 제거
      if (opts.hallucinationMode === 'strict') {
        const originalCount = result.research.facts.length;
        result.research.facts = result.research.facts.filter(
          f => f.validationStatus !== 'unverified'
        );
        const removedCount = originalCount - result.research.facts.length;
        if (removedCount > 0) {
          this.logger.agent(this.config.id, `Strict Mode: ${removedCount}개 미검증 팩트 제거`);
        }
      }
    }

    // Stage 6: 분양 관련 자금 계획 추가 (기존 기능 유지)
    if (referenceData && '평형정보' in referenceData) {
      this.addFundingPlanIfNeeded(result, referenceData);
    }

    opts.onProgress?.('complete', 1.0);

    const factCount = result.research.facts?.length || 0;
    const sourceCount = result.research.sources?.length || 0;
    const verifiedCount = result.research.facts.filter(
      f => f.validationStatus === 'verified' || f.validationStatus === 'cross-validated'
    ).length;

    this.logger.agent(
      this.config.id,
      `리서치 완료: ${factCount}개 팩트 (${verifiedCount}개 검증됨), ${sourceCount}개 출처`
    );

    return result;
  }

  /**
   * 자금 계획 추가 (기존 기능)
   */
  private addFundingPlanIfNeeded(
    result: ResearcherResult,
    referenceData: Record<string, unknown>
  ): void {
    try {
      const 평형정보 = referenceData.평형정보 as Array<{ 최고분양가?: number }>;
      if (Array.isArray(평형정보) && 평형정보.length > 0) {
        const prices = 평형정보
          .map(p => p.최고분양가)
          .filter((price): price is number => typeof price === 'number' && price > 0);

        if (prices.length > 0) {
          const maxPrice = Math.max(...prices);
          const funding = calculateFunding(maxPrice);

          result.research.facts.push({
            content: funding.summary,
            source: '분양가 기반 자금 계획 계산',
            reliability: 4,
            sourceType: 'reference',
            validationStatus: 'verified',
          });

          this.logger.agent(
            this.config.id,
            `자금 계획 추가: 최고 분양가 ${(maxPrice / 100000000).toFixed(2)}억 기준`
          );
        }
      }
    } catch (error) {
      this.logger.agent(this.config.id, '자금 계획 추가 중 오류 발생 (무시됨)');
    }
  }
}

/** 리서처 에이전트 싱글톤 팩토리 */
let researcherInstance: ResearcherAgent | null = null;

export function getResearcherAgent(options?: AgentOptions): ResearcherAgent {
  if (!researcherInstance) {
    researcherInstance = new ResearcherAgent(options);
  }
  return researcherInstance;
}

export function resetResearcherAgent(): void {
  researcherInstance = null;
}
