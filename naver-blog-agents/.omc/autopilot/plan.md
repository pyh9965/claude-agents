# 네이버 블로그 에이전트 시스템 - 실행 계획 v2

## 개요
Critic 피드백을 반영한 상세 실행 계획

---

## Phase 2: 품질 향상

### Task 2.1: Zod 의존성 추가
- **파일**: package.json
- **내용**: `npm install zod@^3.22.4`
- **검증**: `import { z } from 'zod'` 컴파일 확인

### Task 2.2: Zod 스키마 생성
- **파일**:
  - `src/schemas/index.ts`
  - `src/schemas/content.schema.ts`
- **스키마 목록**:
  ```typescript
  // content.schema.ts
  export const ContentPlanSchema = z.object({
    title: z.string().min(5).max(100),
    outline: z.array(z.object({
      heading: z.string(),
      description: z.string(),
      keyPoints: z.array(z.string())
    })).min(2),
    targetKeywords: z.array(z.string()).min(1).max(10),
    assignedWriter: z.enum(['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting']),
    estimatedLength: z.number().min(500).max(10000),
  });

  export const DraftContentSchema = z.object({
    title: z.string().min(5),
    body: z.string().min(500),
    metadata: z.object({
      writer: z.string(),
      contentType: z.string(),
      wordCount: z.number()
    })
  });
  ```
- **검증**: 스키마 파싱 테스트

### Task 2.3: QualityScorer 구현
- **파일**:
  - `src/types/quality.ts`
  - `src/quality/index.ts`
  - `src/quality/scorer.ts`
- **인터페이스**:
  ```typescript
  interface QualityScore {
    overall: number;        // 0-100 종합
    dimensions: {
      length: number;       // 목표 길이 대비
      structure: number;    // 소제목/문단 구조
      readability: number;  // 문장 길이 기반
      keywordDensity: number; // 키워드 밀도
    };
    passed: boolean;
    feedback: string[];
  }
  ```
- **기준**:
  - PASS: overall >= 70
  - RETRY: 50 <= overall < 70
  - FAIL: overall < 50
- **검증**: 샘플 텍스트로 점수 계산 테스트

### Task 2.4: QualityGate 구현
- **파일**: `src/quality/gate.ts`
- **내용**:
  ```typescript
  class QualityGate {
    check(score: QualityScore, threshold = 70): GateResult;
    getFailureReasons(score: QualityScore): string[];
  }
  ```
- **검증**: 통과/실패 케이스 테스트

### Task 2.5: Self-Reflection 루프
- **파일**: `src/agents/writers/base-writer.ts` (수정)
- **메커니즘**:
  ```typescript
  async writeWithReflection(plan, research, maxIterations = 2): Promise<WriterResult> {
    let draft = await this.write(plan, research);
    let score = await this.scorer.score(draft);
    let iteration = 0;

    while (score.overall < 70 && iteration < maxIterations) {
      const feedback = this.buildFeedbackPrompt(score);
      draft = await this.revise(draft, feedback);
      score = await this.scorer.score(draft);
      iteration++;
    }

    return { ...draft, qualityScore: score, iterations: iteration };
  }
  ```
- **피드백 템플릿**:
  ```
  이전 초안의 품질 점수: {score}점
  개선이 필요한 부분:
  {feedback_items}

  위 피드백을 반영하여 글을 수정해주세요.
  ```
- **검증**: 2회 반복 후 품질 향상 확인

---

## Phase 3: 아키텍처 개선

### Task 3.1: 콘텐츠 유형 확장
- **파일**:
  - `src/types/content.ts` (수정)
  - `src/types/agent.ts` (수정)
- **변경**:
  ```typescript
  // content.ts line 6
  export type ContentType =
    | 'info' | 'marketing' | 'review' | 'food'  // 기존
    | 'travel' | 'tech' | 'lifestyle' | 'parenting';  // 신규

  // agent.ts
  export type AgentRole =
    | ... // 기존
    | 'travel-writer' | 'tech-writer' | 'lifestyle-writer' | 'parenting-writer';
  ```
- **검증**: TypeScript 컴파일

### Task 3.2: 새 작가 에이전트 4개 생성

#### 3.2.1 travel-writer
- **파일**:
  - `src/agents/writers/travel-writer.ts`
  - `prompts/writers/travel-writer.md`
- **페르소나**: 유진 (32세, 여행 블로거 7년)
- **문체**: 감성적, 사진 중심, "~했어요" 체

#### 3.2.2 tech-writer
- **파일**:
  - `src/agents/writers/tech-writer.ts`
  - `prompts/writers/tech-writer.md`
- **페르소나**: 민석 (35세, IT 전문 블로거)
- **문체**: 전문적이면서 쉬운 설명, 스펙 비교 표

#### 3.2.3 lifestyle-writer
- **파일**:
  - `src/agents/writers/lifestyle-writer.ts`
  - `prompts/writers/lifestyle-writer.md`
- **페르소나**: 수아 (28세, 라이프스타일 블로거)
- **문체**: 친근하고 공감적, 이모지 사용

#### 3.2.4 parenting-writer
- **파일**:
  - `src/agents/writers/parenting-writer.ts`
  - `prompts/writers/parenting-writer.md`
- **페르소나**: 예원맘 (38세, 육아 전문 블로거)
- **문체**: 경험담 기반, 따뜻한 톤

### Task 3.3: 작가 모듈 통합
- **파일**:
  - `src/agents/writers/index.ts` (수정)
  - `src/agents/index.ts` (수정)
  - `src/workflow/pipeline.ts` (수정)
- **변경**:
  - `selectWriterForContentType()` 함수에 4개 케이스 추가
  - `AGENT_NAMES`에 4개 작가 추가

### Task 3.4: DAG 워크플로우 엔진
- **파일**:
  - `src/workflow/dag-executor.ts` (생성)
  - `src/types/workflow.ts` (수정)
- **DAG 구조**:
  ```
  planning ──→ research ──→ writing ──┬──→ editing ──┐
                                      │              │
                                      └──→ seo ──────┴──→ formatting
  ```
- **구현**: 토폴로지 정렬 (Kahn's algorithm), 외부 라이브러리 없이 구현
- **검증**: DAG 실행 순서 테스트

---

## Phase 4: 고도화

### Task 4.1: MCP 서버 기본 구축
- **파일**: `src/mcp/` 디렉토리
- **내용**:
  - stdio 기반 MCP 서버
  - 6개 도구: generate_content, plan_content, research_topic, write_draft, edit_content, optimize_seo
- **의존성**: `@modelcontextprotocol/sdk`
- **검증**: MCP Inspector로 도구 호출 테스트

---

## 실행 순서

### 병렬 그룹 A (즉시 시작)
- Task 2.1 (Zod 설치)
- Task 3.1 (타입 확장)

### 순차 그룹 B (Task 2.1 후)
- Task 2.2 → Task 2.3 → Task 2.4 → Task 2.5

### 병렬 그룹 C (Task 3.1 후)
- Task 3.2.1, 3.2.2, 3.2.3, 3.2.4 (새 작가 4개)

### 순차 그룹 D
- Task 3.3 (작가 통합) → Task 3.4 (DAG)

### 마지막
- Task 4.1 (MCP 서버)

---

## 완료 기준
- [ ] TypeScript 빌드 성공
- [ ] 기존 4개 콘텐츠 유형 정상 작동
- [ ] 새 4개 콘텐츠 유형 작동
- [ ] Self-Reflection 품질 향상 확인
- [ ] git commit 완료
