# 04. Test API 전체 레퍼런스

## 4.1 테스트 선언

### test(title, body)

```typescript
import { test, expect } from '@playwright/test';

// 기본 테스트
test('사용자가 로그인할 수 있다', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('user@example.com');
  await page.getByLabel('비밀번호').fill('password123');
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL('/dashboard');
});
```

### test(title, details, body)

```typescript
// 태그와 어노테이션 포함
test('관리자 페이지 접근', {
  tag: ['@admin', '@critical'],
  annotation: {
    type: 'issue',
    description: 'https://github.com/org/repo/issues/123',
  },
}, async ({ page }) => {
  await page.goto('/admin');
  await expect(page).toHaveTitle('Admin Panel');
});

// 태그로 필터링 실행
// npx playwright test --grep @admin
// npx playwright test --grep @critical
```

## 4.2 테스트 그룹 (describe)

### test.describe(title, callback)

```typescript
test.describe('로그인 기능', () => {
  test('유효한 자격증명으로 로그인', async ({ page }) => {
    // ...
  });

  test('잘못된 비밀번호로 실패', async ({ page }) => {
    // ...
  });
});
```

### test.describe(title, details, callback)

```typescript
test.describe('결제 시스템', { tag: '@payment' }, () => {
  test('카드 결제 성공', async ({ page }) => { /* ... */ });
  test('포인트 결제 성공', async ({ page }) => { /* ... */ });
});
```

### test.describe.configure(options)

```typescript
// 병렬 실행
test.describe.configure({ mode: 'parallel' });

// 직렬 실행 (하나 실패 시 나머지 스킵)
test.describe.configure({ mode: 'serial' });

// 기본 모드 (순차적이지만 독립적)
test.describe.configure({ mode: 'default' });

// 타임아웃/재시도 설정
test.describe.configure({ timeout: 60_000, retries: 3 });
```

### test.describe.skip / fixme / only

```typescript
// 그룹 전체 건너뛰기
test.describe.skip('미구현 기능', () => {
  test('아직 안 됨', async ({ page }) => { /* ... */ });
});

// 수정 예정 표시
test.describe.fixme('버그 수정 필요', () => {
  test('깨진 테스트', async ({ page }) => { /* ... */ });
});

// 이 그룹만 실행
test.describe.only('디버깅 중', () => {
  test('이것만 실행됨', async ({ page }) => { /* ... */ });
});
```

## 4.3 라이프사이클 훅

### beforeAll / afterAll (워커당 1번)

```typescript
test.describe('데이터베이스 테스트', () => {
  let dbConnection;

  test.beforeAll(async () => {
    dbConnection = await connectToDatabase();
    await dbConnection.seed();
  });

  test.afterAll(async () => {
    await dbConnection.cleanup();
    await dbConnection.close();
  });

  test('사용자 조회', async ({ page }) => {
    // dbConnection 사용 가능
  });
});
```

### beforeEach / afterEach (테스트마다)

```typescript
test.describe('상품 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test.afterEach(async ({ page }, testInfo) => {
    // 실패 시 스크린샷 저장
    if (testInfo.status !== testInfo.expectedStatus) {
      await page.screenshot({
        path: `screenshots/${testInfo.title}.png`
      });
    }
  });

  test('상품 목록 표시', async ({ page }) => {
    await expect(page.getByRole('list')).toBeVisible();
  });
});
```

### 이름 있는 훅 (v1.38+)

```typescript
test.beforeEach('페이지 이동', async ({ page }) => {
  await page.goto('/');
});

test.afterEach('정리', async ({ page }) => {
  await page.evaluate(() => localStorage.clear());
});
```

## 4.4 테스트 수정자 (Modifiers)

### test.skip()

```typescript
// 테스트 전체 건너뛰기
test.skip('미구현 기능', async ({ page }) => {
  // 이 코드는 실행되지 않음
});

// 조건부 건너뛰기
test('Firefox 전용 기능', async ({ page, browserName }) => {
  test.skip(browserName !== 'firefox', 'Firefox에서만 동작');
  // Firefox에서만 이 아래가 실행됨
});

// 테스트 내부에서 건너뛰기
test('조건부 테스트', async ({ page }) => {
  const hasFeature = await page.evaluate(() => !!window.feature);
  test.skip(!hasFeature, '이 기능이 없으면 스킵');
});
```

### test.fixme()

```typescript
// 수정 예정 표시
test.fixme('버그 있음 - 수정 필요', async ({ page }) => {
  // 실행되지 않음, 리포트에 fixme로 표시
});

// 조건부 fixme
test('불안정한 테스트', async ({ page, browserName }) => {
  test.fixme(browserName === 'webkit', 'WebKit에서 불안정');
});
```

### test.slow()

```typescript
// 느린 테스트 (타임아웃 3배)
test('대용량 데이터 처리', async ({ page }) => {
  test.slow();
  // 기본 30초 → 90초 타임아웃
  await page.goto('/process-large-data');
  await expect(page.getByText('완료')).toBeVisible();
});

// 조건부 slow
test('CI에서 느린 테스트', async ({ page }) => {
  test.slow(!!process.env.CI, 'CI 환경에서 느림');
});
```

### test.fail()

```typescript
// 실패가 예상되는 테스트
test('알려진 버그', async ({ page }) => {
  test.fail();
  // 이 테스트가 실제로 실패하면 → 통과
  // 이 테스트가 성공하면 → 실패 (버그가 수정됨을 감지)
});

// 조건부 fail
test('특정 환경에서 알려진 실패', async ({ page, browserName }) => {
  test.fail(browserName === 'webkit', 'WebKit 이슈 #456');
});
```

### test.only()

```typescript
// 이 테스트만 실행
test.only('디버깅 중인 테스트', async ({ page }) => {
  await page.goto('/');
});

// CI에서 test.only 방지:
// npx playwright test --forbid-only
```

## 4.5 테스트 스텝 (Steps)

```typescript
test('주문 프로세스', async ({ page }) => {
  await test.step('장바구니에 상품 추가', async () => {
    await page.goto('/products');
    await page.getByRole('button', { name: '장바구니' }).click();
  });

  await test.step('결제 진행', async () => {
    await page.goto('/checkout');
    await page.getByLabel('카드 번호').fill('4111111111111111');
    await page.getByRole('button', { name: '결제' }).click();
  });

  // 반환값 사용
  const orderId = await test.step('주문 확인', async () => {
    await expect(page.getByText('주문 완료')).toBeVisible();
    return await page.getByTestId('order-id').textContent();
  });

  console.log(`주문 ID: ${orderId}`);
});
```

### 스텝 옵션

```typescript
// box: true - 에러 시 스텝 내부 스택 숨김
await test.step('API 호출', async () => {
  // ...
}, { box: true });

// timeout - 스텝 타임아웃
await test.step('느린 작업', async () => {
  // ...
}, { timeout: 60_000 });

// 스텝 건너뛰기 (v1.50+)
await test.step.skip('미구현', async () => {
  // 실행되지 않음
});
```

## 4.6 test.use()

```typescript
// 파일 레벨 설정 오버라이드
test.use({ locale: 'ko-KR', timezoneId: 'Asia/Seoul' });

test('한국어 페이지', async ({ page }) => {
  // ko-KR 로케일로 실행됨
});

// describe 블록 레벨 오버라이드
test.describe('모바일 테스트', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('모바일 레이아웃', async ({ page }) => {
    // 375x667 뷰포트로 실행됨
  });
});

// storageState 오버라이드 (인증 해제)
test.describe('비로그인 테스트', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('로그인 페이지 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/login');
  });
});
```

## 4.7 test.extend()

```typescript
// 커스텀 픽스처 정의
import { test as base, expect } from '@playwright/test';

type MyFixtures = {
  todoPage: TodoPage;
};

export const test = base.extend<MyFixtures>({
  todoPage: async ({ page }, use) => {
    const todoPage = new TodoPage(page);
    await todoPage.goto();
    await todoPage.addDefaultItems();
    await use(todoPage);          // ← 테스트에서 사용
    await todoPage.cleanup();      // ← 정리 (teardown)
  },
});

// 사용
test('할일 추가', async ({ todoPage }) => {
  await todoPage.addItem('새 할일');
  await todoPage.expectItemCount(4);
});
```

## 4.8 test.setTimeout()

```typescript
test('장시간 테스트', async ({ page }) => {
  test.setTimeout(120_000);  // 2분 타임아웃
  // ...
});

// 타임아웃 해제
test('무제한 테스트', async ({ page }) => {
  test.setTimeout(0);
  // ...
});
```

## 4.9 test.info()

```typescript
test('테스트 정보 활용', async ({ page }) => {
  const info = test.info();

  console.log(info.title);           // 테스트 제목
  console.log(info.titlePath);       // [describe1, describe2, title]
  console.log(info.project.name);    // 프로젝트 이름
  console.log(info.retry);           // 현재 재시도 횟수
  console.log(info.workerIndex);     // 워커 인덱스
  console.log(info.parallelIndex);   // 병렬 인덱스
  console.log(info.outputDir);       // 출력 디렉토리
  console.log(info.snapshotDir);     // 스냅샷 디렉토리

  // 파일 첨부
  await info.attach('screenshot', {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  // 어노테이션 추가
  info.annotations.push({
    type: 'issue',
    description: 'JIRA-123',
  });

  // 출력 경로 생성
  const filePath = info.outputPath('data.json');
  const snapshotPath = info.snapshotPath('baseline.png');
});
```
