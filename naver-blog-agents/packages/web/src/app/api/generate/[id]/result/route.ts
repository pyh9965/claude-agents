import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/job-store';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  console.log(`[Result] Request for job: ${jobId}`);

  const job = getJob(jobId);

  if (!job) {
    console.log(`[Result] Job not found: ${jobId}`);
    return NextResponse.json(
      { error: 'Job not found' },
      { status: 404 }
    );
  }

  console.log(`[Result] Job found: ${jobId}, status: ${job.status}`);

  if (job.status === 'pending' || job.status === 'running') {
    return NextResponse.json(
      {
        success: false,
        status: job.status,
        currentStage: job.currentStage,
        progress: job.progress,
        message: '콘텐츠 생성 중입니다...',
      },
      { status: 202 }
    );
  }

  if (job.status === 'failed') {
    return NextResponse.json(
      {
        success: false,
        status: job.status,
        error: job.error,
        message: '콘텐츠 생성에 실패했습니다.',
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    status: job.status,
    content: job.result,
    stats: {
      topic: job.topic,
      type: job.type,
      keywords: job.keywords,
      createdAt: job.createdAt,
      completedAt: job.updatedAt,
      duration: job.updatedAt - job.createdAt,
    },
  });
}
