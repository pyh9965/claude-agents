/**
 * 이미지 모듈 - 블로그 콘텐츠용 이미지 자동 수집
 */

// 타입 re-export
export type {
  ImageSourceType,
  ImageType,
  ImageStrategy,
  ImageCollectionRequest,
  ImageCollectionOptions,
  CollectedImage,
  ImagePlacement,
  CollectionStatistics,
  ImageMap,
  ImageCollectionResult,
  ImageBridgeConfig,
} from '../types/image.js';

// 브릿지
export { ImageBridge, createImageBridge } from './bridge.js';

// 전략
export { IMAGE_STRATEGIES, getImageStrategy, getSourcePriority } from './strategy.js';

// 설정
export {
  DEFAULT_BRIDGE_CONFIG,
  DEFAULT_COLLECTION_OPTIONS,
  loadImageConfig,
  isImageFeatureEnabled,
} from './config.js';
