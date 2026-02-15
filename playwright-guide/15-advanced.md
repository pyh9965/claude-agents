# 15. 고급 기능

## 15.1 환경변수

### Playwright 전용 환경변수

| 환경변수 | 설명 | 기본값 |
|----------|------|--------|
| `PWDEBUG` | `1`: Inspector 활성화, `console`: 브라우저 콘솔 디버그 | - |
| `CI` | CI 환경 감지 (리포터, 워커 수 등에 영향) | - |
| `PLAYWRIGHT_BROWSERS_PATH` | 브라우저 바이너리 저장 경로 | OS별 기본 경로 |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | 패키지 설치 시 브라우저 다운로드 건너뜀 | - |
| `PLAYWRIGHT_SKIP_BROWSER_GC` | `1`: 미사용 브라우저 자동 삭제 비활성화 | - |
| `PLAYWRIGHT_DOWNLOAD_HOST` | 브라우저 다운로드 서버 URL (내부 미러) | Microsoft CDN |
| `PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST` | Chromium 전용 다운로드 서버 | - |
| `PLAYWRIGHT_FIREFOX_DOWNLOAD_HOST` | Firefox 전용 다운로드 서버 | - |
| `PLAYWRIGHT_WEBKIT_DOWNLOAD_HOST` | WebKit 전용 다운로드 서버 | - |
| `PLAYWRIGHT_DOWNLOAD_CONNECTION_TIMEOUT` | 다운로드 연결 타임아웃 (ms) | - |
| `HTTPS_PROXY` | 프록시 서버 (브라우저 다운로드용) | - |
| `NODE_EXTRA_CA_CERTS` | 커스텀 루트 인증서 경로 | - |
| `DEBUG` | `pw:api` 등 상세 로그 활성화 | - |
| `PLAYWRIGHT_FORCE_TTY` | TTY 출력 강제 (CI에서 색상/포맷 제어) | - |
| `FORCE_COLOR` | 색상 출력 강제 | - |

### 테스트 실행 환경변수

| 환경변수 | 설명 |
|----------|------|
| `TEST_WORKER_INDEX` | 워커 고유 인덱스 (process.env로 접근) |
| `TEST_PARALLEL_INDEX` | 병렬 인덱스 (0부터, workers-1까지) |
| `PLAYWRIGHT_TEST` | 테스트 실행 시 자동 설정 (`1`) |

### 리포터 환경변수

| 환경변수 | 설명 |
|----------|------|
| `PLAYWRIGHT_HTML_OUTPUT_DIR` | HTML 리포트 출력 디렉토리 |
| `PLAYWRIGHT_HTML_OPEN` | HTML 리포트 자동 열기 (`always`/`never`/`on-failure`) |
| `PLAYWRIGHT_HTML_HOST` | HTML 리포트 서버 호스트 |
| `PLAYWRIGHT_HTML_PORT` | HTML 리포트 서버 포트 |
| `PLAYWRIGHT_HTML_ATTACHMENTS_BASE_URL` | 첨부파일 기본 URL |
| `PLAYWRIGHT_HTML_TITLE` | HTML 리포트 제목 |
| `PLAYWRIGHT_HTML_NO_COPY_PROMPT` | 복사 프롬프트 비활성화 |
| `PLAYWRIGHT_HTML_NO_SNIPPETS` | 코드 스니펫 비활성화 |
| `PLAYWRIGHT_JSON_OUTPUT_FILE` | JSON 리포트 출력 파일 |
| `PLAYWRIGHT_JSON_OUTPUT_DIR` | JSON 리포트 출력 디렉토리 |
| `PLAYWRIGHT_JSON_OUTPUT_NAME` | JSON 리포트 파일명 |
| `PLAYWRIGHT_JUNIT_OUTPUT_FILE` | JUnit 리포트 출력 파일 |
| `PLAYWRIGHT_JUNIT_STRIP_ANSI` | JUnit에서 ANSI 코드 제거 |
| `PLAYWRIGHT_JUNIT_INCLUDE_PROJECT_IN_TEST_NAME` | 프로젝트명 포함 |
| `PLAYWRIGHT_JUNIT_SUITE_ID` | 루트 testsuites id 속성 |
| `PLAYWRIGHT_JUNIT_SUITE_NAME` | 루트 testsuites name 속성 |
| `PLAYWRIGHT_BLOB_OUTPUT_DIR` | Blob 리포트 출력 디렉토리 |
| `PLAYWRIGHT_BLOB_OUTPUT_NAME` | Blob 리포트 파일명 |
| `PLAYWRIGHT_BLOB_OUTPUT_FILE` | Blob 리포트 전체 파일 경로 |
| `PLAYWRIGHT_LIST_PRINT_STEPS` | List 리포터 스텝 표시 |

### 브라우저 바이너리 경로 설정

```bash
# 기본 경로 (OS별)
# Windows:  %USERPROFILE%\AppData\Local\ms-playwright
# macOS:    ~/Library/Caches/ms-playwright
# Linux:    ~/.cache/ms-playwright

# 커스텀 경로 설정
export PLAYWRIGHT_BROWSERS_PATH=$HOME/pw-browsers
npx playwright install

# node_modules 내에 설치 (프로젝트별 격리)
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install
```

### .env 파일 사용

```bash
# .env
BASE_URL=http://localhost:3000
API_TOKEN=test-token-123
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

```typescript
// playwright.config.ts
import dotenv from 'dotenv';
import path from 'path';

// .env 파일 로드
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  use: {
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
    },
  },
});
```

```bash
# 또는 CLI에서 직접
BASE_URL=http://staging.example.com npx playwright test
```

### CI 환경 최적화

```typescript
// playwright.config.ts
export default defineConfig({
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['dot'], ['blob'], ['github']]
    : [['list'], ['html']],
  use: {
    trace: process.env.CI ? 'on-first-retry' : 'off',
    video: process.env.CI ? 'retain-on-failure' : 'off',
  },
});
```

---

## 15.2 글로벌 Setup / Teardown

### 방법 1: 프로젝트 의존성 (권장)

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    // 1. 셋업 프로젝트
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    // 2. 해제 프로젝트
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },
    // 3. 실제 테스트 (셋업 완료 후)
    {
      name: 'e2e tests',
      dependencies: ['setup'],
      use: {
        storageState: 'playwright/.auth/user.json',
      },
    },
  ],
});
```

```typescript
// global.setup.ts
import { test as setup, expect } from '@playwright/test';

setup('데이터베이스 초기화', async ({ request }) => {
  const response = await request.post('/api/reset-db');
  expect(response.ok()).toBeTruthy();
});

setup('인증', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('password');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/user.json' });
});
```

```typescript
// global.teardown.ts
import { test as teardown } from '@playwright/test';

teardown('데이터 정리', async ({ request }) => {
  await request.post('/api/cleanup');
});
```

장점:
- HTML 리포트에 별도 프로젝트로 표시
- 트레이스 기록 가능
- 모든 픽스처 사용 가능
- headless 등 설정 자동 적용
- 병렬 실행 및 재시도 지원

### 방법 2: globalSetup / globalTeardown (레거시)

```typescript
// playwright.config.ts
export default defineConfig({
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});
```

```typescript
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // 환경변수로 데이터 전달
  process.env.ADMIN_TOKEN = 'generated-token';

  // 브라우저 수동 관리
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://example.com/login');
  // ... 로그인 로직
  await page.context().storageState({ path: 'playwright/.auth/state.json' });
  await browser.close();
}

export default globalSetup;
```

```typescript
// global-teardown.ts
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up...');
}

export default globalTeardown;
```

### 차이점 비교

| 기능 | 프로젝트 의존성 | globalSetup |
|------|----------------|-------------|
| HTML 리포트 | 별도 프로젝트로 표시 | 표시 안 됨 |
| 트레이스 기록 | 지원 | 미지원 |
| 픽스처 사용 | 가능 | 불가 |
| 병렬 실행 | 가능 | 불가 |
| 설정 옵션 적용 | 자동 | 수동 |
| 디버깅 | 쉬움 | 어려움 |

### 셋업 실패 시 트레이스 캡처

```typescript
// global.setup.ts
import { test as setup } from '@playwright/test';

setup('인증 (트레이스 포함)', async ({ page, context }) => {
  await context.tracing.start({ screenshots: true, snapshots: true });

  try {
    await page.goto('/login');
    await page.getByLabel('이메일').fill('user@example.com');
    await page.getByLabel('비밀번호').fill('password');
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');
    await page.context().storageState({ path: 'playwright/.auth/user.json' });
  } catch (error) {
    await context.tracing.stop({ path: 'setup-trace.zip' });
    throw error;
  }

  await context.tracing.stop();
});
```

### 테스트 필터링과 의존성

```bash
# --grep, --shard, test.only()는 주 테스트만 필터링
# 의존성 프로젝트는 자동 실행됨

# 의존성 프로젝트 건너뛰기
npx playwright test --no-deps
```

---

## 15.3 스크린샷 비교 (Visual Comparisons)

### toHaveScreenshot()

```typescript
// 기본 사용 - 첫 실행 시 기준 이미지 생성
await expect(page).toHaveScreenshot();

// 이름 지정
await expect(page).toHaveScreenshot('landing-page.png');

// 전체 옵션
await expect(page).toHaveScreenshot('dashboard.png', {
  // 비교 설정
  maxDiffPixels: 100,          // 최대 허용 픽셀 차이 (절대값)
  maxDiffPixelRatio: 0.01,     // 최대 허용 비율 (0~1)
  threshold: 0.2,              // 픽셀별 비교 임계값 (0~1, 기본 0.2)

  // 캡처 설정
  fullPage: false,             // 전체 스크롤 페이지
  clip: { x: 0, y: 0, width: 800, height: 600 }, // 영역 지정
  omitBackground: false,       // 배경 투명 (PNG만)

  // 동적 요소 처리
  animations: 'disabled',      // 애니메이션 비활성화 (기본 'disabled')
  caret: 'hide',               // 커서 숨김 (기본 'hide')
  mask: [                      // 마스킹할 로케이터
    page.locator('.timestamp'),
    page.locator('.ad-banner'),
  ],
  maskColor: '#FF00FF',        // 마스크 색상 (기본 핑크)
  stylePath: './screenshot-styles.css', // 스크린샷용 CSS

  // 출력 설정
  scale: 'css',                // 'css' | 'device' (기본 'css')
  timeout: 30_000,             // 타임아웃
});
```

### 요소 스크린샷 비교

```typescript
// 특정 요소 스크린샷 비교
const header = page.locator('header');
await expect(header).toHaveScreenshot('header.png');

// 옵션 사용
await expect(header).toHaveScreenshot('header-dark.png', {
  maxDiffPixels: 50,
  animations: 'disabled',
});
```

### toMatchSnapshot() (비이미지)

```typescript
// 텍스트 스냅샷
const text = await page.textContent('.article');
expect(text).toMatchSnapshot('article-content.txt');

// JSON 스냅샷
const data = await page.evaluate(() => window.__APP_DATA__);
expect(JSON.stringify(data, null, 2)).toMatchSnapshot('app-data.json');
```

### 스냅샷 업데이트

```bash
# 모든 스냅샷 업데이트
npx playwright test --update-snapshots

# 변경된 스냅샷만 업데이트
npx playwright test --update-snapshots=changed

# 누락된 스냅샷만 생성
npx playwright test --update-snapshots=missing

# 업데이트 없이 검증만
npx playwright test --update-snapshots=none
```

### 스냅샷 경로 템플릿

```typescript
// playwright.config.ts
export default defineConfig({
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',

  // 사용 가능한 변수:
  // {testDir}        - 테스트 디렉토리
  // {snapshotDir}    - 스냅샷 디렉토리
  // {snapshotSuffix} - 플랫폼/브라우저 접미사
  // {testFileDir}    - 테스트 파일 디렉토리
  // {testFileName}   - 테스트 파일명 (확장자 제외)
  // {testFilePath}   - 테스트 파일 상대 경로
  // {testName}       - 테스트 제목 (sanitized)
  // {arg}            - 스크린샷 이름 또는 자동 생성 인덱스
  // {ext}            - 확장자
  // {platform}       - OS (darwin, linux, win32)
  // {projectName}    - 프로젝트 이름
});
```

### 설정 파일에서 전역 설정

```typescript
// playwright.config.ts
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 50,
    threshold: 0.2,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  },
  toMatchSnapshot: {
    maxDiffPixels: 10,
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  },
},
```

### 스크린샷 전용 CSS

```css
/* screenshot-styles.css */
/* 동적 요소 숨기기 */
.timestamp,
.live-indicator,
.animation-container {
  visibility: hidden !important;
}

/* 광고 배너 숨기기 */
.ad-banner {
  display: none !important;
}
```

### 주의사항

- 브라우저 렌더링은 OS, 하드웨어, headless 모드에 따라 달라짐
- CI 환경에서 일관된 결과를 위해 동일 OS/환경 사용 권장
- 스냅샷 디렉토리는 버전 관리에 커밋
- 파일명 패턴: `{name}-{browser}-{platform}.png`
- 첫 실행 시 "두 연속 스크린샷이 일치"할 때까지 캡처하여 안정적 기준 이미지 생성

---

## 15.4 Page Object Model (POM)

### 기본 패턴

```typescript
// pages/login-page.ts
import { type Locator, type Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('이메일');
    this.passwordInput = page.getByLabel('비밀번호');
    this.submitButton = page.getByRole('button', { name: '로그인' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }

  async expectLoggedIn() {
    await expect(this.page).toHaveURL('/dashboard');
  }
}
```

### POM을 픽스처로 사용

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { DashboardPage } from './pages/dashboard-page';

type MyFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<MyFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },
});

export { expect } from '@playwright/test';
```

### 테스트에서 사용

```typescript
// tests/login.spec.ts
import { test, expect } from '../fixtures';

test('유효한 자격증명으로 로그인', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  await loginPage.expectLoggedIn();
});

test('잘못된 비밀번호', async ({ loginPage }) => {
  await loginPage.goto();
  await loginPage.login('user@example.com', 'wrong');
  await loginPage.expectError('비밀번호가 올바르지 않습니다');
});
```

---

## 15.5 Browser Contexts (다중 컨텍스트)

### 기본 개념

- 각 BrowserContext는 독립된 세션 (쿠키, 로컬스토리지, 세션스토리지 분리)
- "인코그니토 모드"와 동등
- 빠르게 생성/삭제 가능
- 단일 브라우저에서 여러 컨텍스트 동시 운영

### 다중 사용자 시뮬레이션

```typescript
test('실시간 채팅', async ({ browser }) => {
  // 사용자 1 컨텍스트
  const context1 = await browser.newContext({
    storageState: 'playwright/.auth/user1.json',
  });
  const page1 = await context1.newPage();
  await page1.goto('/chat');

  // 사용자 2 컨텍스트
  const context2 = await browser.newContext({
    storageState: 'playwright/.auth/user2.json',
  });
  const page2 = await context2.newPage();
  await page2.goto('/chat');

  // 사용자 1이 메시지 전송
  await page1.getByPlaceholder('메시지 입력').fill('안녕하세요!');
  await page1.getByRole('button', { name: '전송' }).click();

  // 사용자 2가 메시지 수신 확인
  await expect(page2.getByText('안녕하세요!')).toBeVisible();

  // 정리
  await context1.close();
  await context2.close();
});
```

### 컨텍스트 옵션

```typescript
const context = await browser.newContext({
  // 뷰포트
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 2,

  // 에뮬레이션
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  geolocation: { longitude: 126.978, latitude: 37.566 },
  permissions: ['geolocation', 'notifications'],
  colorScheme: 'dark',
  isMobile: true,
  hasTouch: true,
  userAgent: 'Custom User Agent',

  // 네트워크
  httpCredentials: { username: 'user', password: 'pass' },
  ignoreHTTPSErrors: true,
  offline: false,
  extraHTTPHeaders: { 'X-Custom': 'value' },
  proxy: { server: 'http://proxy:8080' },

  // 인증
  storageState: 'auth.json',

  // 녹화
  recordVideo: { dir: 'videos/', size: { width: 1280, height: 720 } },
  recordHar: { path: 'network.har', mode: 'minimal' },

  // 보안
  bypassCSP: true,
  javaScriptEnabled: true,
  serviceWorkers: 'block',

  // 다운로드
  acceptDownloads: true,
});
```

### 권한 관리

```typescript
// 권한 부여
await context.grantPermissions(['geolocation', 'camera', 'microphone']);

// 특정 출처에만 권한
await context.grantPermissions(['notifications'], { origin: 'https://example.com' });

// 모든 권한 해제
await context.clearPermissions();
```

### 쿠키 관리

```typescript
// 쿠키 추가
await context.addCookies([{
  name: 'session',
  value: 'abc123',
  domain: '.example.com',
  path: '/',
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  expires: Math.floor(Date.now() / 1000) + 3600,
}]);

// 쿠키 조회
const cookies = await context.cookies();
const loginCookie = await context.cookies('https://example.com');

// 쿠키 삭제
await context.clearCookies();

// 특정 쿠키만 삭제
await context.clearCookies({ name: 'session' });
await context.clearCookies({ domain: '.example.com' });
```

### storageState 저장/복원

```typescript
// 현재 상태 저장
const state = await context.storageState();
await context.storageState({ path: 'state.json' });

// IndexedDB 포함 저장 (v1.51+)
await context.storageState({ path: 'state.json', indexedDB: true });

// 상태 복원으로 새 컨텍스트 생성
const newContext = await browser.newContext({
  storageState: 'state.json',
});
```

---

## 15.6 에뮬레이션

### 디바이스 에뮬레이션

```typescript
import { devices } from '@playwright/test';

// playwright.config.ts
projects: [
  { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'] } },
  { name: 'Mobile Safari', use: { ...devices['iPhone 13'] } },
  { name: 'Tablet', use: { ...devices['iPad Pro 11'] } },
],
```

### 주요 디바이스 목록

```typescript
// 데스크톱
devices['Desktop Chrome']
devices['Desktop Firefox']
devices['Desktop Safari']
devices['Desktop Edge']

// iPhone
devices['iPhone 13']
devices['iPhone 13 Pro Max']
devices['iPhone 14']
devices['iPhone 15']

// iPad
devices['iPad (gen 7)']
devices['iPad Pro 11']

// Android
devices['Pixel 5']
devices['Pixel 7']
devices['Galaxy S9+']
```

### 색상 스킴 / 미디어 에뮬레이션

```typescript
// config에서
use: { colorScheme: 'dark' },

// 테스트에서 동적 변경
await page.emulateMedia({
  media: 'print',                // 'screen' | 'print' | null
  colorScheme: 'dark',           // 'dark' | 'light' | 'no-preference' | null
  reducedMotion: 'reduce',       // 'reduce' | 'no-preference' | null
  forcedColors: 'active',        // 'active' | 'none' | null
});
```

### 위치 / 오프라인 / JavaScript

```typescript
// config에서
use: {
  geolocation: { longitude: 126.978, latitude: 37.566 },
  permissions: ['geolocation'],
  offline: false,
  javaScriptEnabled: true,
},

// 테스트에서 동적 변경
await context.setGeolocation({ longitude: 127.024, latitude: 37.504 });
await context.setOffline(true);
```

---

## 15.7 타임아웃 체계

### 타임아웃 종류 및 기본값

| 타임아웃 | 기본값 | 설정 위치 | 설명 |
|----------|--------|-----------|------|
| Test timeout | 30,000ms | `timeout` | 테스트 함수 + beforeEach + 픽스처 셋업 |
| Expect timeout | 5,000ms | `expect.timeout` | 자동 재시도 assertion |
| Action timeout | 무제한 | `use.actionTimeout` | click, fill 등 개별 액션 |
| Navigation timeout | 무제한 | `use.navigationTimeout` | goto, reload 등 네비게이션 |
| Global timeout | 무제한 | `globalTimeout` | 전체 테스트 스위트 |
| Fixture timeout | 테스트와 동일 | 픽스처 정의 | 개별 픽스처 셋업/해제 |
| beforeAll/afterAll | 30,000ms | - | 테스트와 별도 타임아웃 |

### 설정 방법

```typescript
// playwright.config.ts (전역)
export default defineConfig({
  timeout: 60_000,                // 테스트 타임아웃
  globalTimeout: 3_600_000,       // 전체 스위트 (1시간)
  expect: {
    timeout: 10_000,              // assertion 타임아웃
  },
  use: {
    actionTimeout: 15_000,        // 액션 타임아웃
    navigationTimeout: 30_000,    // 네비게이션 타임아웃
  },
});
```

```typescript
// 테스트 내에서 (동적 변경)
test('느린 테스트', async ({ page }) => {
  test.setTimeout(120_000);       // 이 테스트만 2분

  // 또는 3배로 늘리기
  test.slow();

  // 개별 액션에 타임아웃
  await page.click('button', { timeout: 10_000 });

  // 개별 assertion에 타임아웃
  await expect(page.locator('.result')).toBeVisible({ timeout: 30_000 });

  // 개별 네비게이션에 타임아웃
  await page.goto('/slow-page', { timeout: 60_000 });
});
```

```typescript
// 훅에서 타임아웃 변경
test.beforeAll(async () => {
  // beforeAll은 별도 30초 타임아웃
  test.setTimeout(60_000);
});

test.beforeEach(async ({ page }, testInfo) => {
  // beforeEach는 테스트 타임아웃에 포함
  testInfo.setTimeout(testInfo.timeout + 30_000); // 30초 추가
});
```

---

## 15.8 test.info() 상세

### 전체 속성

```typescript
test('test.info() 활용', async ({ page }) => {
  const info = test.info();

  // === 식별 ===
  info.title;           // 테스트 제목
  info.titlePath;       // ['describe1', 'describe2', 'title']
  info.testId;          // 고유 테스트 ID
  info.file;            // 테스트 파일 절대 경로
  info.line;            // 선언 줄 번호
  info.column;          // 선언 열 번호
  info.fn;              // 테스트 함수 참조

  // === 실행 상태 ===
  info.status;          // 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'
  info.expectedStatus;  // 예상 상태 (test.fail() 등 반영)
  info.duration;        // 실행 시간 (ms, 완료 전 0)
  info.retry;           // 재시도 횟수 (0부터)
  info.errors;          // 모든 에러 배열
  info.error;           // 첫 번째 에러

  // === 설정 ===
  info.config;          // FullConfig 객체
  info.project;         // FullProject 객체
  info.timeout;         // 현재 타임아웃 (ms)
  info.tags;            // ['@smoke', '@critical']
  info.annotations;     // [{type, description}]

  // === 병렬화 ===
  info.workerIndex;     // 워커 인덱스
  info.parallelIndex;   // 병렬 인덱스 (0 ~ workers-1)
  info.repeatEachIndex; // repeat-each 인덱스

  // === 출력 ===
  info.outputDir;       // 테스트별 출력 디렉토리
  info.snapshotDir;     // 스냅샷 디렉토리
  info.snapshotSuffix;  // 플랫폼/브라우저 접미사
  info.attachments;     // 첨부 파일 목록
});
```

### 파일 첨부

```typescript
test('첨부 파일', async ({ page }) => {
  // 스크린샷 첨부
  const screenshot = await page.screenshot();
  await test.info().attach('screenshot', {
    body: screenshot,
    contentType: 'image/png',
  });

  // 파일 경로로 첨부
  await test.info().attach('log-file', {
    path: '/tmp/test.log',
    contentType: 'text/plain',
  });

  // JSON 데이터 첨부
  await test.info().attach('api-response', {
    body: JSON.stringify({ data: 'test' }, null, 2),
    contentType: 'application/json',
  });
});
```

### 출력 경로 생성

```typescript
test('출력 파일', async ({ page }) => {
  // 테스트별 안전한 파일 경로 생성
  const outputPath = test.info().outputPath('data.json');
  // -> test-results/test-name/data.json

  const nestedPath = test.info().outputPath('screenshots', 'step1.png');
  // -> test-results/test-name/screenshots/step1.png

  // 스냅샷 경로
  const snapshotPath = test.info().snapshotPath('baseline.png');
});
```

### 런타임 어노테이션

```typescript
test('동적 어노테이션', async ({ page }) => {
  test.info().annotations.push({
    type: 'issue',
    description: 'https://jira.example.com/PROJ-123',
  });

  // _ 접두사: HTML 리포트에 표시 안 됨
  test.info().annotations.push({
    type: '_internal',
    description: '내부 디버그 정보',
  });
});
```

---

## 15.9 WebSocket 테스트

### 모니터링

```typescript
page.on('websocket', (ws) => {
  console.log(`WebSocket opened: ${ws.url()}`);

  ws.on('framesent', (data) => console.log(`Sent: ${data.payload}`));
  ws.on('framereceived', (data) => console.log(`Received: ${data.payload}`));
  ws.on('close', () => console.log('WebSocket closed'));
});
```

### 모킹

```typescript
// WebSocket 완전 모킹 (서버 연결 없이)
await page.routeWebSocket('wss://example.com/ws', (ws) => {
  ws.onMessage((message) => {
    if (message === 'ping') {
      ws.send('pong');
    }
  });
});

// WebSocket 인터셉트 (서버 연결 유지, 메시지 수정)
await page.routeWebSocket('wss://example.com/ws', (ws) => {
  const server = ws.connectToServer();

  ws.onMessage((message) => {
    server.send(message + ' (modified)');
  });

  server.onMessage((message) => {
    ws.send(message);
  });
});
```

---

## 15.10 Locator Handler (오버레이 처리)

```typescript
// 예기치 않은 오버레이/팝업 자동 처리
await page.addLocatorHandler(
  page.getByRole('dialog', { name: '쿠키 동의' }),
  async (locator) => {
    await locator.getByRole('button', { name: '동의' }).click();
  }
);

// 옵션: times (최대 처리 횟수)
await page.addLocatorHandler(
  page.getByText('광고'),
  async () => {
    await page.getByRole('button', { name: '닫기' }).click();
  },
  { times: 3 }
);

// 핸들러 제거
await page.removeLocatorHandler(
  page.getByRole('dialog', { name: '쿠키 동의' })
);
```

---

## 15.11 Clock API (시간 제어)

```typescript
test('시간 기반 기능 테스트', async ({ page }) => {
  // 시간 고정
  await page.clock.setFixedTime(new Date('2025-01-15T09:00:00'));

  await page.goto('/dashboard');
  await expect(page.getByText('오전 9:00')).toBeVisible();

  // 시간 진행
  await page.clock.fastForward('01:00:00'); // 1시간 진행
  await expect(page.getByText('오전 10:00')).toBeVisible();

  // 타이머 실행
  await page.clock.runFor(5000); // 5초 진행

  // Date.now() 제어
  await page.clock.install({ time: new Date('2025-06-01') });
});
```

---

## 15.12 Tag 기반 테스트 필터링

### 태그 선언

```typescript
test('빠른 테스트', { tag: '@fast' }, async ({ page }) => { /* ... */ });
test('느린 테스트', { tag: ['@slow', '@integration'] }, async ({ page }) => { /* ... */ });

// describe에 태그
test.describe('결제', { tag: '@payment' }, () => {
  test('카드 결제', async ({ page }) => { /* ... */ });
  test('포인트 결제', async ({ page }) => { /* ... */ });
});
```

### 태그로 실행

```bash
# 특정 태그만 실행
npx playwright test --grep @fast

# 태그 제외
npx playwright test --grep-invert @slow

# OR 조건 (정규식)
npx playwright test --grep "@fast|@smoke"

# AND 조건 (정규식 lookahead)
npx playwright test --grep "(?=.*@fast)(?=.*@smoke)"
```

---

## 15.13 테스트 매개변수화 (Parameterization)

### 배열 반복

```typescript
const users = [
  { name: '일반', email: 'user@test.com', role: 'user' },
  { name: '관리자', email: 'admin@test.com', role: 'admin' },
  { name: '편집자', email: 'editor@test.com', role: 'editor' },
];

for (const user of users) {
  test(`${user.name} 로그인`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill(user.email);
    // ...
  });
}
```

### 픽스처 옵션으로 매개변수화

```typescript
// fixtures.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{ defaultUser: string }>({
  defaultUser: ['user@test.com', { option: true }],
});

// playwright.config.ts
projects: [
  { name: 'as-user', use: { defaultUser: 'user@test.com' } },
  { name: 'as-admin', use: { defaultUser: 'admin@test.com' } },
],
```

### 환경별 설정

```typescript
// playwright.config.ts
const baseURL = process.env.STAGING
  ? 'https://staging.example.com'
  : 'http://localhost:3000';

export default defineConfig({ use: { baseURL } });
```

```bash
STAGING=1 npx playwright test
```

---

## 15.14 커스텀 Expect Matchers

```typescript
// custom-matchers.ts
import { expect as baseExpect, Locator } from '@playwright/test';

export const expect = baseExpect.extend({
  async toHaveAmount(locator: Locator, expected: number) {
    const actual = await locator.textContent();
    const amount = parseFloat(actual?.replace(/[^0-9.]/g, '') || '0');
    const pass = amount === expected;

    return {
      pass,
      message: () => pass
        ? `Expected amount NOT to be ${expected}, but it was`
        : `Expected amount to be ${expected}, but got ${amount}`,
      name: 'toHaveAmount',
      expected,
      actual: amount,
    };
  },
});

// 사용
test('금액 확인', async ({ page }) => {
  await expect(page.locator('.price')).toHaveAmount(29.99);
});
```

---

## 15.15 프레임 & iframe

```typescript
// frameLocator (권장)
await page
  .frameLocator('#payment-iframe')
  .getByLabel('카드 번호')
  .fill('4111111111111111');

// 이름으로 프레임 접근
const frame = page.frame('payment-iframe');
await frame?.locator('#card-number').fill('4111111111111111');

// URL로 프레임 접근
const frame2 = page.frame({ url: /payment\.example\.com/ });

// 모든 프레임
const frames = page.frames();

// 중첩 iframe
await page
  .frameLocator('#outer-frame')
  .frameLocator('#inner-frame')
  .getByRole('button')
  .click();
```

---

## 15.16 CI 통합 패턴

### GitHub Actions

```yaml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run Playwright tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Docker

```dockerfile
FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

CMD ["npx", "playwright", "test"]
```

### 시스템 요구사항

- **Node.js**: 20.x, 22.x, 24.x
- **Windows**: 11+, Server 2019+, WSL
- **macOS**: 14 (Ventura)+
- **Linux**: Debian 12/13, Ubuntu 22.04/24.04 (x86-64, arm64)

---

## 15.17 브라우저 채널

```typescript
projects: [
  // 안정 채널
  { name: 'chrome', use: { channel: 'chrome' } },
  { name: 'msedge', use: { channel: 'msedge' } },

  // 베타/개발/카나리 채널
  { name: 'chrome-beta', use: { channel: 'chrome-beta' } },
  { name: 'msedge-beta', use: { channel: 'msedge-beta' } },
  { name: 'chrome-dev', use: { channel: 'chrome-dev' } },
  { name: 'msedge-dev', use: { channel: 'msedge-dev' } },
  { name: 'chrome-canary', use: { channel: 'chrome-canary' } },
  { name: 'msedge-canary', use: { channel: 'msedge-canary' } },
],
```

```bash
# 브랜딩된 브라우저 설치
npx playwright install chrome
npx playwright install msedge
```

---

## 15.18 자주 사용하는 패턴 모음

### 네트워크 응답 대기 후 클릭

```typescript
const [response] = await Promise.all([
  page.waitForResponse('**/api/data'),
  page.getByRole('button', { name: '로드' }).click(),
]);
```

### 조건부 액션

```typescript
const popup = page.getByRole('dialog');
if (await popup.isVisible()) {
  await popup.getByRole('button', { name: '닫기' }).click();
}
```

### 재시도 가능한 블록

```typescript
await expect(async () => {
  await page.getByRole('button', { name: '새로고침' }).click();
  await expect(page.getByText('로딩 완료')).toBeVisible({ timeout: 2_000 });
}).toPass({ timeout: 30_000 });
```

### 클립보드

```typescript
const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
await page.evaluate((text) => navigator.clipboard.writeText(text), 'Hello');
```

### localStorage / sessionStorage 조작

```typescript
await page.evaluate(() => {
  localStorage.setItem('theme', 'dark');
  sessionStorage.setItem('token', 'abc123');
});

const theme = await page.evaluate(() => localStorage.getItem('theme'));
await page.evaluate(() => localStorage.clear());
```

### Session Storage 인증 상태 수동 관리

```typescript
// Session Storage는 storageState에 자동 포함되지 않음
// 수동 저장
const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
fs.writeFileSync('playwright/.auth/session.json', sessionStorage);

// 수동 복원
const storage = JSON.parse(fs.readFileSync('playwright/.auth/session.json', 'utf-8'));
await context.addInitScript((storage) => {
  if (window.location.hostname === 'example.com') {
    for (const [key, value] of Object.entries(storage))
      window.sessionStorage.setItem(key, value as string);
  }
}, storage);
```

### 파일 다이얼로그

```typescript
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: '파일 선택' }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles(['path/to/file1.pdf', 'path/to/file2.pdf']);
console.log(fileChooser.isMultiple());
```

### 새 탭/팝업 처리

```typescript
const pagePromise = context.waitForEvent('page');
await page.getByRole('link', { name: '새 탭' }).click();
const newPage = await pagePromise;
await newPage.waitForLoadState();
await expect(newPage).toHaveURL(/.*new-page/);
```

### 다운로드 처리

```typescript
const downloadPromise = page.waitForEvent('download');
await page.getByRole('link', { name: '다운로드' }).click();
const download = await downloadPromise;

console.log(download.suggestedFilename());
await download.saveAs('downloads/' + download.suggestedFilename());
const path = await download.path();
const failure = await download.failure();
expect(failure).toBeNull();
```

---

## 15.19 Playwright 업데이트

```bash
# 최신 버전으로 업데이트
npm install -D @playwright/test@latest

# 브라우저도 업데이트
npx playwright install --with-deps

# 현재 버전 확인
npx playwright --version

# 설치된 브라우저 목록
npx playwright install --list

# 브라우저 제거
npx playwright uninstall         # 현재 버전
npx playwright uninstall --all   # 모든 버전
```
