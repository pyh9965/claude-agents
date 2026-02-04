import type { ContentType } from '../../types/content.js';
import type { BaseInterviewSchema, InterviewSchemaRegistry } from '../types.js';
import { INFO_INTERVIEW_SCHEMA } from './info.js';
import { MARKETING_INTERVIEW_SCHEMA } from './marketing.js';
import { REVIEW_INTERVIEW_SCHEMA } from './review.js';
import { FOOD_INTERVIEW_SCHEMA } from './food.js';
import { TRAVEL_INTERVIEW_SCHEMA } from './travel.js';
import { TECH_INTERVIEW_SCHEMA } from './tech.js';
import { LIFESTYLE_INTERVIEW_SCHEMA } from './lifestyle.js';
import { PARENTING_INTERVIEW_SCHEMA } from './parenting.js';

/** Registry of all interview schemas by content type */
export const INTERVIEW_SCHEMAS: InterviewSchemaRegistry = {
  info: INFO_INTERVIEW_SCHEMA,
  marketing: MARKETING_INTERVIEW_SCHEMA,
  review: REVIEW_INTERVIEW_SCHEMA,
  food: FOOD_INTERVIEW_SCHEMA,
  travel: TRAVEL_INTERVIEW_SCHEMA,
  tech: TECH_INTERVIEW_SCHEMA,
  lifestyle: LIFESTYLE_INTERVIEW_SCHEMA,
  parenting: PARENTING_INTERVIEW_SCHEMA,
};

/** Get schema for a specific content type */
export function getSchemaForContentType(contentType: ContentType): BaseInterviewSchema {
  const schema = INTERVIEW_SCHEMAS[contentType];
  if (!schema) {
    throw new Error(`No interview schema for content type: ${contentType}`);
  }
  return schema;
}

/** Get required question count for a content type */
export function getRequiredQuestionCount(contentType: ContentType): number {
  return getSchemaForContentType(contentType).required.length;
}

/** Validate that schema meets 3-5 required questions rule */
export function validateSchemaRequirements(contentType: ContentType): {
  valid: boolean;
  count: number;
  message?: string;
} {
  const count = getRequiredQuestionCount(contentType);
  if (count < 3) {
    return { valid: false, count, message: `${contentType} has only ${count} required questions (min 3)` };
  }
  if (count > 5) {
    return { valid: false, count, message: `${contentType} has ${count} required questions (max 5)` };
  }
  return { valid: true, count };
}

// Re-exports
export * from './base.js';
export { INFO_INTERVIEW_SCHEMA } from './info.js';
export { MARKETING_INTERVIEW_SCHEMA } from './marketing.js';
export { REVIEW_INTERVIEW_SCHEMA } from './review.js';
export { FOOD_INTERVIEW_SCHEMA } from './food.js';
export { TRAVEL_INTERVIEW_SCHEMA } from './travel.js';
export { TECH_INTERVIEW_SCHEMA } from './tech.js';
export { LIFESTYLE_INTERVIEW_SCHEMA } from './lifestyle.js';
export { PARENTING_INTERVIEW_SCHEMA } from './parenting.js';
