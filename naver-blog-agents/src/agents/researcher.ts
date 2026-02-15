/**
 * 수빈 (리서처) 에이전트
 * - 네이버 검색 API 통합 (블로그/뉴스 리서치)
 */

import { BaseAgent, createAgentConfig, type AgentOptions } from './base-agent.js';
import type {
  AgentInput,
  ContentPlan,
  ResearchData,
} from '../types/index.js';
import { getNaverAPIService, NaverAPIService } from '../services/naver-api.js';

/** 리서치 결과 인터페이스 */
export interface ResearcherResult {
  agentMessage: string;
  research: ResearchData;
}

/** 네이버 검색 옵션 */
export interface NaverSearchOptions {
  /** 블로그 검색 사용 여부 (기본: true) */
  searchBlog?: boolean;
  /** 뉴스 검색 사용 여부 (기본: true) */
  searchNews?: boolean;
  /** 검색 결과 수 (기본: 10) */
  display?: number;
  /** 정렬 방식 (기본: 'sim' 관련도순) */
  sort?: 'sim' | 'date';
}

/** 자금 계획 계산 결과 */
export interface FundingCalculation {
  totalPrice: number;           // 분양가 (원)
  ltvRatio: number;             // LTV 비율 (기본 0.6)
  loanAmount: number;           // 대출 가능액
  selfFunding: number;          // 자기자본 필요액
  annualRate: number;           // 연 금리 (기본 0.05)
  monthlyInterest: number;      // 월 이자
  summary: string;              // 요약 문자열
}

/**
 * 분양가 기반 자금 계획 계산
 * @param priceInWon 분양가 (원 단위)
 * @param ltvRatio LTV 비율 (기본 60%)
 * @param annualRate 연 금리 (기본 5%)
 */
export function calculateFunding(
  priceInWon: number,
  ltvRatio: number = 0.6,
  annualRate: number = 0.05
): FundingCalculation {
  const loanAmount = Math.round(priceInWon * ltvRatio);
  const selfFunding = priceInWon - loanAmount;
  const monthlyInterest = Math.round(loanAmount * annualRate / 12);

  // 억 단위 변환
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
  private readonly naverAPI = getNaverAPIService();

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
          '네이버 검색 리서치',
        ],
        background: '콘텐츠 리서치 5년 경력의 시니어 리서처',
      },
      'sonnet',
      ['web_search', 'web_fetch', 'naver_blog_search', 'naver_news_search']
    );

    super(config, options);
  }

  /**
   * 네이버 API 사용 가능 여부 확인
   */
  isNaverAPIAvailable(): boolean {
    return this.naverAPI.isAvailable();
  }

  /**
   * 네이버 블로그/뉴스 검색으로 리서치 데이터 수집
   */
  async searchNaver(
    query: string,
    options: NaverSearchOptions = {}
  ): Promise<{ blogs: unknown[]; news: unknown[]; summary: string }> {
    const {
      searchBlog = true,
      searchNews = true,
      display = 10,
      sort = 'sim',
    } = options;

    const results = {
      blogs: [] as unknown[],
      news: [] as unknown[],
      summary: '',
    };

    if (!this.naverAPI.isAvailable()) {
      this.logger.warn('네이버 API 키가 없어 검색을 건너뜁니다.');
      results.summary = '네이버 API 키가 설정되지 않아 검색을 수행하지 못했습니다.';
      return results;
    }

    this.logger.agent(this.config.id, `네이버 검색 시작: "${query}"`);

    try {
      // 블로그 검색
      if (searchBlog) {
        const blogResult = await this.naverAPI.searchBlog({ query, display, sort });
        results.blogs = blogResult.items.map(item => ({
          title: NaverAPIService.stripHtml(item.title),
          link: item.link,
          description: NaverAPIService.stripHtml(item.description),
          blogger: item.bloggername,
          date: item.postdate,
        }));
        this.logger.agent(this.config.id, `블로그 검색 완료: ${blogResult.total}건 중 ${results.blogs.length}건 수집`);
      }

      // 뉴스 검색
      if (searchNews) {
        const newsResult = await this.naverAPI.searchNews({ query, display, sort });
        results.news = newsResult.items.map(item => ({
          title: NaverAPIService.stripHtml(item.title),
          link: item.link,
          description: NaverAPIService.stripHtml(item.description),
          pubDate: item.pubDate,
        }));
        this.logger.agent(this.config.id, `뉴스 검색 완료: ${newsResult.total}건 중 ${results.news.length}건 수집`);
      }

      results.summary = `네이버 검색 완료: 블로그 ${results.blogs.length}건, 뉴스 ${results.news.length}건`;

    } catch (error) {
      this.logger.error(`네이버 검색 실패: ${error}`);
      results.summary = `네이버 검색 중 오류 발생: ${error}`;
    }

    return results;
  }

  /**
   * 리서치 요청 메시지 구성
   */
  private buildResearchMessage(
    plan: ContentPlan,
    referenceData?: Record<string, unknown>
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
    } else {
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
   * 리서치 실행 (네이버 검색 자동 수행)
   */
  async research(
    plan: ContentPlan,
    referenceData?: Record<string, unknown>,
    naverSearchOptions?: NaverSearchOptions
  ): Promise<ResearcherResult> {
    // 네이버 검색으로 추가 리서치 수행
    let naverData: Record<string, unknown> | undefined;

    if (this.naverAPI.isAvailable()) {
      const searchQuery = plan.targetKeywords[0] || plan.title;
      const naverResults = await this.searchNaver(searchQuery, naverSearchOptions);

      if (naverResults.blogs.length > 0 || naverResults.news.length > 0) {
        naverData = {
          naverBlogResults: naverResults.blogs,
          naverNewsResults: naverResults.news,
          naverSearchSummary: naverResults.summary,
        };
      }
    }

    // 참조 데이터와 네이버 검색 결과 병합
    const mergedReferenceData = {
      ...referenceData,
      ...naverData,
    };

    const message = this.buildResearchMessage(
      plan,
      Object.keys(mergedReferenceData).length > 0 ? mergedReferenceData : undefined
    );

    const input: AgentInput = {
      message,
      context: {
        title: plan.title,
        keywords: plan.targetKeywords,
        hasReferenceData: !!referenceData,
        hasNaverData: !!naverData,
      },
    };

    if (naverData) {
      this.logger.agent(this.config.id, '네이버 검색 데이터 포함하여 리서치 시작');
    } else if (referenceData) {
      this.logger.agent(this.config.id, '참조 데이터 기반 정보 수집 시작');
    } else {
      this.logger.agent(this.config.id, '정보 수집 시작 (참조 데이터 없음)');
    }

    const result = await this.processSpecific(input);

    // 분양 관련 데이터가 있으면 자금 계획 추가
    if (referenceData && '평형정보' in referenceData) {
      try {
        const 평형정보 = referenceData.평형정보 as Array<{ 최고분양가?: number }>;
        if (Array.isArray(평형정보) && 평형정보.length > 0) {
          // 최고 분양가 찾기
          const prices = 평형정보
            .map(p => p.최고분양가)
            .filter((price): price is number => typeof price === 'number' && price > 0);

          if (prices.length > 0) {
            const maxPrice = Math.max(...prices);
            const funding = calculateFunding(maxPrice);

            // 자금 계획을 팩트에 추가
            result.research.facts.push({
              content: funding.summary,
              source: '분양가 기반 자금 계획 계산',
              reliability: 4
            });

            this.logger.agent(
              this.config.id,
              `자금 계획 추가: 최고 분양가 ${(maxPrice / 100000000).toFixed(2)}억 기준`
            );
          }
        }
      } catch (error) {
        // 자금 계획 추가 실패는 무시 (선택적 기능)
        this.logger.agent(this.config.id, '자금 계획 추가 중 오류 발생 (무시됨)');
      }
    }

    const factCount = result.research.facts?.length || 0;
    const sourceCount = result.research.sources?.length || 0;

    this.logger.agent(
      this.config.id,
      `리서치 완료: ${factCount}개 팩트, ${sourceCount}개 출처 수집`
    );

    return result;
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
