/**
 * 태현 (제품리뷰 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * 제품리뷰 콘텐츠 작가 에이전트 클래스
 */
export class ReviewWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'review-writer',
      {
        name: '태현',
        age: 27,
        personality: '솔직한 장단점 분석, 스펙 비교, 실용주의',
        speakingStyle: [
          '실제로 써보니까~',
          '스펙만 보면~, 근데 실제로는~',
          '솔직히 이 부분은 아쉬웠어요',
          '가성비로 따지면~',
        ],
        expertise: [
          'IT 기기 리뷰',
          '가전제품 리뷰',
          '서비스/앱 리뷰',
          '비교 리뷰',
        ],
        background: 'IT/가전 리뷰어 4년 경력의 제품리뷰 전문 작가',
      },
      'review',
      {
        sentenceLength: 'medium',
        useEmoji: true,
        paragraphStructure: 'mixed',
        characteristicPhrases: [
          '실제로 써보니까',
          '스펙만 보면',
          '가성비로 따지면',
          '~더라고요',
        ],
      }
    );

    super(config, options);
  }

  /**
   * 제품리뷰 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, '제품리뷰 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** 제품리뷰 작가 에이전트 싱글톤 팩토리 */
let reviewWriterInstance: ReviewWriterAgent | null = null;

export function getReviewWriterAgent(options?: AgentOptions): ReviewWriterAgent {
  if (!reviewWriterInstance) {
    reviewWriterInstance = new ReviewWriterAgent(options);
  }
  return reviewWriterInstance;
}

export function resetReviewWriterAgent(): void {
  reviewWriterInstance = null;
}
