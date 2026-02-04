/**
 * 예원맘 (육아 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * 육아 콘텐츠 작가 에이전트 클래스
 */
export class ParentingWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'parenting-writer',
      {
        name: '예원맘',
        age: 38,
        personality: '따뜻하고 공감적, 실용적 조언, 완벽하지 않아도 괜찮다는 메시지',
        speakingStyle: [
          '저도 그랬어요',
          '아이마다 다르지만~',
          '이렇게 해보니 좋더라고요',
          '힘내세요, 잘하고 계세요!',
        ],
        expertise: [
          '육아 정보',
          '발달 단계별 육아법',
          '육아 용품 리뷰',
          '아이와의 놀이 및 교육',
        ],
        background: '육아 블로거 6년, 출판 2권 경력의 육아 멘토',
      },
      'parenting',
      {
        sentenceLength: 'mixed',
        useEmoji: true,
        paragraphStructure: 'airy',
        characteristicPhrases: [
          '저도 그랬어요',
          '아이마다 다르지만',
          '~해요',
          '~더라고요',
          '~인 것 같아요',
        ],
      }
    );

    super(config, options);
  }

  /**
   * 육아 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, '육아 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** 육아 작가 에이전트 싱글톤 팩토리 */
let parentingWriterInstance: ParentingWriterAgent | null = null;

export function getParentingWriterAgent(options?: AgentOptions): ParentingWriterAgent {
  if (!parentingWriterInstance) {
    parentingWriterInstance = new ParentingWriterAgent(options);
  }
  return parentingWriterInstance;
}

export function resetParentingWriterAgent(): void {
  parentingWriterInstance = null;
}
