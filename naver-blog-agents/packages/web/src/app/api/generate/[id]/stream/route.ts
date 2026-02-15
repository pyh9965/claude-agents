import { NextRequest } from 'next/server';
import { getJob, subscribeToJob, type JobEvent } from '@/lib/job-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: jobId } = await params;

  console.log(`[SSE] Stream request for job: ${jobId}`);

  const job = getJob(jobId);

  if (!job) {
    console.log(`[SSE] Job not found: ${jobId}`);
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[SSE] Job found: ${jobId}, status: ${job.status}`);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      const initialData = {
        type: 'init',
        status: job.status,
        currentStage: job.currentStage,
        progress: job.progress,
        events: job.events,
      };

      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
      );

      // If already completed or failed, close stream
      if (job.status === 'completed' || job.status === 'failed') {
        controller.close();
        return;
      }

      // Subscribe to updates
      const unsubscribe = subscribeToJob(jobId, (event: JobEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );

          // Close stream on completion or error
          if (event.type === 'completed' || event.type === 'error') {
            setTimeout(() => {
              try {
                controller.close();
              } catch (e) {
                // Stream already closed
              }
            }, 100);
          }
        } catch (e) {
          // Controller closed
        }
      });

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
