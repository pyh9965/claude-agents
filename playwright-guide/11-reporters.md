# 11. 리포터 종류 및 설정

## 11.1 내장 리포터 목록

| 리포터 | 용도 | CI 기본 | 로컬 기본 |
|--------|------|---------|-----------|
| `list` | 각 테스트를 한 줄씩 출력 | - | O |
| `line` | list보다 간결 (진행 중 한 줄) | - | - |
| `dot` | 최소 출력 (문자 하나씩) | O | - |
| `html` | 인터랙티브 HTML 리포트 | - | - |
| `json` | JSON 형식 출력 | - | - |
| `junit` | JUnit XML 형식 | - | - |
| `blob` | 샤딩/병합용 바이너리 | - | - |
| `github` | GitHub Actions 어노테이션 | - | - |

## 11.2 List 리포터

```typescript
// playwright.config.ts
reporter: 'list',

// 또는 옵션 포함
reporter: [['list', {
  printSteps: true,  // 각 스텝을 별도 줄에 표시
}]],
```

환경변수:
- `PLAYWRIGHT_LIST_PRINT_STEPS=1` - 스텝 표시
- `PLAYWRIGHT_FORCE_TTY=1` - TTY 출력 강제
- `FORCE_COLOR=1` - 컬러 출력 강제

## 11.3 Line 리포터

```typescript
reporter: 'line',
```

- list보다 간결: 진행 중에는 한 줄만 표시
- 실패 시에만 상세 출력

## 11.4 Dot 리포터

```typescript
reporter: 'dot',
```

출력 문자:
- `·` 통과
- `F` 실패
- `×` 실패 후 재시도 실패
- `±` flaky (재시도 후 통과)
- `T` 타임아웃
- `°` 건너뜀

## 11.5 HTML 리포터

```typescript
reporter: [['html', {
  open: 'on-failure',        // 'always' | 'never' | 'on-failure'
  outputFolder: 'playwright-report', // 출력 폴더
  title: '테스트 리포트',      // 리포트 제목
  host: 'localhost',          // 서버 호스트
  port: 9323,                 // 서버 포트
  attachmentsBaseURL: 'https://storage.example.com/', // 외부 스토리지
  noCopyPrompt: false,        // 복사 안내 비활성화
  noSnippets: false,          // 코드 스니펫 비활성화
}]],
```

```bash
# 리포트 서버 실행
npx playwright show-report
npx playwright show-report my-report
npx playwright show-report --port 8080
```

## 11.6 JSON 리포터

```typescript
reporter: [['json', {
  outputFile: 'test-results.json',
}]],
```

환경변수:
- `PLAYWRIGHT_JSON_OUTPUT_NAME=results.json`
- `PLAYWRIGHT_JSON_OUTPUT_DIR=./reports`
- `PLAYWRIGHT_JSON_OUTPUT_FILE=./reports/results.json`

```bash
# CLI에서 JSON 출력
PLAYWRIGHT_JSON_OUTPUT_NAME=results.json npx playwright test --reporter=json
```

## 11.7 JUnit 리포터

```typescript
reporter: [['junit', {
  outputFile: 'results.xml',
  stripANSIControlSequences: true,  // ANSI 시퀀스 제거
  includeProjectInTestName: true,   // 프로젝트명을 테스트명에 포함
}]],
```

환경변수:
- `PLAYWRIGHT_JUNIT_OUTPUT_NAME=results.xml`
- `PLAYWRIGHT_JUNIT_OUTPUT_DIR=./reports`
- `PLAYWRIGHT_JUNIT_OUTPUT_FILE=./reports/results.xml`
- `PLAYWRIGHT_JUNIT_STRIP_ANSI=true`
- `PLAYWRIGHT_JUNIT_INCLUDE_PROJECT_IN_TEST_NAME=true`
- `PLAYWRIGHT_JUNIT_SUITE_ID=custom-id`
- `PLAYWRIGHT_JUNIT_SUITE_NAME=My Suite`

## 11.8 Blob 리포터

```typescript
reporter: [['blob', {
  outputDir: 'blob-report',          // 출력 디렉토리
  fileName: 'report.zip',            // 파일명
  outputFile: 'blob-report/report.zip', // 전체 경로 (위 두 옵션 오버라이드)
}]],
```

환경변수:
- `PLAYWRIGHT_BLOB_OUTPUT_DIR`
- `PLAYWRIGHT_BLOB_OUTPUT_NAME`
- `PLAYWRIGHT_BLOB_OUTPUT_FILE`

### Blob 리포트 병합 (샤딩 후)

```bash
# 모든 샤드에서 blob 리포트 수집 후
npx playwright merge-reports blob-report --reporter=html
npx playwright merge-reports blob-report --reporter=json
```

## 11.9 GitHub Actions 리포터

```typescript
// CI 환경에서만 사용
reporter: process.env.CI ? 'github' : 'list',

// 다른 리포터와 함께 사용
reporter: process.env.CI
  ? [['github'], ['html', { open: 'never' }]]
  : [['list']],
```

GitHub Actions에서 실패 시 자동으로 어노테이션 표시.

## 11.10 다중 리포터

```typescript
// 여러 리포터 동시 사용
reporter: [
  ['list'],                                    // 터미널 출력
  ['html', { open: 'never' }],                // HTML 리포트
  ['json', { outputFile: 'results.json' }],   // JSON 데이터
  ['junit', { outputFile: 'results.xml' }],   // JUnit (CI용)
],

// CI 환경 구분
reporter: process.env.CI
  ? [
      ['dot'],
      ['blob'],
      ['github'],
      ['junit', { outputFile: 'results.xml' }],
    ]
  : [
      ['list'],
      ['html'],
    ],
```

## 11.11 커스텀 리포터

```typescript
// my-reporter.ts
import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';

class MyReporter implements Reporter {
  onBegin(config: FullConfig, suite: Suite) {
    console.log(`Total tests: ${suite.allTests().length}`);
  }

  onTestBegin(test: TestCase, result: TestResult) {
    console.log(`Starting: ${test.title}`);
  }

  onTestEnd(test: TestCase, result: TestResult) {
    console.log(`Finished: ${test.title} - ${result.status}`);
    // result.status: 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'

    if (result.status === 'failed') {
      console.log(`  Error: ${result.error?.message}`);
      console.log(`  Duration: ${result.duration}ms`);
    }

    // 첨부파일 접근
    for (const attachment of result.attachments) {
      console.log(`  Attachment: ${attachment.name} (${attachment.contentType})`);
    }
  }

  onEnd(result: FullResult) {
    console.log(`Suite finished: ${result.status}`);
    // result.status: 'passed' | 'failed' | 'timedout' | 'interrupted'
  }

  onStdOut(chunk: string, test?: TestCase) {
    // stdout 캡처
  }

  onStdErr(chunk: string, test?: TestCase) {
    // stderr 캡처
  }

  onError(error: any) {
    console.error('Global error:', error);
  }
}

export default MyReporter;
```

### 커스텀 리포터 사용

```typescript
// playwright.config.ts
reporter: [
  ['./my-reporter.ts'],
  ['html'],
],

// 또는 CLI
// npx playwright test --reporter="./my-reporter.ts"

// 옵션 전달
reporter: [
  ['./my-reporter.ts', { outputFile: 'custom-report.txt', verbose: true }],
],
```

### 커스텀 리포터에서 옵션 받기

```typescript
class MyReporter implements Reporter {
  private outputFile: string;
  private verbose: boolean;

  constructor(options: { outputFile?: string; verbose?: boolean } = {}) {
    this.outputFile = options.outputFile || 'report.txt';
    this.verbose = options.verbose || false;
  }
}
```
