/**
 * 파이프라인 정의
 */

import type {
  WorkflowStage,
  WorkflowConfig,
  PipelineDefinition,
  PipelineStageDefinition,
  WorkflowContext,
  ContentType,
} from '../types/index.js';

/** 기본 워크플로우 단계 정의 */
export const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    name: 'planning',
    agents: ['planner'],
    parallel: false,
    inputType: 'ContentRequest',
    outputType: 'ContentPlan',
    required: true,
    timeout: 60000,
    retries: 2,
  },
  {
    name: 'research',
    agents: ['researcher'],
    parallel: false,
    inputType: 'ContentPlan',
    outputType: 'ResearchData',
    required: true,
    timeout: 120000,
    retries: 2,
  },
  {
    name: 'writing',
    agents: ['info-writer', 'marketing-writer', 'review-writer', 'food-writer', 'travel-writer', 'tech-writer', 'lifestyle-writer', 'parenting-writer'],
    parallel: false, // 작가는 하나만 선택됨
    inputType: 'ContentPlan + ResearchData',
    outputType: 'DraftContent',
    required: true,
    timeout: 180000,
    retries: 2,
  },
  {
    name: 'editing',
    agents: ['editor'],
    parallel: true, // SEO와 병렬 가능
    inputType: 'DraftContent',
    outputType: 'EditedContent',
    required: true,
    timeout: 120000,
    retries: 2,
  },
  {
    name: 'seo',
    agents: ['seo-expert'],
    parallel: true, // 편집과 병렬 가능
    inputType: 'ContentPlan + EditedContent',
    outputType: 'SEOOptimization',
    required: true,
    timeout: 60000,
    retries: 2,
  },
  {
    name: 'formatting',
    agents: [], // 에이전트 없이 코드로 처리
    parallel: true, // 모든 포맷 병렬 처리
    inputType: 'EditedContent + SEOOptimization',
    outputType: 'FinalContent',
    required: true,
    timeout: 30000,
    retries: 1,
  },
];

/** 기본 워크플로우 설정 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  stages: WORKFLOW_STAGES,
  errorHandling: 'retry',
  maxRetries: 3,
  totalTimeout: 600000, // 10분
  parallelConfig: {
    maxConcurrent: 4,
    cancelOnFailure: false,
    allowPartialResults: false,
  },
};

/**
 * 콘텐츠 유형에 따라 작가 선택
 */
export function selectWriterForContentType(
  contentType: ContentType
): 'info-writer' | 'marketing-writer' | 'review-writer' | 'food-writer' | 'travel-writer' | 'tech-writer' | 'lifestyle-writer' | 'parenting-writer' {
  const writerMap: Record<ContentType, 'info-writer' | 'marketing-writer' | 'review-writer' | 'food-writer' | 'travel-writer' | 'tech-writer' | 'lifestyle-writer' | 'parenting-writer'> = {
    info: 'info-writer',
    marketing: 'marketing-writer',
    review: 'review-writer',
    food: 'food-writer',
    travel: 'travel-writer',
    tech: 'tech-writer',
    lifestyle: 'lifestyle-writer',
    parenting: 'parenting-writer',
  };
  return writerMap[contentType];
}

/**
 * 네이버 블로그 콘텐츠 생성 파이프라인 정의
 */
export const NAVER_BLOG_PIPELINE: PipelineDefinition = {
  name: 'naver-blog-content',
  description: '네이버 블로그 콘텐츠 자동 생성 파이프라인',
  stages: [
    {
      name: 'planning',
      agent: 'planner',
      parallel: false,
      inputTransform: (ctx) => ctx.request,
      outputTransform: (output, ctx) => {
        const result = output as { plan: any };
        return { ...ctx, plan: result.plan };
      },
    },
    {
      name: 'research',
      agent: 'researcher',
      parallel: false,
      inputTransform: (ctx) => ctx.plan,
      outputTransform: (output, ctx) => {
        const result = output as { research: any };
        return { ...ctx, research: result.research };
      },
    },
    {
      name: 'writing',
      agent: 'info-writer', // 런타임에 변경됨
      parallel: false,
      condition: (ctx) => !!ctx.plan && !!ctx.research,
      inputTransform: (ctx) => ({ plan: ctx.plan, research: ctx.research }),
      outputTransform: (output, ctx) => {
        const result = output as { draft: any };
        return { ...ctx, draft: result.draft };
      },
    },
    {
      name: 'editing',
      agent: 'editor',
      parallel: false,
      condition: (ctx) => !!ctx.draft,
      inputTransform: (ctx) => ctx.draft,
      outputTransform: (output, ctx) => {
        const result = output as { edited: any };
        return { ...ctx, edited: result.edited };
      },
    },
    {
      name: 'seo',
      agent: 'seo-expert',
      parallel: false,
      condition: (ctx) => !!ctx.plan && !!ctx.edited,
      inputTransform: (ctx) => ({ plan: ctx.plan, edited: ctx.edited }),
      outputTransform: (output, ctx) => {
        const result = output as { seo: any };
        return { ...ctx, seo: result.seo };
      },
    },
    {
      name: 'formatting',
      agent: [],
      parallel: true,
      condition: (ctx) => !!ctx.edited && !!ctx.seo,
      inputTransform: (ctx) => ({ edited: ctx.edited, seo: ctx.seo }),
      outputTransform: (output, ctx) => {
        return { ...ctx, final: output as any };
      },
    },
  ],
};

/**
 * 파이프라인 검증
 */
export function validatePipeline(pipeline: PipelineDefinition): boolean {
  if (!pipeline.stages || pipeline.stages.length === 0) {
    throw new Error('파이프라인에 단계가 없습니다.');
  }

  const stageNames = new Set<string>();
  for (const stage of pipeline.stages) {
    if (stageNames.has(stage.name)) {
      throw new Error(`중복된 단계 이름: ${stage.name}`);
    }
    stageNames.add(stage.name);
  }

  return true;
}

/**
 * 워크플로우 컨텍스트 초기화
 */
export function createInitialContext(request: any): WorkflowContext {
  return {
    request,
    metadata: {
      workflowId: generateWorkflowId(),
      startedAt: new Date(),
      currentStage: 'planning',
      completedStages: [],
      agentStates: {} as any,
      errors: [],
    },
  };
}

/**
 * 워크플로우 ID 생성
 */
function generateWorkflowId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `wf-${timestamp}-${random}`;
}
