# 12. Trace Viewer, 디버깅, Codegen

## 12.1 Trace Viewer

### 트레이스 녹화 설정

```typescript
// playwright.config.ts
use: {
  trace: 'on-first-retry',  // 권장 설정
}
```

### 트레이스 모드

| 모드 | 설명 | 권장 환경 |
|------|------|-----------|
| `'off'` | 트레이스 비활성화 | - |
| `'on'` | 모든 테스트 녹화 (느림) | 디버깅 |
| `'on-first-retry'` | 첫 재시도에서만 녹화 | CI (권장) |
| `'on-all-retries'` | 모든 재시도에서 녹화 | CI |
| `'retain-on-failure'` | 모든 테스트 녹화, 성공 시 삭제 | 로컬 |
| `'retain-on-first-failure'` | 첫 실패에서만 유지 | 로컬 |

### CLI에서 트레이스 활성화

```bash
# 모든 테스트에 트레이스 기록
npx playwright test --trace on

# 재시도 시에만
npx playwright test --trace on-first-retry

# 실패 시 유지
npx playwright test --trace retain-on-failure
```

### 트레이스 보기

```bash
# 파일로 보기
npx playwright show-trace test-results/test-login/trace.zip

# HTML 리포트에서 보기 (트레이스 아이콘 클릭)
npx playwright show-report

# 온라인 뷰어
# https://trace.playwright.dev 에 업로드

# 원격 트레이스
npx playwright show-trace https://example.com/trace.zip
```

### 프로그래밍 방식 트레이스 녹화

```typescript
// Library API에서 직접 녹화
const context = await browser.newContext();

// 트레이스 시작
await context.tracing.start({
  screenshots: true,   // 스크린샷 포함
  snapshots: true,     // DOM 스냅샷 포함
  sources: true,       // 소스 코드 포함
  title: 'My trace',   // 트레이스 제목
});

// 테스트 액션 수행
const page = await context.newPage();
await page.goto('https://example.com');
await page.getByRole('button').click();

// 트레이스 저장
await context.tracing.stop({
  path: 'trace.zip',
});
```

### 트레이스 청크 (긴 테스트용)

```typescript
// 여러 파일로 분할 저장
await context.tracing.start({ screenshots: true, snapshots: true });

// 첫 번째 청크
await page.goto('/page1');
await context.tracing.startChunk({ title: 'Page 1' });
// ... 액션들
await context.tracing.stopChunk({ path: 'trace-page1.zip' });

// 두 번째 청크
await page.goto('/page2');
await context.tracing.startChunk({ title: 'Page 2' });
// ... 액션들
await context.tracing.stopChunk({ path: 'trace-page2.zip' });
```

### 트레이스 그룹

```typescript
// 관련 API 호출을 그룹으로 묶어 Trace Viewer에서 구조화
await context.tracing.group('사용자 인증');
await page.goto('/login');
await page.fill('#email', 'user@example.com');
await page.fill('#password', 'password');
await page.click('button[type="submit"]');
await context.tracing.groupEnd();

// 커스텀 위치 정보 포함
await context.tracing.group('데이터 로딩', {
  location: { file: 'helpers.ts', line: 42, column: 5 },
});
// ... 액션들
await context.tracing.groupEnd();
```

### DOM 스냅샷 상태

각 액션에 대해 3가지 시점의 DOM 스냅샷 캡처:

| 상태 | 설명 |
|------|------|
| Before | 액션 시작 직전의 DOM 상태 |
| Action | 입력이 발생하는 정확한 순간 (클릭 위치 표시) |
| After | 액션 완료 후 DOM 상태 |

### Trace Viewer 기능

- **Actions 탭**: 각 액션의 DOM 변경, 실행 시간, 로케이터
- **Screenshots**: 필름스트립 형태의 스크린샷 타임라인
- **Snapshots**: Before/Action/After DOM 상태
- **Source 탭**: 해당 코드 위치
- **Call 탭**: 액션 상세 (지속시간, 로케이터, strict 모드)
- **Log 탭**: 전체 실행 로그
- **Errors 탭**: 실패한 assertion과 소스 위치
- **Console 탭**: 브라우저 콘솔 로그
- **Network 탭**: 요청/응답 상세
- **Metadata 탭**: 브라우저, 뷰포트 정보

## 12.2 디버깅

### Playwright Inspector

```bash
# 디버그 모드 (모든 테스트)
npx playwright test --debug

# 특정 파일 디버그
npx playwright test tests/login.spec.ts --debug

# 특정 줄부터 디버그
npx playwright test tests/login.spec.ts:42 --debug
```

### PWDEBUG 환경변수

```bash
# Playwright Inspector 실행
# Bash (Linux/Mac)
PWDEBUG=1 npx playwright test

# PowerShell (Windows)
$env:PWDEBUG="1"
npx playwright test

# CMD (Windows)
set PWDEBUG=1
npx playwright test

# 브라우저 개발자 콘솔에서 디버그
# Bash
PWDEBUG=console npx playwright test

# PowerShell
$env:PWDEBUG="console"
npx playwright test

# CMD
set PWDEBUG=console
npx playwright test
```

### 브라우저 개발자 콘솔 디버깅 (PWDEBUG=console)

PWDEBUG=console로 실행 시, 브라우저 개발자 콘솔에서 `playwright` 객체 사용 가능:

| 명령어 | 설명 |
|--------|------|
| `playwright.$(selector)` | 셀렉터로 요소 조회 |
| `playwright.$$(selector)` | 모든 매칭 요소 반환 |
| `playwright.inspect(selector)` | Elements 패널에서 요소 표시 |
| `playwright.locator(selector)` | 로케이터 생성 및 매칭 요소 조회 |
| `playwright.selector(element)` | 선택된 요소의 셀렉터 생성 |

### Verbose API 로깅

```bash
# 상세 API 로그 출력
# Bash
DEBUG=pw:api npx playwright test

# PowerShell
$env:DEBUG="pw:api"
npx playwright test

# CMD
set DEBUG=pw:api
npx playwright test

# 웹서버 로그
DEBUG=pw:webserver npx playwright test
```

### page.pause()

```typescript
test('디버그 테스트', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('이메일').fill('user@test.com');

  // 여기서 멈추고 Inspector 열림
  await page.pause();

  await page.getByLabel('비밀번호').fill('password');
});
```

### UI 모드

```bash
# UI 모드 실행
npx playwright test --ui

# 호스트/포트 지정
npx playwright test --ui --ui-host 0.0.0.0 --ui-port 8080
```

UI 모드 기능:
- 테스트 목록 트리뷰
- 실시간 실행 모니터링
- 시간 여행 (타임라인)
- Watch 모드 (파일 변경 감지)
- 필터링 (상태, 텍스트, 태그)
- 트레이스 뷰어 내장

### Headed 모드

```bash
# 브라우저 표시
npx playwright test --headed

# 느리게 실행 (디버깅용)
# playwright.config.ts에서:
# use: { launchOptions: { slowMo: 500 } }
```

### VS Code 디버깅

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Playwright Tests",
      "program": "${workspaceFolder}/node_modules/.bin/playwright",
      "args": ["test", "--headed"],
      "console": "integratedTerminal"
    }
  ]
}
```

## 12.3 Codegen (코드 생성)

### 기본 사용

```bash
# 기본 코드 생성
npx playwright codegen https://example.com

# 파일로 저장
npx playwright codegen -o tests/generated.spec.ts https://example.com
```

### 디바이스/환경 에뮬레이션

```bash
# 모바일
npx playwright codegen --device="iPhone 13" https://example.com
npx playwright codegen --device="Pixel 5" https://example.com

# 뷰포트
npx playwright codegen --viewport-size="800,600" https://example.com

# 다크 모드
npx playwright codegen --color-scheme=dark https://example.com

# 지역/언어
npx playwright codegen \
  --timezone="Asia/Seoul" \
  --geolocation="37.5665,126.9780" \
  --lang="ko-KR" \
  https://example.com
```

### 인증 상태

```bash
# 인증 상태 저장
npx playwright codegen --save-storage=auth.json https://example.com
# → 로그인 수행 후 브라우저 닫기 → auth.json에 쿠키/localStorage 저장

# 저장된 인증 상태 로드
npx playwright codegen --load-storage=auth.json https://example.com
# → 이미 로그인된 상태에서 시작
```

### 브라우저 선택

```bash
npx playwright codegen -b chromium https://example.com
npx playwright codegen -b firefox https://example.com
npx playwright codegen -b webkit https://example.com
```

### 커스텀 test-id

```bash
# data-cy 속성 사용 (Cypress 호환)
npx playwright codegen --test-id-attribute="data-cy" https://example.com
```

### Codegen 기능

- **Record**: 클릭, 입력, 네비게이션 자동 녹화
- **Assert visibility**: 요소 가시성 검증 생성
- **Assert text**: 텍스트 내용 검증 생성
- **Assert value**: 입력값 검증 생성
- **Pick Locator**: 요소 선택하여 최적 로케이터 확인
- **Locator 편집**: 생성된 로케이터 실시간 수정/테스트

## 12.4 디버깅 팁

### 실패 테스트만 재실행

```bash
npx playwright test --last-failed
```

### 특정 테스트만 실행

```bash
# 파일 지정
npx playwright test tests/login.spec.ts

# 줄 번호 지정
npx playwright test tests/login.spec.ts:42

# 제목 매칭
npx playwright test -g "로그인 성공"

# 프로젝트 지정
npx playwright test --project=chromium
```

### 스크린샷/비디오 녹화

```typescript
// playwright.config.ts
use: {
  screenshot: 'only-on-failure', // 실패 시 스크린샷
  video: 'retain-on-failure',    // 실패 시 비디오
  trace: 'on-first-retry',      // 재시도 시 트레이스
}
```

### 브라우저 콘솔 로그

```typescript
// 테스트에서 브라우저 콘솔 캡처
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.log(`Browser error: ${msg.text()}`);
  }
});

// 페이지 에러 캡처
page.on('pageerror', (error) => {
  console.log(`Page error: ${error.message}`);
});
```

### 네트워크 디버깅

```typescript
page.on('request', (req) => console.log(`>> ${req.method()} ${req.url()}`));
page.on('response', (res) => console.log(`<< ${res.status()} ${res.url()}`));
page.on('requestfailed', (req) =>
  console.log(`FAIL ${req.url()} ${req.failure()?.errorText}`)
);
```
