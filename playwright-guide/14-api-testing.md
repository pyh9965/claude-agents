# 14. API 테스트 (REST)

## 14.1 request 픽스처

```typescript
import { test, expect } from '@playwright/test';

test('API 상태 확인', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(200);
});
```

## 14.2 설정

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    baseURL: 'https://api.example.com',
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${process.env.API_TOKEN}`,
    },
  },
});
```

## 14.3 HTTP 메서드

### GET

```typescript
test('사용자 목록 조회', async ({ request }) => {
  const response = await request.get('/api/users');
  expect(response.ok()).toBeTruthy();

  const users = await response.json();
  expect(users.length).toBeGreaterThan(0);
  expect(users[0]).toHaveProperty('id');
  expect(users[0]).toHaveProperty('name');
});

// 쿼리 파라미터
test('검색 API', async ({ request }) => {
  const response = await request.get('/api/users', {
    params: {
      search: '홍길동',
      page: 1,
      limit: 10,
    },
  });
  const data = await response.json();
  expect(data.results).toHaveLength(1);
});
```

### POST

```typescript
test('사용자 생성', async ({ request }) => {
  const response = await request.post('/api/users', {
    data: {
      name: '홍길동',
      email: 'hong@example.com',
      role: 'user',
    },
  });
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(201);

  const user = await response.json();
  expect(user.id).toBeDefined();
  expect(user.name).toBe('홍길동');
});

// Form 데이터
test('폼 제출', async ({ request }) => {
  const response = await request.post('/api/login', {
    form: {
      username: 'admin',
      password: 'secret',
    },
  });
  expect(response.ok()).toBeTruthy();
});

// Multipart (파일 업로드)
test('파일 업로드', async ({ request }) => {
  const response = await request.post('/api/upload', {
    multipart: {
      file: {
        name: 'document.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('fake pdf content'),
      },
      description: '테스트 문서',
    },
  });
  expect(response.ok()).toBeTruthy();
});
```

### PUT

```typescript
test('사용자 정보 수정', async ({ request }) => {
  const response = await request.put('/api/users/1', {
    data: {
      name: '홍길동 (수정됨)',
      email: 'hong-updated@example.com',
    },
  });
  expect(response.ok()).toBeTruthy();

  const updated = await response.json();
  expect(updated.name).toBe('홍길동 (수정됨)');
});
```

### PATCH

```typescript
test('부분 수정', async ({ request }) => {
  const response = await request.patch('/api/users/1', {
    data: {
      name: '새이름',
    },
  });
  expect(response.ok()).toBeTruthy();
});
```

### DELETE

```typescript
test('사용자 삭제', async ({ request }) => {
  const response = await request.delete('/api/users/1');
  expect(response.ok()).toBeTruthy();
  expect(response.status()).toBe(204);
});
```

### HEAD

```typescript
test('리소스 존재 확인', async ({ request }) => {
  const response = await request.head('/api/users/1');
  expect(response.ok()).toBeTruthy();
});
```

## 14.4 요청 옵션

```typescript
const response = await request.post('/api/data', {
  // 요청 본문 (JSON)
  data: { key: 'value' },

  // 폼 데이터
  form: { field1: 'value1', field2: 'value2' },

  // 멀티파트 (파일 + 데이터)
  multipart: {
    file: { name: 'f.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') },
    field: 'value',
  },

  // 쿼리 파라미터
  params: { page: 1, limit: 20 },

  // 커스텀 헤더
  headers: {
    'Content-Type': 'application/json',
    'X-Custom': 'value',
  },

  // 타임아웃
  timeout: 30_000,

  // 리다이렉트 비활성화
  maxRedirects: 0,

  // 리다이렉트 최대 횟수
  maxRedirects: 5,

  // SSL 검증 무시
  ignoreHTTPSErrors: true,

  // 실패 시 재시도하지 않음
  failOnStatusCode: true,
});
```

## 14.5 응답 처리

```typescript
const response = await request.get('/api/data');

// 상태
response.ok();            // boolean (200-299)
response.status();        // 200, 404, 500 등
response.statusText();    // 'OK', 'Not Found' 등

// 헤더
response.headers();       // 전체 헤더 객체
response.headersArray();  // [{name, value}] 배열

// 본문
const json = await response.json();   // JSON 파싱
const text = await response.text();   // 텍스트
const buffer = await response.body(); // Buffer

// URL
response.url();           // 최종 URL (리다이렉트 후)

// 서버 주소
response.serverAddr();    // { ipAddress, port }
response.securityDetails(); // TLS 상세 (Chromium only)
```

## 14.6 인증 상태 관리

```typescript
// API로 로그인하고 storageState 저장
test('API 인증', async ({ request }) => {
  const response = await request.post('/api/auth/login', {
    data: {
      email: 'user@example.com',
      password: 'password123',
    },
  });
  expect(response.ok()).toBeTruthy();

  // 쿠키/토큰 저장
  await request.storageState({ path: 'playwright/.auth/api-user.json' });
});
```

## 14.7 API + UI 통합 테스트

```typescript
test('API로 데이터 생성 → UI에서 확인', async ({ request, page }) => {
  // 1. API로 게시글 생성
  const createResponse = await request.post('/api/posts', {
    data: {
      title: '테스트 게시글',
      content: 'API로 생성된 게시글입니다.',
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const post = await createResponse.json();

  // 2. UI에서 게시글 확인
  await page.goto(`/posts/${post.id}`);
  await expect(page.getByRole('heading')).toHaveText('테스트 게시글');
  await expect(page.getByText('API로 생성된 게시글입니다.')).toBeVisible();

  // 3. API로 정리
  await request.delete(`/api/posts/${post.id}`);
});
```

## 14.8 독립 API 테스트 (브라우저 없이)

```typescript
import { test, expect } from '@playwright/test';

// 별도 API 테스트 프로젝트 설정
// playwright.config.ts:
// projects: [{ name: 'api', testMatch: '**/api/**/*.spec.ts', use: { baseURL: 'https://api.example.com' } }]

test.describe('REST API 테스트', () => {
  let userId: string;

  test('POST /users - 사용자 생성', async ({ request }) => {
    const response = await request.post('/users', {
      data: { name: '테스트', email: 'test@test.com' },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    userId = body.id;
    expect(body.name).toBe('테스트');
  });

  test('GET /users/:id - 사용자 조회', async ({ request }) => {
    const response = await request.get(`/users/${userId}`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.email).toBe('test@test.com');
  });

  test('PUT /users/:id - 사용자 수정', async ({ request }) => {
    const response = await request.put(`/users/${userId}`, {
      data: { name: '수정됨' },
    });
    expect(response.ok()).toBeTruthy();
  });

  test('DELETE /users/:id - 사용자 삭제', async ({ request }) => {
    const response = await request.delete(`/users/${userId}`);
    expect(response.status()).toBe(204);
  });

  test('GET /users/:id - 삭제 확인', async ({ request }) => {
    const response = await request.get(`/users/${userId}`);
    expect(response.status()).toBe(404);
  });
});
```

## 14.9 새 API 컨텍스트 생성

```typescript
import { test, expect, request as apiRequest } from '@playwright/test';

test('독립 API 컨텍스트', async ({}) => {
  // 별도 API 컨텍스트 생성
  const apiContext = await apiRequest.newContext({
    baseURL: 'https://api.example.com',
    extraHTTPHeaders: {
      'Authorization': 'Bearer special-token',
    },
  });

  const response = await apiContext.get('/protected/data');
  expect(response.ok()).toBeTruthy();

  // 정리
  await apiContext.dispose();
});
```

## 14.10 프록시 설정

```typescript
// playwright.config.ts
use: {
  proxy: {
    server: 'http://proxy.example.com:8080',
    bypass: 'localhost,127.0.0.1',
    username: 'proxy-user',
    password: 'proxy-pass',
  },
}
```
