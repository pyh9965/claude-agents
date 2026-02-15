# 08. 네트워크 인터셉션, 모킹, HAR

## 8.1 네트워크 모니터링

```typescript
// 요청 모니터링
page.on('request', (request) => {
  console.log(`>> ${request.method()} ${request.url()}`);
  console.log('Headers:', request.headers());
  console.log('Post data:', request.postData());
  console.log('Resource type:', request.resourceType());
  // resourceType: 'document' | 'stylesheet' | 'image' | 'media' | 'font' |
  //               'script' | 'texttrack' | 'xhr' | 'fetch' | 'eventsource' |
  //               'websocket' | 'manifest' | 'other'
});

// 응답 모니터링
page.on('response', async (response) => {
  console.log(`<< ${response.status()} ${response.url()}`);
  console.log('Headers:', response.headers());
  if (response.url().includes('/api/')) {
    const json = await response.json();
    console.log('Body:', json);
  }
});

// 실패한 요청
page.on('requestfailed', (request) => {
  console.log(`FAIL ${request.url()}: ${request.failure()?.errorText}`);
});

// 완료된 요청
page.on('requestfinished', (request) => {
  console.log(`DONE ${request.url()}`);
});
```

## 8.2 요청 인터셉션 (route)

### 기본 라우팅

```typescript
// 페이지 레벨 라우팅
await page.route('**/api/data', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ items: [1, 2, 3] }),
  });
});

// 컨텍스트 레벨 라우팅 (팝업/새 탭에도 적용)
await context.route('**/api/**', (route) => {
  route.fulfill({ status: 200, body: '{}' });
});
```

### URL 패턴 매칭

```typescript
// glob 패턴
await page.route('**/api/**', handler);         // 모든 API 요청
await page.route('**/*.{png,jpg,jpeg}', handler); // 이미지 파일

// 정규식
await page.route(/\/api\/users\/\d+/, handler);

// 함수
await page.route(
  (url) => url.hostname === 'api.example.com',
  handler
);
```

### route.fulfill() - 응답 모킹

```typescript
// JSON 응답
await page.route('**/api/users', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([
      { id: 1, name: '홍길동' },
      { id: 2, name: '김철수' },
    ]),
  });
});

// 파일로 응답
await page.route('**/api/data', (route) => {
  route.fulfill({ path: './test-data/mock-response.json' });
});

// HTML 응답
await page.route('**/page', (route) => {
  route.fulfill({
    status: 200,
    contentType: 'text/html',
    body: '<html><body><h1>Mocked</h1></body></html>',
  });
});

// 헤더 포함
await page.route('**/api/data', (route) => {
  route.fulfill({
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Custom': 'value',
    },
    body: '{}',
  });
});
```

### route.continue() - 요청 수정 후 전달

```typescript
// 헤더 수정
await page.route('**/api/**', async (route) => {
  const headers = {
    ...route.request().headers(),
    'Authorization': 'Bearer mock-token',
  };
  await route.continue({ headers });
});

// 메서드 변경
await page.route('**/api/data', (route) => {
  route.continue({ method: 'POST' });
});

// URL 변경
await page.route('**/api/v1/**', (route) => {
  const url = route.request().url().replace('/v1/', '/v2/');
  route.continue({ url });
});

// POST 데이터 수정
await page.route('**/api/submit', (route) => {
  const postData = JSON.parse(route.request().postData() || '{}');
  postData.extra = 'added-by-test';
  route.continue({ postData: JSON.stringify(postData) });
});
```

### route.abort() - 요청 차단

```typescript
// 이미지 요청 차단 (테스트 속도 향상)
await page.route('**/*.{png,jpg,jpeg,gif,svg,webp}', (route) => {
  route.abort();
});

// 리소스 타입별 차단
await page.route('**/*', (route) => {
  const type = route.request().resourceType();
  if (['image', 'stylesheet', 'font'].includes(type)) {
    route.abort();
  } else {
    route.continue();
  }
});

// 특정 에러로 차단
await page.route('**/api/fail', (route) => {
  route.abort('connectionrefused');
  // 가능한 값: 'aborted' | 'accessdenied' | 'addressunreachable' |
  //           'blockedbyclient' | 'blockedbyresponse' | 'connectionaborted' |
  //           'connectionclosed' | 'connectionfailed' | 'connectionrefused' |
  //           'connectionreset' | 'internetdisconnected' | 'namenotresolved' |
  //           'timedout' | 'failed'
});
```

### route.fetch() - 실제 응답 수정

```typescript
// 실제 응답을 가져와서 수정
await page.route('**/api/data', async (route) => {
  // 실제 서버에 요청
  const response = await route.fetch();
  const json = await response.json();

  // 응답 수정
  json.modified = true;
  json.items = json.items.filter(item => item.active);

  // 수정된 응답 반환
  await route.fulfill({
    response,
    body: JSON.stringify(json),
    headers: {
      ...response.headers(),
      'X-Modified': 'true',
    },
  });
});

// HTML 응답 수정
await page.route('**/page', async (route) => {
  const response = await route.fetch();
  let body = await response.text();
  body = body.replace('<title>', '<title>TEST: ');
  await route.fulfill({ response, body });
});
```

## 8.3 라우팅 해제

```typescript
// 특정 핸들러 해제
const handler = (route) => route.fulfill({ status: 200, body: '{}' });
await page.route('**/api/**', handler);
await page.unroute('**/api/**', handler);

// URL 패턴의 모든 핸들러 해제
await page.unroute('**/api/**');

// 모든 라우팅 해제
await page.unrouteAll();
await page.unrouteAll({ behavior: 'wait' }); // 진행 중인 핸들러 완료 대기
```

## 8.4 요청/응답 대기

```typescript
// 특정 요청 대기
const requestPromise = page.waitForRequest('**/api/submit');
await page.getByRole('button', { name: '제출' }).click();
const request = await requestPromise;
console.log(request.method());    // 'POST'
console.log(request.postData()); // 요청 본문

// 조건부 요청 대기
const request2 = await page.waitForRequest(
  (req) => req.url().includes('/api') && req.method() === 'POST'
);

// 특정 응답 대기
const responsePromise = page.waitForResponse('**/api/data');
await page.getByRole('button', { name: '로드' }).click();
const response = await responsePromise;
console.log(response.status());
const json = await response.json();

// 조건부 응답 대기
const response2 = await page.waitForResponse(
  (resp) => resp.url().includes('/api') && resp.status() === 200
);

// 타임아웃 설정
const response3 = await page.waitForResponse('**/api/slow', {
  timeout: 60_000,
});
```

## 8.5 HAR 파일

### HAR 녹화

```typescript
// playwright.config.ts에서 설정
use: {
  // 자동 HAR 녹화
  // ...
}

// 코드에서 녹화
const context = await browser.newContext({
  recordHar: {
    path: 'network.har',
    mode: 'minimal',                // 'full' | 'minimal'
    urlFilter: '**/api/**',         // 필터링
    content: 'omit',               // 'omit' | 'embed' | 'attach'
  },
});
// ... 테스트 수행
await context.close(); // HAR 파일 저장
```

### HAR 재생 (routeFromHAR)

```typescript
// 페이지 레벨
await page.routeFromHAR('network.har', {
  url: '**/api/**',                 // 필터링할 URL 패턴
  update: false,                    // true면 HAR 업데이트
  updateMode: 'full',              // 'full' | 'minimal'
  updateContent: 'embed',          // 'embed' | 'attach'
  notFound: 'abort',               // 매칭 안 될 때: 'abort' | 'fallback'
});

// 컨텍스트 레벨
await context.routeFromHAR('network.har', {
  url: '**/api/**',
  notFound: 'fallback',            // 매칭 안 되면 실제 서버로
});

// HAR 업데이트 모드 (녹화)
await page.routeFromHAR('network.har', {
  url: '**/api/**',
  update: true,                    // 실제 요청하고 HAR 업데이트
});
```

## 8.6 WebSocket 모니터링

```typescript
page.on('websocket', (ws) => {
  console.log(`WebSocket opened: ${ws.url()}`);

  ws.on('framesent', (event) => {
    console.log(`Sent: ${event.payload}`);
  });

  ws.on('framereceived', (event) => {
    console.log(`Received: ${event.payload}`);
  });

  ws.on('close', () => {
    console.log('WebSocket closed');
  });
});
```

## 8.7 HTTP 인증

```typescript
// 컨텍스트에서 HTTP 자격증명 설정
const context = await browser.newContext({
  httpCredentials: {
    username: 'admin',
    password: 'password123',
  },
});

// playwright.config.ts에서 설정
use: {
  httpCredentials: {
    username: 'admin',
    password: 'password123',
  },
}
```

## 8.8 실전 패턴

### API 모킹 헬퍼

```typescript
// test-utils/mock-api.ts
import { Page } from '@playwright/test';

export async function mockApi(page: Page, path: string, data: any, status = 200) {
  await page.route(`**/api${path}`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

// 사용
test('상품 목록', async ({ page }) => {
  await mockApi(page, '/products', [
    { id: 1, name: '상품A', price: 10000 },
    { id: 2, name: '상품B', price: 20000 },
  ]);
  await page.goto('/products');
  await expect(page.getByRole('listitem')).toHaveCount(2);
});
```

### 네트워크 대기 패턴

```typescript
// 요청과 클릭을 동시에 대기
test('데이터 로드', async ({ page }) => {
  await page.goto('/dashboard');

  // Promise.all로 경합 조건 방지
  const [response] = await Promise.all([
    page.waitForResponse('**/api/data'),
    page.getByRole('button', { name: '로드' }).click(),
  ]);

  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.items.length).toBeGreaterThan(0);
});
```

### 느린 네트워크 시뮬레이션

```typescript
// CDP를 통한 네트워크 쓰로틀링 (Chromium only)
const client = await page.context().newCDPSession(page);
await client.send('Network.emulateNetworkConditions', {
  offline: false,
  downloadThroughput: (500 * 1024) / 8, // 500kb/s
  uploadThroughput: (500 * 1024) / 8,
  latency: 400,                           // 400ms 지연
});
```
