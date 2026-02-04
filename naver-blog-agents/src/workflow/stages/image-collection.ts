/**
 * 이미지 수집 워크플로우 스테이지
 */

import type { ContentType, EditedContent, SEOOptimization } from '../../types/index.js';
import type { ImageCollectionResult, ImageMap } from '../../types/image.js';
import { ImageBridge, getImageStrategy, loadImageConfig, isImageFeatureEnabled } from '../../image/index.js';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('Image');

/** 이미지 수집 옵션 */
export interface ImageCollectionStageOptions {
  /** 이미지 수집 활성화 */
  withImages: boolean;
  /** 이미지 소스 (google, stock, ai) */
  imageSources?: ('google' | 'stock' | 'ai')[];
  /** 최대 이미지 수 */
  maxImages?: number;
  /** 출력 디렉토리 */
  outputDir?: string;
}

/** 이미지 수집 결과 */
export interface ImageStageResult {
  success: boolean;
  skipped: boolean;
  htmlWithImages?: string;
  imageMap?: ImageMap;
  statistics?: {
    total: number;
    bySource: Record<string, number>;
    failures: number;
    executionTime: number;
  };
  error?: string;
}

/**
 * 이미지 수집 스테이지 실행
 */
export async function runImageCollectionStage(
  edited: EditedContent,
  seo: SEOOptimization,
  contentType: ContentType,
  outputDir: string,
  options: ImageCollectionStageOptions
): Promise<ImageStageResult> {
  // 이미지 기능 비활성화 체크
  if (!options.withImages || !isImageFeatureEnabled()) {
    logger.info('이미지 수집 스킵 (비활성화)');
    return { success: true, skipped: true };
  }

  const startTime = Date.now();
  const strategy = getImageStrategy(contentType);
  const config = loadImageConfig();

  logger.info(`이미지 전략: ${contentType} (${strategy.sources.join(' → ')})`);
  logger.info(`이미지 수집 시작 (최대 ${options.maxImages || strategy.maxImages}개)`);

  try {
    // HTML 콘텐츠 생성 (편집된 내용 + SEO 적용)
    const htmlContent = generateHtmlForImageAnalysis(edited, seo);

    // 브릿지 생성 및 실행
    const bridge = new ImageBridge(config.bridge);

    const result = await bridge.collectImages({
      htmlContent,
      contentType,
      outputDir,
      options: {
        maxImages: options.maxImages || strategy.maxImages,
        sources: options.imageSources || strategy.sources,
        quality: config.collection.quality,
        convertToWebp: config.collection.convertToWebp,
      },
    });

    const executionTime = Date.now() - startTime;

    if (result.success) {
      logger.info(`이미지 수집 완료: ${result.statistics.total}개 (${executionTime}ms)`);
      logger.info(`소스별: ${JSON.stringify(result.statistics.bySource)}`);

      return {
        success: true,
        skipped: false,
        htmlWithImages: result.htmlWithImages,
        imageMap: result.imageMap,
        statistics: {
          total: result.statistics.total,
          bySource: result.statistics.bySource,
          failures: result.statistics.failures,
          executionTime,
        },
      };
    } else {
      logger.warn(`이미지 수집 실패: ${result.errors.join(', ')}`);
      return {
        success: false,
        skipped: false,
        error: result.errors.join(', '),
        statistics: {
          total: 0,
          bySource: {},
          failures: 1,
          executionTime,
        },
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`이미지 수집 오류: ${errorMessage}`);

    return {
      success: false,
      skipped: false,
      error: errorMessage,
      statistics: {
        total: 0,
        bySource: {},
        failures: 1,
        executionTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * 이미지 분석용 HTML 생성
 */
function generateHtmlForImageAnalysis(
  edited: EditedContent,
  seo: SEOOptimization
): string {
  const sections = edited.body.split('\n\n').filter(s => s.trim());

  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${seo.seoTitle || edited.title}</title>
  <meta name="description" content="${seo.metaDescription}">
</head>
<body>
  <article>
    <h1>${edited.title}</h1>
`;

  for (const section of sections) {
    if (section.startsWith('## ')) {
      html += `    <h2>${section.slice(3)}</h2>\n`;
    } else if (section.startsWith('### ')) {
      html += `    <h3>${section.slice(4)}</h3>\n`;
    } else if (section.startsWith('- ') || section.startsWith('* ')) {
      const items = section.split('\n').map(line =>
        `<li>${line.replace(/^[-*]\s*/, '')}</li>`
      ).join('\n        ');
      html += `    <ul>\n        ${items}\n    </ul>\n`;
    } else {
      html += `    <p>${section}</p>\n`;
    }
  }

  html += `  </article>
</body>
</html>`;

  return html;
}
