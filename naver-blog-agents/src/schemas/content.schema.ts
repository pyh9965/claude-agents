import { z } from 'zod';

// 콘텐츠 유형 스키마
export const ContentTypeSchema = z.enum([
  'info', 'marketing', 'review', 'food',
  'travel', 'tech', 'lifestyle', 'parenting'
]);

// 아웃라인 항목 스키마
export const OutlineItemSchema = z.object({
  heading: z.string().min(2),
  description: z.string(),
  keyPoints: z.array(z.string()).min(1),
});

// 콘텐츠 기획 스키마
export const ContentPlanSchema = z.object({
  title: z.string().min(5).max(100),
  outline: z.array(OutlineItemSchema).min(2).max(10),
  targetKeywords: z.array(z.string()).min(1).max(10),
  assignedWriter: ContentTypeSchema,
  estimatedLength: z.number().min(500).max(10000),
  targetAudienceDescription: z.string(),
  keyMessage: z.string(),
  notes: z.string().optional(),
});

// 초안 콘텐츠 스키마
export const DraftContentSchema = z.object({
  title: z.string().min(5),
  body: z.string().min(100),
  metadata: z.object({
    writer: z.string(),
    contentType: ContentTypeSchema,
    wordCount: z.number().positive(),
    createdAt: z.date().optional(),
  }),
});

// 타입 추론
export type ContentPlanInput = z.infer<typeof ContentPlanSchema>;
export type DraftContentInput = z.infer<typeof DraftContentSchema>;
