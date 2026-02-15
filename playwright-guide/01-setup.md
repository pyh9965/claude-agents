# 01. 설치 및 초기 설정

## 1.1 신규 프로젝트 생성

```bash
# 대화형 설치 (권장)
npm init playwright@latest

# 선택 항목:
# - TypeScript / JavaScript
# - 테스트 디렉토리 (기본: tests 또는 e2e)
# - GitHub Actions workflow 추가 여부
# - 브라우저 설치 여부
```

## 1.2 기존 프로젝트에 추가

```bash
npm i -D @playwright/test

# 브라우저 설치
npx playwright install
```

## 1.3 브라우저 설치 명령어

```bash
# 모든 브라우저 설치
npx playwright install

# 특정 브라우저만 설치
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit

# 시스템 의존성도 함께 설치 (Linux)
npx playwright install --with-deps

# 특정 브라우저 + 시스템 의존성
npx playwright install chromium --with-deps

# 강제 재설치
npx playwright install --force

# headless shell만 설치
npx playwright install --only-shell

# headless shell 제외
npx playwright install --no-shell

# 설치 미리보기 (실제 설치 안 함)
npx playwright install --dry-run

# 시스템 의존성만 설치
npx playwright install-deps
npx playwright install-deps chromium

# 브라우저 제거
npx playwright uninstall        # Playwright가 설치한 브라우저 제거
npx playwright uninstall --all  # 모든 버전의 브라우저 제거

# 캐시 삭제
npx playwright clear-cache
```

## 1.4 프로젝트 구조

```
project-root/
├── playwright.config.ts          # 핵심 설정 파일
├── package.json
├── tests/                        # 테스트 파일 디렉토리
│   ├── example.spec.ts           # 테스트 파일 (.spec.ts)
│   └── auth.setup.ts             # 인증 셋업 파일
├── playwright/.auth/             # 인증 상태 저장 (gitignore)
├── test-results/                 # 테스트 결과물 (스크린샷, 비디오 등)
└── playwright-report/            # HTML 리포트 출력
```

## 1.5 기본 playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 1.6 첫 번째 테스트 작성

```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('페이지 타이틀 확인', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});

test('로그인 버튼 클릭', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL(/.*login/);
});
```

## 1.7 VS Code 확장

```
Name: Playwright Test for VSCode
ID: ms-playwright.playwright
```

기능:
- 테스트 실행/디버깅
- 코드 생성 (Record)
- 로케이터 선택 (Pick Locator)
- Trace Viewer 통합
