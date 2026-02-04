/**
 * MCP Tools 정의 및 핸들러
 */

import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type {
  ContentRequest,
  ContentPlan,
  ResearchData,
  DraftContent,
  EditedContent,
  SEOOptimization,
} from '../types/index.js';
import { generateBlogContent } from '../workflow/orchestrator.js';
import { createAgentTeam } from '../agents/index.js';

/**
 * MCP 도구 목록
 */
export const tools: Tool[] = [
  {
    name: 'generate_content',
    description: '네이버 블로그 콘텐츠 전체 생성',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '콘텐츠 주제' },
        type: {
          type: 'string',
          enum: ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'],
          description: '콘텐츠 유형',
        },
        targetLength: { type: 'number', description: '목표 글자 수' },
      },
      required: ['topic', 'type'],
    },
  },
  {
    name: 'plan_content',
    description: '콘텐츠 기획만 수행',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '콘텐츠 주제' },
        type: {
          type: 'string',
          enum: ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'],
          description: '콘텐츠 유형',
        },
      },
      required: ['topic', 'type'],
    },
  },
  {
    name: 'research_topic',
    description: '주제 리서치',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: '리서치 주제' },
        keywords: {
          type: 'array',
          items: { type: 'string' },
          description: '키워드 목록',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'write_draft',
    description: '초안 작성',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'object',
          description: '콘텐츠 기획 데이터',
        },
        research: {
          type: 'object',
          description: '리서치 데이터',
        },
        writerType: {
          type: 'string',
          enum: ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'],
          description: '작가 유형',
        },
      },
      required: ['plan', 'research'],
    },
  },
  {
    name: 'edit_content',
    description: '콘텐츠 편집',
    inputSchema: {
      type: 'object',
      properties: {
        draft: {
          type: 'object',
          description: '초안 데이터',
        },
      },
      required: ['draft'],
    },
  },
  {
    name: 'optimize_seo',
    description: 'SEO 최적화',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'object',
          description: '콘텐츠 기획 데이터',
        },
        content: {
          type: 'object',
          description: '편집된 콘텐츠 데이터',
        },
      },
      required: ['plan', 'content'],
    },
  },
];

/**
 * MCP 도구 호출 핸들러
 */
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const team = createAgentTeam();

  switch (name) {
    case 'generate_content': {
      const { topic, type, targetLength } = args;

      if (!topic || typeof topic !== 'string') {
        throw new Error('topic is required and must be a string');
      }
      if (!type || typeof type !== 'string') {
        throw new Error('type is required and must be a string');
      }

      const validTypes = ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid content type: ${type}`);
      }

      const request: ContentRequest = {
        topic,
        type: type as ContentRequest['type'],
      };

      // targetLength를 additionalContext에 포함
      if (targetLength && typeof targetLength === 'number') {
        request.additionalContext = `목표 글자 수: ${targetLength}자`;
      }

      const result = await generateBlogContent(request);

      if (!result.success || !result.content) {
        const errors = result.errors?.map((e) => e.message).join(', ') || 'Unknown error';
        throw new Error(`Content generation failed: ${errors}`);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.content, null, 2),
          },
        ],
      };
    }

    case 'plan_content': {
      const { topic, type } = args;

      if (!topic || typeof topic !== 'string') {
        throw new Error('topic is required and must be a string');
      }
      if (!type || typeof type !== 'string') {
        throw new Error('type is required and must be a string');
      }

      const validTypes = ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid content type: ${type}`);
      }

      const request: ContentRequest = {
        topic,
        type: type as ContentRequest['type'],
      };

      const result = await team.planner.plan(request);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.plan, null, 2),
          },
        ],
      };
    }

    case 'research_topic': {
      const { topic, keywords } = args;

      if (!topic || typeof topic !== 'string') {
        throw new Error('topic is required and must be a string');
      }

      // 임시 plan 객체 생성 (리서치를 위해)
      const tempPlan: ContentPlan = {
        title: topic,
        outline: [
          {
            heading: '주제 리서치',
            description: '주제에 대한 전반적인 리서치',
            keyPoints: Array.isArray(keywords) ? (keywords as string[]) : [],
          },
        ],
        targetKeywords: Array.isArray(keywords) ? (keywords as string[]) : [],
        assignedWriter: 'info',
        estimatedLength: 1000,
        targetAudienceDescription: '일반 독자',
        keyMessage: '주제 리서치',
      };

      const referenceData = keywords ? { keywords } : undefined;
      const result = await team.researcher.research(tempPlan, referenceData);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.research, null, 2),
          },
        ],
      };
    }

    case 'write_draft': {
      const { plan, research, writerType } = args;

      if (!plan || typeof plan !== 'object') {
        throw new Error('plan is required and must be an object');
      }
      if (!research || typeof research !== 'object') {
        throw new Error('research is required and must be an object');
      }

      const contentPlan = plan as ContentPlan;
      const researchData = research as ResearchData;

      // writerType이 제공되면 사용, 아니면 plan의 assignedWriter 사용
      const writer = writerType
        ? team.getWriter(writerType as ContentRequest['type'])
        : team.getWriter(contentPlan.assignedWriter);

      const result = await writer.write(contentPlan, researchData);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.draft, null, 2),
          },
        ],
      };
    }

    case 'edit_content': {
      const { draft } = args;

      if (!draft || typeof draft !== 'object') {
        throw new Error('draft is required and must be an object');
      }

      const draftContent = draft as DraftContent;
      const result = await team.editor.edit(draftContent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.edited, null, 2),
          },
        ],
      };
    }

    case 'optimize_seo': {
      const { plan, content } = args;

      if (!plan || typeof plan !== 'object') {
        throw new Error('plan is required and must be an object');
      }
      if (!content || typeof content !== 'object') {
        throw new Error('content is required and must be an object');
      }

      const contentPlan = plan as ContentPlan;
      const editedContent = content as EditedContent;
      const result = await team.seoExpert.optimize(contentPlan, editedContent);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.seo, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
