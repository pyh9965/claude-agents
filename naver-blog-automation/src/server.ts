/**
 * 블로그 자동 포스팅 GUI 서버
 *
 * Express 기반 로컬 웹 서버
 * - 프론트엔드 대시보드 (public/index.html)
 * - REST API (이미지 생성, 블로그 포스팅)
 * - SSE (Server-Sent Events)로 실시간 진행 상황 전달
 *
 * 사용법: npm run gui
 */
import express from 'express';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';
import dotenv from 'dotenv';
import { ChromeCDP } from './chrome-cdp';
import { NaverBlogEditor, type InterleavedPostData } from './blog-editor';
import { ChatGPTImageGenerator, type BlogContent } from './chatgpt-image';
import { GeminiGenerator } from './gemini-generator';
import { ClaudeGenerator } from './claude-generator';
import { applyStealthScripts, humanDelay } from './human-like';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Playwright 내부 다이얼로그 경쟁 조건 등으로 인한 unhandledRejection이 서버를 죽이지 않도록 처리
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  console.error(`[Server] UnhandledRejection (무시됨): ${msg}`);
});

const app = express();
const PORT = 3000;

/** Windows OS 레벨 파일 선택 다이얼로그 강제 닫기 */
function closeNativeFileDialogs(): void {
  try {
    spawnSync(
      'powershell',
      [
        '-NonInteractive',
        '-Command',
        '$s = New-Object -ComObject WScript.Shell; ' +
        'if ($s.AppActivate("열기")) { Start-Sleep -Milliseconds 300; $s.SendKeys("{ESC}") }; ' +
        'if ($s.AppActivate("Open")) { Start-Sleep -Milliseconds 300; $s.SendKeys("{ESC}") }',
      ],
      { timeout: 5000, stdio: 'ignore' },
    );
  } catch { /* 무시 */ }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.resolve(__dirname, '../public')));

// 이미지 파일 서빙
app.use('/output', express.static(path.resolve(__dirname, '../output')));

// ─── SSE 연결 관리 ───
const sseClients: express.Response[] = [];

function broadcast(event: string, data: any) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(res => res.write(msg));
}

function log(message: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const timestamp = new Date().toLocaleTimeString('ko-KR');
  console.log(`[${timestamp}] ${message}`);
  broadcast('log', { message, level, timestamp });
}

// SSE 엔드포인트
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('event: connected\ndata: {}\n\n');
  sseClients.push(res);
  req.on('close', () => {
    const idx = sseClients.indexOf(res);
    if (idx >= 0) sseClients.splice(idx, 1);
  });
});

// ─── 상태 관리 ───
let isRunning = false;
let currentStep = '';

app.get('/api/status', (_req, res) => {
  const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
  const outputDir = path.resolve(__dirname, '../output');
  const images = fs.existsSync(outputDir)
    ? fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).map(f => ({
        name: f,
        size: Math.round(fs.statSync(path.join(outputDir, f)).size / 1024),
        url: `/output/${f}`,
      }))
    : [];

  res.json({
    isRunning,
    currentStep,
    blogId,
    images,
  });
});

// ─── 이미지 생성 API ───
app.post('/api/generate-images', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: '이미 작업이 진행 중입니다' });
  }

  const { prompts, provider = 'chatgpt' } = req.body as { prompts: string[]; provider?: string };
  if (!prompts?.length) {
    return res.status(400).json({ error: '이미지 프롬프트가 필요합니다' });
  }

  isRunning = true;
  currentStep = 'image-generation';
  res.json({ status: 'started', count: prompts.length });

  // 비동기 실행
  (async () => {
    const cdp = new ChromeCDP({ debugPort: 9222, killExisting: false });
    try {
      broadcast('status', { step: 'connecting', progress: 0 });
      const providerName = provider === 'gemini' ? 'Gemini' : provider === 'claude' ? 'Claude (이미지→ChatGPT 폴백)' : 'ChatGPT';
      log(`Chrome CDP 연결 중... (${providerName})`);

      const { page } = await cdp.connect();
      await applyStealthScripts(page);

      // Claude는 이미지 생성 불가 → ChatGPT로 자동 폴백
      const generator = provider === 'gemini'
        ? new GeminiGenerator(page)
        : new ChatGPTImageGenerator(page);
      const outputDir = path.resolve(__dirname, '../output');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      for (let i = 0; i < prompts.length; i++) {
        const imgPath = path.resolve(outputDir, `blog-img-${i + 1}.png`);
        const progress = Math.round(((i) / prompts.length) * 100);

        broadcast('status', { step: 'generating', current: i + 1, total: prompts.length, progress });
        log(`이미지 ${i + 1}/${prompts.length} 생성 시작...`);

        // 이미 존재하면 스킵
        if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
          log(`이미지 ${i + 1} 기존 파일 재사용 (${Math.round(fs.statSync(imgPath).size / 1024)}KB)`, 'info');
          broadcast('image-ready', {
            index: i,
            path: imgPath,
            url: `/output/blog-img-${i + 1}.png`,
            size: Math.round(fs.statSync(imgPath).size / 1024),
          });
          continue;
        }

        // 재시도 포함 이미지 생성 (최대 2회 시도)
        let generated = false;
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            await generator.generateImage({ prompt: prompts[i], savePath: imgPath });
            generated = true;
            break;
          } catch (imgErr: any) {
            if (attempt < 2) {
              log(`이미지 ${i + 1} 생성 실패, 재시도 중... (${imgErr.message})`, 'warn');
              await humanDelay(3000, 5000);
            } else {
              log(`이미지 ${i + 1} 생성 최종 실패, 건너뜀: ${imgErr.message}`, 'warn');
            }
          }
        }

        if (generated) {
          log(`이미지 ${i + 1}/${prompts.length} 생성 완료!`, 'success');
          broadcast('image-ready', {
            index: i,
            path: imgPath,
            url: `/output/blog-img-${i + 1}.png`,
            size: Math.round(fs.statSync(imgPath).size / 1024),
          });
        }

        if (i < prompts.length - 1) {
          await humanDelay(2000, 4000);
        }
      }

      broadcast('status', { step: 'images-done', progress: 100 });
      log('모든 이미지 생성 완료!', 'success');
    } catch (error: any) {
      log(`이미지 생성 오류: ${error.message}`, 'error');
      broadcast('error', { message: error.message, step: 'image-generation' });
    } finally {
      isRunning = false;
      currentStep = '';
      await cdp.disconnect();
    }
  })();
});

// ─── 글 자동 생성 API ───
app.post('/api/generate-content', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: '이미 작업이 진행 중입니다' });
  }

  const { topic, provider = 'chatgpt' } = req.body as { topic: string; provider?: string };
  if (!topic?.trim()) {
    return res.status(400).json({ error: '주제를 입력해주세요' });
  }

  isRunning = true;
  currentStep = 'content-generation';
  res.json({ status: 'started' });

  (async () => {
    const cdp = new ChromeCDP({ debugPort: 9222, killExisting: false });
    let contentGenSuccess = false;
    try {
      // 새 주제로 글 생성 시작 → 이전 이미지 자동 삭제 (재사용 방지)
      const outputDir = path.resolve(__dirname, '../output');
      if (fs.existsSync(outputDir)) {
        const oldImages = fs.readdirSync(outputDir).filter(f => f.startsWith('blog-img-') && f.endsWith('.png'));
        oldImages.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
        if (oldImages.length > 0) log(`이전 이미지 ${oldImages.length}개 삭제 (새 주제 생성)`, 'info');
      }
      broadcast('images-cleared', {});

      broadcast('status', { step: 'connecting', progress: 0 });
      const providerName = provider === 'claude' ? 'Claude' : provider === 'gemini' ? 'Gemini' : 'ChatGPT';
      log(`Chrome CDP 연결 중... (${providerName})`);

      const { page } = await cdp.connect();
      await applyStealthScripts(page);

      broadcast('status', { step: 'generating-content', progress: 10 });
      log(`주제: "${topic}" 블로그 글 생성 중... [${providerName}]`);

      const generator = provider === 'claude'
        ? new ClaudeGenerator(page)
        : provider === 'gemini'
          ? new GeminiGenerator(page)
          : new ChatGPTImageGenerator(page);
      const content: BlogContent = await generator.generateBlogContent(topic);

      broadcast('status', { step: 'content-done', progress: 100 });
      broadcast('content-ready', content);
      log(`블로그 글 생성 완료! (${content.sections.length}개 섹션, 태그 ${content.tags.length}개)`, 'success');
      contentGenSuccess = true;
    } catch (error: any) {
      log(`글 생성 오류: ${error.message}`, 'error');
      broadcast('error', { message: error.message, step: 'content-generation' });
    } finally {
      isRunning = false;
      currentStep = '';
      await cdp.disconnect();
      // isRunning 리셋 + Chrome 종료 완료 후 클라이언트에 알림
      broadcast('content-generation-complete', { success: contentGenSuccess });
    }
  })();
});

// ─── 블로그 포스팅 API ───
app.post('/api/post-blog', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: '이미 작업이 진행 중입니다' });
  }

  const { title, sections, tags, isPublic } = req.body as {
    title: string;
    sections: Array<{ content: string; imageIndex?: number }>;
    tags: string[];
    isPublic: boolean;
  };

  if (!title || !sections?.length) {
    return res.status(400).json({ error: '제목과 본문 섹션이 필요합니다' });
  }

  const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
  if (!blogId) {
    return res.status(400).json({ error: '.env에 BLOG_ID를 설정해주세요' });
  }

  isRunning = true;
  currentStep = 'blog-posting';
  res.json({ status: 'started' });

  (async () => {
    const cdp = new ChromeCDP({ debugPort: 9222, killExisting: false });
    try {
      broadcast('status', { step: 'connecting', progress: 0 });
      log('Chrome CDP 연결 중...');

      const { page, context } = await cdp.connect();
      await applyStealthScripts(page);

      // 섹션 데이터에 이미지 경로 매핑
      const outputDir = path.resolve(__dirname, '../output');
      const postSections = sections.map(s => ({
        content: s.content,
        image: s.imageIndex !== undefined
          ? path.resolve(outputDir, `blog-img-${s.imageIndex + 1}.png`)
          : undefined,
      }));

      // 유효하지 않은 이미지 제거
      for (const section of postSections) {
        if (section.image && (!fs.existsSync(section.image) || fs.statSync(section.image).size <= 10000)) {
          log(`경고: 이미지 없음 → 텍스트만 사용`, 'warn');
          section.image = undefined;
        }
      }

      const postData: InterleavedPostData = {
        title,
        sections: postSections,
        tags,
        isPublic,
      };

      broadcast('status', { step: 'login-check', progress: 10 });
      log('네이버 로그인 확인 중...');

      const blogPage = await context.newPage();
      await applyStealthScripts(blogPage);
      // 발행 후 페이지 이동 시 브라우저 다이얼로그 자동 처리 (크래시 방지)
      blogPage.on('dialog', dialog => dialog.dismiss().catch(() => {}));

      await blogPage.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
      await humanDelay(2000, 3000);

      const isLoggedIn = await blogPage
        .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!isLoggedIn) {
        throw new Error('네이버 로그인 안 됨! npm run chrome:setup 으로 로그인하세요.');
      }
      log('네이버 로그인 확인 완료', 'success');

      broadcast('status', { step: 'posting', progress: 20 });
      log('블로그 포스팅 시작...');

      // 진행 상황을 위한 커스텀 로거 주입
      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const msg = args.map(a => String(a)).join(' ');
        originalLog(...args);
        if (msg.includes('[Editor]') || msg.includes('[Blog]')) {
          broadcast('log', { message: msg, level: 'info', timestamp: new Date().toLocaleTimeString('ko-KR') });
        }
      };

      const editor = new NaverBlogEditor(blogPage, blogId);
      await editor.createInterleavedPost(postData);

      // console.log 복원
      console.log = originalLog;

      // 발행 확인
      await humanDelay(3000, 5000);
      const currentUrl = blogPage.url();
      const logNoMatch = currentUrl.match(/logNo=(\d+)/);

      // 발행 후 OS 파일 다이얼로그 강제 닫기 (PowerShell) + 브라우저 ESC
      closeNativeFileDialogs();
      await blogPage.keyboard.press('Escape').catch(() => {});
      await humanDelay(500, 800);

      broadcast('status', { step: 'done', progress: 100 });
      log(`블로그 포스팅 완료!`, 'success');

      if (logNoMatch) {
        const postUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNoMatch[1]}`;
        broadcast('post-complete', { url: postUrl, logNo: logNoMatch[1] });
        log(`게시글 URL: ${postUrl}`, 'success');
      }
    } catch (error: any) {
      log(`블로그 포스팅 오류: ${error.message}`, 'error');
      broadcast('error', { message: error.message, step: 'blog-posting' });
    } finally {
      isRunning = false;
      currentStep = '';
      await cdp.disconnect();
    }
  })();
});

// ─── 통합 발행 API (이미지 생성 + 포스팅) ───
app.post('/api/post-full', async (req, res) => {
  if (isRunning) {
    return res.status(409).json({ error: '이미 작업이 진행 중입니다' });
  }

  const { title, sections, tags, isPublic } = req.body as {
    title: string;
    sections: Array<{ content: string; imagePrompt?: string }>;
    tags: string[];
    isPublic: boolean;
  };

  if (!title || !sections?.length) {
    return res.status(400).json({ error: '제목과 본문 섹션이 필요합니다' });
  }

  const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
  if (!blogId) {
    return res.status(400).json({ error: '.env에 BLOG_ID를 설정해주세요' });
  }

  isRunning = true;
  currentStep = 'full-posting';
  res.json({ status: 'started' });

  (async () => {
    const cdp = new ChromeCDP({ debugPort: 9222, killExisting: false });
    try {
      broadcast('status', { step: 'connecting', progress: 0 });
      log('Chrome CDP 연결 중...');

      const { page, context } = await cdp.connect();
      await applyStealthScripts(page);

      const outputDir = path.resolve(__dirname, '../output');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      // ── Step 1: 이미지 프롬프트가 있는 섹션의 이미지 생성 ──
      const imagePrompts = sections
        .map((s, i) => ({ prompt: s.imagePrompt, sectionIdx: i }))
        .filter(s => s.prompt?.trim());

      if (imagePrompts.length > 0) {
        log(`이미지 ${imagePrompts.length}개 생성 시작...`);
        const generator = new ChatGPTImageGenerator(page);

        for (let i = 0; i < imagePrompts.length; i++) {
          const imgPath = path.resolve(outputDir, `blog-img-${i + 1}.png`);
          const progress = Math.round((i / imagePrompts.length) * 50);

          broadcast('status', { step: 'generating', current: i + 1, total: imagePrompts.length, progress });
          log(`이미지 ${i + 1}/${imagePrompts.length} 생성 시작...`);

          if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
            log(`이미지 ${i + 1} 기존 파일 재사용 (${Math.round(fs.statSync(imgPath).size / 1024)}KB)`, 'info');
            broadcast('image-ready', {
              index: i,
              url: `/output/blog-img-${i + 1}.png`,
              size: Math.round(fs.statSync(imgPath).size / 1024),
            });
            continue;
          }

          await generator.generateImage({
            prompt: imagePrompts[i].prompt!,
            savePath: imgPath,
          });

          log(`이미지 ${i + 1}/${imagePrompts.length} 생성 완료!`, 'success');
          broadcast('image-ready', {
            index: i,
            url: `/output/blog-img-${i + 1}.png`,
            size: Math.round(fs.statSync(imgPath).size / 1024),
          });

          if (i < imagePrompts.length - 1) await humanDelay(2000, 4000);
        }

        broadcast('status', { step: 'images-done', progress: 50 });
        log('모든 이미지 생성 완료!', 'success');
      }

      // ── Step 2: 네이버 로그인 확인 ──
      broadcast('status', { step: 'login-check', progress: 55 });
      log('네이버 로그인 확인 중...');

      const blogPage = await context.newPage();
      await applyStealthScripts(blogPage);
      // 발행 후 페이지 이동 시 브라우저 다이얼로그 자동 처리 (크래시 방지)
      blogPage.on('dialog', dialog => dialog.dismiss().catch(() => {}));

      await blogPage.goto('https://www.naver.com', { waitUntil: 'domcontentloaded' });
      await humanDelay(2000, 3000);

      const isLoggedIn = await blogPage
        .locator('#account, .MyView-module__link_login___HpHMW, a[href*="mail.naver.com"]')
        .first()
        .isVisible({ timeout: 5_000 })
        .catch(() => false);

      if (!isLoggedIn) {
        throw new Error('네이버 로그인 안 됨! npm run chrome:setup 으로 로그인하세요.');
      }
      log('네이버 로그인 확인 완료', 'success');

      // ── Step 3: 블로그 포스팅 ──
      broadcast('status', { step: 'posting', progress: 60 });
      log('블로그 포스팅 시작...');

      let imgIdx = 0;
      const postSections = sections.map(s => {
        const hasPrompt = !!s.imagePrompt?.trim();
        let image: string | undefined;

        if (hasPrompt) {
          const imgPath = path.resolve(outputDir, `blog-img-${imgIdx + 1}.png`);
          imgIdx++;
          if (fs.existsSync(imgPath) && fs.statSync(imgPath).size > 10000) {
            image = imgPath;
          } else {
            log('경고: 이미지 없음 → 텍스트만 사용', 'warn');
          }
        }

        return { content: s.content, image };
      });

      const postData: InterleavedPostData = { title, sections: postSections, tags, isPublic };

      const originalLog = console.log;
      console.log = (...args: any[]) => {
        const msg = args.map(a => String(a)).join(' ');
        originalLog(...args);
        if (msg.includes('[Editor]') || msg.includes('[Blog]')) {
          broadcast('log', { message: msg, level: 'info', timestamp: new Date().toLocaleTimeString('ko-KR') });
        }
      };

      const editor = new NaverBlogEditor(blogPage, blogId);
      await editor.createInterleavedPost(postData);
      console.log = originalLog;

      await humanDelay(3000, 5000);
      const currentUrl = blogPage.url();
      const logNoMatch = currentUrl.match(/logNo=(\d+)/);

      // 발행 후 OS 파일 다이얼로그 강제 닫기 (PowerShell) + 브라우저 ESC
      closeNativeFileDialogs();
      await blogPage.keyboard.press('Escape').catch(() => {});
      await humanDelay(500, 800);

      broadcast('status', { step: 'done', progress: 100 });
      log('블로그 포스팅 완료!', 'success');

      if (logNoMatch) {
        const postUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNoMatch[1]}`;
        broadcast('post-complete', { url: postUrl, logNo: logNoMatch[1] });
        log(`게시글 URL: ${postUrl}`, 'success');
      }
    } catch (error: any) {
      log(`포스팅 오류: ${error.message}`, 'error');
      broadcast('error', { message: error.message, step: 'full-posting' });
    } finally {
      isRunning = false;
      currentStep = '';
      await cdp.disconnect();
    }
  })();
});

// ─── 이미지 삭제 API ───
app.delete('/api/images', (_req, res) => {
  const outputDir = path.resolve(__dirname, '../output');
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir).filter(f => f.startsWith('blog-img-') && f.endsWith('.png'));
    files.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
    log(`이미지 ${files.length}개 삭제`, 'info');
  }
  res.json({ status: 'ok' });
});

// ─── 서버 시작 ───
app.listen(PORT, () => {
  const blogId = process.env.BLOG_ID || process.env.NAVER_ID || '';
  console.log('========================================');
  console.log(`  Blog Automation GUI`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Blog ID: ${blogId}`);
  console.log('========================================');
});
