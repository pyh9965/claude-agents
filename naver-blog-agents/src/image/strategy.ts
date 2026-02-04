/**
 * 콘텐츠 유형별 이미지 전략
 */

import type { ContentType } from '../types/content.js';
import type { ImageStrategy, ImageSourceType, ImageType } from '../types/image.js';

/**
 * 콘텐츠 유형별 이미지 전략 정의
 */
export const IMAGE_STRATEGIES: Record<ContentType, ImageStrategy> = {
  food: {
    sources: ['google', 'stock', 'ai'],
    minImages: 5,
    maxImages: 8,
    preferReal: true,
    entityExtraction: true,
    thumbnailType: 'food_photo',
  },
  travel: {
    sources: ['google', 'stock', 'ai'],
    minImages: 8,
    maxImages: 12,
    preferReal: true,
    entityExtraction: true,
    thumbnailType: 'banner',
  },
  review: {
    sources: ['stock', 'ai', 'google'],
    minImages: 3,
    maxImages: 5,
    preferReal: false,
    entityExtraction: true,
    thumbnailType: 'content',
  },
  tech: {
    sources: ['stock', 'ai'],
    minImages: 2,
    maxImages: 4,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'content',
  },
  info: {
    sources: ['ai', 'stock'],
    minImages: 2,
    maxImages: 4,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'infographic',
  },
  marketing: {
    sources: ['stock', 'ai'],
    minImages: 3,
    maxImages: 5,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'banner',
  },
  lifestyle: {
    sources: ['stock', 'ai'],
    minImages: 4,
    maxImages: 6,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'content',
  },
  parenting: {
    sources: ['stock', 'ai'],
    minImages: 3,
    maxImages: 5,
    preferReal: false,
    entityExtraction: false,
    thumbnailType: 'content',
  },
};

/**
 * 콘텐츠 유형에 맞는 이미지 전략 가져오기
 */
export function getImageStrategy(contentType: ContentType): ImageStrategy {
  return IMAGE_STRATEGIES[contentType] || IMAGE_STRATEGIES.info;
}

/**
 * 이미지 소스 우선순위 결정
 */
export function getSourcePriority(
  contentType: ContentType,
  preferReal?: boolean
): ImageSourceType[] {
  const strategy = getImageStrategy(contentType);

  if (preferReal !== undefined) {
    return preferReal
      ? ['google', 'stock', 'ai']
      : ['ai', 'stock', 'google'];
  }

  return strategy.sources;
}
