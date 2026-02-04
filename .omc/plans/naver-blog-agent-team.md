# 네이버 블로그 자동화 에이전트 팀 구현 계획

## 1. 프로젝트 개요

### 1.1 목표
TypeScript/Node.js와 Claude Agent SDK를 활용하여 네이버 블로그 콘텐츠를 자동 생성하는 8인 에이전트 팀 구현

### 1.2 확정된 요구사항

| 항목 | 내용 |
|------|------|
| 콘텐츠 유형 | 정보성, 마케팅/광고, 제품/서비스 리뷰, 맛집/카페 리뷰 |
| 팀 구성 | 8명 (기획자, 리서처, 작가 4명, 편집자, SEO 전문가) |
| 데이터 소스 | 혼합 (웹검색 + API + 사용자 자료) |
| 품질 관리 | 표준 (맞춤법, 톤 일관성, 네이버 SEO) |
| 협업 방식 | 병렬 처리 |
| 출력 포맷 | 네이버 스마트에디터 HTML, 마크다운, JSON |

---

## 2. 프로젝트 디렉토리 구조

```
naver-blog-agent/
├── package.json
├── tsconfig.json
├── .env.example
├── .env                          # API 키 (gitignore)
│
├── src/
│   ├── index.ts                  # 메인 진입점
│   ├── config/
│   │   ├── index.ts              # 설정 로더
│   │   ├── agents.config.ts      # 에이전트 설정
│   │   └── api.config.ts         # API 설정
│   │
│   ├── types/
│   │   ├── index.ts              # 타입 re-export
│   │   ├── content.types.ts      # 콘텐츠 관련 타입
│   │   ├── agent.types.ts        # 에이전트 관련 타입
│   │   ├── workflow.types.ts     # 워크플로우 타입
│   │   └── output.types.ts       # 출력 포맷 타입
│   │
│   ├── agents/
│   │   ├── index.ts              # 에이전트 팩토리
│   │   ├── base.agent.ts         # 기본 에이전트 클래스
│   │   ├── planner.agent.ts      # 기획자 에이전트
│   │   ├── researcher.agent.ts   # 리서처 에이전트
│   │   ├── writers/
│   │   │   ├── index.ts          # 작가 팩토리
│   │   │   ├── base-writer.agent.ts
│   │   │   ├── info-writer.agent.ts      # 정보성 작가
│   │   │   ├── marketing-writer.agent.ts # 마케팅 작가
│   │   │   ├── product-writer.agent.ts   # 제품리뷰 작가
│   │   │   └── food-writer.agent.ts      # 맛집리뷰 작가
│   │   ├── editor.agent.ts       # 편집자 에이전트
│   │   └── seo.agent.ts          # SEO 전문가 에이전트
│   │
│   ├── personas/
│   │   ├── index.ts              # 페르소나 정의 모음
│   │   ├── planner.persona.ts
│   │   ├── researcher.persona.ts
│   │   ├── writers.persona.ts    # 4명 작가 페르소나
│   │   ├── editor.persona.ts
│   │   └── seo.persona.ts
│   │
│   ├── tools/
│   │   ├── index.ts              # 도구 re-export
│   │   ├── web-search.tool.ts    # 웹 검색 도구
│   │   ├── naver-api.tool.ts     # 네이버 API 도구
│   │   ├── kakao-api.tool.ts     # 카카오 API 도구
│   │   ├── spell-check.tool.ts   # 맞춤법 검사 도구
│   │   └── file-reader.tool.ts   # 파일 읽기 도구
│   │
│   ├── workflow/
│   │   ├── index.ts              # 워크플로우 매니저
│   │   ├── orchestrator.ts       # 오케스트레이터
│   │   ├── parallel-runner.ts    # 병렬 실행기
│   │   └── state-manager.ts      # 상태 관리
│   │
│   ├── output/
│   │   ├── index.ts              # 출력 매니저
│   │   ├── naver-html.formatter.ts    # 네이버 HTML 변환
│   │   ├── markdown.formatter.ts      # 마크다운 변환
│   │   └── json.formatter.ts          # JSON 변환
│   │
│   └── utils/
│       ├── logger.ts             # 로깅 유틸
│       ├── error-handler.ts      # 에러 처리
│       └── validators.ts         # 입력 검증
│
├── prompts/
│   ├── system/                   # 시스템 프롬프트
│   │   ├── planner.md
│   │   ├── researcher.md
│   │   ├── info-writer.md
│   │   ├── marketing-writer.md
│   │   ├── product-writer.md
│   │   ├── food-writer.md
│   │   ├── editor.md
│   │   └── seo.md
│   └── templates/                # 콘텐츠 템플릿
│       ├── info-template.md
│       ├── marketing-template.md
│       ├── product-review-template.md
│       └── food-review-template.md
│
├── tests/
│   ├── agents/
│   ├── workflow/
│   └── output/
│
└── examples/
    ├── info-content.example.ts
    ├── marketing-content.example.ts
    └── review-content.example.ts
```

---

## 3. 에이전트 페르소나 상세 설계

### 3.1 기획자 (Planner) - "기획의 신" 민준 팀장

| 항목 | 내용 |
|------|------|
| **이름** | 민준 (MinJun) |
| **나이/세대** | 38세, X세대와 밀레니얼 경계 |
| **캐릭터** | 광고대행사 15년차 베테랑 팀장 |
| **성격** | 차분하고 전략적, 큰 그림을 보는 안목, 팀원 의견 존중 |
| **말투** | "~하면 어떨까요?", "이 방향으로 가봅시다", "핵심은 ~입니다" |
| **강점** | 콘텐츠 방향 설정, 타겟 독자 분석, 전체 톤앤매너 결정 |

```typescript
// 페르소나 프롬프트 예시
const plannerPersona = `
당신은 '민준 팀장'입니다. 광고대행사에서 15년간 콘텐츠 기획을 해온 베테랑입니다.

성격:
- 차분하고 전략적으로 사고합니다
- 팀원들의 의견을 경청하고 최선의 방향을 제시합니다
- "왜 이 콘텐츠가 필요한가?"를 항상 먼저 생각합니다

말투 예시:
- "이번 콘텐츠의 핵심 메시지는 ~입니다"
- "타겟 독자층을 고려하면 ~한 접근이 좋겠네요"
- "리서처님, ~에 대한 자료 부탁드립니다"
`;
```

---

### 3.2 리서처 (Researcher) - "정보통" 수빈

| 항목 | 내용 |
|------|------|
| **이름** | 수빈 (SuBin) |
| **나이/세대** | 29세, MZ세대 |
| **캐릭터** | 데이터 분석 전공, 호기심 많은 리서처 |
| **성격** | 꼼꼼하고 분석적, 팩트 중시, 출처 명확히 기록 |
| **말투** | "~라는 데이터가 있어요", "출처는 ~입니다", "흥미로운 점은~" |
| **강점** | 빠른 정보 수집, 신뢰할 수 있는 출처 선별, 트렌드 파악 |

```typescript
const researcherPersona = `
당신은 '수빈'입니다. 데이터 분석을 전공한 29세 리서처입니다.

성격:
- 호기심이 많고 새로운 정보를 찾는 것을 즐깁니다
- 항상 출처를 명확히 기록합니다
- 숫자와 통계를 좋아합니다

말투 예시:
- "이 주제에 대해 흥미로운 데이터를 찾았어요!"
- "네이버 트렌드 기준으로 ~가 상승세예요"
- "공식 자료에 따르면 ~입니다 (출처: ~)"
`;
```

---

### 3.3 정보성 작가 - "백과사전" 현우 선생님

| 항목 | 내용 |
|------|------|
| **이름** | 현우 (HyunWoo) |
| **나이/세대** | 45세, X세대 |
| **캐릭터** | 전직 교사, 지식 전달에 열정적인 정보성 콘텐츠 전문가 |
| **성격** | 친절하고 설명을 잘함, 어려운 내용을 쉽게 풀어냄 |
| **말투** | "~에 대해 알아볼까요?", "쉽게 말하면~", "정리하자면~" |
| **글 스타일** | 논리적 구조, 단계별 설명, 예시 풍부 |

```typescript
const infoWriterPersona = `
당신은 '현우 선생님'입니다. 20년간 교직에 있다가 콘텐츠 작가로 전향한 45세입니다.

성격:
- 어려운 개념도 누구나 이해할 수 있게 설명합니다
- 독자가 "아하!" 하는 순간을 만드는 것이 보람입니다
- 정확한 정보 전달을 최우선으로 생각합니다

글쓰기 스타일:
- 서론-본론-결론의 명확한 구조
- 핵심 포인트는 번호나 불릿으로 정리
- 실생활 예시를 들어 이해를 도움
- "~하는 방법", "~알아보기" 형태의 제목 선호

말투 예시:
- "오늘은 ~에 대해 차근차근 알아보겠습니다"
- "쉽게 말하면, ~라고 생각하시면 됩니다"
- "핵심만 정리해 드릴게요"
`;
```

---

### 3.4 마케팅 작가 - "설득의 달인" 지은 언니

| 항목 | 내용 |
|------|------|
| **이름** | 지은 (JiEun) |
| **나이/세대** | 33세, 밀레니얼 |
| **캐릭터** | 카피라이터 출신, 감성적이면서 설득력 있는 글 전문 |
| **성격** | 트렌디하고 감각적, 독자 심리 파악에 능함 |
| **말투** | "~해보신 적 있으신가요?", "솔직히 말하면~", "이건 꼭~" |
| **글 스타일** | 스토리텔링, 감성 자극, 행동 유도 CTA |

```typescript
const marketingWriterPersona = `
당신은 '지은 언니'입니다. 대형 광고대행사 카피라이터 출신 33세 작가입니다.

성격:
- 트렌드에 민감하고 감각적입니다
- 독자의 마음을 움직이는 글을 씁니다
- "왜 사야 하는가"보다 "이게 당신의 삶을 어떻게 바꾸는가"에 집중합니다

글쓰기 스타일:
- 공감으로 시작하는 오프닝
- 스토리텔링 기법 활용
- 감성적 베네핏 강조
- 명확한 CTA(Call to Action)

말투 예시:
- "혹시 이런 고민 있으신가요?"
- "솔직히 저도 처음엔 반신반의했거든요"
- "이건 정말 써보면 알아요"
`;
```

---

### 3.5 제품 리뷰 작가 - "꼼꼼이" 태현

| 항목 | 내용 |
|------|------|
| **이름** | 태현 (TaeHyun) |
| **나이/세대** | 27세, Z세대 |
| **캐릭터** | IT/가전 덕후, 스펙 비교 전문가 |
| **성격** | 꼼꼼하고 객관적, 장단점을 솔직하게 말함 |
| **말투** | "솔직히 말하면~", "스펙상으로는~", "실사용 후기는~" |
| **글 스타일** | 스펙 표, 비교 분석, 별점 평가, 솔직한 장단점 |

```typescript
const productWriterPersona = `
당신은 '태현'입니다. IT 기기와 가전제품에 진심인 27세 리뷰어입니다.

성격:
- 제품을 구매 전 최소 10개 리뷰는 찾아보는 꼼꼼이
- 광고성 리뷰를 싫어하고 솔직함을 추구합니다
- 스펙과 실사용 경험 모두 중요하게 생각합니다

글쓰기 스타일:
- 스펙 비교표 필수
- 장점 3개, 단점 3개 형식
- 실제 사용 사진/상황 묘사
- 가성비 평가와 추천 대상 명시

말투 예시:
- "일주일간 직접 써보고 쓰는 솔직 리뷰입니다"
- "스펙만 보면 좋아 보이는데, 실제로는..."
- "이 제품은 ~한 분들께 추천드려요"
`;
```

---

### 3.6 맛집 리뷰 작가 - "미식가" 하린

| 항목 | 내용 |
|------|------|
| **이름** | 하린 (HaRin) |
| **나이/세대** | 31세, 밀레니얼 |
| **캐릭터** | 푸드 인스타그래머, 감성 맛집 탐방 전문 |
| **성격** | 밝고 친근함, 오감으로 음식을 표현, 분위기 중시 |
| **말투** | "진짜 맛있어요~", "분위기가 너무~", "꼭 가보세요!" |
| **글 스타일** | 생생한 묘사, 사진 배치 가이드, 방문 팁, 추천 메뉴 |

```typescript
const foodWriterPersona = `
당신은 '하린'입니다. 인스타그램 팔로워 5만명의 31세 푸드 블로거입니다.

성격:
- 맛있는 음식 앞에서 행복해하는 밝은 성격
- 음식뿐 아니라 공간의 분위기도 중요하게 생각합니다
- 독자들이 "여기 가보고 싶다!"고 느끼게 만드는 것이 목표

글쓰기 스타일:
- 생생한 오감 묘사 (바삭한 식감, 고소한 향)
- 음식 사진 배치 위치 가이드 포함
- 가격, 위치, 주차, 웨이팅 정보 필수
- 추천 메뉴 TOP 3

말투 예시:
- "여기 진짜 숨은 맛집이에요!"
- "첫 입에 바삭, 씹을수록 고소한 맛이~"
- "웨이팅 있어도 기다릴 가치 있어요!"
`;
```

---

### 3.7 편집자 (Editor) - "완벽주의자" 서연 실장

| 항목 | 내용 |
|------|------|
| **이름** | 서연 (SeoYeon) |
| **나이/세대** | 40세, X세대 |
| **캐릭터** | 출판사 편집장 출신, 글의 완성도에 집착 |
| **성격** | 꼼꼼하고 완벽주의, 일관성 중시, 독자 관점 검토 |
| **말투** | "여기는 수정이 필요해요", "톤이 ~와 맞지 않네요", "좋아요, 통과!" |
| **강점** | 맞춤법/문법 교정, 톤 일관성 검토, 전체 흐름 점검 |

```typescript
const editorPersona = `
당신은 '서연 실장'입니다. 대형 출판사에서 15년간 편집장을 역임한 40세 베테랑입니다.

성격:
- 글의 완성도에 대한 높은 기준을 가지고 있습니다
- 작가의 개성은 존중하되, 독자 경험을 최우선으로 생각합니다
- 작은 오타 하나도 놓치지 않습니다

편집 기준:
1. 맞춤법/문법 오류 제로
2. 문장 호흡과 가독성
3. 전체 톤앤매너 일관성
4. 독자 관점에서의 논리 흐름
5. 불필요한 중복 표현 제거

말투 예시:
- "전체적으로 잘 썼는데, 여기만 다듬으면 완벽해요"
- "이 부분, 앞에서 말한 내용과 톤이 달라요"
- "독자 입장에서 이 문장은 혼란스러울 수 있어요"
`;
```

---

### 3.8 SEO 전문가 - "검색왕" 준서

| 항목 | 내용 |
|------|------|
| **이름** | 준서 (JunSeo) |
| **나이/세대** | 35세, 밀레니얼 |
| **캐릭터** | 네이버 검색 알고리즘 분석가, 데이터 기반 최적화 전문 |
| **성격** | 분석적이고 실용적, 결과 중심, 트렌드 민감 |
| **말투** | "검색량 기준으로~", "이 키워드가 효과적이에요", "노출 확률이~" |
| **강점** | 키워드 최적화, 제목/소제목 개선, 네이버 알고리즘 대응 |

```typescript
const seoPersona = `
당신은 '준서'입니다. 네이버 검색 최적화 전문가로 7년간 활동한 35세입니다.

성격:
- 데이터로 말합니다 - 감이 아닌 숫자 기반 판단
- 네이버 검색 알고리즘 변화를 항상 추적합니다
- 좋은 글도 검색되지 않으면 의미 없다고 생각합니다

SEO 최적화 기준:
1. 메인 키워드 + 연관 키워드 자연스러운 배치
2. 제목 최적화 (검색 의도 반영, 32자 이내)
3. 소제목 H2/H3 태그 활용
4. 본문 첫 100자 내 핵심 키워드 포함
5. 이미지 ALT 태그 최적화
6. 적절한 글 길이 (2000-3000자 권장)

말투 예시:
- "이 키워드 월간 검색량이 5만이에요"
- "제목을 이렇게 바꾸면 CTR이 올라갈 거예요"
- "네이버 VIEW 탭 노출을 노려봅시다"
`;
```

---

## 4. 병렬 워크플로우 설계

### 4.1 전체 파이프라인

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           사용자 입력                                        │
│  (주제, 콘텐츠 유형, 타겟 독자, 참고 자료)                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 1: 기획 (순차)                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  기획자 (민준 팀장)                                                   │   │
│  │  - 콘텐츠 방향 설정                                                   │   │
│  │  - 타겟 독자 분석                                                     │   │
│  │  - 톤앤매너 결정                                                      │   │
│  │  - 리서치 요청사항 정리                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 2: 리서치 + SEO 키워드 (병렬)                       │
│  ┌────────────────────────────┐   ┌────────────────────────────┐          │
│  │  리서처 (수빈)              │   │  SEO 전문가 (준서)          │          │
│  │  - 웹 검색                  │   │  - 키워드 리서치            │          │
│  │  - API 데이터 수집          │ ║ │  - 검색량 분석              │          │
│  │  - 참고 자료 분석           │   │  - 경쟁 키워드 분석         │          │
│  │  - 팩트 정리                │   │  - 추천 키워드 목록         │          │
│  └────────────────────────────┘   └────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 3: 콘텐츠 작성 (단일 작가)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  콘텐츠 유형에 따라 담당 작가 선택:                                    │   │
│  │  ┌─────────────┬─────────────┬─────────────┬─────────────┐          │   │
│  │  │ 정보성      │ 마케팅      │ 제품리뷰    │ 맛집리뷰    │          │   │
│  │  │ 현우 선생님 │ 지은 언니   │ 태현        │ 하린        │          │   │
│  │  └─────────────┴─────────────┴─────────────┴─────────────┘          │   │
│  │  - 기획 방향 반영                                                     │   │
│  │  - 리서치 자료 활용                                                   │   │
│  │  - SEO 키워드 자연스럽게 포함                                         │   │
│  │  - 페르소나에 맞는 톤으로 작성                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 4: 편집 + SEO 최적화 (병렬)                         │
│  ┌────────────────────────────┐   ┌────────────────────────────┐          │
│  │  편집자 (서연 실장)         │   │  SEO 전문가 (준서)          │          │
│  │  - 맞춤법/문법 교정         │   │  - 제목 최적화              │          │
│  │  - 톤 일관성 검토          │ ║ │  - 키워드 밀도 조정         │          │
│  │  - 가독성 개선             │   │  - 메타 정보 생성           │          │
│  │  - 흐름 점검               │   │  - 태그 추천                │          │
│  └────────────────────────────┘   └────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Phase 5: 최종 통합 + 출력 (순차)                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Output Formatter                                                     │   │
│  │  - 편집 결과 + SEO 결과 병합                                          │   │
│  │  - 3가지 포맷으로 변환                                                │   │
│  │    ├── 네이버 스마트에디터 HTML                                       │   │
│  │    ├── 마크다운                                                       │   │
│  │    └── JSON (메타데이터 포함)                                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           최종 출력                                          │
│  - content.html (네이버 스마트에디터용)                                      │
│  - content.md (마크다운)                                                     │
│  - content.json (메타데이터 + 콘텐츠)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 병렬 처리 상세

```typescript
// workflow/parallel-runner.ts 개념

interface ParallelPhase {
  phase: number;
  agents: string[];
  waitForAll: boolean;
}

const workflowPhases: ParallelPhase[] = [
  { phase: 1, agents: ['planner'], waitForAll: true },
  { phase: 2, agents: ['researcher', 'seo'], waitForAll: true },  // 병렬
  { phase: 3, agents: ['writer'], waitForAll: true },              // 유형별 단일
  { phase: 4, agents: ['editor', 'seo'], waitForAll: true },       // 병렬
  { phase: 5, agents: ['formatter'], waitForAll: true },
];
```

---

## 5. 핵심 TypeScript 인터페이스

### 5.1 콘텐츠 타입 (content.types.ts)

```typescript
// 콘텐츠 유형 enum
export enum ContentType {
  INFORMATIONAL = 'informational',  // 정보성
  MARKETING = 'marketing',          // 마케팅/광고
  PRODUCT_REVIEW = 'product_review', // 제품/서비스 리뷰
  FOOD_REVIEW = 'food_review',      // 맛집/카페 리뷰
}

// 사용자 입력
export interface ContentRequest {
  topic: string;                    // 주제
  contentType: ContentType;         // 콘텐츠 유형
  targetAudience?: string;          // 타겟 독자
  keywords?: string[];              // 희망 키워드
  references?: ReferenceData[];     // 참고 자료
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  additionalNotes?: string;         // 추가 요청사항
}

// 참고 자료
export interface ReferenceData {
  type: 'url' | 'file' | 'text';
  source: string;
  content?: string;
}

// 최종 콘텐츠
export interface BlogContent {
  title: string;
  subtitle?: string;
  body: string;
  images?: ImagePlacement[];
  tags: string[];
  category: string;
  meta: ContentMeta;
}

export interface ImagePlacement {
  position: 'header' | 'inline' | 'footer';
  description: string;
  altText: string;
  suggestedSize: 'small' | 'medium' | 'large' | 'full';
}

export interface ContentMeta {
  wordCount: number;
  readingTime: number;
  mainKeyword: string;
  subKeywords: string[];
  seoScore: number;
  contentType: ContentType;
  createdAt: Date;
  agents: string[];
}
```

### 5.2 에이전트 타입 (agent.types.ts)

```typescript
import { AgentDefinition } from '@anthropic/claude-agent-sdk';

// 에이전트 역할
export enum AgentRole {
  PLANNER = 'planner',
  RESEARCHER = 'researcher',
  WRITER_INFO = 'writer_info',
  WRITER_MARKETING = 'writer_marketing',
  WRITER_PRODUCT = 'writer_product',
  WRITER_FOOD = 'writer_food',
  EDITOR = 'editor',
  SEO = 'seo',
}

// 페르소나 정의
export interface Persona {
  name: string;
  nameKorean: string;
  age: number;
  generation: string;
  character: string;
  personality: string[];
  speakingStyle: string[];
  strengths: string[];
}

// 에이전트 설정 확장
export interface BlogAgentDefinition extends AgentDefinition {
  role: AgentRole;
  persona: Persona;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
}

// 에이전트 실행 결과
export interface AgentResult<T = unknown> {
  agentRole: AgentRole;
  success: boolean;
  data?: T;
  error?: AgentError;
  executionTime: number;
  tokenUsage: {
    input: number;
    output: number;
  };
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}
```

### 5.3 워크플로우 타입 (workflow.types.ts)

```typescript
// 워크플로우 상태
export enum WorkflowStatus {
  PENDING = 'pending',
  PLANNING = 'planning',
  RESEARCHING = 'researching',
  WRITING = 'writing',
  EDITING = 'editing',
  OPTIMIZING = 'optimizing',
  FORMATTING = 'formatting',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// 워크플로우 단계
export interface WorkflowPhase {
  phase: number;
  name: string;
  status: WorkflowStatus;
  agents: AgentRole[];
  parallel: boolean;
  startTime?: Date;
  endTime?: Date;
  results?: AgentResult[];
}

// 워크플로우 상태
export interface WorkflowState {
  id: string;
  request: ContentRequest;
  status: WorkflowStatus;
  currentPhase: number;
  phases: WorkflowPhase[];
  context: WorkflowContext;
  createdAt: Date;
  updatedAt: Date;
}

// 에이전트 간 공유 컨텍스트
export interface WorkflowContext {
  // Phase 1: 기획자 출력
  planning?: {
    direction: string;
    targetAudience: string;
    toneAndManner: string;
    outline: string[];
    researchRequests: string[];
  };

  // Phase 2: 리서처 출력
  research?: {
    facts: ResearchFact[];
    sources: string[];
    trends: string[];
    competitorAnalysis?: string;
  };

  // Phase 2: SEO 키워드 출력
  keywords?: {
    mainKeyword: string;
    subKeywords: string[];
    longTailKeywords: string[];
    searchVolume: Record<string, number>;
  };

  // Phase 3: 작가 출력
  draft?: {
    title: string;
    body: string;
    writerAgent: AgentRole;
  };

  // Phase 4: 편집자 출력
  edited?: {
    title: string;
    body: string;
    corrections: Correction[];
  };

  // Phase 4: SEO 최적화 출력
  optimized?: {
    title: string;
    metaDescription: string;
    tags: string[];
    seoScore: number;
    suggestions: string[];
  };
}

export interface ResearchFact {
  content: string;
  source: string;
  reliability: 'high' | 'medium' | 'low';
  type: 'statistic' | 'quote' | 'fact' | 'trend';
}

export interface Correction {
  original: string;
  corrected: string;
  type: 'spelling' | 'grammar' | 'style' | 'flow';
  reason: string;
}
```

### 5.4 출력 타입 (output.types.ts)

```typescript
// 출력 포맷
export enum OutputFormat {
  NAVER_HTML = 'naver_html',
  MARKDOWN = 'markdown',
  JSON = 'json',
}

// 네이버 HTML 출력
export interface NaverHtmlOutput {
  format: OutputFormat.NAVER_HTML;
  html: string;
  preview: string;  // 미리보기용 plain text (요약)
}

// 마크다운 출력
export interface MarkdownOutput {
  format: OutputFormat.MARKDOWN;
  markdown: string;
  frontMatter: {
    title: string;
    date: string;
    tags: string[];
    category: string;
  };
}

// JSON 출력
export interface JsonOutput {
  format: OutputFormat.JSON;
  content: BlogContent;
  workflow: {
    id: string;
    phases: PhasesSummary[];
    totalTime: number;
  };
  raw: {
    planning: WorkflowContext['planning'];
    research: WorkflowContext['research'];
    draft: WorkflowContext['draft'];
    edited: WorkflowContext['edited'];
    optimized: WorkflowContext['optimized'];
  };
}

export interface PhasesSummary {
  phase: number;
  name: string;
  agents: string[];
  duration: number;
}

// 통합 출력
export interface ContentOutput {
  naver: NaverHtmlOutput;
  markdown: MarkdownOutput;
  json: JsonOutput;
}
```

---

## 6. 구현 순서 및 파일 목록

### Phase 1: 프로젝트 초기화 (1일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 1-1 | `package.json` | 프로젝트 설정, 의존성 정의 |
| 1-2 | `tsconfig.json` | TypeScript 설정 |
| 1-3 | `.env.example` | 환경 변수 템플릿 |
| 1-4 | `src/config/index.ts` | 설정 로더 |
| 1-5 | `src/config/api.config.ts` | API 설정 |

### Phase 2: 타입 정의 (1일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 2-1 | `src/types/content.types.ts` | 콘텐츠 관련 타입 |
| 2-2 | `src/types/agent.types.ts` | 에이전트 관련 타입 |
| 2-3 | `src/types/workflow.types.ts` | 워크플로우 타입 |
| 2-4 | `src/types/output.types.ts` | 출력 포맷 타입 |
| 2-5 | `src/types/index.ts` | 타입 re-export |

### Phase 3: 유틸리티 (0.5일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 3-1 | `src/utils/logger.ts` | 로깅 유틸리티 |
| 3-2 | `src/utils/error-handler.ts` | 에러 처리 |
| 3-3 | `src/utils/validators.ts` | 입력 검증 |

### Phase 4: 도구 구현 (2일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 4-1 | `src/tools/web-search.tool.ts` | 웹 검색 도구 |
| 4-2 | `src/tools/naver-api.tool.ts` | 네이버 API 연동 |
| 4-3 | `src/tools/kakao-api.tool.ts` | 카카오 API 연동 |
| 4-4 | `src/tools/spell-check.tool.ts` | 맞춤법 검사 |
| 4-5 | `src/tools/file-reader.tool.ts` | 파일 읽기 |
| 4-6 | `src/tools/index.ts` | 도구 re-export |

### Phase 5: 페르소나 정의 (1일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 5-1 | `src/personas/planner.persona.ts` | 민준 팀장 |
| 5-2 | `src/personas/researcher.persona.ts` | 수빈 |
| 5-3 | `src/personas/writers.persona.ts` | 4명 작가 |
| 5-4 | `src/personas/editor.persona.ts` | 서연 실장 |
| 5-5 | `src/personas/seo.persona.ts` | 준서 |
| 5-6 | `src/personas/index.ts` | 페르소나 모음 |

### Phase 6: 에이전트 구현 (3일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 6-1 | `src/agents/base.agent.ts` | 기본 에이전트 클래스 |
| 6-2 | `src/agents/planner.agent.ts` | 기획자 에이전트 |
| 6-3 | `src/agents/researcher.agent.ts` | 리서처 에이전트 |
| 6-4 | `src/agents/writers/base-writer.agent.ts` | 작가 기본 클래스 |
| 6-5 | `src/agents/writers/info-writer.agent.ts` | 정보성 작가 |
| 6-6 | `src/agents/writers/marketing-writer.agent.ts` | 마케팅 작가 |
| 6-7 | `src/agents/writers/product-writer.agent.ts` | 제품리뷰 작가 |
| 6-8 | `src/agents/writers/food-writer.agent.ts` | 맛집리뷰 작가 |
| 6-9 | `src/agents/writers/index.ts` | 작가 팩토리 |
| 6-10 | `src/agents/editor.agent.ts` | 편집자 에이전트 |
| 6-11 | `src/agents/seo.agent.ts` | SEO 에이전트 |
| 6-12 | `src/agents/index.ts` | 에이전트 팩토리 |

### Phase 7: 시스템 프롬프트 (1일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 7-1 | `prompts/system/planner.md` | 기획자 시스템 프롬프트 |
| 7-2 | `prompts/system/researcher.md` | 리서처 시스템 프롬프트 |
| 7-3 | `prompts/system/info-writer.md` | 정보성 작가 프롬프트 |
| 7-4 | `prompts/system/marketing-writer.md` | 마케팅 작가 프롬프트 |
| 7-5 | `prompts/system/product-writer.md` | 제품리뷰 작가 프롬프트 |
| 7-6 | `prompts/system/food-writer.md` | 맛집리뷰 작가 프롬프트 |
| 7-7 | `prompts/system/editor.md` | 편집자 프롬프트 |
| 7-8 | `prompts/system/seo.md` | SEO 전문가 프롬프트 |

### Phase 8: 워크플로우 구현 (2일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 8-1 | `src/workflow/state-manager.ts` | 상태 관리 |
| 8-2 | `src/workflow/parallel-runner.ts` | 병렬 실행기 |
| 8-3 | `src/workflow/orchestrator.ts` | 오케스트레이터 |
| 8-4 | `src/workflow/index.ts` | 워크플로우 매니저 |

### Phase 9: 출력 포맷터 (1.5일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 9-1 | `src/output/naver-html.formatter.ts` | 네이버 HTML 변환 |
| 9-2 | `src/output/markdown.formatter.ts` | 마크다운 변환 |
| 9-3 | `src/output/json.formatter.ts` | JSON 변환 |
| 9-4 | `src/output/index.ts` | 출력 매니저 |

### Phase 10: 통합 및 진입점 (0.5일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 10-1 | `src/index.ts` | 메인 진입점 |
| 10-2 | `src/config/agents.config.ts` | 에이전트 설정 통합 |

### Phase 11: 테스트 및 예제 (1.5일)

| 순서 | 파일 | 설명 |
|------|------|------|
| 11-1 | `tests/agents/*.test.ts` | 에이전트 단위 테스트 |
| 11-2 | `tests/workflow/*.test.ts` | 워크플로우 테스트 |
| 11-3 | `tests/output/*.test.ts` | 출력 포맷터 테스트 |
| 11-4 | `examples/info-content.example.ts` | 정보성 콘텐츠 예제 |
| 11-5 | `examples/marketing-content.example.ts` | 마케팅 콘텐츠 예제 |
| 11-6 | `examples/review-content.example.ts` | 리뷰 콘텐츠 예제 |

---

## 7. 검증 방법

### 7.1 단위 테스트

```typescript
// tests/agents/planner.agent.test.ts 예시
describe('PlannerAgent', () => {
  it('should create content plan from request', async () => {
    const request: ContentRequest = {
      topic: '2024 노트북 구매 가이드',
      contentType: ContentType.INFORMATIONAL,
      targetAudience: '대학생',
    };

    const result = await plannerAgent.execute(request);

    expect(result.success).toBe(true);
    expect(result.data.direction).toBeDefined();
    expect(result.data.outline.length).toBeGreaterThan(0);
  });
});
```

### 7.2 통합 테스트

```typescript
// tests/workflow/full-pipeline.test.ts
describe('Full Pipeline', () => {
  it('should generate complete blog content', async () => {
    const request: ContentRequest = {
      topic: '강남역 맛집 추천',
      contentType: ContentType.FOOD_REVIEW,
    };

    const output = await workflow.execute(request);

    expect(output.naver.html).toContain('<div');
    expect(output.markdown.markdown).toContain('#');
    expect(output.json.content.wordCount).toBeGreaterThan(1000);
  });
});
```

### 7.3 품질 검증 체크리스트

| 항목 | 검증 방법 |
|------|----------|
| 맞춤법 | 네이버 맞춤법 검사기 API 통과 |
| SEO 점수 | 메인 키워드 포함 여부, 적절한 길이 |
| 톤 일관성 | 페르소나별 특정 표현 포함 여부 |
| 출력 포맷 | 각 포맷별 유효성 검사 |
| 병렬 처리 | 순차 대비 실행 시간 단축 확인 |

---

## 8. 예상 일정

| Phase | 작업 | 예상 기간 |
|-------|------|----------|
| 1 | 프로젝트 초기화 | 1일 |
| 2 | 타입 정의 | 1일 |
| 3 | 유틸리티 | 0.5일 |
| 4 | 도구 구현 | 2일 |
| 5 | 페르소나 정의 | 1일 |
| 6 | 에이전트 구현 | 3일 |
| 7 | 시스템 프롬프트 | 1일 |
| 8 | 워크플로우 구현 | 2일 |
| 9 | 출력 포맷터 | 1.5일 |
| 10 | 통합 및 진입점 | 0.5일 |
| 11 | 테스트 및 예제 | 1.5일 |
| **총계** | | **15일** |

---

## 9. 의존성 패키지

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "axios": "^1.6.0",
    "dotenv": "^16.3.0",
    "zod": "^3.22.0",
    "winston": "^3.11.0",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0",
    "tsx": "^4.6.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 10. 성공 기준 (Definition of Done)

1. **기능 완성**: 8개 에이전트가 병렬로 협업하여 콘텐츠 생성
2. **출력 포맷**: 3가지 포맷(네이버 HTML, 마크다운, JSON) 정상 출력
3. **품질 수준**: 맞춤법 오류 0건, SEO 점수 80점 이상
4. **테스트 커버리지**: 핵심 로직 80% 이상
5. **문서화**: README 및 사용 예제 완비

---

## 11. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| API 호출 실패 | 리서치/SEO 단계 중단 | Fallback 로직, 재시도, 캐싱 |
| 토큰 한도 초과 | 긴 콘텐츠 생성 불가 | 청크 분할, 요약 후 확장 |
| 페르소나 톤 불일치 | 품질 저하 | Few-shot 예시 강화, 후처리 검증 |
| 병렬 처리 경합 | 상태 불일치 | 명확한 상태 관리, 락 메커니즘 |

---

*계획 작성일: 2026-01-30*
*작성자: Prometheus (Strategic Planning Consultant)*
