import type { ContentType, ContentTone, ContentRequest } from '../types/content.js';

/**
 * Question type for interview questions
 * - text: Free-form text input
 * - select: Single choice from options
 * - multiselect: Multiple choices from options
 * - number: Numeric input
 * - boolean: Yes/No question
 * - scale: Rating scale (e.g., 1-5)
 */
export type QuestionType = 'text' | 'select' | 'multiselect' | 'number' | 'boolean' | 'scale';

/**
 * Interview question definition
 * Represents a single question in the interview flow
 */
export interface InterviewQuestion {
  /** Unique identifier for the question */
  id: string;

  /** Question text in Korean */
  text: string;

  /** Type of question determining input method */
  type: QuestionType;

  /** Whether this question must be answered */
  required: boolean;

  /** Available options for select/multiselect questions */
  options?: string[];

  /** Min/max range for scale questions */
  scaleRange?: { min: number; max: number };

  /** Default value if user skips */
  defaultValue?: unknown;

  /** Optional hint text to help users */
  hint?: string;

  /** Maps to ContentRequest field or referenceData property */
  mapsTo: keyof ContentRequest | `referenceData.${string}`;
}

/**
 * User's answer to an interview question
 */
export interface InterviewAnswer {
  /** ID of the question being answered */
  questionId: string;

  /** Answer value (type depends on question type) */
  value: unknown;

  /** Timestamp when answer was provided */
  answeredAt: Date;
}

/**
 * Current state of an interview session
 * - idle: Not started
 * - active: In progress
 * - complete: Successfully finished
 * - cancelled: User cancelled
 */
export type InterviewState = 'idle' | 'active' | 'complete' | 'cancelled';

/**
 * Configuration for starting an interview
 */
export interface InterviewConfig {
  /** Content type determines which questions to ask */
  contentType: ContentType;

  /** Maximum number of questions to ask (for quick mode) */
  maxQuestions?: number;

  /** Whether to skip optional questions */
  skipOptional?: boolean;

  /** Pre-filled data to skip certain questions */
  prefillData?: Partial<ContentRequest>;
}

/**
 * Complete state of an interview session
 * Tracks progress through the interview flow
 */
export interface InterviewSessionState {
  /** Unique session identifier */
  sessionId: string;

  /** Current state of the session */
  state: InterviewState;

  /** Content type for this session */
  contentType: ContentType;

  /** Map of question ID to answer */
  answers: Map<string, InterviewAnswer>;

  /** Current position in question list (0-indexed) */
  currentQuestionIndex: number;

  /** All questions for this interview */
  questions: InterviewQuestion[];

  /** When the interview started */
  startedAt?: Date;

  /** When the interview completed */
  completedAt?: Date;
}

/**
 * Result of a completed interview
 * Contains final answers and session metadata
 */
export interface InterviewResult {
  /** Whether the interview completed successfully */
  success: boolean;

  /** Session identifier */
  sessionId: string;

  /** Map of question ID to answer value */
  answers: Record<string, unknown>;

  /** Total duration in milliseconds */
  duration: number;

  /** Count of questions answered */
  questionsAnswered: number;

  /** Count of questions skipped */
  questionsSkipped: number;
}

/**
 * Base schema structure for all content types
 * Defines required and optional questions
 */
export interface BaseInterviewSchema {
  /** Questions that must be answered */
  required: InterviewQuestion[];

  /** Questions that can be skipped */
  optional: InterviewQuestion[];
}

/**
 * Registry mapping content types to their interview schemas
 * Each content type has its own set of questions
 */
export type InterviewSchemaRegistry = {
  [K in ContentType]: BaseInterviewSchema;
};

/**
 * Options for merging interview answers with reference data
 */
export interface MergeOptions {
  /** If true, interview answers override reference data */
  interviewPriority?: boolean;

  /** If true, deeply merge nested objects */
  deepMerge?: boolean;

  /** If true, preserve undefined values from interview */
  preserveUndefined?: boolean;
}

/**
 * Result of merging interview answers with reference data
 * Provides metadata about the merge process
 */
export interface MergeResult {
  /** Final merged ContentRequest */
  request: ContentRequest;

  /** Field names sourced from interview */
  fromInterview: string[];

  /** Field names sourced from reference data */
  fromReference: string[];

  /** Fields that had conflicting values */
  conflicts: string[];
}
