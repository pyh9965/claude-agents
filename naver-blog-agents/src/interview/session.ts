import type {
  InterviewConfig,
  InterviewSessionState,
  InterviewAnswer,
  InterviewResult,
  InterviewQuestion,
  InterviewState,
} from './types.js';
import { getSchemaForContentType } from './schemas/index.js';

/**
 * InterviewSession - Manages the interview flow state
 *
 * This class is used to conduct dialogue-based interviews.
 * It's a state machine that tracks questions/answers.
 */
export class InterviewSession {
  private state: InterviewSessionState;

  constructor(config: InterviewConfig) {
    // Get schema for content type
    const schema = getSchemaForContentType(config.contentType);

    // Build question list: required + optional based on skipOptional
    let questions: InterviewQuestion[] = [...schema.required];
    if (!config.skipOptional) {
      questions = [...questions, ...schema.optional];
    }

    // Apply maxQuestions limit if specified
    if (config.maxQuestions !== undefined && config.maxQuestions > 0) {
      questions = questions.slice(0, config.maxQuestions);
    }

    // Initialize state
    this.state = {
      sessionId: this.generateSessionId(),
      state: 'idle',
      contentType: config.contentType,
      answers: new Map<string, InterviewAnswer>(),
      currentQuestionIndex: 0,
      questions,
    };

    // Apply prefill data if provided
    if (config.prefillData) {
      this.prefill(config.prefillData);
    }
  }

  /** Start the interview session - returns first question */
  start(): InterviewQuestion | null {
    if (this.state.state !== 'idle') {
      return null;
    }

    this.state.state = 'active';
    this.state.startedAt = new Date();

    return this.getCurrentQuestion();
  }

  /** Get current question to ask */
  getCurrentQuestion(): InterviewQuestion | null {
    if (this.state.state !== 'active') {
      return null;
    }

    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      return null;
    }

    return this.state.questions[this.state.currentQuestionIndex];
  }

  /** Record an answer and get next question */
  answer(questionId: string, value: unknown): InterviewQuestion | null {
    if (this.state.state !== 'active') {
      throw new Error('Cannot answer: interview is not active');
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('Cannot answer: no current question');
    }

    if (currentQuestion.id !== questionId) {
      throw new Error(
        `Cannot answer: expected question "${currentQuestion.id}" but got "${questionId}"`
      );
    }

    // Validate the answer
    this.validateAnswer(currentQuestion, value);

    // Record the answer
    const answer: InterviewAnswer = {
      questionId,
      value,
      answeredAt: new Date(),
    };
    this.state.answers.set(questionId, answer);

    // Move to next question
    this.state.currentQuestionIndex++;

    // Check if interview is complete
    if (this.isComplete()) {
      this.complete();
      return null;
    }

    return this.getCurrentQuestion();
  }

  /** Skip current optional question */
  skip(): InterviewQuestion | null {
    if (this.state.state !== 'active') {
      throw new Error('Cannot skip: interview is not active');
    }

    const currentQuestion = this.getCurrentQuestion();
    if (!currentQuestion) {
      throw new Error('Cannot skip: no current question');
    }

    if (currentQuestion.required) {
      throw new Error('Cannot skip required question');
    }

    // If there's a default value, use it
    if (currentQuestion.defaultValue !== undefined) {
      const answer: InterviewAnswer = {
        questionId: currentQuestion.id,
        value: currentQuestion.defaultValue,
        answeredAt: new Date(),
      };
      this.state.answers.set(currentQuestion.id, answer);
    }

    // Move to next question
    this.state.currentQuestionIndex++;

    // Check if interview is complete
    if (this.isComplete()) {
      this.complete();
      return null;
    }

    return this.getCurrentQuestion();
  }

  /** Cancel the interview */
  cancel(): void {
    this.state.state = 'cancelled';
    this.state.completedAt = new Date();
  }

  /** Get collected answers as plain object */
  getAnswers(): Record<string, unknown> {
    const answers: Record<string, unknown> = {};
    for (const [questionId, answer] of this.state.answers) {
      answers[questionId] = answer.value;
    }
    return answers;
  }

  /** Get interview result */
  getResult(): InterviewResult {
    const duration =
      this.state.startedAt && this.state.completedAt
        ? this.state.completedAt.getTime() - this.state.startedAt.getTime()
        : 0;

    const questionsAnswered = this.state.answers.size;
    const questionsSkipped = this.state.questions.length - questionsAnswered;

    return {
      success: this.state.state === 'complete',
      sessionId: this.state.sessionId,
      answers: this.getAnswers(),
      duration,
      questionsAnswered,
      questionsSkipped,
    };
  }

  /** Get current state */
  getState(): InterviewState {
    return this.state.state;
  }

  /** Get progress percentage (required questions) */
  getProgress(): number {
    const requiredQuestions = this.state.questions.filter((q) => q.required);
    if (requiredQuestions.length === 0) {
      return 100;
    }

    const answeredRequired = requiredQuestions.filter((q) =>
      this.state.answers.has(q.id)
    ).length;

    return Math.round((answeredRequired / requiredQuestions.length) * 100);
  }

  /** Mark interview as complete */
  private complete(): void {
    this.state.state = 'complete';
    this.state.completedAt = new Date();
  }

  /** Check if all required questions are answered */
  private isComplete(): boolean {
    // Check if we've gone through all questions
    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      return true;
    }

    // Check if all required questions are answered
    const requiredQuestions = this.state.questions.filter((q) => q.required);
    const allRequiredAnswered = requiredQuestions.every((q) =>
      this.state.answers.has(q.id)
    );

    // Only complete if we've answered all required AND there are no more questions
    return allRequiredAnswered && this.state.currentQuestionIndex >= this.state.questions.length;
  }

  /** Validate answer based on question type */
  private validateAnswer(question: InterviewQuestion, value: unknown): void {
    // Check for null/undefined on required questions
    if (question.required && (value === null || value === undefined || value === '')) {
      throw new Error(`Required question "${question.id}" must have a value`);
    }

    // Skip validation for empty optional values
    if (!question.required && (value === null || value === undefined || value === '')) {
      return;
    }

    switch (question.type) {
      case 'text':
        if (typeof value !== 'string') {
          throw new Error(`Question "${question.id}" expects a string value`);
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Question "${question.id}" expects a number value`);
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Question "${question.id}" expects a boolean value`);
        }
        break;

      case 'select':
        if (typeof value !== 'string') {
          throw new Error(`Question "${question.id}" expects a string value`);
        }
        if (question.options && !question.options.includes(value)) {
          throw new Error(
            `Question "${question.id}" value must be one of: ${question.options.join(', ')}`
          );
        }
        break;

      case 'multiselect':
        if (!Array.isArray(value)) {
          throw new Error(`Question "${question.id}" expects an array value`);
        }
        if (question.options) {
          for (const v of value) {
            if (typeof v !== 'string') {
              throw new Error(`Question "${question.id}" expects an array of strings`);
            }
            if (!question.options.includes(v)) {
              throw new Error(
                `Question "${question.id}" value "${v}" must be one of: ${question.options.join(', ')}`
              );
            }
          }
        }
        break;

      case 'scale':
        if (typeof value !== 'number' || isNaN(value)) {
          throw new Error(`Question "${question.id}" expects a number value`);
        }
        if (question.scaleRange) {
          if (value < question.scaleRange.min || value > question.scaleRange.max) {
            throw new Error(
              `Question "${question.id}" value must be between ${question.scaleRange.min} and ${question.scaleRange.max}`
            );
          }
        }
        break;

      default:
        // Unknown type, no validation
        break;
    }
  }

  /** Prefill answers from existing data */
  private prefill(data: Partial<Record<string, unknown>>): void {
    for (const question of this.state.questions) {
      const mapsTo = question.mapsTo;
      let value: unknown;

      if (mapsTo.startsWith('referenceData.')) {
        // Handle nested referenceData properties
        const key = mapsTo.replace('referenceData.', '');
        const referenceData = data['referenceData'] as Record<string, unknown> | undefined;
        if (referenceData && key in referenceData) {
          value = referenceData[key];
        }
      } else if (mapsTo in data) {
        // Handle direct properties
        value = data[mapsTo as keyof typeof data];
      }

      if (value !== undefined && value !== null) {
        try {
          // Validate and store the prefilled answer
          this.validateAnswer(question, value);
          const answer: InterviewAnswer = {
            questionId: question.id,
            value,
            answeredAt: new Date(),
          };
          this.state.answers.set(question.id, answer);
        } catch {
          // Skip invalid prefill values
        }
      }
    }

    // Adjust currentQuestionIndex to skip prefilled questions
    while (
      this.state.currentQuestionIndex < this.state.questions.length &&
      this.state.answers.has(this.state.questions[this.state.currentQuestionIndex].id)
    ) {
      this.state.currentQuestionIndex++;
    }
  }

  /** Generate a unique session ID */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `interview_${timestamp}_${randomPart}`;
  }
}
