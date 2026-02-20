# 네이버 블로그 자동화 - 작업 기록

## 최종 업데이트: 2026-02-20

---

## 최근 작업: 블로그 포맷팅 + 파일 다이얼로그 수정 + E2E 테스트

### 1. 블로그 본문 가독성 포맷팅 (`formatForBlog`)

**문제**: AI가 생성한 블로그 글이 긴 문단으로 이어져 가독성이 떨어짐.

**해결**: `NaverBlogEditor`에 `formatForBlog()` + `splitIntoParagraphs()` 메서드 추가.
- 2~3문장 단위로 빈 줄 삽입하여 문단 분리
- 이미 문단 구분이 3개 이상이면 그대로 유지
- 리스트/번호 항목, 짧은 줄(소제목)은 보존
- `writeContent()`, `writeContentFast()`, `writeContentAppend()` 모두에 자동 적용

### 2. Windows "열기" 파일 다이얼로그 수정 (`closeNativeFileDialogs`)

**문제**: 이미지 업로드 시 Windows 파일 선택 다이얼로그(`#32770`)가 포스팅 완료 후에도 남아있음.

**근본 원인 3가지**:
1. `FindWindow("#32770", "열기")` — 타이틀 인코딩 차이로 매칭 실패
2. PowerShell scriptblock을 C# delegate로 전달 불가 (EnumWindows 콜백)
3. **핵심**: `spawnSync('powershell', ...)` → ENOENT (Node.js PATH에 powershell 없음)

**최종 해결**:
- C# 코드 내부에서 `EnumWindows` + `GetClassName` + `PostMessage(WM_CLOSE)` 완전 처리
- PowerShell 전체 경로 사용: `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`
- 호출 위치 6곳: 이미지 업로드 루프, publish(), createPost(), createInterleavedPost()
- `page.on('dialog')` 핸들러로 beforeunload 자동 수락 추가
- 검증 결과: `Remaining #32770 dialogs: 0`

### 3. CDP 기반 E2E 테스트 (`tests/format-test.spec.ts`)

- ChatGPT 이미지 3개 생성 → 인터리브 블로그 포스팅 전체 파이프라인 테스트
- `playwright.config.ts`에 `cdp-test` 프로젝트 추가
- 실행: `npx playwright test tests/format-test.spec.ts --project=cdp-test --headed`
- 테스트 시간: ~1.9분, 비공개 발행으로 실행

### 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/blog-editor.ts` | formatForBlog(), closeNativeFileDialogs() 재작성, cleanup(), dialog 핸들러 |
| `tests/format-test.spec.ts` | CDP E2E 테스트 신규 추가 |
| `playwright.config.ts` | cdp-test 프로젝트 추가 |
| `CLAUDE.md` | Playwright CLI 테스트 가이드 섹션 추가 |

---

## 이전 작업: Claude AI 프로바이더 구현

### 작업 개요
네이버 블로그 자동 포스팅 GUI에 Claude AI를 콘텐츠 생성 프로바이더로 추가.
ChatGPT/Gemini와 동일한 인터페이스로 claude.ai 웹 자동화를 통해 블로그 글을 생성.

## 핵심 문제 및 해결

### 문제: getLastResponseText()가 유저 프롬프트를 반환
- Claude.ai DOM에는 ChatGPT의 `[data-message-author-role="assistant"]` 같은 명확한 역할 마커가 없음
- `.font-claude-response`, `[data-is-streaming]` 셀렉터가 유저 프롬프트와 혼동되거나, thinking 텍스트가 포함됨
- 결과: 블로그 본문에 프롬프트 템플릿 텍스트("구분자를 반드시 지켜줘" 등)가 삽입됨

### 해결: 스트리밍 캡처 + 다단계 폴백 전략으로 전면 재작성

#### 1차 전략: 스트리밍 중 실시간 캡처 (Primary)
- `waitForTextResponse()`에서 `[data-is-streaming="true"]` 감지 시 텍스트를 `capturedResponseText`에 저장
- 이 시점에서 해당 요소는 확실히 어시스턴트의 응답 (유저 메시지에는 이 속성이 없음)
- 스트리밍 완료: `data-is-streaming="false"` 전환 또는 스트리밍 요소 사라짐 감지

#### 2차 전략: DOM 직접 추출 (Fallback)
- `extractFromDOM()`: `[data-is-streaming]` 중 `[data-testid="user-message"]` 내부가 아닌 것
- `.font-claude-response` 셀렉터 시도
- user-message 다음 형제 요소에서 어시스턴트 응답 탐색

#### 3차 전략: Copy 버튼 + 클립보드 (Last Resort)
- `extractViaCopyButton()`: 마지막 Copy 버튼 클릭 → `navigator.clipboard.readText()`

#### 4차 전략: Brute Force 탐색
- `bruteForceExtract()`: 페이지 모든 요소 중 `---TITLE---` + `---SECTION1---` 포함하면서 프롬프트 텍스트 미포함인 것 탐색
- `---TITLE---`가 2회 이상 나오면 마지막 것부터 추출 (유저 프롬프트 + 응답 합쳐진 경우)

#### 텍스트 정리: cleanResponseText()
- `---TITLE---` 이전의 모든 텍스트 제거 (thinking/reasoning 텍스트)
- 프롬프트 템플릿 감지 시 bruteForce 재추출

## 검증 완료된 DOM 구조 (2026-02, Chrome 145)

```
[data-is-streaming="false"]  ← 스트리밍 컨테이너 (전체 응답)
  └ div.font-claude-response  ← 응답 래퍼
    └ div.grid.grid-rows
      └ div.row-start-2
        └ div.row-start-1
          └ div (unnamed)
            └ div.standard-markdown  ← 마크다운 콘텐츠
              └ p.font-claude-response-body  ← 개별 단락
```

- `[data-is-streaming]`은 `[data-testid="user-message"]` 외부에 위치 (확인됨)
- thinking 텍스트는 `<details>` 태그가 아닌 일반 텍스트로 포함됨
- `---TITLE---` 인덱스 274 → 앞 274자가 thinking, 이후가 실제 블로그 콘텐츠

## 수정된 파일

### src/claude-generator.ts (664줄, 전면 재작성)
- `ClaudeGenerator` 클래스
- `capturedResponseText` 인스턴스 변수: 스트리밍 중 캡처된 텍스트 저장
- `navigateToClaude()`: claude.ai/new 이동 + 로그인 확인
- `checkLoginStatus()`: 로그인 버튼/입력란 셀렉터로 판단
- `startNewChat()`: 새 대화 페이지 이동
- `sendPrompt()`: ProseMirror 입력란에 클립보드 붙여넣기 + 전송 버튼 클릭
- `waitForTextResponse()`: 스트리밍 감지 → 텍스트 캡처 → 완료 대기
- `getLastResponseText()`: 3단계 폴백 (캡처 → DOM → Copy)
- `extractFromDOM()`: DOM 직접 탐색
- `extractViaCopyButton()`: 클립보드 폴백
- `cleanResponseText()`: thinking 제거, ---TITLE--- 기준 트리밍
- `generateBlogContent()`: 프롬프트 전송 → 응답 대기 → 파싱 + 프롬프트 감지
- `bruteForceExtract()`: 전체 DOM 탐색 최후 수단
- `parseBlogContent()`: 구분자 기반 파싱 (중복 마커 처리, 템플릿 지시문 필터)
- `saveDebugScreenshot()`: 오류 시 자동 스크린샷

### src/server.ts (기존 수정)
- `ClaudeGenerator` import 추가
- `/api/generate-content` 엔드포인트에서 provider=claude 분기
- `/api/post-blog` 엔드포인트에서 ClaudeGenerator 인스턴스 생성

### public/index.html (기존 수정)
- Claude 프로바이더 선택 버튼 (`🟠 Claude`) 추가
- provider 설명 텍스트에 Claude 옵션 추가

## 디버그 스크립트 (검증용, 삭제 가능)

- `scripts/debug-claude-dom.ts`: Claude.ai 셀렉터 전체 스캔 (data-* 속성, 턴 구조 분석)
- `scripts/debug-claude-dom2.ts`: [data-is-streaming] 내부 구조 상세 분석
- `scripts/verify-selectors.ts`: 코드의 셀렉터 전략 실시간 검증

## 테스트 방법

1. Chrome 디버그 프로필에서 claude.ai 로그인 (최초 1회)
   ```bash
   npm run chrome:setup  # 또는 npm run chrome:debug
   # Chrome에서 claude.ai 수동 로그인
   ```

2. GUI 서버 실행
   ```bash
   npm run gui  # http://localhost:3000
   ```

3. 테스트 진행
   - http://localhost:3000 접속
   - `🟠 Claude` 버튼 선택
   - 주제 입력 (예: "삼겹살 구이")
   - "글 자동 생성" 클릭
   - 응답 완료 후 블로그 미리보기 확인

## 알려진 제한사항

- Claude는 이미지 생성 불가 → "전체 자동화" (post:full) 시 ChatGPT로 이미지 자동 폴백
- Extended thinking 텍스트가 `<details>` 태그가 아닌 일반 텍스트로 포함될 수 있음 → `cleanResponseText()`의 `---TITLE---` 트리밍으로 해결
- claude.ai DOM 구조가 업데이트 변경될 수 있음 → 셀렉터 검증 스크립트로 재확인 가능
