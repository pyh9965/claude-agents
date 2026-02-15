/**
 * 이미지 관련 타입 정의
 */

import type { ContentType } from './content.js';

/** 이미지 소스 유형 */
export type ImageSourceType = 'google' | 'stock' | 'ai';

/** 이미지 타입 */
export type ImageType = 'thumbnail' | 'banner' | 'content' | 'infographic' | 'food_photo' | 'map';

/** 이미지 전략 */
export interface ImageStrategy {
  sources: ImageSourceType[];
  minImages: number;
  maxImages: number;
  preferReal: boolean;
  entityExtraction: boolean;
  thumbnailType: ImageType;
}

/** 이미지 수집 요청 */
export interface ImageCollectionRequest {
  htmlContent: string;
  contentType: ContentType;
  outputDir: string;
  options: ImageCollectionOptions;
}

/** 이미지 수집 옵션 */
export interface ImageCollectionOptions {
  maxImages: number;
  sources: ImageSourceType[];
  quality: number;
  convertToWebp: boolean;
}

/** 수집된 이미지 */
export interface CollectedImage {
  id: string;
  url: string;
  localPath: string;
  source: ImageSourceType;
  width: number;
  height: number;
  attribution?: string;
  altText: string;
  caption: string;
  requirementId: string;
}

/** 이미지 배치 정보 */
export interface ImagePlacement {
  imageId: string;
  position: number;
  html: string;
}

/** 수집 통계 */
export interface CollectionStatistics {
  total: number;
  bySource: Record<string, number>;
  cacheHits: number;
  failures: number;
}

/** 이미지 맵 */
export interface ImageMap {
  contentId: string;
  images: CollectedImage[];
  placements: ImagePlacement[];
  statistics: CollectionStatistics;
}

/** 이미지 수집 결과 */
export interface ImageCollectionResult {
  success: boolean;
  htmlWithImages: string;
  imageMap: ImageMap;
  statistics: CollectionStatistics;
  errors: string[];
  executionTime: number;
}

/** 브릿지 설정 */
export interface ImageBridgeConfig {
  pythonPath: string;
  scriptPath: string;
  timeout: number;
  maxRetries: number;
}
