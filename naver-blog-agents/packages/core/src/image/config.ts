/**
 * 이미지 모듈 설정
 */

import type { ImageBridgeConfig, ImageCollectionOptions } from '../types/image.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 플랫폼별 Python 경로 결정
 */
function getDefaultPythonPath(): string {
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }
  // Windows에서는 py 런처 사용
  if (process.platform === 'win32') {
    return 'py';
  }
  return 'python3';
}

/**
 * 기본 브릿지 설정
 */
export const DEFAULT_BRIDGE_CONFIG: ImageBridgeConfig = {
  pythonPath: getDefaultPythonPath(),
  scriptPath: process.env.IMAGE_AGENT_PATH || join(__dirname, '..', '..', 'blog-image-agent'),
  timeout: parseInt(process.env.IMAGE_TIMEOUT || '300000', 10),
  maxRetries: parseInt(process.env.IMAGE_RETRIES || '2', 10),
};

/**
 * 기본 수집 옵션
 */
export const DEFAULT_COLLECTION_OPTIONS: ImageCollectionOptions = {
  maxImages: 10,
  sources: ['google', 'stock', 'ai'],
  quality: 85,
  convertToWebp: true,
};

/**
 * 환경 변수에서 설정 로드
 */
export function loadImageConfig(): {
  bridge: ImageBridgeConfig;
  collection: ImageCollectionOptions;
} {
  return {
    bridge: {
      ...DEFAULT_BRIDGE_CONFIG,
      pythonPath: process.env.PYTHON_PATH || getDefaultPythonPath(),
      scriptPath: process.env.IMAGE_AGENT_PATH || DEFAULT_BRIDGE_CONFIG.scriptPath,
      timeout: parseInt(process.env.IMAGE_TIMEOUT || String(DEFAULT_BRIDGE_CONFIG.timeout), 10),
      maxRetries: parseInt(process.env.IMAGE_RETRIES || String(DEFAULT_BRIDGE_CONFIG.maxRetries), 10),
    },
    collection: {
      ...DEFAULT_COLLECTION_OPTIONS,
      maxImages: parseInt(process.env.IMAGE_MAX || String(DEFAULT_COLLECTION_OPTIONS.maxImages), 10),
      quality: parseInt(process.env.IMAGE_QUALITY || String(DEFAULT_COLLECTION_OPTIONS.quality), 10),
      convertToWebp: process.env.IMAGE_WEBP !== 'false',
    },
  };
}

/**
 * 이미지 기능 활성화 여부 확인
 */
export function isImageFeatureEnabled(): boolean {
  return process.env.DISABLE_IMAGES !== 'true';
}
