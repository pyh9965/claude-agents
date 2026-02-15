# 05. 로케이터 전체 레퍼런스

## 5.1 로케이터 우선순위 (권장 순서)

1. `getByRole()` - ARIA 역할 기반 (최우선)
2. `getByText()` - 텍스트 콘텐츠
3. `getByLabel()` - 라벨 텍스트
4. `getByPlaceholder()` - placeholder 텍스트
5. `getByAltText()` - alt 속성
6. `getByTitle()` - title 속성
7. `getByTestId()` - data-testid 속성
8. `locator()` - CSS/XPath (최후 수단)

## 5.2 Role 기반 로케이터

### page.getByRole(role, options?)

```typescript
// 버튼
await page.getByRole('button', { name: '제출' }).click();

// 링크
await page.getByRole('link', { name: '홈으로' }).click();

// 체크박스
await page.getByRole('checkbox', { name: '동의' }).check();

// 텍스트 입력
await page.getByRole('textbox', { name: '이메일' }).fill('test@test.com');

// 셀렉트
await page.getByRole('combobox', { name: '국가' }).selectOption('KR');

// 제목
await page.getByRole('heading', { name: '환영합니다', level: 1 });

// 내비게이션
await page.getByRole('navigation').getByRole('link', { name: '설정' });

// 목록 아이템
await page.getByRole('listitem');

// 다이얼로그
await page.getByRole('dialog', { name: '확인' });

// 탭
await page.getByRole('tab', { name: '프로필', selected: true });

// 행/셀
await page.getByRole('row', { name: '사용자 1' });
await page.getByRole('cell', { name: '활성' });
```

### Role 옵션

```typescript
{
  name: string | RegExp,   // accessible name 매칭
  exact: boolean,          // 정확히 일치 (기본: false)
  checked: boolean,        // 체크 상태
  disabled: boolean,       // 비활성 상태
  expanded: boolean,       // 확장 상태
  includeHidden: boolean,  // 숨겨진 요소 포함
  level: number,           // heading 레벨 (1-6)
  pressed: boolean,        // 눌림 상태
  selected: boolean,       // 선택 상태
}
```

### 주요 ARIA Roles

| Role | HTML 요소 |
|------|-----------|
| `button` | `<button>`, `<input type="submit">` |
| `checkbox` | `<input type="checkbox">` |
| `combobox` | `<select>` |
| `heading` | `<h1>`~`<h6>` |
| `link` | `<a href>` |
| `list` | `<ul>`, `<ol>` |
| `listitem` | `<li>` |
| `navigation` | `<nav>` |
| `textbox` | `<input type="text">`, `<textarea>` |
| `radio` | `<input type="radio">` |
| `slider` | `<input type="range">` |
| `spinbutton` | `<input type="number">` |
| `tab` | `role="tab"` |
| `tabpanel` | `role="tabpanel"` |
| `dialog` | `<dialog>`, `role="dialog"` |
| `alert` | `role="alert"` |
| `img` | `<img>` |
| `row` | `<tr>` |
| `cell` | `<td>` |
| `table` | `<table>` |
| `main` | `<main>` |
| `banner` | `<header>` |
| `contentinfo` | `<footer>` |
| `complementary` | `<aside>` |
| `form` | `<form>` |
| `search` | `<search>` |
| `progressbar` | `<progress>` |
| `menuitem` | `role="menuitem"` |
| `menu` | `role="menu"` |
| `tree` | `role="tree"` |
| `treeitem` | `role="treeitem"` |

## 5.3 텍스트 기반 로케이터

### page.getByText(text, options?)

```typescript
// 부분 일치 (기본)
await page.getByText('환영합니다');

// 정확히 일치
await page.getByText('환영합니다', { exact: true });

// 정규식
await page.getByText(/환영.*님/);

// 클릭
await page.getByText('자세히 보기').click();
```

### page.getByLabel(text, options?)

```typescript
// 라벨 텍스트로 폼 요소 찾기
await page.getByLabel('이메일').fill('user@test.com');
await page.getByLabel('비밀번호').fill('secret');
await page.getByLabel('이용약관 동의').check();

// 정확히 일치
await page.getByLabel('이름', { exact: true });

// 정규식
await page.getByLabel(/이메일|email/i);
```

### page.getByPlaceholder(text, options?)

```typescript
await page.getByPlaceholder('이메일을 입력하세요').fill('user@test.com');
await page.getByPlaceholder('검색...').fill('Playwright');
await page.getByPlaceholder(/search/i).fill('query');
```

### page.getByAltText(text, options?)

```typescript
// 이미지 alt 텍스트
await page.getByAltText('회사 로고').click();
await page.getByAltText(/profile/i);
```

### page.getByTitle(text, options?)

```typescript
await expect(page.getByTitle('이슈 수')).toHaveText('25개');
await page.getByTitle('닫기').click();
```

### page.getByTestId(testId)

```typescript
// data-testid 속성 기반
await page.getByTestId('login-form').isVisible();
await page.getByTestId('submit-button').click();
await page.getByTestId('user-name').textContent();

// 커스텀 test-id 속성 설정 (playwright.config.ts)
// use: { testIdAttribute: 'data-cy' }
```

## 5.4 CSS/XPath 로케이터

### page.locator(selector)

```typescript
// CSS 선택자
await page.locator('.submit-button').click();
await page.locator('#login-form input[type="email"]').fill('test@test.com');
await page.locator('div.card >> text=더 보기').click();

// XPath
await page.locator('xpath=//button[text()="제출"]').click();
await page.locator('xpath=//div[@class="card"]//a').click();

// 텍스트 선택자
await page.locator('text=로그인').click();
await page.locator('text=/정규식 패턴/i').click();

// nth-match (여러 매칭 중 선택)
await page.locator(':nth-match(:text("Buy"), 3)').click();

// has-text 필터 (CSS 확장)
await page.locator('article:has-text("Playwright")').click();

// has 필터 (CSS 확장)
await page.locator('div:has(> button.primary)').click();

// visible 필터
await page.locator('button:visible').click();
```

## 5.5 로케이터 필터링

### locator.filter(options)

```typescript
// 텍스트로 필터링
const items = page.getByRole('listitem');
await items.filter({ hasText: '사과' }).click();

// 텍스트 제외
await items.filter({ hasNotText: '품절' }).first().click();

// 자식 요소로 필터링
await items.filter({
  has: page.getByRole('button', { name: '구매' })
}).click();

// 자식 요소 제외
await items.filter({
  hasNot: page.getByText('품절')
}).first().click();

// 체이닝
await page.getByRole('listitem')
  .filter({ hasText: '사과' })
  .filter({ has: page.getByRole('button') })
  .click();
```

## 5.6 로케이터 조합

### locator.and(locator)

```typescript
// 두 조건 모두 만족
const saveButton = page.getByRole('button')
  .and(page.getByTitle('저장'));
await saveButton.click();

// 클래스 + 텍스트
const activeItem = page.locator('.item')
  .and(page.getByText('활성'));
```

### locator.or(locator)

```typescript
// 둘 중 하나 만족
const loginOrSignup = page.getByRole('button', { name: '로그인' })
  .or(page.getByRole('button', { name: '회원가입' }));
await loginOrSignup.first().click();

// 여러 상태 대기
const successOrError = page.getByText('성공')
  .or(page.getByText('실패'));
await expect(successOrError.first()).toBeVisible();
```

## 5.7 선택 메서드

```typescript
const items = page.getByRole('listitem');

// 첫 번째 요소
await items.first().click();

// 마지막 요소
await items.last().click();

// N번째 요소 (0-indexed)
await items.nth(2).click();

// 요소 개수
const count = await items.count();

// 모든 요소 반복
for (const item of await items.all()) {
  await expect(item).toBeVisible();
}
// 또는
const allItems = await items.all();
for (const item of allItems) {
  console.log(await item.textContent());
}
```

## 5.8 로케이터 체이닝

```typescript
// 부모 → 자식 체이닝
await page
  .getByRole('navigation')
  .getByRole('link', { name: '설정' })
  .click();

// 복잡한 체이닝
await page
  .locator('.product-card')
  .filter({ hasText: 'iPhone' })
  .getByRole('button', { name: '구매' })
  .click();

// 프레임 내 로케이터
await page
  .frameLocator('iframe[name="payment"]')
  .getByLabel('카드 번호')
  .fill('4111111111111111');
```

## 5.9 로케이터 액션

```typescript
const locator = page.getByRole('button', { name: '제출' });

// 클릭
await locator.click();
await locator.click({ button: 'right' });       // 우클릭
await locator.click({ clickCount: 2 });          // 더블클릭
await locator.click({ modifiers: ['Shift'] });   // Shift+클릭
await locator.click({ force: true });            // actionability 체크 건너뜀
await locator.click({ position: { x: 10, y: 20 } }); // 특정 위치 클릭

await locator.dblclick();     // 더블클릭
await locator.hover();        // 호버
await locator.tap();          // 터치 탭 (hasTouch: true 필요)
await locator.focus();        // 포커스
await locator.blur();         // 포커스 해제

// 입력
await locator.fill('텍스트');     // 값 설정 (기존 내용 삭제)
await locator.clear();            // 내용 삭제
await locator.type('텍스트');     // 키보드 입력 시뮬레이션
await locator.press('Enter');     // 키 입력
await locator.pressSequentially('hello', { delay: 100 }); // 한 글자씩

// 체크/선택
await locator.check();            // 체크
await locator.uncheck();          // 체크 해제
await locator.setChecked(true);   // 체크 상태 설정
await locator.selectOption('value');           // 단일 선택
await locator.selectOption(['a', 'b']);        // 다중 선택
await locator.selectOption({ label: '옵션1' }); // 라벨로 선택
await locator.selectOption({ index: 2 });       // 인덱스로 선택

// 파일 업로드
await locator.setInputFiles('file.pdf');
await locator.setInputFiles(['file1.pdf', 'file2.pdf']);
await locator.setInputFiles([]);               // 파일 해제

// 드래그 & 드롭
await locator.dragTo(page.locator('#drop-zone'));

// 스크롤
await locator.scrollIntoViewIfNeeded();

// 정보 가져오기
const text = await locator.textContent();
const innerText = await locator.innerText();
const innerHTML = await locator.innerHTML();
const value = await locator.inputValue();
const isVisible = await locator.isVisible();
const isEnabled = await locator.isEnabled();
const isChecked = await locator.isChecked();
const isEditable = await locator.isEditable();
const isHidden = await locator.isHidden();
const isDisabled = await locator.isDisabled();
const attr = await locator.getAttribute('href');
const box = await locator.boundingBox();

// 스크린샷
await locator.screenshot({ path: 'element.png' });

// JavaScript 평가
const data = await locator.evaluate(el => el.dataset.info);
const allData = await locator.evaluateAll(
  els => els.map(el => el.textContent)
);

// 대기
await locator.waitFor();                        // 기본: visible
await locator.waitFor({ state: 'attached' });   // DOM에 존재
await locator.waitFor({ state: 'detached' });   // DOM에서 제거
await locator.waitFor({ state: 'hidden' });     // 숨김
await locator.waitFor({ state: 'visible' });    // 표시
await locator.waitFor({ timeout: 10_000 });     // 타임아웃
```

## 5.10 FrameLocator

```typescript
// iframe 내 요소 접근
const frame = page.frameLocator('#my-iframe');
await frame.getByRole('button', { name: '확인' }).click();

// 중첩 iframe
const nested = page
  .frameLocator('#outer')
  .frameLocator('#inner');
await nested.getByText('내용').isVisible();

// nth iframe
const thirdFrame = page.frameLocator('iframe').nth(2);
```
