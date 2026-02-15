/**
 * 맞춤법 검사 서비스
 */

import { createLogger } from '../utils/logger.js';

const logger = createLogger('SpellChecker');

/** 맞춤법 오류 */
export interface SpellingError {
  /** 원본 텍스트 */
  original: string;
  /** 수정 제안 */
  suggestions: string[];
  /** 오류 유형 */
  type: 'spelling' | 'spacing' | 'grammar';
  /** 시작 위치 */
  start: number;
  /** 끝 위치 */
  end: number;
  /** 설명 */
  description?: string;
}

/** 맞춤법 검사 결과 */
export interface SpellCheckResult {
  /** 원본 텍스트 */
  original: string;
  /** 수정된 텍스트 */
  corrected: string;
  /** 오류 목록 */
  errors: SpellingError[];
  /** 총 오류 수 */
  errorCount: number;
}

/** 자주 발생하는 맞춤법 오류 패턴 */
const COMMON_ERRORS: Array<{
  pattern: RegExp;
  replacement: string;
  type: SpellingError['type'];
  description: string;
}> = [
  // 맞춤법 오류
  { pattern: /됬/g, replacement: '됐', type: 'spelling', description: '"됬" → "됐"' },
  { pattern: /안됀/g, replacement: '안 된', type: 'spelling', description: '"안됀" → "안 된"' },
  { pattern: /웬지/g, replacement: '왠지', type: 'spelling', description: '"웬지" → "왠지"' },
  { pattern: /어의없/g, replacement: '어이없', type: 'spelling', description: '"어의없" → "어이없"' },
  { pattern: /몇일/g, replacement: '며칠', type: 'spelling', description: '"몇일" → "며칠"' },
  { pattern: /금새/g, replacement: '금세', type: 'spelling', description: '"금새" → "금세"' },
  { pattern: /어떻해/g, replacement: '어떡해', type: 'spelling', description: '"어떻해" → "어떡해"' },
  { pattern: /설겆이/g, replacement: '설거지', type: 'spelling', description: '"설겆이" → "설거지"' },
  { pattern: /빈대떡/g, replacement: '빈대떡', type: 'spelling', description: '빈대떡 (이미 맞음)' },
  { pattern: /곰곰히/g, replacement: '곰곰이', type: 'spelling', description: '"곰곰히" → "곰곰이"' },
  { pattern: /일찍히/g, replacement: '일찍이', type: 'spelling', description: '"일찍히" → "일찍이"' },
  { pattern: /오랫만/g, replacement: '오랜만', type: 'spelling', description: '"오랫만" → "오랜만"' },
  { pattern: /문안하/g, replacement: '무난하', type: 'spelling', description: '"문안하" → "무난하"' },
  { pattern: /희안하/g, replacement: '희한하', type: 'spelling', description: '"희안하" → "희한하"' },

  // 띄어쓰기 오류
  { pattern: /할수있/g, replacement: '할 수 있', type: 'spacing', description: '"할수있" → "할 수 있"' },
  { pattern: /할수없/g, replacement: '할 수 없', type: 'spacing', description: '"할수없" → "할 수 없"' },
  { pattern: /것같/g, replacement: '것 같', type: 'spacing', description: '"것같" → "것 같"' },
  { pattern: /수있/g, replacement: '수 있', type: 'spacing', description: '"수있" → "수 있"' },
  { pattern: /수없/g, replacement: '수 없', type: 'spacing', description: '"수없" → "수 없"' },
  { pattern: /데다가/g, replacement: '데다가', type: 'spacing', description: '데다가 (붙여씀)' },
  { pattern: /뿐만아니라/g, replacement: '뿐만 아니라', type: 'spacing', description: '"뿐만아니라" → "뿐만 아니라"' },
  { pattern: /그러므로써/g, replacement: '그럼으로써', type: 'spelling', description: '"그러므로써" → "그럼으로써"' },
];

/**
 * 맞춤법 검사 서비스 클래스
 */
export class SpellCheckerService {
  /**
   * 맞춤법 검사 실행
   */
  async check(text: string): Promise<SpellCheckResult> {
    logger.debug(`맞춤법 검사 시작: ${text.length}자`);

    const errors: SpellingError[] = [];
    let corrected = text;

    // 패턴 기반 검사
    for (const rule of COMMON_ERRORS) {
      let match;
      const regex = new RegExp(rule.pattern.source, 'g');

      while ((match = regex.exec(text)) !== null) {
        // 이미 올바른 경우 건너뛰기
        if (match[0] === rule.replacement) continue;

        errors.push({
          original: match[0],
          suggestions: [rule.replacement],
          type: rule.type,
          start: match.index,
          end: match.index + match[0].length,
          description: rule.description,
        });
      }

      // 수정 적용
      corrected = corrected.replace(rule.pattern, rule.replacement);
    }

    // 추가 검사: 연속 공백
    corrected = corrected.replace(/  +/g, ' ');

    // 추가 검사: 문장 끝 공백
    corrected = corrected.replace(/ +\n/g, '\n');
    corrected = corrected.replace(/ +$/gm, '');

    logger.debug(`맞춤법 검사 완료: ${errors.length}개 오류 발견`);

    return {
      original: text,
      corrected,
      errors,
      errorCount: errors.length,
    };
  }

  /**
   * 자동 수정 적용
   */
  async autoCorrect(text: string): Promise<string> {
    const result = await this.check(text);
    return result.corrected;
  }

  /**
   * 특정 유형의 오류만 수정
   */
  async correctByType(
    text: string,
    types: SpellingError['type'][]
  ): Promise<SpellCheckResult> {
    const fullResult = await this.check(text);

    // 지정된 유형의 오류만 필터링
    const filteredErrors = fullResult.errors.filter((e) => types.includes(e.type));

    // 지정된 유형만 수정 적용
    let corrected = text;
    for (const rule of COMMON_ERRORS) {
      if (types.includes(rule.type)) {
        corrected = corrected.replace(rule.pattern, rule.replacement);
      }
    }

    return {
      original: text,
      corrected,
      errors: filteredErrors,
      errorCount: filteredErrors.length,
    };
  }

  /**
   * 오류 하이라이트 (HTML)
   */
  highlightErrors(text: string, errors: SpellingError[]): string {
    // 역순 정렬 (뒤에서부터 수정해야 위치가 안 밀림)
    const sortedErrors = [...errors].sort((a, b) => b.start - a.start);

    let highlighted = text;
    for (const error of sortedErrors) {
      const before = highlighted.slice(0, error.start);
      const errorText = highlighted.slice(error.start, error.end);
      const after = highlighted.slice(error.end);

      highlighted =
        before +
        `<span class="spelling-error" data-type="${error.type}" title="${error.description}">${errorText}</span>` +
        after;
    }

    return highlighted;
  }
}

/** 맞춤법 검사 서비스 싱글톤 */
let spellCheckerInstance: SpellCheckerService | null = null;

export function getSpellCheckerService(): SpellCheckerService {
  if (!spellCheckerInstance) {
    spellCheckerInstance = new SpellCheckerService();
  }
  return spellCheckerInstance;
}

/**
 * 간편 맞춤법 검사 함수
 */
export async function checkSpelling(text: string): Promise<SpellCheckResult> {
  const service = getSpellCheckerService();
  return service.check(text);
}

/**
 * 간편 자동 수정 함수
 */
export async function autoCorrectSpelling(text: string): Promise<string> {
  const service = getSpellCheckerService();
  return service.autoCorrect(text);
}
