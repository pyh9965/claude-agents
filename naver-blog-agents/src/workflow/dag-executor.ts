/**
 * DAG 워크플로우 엔진
 *
 * 의존성 그래프 기반 워크플로우 실행:
 * - 토폴로지 정렬 (Kahn's algorithm)
 * - 순환 의존성 감지
 * - 레벨별 병렬 실행
 */

import type { WorkflowStageName } from '../types/index.js';

/** DAG 노드 정의 */
export interface DAGNode {
  /** 노드 이름 */
  name: WorkflowStageName;
  /** 의존하는 노드들 */
  dependencies: WorkflowStageName[];
  /** 실행할 함수 */
  executor: () => Promise<unknown>;
}

/** DAG 실행 결과 */
export interface DAGExecutionResult {
  /** 성공 여부 */
  success: boolean;
  /** 각 노드의 실행 결과 */
  results: Map<WorkflowStageName, unknown>;
  /** 실행 순서 */
  executionOrder: WorkflowStageName[];
  /** 에러 목록 */
  errors: Array<{ stage: WorkflowStageName; error: Error }>;
}

/**
 * DAG 실행 엔진
 *
 * 기능:
 * - 노드 추가 및 의존성 관리
 * - 토폴로지 정렬로 실행 순서 결정
 * - 순환 의존성 감지
 * - 레벨별 병렬 실행
 */
export class DAGExecutor {
  private nodes: Map<WorkflowStageName, DAGNode> = new Map();

  /**
   * 노드 추가
   */
  addNode(node: DAGNode): void {
    // 노드 검증
    if (!node.name) {
      throw new Error('Node name is required');
    }
    if (!node.executor || typeof node.executor !== 'function') {
      throw new Error('Node executor must be a function');
    }
    if (!Array.isArray(node.dependencies)) {
      throw new Error('Node dependencies must be an array');
    }

    this.nodes.set(node.name, node);
  }

  /**
   * 토폴로지 정렬 (Kahn's algorithm)
   *
   * 알고리즘:
   * 1. 각 노드의 진입 차수(in-degree) 계산
   * 2. 진입 차수가 0인 노드를 큐에 추가
   * 3. 큐에서 노드를 꺼내고 해당 노드를 가리키는 간선 제거
   * 4. 새로 진입 차수가 0이 된 노드를 큐에 추가
   * 5. 모든 노드를 처리할 때까지 반복
   *
   * @throws {Error} 순환 의존성이 있는 경우
   */
  private topologicalSort(): WorkflowStageName[] {
    const inDegree = new Map<WorkflowStageName, number>();
    const result: WorkflowStageName[] = [];

    // 1. 진입 차수 초기화 및 계산
    for (const [nodeName] of Array.from(this.nodes)) {
      inDegree.set(nodeName, 0);
    }

    for (const [, node] of Array.from(this.nodes)) {
      for (const dep of node.dependencies) {
        // 의존성이 존재하는지 검증
        if (!this.nodes.has(dep)) {
          throw new Error(
            `Node "${node.name}" depends on non-existent node "${dep}"`
          );
        }
        inDegree.set(dep, (inDegree.get(dep) || 0));
      }
    }

    for (const [, node] of Array.from(this.nodes)) {
      for (const dep of node.dependencies) {
        inDegree.set(node.name, (inDegree.get(node.name) || 0) + 1);
      }
    }

    // 2. 진입 차수가 0인 노드를 큐에 추가
    const queue: WorkflowStageName[] = [];
    for (const [nodeName, degree] of Array.from(inDegree)) {
      if (degree === 0) {
        queue.push(nodeName);
      }
    }

    // 3. 토폴로지 정렬 수행
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // 현재 노드에 의존하는 노드들의 진입 차수 감소
      for (const [, node] of Array.from(this.nodes)) {
        if (node.dependencies.includes(current)) {
          const newDegree = (inDegree.get(node.name) || 0) - 1;
          inDegree.set(node.name, newDegree);

          if (newDegree === 0) {
            queue.push(node.name);
          }
        }
      }
    }

    // 4. 순환 의존성 검사
    if (result.length !== this.nodes.size) {
      const unprocessed = Array.from(this.nodes.keys()).filter(
        name => !result.includes(name)
      );
      throw new Error(
        `Circular dependency detected. Unprocessed nodes: ${unprocessed.join(', ')}`
      );
    }

    return result;
  }

  /**
   * DAG 실행
   *
   * 실행 전략:
   * - 토폴로지 정렬로 실행 순서 결정
   * - 같은 레벨의 노드들은 병렬 실행
   * - 에러 발생 시 해당 노드만 실패 처리하고 계속 진행
   *
   * @returns 실행 결과
   */
  async execute(): Promise<DAGExecutionResult> {
    const executionOrder = this.topologicalSort();
    const results = new Map<WorkflowStageName, unknown>();
    const errors: Array<{ stage: WorkflowStageName; error: Error }> = [];
    const completed = new Set<WorkflowStageName>();

    // 레벨별로 노드를 그룹화하여 병렬 실행
    let remaining = [...executionOrder];

    while (remaining.length > 0) {
      // 현재 레벨: 의존성이 모두 충족된 노드들
      const currentLevel: WorkflowStageName[] = [];

      for (const nodeName of remaining) {
        const node = this.nodes.get(nodeName)!;
        if (this.areDependenciesMet(node, completed)) {
          currentLevel.push(nodeName);
        }
      }

      if (currentLevel.length === 0) {
        // 더 이상 실행 가능한 노드가 없는데 remaining이 있다면
        // 에러로 인해 의존성을 충족할 수 없는 상황
        break;
      }

      // 같은 레벨의 노드들을 병렬 실행
      const levelPromises = currentLevel.map(async (nodeName) => {
        const node = this.nodes.get(nodeName)!;

        try {
          const result = await node.executor();
          results.set(nodeName, result);
          completed.add(nodeName);
          return { success: true, nodeName };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          errors.push({ stage: nodeName, error: err });
          // 에러가 발생해도 completed에 추가하지 않음
          // 이로 인해 이 노드에 의존하는 다른 노드들은 실행되지 않음
          return { success: false, nodeName };
        }
      });

      await Promise.all(levelPromises);

      // 완료된 노드들을 remaining에서 제거
      remaining = remaining.filter(name => !currentLevel.includes(name));
    }

    return {
      success: errors.length === 0 && completed.size === this.nodes.size,
      results,
      executionOrder,
      errors
    };
  }

  /**
   * 특정 노드의 의존성이 모두 충족되었는지 확인
   *
   * @param node 확인할 노드
   * @param completed 완료된 노드 목록
   * @returns 의존성 충족 여부
   */
  private areDependenciesMet(
    node: DAGNode,
    completed: Set<WorkflowStageName>
  ): boolean {
    return node.dependencies.every(dep => completed.has(dep));
  }

  /**
   * 노드 개수 반환
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * 특정 노드 조회
   */
  getNode(name: WorkflowStageName): DAGNode | undefined {
    return this.nodes.get(name);
  }

  /**
   * 모든 노드 이름 반환
   */
  getNodeNames(): WorkflowStageName[] {
    return Array.from(this.nodes.keys());
  }

  /**
   * DAG 초기화
   */
  clear(): void {
    this.nodes.clear();
  }
}

/**
 * 기본 블로그 워크플로우 DAG 생성
 *
 * 구조:
 * ```
 * planning ──→ research ──→ writing ──┬──→ editing ──┐
 *                                     │              │
 *                                     └──→ seo ──────┴──→ formatting
 * ```
 *
 * @param executors 각 단계의 실행 함수들
 * @returns 설정된 DAG 실행기
 */
export function createBlogWorkflowDAG(
  executors: Record<WorkflowStageName, () => Promise<unknown>>
): DAGExecutor {
  const dag = new DAGExecutor();

  // 노드 정의
  dag.addNode({
    name: 'planning',
    dependencies: [],
    executor: executors.planning
  });

  dag.addNode({
    name: 'research',
    dependencies: ['planning'],
    executor: executors.research
  });

  dag.addNode({
    name: 'writing',
    dependencies: ['research'],
    executor: executors.writing
  });

  dag.addNode({
    name: 'editing',
    dependencies: ['writing'],
    executor: executors.editing
  });

  dag.addNode({
    name: 'seo',
    dependencies: ['writing'],
    executor: executors.seo
  });

  dag.addNode({
    name: 'formatting',
    dependencies: ['editing', 'seo'],
    executor: executors.formatting
  });

  return dag;
}
