/**
 * 민준 팀장 (기획자) 에이전트
 */

import { BaseAgent, createAgentConfig, type AgentOptions } from './base-agent.js';
import type {
  AgentInput,
  ContentPlan,
  ContentRequest,
  ContentType,
} from '../types/index.js';

/** 기획 결과 인터페이스 */
export interface PlannerResult {
  agentMessage: string;
  plan: ContentPlan;
}

/** SEO 키워드 정보 (전처리 결과) */
export interface SEOKeywordsInput {
  mainKeyword: string;
  subKeywords: string[];
  longTailKeywords: string[];
}

/**
 * 기획자 에이전트 클래스
 */
export class PlannerAgent extends BaseAgent {
  constructor(options: AgentOptions = {}) {
    const config = createAgentConfig(
      'planner',
      {
        name: '민준 팀장',
        age: 38,
        personality: '차분하고 전략적, 큰 그림을 보는 베테랑 기획자',
        speakingStyle: [
          '~하는 게 좋겠습니다',
          '전체적인 방향은~',
          '독자분들이 원하는 건 결국~',
        ],
        expertise: [
          '콘텐츠 전략 수립',
          '타겟 독자 분석',
          '아웃라인 설계',
          '작가 배정',
        ],
        background: '네이버 블로그 콘텐츠 기획 10년 경력의 베테랑 팀장',
      },
      'sonnet',
      []
    );

    super(config, options);
  }

  /**
   * 콘텐츠 유형에 따른 작가 배정
   */
  private getAssignedWriter(type: ContentType): ContentType {
    return type;
  }

  /**
   * 기획 요청 메시지 구성
   */
  private buildPlanningMessage(
    request: ContentRequest,
    seoKeywords?: SEOKeywordsInput | null
  ): string {
    let message = `## 콘텐츠 기획 요청

**주제**: ${request.topic}
**콘텐츠 유형**: ${request.type}
`;

    if (request.keywords?.length) {
      message += `**키워드**: ${request.keywords.join(', ')}\n`;
    }

    if (request.targetAudience) {
      message += `**타겟 독자**: ${request.targetAudience}\n`;
    }

    if (request.tone) {
      message += `**톤**: ${request.tone}\n`;
    }

    if (request.additionalContext) {
      message += `\n**추가 컨텍스트**:\n${request.additionalContext}\n`;
    }

    if (request.referenceUrls?.length) {
      message += `\n**참고 URL**:\n${request.referenceUrls.map(url => `- ${url}`).join('\n')}\n`;
    }

    // SEO 키워드 정보 추가 (전처리 결과)
    if (seoKeywords) {
      message += `
---

## ⚠️ SEO 키워드 가이드 (필수 반영)

SEO 전문가가 선정한 키워드입니다. **제목과 소제목에 반드시 포함**해주세요.

| 구분 | 키워드 |
|-----|-------|
| **메인 키워드** | ${seoKeywords.mainKeyword} |
| **서브 키워드** | ${seoKeywords.subKeywords.join(', ')} |
| **롱테일 키워드** | ${seoKeywords.longTailKeywords.join(', ')} |

### 키워드 활용 원칙
1. **제목**: 메인 키워드를 앞쪽에 배치
2. **소제목**: 각 섹션에 서브 키워드 1개 이상 포함
3. **도입부**: 첫 100자에 메인 키워드 자연스럽게 삽입
`;
    }

    message += `
---

위 요청을 바탕으로 네이버 블로그 콘텐츠 기획안을 작성해주세요.
담당 작가 배정, 타겟 독자 분석, 아웃라인 설계를 포함해주세요.
${seoKeywords ? '**SEO 키워드를 반드시 활용하여 targetKeywords에 포함하세요.**' : ''}
`;

    return message;
  }

  /**
   * 특화 처리 로직
   */
  async processSpecific(input: AgentInput): Promise<PlannerResult> {
    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('기획 생성 실패: ' + output.agentMessage);
    }

    return output.data as PlannerResult;
  }

  /**
   * 콘텐츠 기획 실행
   * @param request 콘텐츠 요청
   * @param seoKeywords SEO 전처리 결과 (선택적)
   */
  async plan(
    request: ContentRequest,
    seoKeywords?: SEOKeywordsInput | null
  ): Promise<PlannerResult> {
    const message = this.buildPlanningMessage(request, seoKeywords);

    const input: AgentInput = {
      message,
      context: {
        contentType: request.type,
        assignedWriter: this.getAssignedWriter(request.type),
        seoKeywords: seoKeywords || undefined,
      },
    };

    if (seoKeywords) {
      this.logger.agent(this.config.id, `콘텐츠 기획 시작 (SEO 키워드: ${seoKeywords.mainKeyword})`);
    } else {
      this.logger.agent(this.config.id, '콘텐츠 기획 시작');
    }

    const result = await this.processSpecific(input);

    this.logger.agent(
      this.config.id,
      `기획 완료: "${result.plan.title}" - ${result.plan.assignedWriter} 작가 배정`
    );

    return result;
  }
}

/** 기획자 에이전트 싱글톤 팩토리 */
let plannerInstance: PlannerAgent | null = null;

export function getPlannerAgent(options?: AgentOptions): PlannerAgent {
  if (!plannerInstance) {
    plannerInstance = new PlannerAgent(options);
  }
  return plannerInstance;
}

export function resetPlannerAgent(): void {
  plannerInstance = null;
}
