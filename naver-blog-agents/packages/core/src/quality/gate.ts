import type { QualityScore, GateResult, QualityConfig } from '../types/quality.js';
import { DEFAULT_QUALITY_CONFIG } from '../types/quality.js';

/**
 * 품질 게이트 - 품질 기준 충족 여부 검사
 */
export class QualityGate {
  private config: QualityConfig;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
  }

  /**
   * 품질 게이트 검사
   */
  check(score: QualityScore): GateResult {
    const failureReasons: string[] = [];

    if (score.overall < this.config.passThreshold) {
      failureReasons.push(`종합 점수 ${score.overall}점이 기준 ${this.config.passThreshold}점 미만입니다.`);
    }

    // 개별 차원 검사
    Object.entries(score.dimensions).forEach(([key, value]) => {
      if (value < 50) {
        failureReasons.push(`${key} 점수가 ${value}점으로 매우 낮습니다.`);
      }
    });

    return {
      passed: failureReasons.length === 0,
      score,
      failureReasons,
    };
  }

  /**
   * 재시도 가능 여부 확인
   */
  canRetry(score: QualityScore): boolean {
    return score.overall >= this.config.retryThreshold && !score.passed;
  }
}
