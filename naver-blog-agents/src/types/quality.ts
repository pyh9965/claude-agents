/**
 * 품질 관련 타입 정의
 */

/** 품질 점수 */
export interface QualityScore {
  /** 종합 점수 (0-100) */
  overall: number;
  /** 세부 점수 */
  dimensions: {
    /** 길이 점수 - 목표 대비 */
    length: number;
    /** 구조 점수 - 소제목/문단 */
    structure: number;
    /** 가독성 점수 - 문장 길이 기반 */
    readability: number;
    /** 키워드 밀도 점수 */
    keywordDensity: number;
  };
  /** 통과 여부 */
  passed: boolean;
  /** 개선 피드백 */
  feedback: string[];
}

/** 품질 게이트 결과 */
export interface GateResult {
  passed: boolean;
  score: QualityScore;
  failureReasons: string[];
}

/** 품질 설정 */
export interface QualityConfig {
  /** 통과 기준 점수 */
  passThreshold: number;
  /** 재시도 기준 점수 */
  retryThreshold: number;
  /** 목표 글자 수 */
  targetWordCount: number;
  /** 목표 키워드 밀도 (%) */
  targetKeywordDensity: number;
}

/** 기본 품질 설정 */
export const DEFAULT_QUALITY_CONFIG: QualityConfig = {
  passThreshold: 70,
  retryThreshold: 50,
  targetWordCount: 2500,
  targetKeywordDensity: 2,
};
