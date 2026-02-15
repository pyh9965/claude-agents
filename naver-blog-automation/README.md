# Naver Blog Automation (Playwright)

Playwright 기반 네이버 블로그 자동 포스팅 스크립트

## 설치

```bash
cd naver-blog-automation
npm install
npx playwright install chromium
```

## 설정

```bash
# .env 파일 생성
cp .env.example .env
```

`.env` 파일 편집:

```env
NAVER_ID=네이버_아이디
NAVER_PW=네이버_비밀번호
BLOG_ID=블로그_아이디
```

## 사용법

### 1단계: 로그인 (최초 1회)

```bash
npm run login
```

- headed 모드로 브라우저가 열림
- 캡차/2단계 인증이 뜨면 수동 처리
- 성공 시 `playwright/.auth/naver.json`에 세션 저장
- 세션 만료 시 다시 실행

### 2단계: 포스팅

```bash
# headed (브라우저 보면서)
npm run post

# headless (백그라운드)
npm run post:headless

# 디버그 모드 (Inspector)
npm run debug
```

### 포스팅 내용 수정

`tests/blog-post.spec.ts`의 `postData` 객체를 수정:

```typescript
const postData: BlogPostData = {
  title: '글 제목',
  content: '글 본문 내용...',
  tags: ['태그1', '태그2'],
  category: '카테고리명',
  images: ['./images/photo.jpg'],
  isPublic: false,  // true: 공개, false: 비공개
};
```

### 에디터 셀렉터 파악 (codegen)

```bash
npm run codegen
```

네이버 에디터가 업데이트되면 셀렉터가 변경될 수 있음.
codegen으로 현재 DOM 구조를 확인하고 `src/blog-editor.ts`의
`selectors` 객체를 업데이트.

## 구조

```
naver-blog-automation/
├── playwright.config.ts    # Playwright 설정
├── .env                    # 로그인 정보 (gitignore)
├── src/
│   ├── blog-editor.ts      # 블로그 에디터 조작 클래스
│   └── human-like.ts       # 봇 감지 우회 유틸리티
├── tests/
│   ├── auth.setup.ts       # 로그인 셋업
│   └── blog-post.spec.ts   # 포스팅 테스트
└── playwright/.auth/       # 세션 저장 (gitignore)
```

## 주의사항

1. **봇 감지**: 네이버는 자동화 도구를 감지함. 과도한 사용 시 계정 제한 가능
2. **셀렉터 변경**: 네이버 에디터 업데이트 시 셀렉터 재확인 필요
3. **캡차**: 최초 로그인 시 캡차가 나올 수 있음 (수동 처리)
4. **비공개 기본**: 안전을 위해 `isPublic: false` 기본 설정

## 프로그래밍 방식 호출 (AI 연동)

```typescript
import { chromium } from '@playwright/test';
import { NaverBlogEditor } from './src/blog-editor';
import { applyStealthScripts } from './src/human-like';

async function postToBlog(title: string, content: string, tags: string[]) {
  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    storageState: 'playwright/.auth/naver.json',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
  });

  const page = await context.newPage();
  await applyStealthScripts(page);

  const editor = new NaverBlogEditor(page, process.env.BLOG_ID!);
  await editor.createPost({
    title,
    content,
    tags,
    isPublic: false,
  });

  await browser.close();
}
```
