import type { ContentType, FinalContent } from '@geulto/core';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

export type WorkflowStage =
  | 'planning'
  | 'research'
  | 'writing'
  | 'editing'
  | 'seo'
  | 'formatting'
  | 'completed';

export interface JobEvent {
  type: 'stage_started' | 'stage_completed' | 'progress' | 'completed' | 'error';
  stage?: WorkflowStage;
  message?: string;
  progress?: number;
  timestamp: number;
}

export interface Job {
  id: string;
  status: JobStatus;
  topic: string;
  type: ContentType;
  keywords?: string[];
  tone?: string;
  currentStage?: WorkflowStage;
  progress: number;
  events: JobEvent[];
  result?: FinalContent;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface GenerateRequest {
  topic: string;
  type: ContentType;
  keywords?: string[];
  tone?: string;
}

// Use globalThis to ensure singleton across module reloads in development
const globalStore = globalThis as typeof globalThis & {
  __jobStore?: Map<string, Job>;
  __jobSubscribers?: Map<string, Set<(event: JobEvent) => void>>;
};

if (!globalStore.__jobStore) {
  globalStore.__jobStore = new Map<string, Job>();
}
if (!globalStore.__jobSubscribers) {
  globalStore.__jobSubscribers = new Map<string, Set<(event: JobEvent) => void>>();
}

const jobs = globalStore.__jobStore;
const subscribers = globalStore.__jobSubscribers;

export function createJob(request: GenerateRequest): Job {
  const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const now = Date.now();

  const job: Job = {
    id,
    status: 'pending',
    topic: request.topic,
    type: request.type,
    keywords: request.keywords,
    tone: request.tone,
    progress: 0,
    events: [],
    createdAt: now,
    updatedAt: now,
  };

  jobs.set(id, job);
  console.log(`[JobStore] Created job: ${id}, total jobs: ${jobs.size}`);
  return job;
}

export function getJob(id: string): Job | undefined {
  const job = jobs.get(id);
  console.log(`[JobStore] Get job: ${id}, found: ${!!job}, total jobs: ${jobs.size}`);
  return job;
}

export function updateJob(id: string, updates: Partial<Job>): Job | undefined {
  const job = jobs.get(id);
  if (!job) {
    console.log(`[JobStore] Update failed - job not found: ${id}`);
    return undefined;
  }

  const updatedJob = {
    ...job,
    ...updates,
    updatedAt: Date.now(),
  };

  jobs.set(id, updatedJob);
  console.log(`[JobStore] Updated job: ${id}, status: ${updatedJob.status}`);
  return updatedJob;
}

export function addJobEvent(id: string, event: Omit<JobEvent, 'timestamp'>): void {
  const job = jobs.get(id);
  if (!job) {
    console.log(`[JobStore] AddEvent failed - job not found: ${id}`);
    return;
  }

  const fullEvent: JobEvent = {
    ...event,
    timestamp: Date.now(),
  };

  job.events.push(fullEvent);
  job.updatedAt = Date.now();

  console.log(`[JobStore] Event added to ${id}: ${event.type}`);

  // Notify subscribers
  const subs = subscribers.get(id);
  if (subs) {
    console.log(`[JobStore] Notifying ${subs.size} subscribers for ${id}`);
    subs.forEach(callback => callback(fullEvent));
  }
}

export function subscribeToJob(id: string, callback: (event: JobEvent) => void): () => void {
  if (!subscribers.has(id)) {
    subscribers.set(id, new Set());
  }

  subscribers.get(id)!.add(callback);
  console.log(`[JobStore] Subscriber added for ${id}, total: ${subscribers.get(id)!.size}`);

  // Return unsubscribe function
  return () => {
    const subs = subscribers.get(id);
    if (subs) {
      subs.delete(callback);
      if (subs.size === 0) {
        subscribers.delete(id);
      }
    }
  };
}

export function deleteJob(id: string): boolean {
  subscribers.delete(id);
  return jobs.delete(id);
}

export function listJobs(): string[] {
  return Array.from(jobs.keys());
}

// Stage display info
export const STAGE_INFO: Record<WorkflowStage, { name: string; description: string; emoji: string }> = {
  planning: {
    name: '기획',
    description: '민준 팀장이 콘텐츠 구조를 설계하고 있습니다...',
    emoji: '📋',
  },
  research: {
    name: '리서치',
    description: '수빈이 관련 정보를 수집하고 있습니다...',
    emoji: '🔍',
  },
  writing: {
    name: '글쓰기',
    description: '전문 작가가 콘텐츠를 작성하고 있습니다...',
    emoji: '✍️',
  },
  editing: {
    name: '편집',
    description: '서연 실장이 글을 다듬고 있습니다...',
    emoji: '✏️',
  },
  seo: {
    name: 'SEO 최적화',
    description: '준서가 검색 최적화를 적용하고 있습니다...',
    emoji: '🎯',
  },
  formatting: {
    name: '포맷팅',
    description: '네이버 블로그 형식으로 변환하고 있습니다...',
    emoji: '📄',
  },
  completed: {
    name: '완료',
    description: '콘텐츠 생성이 완료되었습니다!',
    emoji: '✅',
  },
};
