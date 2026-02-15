# 09. 인증 전략 및 storageState

## 9.1 인증 전략 개요

| 전략 | 언제 사용 | 서버 상태 수정 |
|------|-----------|---------------|
| 공유 계정 (기본) | 서버 상태를 변경하지 않는 테스트 | 없음 |
| 워커별 계정 | 서버 상태를 변경하는 테스트 | 있음 |
| 다중 역할 | 역할별 권한 테스트 | 다양 |

## 9.2 전략 1: 공유 계정 (권장)

### 셋업 프로젝트

```typescript
// tests/auth.setup.ts
import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('인증', async ({ page }) => {
  // 1. 로그인 페이지 이동
  await page.goto('/login');

  // 2. 로그인 폼 작성
  await page.getByLabel('이메일').fill('user@example.com');
  await page.getByLabel('비밀번호').fill('password123');
  await page.getByRole('button', { name: '로그인' }).click();

  // 3. 로그인 성공 확인
  await page.waitForURL('/dashboard');
  await expect(page.getByRole('button', { name: '프로필' })).toBeVisible();

  // 4. 인증 상태 저장
  await page.context().storageState({ path: authFile });
});
```

### 설정

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    // 셋업 프로젝트 (먼저 실행)
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // 인증된 상태로 테스트 실행
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],  // setup 완료 후 실행
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
});
```

### 테스트 파일

```typescript
// tests/dashboard.spec.ts
import { test, expect } from '@playwright/test';

// page는 이미 인증된 상태
test('대시보드 접근', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('환영합니다')).toBeVisible();
});
```

### .gitignore

```
playwright/.auth/
```

## 9.3 전략 2: 워커별 계정

```typescript
// playwright/fixtures.ts
import { test as baseTest, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export * from '@playwright/test';

export const test = baseTest.extend<{}, { workerStorageState: string }>({
  // 모든 테스트가 이 storageState 사용
  storageState: ({ workerStorageState }, use) => use(workerStorageState),

  // 워커당 1번 실행
  workerStorageState: [async ({ browser }, use) => {
    const id = test.info().parallelIndex;
    const fileName = path.resolve(
      test.info().project.outputDir,
      `.auth/${id}.json`
    );

    // 이미 인증됨
    if (fs.existsSync(fileName)) {
      await use(fileName);
      return;
    }

    // 새로 인증
    const page = await browser.newPage({ storageState: undefined });
    const account = await getTestAccount(id); // 워커별 계정 할당

    await page.goto('/login');
    await page.getByLabel('이메일').fill(account.email);
    await page.getByLabel('비밀번호').fill(account.password);
    await page.getByRole('button', { name: '로그인' }).click();
    await page.waitForURL('/dashboard');

    await page.context().storageState({ path: fileName });
    await page.close();
    await use(fileName);
  }, { scope: 'worker' }],
});

async function getTestAccount(workerIndex: number) {
  const accounts = [
    { email: 'test1@example.com', password: 'pass1' },
    { email: 'test2@example.com', password: 'pass2' },
    { email: 'test3@example.com', password: 'pass3' },
  ];
  return accounts[workerIndex % accounts.length];
}
```

```typescript
// tests/state-modifying.spec.ts
import { test, expect } from '../playwright/fixtures';

test('게시글 작성', async ({ page }) => {
  // 워커별 독립된 계정으로 인증됨
  await page.goto('/posts/new');
  await page.getByLabel('제목').fill('테스트 게시글');
  await page.getByRole('button', { name: '작성' }).click();
  await expect(page).toHaveURL(/\/posts\/\d+/);
});
```

## 9.4 전략 3: 다중 역할

### 셋업

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

const ADMIN_FILE = 'playwright/.auth/admin.json';
const USER_FILE = 'playwright/.auth/user.json';

setup('관리자 인증', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('admin@example.com');
  await page.getByLabel('비밀번호').fill('admin-pass');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('/admin');
  await page.context().storageState({ path: ADMIN_FILE });
});

setup('일반 사용자 인증', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('user@example.com');
  await page.getByLabel('비밀번호').fill('user-pass');
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: USER_FILE });
});
```

### 역할별 테스트

```typescript
// tests/admin.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/admin.json' });

test('관리자 패널 접근', async ({ page }) => {
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '관리자' })).toBeVisible();
});

// tests/user.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'playwright/.auth/user.json' });

test('일반 사용자 대시보드', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('환영합니다')).toBeVisible();
});
```

### 동일 테스트에서 다중 역할

```typescript
test('관리자와 사용자 상호작용', async ({ browser }) => {
  // 관리자 컨텍스트
  const adminContext = await browser.newContext({
    storageState: 'playwright/.auth/admin.json',
  });
  const adminPage = await adminContext.newPage();

  // 사용자 컨텍스트
  const userContext = await browser.newContext({
    storageState: 'playwright/.auth/user.json',
  });
  const userPage = await userContext.newPage();

  // 관리자가 공지 작성
  await adminPage.goto('/admin/notices/new');
  await adminPage.getByLabel('제목').fill('중요 공지');
  await adminPage.getByRole('button', { name: '게시' }).click();

  // 사용자가 공지 확인
  await userPage.goto('/notices');
  await expect(userPage.getByText('중요 공지')).toBeVisible();

  await adminContext.close();
  await userContext.close();
});
```

## 9.5 API 기반 인증

```typescript
// tests/auth.setup.ts
import { test as setup } from '@playwright/test';

setup('API 인증', async ({ request }) => {
  // API로 로그인
  await request.post('/api/auth/login', {
    form: {
      email: 'user@example.com',
      password: 'password123',
    },
  });

  // 인증 상태 저장
  await request.storageState({ path: 'playwright/.auth/user.json' });
});
```

## 9.6 인증 해제 (비로그인 테스트)

```typescript
test.describe('비로그인 테스트', () => {
  // 인증 상태 초기화
  test.use({ storageState: { cookies: [], origins: [] } });

  test('로그인 페이지 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('회원가입 페이지', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
  });
});
```

## 9.7 Session Storage 처리

```typescript
// Session Storage는 storageState에 포함되지 않으므로 수동 처리 필요

// 저장
const sessionStorage = await page.evaluate(() =>
  JSON.stringify(sessionStorage)
);
fs.writeFileSync('playwright/.auth/session.json', sessionStorage, 'utf-8');

// 복원
const sessionData = JSON.parse(
  fs.readFileSync('playwright/.auth/session.json', 'utf-8')
);
await context.addInitScript((storage) => {
  if (window.location.hostname === 'example.com') {
    for (const [key, value] of Object.entries(storage)) {
      window.sessionStorage.setItem(key, value as string);
    }
  }
}, sessionData);
```

## 9.8 POM + 다중 역할 픽스처

```typescript
// playwright/fixtures.ts
import { test as base, type Page, type Locator } from '@playwright/test';

class AdminPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly userList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: '관리자' });
    this.userList = page.getByRole('list', { name: '사용자' });
  }

  async goto() {
    await this.page.goto('/admin');
  }
}

class UserDashboard {
  readonly page: Page;
  readonly welcome: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcome = page.getByText('환영합니다');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }
}

type Fixtures = {
  adminPage: AdminPage;
  userDashboard: UserDashboard;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await ctx.newPage();
    await use(new AdminPage(page));
    await ctx.close();
  },

  userDashboard: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
    });
    const page = await ctx.newPage();
    await use(new UserDashboard(page));
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
```

```typescript
// tests/multi-role.spec.ts
import { test, expect } from '../playwright/fixtures';

test('관리자와 사용자', async ({ adminPage, userDashboard }) => {
  await adminPage.goto();
  await expect(adminPage.heading).toBeVisible();

  await userDashboard.goto();
  await expect(userDashboard.welcome).toBeVisible();
});
```
