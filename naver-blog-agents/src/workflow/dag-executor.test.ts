/**
 * DAG 실행기 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { DAGExecutor, createBlogWorkflowDAG } from './dag-executor.js';
import type { WorkflowStageName } from '../types/index.js';

describe('DAGExecutor', () => {
  describe('노드 추가', () => {
    it('노드를 정상적으로 추가할 수 있다', () => {
      const dag = new DAGExecutor();
      const executor = vi.fn().mockResolvedValue('result');

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor
      });

      expect(dag.getNodeCount()).toBe(1);
      expect(dag.getNode('planning')).toBeDefined();
    });

    it('이름이 없는 노드는 에러를 발생시킨다', () => {
      const dag = new DAGExecutor();

      expect(() => {
        dag.addNode({
          name: '' as WorkflowStageName,
          dependencies: [],
          executor: vi.fn()
        });
      }).toThrow('Node name is required');
    });

    it('executor가 함수가 아니면 에러를 발생시킨다', () => {
      const dag = new DAGExecutor();

      expect(() => {
        dag.addNode({
          name: 'planning',
          dependencies: [],
          executor: 'not a function' as any
        });
      }).toThrow('Node executor must be a function');
    });

    it('dependencies가 배열이 아니면 에러를 발생시킨다', () => {
      const dag = new DAGExecutor();

      expect(() => {
        dag.addNode({
          name: 'planning',
          dependencies: 'not an array' as any,
          executor: vi.fn()
        });
      }).toThrow('Node dependencies must be an array');
    });
  });

  describe('토폴로지 정렬', () => {
    it('의존성이 없는 단일 노드를 정렬할 수 있다', async () => {
      const dag = new DAGExecutor();
      const executor = vi.fn().mockResolvedValue('result');

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor
      });

      const result = await dag.execute();

      expect(result.success).toBe(true);
      expect(result.executionOrder).toEqual(['planning']);
      expect(executor).toHaveBeenCalledTimes(1);
    });

    it('선형 의존성을 올바른 순서로 정렬한다', async () => {
      const dag = new DAGExecutor();
      const executors = {
        planning: vi.fn().mockResolvedValue('plan'),
        research: vi.fn().mockResolvedValue('research'),
        writing: vi.fn().mockResolvedValue('draft')
      };

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

      const result = await dag.execute();

      expect(result.success).toBe(true);
      expect(result.executionOrder).toEqual(['planning', 'research', 'writing']);

      // 순서대로 실행되었는지 확인
      const planningCallOrder = executors.planning.mock.invocationCallOrder[0];
      const researchCallOrder = executors.research.mock.invocationCallOrder[0];
      const writingCallOrder = executors.writing.mock.invocationCallOrder[0];

      expect(planningCallOrder).toBeLessThan(researchCallOrder);
      expect(researchCallOrder).toBeLessThan(writingCallOrder);
    });

    it('다이아몬드 의존성을 올바르게 처리한다', async () => {
      const dag = new DAGExecutor();
      const executionLog: string[] = [];

      // 다이아몬드 구조: A -> B,C -> D
      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => {
          executionLog.push('planning');
          return 'plan';
        }
      });

      dag.addNode({
        name: 'research',
        dependencies: ['planning'],
        executor: async () => {
          executionLog.push('research');
          return 'research';
        }
      });

      dag.addNode({
        name: 'writing',
        dependencies: ['planning'],
        executor: async () => {
          executionLog.push('writing');
          return 'draft';
        }
      });

      dag.addNode({
        name: 'editing',
        dependencies: ['research', 'writing'],
        executor: async () => {
          executionLog.push('editing');
          return 'edited';
        }
      });

      const result = await dag.execute();

      expect(result.success).toBe(true);

      // planning이 가장 먼저 실행
      expect(executionLog[0]).toBe('planning');

      // research와 writing은 planning 이후에 실행 (순서는 무관)
      expect(executionLog.slice(1, 3)).toContain('research');
      expect(executionLog.slice(1, 3)).toContain('writing');

      // editing은 가장 마지막에 실행
      expect(executionLog[3]).toBe('editing');
    });

    it('순환 의존성을 감지한다', async () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: ['research'],
        executor: vi.fn()
      });

      dag.addNode({
        name: 'research',
        dependencies: ['planning'],
        executor: vi.fn()
      });

      await expect(dag.execute()).rejects.toThrow('Circular dependency detected');
    });

    it('존재하지 않는 의존성을 감지한다', async () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: ['nonexistent' as WorkflowStageName],
        executor: vi.fn()
      });

      await expect(dag.execute()).rejects.toThrow(
        'depends on non-existent node "nonexistent"'
      );
    });
  });

  describe('병렬 실행', () => {
    it('같은 레벨의 노드들을 병렬로 실행한다', async () => {
      const dag = new DAGExecutor();
      const startTimes: Record<string, number> = {};
      const endTimes: Record<string, number> = {};

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => {
          startTimes.planning = Date.now();
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.planning = Date.now();
          return 'plan';
        }
      });

      dag.addNode({
        name: 'research',
        dependencies: [],
        executor: async () => {
          startTimes.research = Date.now();
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.research = Date.now();
          return 'research';
        }
      });

      dag.addNode({
        name: 'writing',
        dependencies: [],
        executor: async () => {
          startTimes.writing = Date.now();
          await new Promise(resolve => setTimeout(resolve, 50));
          endTimes.writing = Date.now();
          return 'draft';
        }
      });

      const result = await dag.execute();

      expect(result.success).toBe(true);

      // 세 노드가 거의 동시에 시작되었는지 확인 (오차 범위 30ms)
      const startTimeDiff = Math.max(
        Math.abs(startTimes.planning - startTimes.research),
        Math.abs(startTimes.planning - startTimes.writing),
        Math.abs(startTimes.research - startTimes.writing)
      );
      expect(startTimeDiff).toBeLessThan(30);
    });

    it('블로그 워크플로우에서 editing과 seo를 병렬 실행한다', async () => {
      const executionLog: Array<{ stage: string; time: number }> = [];
      const executors: Record<WorkflowStageName, () => Promise<unknown>> = {
        planning: async () => {
          executionLog.push({ stage: 'planning', time: Date.now() });
          return 'plan';
        },
        research: async () => {
          executionLog.push({ stage: 'research', time: Date.now() });
          return 'research';
        },
        writing: async () => {
          executionLog.push({ stage: 'writing', time: Date.now() });
          await new Promise(resolve => setTimeout(resolve, 10));
          return 'draft';
        },
        editing: async () => {
          executionLog.push({ stage: 'editing', time: Date.now() });
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'edited';
        },
        seo: async () => {
          executionLog.push({ stage: 'seo', time: Date.now() });
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'seo';
        },
        'image-collection': async () => {
          return 'image-collection done';
        },
        formatting: async () => {
          executionLog.push({ stage: 'formatting', time: Date.now() });
          return 'formatted';
        }
      };

      const dag = createBlogWorkflowDAG(executors);
      const result = await dag.execute();

      expect(result.success).toBe(true);

      // editing과 seo의 시작 시간이 거의 동일한지 확인
      const editingLog = executionLog.find(log => log.stage === 'editing')!;
      const seoLog = executionLog.find(log => log.stage === 'seo')!;

      expect(Math.abs(editingLog.time - seoLog.time)).toBeLessThan(30);

      // formatting은 editing과 seo 이후에 실행
      const formattingLog = executionLog.find(log => log.stage === 'formatting')!;
      expect(formattingLog.time).toBeGreaterThan(editingLog.time);
      expect(formattingLog.time).toBeGreaterThan(seoLog.time);
    });
  });

  describe('에러 처리', () => {
    it('에러가 발생한 노드를 기록한다', async () => {
      const dag = new DAGExecutor();
      const error = new Error('Planning failed');

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => {
          throw error;
        }
      });

      const result = await dag.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].stage).toBe('planning');
      expect(result.errors[0].error).toBe(error);
    });

    it('에러가 발생해도 다른 독립적인 노드는 계속 실행한다', async () => {
      const dag = new DAGExecutor();
      const successExecutor = vi.fn().mockResolvedValue('success');

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => {
          throw new Error('Planning failed');
        }
      });

      dag.addNode({
        name: 'research',
        dependencies: [],
        executor: successExecutor
      });

      const result = await dag.execute();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(successExecutor).toHaveBeenCalled();
      expect(result.results.get('research')).toBe('success');
    });

    it('에러가 발생한 노드에 의존하는 노드는 실행하지 않는다', async () => {
      const dag = new DAGExecutor();
      const dependentExecutor = vi.fn().mockResolvedValue('result');

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => {
          throw new Error('Planning failed');
        }
      });

      dag.addNode({
        name: 'research',
        dependencies: ['planning'],
        executor: dependentExecutor
      });

      const result = await dag.execute();

      expect(result.success).toBe(false);
      expect(dependentExecutor).not.toHaveBeenCalled();
      expect(result.results.has('research')).toBe(false);
    });
  });

  describe('실행 결과', () => {
    it('모든 노드의 결과를 저장한다', async () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => 'plan result'
      });

      dag.addNode({
        name: 'research',
        dependencies: ['planning'],
        executor: async () => 'research result'
      });

      const result = await dag.execute();

      expect(result.results.get('planning')).toBe('plan result');
      expect(result.results.get('research')).toBe('research result');
    });

    it('실행 순서를 기록한다', async () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: async () => 'plan'
      });

      dag.addNode({
        name: 'research',
        dependencies: ['planning'],
        executor: async () => 'research'
      });

      dag.addNode({
        name: 'writing',
        dependencies: ['research'],
        executor: async () => 'draft'
      });

      const result = await dag.execute();

      expect(result.executionOrder).toEqual(['planning', 'research', 'writing']);
    });
  });

  describe('createBlogWorkflowDAG', () => {
    it('올바른 의존성 구조를 생성한다', () => {
      const executors: Record<WorkflowStageName, () => Promise<unknown>> = {
        planning: async () => 'plan',
        research: async () => 'research',
        writing: async () => 'draft',
        editing: async () => 'edited',
        seo: async () => 'seo',
        'image-collection': async () => 'image-collection done',
        formatting: async () => 'formatted'
      };

      const dag = createBlogWorkflowDAG(executors);

      expect(dag.getNodeCount()).toBe(6);
      expect(dag.getNode('planning')?.dependencies).toEqual([]);
      expect(dag.getNode('research')?.dependencies).toEqual(['planning']);
      expect(dag.getNode('writing')?.dependencies).toEqual(['research']);
      expect(dag.getNode('editing')?.dependencies).toEqual(['writing']);
      expect(dag.getNode('seo')?.dependencies).toEqual(['writing']);
      expect(dag.getNode('formatting')?.dependencies).toEqual(['editing', 'seo']);
    });

    it('전체 워크플로우를 성공적으로 실행한다', async () => {
      const executionLog: WorkflowStageName[] = [];
      const executors: Record<WorkflowStageName, () => Promise<unknown>> = {
        planning: async () => {
          executionLog.push('planning');
          return 'plan';
        },
        research: async () => {
          executionLog.push('research');
          return 'research';
        },
        writing: async () => {
          executionLog.push('writing');
          return 'draft';
        },
        editing: async () => {
          executionLog.push('editing');
          return 'edited';
        },
        seo: async () => {
          executionLog.push('seo');
          return 'seo';
        },
        'image-collection': async () => {
          executionLog.push('image-collection');
          return 'image-collection done';
        },
        formatting: async () => {
          executionLog.push('formatting');
          return 'formatted';
        }
      };

      const dag = createBlogWorkflowDAG(executors);
      const result = await dag.execute();

      expect(result.success).toBe(true);
      expect(executionLog).toHaveLength(6);

      // 실행 순서 검증
      expect(executionLog.indexOf('planning')).toBeLessThan(executionLog.indexOf('research'));
      expect(executionLog.indexOf('research')).toBeLessThan(executionLog.indexOf('writing'));
      expect(executionLog.indexOf('writing')).toBeLessThan(executionLog.indexOf('editing'));
      expect(executionLog.indexOf('writing')).toBeLessThan(executionLog.indexOf('seo'));
      expect(executionLog.indexOf('editing')).toBeLessThan(executionLog.indexOf('formatting'));
      expect(executionLog.indexOf('seo')).toBeLessThan(executionLog.indexOf('formatting'));
    });
  });

  describe('유틸리티 메서드', () => {
    it('getNodeCount()는 노드 개수를 반환한다', () => {
      const dag = new DAGExecutor();

      expect(dag.getNodeCount()).toBe(0);

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: vi.fn()
      });

      expect(dag.getNodeCount()).toBe(1);

      dag.addNode({
        name: 'research',
        dependencies: [],
        executor: vi.fn()
      });

      expect(dag.getNodeCount()).toBe(2);
    });

    it('getNodeNames()는 모든 노드 이름을 반환한다', () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: vi.fn()
      });

      dag.addNode({
        name: 'research',
        dependencies: [],
        executor: vi.fn()
      });

      const names = dag.getNodeNames();

      expect(names).toContain('planning');
      expect(names).toContain('research');
      expect(names).toHaveLength(2);
    });

    it('clear()는 모든 노드를 제거한다', () => {
      const dag = new DAGExecutor();

      dag.addNode({
        name: 'planning',
        dependencies: [],
        executor: vi.fn()
      });

      expect(dag.getNodeCount()).toBe(1);

      dag.clear();

      expect(dag.getNodeCount()).toBe(0);
    });
  });
});
