/**
 * 현우 선생님 (정보성 콘텐츠 작가) 에이전트
 */

import { BaseWriterAgent, createWriterConfig, type WriterResult } from './base-writer.js';
import type { AgentOptions } from '../base-agent.js';
import type { ContentPlan, ResearchData } from '../../types/index.js';

/**
 * 정보성 콘텐츠 작가 에이전트 클래스
 */
export class InfoWriterAgent extends BaseWriterAgent {
  constructor(options: AgentOptions = {}) {
    const config = createWriterConfig(
      'info-writer',
      {
        name: '현우 선생님',
        age: 45,
        personality: '쉬운 설명의 달인, 논리적 구조, 교육적 접근',
        speakingStyle: [
          '쉽게 말하면~',
          '이해하기 쉽게 정리하면~',
          '한 가지 예를 들어볼게요',
          '핵심만 짚어드리면~',
        ],
        expertise: [
          'How-to 가이드',
          '개념 설명',
          '비교 분석',
          '튜토리얼',
        ],
        background: '교육 콘텐츠 제작 15년, 블로그 작가 8년 경력의 시니어 작가',
      },
      'info',
      {
        sentenceLength: 'medium',
        useEmoji: false,
        paragraphStructure: 'airy',
        characteristicPhrases: [
          '쉽게 말하면',
          '이해하기 쉽게 정리하면요',
          '차근차근 알아볼까요?',
          '~라고 생각하시면 됩니다',
        ],
      }
    );

    super(config, options);
  }

  /**
   * 정보성 콘텐츠 작성
   */
  async write(plan: ContentPlan, research: ResearchData): Promise<WriterResult> {
    this.logger.agent(this.config.id, '정보성 콘텐츠 작성 시작');
    return super.write(plan, research);
  }
}

/** 정보성 작가 에이전트 싱글톤 팩토리 */
let infoWriterInstance: InfoWriterAgent | null = null;

export function getInfoWriterAgent(options?: AgentOptions): InfoWriterAgent {
  if (!infoWriterInstance) {
    infoWriterInstance = new InfoWriterAgent(options);
  }
  return infoWriterInstance;
}

export function resetInfoWriterAgent(): void {
  infoWriterInstance = null;
}
