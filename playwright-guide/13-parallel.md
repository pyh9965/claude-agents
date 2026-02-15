# 13. 병렬 실행, 샤딩, 직렬 모드

## 13.1 워커와 병렬 실행 개요

- Playwright는 **워커 프로세스**를 사용해 테스트를 병렬 실행
- 각 워커는 독립적인 브라우저 인스턴스 보유
- 기본: 파일 간 병렬, 파일 내 순차

## 13.2 Workers 설정

```typescript
// playwright.config.ts
export default defineConfig({
  // 숫자로 지정
  workers: 4,

  // CPU 비율로 지정
  workers: '50%',        // CPU 코어의 50%

  // CI에서는 1개, 로컬은 자동
  workers: process.env.CI ? 1 : undefined,
});
```

```bash
# CLI에서 지정
npx playwright test --workers=4
npx playwright test --workers=50%
npx playwright test -j 4
```

## 13.3 fullyParallel 모드

```typescript
// 글로벌 설정: 모든 파일의 모든 테스트 병렬
export default defineConfig({
  fullyParallel: true,
});

// 프로젝트별 설정
projects: [
  {
    name: 'chromium',
    fullyParallel: true,   // 이 프로젝트만 완전 병렬
  },
  {
    name: 'firefox',
    fullyParallel: false,  // 파일 내 순차
  },
],
```

```bash
# CLI에서 활성화
npx playwright test --fully-parallel
```

## 13.4 파일 내 병렬/직렬 제어

### 병렬 모드

```typescript
// 파일 내 모든 테스트를 병렬로 실행
test.describe.configure({ mode: 'parallel' });

test('테스트 1', async ({ page }) => { /* ... */ });
test('테스트 2', async ({ page }) => { /* ... */ });
test('테스트 3', async ({ page }) => { /* ... */ });
// → 모두 동시에 실행
```

### 직렬 모드 (Serial)

```typescript
// 순차 실행 + 하나 실패 시 나머지 건너뜀
test.describe.configure({ mode: 'serial' });

test('1단계: 로그인', async ({ page }) => {
  // 실패하면 아래 테스트 모두 건너뜀
});

test('2단계: 설정 변경', async ({ page }) => {
  // 1단계 성공 후 실행
});

test('3단계: 확인', async ({ page }) => {
  // 2단계 성공 후 실행
});
```

### 기본 모드

```typescript
// 순차 실행, 각 테스트 독립적 (실패해도 계속)
test.describe.configure({ mode: 'default' });

test('독립 테스트 1', async ({ page }) => { /* ... */ });
test('독립 테스트 2', async ({ page }) => { /* ... */ });
// → 순서대로 실행, 1 실패해도 2 실행
```

### 중첩 describe에서 모드 설정

```typescript
test.describe('외부', () => {
  test.describe.configure({ mode: 'parallel' });

  test.describe('그룹 A', () => {
    test.describe.configure({ mode: 'serial' });
    test('A-1', async ({ page }) => { /* ... */ });
    test('A-2', async ({ page }) => { /* ... */ });
    // A-1 → A-2 순차 실행
  });

  test.describe('그룹 B', () => {
    test.describe.configure({ mode: 'serial' });
    test('B-1', async ({ page }) => { /* ... */ });
    test('B-2', async ({ page }) => { /* ... */ });
    // B-1 → B-2 순차 실행
  });

  // 그룹 A와 그룹 B는 병렬 실행
});
```

## 13.5 샤딩 (Sharding)

여러 머신에 테스트 분배.

```bash
# 3개 머신으로 분할
# 머신 1
npx playwright test --shard=1/3

# 머신 2
npx playwright test --shard=2/3

# 머신 3
npx playwright test --shard=3/3
```

### CI에서 샤딩 (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Playwright Tests
on: [push, pull_request]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1/4, 2/4, 3/4, 4/4]  # 4개 샤드
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps

      - name: Run tests
        run: npx playwright test --shard=${{ matrix.shard }}

      - name: Upload blob report
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: blob-report-${{ strategy.job-index }}
          path: blob-report
          retention-days: 1

  merge-reports:
    if: ${{ !cancelled() }}
    needs: [test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci

      - name: Download blob reports
        uses: actions/download-artifact@v4
        with:
          path: all-blob-reports
          pattern: blob-report-*
          merge-multiple: true

      - name: Merge reports
        run: npx playwright merge-reports --reporter=html all-blob-reports

      - name: Upload HTML report
        uses: actions/upload-artifact@v4
        with:
          name: html-report
          path: playwright-report
          retention-days: 14
```

### 샤딩 + Blob 리포터

```typescript
// playwright.config.ts (CI용)
reporter: process.env.CI
  ? [['blob'], ['github']]
  : [['list'], ['html']],
```

## 13.6 maxFailures (조기 중단)

```typescript
// N개 실패 후 중단
export default defineConfig({
  maxFailures: process.env.CI ? 10 : 0, // 0 = 무제한
});
```

```bash
# CLI
npx playwright test --max-failures=5
npx playwright test -x  # 1개 실패 시 즉시 중단
```

## 13.7 재시도 (Retries)

```typescript
// playwright.config.ts
export default defineConfig({
  retries: process.env.CI ? 2 : 0,
});
```

```bash
# CLI
npx playwright test --retries=3
```

### 재시도 시 동작

```typescript
test('재시도 인식 테스트', async ({ page }) => {
  const info = test.info();
  console.log(`시도 ${info.retry + 1} / ${info.project.retries + 1}`);

  if (info.retry > 0) {
    // 재시도 시 다른 전략 사용
  }
});
```

### describe 레벨 재시도

```typescript
test.describe(() => {
  test.describe.configure({ retries: 3 });

  test('불안정한 테스트', async ({ page }) => {
    // 이 describe 내에서만 3번 재시도
  });
});
```

## 13.8 테스트 격리

```typescript
// 워커 인덱스 활용
test('격리된 데이터', async ({ page }) => {
  const workerIndex = test.info().workerIndex;
  const parallelIndex = test.info().parallelIndex;

  // 워커별 고유 데이터 사용
  const userId = `test-user-${workerIndex}`;
  const dbName = `test_db_${parallelIndex}`;
});
```

환경변수:
- `TEST_WORKER_INDEX` - 워커 고유 인덱스
- `TEST_PARALLEL_INDEX` - 병렬 인덱스 (0부터)

## 13.9 프로젝트 의존성

```typescript
// playwright.config.ts
projects: [
  // 셋업 (먼저 실행)
  {
    name: 'setup',
    testMatch: /.*\.setup\.ts/,
    teardown: 'cleanup',  // 해제 프로젝트
  },

  // 해제 (마지막에 실행)
  {
    name: 'cleanup',
    testMatch: /.*\.teardown\.ts/,
  },

  // 실제 테스트 (setup 완료 후)
  {
    name: 'e2e tests',
    dependencies: ['setup'],
  },
],
```

```bash
# 의존성 무시하고 실행
npx playwright test --no-deps
```

## 13.10 실전 병렬화 전략

### 빠른 피드백 (개발 중)

```typescript
export default defineConfig({
  workers: '75%',
  fullyParallel: true,
  retries: 0,
  maxFailures: 1,  // 빠른 실패
});
```

### 안정적 CI

```typescript
export default defineConfig({
  workers: 2,
  fullyParallel: true,
  retries: 2,
  reporter: [['blob'], ['github']],
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
});
```

### 데이터 의존 테스트

```typescript
// 순차 실행이 필요한 경우
test.describe('주문 프로세스', () => {
  test.describe.configure({ mode: 'serial' });

  test('장바구니 추가', async ({ page }) => { /* ... */ });
  test('결제 진행', async ({ page }) => { /* ... */ });
  test('주문 확인', async ({ page }) => { /* ... */ });
});
```
