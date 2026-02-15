/**
 * 병렬 실행 엔진
 */

import type {
  ParallelConfig,
  ParallelTask,
  ParallelResult,
  AgentRole,
} from '../types/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ParallelExecutor');

/** 기본 병렬 설정 */
const DEFAULT_PARALLEL_CONFIG: ParallelConfig = {
  maxConcurrent: 4,
  cancelOnFailure: false,
  allowPartialResults: true,
};

/**
 * 병렬 실행 엔진 클래스
 */
export class ParallelExecutor {
  private readonly config: ParallelConfig;
  private runningTasks: Map<string, Promise<ParallelResult>>;
  private cancelRequested: boolean;

  constructor(config: Partial<ParallelConfig> = {}) {
    this.config = { ...DEFAULT_PARALLEL_CONFIG, ...config };
    this.runningTasks = new Map();
    this.cancelRequested = false;
  }

  /**
   * 병렬 작업 실행
   */
  async execute<T>(
    tasks: ParallelTask[],
    executor: (task: ParallelTask) => Promise<T>
  ): Promise<ParallelResult[]> {
    this.cancelRequested = false;
    const results: ParallelResult[] = [];
    const pending: ParallelTask[] = [...tasks].sort((a, b) => b.priority - a.priority);

    logger.info(`병렬 실행 시작: ${tasks.length}개 작업, 최대 동시 실행 ${this.config.maxConcurrent}개`);

    // 청크 단위로 실행
    while (pending.length > 0 && !this.cancelRequested) {
      const chunk = pending.splice(0, this.config.maxConcurrent);
      const chunkResults = await this.executeChunk(chunk, executor);

      results.push(...chunkResults);

      // 실패 시 취소 확인
      if (this.config.cancelOnFailure) {
        const hasFailure = chunkResults.some((r) => !r.success);
        if (hasFailure) {
          logger.warn('작업 실패로 인해 남은 작업 취소');
          this.cancelRequested = true;
          break;
        }
      }
    }

    // 부분 결과 허용 여부 확인
    if (!this.config.allowPartialResults) {
      const allSuccess = results.every((r) => r.success);
      if (!allSuccess) {
        throw new Error('일부 작업이 실패하여 전체 실행 취소');
      }
    }

    logger.info(`병렬 실행 완료: ${results.filter((r) => r.success).length}/${results.length} 성공`);

    return results;
  }

  /**
   * 청크 실행
   */
  private async executeChunk<T>(
    tasks: ParallelTask[],
    executor: (task: ParallelTask) => Promise<T>
  ): Promise<ParallelResult[]> {
    const promises = tasks.map(async (task): Promise<ParallelResult> => {
      const startTime = Date.now();

      try {
        logger.debug(`작업 시작: ${task.id} (${task.agent})`);

        const result = await executor(task);
        const duration = Date.now() - startTime;

        logger.debug(`작업 완료: ${task.id} (${duration}ms)`);

        return {
          taskId: task.id,
          agent: task.agent,
          success: true,
          result,
          duration,
        };
      } catch (error) {
        const duration = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        logger.error(`작업 실패: ${task.id} - ${errorMessage}`);

        return {
          taskId: task.id,
          agent: task.agent,
          success: false,
          error: errorMessage,
          duration,
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * 실행 취소 요청
   */
  cancel(): void {
    this.cancelRequested = true;
    logger.warn('병렬 실행 취소 요청됨');
  }

  /**
   * 실행 중인 작업 수
   */
  get runningCount(): number {
    return this.runningTasks.size;
  }

  /**
   * 취소 요청 여부
   */
  get isCancelled(): boolean {
    return this.cancelRequested;
  }
}

/**
 * 단순 병렬 실행 헬퍼
 */
export async function runParallel<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  maxConcurrent: number = 4
): Promise<R[]> {
  const results: R[] = [];
  const pending = [...items];

  while (pending.length > 0) {
    const chunk = pending.splice(0, maxConcurrent);
    const chunkResults = await Promise.all(chunk.map(fn));
    results.push(...chunkResults);
  }

  return results;
}

/**
 * 타임아웃 래퍼
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = '작업 시간 초과'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}

/**
 * 재시도 래퍼
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      logger.warn(`재시도 ${attempt + 1}/${maxRetries}: ${lastError.message}`);

      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('알 수 없는 오류');
}
