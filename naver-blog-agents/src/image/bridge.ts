/**
 * TypeScript ↔ Python 브릿지
 * blog-image-agent를 subprocess로 실행
 */

import { spawn } from 'child_process';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import type {
  ImageBridgeConfig,
  ImageCollectionRequest,
  ImageCollectionResult,
  CollectionStatistics,
  ImageMap,
} from '../types/image.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ImageBridge');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 플랫폼별 Python 경로 결정
 */
function getDefaultPythonPath(): string {
  // 환경 변수가 있으면 우선 사용
  if (process.env.PYTHON_PATH) {
    return process.env.PYTHON_PATH;
  }

  // Windows에서는 py 런처 사용 (가장 안정적)
  if (process.platform === 'win32') {
    return 'py';
  }

  // macOS/Linux에서는 python3 우선
  return 'python3';
}

/** 기본 설정 */
const DEFAULT_CONFIG: ImageBridgeConfig = {
  pythonPath: getDefaultPythonPath(),
  scriptPath: join(__dirname, '..', '..', 'blog-image-agent'),
  timeout: 300000, // 5분
  maxRetries: 2,
};

/**
 * 이미지 수집 브릿지 클래스
 */
export class ImageBridge {
  private readonly config: ImageBridgeConfig;

  constructor(config: Partial<ImageBridgeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Python 환경 체크
   */
  async checkPythonEnvironment(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.config.pythonPath, ['--version']);

      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });
    });
  }

  /**
   * 이미지 수집 실행
   */
  async collectImages(request: ImageCollectionRequest): Promise<ImageCollectionResult> {
    const startTime = Date.now();

    // Python 환경 체크
    const pythonAvailable = await this.checkPythonEnvironment();
    if (!pythonAvailable) {
      logger.warn('Python 환경을 찾을 수 없습니다. 이미지 수집을 건너뜁니다.');
      return this.createSkippedResult('Python not available');
    }

    try {
      // 임시 파일로 HTML 전달
      const tempDir = join(request.outputDir, '.temp');
      await mkdir(tempDir, { recursive: true });

      const inputFile = join(tempDir, 'input.html');
      const outputFile = join(tempDir, 'result.json');

      await writeFile(inputFile, request.htmlContent, 'utf-8');

      // Python 스크립트 실행
      const result = await this.runPythonPipeline({
        inputFile,
        outputFile,
        outputDir: request.outputDir,
        options: request.options,
      });

      const executionTime = Date.now() - startTime;
      logger.info(`이미지 수집 완료: ${executionTime}ms`);

      return {
        ...result,
        executionTime,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`이미지 수집 실패: ${errorMessage}`);

      return this.createSkippedResult(errorMessage);
    }
  }

  /**
   * Python 파이프라인 실행
   */
  private runPythonPipeline(params: {
    inputFile: string;
    outputFile: string;
    outputDir: string;
    options: ImageCollectionRequest['options'];
  }): Promise<ImageCollectionResult> {
    return new Promise((resolvePromise, reject) => {
      const { inputFile, outputFile, outputDir, options } = params;

      // 절대 경로로 변환 (한글 경로 문제 해결)
      const absoluteInputFile = resolve(inputFile);
      const absoluteOutputDir = resolve(outputDir);

      const args = [
        '-m', 'src.cli.main',
        'pipeline',
        absoluteInputFile,
        '-o', absoluteOutputDir,
      ];

      // 참고: blog-image-agent pipeline은 현재 기본 옵션만 지원
      // maxImages, quality, webp 등은 향후 지원 예정

      logger.info(`Python 파이프라인 실행: ${args.join(' ')}`);

      const proc = spawn(this.config.pythonPath, args, {
        cwd: this.config.scriptPath,
        env: {
          ...process.env,
          PYTHONIOENCODING: 'utf-8',  // 한글 인코딩 지원
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.debug(`[Python] ${data.toString().trim()}`);
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        proc.kill('SIGTERM');
        reject(new Error('이미지 수집 타임아웃'));
      }, this.config.timeout);

      proc.on('close', async (code) => {
        clearTimeout(timeoutId);

        if (code !== 0) {
          reject(new Error(`Python 프로세스 종료 코드: ${code}\n${stderr}`));
          return;
        }

        try {
          // 결과 파일 읽기
          const resultPath = join(outputDir, 'image_map.json');
          const htmlPath = join(outputDir, 'content_with_images.html');

          let imageMap: ImageMap = {
            contentId: '',
            images: [],
            placements: [],
            statistics: { total: 0, bySource: {}, cacheHits: 0, failures: 0 },
          };

          let htmlWithImages = '';

          if (existsSync(resultPath)) {
            const resultContent = await readFile(resultPath, 'utf-8');
            imageMap = JSON.parse(resultContent);
          }

          if (existsSync(htmlPath)) {
            htmlWithImages = await readFile(htmlPath, 'utf-8');
          }

          resolvePromise({
            success: true,
            htmlWithImages,
            imageMap,
            statistics: imageMap.statistics,
            errors: [],
            executionTime: 0,
          });
        } catch (parseError) {
          reject(parseError);
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  /**
   * 스킵된 결과 생성
   */
  private createSkippedResult(reason: string): ImageCollectionResult {
    return {
      success: false,
      htmlWithImages: '',
      imageMap: {
        contentId: '',
        images: [],
        placements: [],
        statistics: { total: 0, bySource: {}, cacheHits: 0, failures: 0 },
      },
      statistics: { total: 0, bySource: {}, cacheHits: 0, failures: 0 },
      errors: [reason],
      executionTime: 0,
    };
  }
}

/**
 * 기본 브릿지 인스턴스 생성
 */
export function createImageBridge(config?: Partial<ImageBridgeConfig>): ImageBridge {
  return new ImageBridge(config);
}
