/**
 * 기본 작가 에이전트 클래스
 */

import { BaseAgent, type AgentOptions } from '../base-agent.js';
import type {
  AgentConfig,
  AgentInput,
  ContentPlan,
  ContentType,
  DraftContent,
  ResearchData,
  WriterAgentConfig,
  WritingStyle,
} from '../../types/index.js';
import { QualityScorer } from '../../quality/index.js';
import type { QualityScore } from '../../types/quality.js';
import { createAgentLogger } from '../../utils/logger.js';

/** 작가 결과 인터페이스 */
export interface WriterResult {
  agentMessage: string;
  draft: DraftContent;
}

/**
 * 기본 작가 에이전트 추상 클래스
 */
export abstract class BaseWriterAgent extends BaseAgent {
  protected readonly contentType: ContentType;
  protected readonly writingStyle: WritingStyle;
  private scorer: QualityScorer;

  constructor(config: WriterAgentConfig, options: AgentOptions = {}) {
    super(config as AgentConfig, options);
    this.contentType = config.contentType;
    this.writingStyle = config.writingStyle;
    this.scorer = new QualityScorer();
  }

  /**
   * 작성 요청 메시지 구성
   */
  protected buildWritingMessage(
    plan: ContentPlan,
    research: ResearchData
  ): string {
    return `## 콘텐츠 작성 요청

### 기획안
**제목**: ${plan.title}
**핵심 메시지**: ${plan.keyMessage}
**타겟 독자**: ${plan.targetAudienceDescription}
**예상 글자 수**: ${plan.estimatedLength}자
**타겟 키워드**: ${plan.targetKeywords.join(', ')}

### 아웃라인
${plan.outline.map((item, i) => `
${i + 1}. **${item.heading}**
   - ${item.description}
   - 핵심 포인트: ${item.keyPoints.join(', ')}
`).join('')}

${plan.notes ? `### 기획자 노트\n${plan.notes}\n` : ''}

### 리서치 자료

#### 수집된 팩트
${research.facts.map(fact => `- ${fact.content} (신뢰도: ${fact.reliability}/5${fact.source ? `, 출처: ${fact.source}` : ''})`).join('\n')}

#### 연관 키워드
${research.relatedKeywords.join(', ')}

${research.competitorAnalysis ? `
#### 경쟁 분석
- 상위 콘텐츠: ${research.competitorAnalysis.topTitles.join(', ')}
- 콘텐츠 갭: ${research.competitorAnalysis.contentGaps.join(', ')}
` : ''}

${research.trendInfo ? `
#### 트렌드 정보
- 인기 검색어: ${research.trendInfo.popularSearches.join(', ')}
- 관련 이슈: ${research.trendInfo.relatedIssues.join(', ')}
` : ''}

---

위 기획안과 리서치 자료를 바탕으로 네이버 블로그 콘텐츠를 작성해주세요.

### 작성 가이드라인
1. 마크다운 형식으로 작성
2. 예상 글자 수 준수 (${plan.estimatedLength}자 내외)
3. 타겟 키워드 자연스럽게 포함
4. 소제목과 문단 구분 명확히
5. 당신의 페르소나 말투와 스타일 유지
`;
  }

  /**
   * 특화 처리 로직
   */
  async processSpecific(input: AgentInput): Promise<WriterResult> {
    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('콘텐츠 작성 실패: ' + output.agentMessage);
    }

    const result = output.data as WriterResult;

    // 메타데이터 보완
    if (result.draft && !result.draft.metadata) {
      result.draft.metadata = {
        writer: this.name,
        contentType: this.contentType,
        createdAt: new Date(),
        wordCount: result.draft.body?.length || 0,
      };
    }

    return result;
  }

  /**
   * 콘텐츠 작성 실행
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    const message = this.buildWritingMessage(plan, research);

    const input: AgentInput = {
      message,
      context: {
        contentType: this.contentType,
        writerName: this.name,
      },
    };

    this.logger.agent(this.config.id, `콘텐츠 작성 시작: "${plan.title}"`);

    const result = await this.processSpecific(input);

    const wordCount = result.draft.body?.length || 0;
    this.logger.agent(
      this.config.id,
      `작성 완료: ${wordCount}자`
    );

    return result;
  }

  /**
   * Self-Reflection을 통한 품질 개선 글쓰기
   * @param plan 콘텐츠 기획
   * @param research 리서치 데이터
   * @param maxIterations 최대 반복 횟수 (기본 2)
   */
  async writeWithReflection(
    plan: ContentPlan,
    research: ResearchData,
    maxIterations = 2
  ): Promise<WriterResult & { qualityScore: QualityScore; iterations: number }> {
    const logger = createAgentLogger(this.config.id);
    let draft = await this.write(plan, research);
    let score = this.scorer.score(
      { title: draft.draft.title, body: draft.draft.body },
      plan.targetKeywords
    );
    let iteration = 0;

    logger.info(`초안 작성 완료. 품질 점수: ${score.overall}점`);

    while (!score.passed && iteration < maxIterations) {
      iteration++;
      logger.info(`Self-Reflection 반복 ${iteration}/${maxIterations}`);

      // 피드백 기반 수정 요청
      const feedbackPrompt = this.buildFeedbackPrompt(draft, score);
      draft = await this.revise(plan, research, draft, feedbackPrompt);

      // 재평가
      score = this.scorer.score(
        { title: draft.draft.title, body: draft.draft.body },
        plan.targetKeywords
      );

      logger.info(`수정 완료. 새 품질 점수: ${score.overall}점`);
    }

    return {
      ...draft,
      qualityScore: score,
      iterations: iteration,
    };
  }

  /**
   * 피드백 프롬프트 생성
   */
  private buildFeedbackPrompt(draft: WriterResult, score: QualityScore): string {
    const feedbackItems = score.feedback.map(f => `- ${f}`).join('\n');

    return `
이전 초안의 품질 점수: ${score.overall}점 (기준: 70점)

세부 점수:
- 길이: ${score.dimensions.length}점
- 구조: ${score.dimensions.structure}점
- 가독성: ${score.dimensions.readability}점
- 키워드 밀도: ${score.dimensions.keywordDensity}점

개선이 필요한 부분:
${feedbackItems}

위 피드백을 반영하여 글을 수정해주세요. 기존 내용을 유지하면서 부족한 부분을 보완해주세요.
`.trim();
  }

  /**
   * 피드백 기반 글 수정
   */
  private async revise(
    plan: ContentPlan,
    research: ResearchData,
    previousDraft: WriterResult,
    feedback: string
  ): Promise<WriterResult> {
    const revisionPrompt = `
## 이전 초안
제목: ${previousDraft.draft.title}

${previousDraft.draft.body}

---

## 수정 요청
${feedback}

위 피드백을 반영하여 글을 수정해주세요.
`.trim();

    // 기존 write 메서드 활용하되 추가 컨텍스트 전달
    const input: AgentInput = {
      message: revisionPrompt,
      context: {
        plan,
        research,
        previousDraft: previousDraft.draft,
        isRevision: true,
      },
    };

    const result = await this.processSpecific(input);
    return result as WriterResult;
  }
}

/**
 * 작가 설정 헬퍼
 */
export function createWriterConfig(
  id: 'info-writer' | 'marketing-writer' | 'review-writer' | 'food-writer' | 'travel-writer' | 'tech-writer' | 'lifestyle-writer' | 'parenting-writer',
  persona: AgentConfig['persona'],
  contentType: ContentType,
  writingStyle: WritingStyle
): WriterAgentConfig {
  return {
    id,
    persona,
    systemPrompt: '',
    tools: [],
    model: 'sonnet',
    contentType,
    writingStyle,
  };
}
