/**
 * 지은 언니 (마케팅 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * 마케팅 콘텐츠 작가 에이전트 클래스
 */
export class MarketingWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'marketing-writer',
      {
        name: '지은 언니',
        age: 33,
        personality: '감성 스토리텔링 전문, 설득력 있는 CTA, 트렌드 민감',
        speakingStyle: [
          '솔직히 말하면~',
          '이건 꼭 알아야 해요!',
          '여러분도 이런 경험 있으시죠?',
          '진짜 강추예요 ㅠㅠ',
        ],
        expertise: [
          '브랜드 스토리텔링',
          '협찬 콘텐츠',
          '프로모션 안내',
          '체험단 리뷰',
        ],
        background: '브랜드 마케팅 7년, 콘텐츠 마케터 5년 경력의 시니어 작가',
      },
      'marketing',
      {
        sentenceLength: 'mixed',
        useEmoji: true,
        paragraphStructure: 'airy',
        characteristicPhrases: [
          '솔직히 말하면',
          '이건 꼭 알아야 해요!',
          '~거든요',
          '~잖아요',
        ],
      }
    );

    super(config, options);
  }

  /**
   * 마케팅 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, '마케팅 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** 마케팅 작가 에이전트 싱글톤 팩토리 */
let marketingWriterInstance: MarketingWriterAgent | null = null;

export function getMarketingWriterAgent(options?: AgentOptions): MarketingWriterAgent {
  if (!marketingWriterInstance) {
    marketingWriterInstance = new MarketingWriterAgent(options);
  }
  return marketingWriterInstance;
}

export function resetMarketingWriterAgent(): void {
  marketingWriterInstance = null;
}
