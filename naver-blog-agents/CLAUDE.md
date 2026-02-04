# Naver Blog Agents System

네이버 블로그 콘텐츠 자동 생성을 위한 8인 멀티-에이전트 AI 시스템

## 프로젝트 개요

- **목적**: 네이버 블로그 콘텐츠 자동 생성
- **기술 스택**: TypeScript, Node.js, Google Gemini API
- **에이전트 수**: 8명 (기획자, 리서처, 작가 4명, 편집자, SEO 전문가)

## 빠른 시작

### Claude Code에서 사용
```bash
# naver-blog-writer 에이전트 호출
"강남 맛집 블로그 글 써줘"
"아이폰 16 리뷰 블로그 작성해줘"
```

### CLI 직접 실행
```bash
npm install
npm run build
npm run cli -- generate -t "주제" -T info
```

## 핵심 파일

| 파일 | 역할 |
|-----|------|
| `src/workflow/orchestrator.ts` | 워크플로우 오케스트레이터 |
| `src/workflow/pipeline.ts` | 파이프라인 정의 |
| `src/agents/` | 에이전트 구현 |
| `prompts/` | 에이전트별 시스템 프롬프트 |
| `src/formatters/` | HTML, MD, JSON 포맷터 |

## 콘텐츠 유형

| 유형 | 담당 작가 | 용도 |
|-----|---------|------|
| `info` | 현우 선생님 | 정보성, 가이드, How-to |
| `marketing` | 지은 언니 | 브랜드, 협찬, 마케팅 |
| `review` | 태현 | 제품 리뷰, IT/가전 |
| `food` | 하린 | 맛집, 카페 리뷰 |

## 워크플로우

```
Planning → Research → Writing → Editing → SEO → Formatting
(민준)     (수빈)    (작가)    (서연)   (준서)
```

## 출력 포맷

- **HTML**: 네이버 스마트에디터 호환
- **Markdown**: 범용 마크다운
- **JSON**: 구조화된 데이터

## 환경 변수

```env
GEMINI_API_KEY=your_key_here  # 필수
NAVER_CLIENT_ID=optional
NAVER_CLIENT_SECRET=optional
```

## 관련 문서

- [README.md](./README.md) - 프로젝트 소개
- [USAGE_GUIDE.md](./USAGE_GUIDE.md) - 상세 사용법
- [AGENTS.md](./AGENTS.md) - 에이전트 팀 정보
- [docs/IMPROVEMENT_REPORT.md](./docs/IMPROVEMENT_REPORT.md) - 개선 계획
