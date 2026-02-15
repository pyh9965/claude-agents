/**
 * 워크플로우 관련 타입 정의
 */

import type { AgentRole, AgentState } from './agent.js';
import type {
  ContentRequest,
  ContentPlan,
  ResearchData,
  DraftContent,
  EditedContent,
  SEOOptimization,
  FinalContent
} from './content.js';

/** 워크플로우 단계 이름 */
export type WorkflowStageName =
  | 'planning'
  | 'research'
  | 'writing'
  | 'editing'
  | 'seo'
  | 'image-collection'
  | 'formatting';

/** 워크플로우 단계 */
export interface WorkflowStage {
  /** 단계 이름 */
  name: WorkflowStageName;
  /** 담당 에이전트들 */
  agents: AgentRole[];
  /** 병렬 실행 여부 */
  parallel: boolean;
  /** 입력 타입 */
  inputType: string;
  /** 출력 타입 */
  outputType: string;
  /** 필수 여부 */
  required: boolean;
  /** 타임아웃 (ms) */
  timeout?: number;
  /** 재시도 횟수 */
  retries?: number;
}

/** 워크플로우 설정 */
export interface WorkflowConfig {
  /** 단계 목록 */
  stages: WorkflowStage[];
  /** 에러 처리 방식 */
  errorHandling: ErrorHandlingStrategy;
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 전체 타임아웃 (ms) */
  totalTimeout: number;
  /** 병렬 실행 설정 */
  parallelConfig: ParallelConfig;
}

/** 에러 처리 전략 */
export type ErrorHandlingStrategy = 'retry' | 'skip' | 'fail' | 'fallback';

/** 병렬 실행 설정 */
export interface ParallelConfig {
  /** 최대 동시 실행 수 */
  maxConcurrent: number;
  /** 실패 시 다른 작업 취소 여부 */
  cancelOnFailure: boolean;
  /** 부분 결과 허용 여부 */
  allowPartialResults: boolean;
}

/** 워크플로우 컨텍스트 */
export interface WorkflowContext {
  /** 원본 요청 */
  request: ContentRequest;
  /** 기획안 */
  plan?: ContentPlan;
  /** 리서치 데이터 */
  research?: ResearchData;
  /** 초안 */
  draft?: DraftContent;
  /** 편집 결과 */
  edited?: EditedContent;
  /** SEO 최적화 결과 */
  seo?: SEOOptimization;
  /** 최종 콘텐츠 */
  final?: FinalContent;
  /** 메타데이터 */
  metadata: WorkflowMetadata;
}

/** 워크플로우 메타데이터 */
export interface WorkflowMetadata {
  /** 워크플로우 ID */
  workflowId: string;
  /** 시작 시간 */
  startedAt: Date;
  /** 현재 단계 */
  currentStage: WorkflowStageName;
  /** 완료된 단계들 */
  completedStages: WorkflowStageName[];
  /** 에이전트 상태들 */
  agentStates: Record<AgentRole, AgentState>;
  /** 에러 로그 */
  errors: WorkflowError[];
  /** 출력 디렉토리 */
  outputDir?: string;
}

/** 워크플로우 에러 */
export interface WorkflowError {
  /** 단계 */
  stage: WorkflowStageName;
  /** 에이전트 */
  agent: AgentRole;
  /** 에러 메시지 */
  message: string;
  /** 스택 트레이스 */
  stack?: string;
  /** 발생 시간 */
  timestamp: Date;
  /** 재시도 가능 여부 */
  retryable: boolean;
}

/** 워크플로우 결과 */
export interface WorkflowResult {
  /** 성공 여부 */
  success: boolean;
  /** 최종 콘텐츠 */
  content?: FinalContent;
  /** 에러 목록 */
  errors: WorkflowError[];
  /** 통계 */
  stats: WorkflowStats;
}

/** 워크플로우 통계 */
export interface WorkflowStats {
  /** 총 소요 시간 (ms) */
  totalTime: number;
  /** 단계별 소요 시간 */
  stageTime: Record<WorkflowStageName, number>;
  /** 총 토큰 사용량 */
  totalTokens: number;
  /** 에이전트별 토큰 사용량 */
  tokensByAgent: Record<AgentRole, number>;
  /** 재시도 횟수 */
  retryCount: number;
}

/** 파이프라인 정의 */
export interface PipelineDefinition {
  /** 파이프라인 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 단계 순서 */
  stages: PipelineStageDefinition[];
}

/** 파이프라인 단계 정의 */
export interface PipelineStageDefinition {
  /** 단계 이름 */
  name: WorkflowStageName;
  /** 에이전트 */
  agent: AgentRole | AgentRole[];
  /** 병렬 실행 여부 */
  parallel: boolean;
  /** 조건 */
  condition?: (context: WorkflowContext) => boolean;
  /** 입력 변환 */
  inputTransform?: (context: WorkflowContext) => unknown;
  /** 출력 변환 */
  outputTransform?: (output: unknown, context: WorkflowContext) => Partial<WorkflowContext>;
}

/** 병렬 실행 작업 */
export interface ParallelTask {
  /** 작업 ID */
  id: string;
  /** 에이전트 */
  agent: AgentRole;
  /** 입력 */
  input: unknown;
  /** 우선순위 */
  priority: number;
}

/** 병렬 실행 결과 */
export interface ParallelResult {
  /** 작업 ID */
  taskId: string;
  /** 에이전트 */
  agent: AgentRole;
  /** 성공 여부 */
  success: boolean;
  /** 결과 */
  result?: unknown;
  /** 에러 */
  error?: string;
  /** 소요 시간 (ms) */
  duration: number;
}

/** 워크플로우 이벤트 */
export type WorkflowEvent =
  | { type: 'workflow_started'; workflowId: string; timestamp: Date }
  | { type: 'stage_started'; stage: WorkflowStageName; timestamp: Date }
  | { type: 'stage_completed'; stage: WorkflowStageName; duration: number; timestamp: Date }
  | { type: 'agent_started'; agent: AgentRole; stage: WorkflowStageName; timestamp: Date }
  | { type: 'agent_completed'; agent: AgentRole; stage: WorkflowStageName; duration: number; timestamp: Date }
  | { type: 'error'; error: WorkflowError; timestamp: Date }
  | { type: 'workflow_completed'; success: boolean; duration: number; timestamp: Date };

/** 워크플로우 이벤트 리스너 */
export type WorkflowEventListener = (event: WorkflowEvent) => void;
