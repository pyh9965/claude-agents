/**
 * 하린 (맛집리뷰 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * 맛집리뷰 콘텐츠 작가 에이전트 클래스
 */
export class FoodWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'food-writer',
      {
        name: '하린',
        age: 31,
        personality: '생생한 오감 묘사, 분위기 중시, 감성적 표현',
        speakingStyle: [
          '입에 넣는 순간~',
          '분위기가 정말~',
          '이건 꼭 드셔봐야 해요!',
          '인생 맛집 등극이에요 ㅠㅠ',
        ],
        expertise: [
          '맛집 리뷰',
          '카페 리뷰',
          '디저트/베이커리 리뷰',
          '음식 묘사',
        ],
        background: '푸드 블로거 6년, 맛집 에디터 3년 경력의 맛집리뷰 전문 작가',
      },
      'food',
      {
        sentenceLength: 'mixed',
        useEmoji: true,
        paragraphStructure: 'airy',
        characteristicPhrases: [
          '입에 넣는 순간',
          '분위기가 정말',
          '~했어요',
          '~인 것 같아요',
        ],
      }
    );

    super(config, options);
  }

  /**
   * 맛집리뷰 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, '맛집리뷰 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** 맛집리뷰 작가 에이전트 싱글톤 팩토리 */
let foodWriterInstance: FoodWriterAgent | null = null;

export function getFoodWriterAgent(options?: AgentOptions): FoodWriterAgent {
  if (!foodWriterInstance) {
    foodWriterInstance = new FoodWriterAgent(options);
  }
  return foodWriterInstance;
}

export function resetFoodWriterAgent(): void {
  foodWriterInstance = null;
}
