/**
 * 팩트 교차검증 유틸리티
 *
 * 여러 소스에서 수집된 팩트를 교차검증하여 신뢰도를 평가합니다.
 */

import { createLogger } from './logger.js';
import type { Fact, Source, FactValidationStatus } from '../types/content.js';
import type { FactValidationResult, SearchResultItem } from '../types/research.js';

const logger = createLogger('CrossValidator');

/** 검증 설정 */
export interface ValidationConfig {
  /** 교차검증 임계값 (0-1): 이 값 이상이면 교차검증됨으로 판정 */
  crossValidationThreshold: number;
  /** 검증됨 임계값 (0-1): 이 값 이상이면 검증됨으로 판정 */
  verifiedThreshold: number;
  /** 최소 소스 수: 교차검증에 필요한 최소 소스 수 */
  minSourcesForCrossValidation: number;
}

/** 기본 검증 설정 */
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  crossValidationThreshold: 0.6,
  verifiedThreshold: 0.8,
  minSourcesForCrossValidation: 2,
};

/**
 * 교차검증기 클래스
 */
export class CrossValidator {
  private readonly config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * 팩트 목록 검증
   */
  async validateFacts(
    facts: Fact[],
    sources: Source[],
    searchResults?: SearchResultItem[]
  ): Promise<FactValidationResult[]> {
    logger.info(`팩트 검증 시작: ${facts.length}개 팩트, ${sources.length}개 소스`);

    const results: FactValidationResult[] = [];

    for (const fact of facts) {
      const result = await this.validateSingleFact(fact, sources, searchResults);
      results.push(result);
    }

    const verifiedCount = results.filter(
      (r) => r.status === 'verified' || r.status === 'cross-validated'
    ).length;

    logger.info(`팩트 검증 완료: ${verifiedCount}/${facts.length} 검증됨`);

    return results;
  }

  /**
   * 단일 팩트 검증
   */
  async validateSingleFact(
    fact: Fact,
    sources: Source[],
    searchResults?: SearchResultItem[]
  ): Promise<FactValidationResult> {
    const validatedBy: Source[] = [];
    let confidence = 0;
    const conflicts: string[] = [];

    // 1. 기존 소스에서 검증
    for (const source of sources) {
      if (source.rawContent) {
        const similarity = this.calculateSimilarity(fact.content, source.rawContent);
        if (similarity >= this.config.crossValidationThreshold) {
          validatedBy.push(source);
          confidence = Math.max(confidence, similarity);
        }
      }
    }

    // 2. 검색 결과에서 추가 검증
    if (searchResults) {
      for (const result of searchResults) {
        const snippetSimilarity = this.calculateSimilarity(fact.content, result.snippet);
        if (snippetSimilarity >= this.config.crossValidationThreshold) {
          validatedBy.push({
            url: result.url,
            title: result.title,
            publishedDate: result.publishedDate,
            sourceType: result.source as any,
          });
          confidence = Math.max(confidence, snippetSimilarity);
        }
      }
    }

    // 3. 검증 상태 결정
    const status = this.determineValidationStatus(
      validatedBy.length,
      confidence,
      fact.sourceUrl !== undefined
    );

    // 4. 신뢰도 점수 계산
    const reliabilityScore = this.calculateReliabilityScore({
      fact,
      validatedBy,
      confidence,
      status,
    });

    // 팩트 업데이트
    const validatedFact: Fact = {
      ...fact,
      reliability: reliabilityScore,
      validationStatus: status,
      validationSources: validatedBy.map((s) => s.url),
    };

    return {
      fact: validatedFact,
      validatedBy,
      confidence,
      status,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
    };
  }

  /**
   * 검증 상태 결정
   */
  private determineValidationStatus(
    sourceCount: number,
    confidence: number,
    hasOriginalSource: boolean
  ): FactValidationStatus {
    // 높은 신뢰도 + 여러 소스 = verified
    if (
      confidence >= this.config.verifiedThreshold &&
      sourceCount >= this.config.minSourcesForCrossValidation
    ) {
      return 'verified';
    }

    // 중간 신뢰도 + 여러 소스 = cross-validated
    if (
      confidence >= this.config.crossValidationThreshold &&
      sourceCount >= this.config.minSourcesForCrossValidation
    ) {
      return 'cross-validated';
    }

    // 원본 소스는 있지만 교차검증 안됨 = single-source
    if (hasOriginalSource || sourceCount === 1) {
      return 'single-source';
    }

    // 검증 불가 = unverified
    return 'unverified';
  }

  /**
   * 신뢰도 점수 계산 (1-5)
   */
  calculateReliabilityScore(validation: FactValidationResult): number {
    const { status, confidence, validatedBy } = validation;

    let baseScore: number;
    switch (status) {
      case 'verified':
        baseScore = 5;
        break;
      case 'cross-validated':
        baseScore = 4;
        break;
      case 'single-source':
        baseScore = 3;
        break;
      default:
        baseScore = 1;
    }

    // 소스 수에 따른 보너스 (최대 0.5)
    const sourceBonus = Math.min(validatedBy.length * 0.1, 0.5);

    // 신뢰도에 따른 조정
    const confidenceAdjustment = (confidence - 0.5) * 0.5;

    const finalScore = Math.round(
      Math.max(1, Math.min(5, baseScore + sourceBonus + confidenceAdjustment))
    );

    return finalScore;
  }

  /**
   * 텍스트 유사도 계산 (간단한 n-gram 기반)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const normalize = (text: string) =>
      text.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, '').trim();

    const norm1 = normalize(text1);
    const norm2 = normalize(text2);

    if (norm1.length === 0 || norm2.length === 0) return 0;

    // 단어 기반 Jaccard 유사도
    const words1 = new Set(norm1.split(/\s+/));
    const words2 = new Set(norm2.split(/\s+/));

    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    const jaccard = intersection.size / union.size;

    // 부분 문자열 매칭 보너스
    const containsBonus = norm2.includes(norm1) || norm1.includes(norm2) ? 0.2 : 0;

    return Math.min(1, jaccard + containsBonus);
  }

  /**
   * 충돌 감지
   */
  detectConflicts(facts: Fact[]): Map<Fact, Fact[]> {
    const conflicts = new Map<Fact, Fact[]>();

    // 간단한 충돌 감지: 동일 주제에 대한 상반된 정보
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        if (this.areConflicting(facts[i], facts[j])) {
          if (!conflicts.has(facts[i])) {
            conflicts.set(facts[i], []);
          }
          conflicts.get(facts[i])!.push(facts[j]);
        }
      }
    }

    return conflicts;
  }

  /**
   * 두 팩트가 충돌하는지 확인
   */
  private areConflicting(fact1: Fact, fact2: Fact): boolean {
    // 간단한 휴리스틱: 동일 키워드를 공유하지만 내용이 반대인 경우
    const negationPatterns = [
      ['좋', '나쁘'],
      ['높', '낮'],
      ['많', '적'],
      ['크', '작'],
      ['있', '없'],
      ['된다', '안된다'],
      ['가능', '불가능'],
    ];

    const content1 = fact1.content.toLowerCase();
    const content2 = fact2.content.toLowerCase();

    for (const [pos, neg] of negationPatterns) {
      if (
        (content1.includes(pos) && content2.includes(neg)) ||
        (content1.includes(neg) && content2.includes(pos))
      ) {
        // 동일 주제에 대한 것인지 확인
        const similarity = this.calculateSimilarity(content1, content2);
        if (similarity > 0.3 && similarity < 0.8) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Balanced Mode 경고 생성
   */
  generateBalancedModeWarnings(facts: Fact[]): string[] {
    const warnings: string[] = [];

    const unverifiedFacts = facts.filter((f) => f.validationStatus === 'unverified');
    const singleSourceFacts = facts.filter((f) => f.validationStatus === 'single-source');

    if (unverifiedFacts.length > 0) {
      warnings.push(
        `${unverifiedFacts.length}개의 팩트가 검증되지 않았습니다. 사용 시 주의가 필요합니다.`
      );
    }

    if (singleSourceFacts.length > 0) {
      warnings.push(
        `${singleSourceFacts.length}개의 팩트가 단일 소스에서만 확인되었습니다.`
      );
    }

    return warnings;
  }
}

/** 교차검증기 싱글톤 */
let crossValidatorInstance: CrossValidator | null = null;

/**
 * 교차검증기 인스턴스 가져오기
 */
export function getCrossValidator(config?: Partial<ValidationConfig>): CrossValidator {
  if (!crossValidatorInstance) {
    crossValidatorInstance = new CrossValidator(config);
  }
  return crossValidatorInstance;
}

/**
 * 교차검증기 인스턴스 초기화 (테스트용)
 */
export function resetCrossValidator(): void {
  crossValidatorInstance = null;
}
