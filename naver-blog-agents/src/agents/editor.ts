/**
 * 서연 실장 (편집자) 에이전트
 */

import { BaseAgent, createAgentConfig, type AgentOptions } from './base-agent.js';
import type {
  AgentInput,
  DraftContent,
  EditedContent,
  Correction,
} from '../types/index.js';

/** 편집 결과 인터페이스 */
export interface EditorResult {
  agentMessage: string;
  edited: EditedContent;
}

/**
 * 편집자 에이전트 클래스
 */
export class EditorAgent extends BaseAgent {
  constructor(options: AgentOptions = {}) {
    const config = createAgentConfig(
      'editor',
      {
        name: '서연 실장',
        age: 40,
        personality: '완벽주의자, 디테일에 강함, 톤 일관성 중시',
        speakingStyle: [
          '이 부분은 조금 다듬으면~',
          '전체적인 톤을 맞춰볼게요',
          '여기는 이렇게 고치면 더 자연스러워요',
          '독자 입장에서 보면~',
        ],
        expertise: [
          '맞춤법 교정',
          '문장 다듬기',
          '톤 일관성',
          '가독성 개선',
        ],
        background: '출판사 편집자 12년, 콘텐츠 에디터 5년 경력의 편집 실장',
      },
      'sonnet',
      ['spell_check']
    );

    super(config, options);
  }

  /**
   * 편집 요청 메시지 구성
   */
  private buildEditingMessage(draft: DraftContent): string {
    return `## 편집 요청

### 작성 정보
- **작가**: ${draft.metadata.writer}
- **콘텐츠 유형**: ${draft.metadata.contentType}
- **글자 수**: ${draft.metadata.wordCount}자

### 원본 콘텐츠

**제목**:
${draft.title}

**본문**:
${draft.body}

---

위 콘텐츠를 편집해주세요. 다음 항목을 검토하고 수정해주세요:

### 편집 체크리스트

1. **맞춤법/문법**
   - 맞춤법 오류 수정
   - 띄어쓰기 교정
   - 문법 오류 수정

2. **문장 다듬기**
   - 어색한 문장 자연스럽게 수정
   - 중복 표현 제거
   - 문장 길이 조절

3. **톤 일관성**
   - 글 전체 어조 통일
   - 작가 페르소나에 맞는 표현 유지
   - 콘텐츠 유형에 맞는 톤 확인

4. **가독성**
   - 문단 구조 정리
   - 적절한 줄바꿈
   - 핵심 포인트 강조 확인

수정 사항은 원본-수정-이유와 함께 corrections 배열에 기록해주세요.
`;
  }

  /**
   * 특화 처리 로직
   */
  async processSpecific(input: AgentInput): Promise<EditorResult> {
    const output = await this.execute(input);

    if (!output.success || !output.data) {
      throw new Error('편집 실패: ' + output.agentMessage);
    }

    return output.data as EditorResult;
  }

  /**
   * 편집 실행
   */
  async edit(draft: DraftContent): Promise<EditorResult> {
    const message = this.buildEditingMessage(draft);

    const input: AgentInput = {
      message,
      context: {
        writer: draft.metadata.writer,
        contentType: draft.metadata.contentType,
      },
    };

    this.logger.agent(this.config.id, '콘텐츠 편집 시작');

    const result = await this.processSpecific(input);

    const correctionCount = result.edited.corrections?.length || 0;
    this.logger.agent(
      this.config.id,
      `편집 완료: ${correctionCount}개 수정 사항`
    );

    return result;
  }

  /**
   * 수정 사항 요약 생성
   */
  summarizeCorrections(corrections: Correction[]): string {
    const typeCounts: Record<string, number> = {};

    for (const correction of corrections) {
      typeCounts[correction.type] = (typeCounts[correction.type] || 0) + 1;
    }

    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${type}: ${count}개`)
      .join(', ');

    return `총 ${corrections.length}개 수정 (${summary})`;
  }
}

/** 편집자 에이전트 싱글톤 팩토리 */
let editorInstance: EditorAgent | null = null;

export function getEditorAgent(options?: AgentOptions): EditorAgent {
  if (!editorInstance) {
    editorInstance = new EditorAgent(options);
  }
  return editorInstance;
}

export function resetEditorAgent(): void {
  editorInstance = null;
}
