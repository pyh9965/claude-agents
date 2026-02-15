# 07. Page API 핵심 메서드

## 7.1 네비게이션

```typescript
// URL로 이동
await page.goto('https://example.com');
await page.goto('/login');                        // baseURL 기준
await page.goto('/page', {
  waitUntil: 'domcontentloaded',                  // 'load' | 'domcontentloaded' | 'networkidle' | 'commit'
  timeout: 30_000,
  referer: 'https://google.com',
});

// 새로고침
await page.reload();
await page.reload({ waitUntil: 'networkidle' });

// 뒤로/앞으로
await page.goBack();
await page.goBack({ waitUntil: 'domcontentloaded' });
await page.goForward();
await page.goForward({ waitUntil: 'load' });

// URL 대기
await page.waitForURL('**/dashboard');
await page.waitForURL(/.*dashboard/);
await page.waitForURL('**/dashboard', { timeout: 10_000 });

// 로드 상태 대기
await page.waitForLoadState('load');              // 기본
await page.waitForLoadState('domcontentloaded');
await page.waitForLoadState('networkidle');       // 모든 네트워크 요청 완료
await page.waitForLoadState('commit');            // 응답 수신됨
```

## 7.2 페이지 정보

```typescript
// 현재 URL
const url = page.url();

// 페이지 제목
const title = await page.title();

// 전체 HTML
const html = await page.content();

// 닫혀 있는지 확인
const closed = page.isClosed();
```

## 7.3 JavaScript 실행

```typescript
// 값 반환
const title = await page.evaluate(() => document.title);

// 인수 전달
const result = await page.evaluate((num) => num * 2, 42);

// 복잡한 객체 전달
const data = await page.evaluate(({ url, name }) => {
  return { url, name, timestamp: Date.now() };
}, { url: '/api', name: 'test' });

// DOM 요소 전달
const text = await page.evaluate(
  (el) => el.textContent,
  await page.locator('.title').elementHandle()
);

// 반환값 없는 실행
await page.evaluate(() => {
  localStorage.clear();
  sessionStorage.clear();
});

// evaluateHandle - JSHandle 반환
const handle = await page.evaluateHandle(() => document.body);
```

## 7.4 스크린샷

```typescript
// 전체 페이지 스크린샷
await page.screenshot({ path: 'screenshot.png' });

// 전체 스크롤 페이지
await page.screenshot({ path: 'full.png', fullPage: true });

// Buffer로 받기
const buffer = await page.screenshot();

// 옵션
await page.screenshot({
  path: 'screenshot.png',
  fullPage: true,                   // 전체 페이지
  type: 'png',                      // 'png' | 'jpeg'
  quality: 80,                      // jpeg 품질 (0-100)
  omitBackground: true,             // 배경 투명
  clip: {                           // 영역 지정
    x: 0,
    y: 0,
    width: 800,
    height: 600,
  },
  mask: [page.locator('.timestamp')], // 마스킹
  maskColor: '#FF00FF',              // 마스크 색상
  animations: 'disabled',           // 애니메이션 중지
  caret: 'hide',                     // 커서 숨김
  scale: 'css',                      // 'css' | 'device'
  timeout: 30_000,
});
```

## 7.5 PDF 생성

```typescript
// Chromium only, headless 모드에서만 동작
const pdfBuffer = await page.pdf();

await page.pdf({
  path: 'output.pdf',
  format: 'A4',                     // 'Letter' | 'A4' | 'Legal' 등
  landscape: false,                  // 가로 모드
  printBackground: true,             // 배경 인쇄
  margin: {
    top: '20mm',
    right: '20mm',
    bottom: '20mm',
    left: '20mm',
  },
  scale: 1.0,                       // 확대/축소 (0.1~2.0)
  headerTemplate: '<div style="font-size:10px">Header</div>',
  footerTemplate: '<div style="font-size:10px"><span class="pageNumber"></span>/<span class="totalPages"></span></div>',
  displayHeaderFooter: true,
  preferCSSPageSize: false,
  width: '210mm',
  height: '297mm',
  pageRanges: '1-5',
  tagged: true,                      // 태그된 PDF (접근성)
});
```

## 7.6 대기 메서드

```typescript
// 셀렉터 대기 (가능하면 locator.waitFor() 사용 권장)
const element = await page.waitForSelector('.loading', {
  state: 'hidden',                   // 'attached' | 'detached' | 'visible' | 'hidden'
  timeout: 30_000,
  strict: true,                      // 단일 요소만 매칭
});

// 이벤트 대기
await page.waitForEvent('popup');
await page.waitForEvent('download');
await page.waitForEvent('dialog');

// 함수 조건 대기
await page.waitForFunction(
  () => document.querySelector('.loaded'),
  { timeout: 30_000, polling: 1_000 } // 1초 간격 폴링
);

// 인수 있는 함수 대기
await page.waitForFunction(
  (selector) => !!document.querySelector(selector),
  '.my-element'
);

// 타임아웃 (단순 대기)
await page.waitForTimeout(1_000);  // 1초 대기 (디버깅 용도로만 사용)

// 네트워크 요청/응답 대기
const request = await page.waitForRequest('**/api/data');
const request2 = await page.waitForRequest(
  (req) => req.url().includes('/api') && req.method() === 'POST'
);

const response = await page.waitForResponse('**/api/data');
const response2 = await page.waitForResponse(
  (resp) => resp.url().includes('/api') && resp.status() === 200
);
```

## 7.7 다이얼로그 처리

```typescript
// alert/confirm/prompt 자동 처리
page.on('dialog', async (dialog) => {
  console.log(dialog.type());        // 'alert' | 'confirm' | 'prompt' | 'beforeunload'
  console.log(dialog.message());     // 다이얼로그 메시지
  console.log(dialog.defaultValue()); // prompt 기본값

  await dialog.accept();             // 확인
  // 또는
  await dialog.accept('입력값');     // prompt에 값 입력 후 확인
  // 또는
  await dialog.dismiss();            // 취소
});

// 일회성 핸들러
page.once('dialog', (dialog) => dialog.accept());
await page.getByRole('button', { name: '삭제' }).click();
```

## 7.8 페이지 설정

```typescript
// 뷰포트 크기 변경
await page.setViewportSize({ width: 1920, height: 1080 });

// 추가 HTTP 헤더
await page.setExtraHTTPHeaders({
  'Authorization': 'Bearer token123',
  'X-Custom-Header': 'value',
});

// 미디어 에뮬레이션
await page.emulateMedia({
  media: 'print',                    // 'screen' | 'print' | null
  colorScheme: 'dark',               // 'dark' | 'light' | 'no-preference' | null
  reducedMotion: 'reduce',           // 'reduce' | 'no-preference' | null
  forcedColors: 'active',            // 'active' | 'none' | null
});

// 초기화 스크립트 (페이지 로드 전 실행)
await page.addInitScript(() => {
  window.testMode = true;
  Object.defineProperty(navigator, 'language', { value: 'ko-KR' });
});

// 파일로부터 초기화 스크립트
await page.addInitScript({ path: './init-script.js' });

// 스타일시트 추가
await page.addStyleTag({ content: '.ad-banner { display: none !important; }' });
await page.addStyleTag({ url: 'https://example.com/style.css' });
await page.addStyleTag({ path: './custom-styles.css' });

// 스크립트 추가
await page.addScriptTag({ content: 'console.log("injected")' });
await page.addScriptTag({ url: 'https://example.com/script.js' });
```

## 7.9 이벤트

```typescript
// 콘솔 메시지
page.on('console', (msg) => {
  console.log(`[${msg.type()}] ${msg.text()}`);
  // type(): 'log' | 'error' | 'warning' | 'info' | 'debug'
});

// 페이지 에러
page.on('pageerror', (error) => {
  console.error(`Page error: ${error.message}`);
});

// 요청/응답
page.on('request', (request) => {
  console.log(`>> ${request.method()} ${request.url()}`);
});

page.on('response', (response) => {
  console.log(`<< ${response.status()} ${response.url()}`);
});

// 요청 실패
page.on('requestfailed', (request) => {
  console.log(`FAIL: ${request.url()} ${request.failure()?.errorText}`);
});

// 팝업 (새 탭/창)
const popupPromise = page.waitForEvent('popup');
await page.getByRole('link', { name: '새 창' }).click();
const popup = await popupPromise;
await popup.waitForLoadState();

// 다운로드
const downloadPromise = page.waitForEvent('download');
await page.getByRole('link', { name: '다운로드' }).click();
const download = await downloadPromise;
const path = await download.path();
await download.saveAs('downloads/file.pdf');
console.log(download.suggestedFilename());

// 파일 선택기
const fileChooserPromise = page.waitForEvent('filechooser');
await page.getByRole('button', { name: '업로드' }).click();
const fileChooser = await fileChooserPromise;
await fileChooser.setFiles('my-file.pdf');

// WebSocket
page.on('websocket', (ws) => {
  console.log(`WebSocket opened: ${ws.url()}`);
  ws.on('framesent', (data) => console.log(`Sent: ${data.payload}`));
  ws.on('framereceived', (data) => console.log(`Received: ${data.payload}`));
  ws.on('close', () => console.log('WebSocket closed'));
});

// Worker
page.on('worker', (worker) => {
  console.log(`Worker started: ${worker.url()}`);
});
```

## 7.10 페이지 닫기

```typescript
// 페이지 닫기
await page.close();

// beforeunload 핸들러 실행
await page.close({ runBeforeUnload: true });

// 컨텍스트 가져오기
const context = page.context();
```

## 7.11 키보드 & 마우스

```typescript
// 키보드
await page.keyboard.type('Hello World');
await page.keyboard.press('Enter');
await page.keyboard.press('Control+A');
await page.keyboard.press('Control+C');
await page.keyboard.press('Control+V');
await page.keyboard.press('Shift+ArrowDown');
await page.keyboard.press('Meta+S');           // Cmd+S (Mac)
await page.keyboard.down('Shift');
await page.keyboard.up('Shift');
await page.keyboard.insertText('특수문자: @#$');

// 마우스
await page.mouse.click(100, 200);
await page.mouse.click(100, 200, { button: 'right' });
await page.mouse.dblclick(100, 200);
await page.mouse.move(100, 200);
await page.mouse.down();
await page.mouse.up();
await page.mouse.wheel(0, 500);                // 스크롤

// 드래그
await page.mouse.move(0, 0);
await page.mouse.down();
await page.mouse.move(100, 100);
await page.mouse.up();

// 터치스크린
await page.touchscreen.tap(100, 200);
```
