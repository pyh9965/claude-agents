/**
 * 네이버 스마트에디터 HTML 포맷터
 *
 * 네이버 블로그의 스마트에디터 ONE에서 사용할 수 있는
 * HTML 형식으로 콘텐츠를 변환합니다.
 */

import type { EditedContent, SEOOptimization } from '../types/index.js';

/** 네이버 HTML 옵션 */
export interface NaverHtmlOptions {
  /** 이미지 정렬 */
  imageAlign?: 'left' | 'center' | 'right';
  /** 기본 폰트 크기 */
  fontSize?: number;
  /** 줄 간격 */
  lineHeight?: number;
  /** 광고 표시 포함 여부 */
  includeAdDisclosure?: boolean;
  /** 광고 표시 텍스트 */
  adDisclosureText?: string;
}

const DEFAULT_OPTIONS: NaverHtmlOptions = {
  imageAlign: 'center',
  fontSize: 15,
  lineHeight: 1.8,
  includeAdDisclosure: false,
  adDisclosureText: '이 포스팅은 소정의 원고료를 받아 작성되었습니다.',
};

/**
 * 마크다운을 네이버 HTML로 변환
 */
export function markdownToNaverHtml(
  markdown: string,
  options: NaverHtmlOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let html = markdown;

  // 헤딩 변환
  html = html.replace(/^### (.+)$/gm, '<h3><span style="font-size: 18px;"><b>$1</b></span></h3>');
  html = html.replace(/^## (.+)$/gm, '<h2><span style="font-size: 20px;"><b>$1</b></span></h2>');
  html = html.replace(/^# (.+)$/gm, '<h1><span style="font-size: 24px;"><b>$1</b></span></h1>');

  // 볼드/이탤릭 변환
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');

  // 리스트 변환
  html = convertLists(html);

  // 인용문 변환
  html = html.replace(
    /^> (.+)$/gm,
    '<blockquote style="border-left: 4px solid #00c73c; padding-left: 16px; margin: 16px 0; color: #666;">$1</blockquote>'
  );

  // 코드 블록 변환
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<div style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; font-family: monospace; overflow-x: auto; margin: 16px 0;"><pre>$2</pre></div>'
  );

  // 인라인 코드 변환
  html = html.replace(
    /`([^`]+)`/g,
    '<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">$1</code>'
  );

  // 링크 변환
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" style="color: #00c73c; text-decoration: underline;">$1</a>'
  );

  // 수평선 변환
  html = html.replace(/^---$/gm, '<hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;">');

  // 문단 변환 (빈 줄로 구분된 텍스트)
  html = convertParagraphs(html, opts);

  // 이모지 보존 (네이버는 이모지 지원)
  // 별도 처리 없음

  return html;
}

/**
 * 리스트 변환
 */
function convertLists(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  for (const line of lines) {
    const unorderedMatch = line.match(/^[-*] (.+)$/);
    const orderedMatch = line.match(/^\d+\. (.+)$/);

    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ul style="margin: 16px 0; padding-left: 24px;">');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li style="margin: 8px 0;">${unorderedMatch[1]}</li>`);
    } else if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) result.push(listType === 'ul' ? '</ul>' : '</ol>');
        result.push('<ol style="margin: 16px 0; padding-left: 24px;">');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li style="margin: 8px 0;">${orderedMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push(listType === 'ul' ? '</ul>' : '</ol>');
        inList = false;
        listType = null;
      }
      result.push(line);
    }
  }

  if (inList) {
    result.push(listType === 'ul' ? '</ul>' : '</ol>');
  }

  return result.join('\n');
}

/**
 * 문단 변환
 */
function convertParagraphs(html: string, options: NaverHtmlOptions): string {
  const blocks = html.split(/\n\n+/);

  return blocks
    .map((block) => {
      block = block.trim();
      if (!block) return '';

      // 이미 HTML 태그로 시작하면 건너뛰기
      if (block.startsWith('<')) return block;

      // 일반 텍스트는 p 태그로 감싸기
      const lines = block.split('\n').filter((l) => l.trim());
      const content = lines.join('<br>');

      return `<p style="font-size: ${options.fontSize}px; line-height: ${options.lineHeight}; margin: 16px 0;">${content}</p>`;
    })
    .filter((b) => b)
    .join('\n\n');
}

/**
 * 네이버 블로그 HTML 템플릿 생성
 */
export function createNaverBlogTemplate(
  title: string,
  body: string,
  seo: SEOOptimization,
  options: NaverHtmlOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let html = '';

  // 광고 표시 (협찬/광고인 경우)
  if (opts.includeAdDisclosure) {
    html += `
<div style="background-color: #fff9e6; border: 1px solid #ffe066; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #666;">
  📢 ${opts.adDisclosureText}
</div>
`;
  }

  // 본문
  html += body;

  // 태그 섹션
  if (seo.tags && seo.tags.length > 0) {
    html += `
<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
  <p style="font-size: 13px; color: #999;">
    ${seo.tags.map((tag) => `#${tag}`).join(' ')}
  </p>
</div>
`;
  }

  return html;
}

/**
 * 편집된 콘텐츠를 네이버 HTML로 변환
 */
export async function formatToNaverHtml(
  content: EditedContent,
  seo: SEOOptimization,
  options: NaverHtmlOptions = {}
): Promise<string> {
  const htmlBody = markdownToNaverHtml(content.body, options);
  return createNaverBlogTemplate(content.title, htmlBody, seo, options);
}

/**
 * 네이버 블로그 복사용 HTML 생성 (스타일 인라인)
 */
export function createCopyableHtml(html: string): string {
  // 네이버 스마트에디터에 붙여넣기 가능한 형태로 반환
  return `<div class="se-main-container">${html}</div>`;
}
