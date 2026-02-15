import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJob, updateJob, addJobEvent, type WorkflowStage } from '@/lib/job-store';

const generateRequestSchema = z.object({
  topic: z.string().min(1, '주제를 입력해주세요'),
  type: z.enum(['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting']),
  keywords: z.array(z.string()).optional(),
  tone: z.enum(['formal', 'casual', 'friendly']).optional().default('friendly'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = generateRequestSchema.parse(body);

    // Create job
    const job = createJob(validatedData);

    // Start generation in background (don't await)
    startGeneration(job.id, validatedData).catch((err) => {
      console.error('[Generate] Background error:', err);
    });

    return NextResponse.json({
      jobId: job.id,
      streamUrl: `/api/generate/${job.id}/stream`,
      resultUrl: `/api/generate/${job.id}/result`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('[Generate] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function startGeneration(jobId: string, request: z.infer<typeof generateRequestSchema>) {
  console.log(`[Generate] Starting generation for job: ${jobId}`);

  try {
    updateJob(jobId, { status: 'running' });

    // Try to use real @geulto/core
    let useRealCore = false;
    let generateBlogContent: any;

    try {
      const core = await import('@geulto/core');
      generateBlogContent = core.generateBlogContent;
      useRealCore = true;
      console.log('[Generate] Using real @geulto/core');
    } catch (e) {
      console.log('[Generate] @geulto/core not available, using mock');
      useRealCore = false;
    }

    if (useRealCore && generateBlogContent) {
      // Use real core with event callbacks
      await runWithRealCore(jobId, request, generateBlogContent);
    } else {
      // Use mock implementation
      await runWithMock(jobId, request);
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Generate] Error for job ${jobId}:`, errorMessage);

    updateJob(jobId, {
      status: 'failed',
      error: errorMessage,
    });

    addJobEvent(jobId, {
      type: 'error',
      message: errorMessage,
    });
  }
}

async function runWithRealCore(
  jobId: string,
  request: z.infer<typeof generateRequestSchema>,
  generateBlogContent: any
) {
  const stages: WorkflowStage[] = ['planning', 'research', 'writing', 'editing', 'seo', 'formatting'];
  let currentStageIndex = 0;

  const result = await generateBlogContent(
    {
      topic: request.topic,
      type: request.type,
      keywords: request.keywords,
      tone: request.tone,
    },
    {
      onEvent: (event: any) => {
        console.log(`[Generate] Event: ${event.type}`, event);

        // Map workflow events to our stages
        if (event.type === 'stage_start' || event.type === 'stage_started') {
          const stageName = event.stage?.toLowerCase() || '';
          const stage = mapEventToStage(stageName, currentStageIndex, stages);

          if (stage) {
            addJobEvent(jobId, {
              type: 'stage_started',
              stage,
              message: `${stage} 단계 시작`,
            });

            updateJob(jobId, {
              currentStage: stage,
              progress: Math.round(((currentStageIndex + 1) / (stages.length + 1)) * 100),
            });
          }
        } else if (event.type === 'stage_complete' || event.type === 'stage_completed') {
          const stage = stages[currentStageIndex];
          if (stage) {
            addJobEvent(jobId, {
              type: 'stage_completed',
              stage,
              message: `${stage} 단계 완료`,
            });
            currentStageIndex++;
          }
        }
      },
    }
  );

  if (result.success && result.content) {
    updateJob(jobId, {
      status: 'completed',
      currentStage: 'completed',
      progress: 100,
      result: result.content,
    });

    addJobEvent(jobId, {
      type: 'completed',
      message: '콘텐츠 생성 완료',
    });
  } else {
    throw new Error(result.errors?.[0]?.message || '콘텐츠 생성 실패');
  }
}

function mapEventToStage(stageName: string, currentIndex: number, stages: WorkflowStage[]): WorkflowStage | null {
  // Try to match stage name
  const stageMap: Record<string, WorkflowStage> = {
    'planning': 'planning',
    'plan': 'planning',
    'research': 'research',
    'writing': 'writing',
    'write': 'writing',
    'editing': 'editing',
    'edit': 'editing',
    'seo': 'seo',
    'formatting': 'formatting',
    'format': 'formatting',
  };

  if (stageMap[stageName]) {
    return stageMap[stageName];
  }

  // Fallback to current index
  return stages[currentIndex] || null;
}

async function runWithMock(jobId: string, request: z.infer<typeof generateRequestSchema>) {
  const stages: WorkflowStage[] = ['planning', 'research', 'writing', 'editing', 'seo', 'formatting'];

  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    const progress = Math.round(((i + 1) / (stages.length + 1)) * 100);

    // Stage started
    addJobEvent(jobId, {
      type: 'stage_started',
      stage,
      message: `${stage} 단계 시작`,
    });

    updateJob(jobId, {
      currentStage: stage,
      progress,
    });

    // Simulate processing (2-4 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

    // Stage completed
    addJobEvent(jobId, {
      type: 'stage_completed',
      stage,
      message: `${stage} 단계 완료`,
    });
  }

  // Generate mock content
  const mockContent = generateMockContent(request);

  updateJob(jobId, {
    status: 'completed',
    currentStage: 'completed',
    progress: 100,
    result: mockContent,
  });

  addJobEvent(jobId, {
    type: 'completed',
    message: '콘텐츠 생성 완료',
  });
}

function generateMockContent(request: z.infer<typeof generateRequestSchema>): any {
  const title = `${request.topic} - 완벽 가이드`;
  const seoTitle = `${request.topic} | 2024 최신 정보`;
  const metaDescription = `${request.topic}에 대한 모든 것을 알려드립니다. 전문가가 알려주는 핵심 정보와 팁을 확인하세요.`;
  const tags = request.keywords || [request.topic, '정보', '가이드'];
  const now = new Date();
  const bodyContent = `${request.topic}에 대한 상세한 내용입니다.\n\n## 핵심 포인트\n\n- 포인트 1\n- 포인트 2\n- 포인트 3`;

  return {
    title,
    body: bodyContent,
    seoTitle,
    metaDescription,
    tags,
    formats: {
      naverHtml: `<div class="se-main-container">
        <h2>${title}</h2>
        <p>${request.topic}에 대한 상세한 내용입니다.</p>
        <h3>핵심 포인트</h3>
        <ul>
          <li>포인트 1</li>
          <li>포인트 2</li>
          <li>포인트 3</li>
        </ul>
      </div>`,
      markdown: `# ${title}\n\n${request.topic}에 대한 상세한 내용입니다.\n\n## 핵심 포인트\n\n- 포인트 1\n- 포인트 2\n- 포인트 3`,
      json: {
        title,
        sections: [
          { type: 'heading' as const, content: '소개', level: 2 },
          { type: 'paragraph' as const, content: `${request.topic}에 대해 알아보겠습니다.` },
        ],
        seo: {
          title: seoTitle,
          description: metaDescription,
          tags,
        },
      },
    },
    metadata: {
      contentType: request.type,
      writer: '글또 AI',
      wordCount: 1500,
      readingTime: 5,
      seoScore: 85,
      createdAt: now,
      workflowLog: [],
    },
  };
}
