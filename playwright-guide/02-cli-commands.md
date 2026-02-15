# 02. CLI 명령어 전체 레퍼런스

## 2.1 도움말

```bash
npx playwright --help          # 전체 명령어 목록
npx playwright test --help     # 테스트 러너 옵션
npx playwright codegen --help  # 코드 생성 옵션
```

## 2.2 npx playwright test [옵션] [파일필터...]

### 기본 사용법

```bash
# 모든 테스트 실행
npx playwright test

# 특정 파일 실행
npx playwright test tests/login.spec.ts

# 특정 디렉토리 실행
npx playwright test tests/e2e/

# 파일명 패턴으로 실행
npx playwright test login logout

# 테스트 제목으로 필터링 (정규식)
npx playwright test -g "로그인 성공"

# 테스트 제목 제외
npx playwright test --grep-invert "skip this"
```

### 전체 플래그 목록

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `-c, --config <file>` | 설정 파일 경로 | `playwright.config.ts` |
| `-g, --grep <pattern>` | 테스트 제목 필터 (정규식) | `.*` |
| `--grep-invert <pattern>` | 테스트 제목 제외 (정규식) | - |
| `--project <name...>` | 특정 프로젝트만 실행 | 전체 |
| `-j, --workers <count>` | 병렬 워커 수 또는 CPU % | `50%` |
| `--headed` | 브라우저 표시 모드 | headless |
| `--ui` | 대화형 UI 모드 | - |
| `--ui-host <host>` | UI 서버 호스트 | `localhost` |
| `--ui-port <port>` | UI 서버 포트 | 자동 |
| `--debug` | Playwright Inspector 디버그 모드 | - |
| `--reporter <type>` | 리포터 지정 | `list` |
| `--retries <count>` | 재시도 횟수 | `0` |
| `--timeout <ms>` | 테스트 타임아웃 (ms) | `30000` |
| `--global-timeout <ms>` | 전체 스위트 타임아웃 | 무제한 |
| `--max-failures <N>` 또는 `-x` | N개 실패 후 중단 | 무제한 |
| `--output <dir>` | 아티팩트 출력 디렉토리 | `test-results` |
| `--repeat-each <N>` | 각 테스트를 N번 반복 | `1` |
| `--shard <current/total>` | 샤드 분할 (예: `1/3`) | - |
| `--fully-parallel` | 모든 테스트 병렬 실행 | `false` |
| `--forbid-only` | `test.only` 사용 시 실패 | `false` |
| `--fail-on-flaky-tests` | flaky 테스트 실패 처리 | `false` |
| `--last-failed` | 마지막 실패 테스트만 재실행 | - |
| `--only-changed [ref]` | Git 변경 파일만 실행 | - |
| `--list` | 테스트 목록만 출력 (실행 안 함) | - |
| `--pass-with-no-tests` | 테스트 없어도 성공 반환 | `false` |
| `--quiet` | stdout 출력 억제 | `false` |
| `--no-deps` | 프로젝트 의존성 무시 | `false` |
| `--ignore-snapshots` | 스냅샷 검증 건너뜀 | `false` |
| `-u, --update-snapshots [mode]` | 스냅샷 업데이트 | `missing` |
| `--update-source-method [mode]` | 스냅샷 업데이트 방법 | `patch` |
| `--trace <mode>` | 트레이스 모드 | - |
| `--tsconfig <path>` | TypeScript 설정 경로 | 자동 감지 |
| `--test-list <file>` | 실행할 테스트 목록 파일 | - |
| `--test-list-invert <file>` | 제외할 테스트 목록 파일 | - |

### 사용 예시

```bash
# Chrome에서만 headed 모드로 실행
npx playwright test --project=chromium --headed

# 3개 워커로 재시도 2번
npx playwright test --workers=3 --retries=2

# 디버그 모드 (특정 테스트)
npx playwright test tests/login.spec.ts --debug

# HTML + JSON 리포터 동시 사용
npx playwright test --reporter="html,json"

# 실패 시 즉시 중단
npx playwright test -x

# CI에서 샤딩 (3개 머신 중 1번)
npx playwright test --shard=1/3

# 마지막 실패 테스트만 재실행
npx playwright test --last-failed

# Git 변경 파일만 테스트
npx playwright test --only-changed
npx playwright test --only-changed=main

# 트레이스 기록하며 실행
npx playwright test --trace on

# 스냅샷 업데이트
npx playwright test --update-snapshots
```

## 2.3 npx playwright codegen [옵션] [URL]

```bash
# 기본 사용
npx playwright codegen https://example.com

# 특정 브라우저
npx playwright codegen -b firefox https://example.com

# 파일로 저장
npx playwright codegen -o tests/generated.spec.ts https://example.com

# 타겟 언어 지정
npx playwright codegen --target javascript https://example.com
npx playwright codegen --target python https://example.com

# 뷰포트 크기 지정
npx playwright codegen --viewport-size="800,600" https://example.com

# 모바일 디바이스 에뮬레이션
npx playwright codegen --device="iPhone 13" https://example.com

# 다크 모드
npx playwright codegen --color-scheme=dark https://example.com

# 지역/언어/타임존
npx playwright codegen --timezone="Asia/Seoul" --geolocation="37.5665,126.9780" --lang="ko-KR" https://example.com

# 인증 상태 저장
npx playwright codegen --save-storage=auth.json https://example.com

# 저장된 인증 상태 로드
npx playwright codegen --load-storage=auth.json https://example.com

# 커스텀 test-id 속성
npx playwright codegen --test-id-attribute="data-cy" https://example.com
```

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `-b, --browser <name>` | 브라우저 종류 | `chromium` |
| `-o, --output <file>` | 출력 파일 경로 | stdout |
| `--target <language>` | 언어/포맷 | - |
| `--test-id-attribute <attr>` | 테스트 ID 속성 | `data-testid` |
| `--viewport-size <WxH>` | 뷰포트 크기 | - |
| `--device <name>` | 디바이스 에뮬레이션 | - |
| `--color-scheme <scheme>` | 색상 모드 (dark/light) | - |
| `--timezone <tz>` | 타임존 | - |
| `--geolocation <lat,lon>` | 위치 정보 | - |
| `--lang <locale>` | 언어 설정 | - |
| `--save-storage <file>` | 인증 상태 저장 | - |
| `--load-storage <file>` | 인증 상태 로드 | - |
| `--user-data-dir <path>` | 브라우저 프로필 경로 | - |

## 2.4 npx playwright show-report [옵션]

```bash
# 기본 리포트 열기
npx playwright show-report

# 특정 폴더의 리포트
npx playwright show-report my-report

# 호스트/포트 지정
npx playwright show-report --host 0.0.0.0 --port 8080
```

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `--host <host>` | 서버 호스트 | `localhost` |
| `--port <port>` | 서버 포트 | `9323` |

## 2.5 npx playwright show-trace [옵션] [trace]

```bash
# 로컬 트레이스 파일 열기
npx playwright show-trace trace.zip

# 원격 트레이스 열기
npx playwright show-trace https://example.com/trace.zip

# 특정 브라우저로 열기
npx playwright show-trace -b firefox trace.zip
```

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `-b, --browser <name>` | 브라우저 종류 | `chromium` |
| `-h, --host <host>` | 서버 호스트 | - |
| `-p, --port <port>` | 서버 포트 | - |

## 2.6 npx playwright merge-reports [옵션] <blob-dir>

```bash
# blob 리포트 병합
npx playwright merge-reports blob-report

# 특정 리포터로 병합
npx playwright merge-reports --reporter=html blob-report

# 설정 파일 지정
npx playwright merge-reports -c merge.config.ts blob-report
```

| 플래그 | 설명 | 기본값 |
|--------|------|--------|
| `-c, --config <file>` | 설정 파일 | - |
| `--reporter <type>` | 리포터 종류 | `list` |

## 2.7 기타 명령어

```bash
# 브라우저 캐시 삭제
npx playwright clear-cache

# 설치된 브라우저 정보
npx playwright --version

# 도움말
npx playwright --help
```
