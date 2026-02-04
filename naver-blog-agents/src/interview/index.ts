/**
 * Interview Flow Module
 *
 * Provides structured interviewing for collecting detailed content requirements
 * before delegating to the blog content generation workflow.
 */

// Core classes
export { InterviewSession } from './session.js';
export { InterviewDataMerger } from './merger.js';

// Types
export type {
  QuestionType,
  InterviewQuestion,
  InterviewAnswer,
  InterviewState,
  InterviewConfig,
  InterviewSessionState,
  InterviewResult,
  BaseInterviewSchema,
  InterviewSchemaRegistry,
  MergeOptions,
  MergeResult,
} from './types.js';

// Schema registry and utilities
export {
  INTERVIEW_SCHEMAS,
  getSchemaForContentType,
  getRequiredQuestionCount,
  validateSchemaRequirements,
  COMMON_QUESTIONS,
} from './schemas/index.js';

// Individual schemas
export {
  INFO_INTERVIEW_SCHEMA,
  MARKETING_INTERVIEW_SCHEMA,
  REVIEW_INTERVIEW_SCHEMA,
  FOOD_INTERVIEW_SCHEMA,
  TRAVEL_INTERVIEW_SCHEMA,
  TECH_INTERVIEW_SCHEMA,
  LIFESTYLE_INTERVIEW_SCHEMA,
  PARENTING_INTERVIEW_SCHEMA,
} from './schemas/index.js';
