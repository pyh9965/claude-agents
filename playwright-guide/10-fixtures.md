# 10. 픽스처 시스템

## 10.1 내장 픽스처

| 픽스처 | 타입 | 범위 | 설명 |
|--------|------|------|------|
| `page` | `Page` | 테스트 | 격리된 페이지 (각 테스트마다 새로 생성) |
| `context` | `BrowserContext` | 테스트 | 격리된 브라우저 컨텍스트 |
| `browser` | `Browser` | 워커 | 공유 브라우저 인스턴스 |
| `browserName` | `string` | 워커 | 현재 브라우저 이름 (`chromium`/`firefox`/`webkit`) |
| `request` | `APIRequestContext` | 테스트 | API 요청 인스턴스 |

```typescript
import { test, expect } from '@playwright/test';

test('내장 픽스처 사용', async ({
  page,           // 격리된 페이지
  context,        // 격리된 컨텍스트
  browser,        // 공유 브라우저
  browserName,    // 'chromium' | 'firefox' | 'webkit'
  request,        // API 요청
}) => {
  console.log(`Running on ${browserName}`);

  // page 사용
  await page.goto('/');

  // context에서 새 페이지 생성
  const newPage = await context.newPage();
  await newPage.goto('/other');

  // API 요청
  const response = await request.get('/api/status');
  expect(response.ok()).toBeTruthy();
});
```

## 10.2 커스텀 픽스처 만들기

### 기본 구조

```typescript
// playwright/fixtures.ts
import { test as base, expect } from '@playwright/test';

// 타입 정의
type MyFixtures = {
  todoPage: TodoPage;
  apiClient: ApiClient;
};

// 픽스처 확장
export const test = base.extend<MyFixtures>({
  // 각 픽스처는: async (의존성, use) => { 셋업 → use → 정리 }
  todoPage: async ({ page }, use) => {
    // 셋업 (Setup)
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addDefaultItems();

    // 테스트에서 사용
    await use(todoPage);

    // 정리 (Teardown) - use() 이후 실행
    await todoPage.removeAllItems();
  },

  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
    await client.cleanup();
  },
});

export { expect };
```

### Page Object Model (POM)

```typescript
// models/TodoPage.ts
import { type Page, type Locator, expect } from '@playwright/test';

export class TodoPage {
  readonly page: Page;
  readonly input: Locator;
  readonly items: Locator;
  readonly clearButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.input = page.getByPlaceholder('할 일을 입력하세요');
    this.items = page.getByRole('listitem');
    this.clearButton = page.getByRole('button', { name: '모두 삭제' });
  }

  async goto() {
    await this.page.goto('/todos');
  }

  async addItem(text: string) {
    await this.input.fill(text);
    await this.input.press('Enter');
  }

  async removeItem(text: string) {
    await this.items
      .filter({ hasText: text })
      .getByRole('button', { name: '삭제' })
      .click();
  }

  async addDefaultItems() {
    await this.addItem('아침 운동');
    await this.addItem('코드 리뷰');
    await this.addItem('회의 참석');
  }

  async removeAllItems() {
    if (await this.clearButton.isVisible()) {
      await this.clearButton.click();
    }
  }

  async expectItemCount(count: number) {
    await expect(this.items).toHaveCount(count);
  }

  async expectItemText(index: number, text: string) {
    await expect(this.items.nth(index)).toHaveText(text);
  }
}
```

### 사용

```typescript
// tests/todo.spec.ts
import { test, expect } from '../playwright/fixtures';

test('할 일 추가', async ({ todoPage }) => {
  await todoPage.addItem('새 할일');
  await todoPage.expectItemCount(4); // 기본 3개 + 1개
});

test('할 일 삭제', async ({ todoPage }) => {
  await todoPage.removeItem('아침 운동');
  await todoPage.expectItemCount(2);
});
```

## 10.3 워커 범위 픽스처

```typescript
// 워커당 1번만 실행 (비싼 리소스용)
type WorkerFixtures = {
  dbConnection: DatabaseConnection;
  testServer: TestServer;
};

export const test = base.extend<{}, WorkerFixtures>({
  dbConnection: [async ({}, use) => {
    // 셋업 (워커 시작 시 1번)
    const db = await DatabaseConnection.create({
      host: 'localhost',
      database: `test_${test.info().workerIndex}`,
    });
    await db.migrate();

    // 테스트들에서 사용
    await use(db);

    // 정리 (워커 종료 시 1번)
    await db.drop();
    await db.close();
  }, { scope: 'worker' }],

  testServer: [async ({}, use) => {
    const server = await TestServer.start();
    await use(server);
    await server.stop();
  }, { scope: 'worker' }],
});
```

## 10.4 자동 픽스처

```typescript
// auto: true → 모든 테스트에서 자동 실행 (명시적 요청 불필요)
export const test = base.extend<{
  saveLogs: void;
  captureFailures: void;
}>({
  // 실패 시 로그 저장
  saveLogs: [async ({}, use, testInfo) => {
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    await use();

    // 실패 시만 로그 첨부
    if (testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach('console-logs', {
        body: logs.join('\n'),
        contentType: 'text/plain',
      });
    }

    console.log = originalLog;
  }, { auto: true }],

  // 실패 시 스크린샷 첨부
  captureFailures: [async ({ page }, use, testInfo) => {
    await use();

    if (testInfo.status !== testInfo.expectedStatus) {
      const screenshot = await page.screenshot({ fullPage: true });
      await testInfo.attach('failure-screenshot', {
        body: screenshot,
        contentType: 'image/png',
      });
    }
  }, { auto: true }],
});
```

## 10.5 픽스처 옵션

```typescript
// 설정 가능한 옵션 픽스처
type MyOptions = {
  defaultUser: string;
  locale: string;
};

export const test = base.extend<MyOptions & { userPage: UserPage }>({
  // 옵션 정의 (기본값)
  defaultUser: ['guest', { option: true }],
  locale: ['ko-KR', { option: true }],

  // 옵션을 사용하는 픽스처
  userPage: async ({ page, defaultUser, locale }, use) => {
    await page.goto(`/${locale}/users/${defaultUser}`);
    await use(new UserPage(page));
  },
});
```

### 프로젝트별 옵션 설정

```typescript
// playwright.config.ts
export default defineConfig({
  projects: [
    {
      name: 'Korean',
      use: {
        defaultUser: '홍길동',
        locale: 'ko-KR',
      },
    },
    {
      name: 'English',
      use: {
        defaultUser: 'John Doe',
        locale: 'en-US',
      },
    },
  ],
});
```

## 10.6 픽스처 오버라이드

```typescript
// 내장 픽스처 오버라이드
export const test = base.extend({
  // page 픽스처 오버라이드 - 매번 baseURL로 이동
  page: async ({ baseURL, page }, use) => {
    await page.goto(baseURL!);
    await use(page);
  },

  // context 오버라이드 - 항상 로케일 설정
  context: async ({ context }, use) => {
    await context.addCookies([{
      name: 'locale',
      value: 'ko-KR',
      domain: 'localhost',
      path: '/',
    }]);
    await use(context);
  },
});
```

## 10.7 픽스처 병합

```typescript
// 여러 픽스처 세트 병합
import { mergeTests } from '@playwright/test';
import { test as dbTest } from './db-fixtures';
import { test as authTest } from './auth-fixtures';
import { test as a11yTest } from './a11y-fixtures';

export const test = mergeTests(dbTest, authTest, a11yTest);

// 사용
test('통합 테스트', async ({ db, adminPage, checkA11y }) => {
  await adminPage.goto();
  await checkA11y();
  const users = await db.query('SELECT * FROM users');
  expect(users.length).toBeGreaterThan(0);
});
```

## 10.8 픽스처 타임아웃

```typescript
// 느린 픽스처에 별도 타임아웃 설정
export const test = base.extend({
  slowDatabase: [async ({}, use) => {
    const db = await connectToRemoteDB(); // 느릴 수 있음
    await use(db);
    await db.close();
  }, { timeout: 60_000 }], // 60초 타임아웃
});
```

## 10.9 Box 픽스처 (리포트에서 숨기기)

```typescript
export const test = base.extend({
  // 리포트에서 완전히 숨김
  hiddenFixture: [async ({}, use) => {
    await use('value');
  }, { box: true }],

  // 픽스처 단계만 숨김 (내부 단계는 표시)
  semiHidden: [async ({}, use) => {
    await use('value');
  }, { box: 'self' }],

  // 커스텀 제목
  namedFixture: [async ({}, use) => {
    await use('value');
  }, { title: 'Database Setup' }],
});
```

## 10.10 실행 순서

1. 워커 범위 픽스처 셋업
2. 자동 픽스처 셋업 (auto: true)
3. 테스트 범위 픽스처 셋업 (의존 순서대로)
4. beforeEach 훅
5. **테스트 실행**
6. afterEach 훅
7. 테스트 범위 픽스처 정리 (역순)
8. (워커 종료 시) 워커 범위 픽스처 정리
