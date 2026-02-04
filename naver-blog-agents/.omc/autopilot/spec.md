# Interview Flow System - Technical Specification

## Overview

Transform blog content requests into high-quality articles by gathering structured information through intelligent interviewing.

## Key Design Decisions

1. **Primary Mode**: Claude Code dialogue (natural language)
2. **Minimum Questions**: 3-5 required per content type
3. **Merge Strategy**: Interview data > referenceData (priority)
4. **Architecture**: System-level (no new agent persona)
5. **Duration Target**: 2-3 minutes max

## File Structure

```
src/interview/
├── index.ts                    # Module exports
├── types.ts                    # Interview-specific types
├── schemas/
│   ├── index.ts                # Schema registry & exports
│   ├── base.ts                 # Common questions
│   ├── info.ts                 # Info content schema
│   ├── marketing.ts            # Marketing content schema
│   ├── review.ts               # Review content schema
│   ├── food.ts                 # Food content schema
│   ├── travel.ts               # Travel content schema
│   ├── tech.ts                 # Tech content schema
│   ├── lifestyle.ts            # Lifestyle content schema
│   └── parenting.ts            # Parenting content schema
├── session.ts                  # InterviewSession class
└── merger.ts                   # InterviewDataMerger
```

## Core Types

### InterviewQuestion
```typescript
interface InterviewQuestion {
  id: string;
  text: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'scale';
  required: boolean;
  options?: string[];
  scaleRange?: { min: number; max: number };
  defaultValue?: unknown;
  hint?: string;
  mapsTo: keyof ContentRequest | `referenceData.${string}`;
}
```

### InterviewSession
- State machine: idle → active → complete/cancelled
- Tracks questions, answers, progress
- Validates answers by type
- Supports skip for optional questions

### InterviewDataMerger
- Merges interview data into ContentRequest
- Priority: interview > referenceData
- Tracks field sources and conflicts

## Question Schemas by Content Type

| Type | Required | Focus Areas |
|------|----------|-------------|
| food | 4-5 | 가게명, 위치, 메뉴, 가격, 분위기 |
| review | 4-5 | 제품명, 구매처, 사용기간, 장단점 |
| travel | 4-5 | 여행지, 일정, 동행, 숙소, 예산 |
| tech | 3-4 | 제품, 스펙, 비교대상 |
| info | 3-4 | 주제깊이, 독자수준, 예시 |
| marketing | 4-5 | 브랜드, 타겟액션, USP, CTA |
| lifestyle | 3-4 | 생활단계, 관심분야 |
| parenting | 4-5 | 아이나이, 주제, 경험수준 |

## Integration Flow

```
[User Request]
    → [Interview Session (if needed)]
    → [InterviewDataMerger]
    → [ContentRequest.referenceData]
    → [Existing Workflow: Planner → Researcher → Writer → Editor → SEO]
```

## Implementation Order

1. types.ts
2. schemas/base.ts
3. 8 content type schemas
4. schemas/index.ts
5. session.ts
6. merger.ts
7. index.ts
8. Update types/index.ts export

## Backward Compatibility

- ContentRequest interface unchanged
- Non-interview requests work as before
- Interview data flows through existing referenceData field
