# Claude Code - 완전한 문서

Claude Code는 터미널에 상주하는 에이전트 기반 코딩 도구로, 코드베이스를 이해하고 자연어 명령을 통해 일상적인 작업 실행, 복잡한 코드 설명 및 git 워크플로우 처리를 통해 더 빠른 코딩을 지원합니다.

## 주요 기능

- **터미널 기반 도구** - 전체 코드베이스를 이해합니다
- **에이전트 기능** - 일상적인 코딩 작업을 실행합니다
- **코드 설명** - 복잡한 코드를 이해하는 데 도움을 줍니다
- **Git 워크플로우 자동화** - 자연어를 통해 작동합니다
- **멀티 플랫폼 지원** - 터미널, IDE, GitHub 통합
- GitHub에서 @claude 멘션으로 작동

## 설치

### 권장 설치 방법

**MacOS/Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Homebrew (MacOS/Linux):**
```bash
brew install --cask claude-code
```

**Windows (권장):**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**WinGet (Windows):**
```powershell
winget install Anthropic.ClaudeCode
```

**NPM (권장하지 않음):**
```bash
npm install -g @anthropic-ai/claude-code
```

> **참고:** npm을 통한 설치는 더 이상 사용되지 않습니다. 위의 권장 방법을 사용하세요.

## 빠른 시작

1. 위의 방법 중 하나를 사용하여 Claude Code 설치
2. 프로젝트 디렉토리로 이동
3. `claude` 명령 실행

```bash
cd your-project
claude
```

## 주요 명령어

### 코딩 작업
```
# 코드 생성
사용자 인증 기능을 추가해주세요

# 코드 설명
이 함수가 무엇을 하는지 설명해주세요

# 리팩토링
이 코드를 더 읽기 쉽게 리팩토링해주세요

# 버그 수정
이 버그를 찾아서 수정해주세요
```

### Git 작업
```
# 커밋 생성
변경사항을 커밋해주세요

# Pull Request 생성
PR을 만들어주세요

# 변경사항 검토
최근 변경사항을 검토해주세요
```

### 코드베이스 탐색
```
# 파일 찾기
API 엔드포인트가 어디에 있나요?

# 패턴 검색
인증 로직을 찾아주세요

# 구조 이해
이 프로젝트의 아키텍처를 설명해주세요
```

## 문서 리소스

- **개요 및 설정**: https://code.claude.com/docs/en/overview
- **설정 가이드**: https://code.claude.com/docs/en/setup
- **데이터 사용 정책**: https://code.claude.com/docs/en/data-usage
- **서브에이전트**: https://code.claude.com/docs/en/sub-agents
- **스킬**: https://code.claude.com/docs/en/skills
- **플러그인**: https://code.claude.com/docs/en/plugins

## 플러그인 시스템

Claude Code는 커스텀 명령과 에이전트로 기능을 확장하는 플러그인을 포함합니다. 플러그인에 대한 자세한 내용은 [plugins 디렉토리](https://github.com/anthropics/claude-code/blob/main/plugins/README.md)를 참조하세요.

### 인기 플러그인

- **oh-my-claudecode**: 추가 에이전트 및 워크플로우
- **git-master**: 고급 Git 작업
- **frontend-ui-ux**: UI/UX 디자인 도구
- **tdd**: 테스트 주도 개발 지원

## 고급 기능

### 서브에이전트

서브에이전트는 특정 작업을 처리하는 특화된 AI 어시스턴트입니다:

- **Explore**: 코드베이스 검색 및 분석 (읽기 전용)
- **Plan**: 계획 모드를 위한 연구
- **General-purpose**: 복잡한 다단계 작업

커스텀 서브에이전트를 생성할 수도 있습니다:

```bash
/agents  # 서브에이전트 관리 인터페이스 열기
```

### Agent Skills

스킬은 에이전트가 동적으로 발견하고 로드할 수 있는 조직화된 지시사항, 스크립트 및 리소스 폴더입니다:

```
~/.claude/skills/my-skill/
├── SKILL.md
├── reference.md
└── scripts/
    └── helper.py
```

### Hooks

라이프사이클 이벤트에 반응하는 커스텀 스크립트를 실행:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "./scripts/validate.sh" }
        ]
      }
    ]
  }
}
```

## 설정 구성

### 기본 설정 파일

**사용자 수준** (`~/.claude/settings.json`):
```json
{
  "model": "sonnet",
  "permissions": {
    "allow": ["Read", "Grep", "Glob"],
    "deny": []
  },
  "hooks": {}
}
```

**프로젝트 수준** (`.claude/settings.json`):
```json
{
  "model": "opus",
  "autoApproveEdits": true
}
```

### 사용 가능한 모델

- **Sonnet 4.5**: 균형잡힌 성능 (기본값)
- **Opus 4.5**: 최고 성능 (복잡한 작업)
- **Haiku 3.5**: 빠르고 비용 효율적 (간단한 작업)

## 보안 및 권한

### 권한 모드

```json
{
  "permissions": {
    "mode": "default",  // default, acceptEdits, dontAsk, bypassPermissions
    "allow": ["Read", "Write", "Edit", "Bash"],
    "deny": ["Task(Explore)"]
  }
}
```

### 데이터 프라이버시

#### 수집되는 데이터
- 사용 피드백 (코드 승인/거부)
- 관련 대화 데이터
- `/bug` 명령을 통한 사용자 피드백

#### 데이터 사용 방법
[데이터 사용 정책](https://code.claude.com/docs/en/data-usage) 참조

#### 프라이버시 보호
- 민감한 정보의 제한된 보존 기간
- 사용자 세션 데이터에 대한 제한된 액세스
- 모델 훈련을 위한 피드백 사용 금지 정책

전체 세부 정보는 다음을 검토하세요:
- [상용 이용 약관](https://www.anthropic.com/legal/commercial-terms)
- [개인정보 보호정책](https://www.anthropic.com/legal/privacy)

## 문제 보고

- **앱 내**: Claude Code 내에서 `/bug` 명령 사용
- **GitHub**: [GitHub issue](https://github.com/anthropics/claude-code/issues) 제출

## 커뮤니티 및 지원

- **Discord**: [Claude Developers Discord](https://anthropic.com/discord) 가입
- **GitHub**: 5,000개 이상의 이슈 추적
- **기여**: 커뮤니티 기여 환영

## 저장소 통계

- **스타**: 60.8k+
- **포크**: 4.5k+
- **열린 이슈**: 5,000+
- **Pull Request**: 152개
- **커밋**: 458개
- **사용자**: 1,400개 이상의 프로젝트
- **기여자**: 50명 이상

## 기술 세부사항

- **요구사항**: Node.js 18+
- **주요 언어**: Shell (48.2%), Python (32.7%), TypeScript (12.5%), PowerShell (4.5%), Dockerfile (2.1%)
- **라이선스**: MIT (LICENSE.md 참조)
- **보안**: 14개의 보안 알림 추적

## 저장소 구조

```
.claude-plugin/          # 플러그인 구성
.claude/commands/        # 커스텀 명령
.devcontainer/          # 개발 컨테이너 설정
.github/                # GitHub 워크플로우
.vscode/                # VS Code 설정
plugins/                # 플러그인 모듈
scripts/                # 유틸리티 스크립트
examples/hooks/         # 예제 훅
```

## CLI 참조

### 기본 명령

```bash
# Claude Code 시작
claude

# 특정 모델로 시작
claude --model opus

# 특정 도구로 시작
claude --allowedTools "Read,Write,Edit"

# 에이전트 정의와 함께 시작
claude --agents '{"reviewer": {"description": "Code reviewer", "prompt": "Review code", "tools": ["Read"]}}'
```

### 환경 변수

```bash
# 백그라운드 작업 비활성화
export CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1

# 자동 압축 임계값 재정의
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50

# 디버그 모드
export CLAUDE_DEBUG=1
```

## 모범 사례

### 1. 프로젝트 구조 유지
```
project/
├── .claude/
│   ├── settings.json      # 프로젝트 설정
│   ├── agents/            # 프로젝트 서브에이전트
│   │   └── reviewer.md
│   └── skills/            # 프로젝트 스킬
│       └── my-skill/
└── src/
```

### 2. 효과적인 프롬프트 작성
```
# 좋은 예
"사용자 인증을 위한 JWT 토큰 기반 로그인 API 엔드포인트를 추가해주세요.
에러 핸들링과 입력 검증을 포함해야 합니다."

# 나쁜 예
"로그인 만들어주세요"
```

### 3. 서브에이전트 활용
```
# 탐색 작업은 Explore 에이전트에게
"Explore 에이전트를 사용하여 모든 API 엔드포인트를 찾아주세요"

# 검토 작업은 커스텀 리뷰어에게
"code-reviewer 에이전트로 보안 문제를 확인해주세요"
```

### 4. 스킬로 지식 공유
```markdown
# .claude/skills/api-conventions/SKILL.md
---
name: api-conventions
description: 팀의 API 규칙
---

## API 엔드포인트 규칙

1. RESTful URL 사용
2. 적절한 HTTP 메서드 사용
3. 일관된 에러 응답 형식
4. OpenAPI 명세 문서화
```

## 트러블슈팅

### 일반적인 문제

**1. Claude가 파일을 찾지 못함**
```bash
# .gitignore나 .claudeignore 확인
cat .gitignore
cat .claudeignore
```

**2. 권한 오류**
```json
// settings.json에서 권한 모드 확인
{
  "permissions": {
    "mode": "default"  // bypassPermissions로 변경 고려
  }
}
```

**3. 느린 응답**
```bash
# 더 빠른 모델 사용
claude --model haiku

# 또는 특정 서브에이전트에 Haiku 사용
```

**4. 컨텍스트 초과**
```bash
# 자동 압축 임계값 낮추기
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50
```

## 통합

### VS Code 확장
```bash
# VS Code 마켓플레이스에서 설치
code --install-extension Anthropic.claude-code
```

### GitHub Actions
```yaml
# .github/workflows/claude-review.yml
name: Claude Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: anthropics/claude-code-action@v1
        with:
          task: "이 PR을 검토하고 피드백을 제공해주세요"
```

### CI/CD 파이프라인
```bash
# Jenkins, GitLab CI 등에서 사용
claude --headless "테스트를 실행하고 실패한 테스트를 수정해주세요"
```

## 로드맵

### 계획된 기능
- [ ] 향상된 스킬 발견
- [ ] 스킬 마켓플레이스
- [ ] MCP (Model Context Protocol) 완전 통합
- [ ] 에이전트 성능 분석
- [ ] 팀 협업 기능
- [ ] 더 많은 IDE 통합

## 기여 가이드

### 버그 리포트
1. `/bug` 명령 사용 또는 GitHub issue 생성
2. 재현 단계 포함
3. 예상 동작 vs 실제 동작 설명
4. 로그 및 스크린샷 첨부

### 기능 요청
1. GitHub Discussions에서 아이디어 공유
2. 사용 사례 설명
3. 커뮤니티 피드백 수집

### 코드 기여
1. 저장소 포크
2. 기능 브랜치 생성
3. 변경사항 커밋
4. Pull Request 제출

## 라이선스

MIT License - 자세한 내용은 [LICENSE.md](https://github.com/anthropics/claude-code/blob/main/LICENSE.md) 참조

## 추가 리소스

- **공식 문서**: https://code.claude.com/docs
- **GitHub 저장소**: https://github.com/anthropics/claude-code
- **Discord 커뮤니티**: https://anthropic.com/discord
- **블로그**: https://www.anthropic.com/engineering
- **API 문서**: https://platform.claude.com/docs

---

모든 문서는 오픈 소스이며 다음에서 사용할 수 있습니다:
https://github.com/anthropics/claude-code
