# 06. Assertion 전체 레퍼런스

## 6.1 자동 재시도 Assertion (Auto-Retrying)

조건이 충족될 때까지 자동 재시도한다. 기본 타임아웃: 5초.

### 가시성 & 상태

```typescript
// 표시 여부
await expect(locator).toBeVisible();
await expect(locator).toBeVisible({ visible: true });
await expect(locator).toBeVisible({ timeout: 10_000 });
await expect(locator).toBeHidden();

// DOM 연결
await expect(locator).toBeAttached();
await expect(locator).toBeAttached({ attached: false }); // detached

// 활성/비활성
await expect(locator).toBeEnabled();
await expect(locator).toBeEnabled({ enabled: true });
await expect(locator).toBeDisabled();

// 편집 가능
await expect(locator).toBeEditable();
await expect(locator).toBeEditable({ editable: false });

// 체크 상태
await expect(locator).toBeChecked();
await expect(locator).toBeChecked({ checked: false }); // unchecked

// 포커스
await expect(locator).toBeFocused();

// 뷰포트 내
await expect(locator).toBeInViewport();
await expect(locator).toBeInViewport({ ratio: 0.5 }); // 50% 이상 보임

// 비어있음
await expect(locator).toBeEmpty();
```

### 텍스트 콘텐츠

```typescript
// 정확한 텍스트
await expect(locator).toHaveText('안녕하세요');
await expect(locator).toHaveText(/안녕/);  // 정규식

// 부분 일치
await expect(locator).toContainText('안녕');
await expect(locator).toContainText(/안녕/);

// 여러 요소의 텍스트 (배열)
await expect(page.getByRole('listitem')).toHaveText([
  '사과',
  '바나나',
  '체리',
]);

// 옵션
await expect(locator).toHaveText('hello', {
  ignoreCase: true,      // 대소문자 무시
  useInnerText: true,    // innerText 사용 (기본: textContent)
  timeout: 10_000,       // 타임아웃
});
```

### 값 & 속성

```typescript
// input 값
await expect(locator).toHaveValue('입력된 값');
await expect(locator).toHaveValue(/패턴/);

// 다중 선택 값
await expect(locator).toHaveValues([/opt1/, /opt2/]);

// 속성
await expect(locator).toHaveAttribute('href', '/home');
await expect(locator).toHaveAttribute('href', /\/home/);
await expect(locator).toHaveAttribute('disabled');  // 속성 존재만 확인

// CSS 클래스
await expect(locator).toHaveClass('active');
await expect(locator).toHaveClass(/active/);
await expect(locator).toHaveClass(['item', 'active']); // 여러 요소

// CSS 클래스 포함
await expect(locator).toContainClass('active');
await expect(locator).toContainClass(['btn', 'primary']); // 여러 클래스

// CSS 속성
await expect(locator).toHaveCSS('color', 'rgb(255, 0, 0)');
await expect(locator).toHaveCSS('font-size', '16px');

// ID
await expect(locator).toHaveId('main-content');

// JS 속성
await expect(locator).toHaveJSProperty('checked', true);
await expect(locator).toHaveJSProperty('value', 'hello');
```

### 접근성

```typescript
// accessible name
await expect(locator).toHaveAccessibleName('제출 버튼');
await expect(locator).toHaveAccessibleName(/제출/);

// accessible description
await expect(locator).toHaveAccessibleDescription('폼을 제출합니다');

// ARIA role
await expect(locator).toHaveRole('button');
```

### 개수

```typescript
// 요소 개수
await expect(page.getByRole('listitem')).toHaveCount(5);
await expect(page.getByRole('listitem')).toHaveCount(0); // 없음
```

### 스크린샷 비교

```typescript
// 요소 스크린샷 비교
await expect(locator).toHaveScreenshot();
await expect(locator).toHaveScreenshot('name.png');
await expect(locator).toHaveScreenshot({
  maxDiffPixels: 100,
  maxDiffPixelRatio: 0.1,
  threshold: 0.2,
  animations: 'disabled',
  caret: 'hide',
  mask: [page.locator('.dynamic-content')],
  maskColor: '#FF00FF',
  scale: 'css',
  timeout: 10_000,
});
```

### ARIA 스냅샷

```typescript
await expect(locator).toMatchAriaSnapshot(`
  - heading "Welcome"
  - button "Sign in"
  - list:
    - listitem: Item 1
    - listitem: Item 2
`);
```

## 6.2 Page Assertions

```typescript
// URL 확인
await expect(page).toHaveURL('https://example.com/dashboard');
await expect(page).toHaveURL(/.*dashboard/);
await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });

// 타이틀 확인
await expect(page).toHaveTitle('대시보드');
await expect(page).toHaveTitle(/대시보드/);

// 페이지 스크린샷 비교
await expect(page).toHaveScreenshot();
await expect(page).toHaveScreenshot('full-page.png');
await expect(page).toHaveScreenshot({
  fullPage: true,
  mask: [page.locator('.timestamp')],
  maxDiffPixels: 50,
});
```

## 6.3 Response Assertions

```typescript
// HTTP 응답 검증
const response = await page.goto('/api/data');
await expect(response).toBeOK();  // status 200-299
```

## 6.4 부정 (Negation)

```typescript
// .not 수정자로 반대 조건 검증
await expect(locator).not.toBeVisible();
await expect(locator).not.toBeChecked();
await expect(locator).not.toHaveText('에러');
await expect(page).not.toHaveURL(/error/);
```

## 6.5 Soft Assertions

```typescript
// 실패해도 테스트 계속 진행
await expect.soft(locator).toHaveText('텍스트');
await expect.soft(locator).toBeVisible();
await expect.soft(page).toHaveTitle('제목');

// 소프트 어서션 실패 후 수동 체크
if (test.info().errors.length > 0) {
  // 소프트 어서션이 하나라도 실패함
}
```

## 6.6 Polling

```typescript
// 비동기 함수를 주기적으로 확인
await expect.poll(async () => {
  const response = await page.request.get('/api/status');
  return response.status();
}, {
  message: 'API가 준비될 때까지 대기',
  timeout: 30_000,
  intervals: [1_000, 2_000, 5_000], // 재시도 간격
}).toBe(200);
```

## 6.7 Retry Block (toPass)

```typescript
// 코드 블록 전체를 재시도
await expect(async () => {
  const response = await page.request.get('/api/data');
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.items.length).toBeGreaterThan(0);
}).toPass({
  timeout: 60_000,
  intervals: [1_000, 2_000, 5_000],
});
```

## 6.8 Custom Message

```typescript
// 실패 시 표시할 메시지
await expect(locator, '로그인 버튼이 보여야 합니다').toBeVisible();
await expect(page, '대시보드로 이동해야 합니다').toHaveURL('/dashboard');
```

## 6.9 Configure

```typescript
// 미리 설정된 expect 인스턴스
const slowExpect = expect.configure({ timeout: 30_000 });
await slowExpect(locator).toBeVisible();

const softExpect = expect.configure({ soft: true });
await softExpect(locator).toHaveText('텍스트');
```

## 6.10 Generic (Non-Retrying) Assertions

```typescript
// 이 assertions는 재시도하지 않으므로 주의
const text = await locator.textContent();
expect(text).toBe('정확한 값');
expect(text).toEqual('정확한 값');
expect(text).toContain('부분 값');
expect(text).toMatch(/패턴/);
expect(text).toBeTruthy();
expect(text).toBeFalsy();
expect(text).toBeNull();
expect(text).toBeDefined();
expect(text).toBeUndefined();

const count = await locator.count();
expect(count).toBe(5);
expect(count).toBeGreaterThan(0);
expect(count).toBeGreaterThanOrEqual(1);
expect(count).toBeLessThan(10);
expect(count).toBeLessThanOrEqual(5);
expect(count).toBeCloseTo(5.1, 0); // 소수점 precision

const items = ['a', 'b', 'c'];
expect(items).toHaveLength(3);
expect(items).toContain('b');
expect(items).toContainEqual('b');
expect(items).toEqual(expect.arrayContaining(['a', 'c']));

const obj = { name: 'test', value: 123 };
expect(obj).toHaveProperty('name');
expect(obj).toHaveProperty('name', 'test');
expect(obj).toMatchObject({ name: 'test' });
expect(obj).toEqual(expect.objectContaining({ name: 'test' }));

// 에러 검증
expect(() => throwingFn()).toThrow();
expect(() => throwingFn()).toThrow('에러 메시지');
expect(() => throwingFn()).toThrow(/패턴/);

// 비대칭 매처
expect(value).toEqual(expect.any(Number));
expect(value).toEqual(expect.anything());
expect(str).toEqual(expect.stringContaining('부분'));
expect(str).toEqual(expect.stringMatching(/패턴/));
expect(arr).toEqual(expect.arrayContaining([1, 2]));
```

## 6.11 Custom Matchers

```typescript
// 커스텀 매처 정의
expect.extend({
  async toHaveAmount(locator: Locator, expected: number, options?: { timeout?: number }) {
    const assertionName = 'toHaveAmount';
    let pass: boolean;
    let matcherResult: any;

    try {
      await expect(locator).toHaveAttribute('data-amount', String(expected), options);
      pass = true;
    } catch (e: any) {
      matcherResult = e.matcherResult;
      pass = false;
    }

    return {
      name: assertionName,
      expected,
      message: () => matcherResult ? matcherResult.message : '',
      pass,
      actual: matcherResult?.actual,
    };
  },
});

// 사용
await expect(page.locator('.price')).toHaveAmount(100);
```
