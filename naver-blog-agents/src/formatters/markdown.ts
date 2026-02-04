/**
 * 마크다운 포맷터
 */

import type { EditedContent, SEOOptimization } from '../types/index.js';

/** 마크다운 옵션 */
export interface MarkdownOptions {
  /** 메타데이터 포함 여부 (YAML front matter) */
  includeFrontMatter?: boolean;
  /** 목차 생성 여부 */
  includeToc?: boolean;
  /** 태그 섹션 포함 여부 */
  includeTags?: boolean;
  /** SEO 정보 포함 여부 */
  includeSeoInfo?: boolean;
}

const DEFAULT_OPTIONS: MarkdownOptions = {
  includeFrontMatter: true,
  includeToc: false,
  includeTags: true,
  includeSeoInfo: true,
};

/**
 * YAML Front Matter 생성
 */
function createFrontMatter(
  title: string,
  seo: SEOOptimization,
  date: Date
): string {
  const yaml = [
    '---',
    `title: "${title.replace(/"/g, '\\"')}"`,
    `description: "${seo.metaDescription.replace(/"/g, '\\"')}"`,
    `date: ${date.toISOString().split('T')[0]}`,
    `tags: [${seo.tags.map((t) => `"${t}"`).join(', ')}]`,
    `seo_score: ${seo.seoScore}`,
    '---',
  ];

  return yaml.join('\n');
}

/**
 * 목차 생성
 */
function createTableOfContents(markdown: string): string {
  const headings: Array<{ level: number; text: string; anchor: string }> = [];

  const headingRegex = /^(#{1,3}) (.+)$/gm;
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const anchor = text
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s]/g, '')
      .replace(/\s+/g, '-');

    headings.push({ level, text, anchor });
  }

  if (headings.length === 0) return '';

  const toc = ['## 목차', ''];

  for (const heading of headings) {
    const indent = '  '.repeat(heading.level - 1);
    toc.push(`${indent}- [${heading.text}](#${heading.anchor})`);
  }

  toc.push('', '---', '');

  return toc.join('\n');
}

/**
 * 태그 섹션 생성
 */
function createTagsSection(tags: string[]): string {
  if (!tags || tags.length === 0) return '';

  return [
    '',
    '---',
    '',
    '**Tags:** ' + tags.map((t) => `\`${t}\``).join(' '),
  ].join('\n');
}

/**
 * SEO 정보 섹션 생성
 */
function createSeoSection(seo: SEOOptimization): string {
  const lines = [
    '',
    '---',
    '',
    '## SEO 정보',
    '',
    `- **SEO 제목:** ${seo.seoTitle}`,
    `- **메타 설명:** ${seo.metaDescription}`,
    `- **SEO 점수:** ${seo.seoScore}/100`,
    '',
    '### 키워드 밀도',
    '',
  ];

  for (const kd of seo.keywordDensity) {
    lines.push(`- \`${kd.keyword}\`: ${kd.count}회 (${kd.density}%)`);
  }

  if (seo.suggestions && seo.suggestions.length > 0) {
    lines.push('', '### 개선 제안', '');
    for (const suggestion of seo.suggestions) {
      lines.push(`- ${suggestion}`);
    }
  }

  return lines.join('\n');
}

/**
 * 편집된 콘텐츠를 마크다운으로 변환
 */
export async function formatToMarkdown(
  content: EditedContent,
  seo: SEOOptimization,
  options: MarkdownOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const parts: string[] = [];

  // Front Matter
  if (opts.includeFrontMatter) {
    parts.push(createFrontMatter(content.title, seo, new Date()));
    parts.push('');
  }

  // 제목
  parts.push(`# ${content.title}`);
  parts.push('');

  // 목차
  if (opts.includeToc) {
    parts.push(createTableOfContents(content.body));
  }

  // 본문
  parts.push(content.body);

  // 태그 섹션
  if (opts.includeTags) {
    parts.push(createTagsSection(seo.tags));
  }

  // SEO 정보
  if (opts.includeSeoInfo) {
    parts.push(createSeoSection(seo));
  }

  return parts.join('\n');
}

/**
 * 마크다운 정규화
 */
export function normalizeMarkdown(markdown: string): string {
  let normalized = markdown;

  // 연속된 빈 줄을 하나로
  normalized = normalized.replace(/\n{3,}/g, '\n\n');

  // 헤딩 앞뒤에 빈 줄 확보
  normalized = normalized.replace(/([^\n])\n(#{1,6} )/g, '$1\n\n$2');
  normalized = normalized.replace(/(#{1,6} .+)\n([^\n#])/g, '$1\n\n$2');

  // 리스트 앞뒤에 빈 줄 확보
  normalized = normalized.replace(/([^\n])\n([-*\d]+ )/g, '$1\n\n$2');

  // 코드 블록 앞뒤에 빈 줄 확보
  normalized = normalized.replace(/([^\n])\n```/g, '$1\n\n```');
  normalized = normalized.replace(/```\n([^\n])/g, '```\n\n$1');

  // 문서 시작/끝 공백 제거
  normalized = normalized.trim();

  return normalized;
}

/**
 * 마크다운 통계
 */
export function getMarkdownStats(markdown: string): {
  wordCount: number;
  charCount: number;
  lineCount: number;
  headingCount: number;
  linkCount: number;
  imageCount: number;
  codeBlockCount: number;
} {
  const lines = markdown.split('\n');
  const text = markdown.replace(/[#*`\[\]()]/g, '');

  return {
    wordCount: text.split(/\s+/).filter((w) => w).length,
    charCount: text.replace(/\s/g, '').length,
    lineCount: lines.length,
    headingCount: (markdown.match(/^#{1,6} /gm) || []).length,
    linkCount: (markdown.match(/\[.+?\]\(.+?\)/g) || []).length,
    imageCount: (markdown.match(/!\[.+?\]\(.+?\)/g) || []).length,
    codeBlockCount: (markdown.match(/```/g) || []).length / 2,
  };
}
