import type { ContentRequest } from '../types/content.js';
import type { InterviewResult, MergeOptions, MergeResult } from './types.js';
import { getSchemaForContentType } from './schemas/index.js';

/**
 * InterviewDataMerger
 *
 * Merges interview answers into a ContentRequest
 * Priority: interview data > referenceData (existing)
 */
export class InterviewDataMerger {

  /**
   * Merge interview results into a ContentRequest
   */
  merge(
    interview: InterviewResult,
    existingRequest: Partial<ContentRequest>,
    options: MergeOptions = {}
  ): MergeResult {
    // Options with defaults
    const { interviewPriority = true, deepMerge = true } = options;

    // Track sources and conflicts
    const fromInterview: string[] = [];
    const fromReference: string[] = [];
    const conflicts: string[] = [];

    // Start with existing request as base
    const merged: ContentRequest = {
      topic: existingRequest.topic || '',
      type: existingRequest.type || 'info',
      ...existingRequest,
    };

    // Get schema for field mapping
    const schema = getSchemaForContentType(merged.type);
    const allQuestions = [...schema.required, ...schema.optional];

    // Map interview answers to ContentRequest fields
    for (const [questionId, value] of Object.entries(interview.answers)) {
      const question = allQuestions.find(q => q.id === questionId);
      if (!question) continue;

      const mapsTo = question.mapsTo;

      if (mapsTo.startsWith('referenceData.')) {
        // Nested in referenceData
        const field = mapsTo.replace('referenceData.', '');
        if (!merged.referenceData) merged.referenceData = {};

        const existingValue = merged.referenceData[field];
        if (existingValue !== undefined && existingValue !== value) {
          conflicts.push(field);
        }

        if (interviewPriority || existingValue === undefined) {
          merged.referenceData[field] = value;
          fromInterview.push(mapsTo);
        } else {
          fromReference.push(mapsTo);
        }
      } else {
        // Direct field on ContentRequest
        const field = mapsTo as keyof ContentRequest;
        const existingValue = merged[field];

        if (existingValue !== undefined && existingValue !== value) {
          conflicts.push(field);
        }

        if (interviewPriority || existingValue === undefined) {
          (merged as any)[field] = value;
          fromInterview.push(field);
        } else {
          fromReference.push(field);
        }
      }
    }

    return { request: merged, fromInterview, fromReference, conflicts };
  }

  /**
   * Convert interview answers to additionalContext string
   */
  toAdditionalContext(interview: InterviewResult): string {
    const lines: string[] = ['## 인터뷰 수집 정보'];
    for (const [questionId, value] of Object.entries(interview.answers)) {
      lines.push(`- ${questionId}: ${JSON.stringify(value)}`);
    }
    return lines.join('\n');
  }
}
