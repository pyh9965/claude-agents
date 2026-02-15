'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { STAGE_INFO, type WorkflowStage, type JobEvent } from '@/lib/job-store';
import { cn } from '@/lib/utils';

interface WorkflowProgressProps {
  jobId: string;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

const STAGES: WorkflowStage[] = [
  'planning',
  'research',
  'writing',
  'editing',
  'seo',
  'formatting',
  'completed',
];

export function WorkflowProgress({
  jobId,
  onComplete,
  onError,
}: WorkflowProgressProps) {
  const [currentStage, setCurrentStage] = useState<WorkflowStage | null>(null);
  const [completedStages, setCompletedStages] = useState<Set<WorkflowStage>>(new Set());
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('콘텐츠 생성을 준비하고 있습니다...');
  const [status, setStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending');

  useEffect(() => {
    const eventSource = new EventSource(`/api/generate/${jobId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'init') {
          setStatus(data.status);
          setCurrentStage(data.currentStage || null);
          setProgress(data.progress || 0);

          // Process existing events
          if (data.events) {
            const completed = new Set<WorkflowStage>();
            data.events.forEach((e: JobEvent) => {
              if (e.type === 'stage_completed' && e.stage) {
                completed.add(e.stage);
              }
            });
            setCompletedStages(completed);
          }
        } else if (data.type === 'stage_started') {
          const stage = data.stage as WorkflowStage;
          setCurrentStage(stage);
          setStatus('running');
          if (stage && stage in STAGE_INFO) {
            setMessage(STAGE_INFO[stage].description);
          }
        } else if (data.type === 'stage_completed') {
          if (data.stage) {
            const stage = data.stage as WorkflowStage;
            setCompletedStages((prev) => new Set([...Array.from(prev), stage]));
          }
        } else if (data.type === 'progress') {
          setProgress(data.progress || 0);
        } else if (data.type === 'completed') {
          setStatus('completed');
          setCurrentStage('completed');
          setProgress(100);
          setMessage('콘텐츠 생성이 완료되었습니다!');
          onComplete?.();
          eventSource.close();
        } else if (data.type === 'error') {
          setStatus('failed');
          setMessage(data.message || '오류가 발생했습니다');
          onError?.(data.message);
          eventSource.close();
        }
      } catch (e) {
        console.error('Failed to parse SSE event:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, onComplete, onError]);

  const getStageStatus = (stage: WorkflowStage) => {
    if (completedStages.has(stage) || stage === 'completed' && status === 'completed') {
      return 'completed';
    }
    if (stage === currentStage) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className="space-y-8">
      {/* Overall Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">진행률</span>
          <span className="font-medium">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Current Status Message */}
      <div className="bg-naver-green-light rounded-lg p-4 text-center">
        <p className="text-naver-green-dark font-medium">{message}</p>
      </div>

      {/* Stages Timeline */}
      <div className="space-y-4">
        {STAGES.slice(0, -1).map((stage, index) => {
          const stageStatus = getStageStatus(stage);
          const info = STAGE_INFO[stage];

          return (
            <div key={stage} className="flex items-start gap-4">
              {/* Step Indicator */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    stageStatus === 'completed' && 'bg-naver-green border-naver-green text-white',
                    stageStatus === 'active' && 'border-naver-green bg-white text-naver-green',
                    stageStatus === 'pending' && 'border-gray-300 bg-white text-gray-400'
                  )}
                >
                  {stageStatus === 'completed' ? (
                    <Check className="w-5 h-5" />
                  ) : stageStatus === 'active' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                {index < STAGES.length - 2 && (
                  <div
                    className={cn(
                      'w-0.5 h-8 mt-2',
                      stageStatus === 'completed' ? 'bg-naver-green' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{info.emoji}</span>
                  <h3
                    className={cn(
                      'font-medium',
                      stageStatus === 'active' && 'text-naver-green',
                      stageStatus === 'pending' && 'text-gray-400'
                    )}
                  >
                    {info.name}
                  </h3>
                </div>
                {stageStatus === 'active' && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {info.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error State */}
      {status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-600 font-medium">콘텐츠 생성에 실패했습니다</p>
          <p className="text-sm text-red-500 mt-1">{message}</p>
        </div>
      )}
    </div>
  );
}
