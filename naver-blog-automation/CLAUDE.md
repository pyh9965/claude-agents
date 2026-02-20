# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

Playwright 브라우저 자동화 기반 네이버 블로그 자동 포스팅 도구. ChatGPT/Gemini 웹 UI를 통한 콘텐츠 생성, DALL-E/Gemini를 통한 이미지 생성, 네이버 블로그 SmartEditor ONE을 통한 포스팅까지 전체 워크플로우를 자동화합니다.

## 명령어

```bash
# 설치
npm install && npx playwright install chromium

# 최초 설정: Chrome 디버그 프로필 생성 후 네이버 + ChatGPT 수동 로그인
npm run chrome:setup

# 블로그 포스팅 (CDP 모드 - 권장)
npm run post:cdp          # Chrome 디버그 프로필의 저장된 쿠키 사용
npm run post:full         # ChatGPT 이미지 생성 + 인터리브 블로그 포스팅

# 블로그 포스팅 (Playwright 테스트 모드 - 레거시)
npm run login             # playwright/.auth/naver.json에 세션 저장 (headed)
npm run post              # Playwright 테스트로 포스팅 (headed)
npm run post:headless     # Playwright 테스트로 포스팅 (headless)

# 이미지 생성
npm run chatgpt:image                        # 기본 프롬프트
npm run chatgpt:image -- "커스텀 프롬프트"      # 커스텀 프롬프트

# GUI 대시보드
npm run gui               # Express 서버 http://localhost:3000

# 디버그 유틸리티
npm run debug             # Playwright Inspector
npm run codegen           # Playwright codegen으로 셀렉터 탐색
npm run chrome:debug      # CDP 포트 9222로 Chrome 실행
```

## 아키텍처

### 두 가지 포스팅 모드

1. **CDP 모드** (주력): Chrome DevTools Protocol로 실제 Chrome 인스턴스에 연결 (포트 9222). `~/.chrome-debug-profile` 전용 디버그 프로필에 로그인 쿠키를 유지. 권장 모드 (`npm run post:cdp`, `npm run post:full`).

2. **Playwright 테스트 모드** (레거시): Playwright 테스트 러너 사용, `playwright/.auth/naver.json`에 세션 저장. `auth.setup` 프로젝트가 먼저 실행되고 `blog-post`가 의존.

### 핵심 모듈 (`src/`)

- **`blog-editor.ts`** - `NaverBlogEditor` 클래스: SmartEditor ONE 조작. 제목/본문/태그/이미지/발행 처리. `BlogPostData`(이미지 일괄 삽입)와 `InterleavedPostData`(본문 사이에 이미지 교차 배치) 두 가지 포맷 지원. 모든 에디터 조작은 `loc()`/`getByRole()`/`getByText()`를 통해 iframe과 직접 페이지 모드를 자동 분기.
- **`chrome-cdp.ts`** - `ChromeCDP` 클래스: `--remote-debugging-port`로 Chrome 실행, Playwright `connectOverCDP()`로 CDP 연결, 프로필 생명주기 관리.
- **`chatgpt-image.ts`** - `ChatGPTImageGenerator`: chatgpt.com 자동화로 이미지 생성 및 블로그 글 생성. 이미지 다운로드는 4단계 폴백 (다운로드 버튼 -> fetch -> canvas -> 스크린샷).
- **`gemini-generator.ts`** - `GeminiGenerator`: ChatGPTImageGenerator와 동일한 인터페이스로 gemini.google.com 자동화.
- **`human-like.ts`** - 봇 감지 우회: 랜덤 딜레이, 사람처럼 타이핑, 스텔스 스크립트 (webdriver 숨김, plugins 위장, permissions 오버라이드).
- **`server.ts`** - Express GUI 서버 (SSE로 실시간 진행 상황 전달). REST API: `/api/generate-content`, `/api/generate-images`, `/api/post-blog`, `/api/post-full`.

### 스크립트 (`scripts/`)

- `setup-chrome.ts` - Chrome 디버그 프로필 대화형 설정 (네이버 + ChatGPT 로그인)
- `post-cdp.ts` - 단독 CDP 포스팅 스크립트 (`postData` 객체 직접 편집)
- `post-with-image.ts` - 전체 파이프라인: ChatGPT 이미지 생성 + 인터리브 블로그 포스팅
- `generate-image.ts` - 단독 ChatGPT 이미지 생성
- `launch-chrome.ts` - 디버그 포트로 Chrome 실행
- `generate-report.mjs` - `docx` 라이브러리를 사용한 Word 문서 레포트 생성기

## 핵심 플랫폼 주의사항

### Chrome 136+ CDP 제한
Chrome이 기본 User Data 디렉토리에서 `--remote-debugging-port` 사용을 차단함. 반드시 별도 프로필 디렉토리(`~/.chrome-debug-profile`) 사용 필요. 기본 프로필로의 심볼릭 링크/정션은 동작하지 않음 (DPAPI 암호화 키가 경로에 종속되어 `os_crypt: Failed to decrypt` 오류 발생).

### SmartEditor ONE 에디터
- 에디터가 `iframe#mainFrame` 내부 또는 직접 페이지에 로드될 수 있음. `NaverBlogEditor`의 모든 로케이터 메서드는 `useIframe` 플래그로 두 모드를 자동 분기.
- "발행" 버튼이 여러 개 존재 (보통 4개). 첫 번째는 발행 패널 열기, **마지막 버튼이 최종 발행 확인**. 반드시 `.nth(count - 1)` 사용.
- 공개/비공개 라디오 버튼: `<input>`이 아닌 `<label>`을 클릭해야 함 (input이 label에 의해 가려짐).
- 태그 입력란은 에디터 본문이 아닌 발행 패널 내부에 위치.
- "작성 중인 글이 있습니다" 임시저장 복구 다이얼로그는 편집 전에 닫아야 함.

### Windows/Git Bash 호환성
- npm PATH 문제: `export PATH="$PATH:/c/Program Files/nodejs"`
- taskkill: `/c/Windows/System32/taskkill.exe //F //IM chrome.exe //T` (더블 슬래시 플래그)
- `timeout` 명령어 대신 `sleep` 사용 (Git Bash에서 timeout 미지원)

## 환경 변수 (.env)

```
NAVER_ID=네이버_로그인_아이디
NAVER_PW=네이버_비밀번호
BLOG_ID=블로그_아이디          # 로그인 ID와 다를 수 있음
```

현재 사용자: BLOG_ID는 `recensione`, NAVER_ID는 `pyh9965` (서로 다름).

## Playwright CLI 테스트 가이드

새로운 기능을 추가하면 반드시 Playwright CLI로 E2E 테스트를 작성하고 실행하여 검증해야 합니다.

### 테스트 구조

```
playwright.config.ts          # 프로젝트 설정 (auth-setup, blog-post, cdp-test)
tests/
  auth.setup.ts               # 네이버 로그인 세션 저장 (레거시)
  blog-post.spec.ts           # 기본 포스팅 테스트 (레거시, auth 의존)
  format-test.spec.ts         # CDP 기반 전체 파이프라인 테스트 (이미지+포스팅)
  [새기능].spec.ts             # 새 기능 테스트는 여기에 추가
```

### 테스트 실행 방법

```bash
# 사전 조건: Chrome 디버그 모드 실행 (CDP 포트 9222)
npm run chrome:debug

# CDP 기반 테스트 실행 (권장)
npx playwright test tests/파일명.spec.ts --project=cdp-test --headed

# 전체 CDP 테스트 실행
npx playwright test --project=cdp-test --headed

# 레거시 테스트 (auth-setup 필요)
npm run login                                      # 먼저 로그인
npx playwright test --project=blog-post --headed    # 포스팅 테스트

# 테스트 결과 확인
npx playwright show-report                          # HTML 리포트
npx playwright show-trace test-results/.../trace.zip  # 실패 시 트레이스
```

### CDP 테스트 작성 패턴

새 기능을 테스트할 때는 `cdp-test` 프로젝트를 사용. Playwright가 관리하는 브라우저 대신 기존 Chrome CDP에 직접 연결하는 패턴:

```typescript
import { test, chromium } from '@playwright/test';

test.setTimeout(300_000); // 이미지 생성 포함 시 5분

test('기능 테스트', async () => {
  // CDP로 기존 Chrome에 연결 (포트 9222)
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0] || await context.newPage();

  try {
    // ... 테스트 로직 ...
  } finally {
    // browser.close() 호출하지 않음! Chrome 유지
  }
});
```

### 테스트 필수 검증 항목

새 기능 추가 시 아래 항목을 반드시 E2E 테스트로 검증:

1. **이미지 생성**: ChatGPT DALL-E로 이미지가 실제 생성되고 `output/` 디렉토리에 저장되는지 (10KB 이상)
2. **에디터 동작**: SmartEditor ONE에서 제목, 본문, 이미지 삽입이 정상 동작하는지
3. **인터리브 배치**: 본문 → 이미지 → 본문 → 이미지 교차 배치가 제대로 되는지
4. **포맷팅**: `formatForBlog()`에 의해 긴 텍스트가 2~3문장 단위로 문단 분리되는지
5. **발행**: 비공개(`isPublic: false`)로 발행 후 `PostView.naver` URL로 리다이렉트되는지
6. **스크린샷**: 각 단계별 스크린샷을 `test-results/`에 저장하여 시각적 확인

### 테스트 실패 시 디버깅

```bash
# Playwright Inspector로 단계별 실행
npx playwright test tests/파일명.spec.ts --project=cdp-test --debug

# 실패한 테스트의 trace 확인
npx playwright show-trace test-results/테스트폴더/trace.zip

# 셀렉터 탐색 (codegen)
npx playwright codegen https://blog.naver.com

# 수동 CDP 연결 디버그
npx tsx scripts/debug-artifact.ts
```

### playwright.config.ts 프로젝트 구성

| 프로젝트 | testMatch | 용도 |
|----------|-----------|------|
| `auth-setup` | `auth.setup.ts` | 네이버 로그인 세션 저장 (레거시) |
| `blog-post` | `blog-post.spec.ts` | 레거시 포스팅 (auth 의존) |
| `cdp-test` | `*.spec.ts` (위 2개 제외) | CDP 기반 테스트 (권장) |

새 테스트 파일은 `tests/기능명.spec.ts`로 생성하면 자동으로 `cdp-test` 프로젝트에 포함됨.

## 콘텐츠 생성 프로토콜

`ChatGPTImageGenerator.generateBlogContent()`과 `GeminiGenerator.generateBlogContent()` 모두 동일한 구조화된 프롬프트 형식을 사용. `---TITLE---`, `---SECTION1---`~`---SECTION4---`, `---IMAGE1---`~`---IMAGE3---`, `---TAGS---` 구분자로 응답을 구분하고, `parseBlogContent()` 메서드가 이를 `BlogContent` 객체로 파싱. 파싱 실패 시 전체 응답 텍스트를 단일 섹션으로 처리 (폴백).
