import type { QualityScore, QualityConfig } from '../types/quality.js';
import { DEFAULT_QUALITY_CONFIG } from '../types/quality.js';

/**
 * 콘텐츠 품질 평가기
 */
export class QualityScorer {
  private config: QualityConfig;

  constructor(config: Partial<QualityConfig> = {}) {
    this.config = { ...DEFAULT_QUALITY_CONFIG, ...config };
  }

  /**
   * 콘텐츠 품질 평가
   */
  score(content: { title: string; body: string }, keywords: string[] = []): QualityScore {
    const dimensions = {
      length: this.scoreLengthDimension(content.body),
      structure: this.scoreStructureDimension(content.body),
      readability: this.scoreReadabilityDimension(content.body),
      keywordDensity: this.scoreKeywordDensity(content.body, keywords),
    };

    // 가중 평균 (길이 30%, 구조 25%, 가독성 25%, 키워드 20%)
    const overall = Math.round(
      dimensions.length * 0.3 +
      dimensions.structure * 0.25 +
      dimensions.readability * 0.25 +
      dimensions.keywordDensity * 0.2
    );

    const feedback = this.generateFeedback(dimensions);
    const passed = overall >= this.config.passThreshold;

    return { overall, dimensions, passed, feedback };
  }

  private scoreLengthDimension(body: string): number {
    const wordCount = body.length;
    const ratio = wordCount / this.config.targetWordCount;
    if (ratio >= 0.9 && ratio <= 1.3) return 100;
    if (ratio >= 0.7 && ratio <= 1.5) return 80;
    if (ratio >= 0.5 && ratio <= 2.0) return 60;
    return 40;
  }

  private scoreStructureDimension(body: string): number {
    const headings = (body.match(/^##?\s+/gm) || []).length;
    const paragraphs = body.split(/\n\n+/).filter(p => p.trim()).length;

    let score = 50;
    if (headings >= 3) score += 25;
    else if (headings >= 2) score += 15;
    if (paragraphs >= 5) score += 25;
    else if (paragraphs >= 3) score += 15;

    return Math.min(score, 100);
  }

  private scoreReadabilityDimension(body: string): number {
    const sentences = body.split(/[.!?]+/).filter(s => s.trim());
    if (sentences.length === 0) return 50;

    const avgLength = body.length / sentences.length;
    if (avgLength >= 30 && avgLength <= 60) return 100;
    if (avgLength >= 20 && avgLength <= 80) return 80;
    return 60;
  }

  private scoreKeywordDensity(body: string, keywords: string[]): number {
    if (keywords.length === 0) return 70; // 키워드 없으면 기본값

    const totalWords = body.length;
    let keywordCount = 0;
    keywords.forEach(kw => {
      const regex = new RegExp(kw, 'gi');
      keywordCount += (body.match(regex) || []).length * kw.length;
    });

    const density = (keywordCount / totalWords) * 100;
    if (density >= 1 && density <= 3) return 100;
    if (density >= 0.5 && density <= 5) return 70;
    return 50;
  }

  private generateFeedback(dimensions: QualityScore['dimensions']): string[] {
    const feedback: string[] = [];

    if (dimensions.length < 70) {
      feedback.push('글 길이가 목표에 미달합니다. 더 자세한 내용을 추가해주세요.');
    }
    if (dimensions.structure < 70) {
      feedback.push('소제목과 문단 구분이 부족합니다. 구조를 개선해주세요.');
    }
    if (dimensions.readability < 70) {
      feedback.push('문장이 너무 길거나 짧습니다. 적절한 길이로 조정해주세요.');
    }
    if (dimensions.keywordDensity < 70) {
      feedback.push('키워드 사용이 부족하거나 과합니다. 자연스럽게 키워드를 배치해주세요.');
    }

    return feedback;
  }
}
