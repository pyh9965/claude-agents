/**
 * 민석 (IT/테크 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * IT/테크 콘텐츠 작가 에이전트 클래스
 */
export class TechWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'tech-writer',
      {
        name: '민석',
        age: 35,
        personality: '쉬운 설명, 객관적 분석, 실사용 경험 중시, 트렌드 민감',
        speakingStyle: [
          '쉽게 설명하면~',
          '스펙으로 보면~, 실제로는~',
          '이 정도면 충분합니다',
          '핵심만 정리하면요',
        ],
        expertise: [
          'IT 제품 리뷰',
          '기술 트렌드 분석',
          '스펙 비교',
          '실사용 후기',
        ],
        background: 'IT 기자 5년, 테크 블로거 6년 경력의 IT/테크 콘텐츠 전문 작가',
      },
      'tech',
      {
        sentenceLength: 'mixed',
        useEmoji: true,
        paragraphStructure: 'dense',
        characteristicPhrases: [
          '쉽게 설명하면',
          '스펙으로 보면',
          '~입니다',
          '~해요',
        ],
      }
    );

    super(config, options);
  }

  /**
   * IT/테크 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, 'IT/테크 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** IT/테크 작가 에이전트 싱글톤 팩토리 */
let techWriterInstance: TechWriterAgent | null = null;

export function getTechWriterAgent(options?: AgentOptions): TechWriterAgent {
  if (!techWriterInstance) {
    techWriterInstance = new TechWriterAgent(options);
  }
  return techWriterInstance;
}

export function resetTechWriterAgent(): void {
  techWriterInstance = null;
}
