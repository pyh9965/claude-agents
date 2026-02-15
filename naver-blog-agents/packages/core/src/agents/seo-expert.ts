/**
 * 준서 (SEO 전문가) 에이전트
 */

import { BaseAgent, createAgentConfig, type AgentOptions } from './base-agent.js';
import type {
  AgentInput,
  ContentPlan,
  EditedContent,
  SEOOptimization,
} from '../types/index.js';

/** SEO 최적화 결과 인터페이스 */
export interface SEOExpertResult {
  agentMessage: string;
  seo: SEOOptimization;
}

/** 키워드 분석 결과 인터페이스 (전처리용) */
export interface KeywordAnalysis {
  mainKeyword: string;
  subKeywords: string[];
  longTailKeywords: string[];
  recommendedTitle: string;
  recommendedSubheadings: string[];
}

/** 키워드 선정 결과 인터페이스 */
export interface KeywordSelectionResult {
  agentMessage: string;
  keywordAnalysis: KeywordAnalysis;
}

/**
 * SEO 전문가 에이전트 클래스
 */
export class SEOExpertAgent extends BaseAgent {
  constructor(options: AgentOptions = {}) {
    const config = createAgentConfig(
      'seo-expert',
      {
        name: '준서',
        age: 35,
        personality: '데이터 기반 사고, 키워드 분석 전문, 트렌드 예측',
        speakingStyle: [
          '검색량 데이터를 보면~',
          '이 키워드로 가면~',
          '네이버에서는~',
          '~하면 SEO에 유리해요',
        ],
        expertise: [
          '키워드 최적화',
          '제목/소제목 SEO',
          '메타 설명 작성',
          '네이버 C-Rank',
        ],
        background: '검색마케팅 8년, 네이버 SEO 전문 5년 경력의 SEO 매니저',
      },
      'haiku', // 빠른 분석을 위해 haiku 사용
      ['keyword_analysis']
    );

    super(config, options);
  }

  /**
   * 키워드 선정 요청 메시지 구성 (전처리용)
   */
  private buildKeywordSelectionMessage(
    topic: string,
    type: string
  ): string {
    return `## SEO 키워드 선정 요청 (전처리 모드)

### 콘텐츠 정보
- **주제**: ${topic}
- **콘텐츠 유형**: ${type}

### 요청 사항
콘텐츠 기획 단계 전에 SEO 관점에서 핵심 키워드를 선정해주세요.

### 키워드 선정 원칙
1. **메인 키워드 1개**: 검색량 + 경쟁도 고려, 제목 앞쪽에 배치할 키워드
2. **서브 키워드 2~3개**: 소제목에 사용할 연관 키워드
3. **롱테일 키워드 2개**: 구체적인 검색 의도를 담은 키워드

### 분양/부동산 키워드 예시
- 메인: "광명11구역", "드파인 연희", "힐스테이트 광명"
- 서브: "분양가", "청약일정", "입지분석", "경쟁률"
- 롱테일: "광명11구역 84타입 분양가", "드파인 연희 청약 전략"

### 응답 형식
{
  "agentMessage": "키워드 선정 결과 요약",
  "keywordAnalysis": {
    "mainKeyword": "메인 키워드",
    "subKeywords": ["서브1", "서브2", "서브3"],
    "longTailKeywords": ["롱테일1", "롱테일2"],
    "recommendedTitle": "키워드가 포함된 제목 제안",
    "recommendedSubheadings": [
      "소제목 1 (서브 키워드 포함)",
      "소제목 2 (서브 키워드 포함)"
    ]
  }
}
`;
  }

  /**
   * SEO 최적화 요청 메시지 구성
   */
  private buildSEOMessage(
    plan: ContentPlan,
    edited: EditedContent
  ): string {
    return `## SEO 최적화 요청

### 기획 정보
- **원본 제목**: ${plan.title}
- **타겟 키워드**: ${plan.targetKeywords.join(', ')}
- **타겟 독자**: ${plan.targetAudienceDescription}

### 편집된 콘텐츠

**제목**:
${edited.title}

**본문**:
${edited.body}

---

위 콘텐츠에 대해 네이버 블로그 SEO 최적화를 수행해주세요.

### SEO 최적화 항목

1. **SEO 제목 최적화**
   - 메인 키워드 앞쪽 배치
   - 30자 이내
   - 클릭률 높이는 요소 추가

2. **메타 설명 작성**
   - 150자 이내
   - 핵심 키워드 포함
   - 클릭 유도 문구

3. **태그 추천**
   - 메인/서브 키워드 포함
   - 연관 키워드 확장
   - 5~10개 태그

4. **키워드 밀도 분석**
   - 메인 키워드 밀도 체크
   - 적정 밀도 (1~2%) 확인

5. **SEO 점수 산정**
   - 100점 만점 기준
   - 개선 제안 포함

### 네이버 SEO 핵심 원칙

1. **C-Rank 최적화**: 신뢰도, 인기도, 관련성
2. **다이아 최적화**: 품질, 창작, 소통 점수
3. **검색 노출**: 제목 키워드, 본문 서두, 태그
`;
  }

  /**
   * 키워드 밀도 계산
   */
  private calculateKeywordDensity(
    content: string,
    keywords: string[]
  ): Array<{ keyword: string; count: number; density: number }> {
    const totalLength = content.length;
    const result = [];

    for (const keyword of keywords) {
      const regex = new RegExp(keyword, 'gi');
      const matches = content.match(regex) || [];
      const count = matches.length;
      const density = totalLength > 0 ? (count * keyword.length / totalLength) * 100 : 0;

      result.push({
        keyword,
        count,
        density: Math.round(density * 100) / 100,
      });
    }

    return result;
  }

  /**
   * 특화 처리 로직
   */
  async processSpecific(input: AgentInput): Promise<SEOExpertResult> {
    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('SEO 최적화 실패: ' + output.agentMessage);
    }

    return output.data as SEOExpertResult;
  }

  /**
   * 키워드 선정 실행 (전처리용)
   * 콘텐츠 기획 단계 전에 호출하여 SEO 키워드를 선정합니다.
   */
  async selectKeywords(topic: string, type: string): Promise<KeywordSelectionResult> {
    const message = this.buildKeywordSelectionMessage(topic, type);

    const input: AgentInput = {
      message,
      context: {
        topic,
        contentType: type,
        mode: 'keyword_selection',
      },
    };

    this.logger.agent(this.config.id, `키워드 선정 시작: ${topic}`);

    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('키워드 선정 실패: ' + output.agentMessage);
    }

    const result = output.data as KeywordSelectionResult;

    this.logger.agent(
      this.config.id,
      `키워드 선정 완료: 메인 키워드 "${result.keywordAnalysis.mainKeyword}"`
    );

    return result;
  }

  /**
   * SEO 최적화 실행
   */
  async optimize(plan: ContentPlan, edited: EditedContent): Promise<SEOExpertResult> {
    const message = this.buildSEOMessage(plan, edited);

    // 키워드 밀도 사전 계산
    const fullContent = edited.title + ' ' + edited.body;
    const keywordDensity = this.calculateKeywordDensity(fullContent, plan.targetKeywords);

    const input: AgentInput = {
      message,
      context: {
        targetKeywords: plan.targetKeywords,
        preCalculatedDensity: keywordDensity,
      },
    };

    this.logger.agent(this.config.id, 'SEO 최적화 시작');

    const result = await this.processSpecific(input);

    this.logger.agent(
      this.config.id,
      `SEO 최적화 완료: 점수 ${result.seo.seoScore}/100`
    );

    return result;
  }
}

/** SEO 전문가 에이전트 싱글톤 팩토리 */
let seoExpertInstance: SEOExpertAgent | null = null;

export function getSEOExpertAgent(options?: AgentOptions): SEOExpertAgent {
  if (!seoExpertInstance) {
    seoExpertInstance = new SEOExpertAgent(options);
  }
  return seoExpertInstance;
}

export function resetSEOExpertAgent(): void {
  seoExpertInstance = null;
}
