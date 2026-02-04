# Claude Code 한국어 문서

Claude Code의 공식 에이전트, 서브에이전트, 스킬 문서를 한국어로 번역한 자료입니다.

## 📚 문서 목록

### 1. [서브에이전트 생성 가이드](./1-서브에이전트-생성-가이드.md)
Claude Code에서 커스텀 서브에이전트를 생성하고 사용하는 방법에 대한 완전한 가이드입니다.

**주요 내용:**
- 서브에이전트란 무엇인가
- 내장 서브에이전트 (Explore, Plan, General-purpose)
- 첫 서브에이전트 만들기
- 서브에이전트 구성 및 설정
- 도구 제한 및 권한 관리
- 실제 사용 예제 (코드 리뷰어, 디버거, 데이터 사이언티스트)

### 2. [SDK 서브에이전트 가이드](./2-SDK-서브에이전트-가이드.md)
Claude Agent SDK에서 프로그래밍 방식으로 서브에이전트를 정의하고 사용하는 방법입니다.

**주요 내용:**
- 서브에이전트 사용의 이점
- 프로그래밍 방식 정의
- AgentDefinition 구성
- 자동 호출 vs 명시적 호출
- 동적 에이전트 구성
- 서브에이전트 재개
- Python 및 TypeScript 예제 코드

### 3. [Agent Skills 가이드](./3-Agent-Skills-가이드.md)
AI 에이전트에 도메인별 전문성을 제공하는 Agent Skills 프레임워크에 대한 설명입니다.

**주요 내용:**
- Agent Skills란 무엇인가
- 점진적 공개(Progressive Disclosure) 설계
- 스킬 아키텍처 및 구조
- 스킬 생성 모범 사례
- 보안 고려사항
- 실제 사용 예제 (PDF 스킬, 데이터 분석, API 통합)

### 4. [Claude Code 개요](./4-Claude-Code-개요.md)
Claude Code의 전반적인 기능과 사용법에 대한 종합 가이드입니다.

**주요 내용:**
- 설치 방법 (Windows, macOS, Linux)
- 주요 기능 및 명령어
- 플러그인 시스템
- 설정 구성
- 보안 및 권한 관리
- 모범 사례 및 트러블슈팅
- VS Code, GitHub Actions 통합

## 🎯 빠른 시작

### Claude Code 설치

**Windows:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

**macOS/Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### 기본 사용법

```bash
# 프로젝트 디렉토리로 이동
cd your-project

# Claude Code 시작
claude

# 서브에이전트 관리
/agents

# 도움말 보기
/help
```

## 📖 주요 개념

### 서브에이전트 (Subagents)
특정 유형의 작업을 처리하는 특화된 AI 어시스턴트입니다. 각 서브에이전트는:
- 자체 컨텍스트 윈도우에서 실행
- 커스텀 시스템 프롬프트 사용
- 특정 도구 액세스 권한 보유
- 독립적인 권한 관리

### Agent Skills
에이전트가 동적으로 발견하고 로드할 수 있는 조직화된 지시사항, 스크립트 및 리소스 폴더입니다:
```
skill-name/
├── SKILL.md           # 스킬 설명
├── reference.md       # 참조 자료
├── scripts/           # 실행 스크립트
└── templates/         # 템플릿
```

### Hooks
라이프사이클 이벤트에 반응하는 커스텀 스크립트:
- `PreToolUse`: 도구 사용 전
- `PostToolUse`: 도구 사용 후
- `SubagentStart`: 서브에이전트 시작 시
- `SubagentStop`: 서브에이전트 종료 시

## 🔧 유용한 명령어

```bash
# 코드 생성
"사용자 인증 기능을 추가해주세요"

# 코드 설명
"이 함수가 무엇을 하는지 설명해주세요"

# 리팩토링
"이 코드를 더 읽기 쉽게 리팩토링해주세요"

# Git 작업
"변경사항을 커밋해주세요"
"PR을 만들어주세요"

# 서브에이전트 사용
"Explore 에이전트를 사용하여 모든 API 엔드포인트를 찾아주세요"
"code-reviewer 에이전트로 보안 문제를 확인해주세요"
```

## 🌟 모범 사례

### 1. 효과적인 프롬프트 작성
```
✅ 좋은 예:
"사용자 인증을 위한 JWT 토큰 기반 로그인 API 엔드포인트를 추가해주세요.
에러 핸들링과 입력 검증을 포함해야 합니다."

❌ 나쁜 예:
"로그인 만들어주세요"
```

### 2. 프로젝트 구조 유지
```
project/
├── .claude/
│   ├── settings.json      # 프로젝트 설정
│   ├── agents/            # 프로젝트 서브에이전트
│   └── skills/            # 프로젝트 스킬
└── src/
```

### 3. 서브에이전트 활용
- 탐색 작업: Explore 에이전트
- 코드 검토: 커스텀 리뷰어 에이전트
- 테스트 실행: 테스트 러너 에이전트
- 데이터 분석: 데이터 사이언티스트 에이전트

## 📚 추가 리소스

- **공식 문서**: https://code.claude.com/docs
- **GitHub 저장소**: https://github.com/anthropics/claude-code
- **Discord 커뮤니티**: https://anthropic.com/discord
- **API 문서**: https://platform.claude.com/docs

## 🔗 원본 출처

이 문서는 다음 공식 소스에서 번역되었습니다:

- [Create custom subagents](https://code.claude.com/docs/en/sub-agents)
- [Subagents in the SDK](https://platform.claude.com/docs/en/agent-sdk/subagents)
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude Code GitHub Repository](https://github.com/anthropics/claude-code)

## 📝 라이선스

이 번역 문서는 원본 문서의 라이선스를 따릅니다. Claude Code는 MIT 라이선스 하에 배포됩니다.

## 🤝 기여

오타나 번역 개선 사항이 있으시면 이슈를 제출하거나 Pull Request를 보내주세요.

---

**마지막 업데이트**: 2026년 1월 26일
**번역 버전**: 1.0
