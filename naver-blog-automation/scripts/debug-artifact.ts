/**
 * Claude.ai 아티팩트 DOM 구조 디버그
 * 현재 열린 Claude 대화에서 아티팩트 패널의 DOM을 분석하고
 * 복사 버튼 추출을 테스트합니다.
 */
import { chromium } from 'playwright';

async function main() {
  console.log('[Debug] Chrome CDP 연결...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const pages = ctx.pages();

  // claude.ai 탭 찾기
  const claudePage = pages.find(p => p.url().includes('claude.ai'));
  if (!claudePage) {
    console.log('[Debug] claude.ai 탭 없음. 열린 탭:');
    pages.forEach(p => console.log(`  - ${p.url()}`));
    await browser.close();
    return;
  }

  console.log(`[Debug] Claude 탭: ${claudePage.url()}`);

  // ── 1. "복사" 텍스트를 포함한 모든 버튼 분석 ──
  console.log('\n=== 복사/Copy 버튼 분석 ===');
  const copyBtnInfo = await claudePage.evaluate(() => {
    const results: any[] = [];
    const buttons = document.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
      const text = (btn.textContent || '').trim();
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const title = btn.getAttribute('title') || '';
      const testId = btn.getAttribute('data-testid') || '';

      if (text.includes('복사') || text.includes('Copy') || text.includes('copy') ||
          ariaLabel.includes('복사') || ariaLabel.includes('Copy') || ariaLabel.includes('copy') ||
          title.includes('복사') || title.includes('Copy')) {
        // 부모 요소 체인 (최대 5단계)
        const parents: string[] = [];
        let el: HTMLElement | null = btn.parentElement;
        for (let i = 0; i < 5 && el; i++) {
          const tag = el.tagName.toLowerCase();
          const cls = (el.className?.toString() || '').substring(0, 60);
          const role = el.getAttribute('role') || '';
          const testId = el.getAttribute('data-testid') || '';
          parents.push(`${tag}[class="${cls}"]${role ? `[role="${role}"]` : ''}${testId ? `[data-testid="${testId}"]` : ''}`);
          el = el.parentElement;
        }

        results.push({
          idx,
          text: text.substring(0, 50),
          ariaLabel,
          title,
          testId,
          visible: btn.offsetParent !== null,
          rect: btn.getBoundingClientRect(),
          parents,
        });
      }
    });
    return results;
  });

  if (copyBtnInfo.length === 0) {
    console.log('  복사 버튼 없음!');
  } else {
    copyBtnInfo.forEach((info: any, i: number) => {
      console.log(`\n  [${i}] 버튼 #${info.idx}`);
      console.log(`    text: "${info.text}"`);
      console.log(`    aria-label: "${info.ariaLabel}"`);
      console.log(`    data-testid: "${info.testId}"`);
      console.log(`    visible: ${info.visible}`);
      console.log(`    rect: (${Math.round(info.rect.x)}, ${Math.round(info.rect.y)}) ${Math.round(info.rect.width)}x${Math.round(info.rect.height)}`);
      console.log(`    parents:`);
      info.parents.forEach((p: string) => console.log(`      → ${p}`));
    });
  }

  // ── 2. ---TITLE--- 마커를 포함한 요소 분석 ──
  console.log('\n=== ---TITLE--- 마커 포함 요소 ===');
  const markerInfo = await claudePage.evaluate(() => {
    const results: any[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node: Node | null;

    while ((node = walker.nextNode())) {
      const el = node as HTMLElement;
      if (['SCRIPT', 'STYLE', 'SVG'].includes(el.tagName)) continue;

      const text = (el.innerText || '').trim();
      if (text.length < 100 || text.length > 15000) continue;
      if (!text.includes('---TITLE---') || !text.includes('---SECTION1---')) continue;

      // 프롬프트 템플릿 제외
      const isTemplate = text.includes('아래 형식으로 정확히 작성해줘');

      const rect = el.getBoundingClientRect();
      results.push({
        tag: el.tagName.toLowerCase(),
        className: (el.className?.toString() || '').substring(0, 80),
        textLen: text.length,
        preview: text.substring(0, 100).replace(/\n/g, '↵'),
        isTemplate,
        isUserMsg: !!el.closest('[data-testid="user-message"]'),
        isStreaming: !!el.closest('[data-is-streaming]'),
        rect: `(${Math.round(rect.x)}, ${Math.round(rect.y)}) ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        hasImage1: text.includes('---IMAGE1---'),
      });
    }

    return results;
  });

  if (markerInfo.length === 0) {
    console.log('  마커 포함 요소 없음!');
  } else {
    markerInfo.forEach((info: any, i: number) => {
      console.log(`\n  [${i}] <${info.tag} class="${info.className}">`);
      console.log(`    textLen: ${info.textLen}`);
      console.log(`    preview: "${info.preview}"`);
      console.log(`    isTemplate: ${info.isTemplate}`);
      console.log(`    isUserMsg: ${info.isUserMsg}`);
      console.log(`    isStreaming: ${info.isStreaming}`);
      console.log(`    hasImage1: ${info.hasImage1}`);
      console.log(`    rect: ${info.rect}`);
    });
  }

  // ── 3. 복사 버튼 클릭 테스트 ──
  if (copyBtnInfo.length > 0) {
    console.log('\n=== 복사 버튼 클릭 테스트 ===');
    for (let i = 0; i < copyBtnInfo.length; i++) {
      const info = copyBtnInfo[i];
      if (!info.visible) continue;

      try {
        // 클립보드 초기화
        await claudePage.evaluate(() => navigator.clipboard.writeText(''));

        const btn = claudePage.locator('button').nth(info.idx);
        await btn.click();
        await new Promise(r => setTimeout(r, 1000));

        const clipText = await claudePage.evaluate(() =>
          navigator.clipboard.readText()
        ).catch(() => '');

        const hasTitle = clipText.includes('---TITLE---');
        const hasSection = clipText.includes('---SECTION1---');
        const hasImage = clipText.includes('---IMAGE1---');

        console.log(`\n  [${i}] 버튼 #${info.idx} (${info.text}) 클릭 결과:`);
        console.log(`    clipLen: ${clipText.length}`);
        console.log(`    hasTitle: ${hasTitle}, hasSection: ${hasSection}, hasImage: ${hasImage}`);
        if (clipText.length > 0) {
          console.log(`    preview: "${clipText.substring(0, 150).replace(/\n/g, '↵')}"`);
        }

        if (hasTitle && hasSection) {
          console.log(`\n  ✅ 성공! 버튼 #${info.idx}이 아티팩트 콘텐츠를 복사함!`);
          break;
        }
      } catch (e: any) {
        console.log(`  [${i}] 클릭 실패: ${e.message}`);
      }
    }
  }

  await browser.close();
  console.log('\n[Debug] 완료');
}

main().catch(console.error);
