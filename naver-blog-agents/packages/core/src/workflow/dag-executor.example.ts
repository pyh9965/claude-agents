/**
 * DAG 실행기 사용 예제
 */

import { DAGExecutor, createBlogWorkflowDAG } from './dag-executor.js';
import type { WorkflowStageName } from '../types/index.js';

/**
 * 예제 1: 기본 DAG 사용
 */
async function basicExample() {
  console.log('=== 기본 DAG 예제 ===\n');

  const dag = new DAGExecutor();

  // 노드 추가
  dag.addNode({
    name: 'planning',
    dependencies: [],
    executor: async () => {
      console.log('Planning stage: 주제 분석 및 목차 작성');
      return { topic: 'AI 블로그 작성', outline: ['서론', '본론', '결론'] };
    }
  });

  dag.addNode({
    name: 'research',
    dependencies: ['planning'],
    executor: async () => {
      console.log('Research stage: 관련 자료 수집');
      return { sources: ['source1', 'source2'], data: {} };
    }
  });

  dag.addNode({
    name: 'writing',
    dependencies: ['research'],
    executor: async () => {
      console.log('Writing stage: 초안 작성');
      return { content: '초안 내용...', wordCount: 1000 };
    }
  });

  // 실행
  const result = await dag.execute();

  console.log('\n실행 결과:');
  console.log('- 성공:', result.success);
  console.log('- 실행 순서:', result.executionOrder);
  console.log('- 결과 개수:', result.results.size);
}

/**
 * 예제 2: 병렬 실행
 */
async function parallelExample() {
  console.log('\n=== 병렬 실행 예제 ===\n');

  const dag = new DAGExecutor();

  dag.addNode({
    name: 'planning',
    dependencies: [],
    executor: async () => {
      console.log('[1] Planning 시작');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[1] Planning 완료');
      return 'plan';
    }
  });

  dag.addNode({
    name: 'research',
    dependencies: ['planning'],
    executor: async () => {
      console.log('[2] Research 시작');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[2] Research 완료');
      return 'research';
    }
  });

  dag.addNode({
    name: 'writing',
    dependencies: ['research'],
    executor: async () => {
      console.log('[3] Writing 시작');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[3] Writing 완료');
      return 'draft';
    }
  });

  // editing과 seo는 병렬 실행
  dag.addNode({
    name: 'editing',
    dependencies: ['writing'],
    executor: async () => {
      console.log('[4a] Editing 시작 (병렬)');
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('[4a] Editing 완료');
      return 'edited';
    }
  });

  dag.addNode({
    name: 'seo',
    dependencies: ['writing'],
    executor: async () => {
      console.log('[4b] SEO 시작 (병렬)');
      await new Promise(resolve => setTimeout(resolve, 150));
      console.log('[4b] SEO 완료');
      return 'seo';
    }
  });

  dag.addNode({
    name: 'formatting',
    dependencies: ['editing', 'seo'],
    executor: async () => {
      console.log('[5] Formatting 시작');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[5] Formatting 완료');
      return 'formatted';
    }
  });

  const startTime = Date.now();
  const result = await dag.execute();
  const duration = Date.now() - startTime;

  console.log('\n실행 결과:');
  console.log('- 총 소요 시간:', duration, 'ms');
  console.log('- 실행 순서:', result.executionOrder);
  console.log('  (editing과 seo가 병렬로 실행되어 시간 절약)');
}

/**
 * 예제 3: 에러 처리
 */
async function errorHandlingExample() {
  console.log('\n=== 에러 처리 예제 ===\n');

  const dag = new DAGExecutor();

  dag.addNode({
    name: 'planning',
    dependencies: [],
    executor: async () => {
      console.log('Planning 성공');
      return 'plan';
    }
  });

  dag.addNode({
    name: 'research',
    dependencies: ['planning'],
    executor: async () => {
      console.log('Research 실패!');
      throw new Error('API 호출 실패');
    }
  });

  dag.addNode({
    name: 'writing',
    dependencies: ['research'],
    executor: async () => {
      console.log('Writing - 실행되지 않음');
      return 'draft';
    }
  });

  // 독립적인 노드는 계속 실행됨
  dag.addNode({
    name: 'editing',
    dependencies: [],
    executor: async () => {
      console.log('Editing 성공 (독립적)');
      return 'edited';
    }
  });

  const result = await dag.execute();

  console.log('\n실행 결과:');
  console.log('- 성공:', result.success);
  console.log('- 에러 개수:', result.errors.length);
  console.log('- 에러 상세:', result.errors[0]);
  console.log('- 완료된 노드:', Array.from(result.results.keys()));
  console.log('  (research 실패로 writing은 실행 안됨, editing은 독립적이라 실행됨)');
}

/**
 * 예제 4: 블로그 워크플로우 DAG
 */
async function blogWorkflowExample() {
  console.log('\n=== 블로그 워크플로우 예제 ===\n');

  const executors: Record<WorkflowStageName, () => Promise<unknown>> = {
    planning: async () => {
      console.log('[1] 기획: 주제 분석 및 목차 작성');
      return { topic: 'AI 블로그', outline: [] };
    },
    research: async () => {
      console.log('[2] 리서치: 관련 자료 수집');
      return { sources: [], data: {} };
    },
    writing: async () => {
      console.log('[3] 작성: 초안 작성');
      return { content: '...', wordCount: 1000 };
    },
    editing: async () => {
      console.log('[4a] 편집: 문법 및 표현 개선 (병렬)');
      await new Promise(resolve => setTimeout(resolve, 100));
      return { content: '...(편집됨)' };
    },
    seo: async () => {
      console.log('[4b] SEO: 키워드 및 메타태그 최적화 (병렬)');
      await new Promise(resolve => setTimeout(resolve, 100));
      return { keywords: [], meta: {} };
    },
    'image-collection': async () => {
      return { images: [] };
    },
    formatting: async () => {
      console.log('[5] 포맷팅: 최종 포맷팅');
      return { html: '<article>...</article>' };
    }
  };

  const dag = createBlogWorkflowDAG(executors);
  const result = await dag.execute();

  console.log('\n워크플로우 구조:');
  console.log('planning → research → writing → editing → formatting');
  console.log('                               ↘  seo   ↗');
  console.log('\n실행 결과:');
  console.log('- 성공:', result.success);
  console.log('- 실행 순서:', result.executionOrder);
}

/**
 * 모든 예제 실행
 */
async function runAllExamples() {
  await basicExample();
  await parallelExample();
  await errorHandlingExample();
  await blogWorkflowExample();
}

// 직접 실행 시 (node --loader tsx dag-executor.example.ts)
// if (import.meta.url === `file://${process.argv[1]}`) {
//   runAllExamples().catch(console.error);
// }

export {
  basicExample,
  parallelExample,
  errorHandlingExample,
  blogWorkflowExample,
  runAllExamples
};
