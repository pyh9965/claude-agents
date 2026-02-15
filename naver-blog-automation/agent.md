# Naver Blog Automation - AI Agent Reference Document

> **목적**: AI 에이전트가 이 프로젝트를 이어받아 즉시 작업할 수 있도록 모든 컨텍스트를 담은 레퍼런스 문서
> **최종 업데이트**: 2026-02-15
> **최종 상태**: CDP 모드 자동 포스팅 성공 (logNo: 224184614916)

---

## 1. 프로젝트 개요

### 1.1 목적
Playwright를 사용하여 네이버 블로그에 자동으로 글을 작성하고 발행하는 자동화 도구.
네이버 SmartEditor ONE 기반의 블로그 에디터를 프로그래밍 방식으로 제어한다.

### 1.2 기술 스택
- **Runtime**: Node.js (Windows 11)
- **Test Framework**: Playwright Test (`@playwright/test ^1.49.0`)
- **Language**: TypeScript
- **Dependencies**: `dotenv ^16.4.0`, `playwright ^1.58.2`, `tsx ^4.21.0`
- **Browser**: Chrome (CDP 모드 - 전용 디버그 프로필)
- **CDP 모드**: Chrome DevTools Protocol을 통한 기존 브라우저 제어

### 1.3 프로젝트 경로
```
D:\ai_program\agent\naver-blog-automation\
```

### 1.4 계정 정보
- `.env` 파일에 저장 (gitignore됨)
- `NAVER_ID`: 네이버 아이디
- `NAVER_PW`: 네이버 비밀번호
- `BLOG_ID`: 블로그 아이디 (URL에서 사용되는 ID, 네이버 ID와 다를 수 있음)

---

## 2. 파일 구조 및 역할

```
naver-blog-automation/
├── .env                          # 네이버 로그인 정보 (NAVER_ID, NAVER_PW, BLOG_ID)
├── .env.example                  # .env 템플릿
├── .gitignore                    # node_modules, .auth, test-results, .env 제외
├── package.json                  # 프로젝트 설정 & npm 스크립트
├── playwright.config.ts          # Playwright 설정 (봇 감지 우회, 프로젝트 구성)
├── README.md                     # 사용법 문서
├── agent.md                      # ★ 이 파일 - AI 에이전트 레퍼런스
├── src/
│   ├── blog-editor.ts            # ★ 핵심: NaverBlogEditor 클래스 (에디터 조작)
│   ├── chrome-cdp.ts             # ★ CDP 연결 관리자 (전용 디버그 프로필)
│   └── human-like.ts             # 봇 감지 우회 유틸리티 (딜레이, 스텔스)
├── scripts/
│   ├── setup-chrome.ts           # ★ 초기 설정: 디버그 프로필 생성 + 수동 로그인
│   ├── post-cdp.ts               # ★ CDP 모드 자동 포스팅
│   └── launch-chrome.ts          # Chrome 디버깅 모드 실행 유틸리티
├── tests/
│   ├── auth.setup.ts             # 네이버 로그인 & 세션 저장 (레거시)
│   └── blog-post.spec.ts         # 블로그 포스팅 테스트 (레거시)
├── playwright/
│   └── .auth/
│       └── naver.json            # 저장된 로그인 세션 (gitignore)
├── test-results/                 # 스크린샷, 트레이스 (gitignore)
└── playwright-report/            # 테스트 리포트 (gitignore)
```

---

## 3. 실행 방법

### 3.1 CDP 모드 실행 (권장)

```bash
# 1. 최초 1회: 디버그 프로필 생성 + 네이버 수동 로그인
npm run chrome:setup

# 2. 자동 포스팅 (이후 반복 실행 가능)
npm run post:cdp
```

### 3.2 Windows 환경 주의사항

**npm PATH 문제**: Windows Git Bash에서 npm이 PATH에 없을 수 있음.
```bash
# npm이 안 찾아지면 PATH에 추가
export PATH="$PATH:/c/Program Files/nodejs"

# 또는 절대경로로 실행
"/c/Program Files/nodejs/npx" playwright test ...
```

**PowerShell/CMD에서는 보통 문제없음.**

### 3.2 npm 스크립트

```bash
# 1단계: 로그인 (최초 1회, 세션 만료 시 재실행)
npm run login
# → npx playwright test tests/auth.setup.ts --headed

# 2단계: 포스팅 (headed)
npm run post
# → npx playwright test tests/blog-post.spec.ts --headed

# 2단계: 포스팅 (headless - 주의: 네이버가 차단할 수 있음)
npm run post:headless

# 디버그 모드 (Playwright Inspector)
npm run debug

# codegen (에디터 셀렉터 탐색)
npm run codegen
```

### 3.3 실행 순서
1. `npm install` (최초)
2. `npx playwright install chromium` (최초)
3. `.env` 파일에 계정 정보 설정
4. `npm run login` → 로그인 세션 생성 (캡차/기기등록은 수동)
5. `npm run post` → 블로그 글 작성 & 발행

### 3.4 Playwright 설정 핵심 (playwright.config.ts)

```typescript
{
  channel: 'chrome',        // 실제 Chrome 사용 (Chromium 아님)
  headless: false,          // 브라우저 표시 (네이버 봇 감지 대응)
  viewport: { width: 1400, height: 900 },
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  timeout: 120_000,         // 2분 타임아웃 (네이버 로딩 느림)
  workers: 1,               // 단일 워커 (세션 충돌 방지)
  launchOptions: {
    args: [
      '--disable-blink-features=AutomationControlled',  // 자동화 감지 비활성화
      '--disable-infobars',
      '--no-sandbox',
    ],
    slowMo: 50,             // 50ms 슬로우 모션
  },
}
```

**프로젝트 구성:**
- `auth-setup`: 로그인 전용 (auth.setup.ts)
- `blog-post`: 포스팅 전용 (blog-post.spec.ts), auth-setup에 의존

---

## 4. 핵심 아키텍처: NaverBlogEditor 클래스

### 4.1 클래스 구조

```typescript
export class NaverBlogEditor {
  readonly page: Page;
  readonly blogId: string;
  private frame!: FrameLocator;   // iframe#mainFrame
  private useIframe = true;        // iframe/직접 페이지 분기 플래그
}
```

### 4.2 iframe 구조 (매우 중요)

네이버 블로그 에디터는 `iframe#mainFrame` 내부에 로드됨.
모든 에디터 요소 (제목, 본문, 발행 버튼 등)는 이 iframe 안에 있음.

```
page (최상위)
└── iframe#mainFrame (에디터 전체)
    ├── .se-title-text (제목 영역)
    ├── .se-component.se-text (본문 영역)
    ├── button[name="발행"] (상단 발행 토글 버튼)
    └── 발행 패널 (사이드 패널)
        ├── 카테고리 선택
        ├── 공개 설정 라디오
        ├── 태그 입력
        └── button "발행" (최종 확인 버튼)
```

### 4.3 loc() / getByRole() / getByText() 헬퍼

iframe/직접 페이지 자동 분기를 위한 헬퍼 메서드:

```typescript
private loc(selector: string): Locator {
  return this.useIframe
    ? this.frame.locator(selector)
    : this.page.locator(selector);
}

private getByRole(role, options?): Locator {
  return this.useIframe
    ? this.frame.getByRole(role, options)
    : this.page.getByRole(role, options);
}

private getByText(text: string | RegExp): Locator {
  return this.useIframe
    ? this.frame.getByText(text)
    : this.page.getByText(text);
}
```

**규칙**: 에디터 요소에 접근할 때는 항상 `this.loc()`, `this.getByRole()`, `this.getByText()`를 사용할 것. `this.page.locator()`를 직접 사용하면 iframe 내부 요소를 찾지 못함.

### 4.4 에디터 감지 프로세스 (waitForEditor)

```
1. iframe 방식 시도 (iframe#mainFrame → "발행" 버튼 대기)
   → 성공: useIframe = true
   → 실패: ↓

2. 직접 페이지 방식 시도 (page에서 "발행" 버튼 대기)
   → 성공: useIframe = false
   → 실패: ↓

3. 대체 URL 시도 (GoBlogWrite.naver?blogId=...)
   → iframe/직접 다시 시도

4. 모든 팝업/다이얼로그 자동 처리
```

### 4.5 전체 포스팅 플로우 (createPost)

```
navigateToEditor()
  ├── page.goto('blog.naver.com/{blogId}/postwrite')
  ├── waitForEditor()
  │   ├── iframe 감지
  │   └── dismissAllPopups()
  │       ├── dismissDraftDialog()    "작성 중인 글이 있습니다" → "취소"
  │       └── dismissEventPopup()     이벤트/프로모션 팝업 X 버튼
  └── 에디터 준비 완료

writeTitle(title)
  ├── .se-title-text 클릭
  ├── Ctrl+A → Backspace (기존 내용 삭제)
  └── humanTypeToLocator() (한 글자씩 입력)

writeContentFast(content)  // 500자 이상
  ├── .se-component.se-text 클릭
  ├── navigator.clipboard.writeText(content)
  └── Ctrl+V (붙여넣기)

writeContent(content)      // 500자 미만
  ├── .se-component.se-text 클릭
  └── 줄 단위로 humanTypeToLocator() + Enter

uploadImages(imagePaths)   // 선택
  ├── "사진" 버튼 클릭
  ├── "내 PC" 버튼 클릭
  ├── fileChooser.setFiles(path)
  └── "등록/삽입" 버튼 클릭

publish(isPublic, tags, category)
  ├── "발행" 버튼 클릭 (상단 → 패널 열기)
  ├── addTagsInPanel(tags)
  ├── selectCategory(category)
  ├── 공개/비공개 라디오 설정 (label 클릭)
  └── 최종 "발행" 확인 버튼 클릭 (마지막 버튼)
```

---

## 5. 발행 패널 DOM 구조 (매우 중요)

### 5.1 발행 패널 레이아웃

발행 버튼을 클릭하면 우측에 사이드 패널이 열림.
패널 내부 구조:

```
[발행 패널]
├── 카테고리: 드롭다운 (기본값: "공연 맡겨요" 등)
├── 주제: 상품리뷰 등
├── 공개 설정:
│   ├── ○ 전체공개    (label[for="open_public"])
│   ├── ○ 이웃공개
│   ├── ○ 서로이웃공개
│   └── ○ 비공개     (label[for="open_private"])
├── 발행 설정:
│   ├── ☑ 댓글허용
│   ├── ☑ 공감허용
│   ├── ☑ 검색허용
│   ├── ☑ 블로그/카페 공유 링크 허용
│   └── ☑ 외부 공유 허용
├── 태그 편집:
│   └── input (placeholder: "#태그 입력 (최대 30개)")
├── 발행 시간:
│   ├── ● 현재
│   └── ○ 예약
├── □ 공지사항으로 등록
└── [✓ 발행] ← 최종 확인 버튼 (패널 하단 우측)
```

### 5.2 "발행" 버튼 문제 (가장 중요한 버그 수정 내역)

**문제**: 페이지에 "발행" 텍스트를 가진 버튼이 **4개** 존재.

| 순서 | 위치 | 역할 |
|------|------|------|
| 1번째 | 에디터 상단 | 발행 패널 토글 (열기/닫기) |
| 2~3번째 | 패널 내부 | 발행 설정 관련 |
| **4번째 (마지막)** | **패널 하단 우측** | **★ 실제 발행 확인 버튼** |

**해결 코드**:
```typescript
const allPublishBtns = this.loc('button:has-text("발행")');
const count = await allPublishBtns.count();
// 마지막 버튼이 실제 확인 버튼
await allPublishBtns.nth(count - 1).click();
```

**절대로** `.first()`를 사용하면 안됨! 첫 번째 버튼은 패널을 토글하는 버튼이지 실제 발행 버튼이 아님.

### 5.3 라디오 버튼 클릭 (공개/비공개)

**문제**: `<input type="radio">` 요소가 `<label>` 요소에 의해 가려져서 직접 클릭 불가.

**해결**: `<label>` 요소를 직접 클릭
```typescript
// 공개 설정
await this.loc('label[for="open_public"]').click();

// 비공개 설정
await this.loc('label[for="open_private"]').click();
```

**절대로** `input[type="radio"]`를 직접 클릭하면 안됨! "element is not visible" 또는 "element is intercepted by label" 에러 발생.

### 5.4 태그 입력

발행 패널 내 태그 입력란:
- Placeholder: `#태그 입력 (최대 30개)`
- **현재 상태**: 셀렉터 `input[placeholder*="태그"]`가 매치 안 될 수 있음
- **원인 추정**: placeholder에 `#` 문자가 포함되어 있어 셀렉터 매칭 실패 가능
- **현재 동작**: 태그 입력 실패 시 graceful skip (에러 없이 건너뜀)

**개선 필요**: placeholder가 `#태그 입력`인지 확인하고 셀렉터를 정확히 매칭해야 함.
시도해볼 셀렉터:
```typescript
input[placeholder*="#태그"]
input[placeholder*="최대 30개"]
.tag input
[class*="tag"] input[type="text"]
```

---

## 6. 로그인 & 인증 (auth.setup.ts)

### 6.1 로그인 플로우

```
1. applyStealthScripts() → 봇 감지 우회
2. nid.naver.com/nidlogin.login 이동
3. #id, #pw에 값 입력 (evaluate로 직접 설정, 키보드 보안 우회)
4. .btn_login 클릭
5. 중간 페이지 대기:
   ├── www.naver.com (성공)
   ├── deviceConfirm (기기 등록)
   └── 캡차/추가 인증 (수동 대기 2분)
6. 기기 등록 페이지 처리 → "등록" 버튼 클릭
7. 로그인 상태 확인 (naver.com에서 로그인 요소 체크)
8. storageState 저장 → playwright/.auth/naver.json
```

### 6.2 기기 등록 페이지 (deviceConfirm) - 매번 뜸

```
URL: nid.naver.com/login/ext/deviceConfirm
→ "등록" 버튼 자동 클릭
→ 리다이렉트 대기 (www.naver.com 또는 blog.naver.com)
```

**코드**:
```typescript
if (page.url().includes('deviceConfirm')) {
  const registerBtn = page.locator('button:has-text("등록"), a:has-text("등록")').first();
  await registerBtn.click();
}
```

### 6.3 아이디/비밀번호 입력 방식

네이버는 키보드 보안을 사용하므로 일반 `type()`이 작동하지 않음.
`page.evaluate()`로 DOM에 직접 값을 설정:

```typescript
await page.evaluate((id) => {
  const el = document.querySelector('#id') as HTMLInputElement;
  if (el) {
    el.focus();
    el.value = id;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
}, naverId);
```

### 6.4 세션 재사용

- 로그인 성공 시 `playwright/.auth/naver.json`에 쿠키/스토리지 저장
- 포스팅 테스트 시 `storageState`로 세션 로드 → 재로그인 불필요
- 세션 만료 시 `npm run login` 재실행

---

## 7. 봇 감지 우회 (human-like.ts)

### 7.1 스텔스 스크립트 (applyStealthScripts)

```typescript
// navigator.webdriver 숨기기 (핵심)
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// chrome.runtime 추가 (일반 Chrome처럼)
window.chrome = { runtime: {} };

// plugins 배열 추가
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

// 한국어 언어 설정
Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });

// permissions query override
```

### 7.2 딜레이 함수

| 함수 | 범위 | 용도 |
|------|------|------|
| `humanDelay(min, max)` | 기본 500~1500ms | 일반 동작 사이 |
| `typingDelay()` | 30~120ms | 타이핑 사이 |
| `pageLoadDelay()` | 1500~3000ms | 페이지 전환 후 |
| `humanScroll(page)` | 100~400px | 스크롤 동작 |
| `humanMouseMove(page)` | 랜덤 좌표 | 마우스 이동 |

### 7.3 텍스트 입력

```typescript
// humanTypeToLocator: 한 글자씩 30~150ms 랜덤 딜레이로 입력
for (const char of text) {
  await page.keyboard.type(char, { delay: randomInt(30, 150) });
}
```

### 7.4 Playwright 설정 기반 우회

```
--disable-blink-features=AutomationControlled  // Chrome 자동화 감지 비활성화
--disable-infobars                              // "자동화된 소프트웨어" 바 숨기기
channel: 'chrome'                               // 실제 Chrome 사용 (Chromium 아님)
slowMo: 50                                      // 50ms 슬로우 모션
```

---

## 8. 팝업/다이얼로그 처리

### 8.1 "작성 중인 글이 있습니다" 다이얼로그

**트리거**: 이전에 임시저장된 글이 있을 때 에디터 진입 시 자동 표시
**텍스트**: "작성 중인 글이 있습니다"
**처리**: "취소" 버튼 클릭 (새 글 작성)

```typescript
const draftText = this.getByText('작성 중인 글이 있습니다');
if (await draftText.isVisible({ timeout: 3_000 })) {
  const cancelBtn = this.getByRole('button', { name: '취소' });
  await cancelBtn.click();
}
```

### 8.2 이벤트/프로모션 팝업

**트리거**: 네이버 이벤트/프로모션 시 랜덤 표시
**처리**: X 닫기 버튼 클릭 (여러 셀렉터 순차 시도)

```
시도 셀렉터 목록:
1. button[class*="close"]
2. button[class*="Close"]
3. a[class*="close"]
4. button[aria-label*="닫기"]
5. [class*="popup"] button
6. [class*="layer_popup"] button
7. [class*="modal"] button[class*="close"]
8. .btn_close
9. button:near(:text("7일동안 보지 않기"))
```

### 8.3 블로그 메인 페이지 팝업

**트리거**: 블로그 메인 페이지 방문 시
**처리**: `dismissBlogPagePopups()` (public 메서드)
- 메인 페이지 팝업 + iframe 내부 팝업 모두 처리

---

## 9. 해결된 버그 목록 (시간순)

### 9.1 npm PATH 문제 (Windows)
- **증상**: `npm: command not found`
- **원인**: Git Bash에서 `/c/Program Files/nodejs`가 PATH에 없음
- **해결**: `export PATH="$PATH:/c/Program Files/nodejs"` 추가

### 9.2 에디터 감지 실패
- **증상**: `.se-main-container` 셀렉터가 DOM에서 매치 안됨
- **원인**: 에디터가 iframe#mainFrame 내부에 있음
- **해결**: iframe 감지 로직 추가, `getByRole('button', { name: '발행' })` 대기로 변경

### 9.3 임시저장 복구 다이얼로그
- **증상**: "작성 중인 글이 있습니다" 다이얼로그가 에디터 진입 차단
- **해결**: `dismissDraftDialog()` 추가 → "취소" 클릭

### 9.4 이벤트/프로모션 팝업
- **증상**: 팝업이 에디터 요소 가림
- **해결**: `dismissEventPopup()` 추가 → 여러 셀렉터 순차 시도

### 9.5 기기 등록 페이지 (deviceConfirm)
- **증상**: 로그인 후 매번 기기 등록 페이지로 리다이렉트
- **URL**: `nid.naver.com/login/ext/deviceConfirm`
- **해결**: URL 감지 후 "등록" 버튼 자동 클릭

### 9.6 태그 입력 위치 오류
- **증상**: 에디터 본문 영역에서 태그 입력란을 찾지 못함
- **원인**: 네이버 에디터의 태그 입력은 발행 패널 안에 있음
- **해결**: `addTags()` (에디터) + `addTagsInPanel()` (발행 패널) 이중 구조

### 9.7 라디오 버튼 클릭 불가
- **증상**: `input[type="radio"]#open_private` 클릭 시 "element is intercepted by label" 에러
- **원인**: `<label for="open_private">` 요소가 radio input을 덮고 있음
- **해결**: `label[for="open_public"]` / `label[for="open_private"]` 직접 클릭

### 9.8 ★ 발행 확인 버튼 잘못 클릭 (가장 치명적이었던 버그)
- **증상**: 테스트 통과하지만 실제로 글이 발행되지 않음
- **원인**: `button:has-text("발행").first()`가 상단 토글 버튼 클릭 (패널만 열고 닫음)
- **상세**: 페이지에 "발행" 텍스트 버튼이 4개 존재. 첫 번째는 패널 토글, 마지막이 확인 버튼
- **해결**: 모든 "발행" 버튼을 카운트하고 `.nth(count - 1)` (마지막 버튼) 클릭
- **검증**: URL이 `PostView.naver`로 변경되면 발행 성공, `postwrite`/`GoBlogWrite`이면 실패

### 9.9 공개/비공개 설정
- **증상**: 비공개로 발행됨
- **원인**: `isPublic` 값이 `false`로 설정되어 있었음
- **해결**: `isPublic: true`로 변경, `label[for="open_public"]` 클릭 추가

---

## 10. 포스팅 데이터 구조 (BlogPostData)

```typescript
export interface BlogPostData {
  title: string;            // 글 제목 (필수)
  content: string;          // 본문 내용 (필수, 줄바꿈은 \n)
  tags?: string[];          // 태그 배열 (선택, 최대 30개)
  category?: string;        // 카테고리명 (선택)
  images?: string[];        // 이미지 파일 경로 배열 (선택)
  isPublic?: boolean;       // 공개 여부 (기본: true)
  scheduledTime?: string;   // 예약 발행 시간 (선택, 미구현)
}
```

### 10.1 콘텐츠 입력 분기

| 조건 | 메서드 | 방식 |
|------|--------|------|
| content.length > 500 | `writeContentFast()` | 클립보드 복사 + Ctrl+V |
| content.length <= 500 | `writeContent()` | 한 글자씩 humanType |

**클립보드 입력**:
```typescript
await this.page.evaluate((text) => {
  navigator.clipboard.writeText(text);
}, content);
await this.page.keyboard.press('Control+V');
```

---

## 11. 테스트 구조 (blog-post.spec.ts)

### 11.1 포스팅 테스트

```typescript
test.describe('네이버 블로그 포스팅', () => {
  test('글 작성 및 발행', async ({ page }) => {
    // 1. 봇 감지 우회
    await applyStealthScripts(page);

    // 2. blogId 확인
    const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';

    // 3. NaverBlogEditor 인스턴스 생성
    const editor = new NaverBlogEditor(page, blogId);

    // 4. 포스팅 실행
    await editor.createPost(postData);

    // 5. 발행 확인
    await page.goto(`https://blog.naver.com/${blogId}`);
    // iframe#mainFrame 내에서 제목 검색
    const blogFrame = page.frameLocator('iframe#mainFrame');
    const postTitle = blogFrame.locator(`text=${postData.title}`)
      .or(blogFrame.getByText(postData.title))
      .or(page.locator(`text=${postData.title}`))
      .first();
    const titleFound = await postTitle.isVisible({ timeout: 15_000 });

    // 6. 스크린샷 저장
    await page.screenshot({ path: 'test-results/publish-verified.png', fullPage: true });
  });
});
```

### 11.2 임시저장 테스트

```typescript
test.describe('네이버 블로그 임시저장', () => {
  test('글 작성 후 임시저장', async ({ page }) => {
    // 에디터 이동 → 제목/본문 입력 → 태그 추가 → saveDraft()
  });
});
```

---

## 12. 디버깅 가이드

### 12.1 스크린샷 위치

| 파일 | 시점 | 용도 |
|------|------|------|
| `test-results/debug-publish-panel.png` | 발행 패널 열린 직후 | 패널 DOM 확인 |
| `test-results/debug-before-confirm.png` | 확인 버튼 클릭 전 | 공개 설정 확인 |
| `test-results/debug-after-publish.png` | 발행 실패 시 | 에디터 상태 확인 |
| `test-results/publish-verified.png` | 테스트 끝 | 최종 결과 확인 |

### 12.2 발행 성공/실패 판단

```
성공: URL이 PostView.naver?blogId=...&logNo=... 로 변경
실패: URL에 postwrite 또는 GoBlogWrite 포함
```

### 12.3 일반적인 문제 해결 순서

1. **세션 만료** → `npm run login` 재실행
2. **에디터 로딩 실패** → 타임아웃 증가 또는 대체 URL 시도
3. **팝업 차단** → dismissAllPopups() 셀렉터 추가
4. **발행 실패** → 스크린샷 확인 후 버튼 셀렉터 조정
5. **봇 감지** → slowMo 값 증가, humanDelay 범위 확대

### 12.4 Trace 모드 실행

```bash
npx playwright test tests/blog-post.spec.ts --headed --trace on
# 실패 후: npx playwright show-trace test-results/.../trace.zip
```

---

## 13. 네이버 에디터 셀렉터 매핑

### 13.1 에디터 본문 영역

| 요소 | 셀렉터 | 비고 |
|------|--------|------|
| 제목 | `.se-title-text .se-text-paragraph` | 클릭 후 keyboard.type() |
| 본문 | `.se-component.se-text .se-text-paragraph` | 클릭 후 keyboard.type() 또는 Ctrl+V |
| 본문 안내 | `text=글감과 함께 나의 일상을` | 빈 에디터 시 대체 셀렉터 |
| 이미지 버튼 | `button[data-name="image"]` 또는 role=button name=/사진/ | |
| 저장 버튼 | `button:has-text("임시저장")` 또는 role=button name=저장 | |

### 13.2 발행 패널

| 요소 | 셀렉터 | 비고 |
|------|--------|------|
| 패널 열기 | `button:has-text("발행")` `.first()` | 상단 버튼 (토글) |
| 카테고리 | role=button name=/카테고리/ | |
| 공개 설정 | `label[for="open_public"]` | ★ label 클릭 |
| 비공개 설정 | `label[for="open_private"]` | ★ label 클릭 |
| 태그 입력 | `input[placeholder*="태그"]` | 현재 매칭 안될 수 있음 |
| 최종 발행 | `button:has-text("발행")` `.nth(count-1)` | ★ 마지막 버튼 |

### 13.3 블로그 메인 페이지

| 요소 | 셀렉터 | 비고 |
|------|--------|------|
| 메인 iframe | `iframe#mainFrame` | 블로그 콘텐츠 |
| 게시글 제목 | `a[class*="title"]` 또는 `.post-title a` | iframe 내부 |
| 팝업 닫기 | `button[class*="close"]` | 여러 셀렉터 순차 시도 |

### 13.4 로그인 페이지

| 요소 | 셀렉터 | 비고 |
|------|--------|------|
| 아이디 | `#id` | evaluate로 값 설정 |
| 비밀번호 | `#pw` | evaluate로 값 설정 |
| 로그인 버튼 | `.btn_login, #log\\.login, button[type="submit"]` | |
| 기기 등록 버튼 | `button:has-text("등록"), a:has-text("등록")` | deviceConfirm 페이지 |

---

## 14. 알려진 제한사항 & TODO

### 14.1 현재 제한사항

1. **태그 입력 실패**: 발행 패널 내 태그 input의 placeholder가 `#태그 입력 (최대 30개)`인데 현재 셀렉터가 매칭 안될 수 있음. 태그 입력 실패 시 graceful skip 처리됨 (에러 없이 건너뜀).

2. **headless 모드 불안정**: 네이버가 headless 브라우저를 감지할 수 있음. headed 모드 권장.

3. **캡차 수동 처리**: 최초 로그인 시 캡차가 나오면 수동으로 해결 필요 (2분 대기).

4. **예약 발행 미구현**: `scheduledTime` 필드는 정의되어 있지만 아직 미구현.

5. **디버그 스크린샷 잔존**: `publish()` 메서드에 디버그용 스크린샷 코드가 남아있음. 프로덕션용으로 정리 필요.

### 14.2 개선 TODO

- [ ] 태그 입력 셀렉터 수정 (codegen으로 실제 DOM 확인 후 업데이트)
- [ ] 디버그 스크린샷 코드 제거 또는 환경변수로 토글
- [ ] 예약 발행 구현
- [ ] 이미지 업로드 안정성 테스트
- [ ] 카테고리 선택 검증
- [ ] 에러 발생 시 자동 재시도 로직
- [ ] 여러 글 연속 포스팅 기능
- [ ] CLI 인터페이스 추가 (인자로 제목/내용 전달)
- [ ] setup-chrome.ts를 non-interactive 방식으로 개선

---

## 15. CDP (Chrome DevTools Protocol) 모드

### 15.1 배경 및 필요성

Playwright의 기본 Chromium 브라우저는 네이버에서 "등록되지 않은 브라우저"로 인식됨.
실제 사용자의 Chrome 브라우저를 CDP로 제어하면 이 문제를 해결할 수 있음.

### 15.2 Chrome 136+ 보안 정책 (핵심)

**Chrome 136부터 기본 프로필(User Data)로는 `--remote-debugging-port` 사용이 차단됨.**

- 참고: https://developer.chrome.com/blog/remote-debugging-port
- 원인: 쿠키 탈취 방지를 위한 Google 보안 강화
- 해결: **별도의 전용 디버그 프로필** 사용 필수

```
❌ 기본 프로필: C:\Users\pyh99\AppData\Local\Google\Chrome\User Data
   → --remote-debugging-port 무시됨 (Chrome 136+)

❌ Junction/Symlink 우회:
   → Chrome 시작은 되지만 DPAPI 암호화 키가 경로에 종속
   → os_crypt: Failed to decrypt 에러 → 쿠키 복호화 실패

✅ 전용 디버그 프로필: C:\Users\pyh99\.chrome-debug-profile
   → 별도 경로이므로 remote-debugging-port 정상 동작
   → 최초 1회 수동 로그인 후 쿠키 영구 저장
```

### 15.3 프로필 구조

```
~/.chrome-debug-profile/        # 전용 디버그 프로필 (자동 생성)
├── Default/                    # Chrome 기본 프로필 데이터
│   ├── Cookies                 # 네이버 로그인 쿠키 (영구)
│   ├── Local Storage/          # 로컬 스토리지
│   └── ...
└── Local State                 # Chrome 설정
```

### 15.4 실행 흐름

```
1. npm run chrome:setup (최초 1회)
   → Chrome 시작 (디버그 프로필 + 포트 9222)
   → 네이버 로그인 페이지 자동 열림
   → 사용자가 수동 로그인
   → 쿠키가 디버그 프로필에 저장됨

2. npm run post:cdp (이후 반복)
   → Chrome 시작 (디버그 프로필 + 포트 9222)
   → Playwright가 CDP로 연결
   → 저장된 쿠키로 자동 인증
   → 블로그 에디터 접근 → 포스팅 → 발행
```

### 15.5 ChromeCDP 클래스 (src/chrome-cdp.ts)

```typescript
const cdp = new ChromeCDP({
  // chromePath: 자동 감지 (C:\Program Files\Google\Chrome\...)
  // userDataDir: 기본 ~/.chrome-debug-profile
  debugPort: 9222,          // CDP 포트
  killExisting: true,       // 기존 Chrome 종료 후 시작
  launchWaitMs: 15000,      // Chrome 시작 대기
});

// 프로필 상태 확인
cdp.isProfileSetup();       // boolean
cdp.getProfilePath();       // string

// 연결/해제
const { browser, context, page } = await cdp.connect();
await cdp.disconnect();     // Chrome 유지
await cdp.close();          // Chrome 종료
```

### 15.6 npm 스크립트

| 스크립트 | 명령어 | 설명 |
|---------|--------|------|
| `chrome:setup` | `npx tsx scripts/setup-chrome.ts` | 디버그 프로필 생성 + 수동 로그인 |
| `post:cdp` | `npx tsx scripts/post-cdp.ts` | CDP 모드 자동 포스팅 |
| `chrome:debug` | `npx tsx scripts/launch-chrome.ts` | Chrome 디버깅 모드 실행 |

---

## 16. 성공한 발행 이력

| 날짜 | 제목 | logNo | 모드 | 상태 |
|------|------|-------|------|------|
| 2026-02-15 | 레드향 제철 시기와 고르는 법... | 224184578741 | Playwright Test | 성공 |
| 2026-02-15 | 레드향 제철 시기와 고르는 법... | 224184614916 | CDP 모드 | 성공 |

---

## 17. 빠른 시작 가이드 (AI용)

### CDP 모드로 새 글 발행하기 (권장)

1. `scripts/post-cdp.ts`의 `postData` 객체 수정
2. 디버그 프로필이 없으면 `npm run chrome:setup` 실행 (최초 1회)
3. `npm run post:cdp` 실행

### 레거시 모드로 새 글 발행하기

1. `tests/blog-post.spec.ts`의 `postData` 객체 수정
2. Windows 환경이면 npm PATH 확인
3. 세션 유효한지 확인 (없으면 `npm run login`)
4. `npm run post` 실행

### 코드 수정 시 주의사항

1. **모든 에디터 요소 접근은 `this.loc()`, `this.getByRole()`, `this.getByText()` 사용**
2. **"발행" 버튼은 반드시 마지막 버튼 (`.nth(count - 1)`) 클릭**
3. **라디오 버튼은 `<label>` 클릭, `<input>` 직접 클릭 금지**
4. **타임아웃은 넉넉하게 설정 (네이버 서버 느림)**
5. **humanDelay() 반드시 추가 (봇 감지 방지)**
6. **page.evaluate()로 값 설정 시 input/change 이벤트 dispatch 필수**

### 새 기능 추가 시 패턴

```typescript
// 1. 셀렉터는 여러 개를 .or()로 체이닝 (DOM 변경 대비)
const element = this.loc('selector1')
  .or(this.loc('selector2'))
  .or(this.getByText('텍스트'))
  .first();

// 2. isVisible() + catch로 안전하게 확인
if (await element.isVisible({ timeout: 3_000 }).catch(() => false)) {
  await element.click();
}

// 3. 동작 후 반드시 딜레이
await humanDelay(500, 1000);
```

---

## 17. 환경 정보

- **OS**: Windows 11 Home 10.0.26200
- **Node.js**: `/c/Program Files/nodejs/` (Git Bash PATH 주의)
- **Playwright**: @playwright/test ^1.49.0, playwright ^1.58.2
- **tsx**: ^4.21.0 (TypeScript 스크립트 실행)
- **Browser**: Chrome 144 (CDP 모드 - 전용 디버그 프로필)
- **디버그 프로필**: `C:\Users\pyh99\.chrome-debug-profile`
- **프로젝트 경로**: `D:\ai_program\agent\naver-blog-automation\`
- **Git**: main 브랜치

---

> **이 문서를 읽는 AI에게**: 이 프로젝트는 네이버 블로그 자동 포스팅 도구입니다.
> 가장 중요한 것은:
> (1) CDP 모드 사용 (전용 디버그 프로필 필수, Chrome 136+ 보안 정책)
> (2) iframe 내부 에디터 구조 (직접 페이지 모드도 있음)
> (3) 발행 버튼 4개 중 마지막 클릭
> (4) label로 라디오 클릭
> (5) 봇 감지 우회를 위한 딜레이
> 코드 수정 시 반드시 위 사항을 확인하고, 발행 후 URL 변화로 성공 여부를 검증하세요.
