/**
 * 워크플로우 오케스트레이터
 */

import type {
  ContentRequest,
  ContentPlan,
  ResearchData,
  DraftContent,
  EditedContent,
  SEOOptimization,
  FinalContent,
  WorkflowContext,
  WorkflowResult,
  WorkflowStats,
  WorkflowEvent,
  WorkflowEventListener,
  WorkflowStageName,
  WorkflowLogEntry,
  AgentRole,
} from '../types/index.js';
import {
  createAgentTeam,
  type AgentTeamInstance,
  getWriterRole,
} from '../agents/index.js';
import { createInitialContext, selectWriterForContentType } from './pipeline.js';
import { ParallelExecutor, withTimeout, withRetry } from './parallel-executor.js';
import { createLogger } from '../utils/logger.js';
import {
  formatToNaverHtml,
  formatToMarkdown,
  formatToJSON,
} from '../formatters/index.js';
import { runImageCollectionStage, type ImageCollectionStageOptions, type ImageStageResult } from './stages/image-collection.js';
import type { ImageMap } from '../types/image.js';

const logger = createLogger('Orchestrator');

/** 오케스트레이터 옵션 */
export interface OrchestratorOptions {
  /** 전체 타임아웃 (ms) */
  totalTimeout?: number;
  /** 단계별 타임아웃 (ms) */
  stageTimeout?: number;
  /** 최대 재시도 횟수 */
  maxRetries?: number;
  /** 이미지 수집 옵션 */
  imageOptions?: ImageCollectionStageOptions;
  /** 이벤트 리스너 */
  onEvent?: WorkflowEventListener;
}

const DEFAULT_OPTIONS: Required<OrchestratorOptions> = {
  totalTimeout: 600000, // 10분
  stageTimeout: 180000, // 3분
  maxRetries: 2,
  imageOptions: { withImages: false },
  onEvent: () => {},
};

/**
 * 워크플로우 오케스트레이터 클래스
 */
export class WorkflowOrchestrator {
  private readonly options: Required<OrchestratorOptions>;
  private readonly team: AgentTeamInstance;
  private readonly parallelExecutor: ParallelExecutor;
  private context: WorkflowContext | null = null;
  private workflowLog: WorkflowLogEntry[] = [];

  constructor(options: OrchestratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.team = createAgentTeam();
    this.parallelExecutor = new ParallelExecutor({
      maxConcurrent: 2,
      cancelOnFailure: false,
      allowPartialResults: false,
    });
  }

  /**
   * 이벤트 발행
   */
  private emit(event: WorkflowEvent): void {
    this.options.onEvent(event);
    logger.debug(`이벤트: ${event.type}`);
  }

  /**
   * 단계 로그 기록
   */
  private logStage(
    stage: WorkflowStageName,
    agent: AgentRole | 'formatter',
    startedAt: Date,
    status: 'success' | 'error' | 'skipped',
    message?: string
  ): void {
    this.workflowLog.push({
      stage,
      agent: agent as string,
      startedAt,
      completedAt: new Date(),
      status,
      message,
    });
  }

  /**
   * 콘텐츠 생성 워크플로우 실행
   */
  async execute(request: ContentRequest): Promise<WorkflowResult> {
    const startTime = Date.now();
    this.context = createInitialContext(request);
    this.workflowLog = [];

    logger.info(`워크플로우 시작: ${request.topic} (${request.type})`);
    this.emit({
      type: 'workflow_started',
      workflowId: this.context.metadata.workflowId,
      timestamp: new Date(),
    });

    try {
      // Phase 0: SEO 키워드 선정 (전처리)
      const seoKeywords = await this.runSEOKeywordPhase(request);

      // Phase 1: 기획 (SEO 키워드 반영)
      const plan = await this.runPlanningPhase(request, seoKeywords);
      this.context.plan = plan;

      // Phase 2: 리서치 (참조 데이터 전달)
      const research = await this.runResearchPhase(plan, request.referenceData);
      this.context.research = research;

      // Phase 3: 작성
      const draft = await this.runWritingPhase(plan, research);
      this.context.draft = draft;

      // Phase 4 & 5: 편집 + SEO (병렬 실행 - 둘 다 draft 사용)
      const editingAndSeoStartedAt = new Date();
      logger.info('편집 및 SEO 병렬 실행 시작');
      this.emit({ type: 'stage_started', stage: 'editing', timestamp: editingAndSeoStartedAt });

      const [editedResult, seo] = await Promise.all([
        this.runEditingPhase(draft),
        this.runSEOPhase(plan, draft as unknown as EditedContent),
      ]);

      let edited = editedResult;

      this.context.edited = edited;
      this.context.seo = seo;

      const editingAndSeoDuration = Date.now() - editingAndSeoStartedAt.getTime();
      logger.info(`편집 및 SEO 병렬 실행 완료: ${editingAndSeoDuration}ms`);

      // Phase 5.5: 이미지 수집 (선택적)
      let imageResult: ImageStageResult | undefined;
      if (this.options.imageOptions?.withImages) {
        imageResult = await this.runImageCollectionPhase(
          edited,
          seo,
          plan.assignedWriter
        );

        // 이미지가 성공적으로 수집되면 edited 콘텐츠 업데이트
        if (imageResult?.success && !imageResult.skipped && imageResult.htmlWithImages) {
          edited = {
            ...edited,
            body: imageResult.htmlWithImages,
          };
        }
      }

      // Phase 6: 포맷팅
      const final = await this.runFormattingPhase(plan, edited, seo);
      this.context.final = final;

      const totalTime = Date.now() - startTime;
      logger.info(`워크플로우 완료: ${totalTime}ms`);

      this.emit({
        type: 'workflow_completed',
        success: true,
        duration: totalTime,
        timestamp: new Date(),
      });

      return {
        success: true,
        content: final,
        errors: this.context.metadata.errors,
        stats: this.calculateStats(startTime),
      };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error(`워크플로우 실패: ${errorMessage}`);

      this.emit({
        type: 'workflow_completed',
        success: false,
        duration: totalTime,
        timestamp: new Date(),
      });

      return {
        success: false,
        errors: [
          ...this.context.metadata.errors,
          {
            stage: this.context.metadata.currentStage,
            agent: 'orchestrator' as AgentRole,
            message: errorMessage,
            timestamp: new Date(),
            retryable: false,
          },
        ],
        stats: this.calculateStats(startTime),
      };
    }
  }

  /**
   * Phase 0: SEO 키워드 선정 단계 (전처리)
   */
  private async runSEOKeywordPhase(
    request: ContentRequest
  ): Promise<{ mainKeyword: string; subKeywords: string[]; longTailKeywords: string[] } | null> {
    const startedAt = new Date();

    logger.info('SEO 키워드 선정 시작 (전처리)');

    try {
      const result = await withTimeout(
        this.team.seoExpert.selectKeywords(request.topic, request.type),
        60000, // 1분 타임아웃
        'SEO 키워드 선정 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.info(`SEO 키워드 선정 완료: ${duration}ms, 메인 키워드: ${result.keywordAnalysis.mainKeyword}`);

      return {
        mainKeyword: result.keywordAnalysis.mainKeyword,
        subKeywords: result.keywordAnalysis.subKeywords,
        longTailKeywords: result.keywordAnalysis.longTailKeywords,
      };
    } catch (error) {
      // SEO 전처리 실패 시 경고만 출력하고 계속 진행 (선택적 기능)
      logger.warn(`SEO 키워드 선정 실패, 기본값 사용: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Phase 1: 기획 단계
   */
  private async runPlanningPhase(
    request: ContentRequest,
    seoKeywords?: { mainKeyword: string; subKeywords: string[]; longTailKeywords: string[] } | null
  ): Promise<ContentPlan> {
    const stageName: WorkflowStageName = 'planning';
    const startedAt = new Date();

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      const result = await withTimeout(
        withRetry(
          () => this.team.planner.plan(request, seoKeywords),
          this.options.maxRetries
        ),
        this.options.stageTimeout,
        '기획 단계 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, 'planner', startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return result.plan;
    } catch (error) {
      this.logStage(stageName, 'planner', startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Phase 2: 리서치 단계
   */
  private async runResearchPhase(
    plan: ContentPlan,
    referenceData?: Record<string, unknown>
  ): Promise<ResearchData> {
    const stageName: WorkflowStageName = 'research';
    const startedAt = new Date();

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      const result = await withTimeout(
        withRetry(
          () => this.team.researcher.research(plan, referenceData),
          this.options.maxRetries
        ),
        this.options.stageTimeout,
        '리서치 단계 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, 'researcher', startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return result.research;
    } catch (error) {
      this.logStage(stageName, 'researcher', startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Phase 3: 작성 단계
   */
  private async runWritingPhase(
    plan: ContentPlan,
    research: ResearchData
  ): Promise<DraftContent> {
    const stageName: WorkflowStageName = 'writing';
    const startedAt = new Date();
    const writerRole = getWriterRole(plan.assignedWriter);

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      const writer = this.team.getWriter(plan.assignedWriter);
      const result = await withTimeout(
        withRetry(
          () => writer.write(plan, research),
          this.options.maxRetries
        ),
        this.options.stageTimeout,
        '작성 단계 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, writerRole, startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return result.draft;
    } catch (error) {
      this.logStage(stageName, writerRole, startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Phase 4: 편집 단계
   */
  private async runEditingPhase(draft: DraftContent): Promise<EditedContent> {
    const stageName: WorkflowStageName = 'editing';
    const startedAt = new Date();

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      const result = await withTimeout(
        withRetry(
          () => this.team.editor.edit(draft),
          this.options.maxRetries
        ),
        this.options.stageTimeout,
        '편집 단계 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, 'editor', startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return result.edited;
    } catch (error) {
      this.logStage(stageName, 'editor', startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Phase 5: SEO 단계
   */
  private async runSEOPhase(
    plan: ContentPlan,
    edited: EditedContent
  ): Promise<SEOOptimization> {
    const stageName: WorkflowStageName = 'seo';
    const startedAt = new Date();

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      const result = await withTimeout(
        withRetry(
          () => this.team.seoExpert.optimize(plan, edited),
          this.options.maxRetries
        ),
        this.options.stageTimeout,
        'SEO 단계 시간 초과'
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, 'seo-expert', startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return result.seo;
    } catch (error) {
      this.logStage(stageName, 'seo-expert', startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * Phase 5.5: 이미지 수집 단계
   */
  private async runImageCollectionPhase(
    edited: EditedContent,
    seo: SEOOptimization,
    contentType: import('../types/index.js').ContentType
  ): Promise<ImageStageResult> {
    const stageName = 'image-collection' as WorkflowStageName;
    const startedAt = new Date();

    logger.stage(stageName as any, 'start');
    this.emit({ type: 'stage_started', stage: stageName as any, timestamp: startedAt });

    try {
      const outputDir = this.options.imageOptions?.outputDir || './output';
      const result = await runImageCollectionStage(
        edited,
        seo,
        contentType,
        outputDir,
        this.options.imageOptions!
      );

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName as any, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName as any, duration, timestamp: new Date() });

      if (result.success && !result.skipped) {
        logger.info(`이미지 수집: ${result.statistics?.total || 0}개`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`이미지 수집 실패 (계속 진행): ${errorMessage}`);
      return { success: false, skipped: false, error: errorMessage };
    }
  }

  /**
   * Phase 6: 포맷팅 단계
   */
  private async runFormattingPhase(
    plan: ContentPlan,
    edited: EditedContent,
    seo: SEOOptimization
  ): Promise<FinalContent> {
    const stageName: WorkflowStageName = 'formatting';
    const startedAt = new Date();

    logger.stage(stageName, 'start');
    this.emit({ type: 'stage_started', stage: stageName, timestamp: startedAt });
    this.context!.metadata.currentStage = stageName;

    try {
      // 병렬로 모든 포맷 생성
      const [naverHtml, markdown, json] = await Promise.all([
        formatToNaverHtml(edited, seo),
        formatToMarkdown(edited, seo),
        formatToJSON(edited, seo),
      ]);

      const wordCount = edited.body.length;
      const readingTime = Math.ceil(wordCount / 500); // 분당 500자

      const final: FinalContent = {
        title: seo.seoTitle || edited.title,
        body: edited.body,
        seoTitle: seo.seoTitle,
        metaDescription: seo.metaDescription,
        tags: seo.tags,
        formats: {
          naverHtml,
          markdown,
          json,
        },
        metadata: {
          contentType: plan.assignedWriter,
          writer: this.context!.draft?.metadata.writer || '',
          createdAt: new Date(),
          wordCount,
          readingTime,
          seoScore: seo.seoScore,
          workflowLog: this.workflowLog,
        },
      };

      const duration = Date.now() - startedAt.getTime();
      logger.stage(stageName, 'end', duration);
      this.emit({ type: 'stage_completed', stage: stageName, duration, timestamp: new Date() });
      this.logStage(stageName, 'formatter' as any, startedAt, 'success');
      this.context!.metadata.completedStages.push(stageName);

      return final;
    } catch (error) {
      this.logStage(stageName, 'formatter' as any, startedAt, 'error', (error as Error).message);
      throw error;
    }
  }

  /**
   * 통계 계산
   */
  private calculateStats(startTime: number): WorkflowStats {
    const totalTime = Date.now() - startTime;

    const stageTime: Record<WorkflowStageName, number> = {
      planning: 0,
      research: 0,
      writing: 0,
      editing: 0,
      seo: 0,
      'image-collection': 0,
      formatting: 0,
    };

    for (const log of this.workflowLog) {
      const duration = log.completedAt.getTime() - log.startedAt.getTime();
      const stage = log.stage as WorkflowStageName;
      if (stage in stageTime) {
        stageTime[stage] += duration;
      }
    }

    return {
      totalTime,
      stageTime,
      totalTokens: 0, // TODO: 토큰 사용량 추적
      tokensByAgent: {} as Record<AgentRole, number>,
      retryCount: 0, // TODO: 재시도 횟수 추적
    };
  }

  /**
   * 현재 컨텍스트 반환
   */
  getContext(): WorkflowContext | null {
    return this.context;
  }

  /**
   * 워크플로우 로그 반환
   */
  getWorkflowLog(): WorkflowLogEntry[] {
    return this.workflowLog;
  }
}

/**
 * 간편 실행 함수
 */
export async function generateBlogContent(
  request: ContentRequest,
  options?: OrchestratorOptions
): Promise<WorkflowResult> {
  const orchestrator = new WorkflowOrchestrator(options);
  return orchestrator.execute(request);
}
