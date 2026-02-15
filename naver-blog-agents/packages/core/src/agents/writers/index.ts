/**
 * 작가 에이전트 모듈 re-export
 */

export * from './base-writer.js';
export * from './info-writer.js';
export * from './marketing-writer.js';
export * from './review-writer.js';
export * from './food-writer.js';
export * from './travel-writer.js';
export * from './tech-writer.js';
export * from './lifestyle-writer.js';
export * from './parenting-writer.js';

import type { ContentType } from '../../types/index.js';
import type { AgentOptions } from '../base-agent.js';
import type { BaseWriterAgent } from './base-writer.js';
import { getInfoWriterAgent } from './info-writer.js';
import { getMarketingWriterAgent } from './marketing-writer.js';
import { getReviewWriterAgent } from './review-writer.js';
import { getFoodWriterAgent } from './food-writer.js';
import { getTravelWriterAgent } from './travel-writer.js';
import { getTechWriterAgent } from './tech-writer.js';
import { getLifestyleWriterAgent } from './lifestyle-writer.js';
import { getParentingWriterAgent } from './parenting-writer.js';

/**
 * 콘텐츠 유형에 따라 적절한 작가 에이전트 반환
 */
export function getWriterAgent(
  contentType: ContentType,
  options?: AgentOptions
): BaseWriterAgent {
  switch (contentType) {
    case 'info':
      return getInfoWriterAgent(options);
    case 'marketing':
      return getMarketingWriterAgent(options);
    case 'review':
      return getReviewWriterAgent(options);
    case 'food':
      return getFoodWriterAgent(options);
    case 'travel':
      return getTravelWriterAgent(options);
    case 'tech':
      return getTechWriterAgent(options);
    case 'lifestyle':
      return getLifestyleWriterAgent(options);
    case 'parenting':
      return getParentingWriterAgent(options);
    default:
      throw new Error(`알 수 없는 콘텐츠 유형: ${contentType}`);
  }
}

/**
 * 작가 이름 매핑
 */
export const WRITER_NAMES: Record<ContentType, string> = {
  info: '현우 선생님',
  marketing: '지은 언니',
  review: '태현',
  food: '하린',
  travel: '유진',
  tech: '민석',
  lifestyle: '수아',
  parenting: '예원맘',
};
