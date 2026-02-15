# 03. playwright.config.ts 전체 옵션

## 3.1 전체 설정 구조

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ── 테스트 탐색 ──
  testDir: './tests',                    // 테스트 파일 디렉토리
  testMatch: '**/*.spec.ts',             // 테스트 파일 패턴 (glob)
  testIgnore: '**/helpers/**',           // 제외할 파일 패턴

  // ── 실행 제어 ──
  fullyParallel: true,                   // 모든 테스트 병렬 실행
  workers: process.env.CI ? 1 : '50%',   // 워커 수 (숫자 또는 CPU %)
  retries: process.env.CI ? 2 : 0,       // 실패 시 재시도 횟수
  maxFailures: process.env.CI ? 10 : 0,  // N개 실패 후 중단 (0=무제한)
  timeout: 30_000,                       // 테스트 타임아웃 (ms)
  globalTimeout: 600_000,               // 전체 스위트 타임아웃 (ms)

  // ── 출력 ──
  outputDir: './test-results',           // 아티팩트 출력 디렉토리
  reporter: 'html',                      // 리포터 설정
  quiet: false,                          // stdout 억제

  // ── 정책 ──
  forbidOnly: !!process.env.CI,          // test.only 금지 (CI용)

  // ── 글로벌 설정 ──
  globalSetup: './global-setup.ts',      // 글로벌 셋업 파일
  globalTeardown: './global-teardown.ts',// 글로벌 해제 파일

  // ── 스냅샷 ──
  snapshotDir: './snapshots',            // 스냅샷 저장 디렉토리
  snapshotPathTemplate: '{testDir}/__snapshots__/{testFilePath}/{arg}{ext}',
  updateSnapshots: 'missing',            // 'all' | 'none' | 'missing'

  // ── 브라우저 공통 옵션 ──
  use: {
    // ... 아래 3.2 참조
  },

  // ── Assertion 설정 ──
  expect: {
    // ... 아래 3.3 참조
  },

  // ── 프로젝트 (브라우저/환경별) ──
  projects: [
    // ... 아래 3.4 참조
  ],

  // ── 개발 서버 ──
  webServer: {
    // ... 아래 3.5 참조
  },
});
```

## 3.2 use 옵션 (BrowserContext / Page 설정)

```typescript
use: {
  // ── 네비게이션 ──
  baseURL: 'http://localhost:3000',      // 상대 URL의 기준

  // ── 브라우저 설정 ──
  headless: true,                        // headless 모드
  channel: 'chrome',                     // 브라우저 채널 ('chrome', 'msedge')
  launchOptions: {                       // 브라우저 실행 옵션
    slowMo: 100,                         // 각 액션 사이 지연 (ms)
    args: ['--disable-gpu'],             // 브라우저 CLI 인수
  },

  // ── 뷰포트 & 에뮬레이션 ──
  viewport: { width: 1280, height: 720 },// 뷰포트 크기
  deviceScaleFactor: 2,                  // 디바이스 픽셀 비율
  isMobile: false,                       // 모바일 에뮬레이션
  hasTouch: false,                       // 터치 지원

  // ── 색상 & 미디어 ──
  colorScheme: 'dark',                   // 'dark' | 'light' | 'no-preference'
  reducedMotion: 'reduce',              // 'reduce' | 'no-preference'
  forcedColors: 'active',               // 'active' | 'none'

  // ── 위치 & 로케일 ──
  locale: 'ko-KR',                      // 로케일
  timezoneId: 'Asia/Seoul',             // 타임존
  geolocation: { longitude: 126.978, latitude: 37.566 },
  permissions: ['geolocation'],          // 브라우저 퍼미션

  // ── 네트워크 ──
  extraHTTPHeaders: {                    // 추가 HTTP 헤더
    'Accept-Language': 'ko-KR',
  },
  httpCredentials: {                     // HTTP 인증
    username: 'user',
    password: 'pass',
  },
  ignoreHTTPSErrors: true,               // HTTPS 에러 무시
  proxy: {                               // 프록시 설정
    server: 'http://proxy:8080',
    bypass: 'localhost',
    username: 'user',
    password: 'pass',
  },

  // ── 인증 ──
  storageState: 'playwright/.auth/user.json', // 인증 상태 파일

  // ── 녹화 ──
  screenshot: 'only-on-failure',         // 'off' | 'on' | 'only-on-failure'
  video: 'retain-on-failure',            // 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'
  trace: 'on-first-retry',              // 아래 트레이스 옵션 참조

  // ── 액션 ──
  actionTimeout: 10_000,                // 개별 액션 타임아웃 (ms)
  navigationTimeout: 30_000,            // 네비게이션 타임아웃 (ms)

  // ── 기타 ──
  javaScriptEnabled: true,              // JS 활성화
  bypassCSP: false,                      // CSP 우회
  userAgent: 'custom-agent',            // 커스텀 User-Agent
  acceptDownloads: true,                // 다운로드 허용
  testIdAttribute: 'data-testid',       // getByTestId 속성
  serviceWorkers: 'allow',              // 'allow' | 'block'
  offline: false,                        // 오프라인 모드

  // ── 컨텍스트 옵션 ──
  contextOptions: {
    strictSelectors: true,               // 엄격한 셀렉터 모드
  },

  // ── 연결 ──
  connectOptions: {                      // 원격 브라우저 연결
    wsEndpoint: 'ws://localhost:3000',
  },
}
```

### 트레이스 옵션 상세

```typescript
trace: 'on-first-retry',   // 문자열 단축형

// 또는 객체형
trace: {
  mode: 'on-first-retry',  // 'off' | 'on' | 'retain-on-failure'
                            // | 'on-first-retry' | 'on-all-retries'
                            // | 'retain-on-first-failure'
  screenshots: true,        // 스크린샷 포함
  snapshots: true,          // DOM 스냅샷 포함
  sources: true,            // 소스 코드 포함
  attachments: true,        // 첨부파일 포함
}
```

### 스크린샷 옵션 상세

```typescript
screenshot: 'only-on-failure',  // 문자열 단축형

// 또는 객체형
screenshot: {
  mode: 'only-on-failure',  // 'off' | 'on' | 'only-on-failure'
  fullPage: true,            // 전체 페이지 캡처
  omitBackground: false,     // 배경 제거 (투명 PNG)
}
```

### 비디오 옵션 상세

```typescript
video: 'retain-on-failure',  // 문자열 단축형

// 또는 객체형
video: {
  mode: 'retain-on-failure', // 'off' | 'on' | 'retain-on-failure' | 'on-first-retry'
  size: { width: 1280, height: 720 }, // 비디오 해상도
}
```

## 3.3 expect 옵션

```typescript
expect: {
  timeout: 5_000,                        // assertion 타임아웃 (ms)

  toHaveScreenshot: {
    maxDiffPixels: 10,                   // 최대 허용 픽셀 차이
    maxDiffPixelRatio: 0.01,             // 최대 허용 비율 (0~1)
    threshold: 0.2,                      // 픽셀 비교 임계값 (0~1)
    animations: 'disabled',             // 'allow' | 'disabled'
    caret: 'hide',                       // 'hide' | 'initial'
    scale: 'css',                        // 'css' | 'device'
  },

  toMatchSnapshot: {
    maxDiffPixels: 10,
    maxDiffPixelRatio: 0.01,
    threshold: 0.2,
  },

  toPass: {
    timeout: 60_000,                     // toPass 타임아웃
    intervals: [1000, 2000, 5000],       // 재시도 간격 (ms)
  },
}
```

## 3.4 projects 설정

```typescript
projects: [
  // 인증 셋업 프로젝트
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
    teardown: 'cleanup',                 // 해제 프로젝트
  },

  // 해제 프로젝트
  {
    name: 'cleanup',
    testMatch: /.*\.teardown\.ts/,
  },

  // 데스크톱 Chrome
  {
    name: 'chromium',
    use: { ...devices['Desktop Chrome'] },
    dependencies: ['setup'],             // 의존 프로젝트
    testDir: './tests/desktop',          // 프로젝트별 테스트 디렉토리
    testMatch: '**/*.spec.ts',           // 프로젝트별 파일 패턴
    testIgnore: '**/skip/**',            // 프로젝트별 제외 패턴
    retries: 2,                          // 프로젝트별 재시도
    timeout: 60_000,                     // 프로젝트별 타임아웃
    fullyParallel: true,                 // 프로젝트별 병렬
  },

  // 모바일 Safari
  {
    name: 'Mobile Safari',
    use: { ...devices['iPhone 13'] },
    dependencies: ['setup'],
  },

  // 브랜딩된 브라우저
  {
    name: 'Google Chrome',
    use: { ...devices['Desktop Chrome'], channel: 'chrome' },
  },
  {
    name: 'Microsoft Edge',
    use: { ...devices['Desktop Edge'], channel: 'msedge' },
  },
]
```

### 주요 devices 프리셋

```typescript
devices['Desktop Chrome']
devices['Desktop Firefox']
devices['Desktop Safari']
devices['Desktop Edge']
devices['iPhone 13']
devices['iPhone 13 Pro Max']
devices['iPhone 14']
devices['iPad (gen 7)']
devices['iPad Pro 11']
devices['Pixel 5']
devices['Pixel 7']
devices['Galaxy S9+']
```

## 3.5 webServer 설정

```typescript
// 단일 서버
webServer: {
  command: 'npm run start',              // 서버 시작 명령어
  url: 'http://localhost:3000',          // 서버 URL (준비 확인용)
  port: 3000,                           // 또는 포트로 확인
  reuseExistingServer: !process.env.CI,  // 기존 서버 재사용
  timeout: 120_000,                      // 서버 시작 타임아웃 (ms)
  cwd: './backend',                      // 작업 디렉토리
  env: {                                 // 환경변수
    DATABASE_URL: 'postgres://...',
  },
  stdout: 'pipe',                        // 'pipe' | 'ignore'
  stderr: 'pipe',                        // 'pipe' | 'ignore'
},

// 다중 서버
webServer: [
  {
    command: 'npm run start:api',
    url: 'http://localhost:4000',
    reuseExistingServer: !process.env.CI,
  },
  {
    command: 'npm run start:web',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
],
```

## 3.6 reporter 설정

```typescript
// 단일 리포터
reporter: 'html',

// 다중 리포터
reporter: [
  ['list'],
  ['html', { open: 'never' }],
  ['json', { outputFile: 'results.json' }],
  ['junit', { outputFile: 'results.xml' }],
],

// CI 조건부
reporter: process.env.CI
  ? [['dot'], ['blob']]
  : [['list'], ['html']],
```

## 3.7 TypeScript 설정

```typescript
// playwright.config.ts 내에서 tsconfig 지정 (선택)
// CLI: npx playwright test --tsconfig=tsconfig.test.json

// Playwright가 지원하는 tsconfig 옵션:
// - allowJs
// - baseUrl
// - paths
// - references
```

추천 tsconfig.json (테스트용):

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["tests/**/*.ts", "playwright.config.ts"]
}
```
