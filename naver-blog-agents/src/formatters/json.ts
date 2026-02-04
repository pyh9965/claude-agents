/**
 * JSON 포맷터
 */

import type {
  EditedContent,
  SEOOptimization,
  ContentJSON,
  ContentSection,
} from '../types/index.js';

/** JSON 변환 옵션 */
export interface JsonOptions {
  /** 들여쓰기 (공백 수) */
  indent?: number;
  /** 본문 섹션 분리 여부 */
  splitSections?: boolean;
  /** 메타데이터 포함 여부 */
  includeMetadata?: boolean;
}

const DEFAULT_OPTIONS: JsonOptions = {
  indent: 2,
  splitSections: true,
  includeMetadata: true,
};

/**
 * 마크다운을 섹션으로 파싱
 */
function parseMarkdownToSections(markdown: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = markdown.split('\n');

  let currentSection: Partial<ContentSection> | null = null;
  let currentContent: string[] = [];

  const flushSection = () => {
    if (currentContent.length > 0) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n').trim();
        sections.push(currentSection as ContentSection);
      } else {
        // 헤딩 없이 시작하는 텍스트
        sections.push({
          type: 'paragraph',
          content: currentContent.join('\n').trim(),
        });
      }
      currentContent = [];
    }
  };

  for (const line of lines) {
    // 헤딩 체크
    const headingMatch = line.match(/^(#{1,6}) (.+)$/);
    if (headingMatch) {
      flushSection();
      currentSection = {
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      };
      sections.push(currentSection as ContentSection);
      currentSection = null;
      continue;
    }

    // 리스트 체크
    const listMatch = line.match(/^[-*] (.+)$/);
    const orderedListMatch = line.match(/^\d+\. (.+)$/);
    if (listMatch || orderedListMatch) {
      if (!currentSection || currentSection.type !== 'list') {
        flushSection();
        currentSection = {
          type: 'list',
          content: '',
          items: [],
        };
      }
      currentSection.items = currentSection.items || [];
      currentSection.items.push(listMatch ? listMatch[1] : orderedListMatch![1]);
      continue;
    }

    // 인용문 체크
    const quoteMatch = line.match(/^> (.+)$/);
    if (quoteMatch) {
      flushSection();
      sections.push({
        type: 'quote',
        content: quoteMatch[1],
      });
      currentSection = null;
      continue;
    }

    // 빈 줄
    if (line.trim() === '') {
      if (currentSection?.type === 'list') {
        flushSection();
        currentSection = null;
      }
      continue;
    }

    // 일반 텍스트
    if (currentSection?.type === 'list') {
      flushSection();
      currentSection = null;
    }
    currentContent.push(line);
  }

  flushSection();

  // 리스트 섹션의 content 채우기
  return sections.map((section) => {
    if (section.type === 'list' && section.items) {
      return {
        ...section,
        content: section.items.join('\n'),
      };
    }
    return section;
  });
}

/**
 * 편집된 콘텐츠를 JSON 구조로 변환
 */
export async function formatToJSON(
  content: EditedContent,
  seo: SEOOptimization,
  options: JsonOptions = {}
): Promise<ContentJSON> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const sections = opts.splitSections
    ? parseMarkdownToSections(content.body)
    : [{ type: 'paragraph' as const, content: content.body }];

  const json: ContentJSON = {
    title: content.title,
    sections,
    seo: {
      title: seo.seoTitle,
      description: seo.metaDescription,
      tags: seo.tags,
    },
  };

  return json;
}

/**
 * JSON을 문자열로 직렬화
 */
export function serializeJSON(
  json: ContentJSON,
  options: JsonOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  return JSON.stringify(json, null, opts.indent);
}

/**
 * JSON에서 마크다운으로 복원
 */
export function jsonToMarkdown(json: ContentJSON): string {
  const parts: string[] = [];

  // 제목
  parts.push(`# ${json.title}`);
  parts.push('');

  // 섹션
  for (const section of json.sections) {
    switch (section.type) {
      case 'heading':
        parts.push('#'.repeat(section.level || 2) + ' ' + section.content);
        parts.push('');
        break;

      case 'paragraph':
        parts.push(section.content);
        parts.push('');
        break;

      case 'list':
        if (section.items) {
          for (const item of section.items) {
            parts.push(`- ${item}`);
          }
        } else {
          const items = section.content.split('\n');
          for (const item of items) {
            parts.push(`- ${item}`);
          }
        }
        parts.push('');
        break;

      case 'quote':
        parts.push(`> ${section.content}`);
        parts.push('');
        break;

      case 'image':
        parts.push(`![image](${section.content})`);
        parts.push('');
        break;
    }
  }

  return parts.join('\n').trim();
}

/**
 * 전체 출력 메타데이터 JSON 생성
 */
export function createMetadataJson(
  content: EditedContent,
  seo: SEOOptimization,
  workflowId: string,
  stats: {
    totalTime: number;
    wordCount: number;
    seoScore: number;
  }
): object {
  return {
    workflowId,
    generatedAt: new Date().toISOString(),
    content: {
      title: content.title,
      seoTitle: seo.seoTitle,
      metaDescription: seo.metaDescription,
      tags: seo.tags,
    },
    stats: {
      totalTime: stats.totalTime,
      wordCount: stats.wordCount,
      seoScore: stats.seoScore,
    },
    corrections: content.corrections,
    editorNotes: content.editorNotes,
    seoAnalysis: {
      keywordDensity: seo.keywordDensity,
      suggestions: seo.suggestions,
    },
  };
}
