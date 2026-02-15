/**
 * 키워드 확장 유틸리티
 *
 * 주어진 키워드를 확장하여 관련 검색어, 동의어, 연관 용어를 생성합니다.
 */

import { createLogger } from './logger.js';
import type { KeywordExpansionResult } from '../types/research.js';

const logger = createLogger('KeywordExpander');

/** 한국어 조사/어미 패턴 */
const KOREAN_SUFFIXES = [
  '이란', '이란?', '란', '란?',
  '추천', '비교', '후기', '리뷰',
  '가격', '순위', '종류', '방법',
  '장단점', '장점', '단점',
  '2024', '2025', '최신',
];

/** 일반적인 검색 의도 수식어 */
const SEARCH_MODIFIERS = [
  '가이드', '완벽', '총정리', '정리',
  '초보', '입문', '기초', '심화',
  '실제', '솔직', '꿀팁', '팁',
];

/**
 * 키워드 확장기 클래스
 */
export class KeywordExpander {
  /**
   * 키워드 확장
   */
  async expand(keywords: string[]): Promise<KeywordExpansionResult[]> {
    const results: KeywordExpansionResult[] = [];

    for (const keyword of keywords) {
      const result = await this.expandSingle(keyword);
      results.push(result);
    }

    return results;
  }

  /**
   * 단일 키워드 확장
   */
  async expandSingle(keyword: string): Promise<KeywordExpansionResult> {
    logger.debug(`키워드 확장: "${keyword}"`);

    const expanded: string[] = [];
    const synonyms: string[] = [];
    const relatedTerms: string[] = [];

    // 1. 접미사 조합으로 확장
    for (const suffix of KOREAN_SUFFIXES) {
      expanded.push(`${keyword} ${suffix}`);
    }

    // 2. 수식어 조합
    for (const modifier of SEARCH_MODIFIERS) {
      relatedTerms.push(`${keyword} ${modifier}`);
    }

    // 3. 질문형 변환
    relatedTerms.push(`${keyword} 어떻게`);
    relatedTerms.push(`${keyword} 뭐가 좋아`);
    relatedTerms.push(`${keyword} 어디서`);

    // 4. 동의어 추출 (간단한 규칙 기반)
    synonyms.push(...this.findSimpleSynonyms(keyword));

    logger.debug(`키워드 "${keyword}" 확장 완료: ${expanded.length + relatedTerms.length}개`);

    return {
      original: keyword,
      expanded: this.deduplicate(expanded).slice(0, 10),
      synonyms: this.deduplicate(synonyms),
      relatedTerms: this.deduplicate(relatedTerms).slice(0, 10),
    };
  }

  /**
   * 경쟁 분석용 키워드 생성
   */
  async getCompetitorKeywords(topic: string): Promise<string[]> {
    const keywords: string[] = [
      topic,
      `${topic} 추천`,
      `${topic} 후기`,
      `${topic} 비교`,
      `${topic} 순위`,
      `${topic} 가격`,
      `${topic} 장단점`,
      `${topic} 2025`,
      `${topic} 블로그`,
      `${topic} 정보`,
    ];

    return this.deduplicate(keywords);
  }

  /**
   * 롱테일 키워드 생성
   */
  generateLongTailKeywords(keyword: string, context?: string): string[] {
    const longTail: string[] = [];

    // 위치 기반
    if (context) {
      longTail.push(`${context} ${keyword}`);
      longTail.push(`${context} ${keyword} 추천`);
    }

    // 시간 기반
    const currentYear = new Date().getFullYear();
    longTail.push(`${currentYear} ${keyword}`);
    longTail.push(`${keyword} ${currentYear} 추천`);

    // 대상 기반
    longTail.push(`초보자 ${keyword}`);
    longTail.push(`${keyword} 초보 가이드`);

    return this.deduplicate(longTail);
  }

  /**
   * 간단한 동의어 찾기 (규칙 기반)
   */
  private findSimpleSynonyms(keyword: string): string[] {
    const synonymMap: Record<string, string[]> = {
      '맛집': ['맛있는 곳', '식당', '레스토랑'],
      '카페': ['커피숍', '커피집'],
      '호텔': ['숙소', '숙박'],
      '여행': ['관광', '여행지', '투어'],
      '제품': ['상품', '물건'],
      '가격': ['비용', '가성비', '값'],
      '추천': ['베스트', '인기', 'TOP'],
      '후기': ['리뷰', '평가', '사용기'],
      '비교': ['VS', '대결', '비교분석'],
    };

    const synonyms: string[] = [];
    for (const [key, values] of Object.entries(synonymMap)) {
      if (keyword.includes(key)) {
        for (const value of values) {
          synonyms.push(keyword.replace(key, value));
        }
      }
    }

    return synonyms;
  }

  /**
   * 중복 제거
   */
  private deduplicate(items: string[]): string[] {
    return [...new Set(items)];
  }
}

/** 키워드 확장기 싱글톤 */
let keywordExpanderInstance: KeywordExpander | null = null;

/**
 * 키워드 확장기 인스턴스 가져오기
 */
export function getKeywordExpander(): KeywordExpander {
  if (!keywordExpanderInstance) {
    keywordExpanderInstance = new KeywordExpander();
  }
  return keywordExpanderInstance;
}

/**
 * 키워드 확장기 인스턴스 초기화 (테스트용)
 */
export function resetKeywordExpander(): void {
  keywordExpanderInstance = null;
}
