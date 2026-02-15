# Playwright CLI 완전 가이드 - 목차

> AI가 Playwright를 완전하게 활용하기 위한 종합 레퍼런스

## 파일 구조

| 파일 | 내용 |
|------|------|
| [01-setup.md](./01-setup.md) | 설치, 초기 설정, 프로젝트 구조 |
| [02-cli-commands.md](./02-cli-commands.md) | 모든 CLI 명령어 및 플래그 |
| [03-config.md](./03-config.md) | playwright.config.ts 전체 옵션 |
| [04-test-api.md](./04-test-api.md) | Test API (test, describe, hooks, modifiers) |
| [05-locators.md](./05-locators.md) | 로케이터 전체 레퍼런스 |
| [06-assertions.md](./06-assertions.md) | Assertion 전체 레퍼런스 |
| [07-page-api.md](./07-page-api.md) | Page API 핵심 메서드 |
| [08-network.md](./08-network.md) | 네트워크 인터셉션, 모킹, HAR |
| [09-auth.md](./09-auth.md) | 인증 전략 및 storageState |
| [10-fixtures.md](./10-fixtures.md) | 픽스처 시스템 (내장/커스텀/워커) |
| [11-reporters.md](./11-reporters.md) | 리포터 종류 및 설정 |
| [12-trace-debug.md](./12-trace-debug.md) | Trace Viewer, 디버깅, Codegen |
| [13-parallel.md](./13-parallel.md) | 병렬 실행, 샤딩, 직렬 모드 |
| [14-api-testing.md](./14-api-testing.md) | API 테스트 (REST) |
| [15-advanced.md](./15-advanced.md) | 환경변수, 글로벌 설정, 스크린샷 비교, POM, 컨텍스트, 에뮬레이션, 타임아웃, WebSocket, CI |

## 빠른 참조

```bash
# 설치
npm init playwright@latest

# 테스트 실행
npx playwright test
npx playwright test --headed
npx playwright test --ui
npx playwright test --debug

# 코드 생성
npx playwright codegen localhost:3000

# 리포트 보기
npx playwright show-report

# 트레이스 보기
npx playwright show-trace trace.zip
```
