/**
 * 자동화 방식 분석 레포트 Word 문서 생성기
 */
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, UnderlineType,
  PageBreak, LevelFormat, convertInchesToTwip,
  ImageRun, Header, Footer, PageNumber,
} from 'docx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, '..', '네이버_블로그_자동화_방식_분석_레포트.docx');

// ─── 스타일 헬퍼 ───────────────────────────────────────────────

const H1 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  border: { bottom: { color: '2E74B5', size: 6, style: BorderStyle.SINGLE } },
});

const H2 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 150 },
});

const H3 = (text) => new Paragraph({
  text,
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
});

const P = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, size: 22, ...opts })],
  spacing: { after: 120, line: 276 },
});

const Bold = (text, size = 22) => new TextRun({ text, bold: true, size });
const Normal = (text, size = 22) => new TextRun({ text, size });
const Colored = (text, color, size = 22) => new TextRun({ text, color, size, bold: true });
const Code = (text) => new TextRun({ text, font: 'Consolas', size: 20, color: '2E4053' });

const Bullet = (text, level = 0) => new Paragraph({
  children: [new TextRun({ text, size: 22 })],
  bullet: { level },
  spacing: { after: 80, line: 260 },
});

const SubBullet = (text) => Bullet(text, 1);

const BlankLine = () => new Paragraph({ text: '', spacing: { after: 100 } });

const InfoBox = (label, text, bgColor = 'EBF3FB') => new Paragraph({
  children: [
    new TextRun({ text: `${label}  `, bold: true, size: 20, color: '1A5276' }),
    new TextRun({ text, size: 20, color: '1A5276' }),
  ],
  spacing: { before: 100, after: 100, line: 260 },
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: bgColor },
  indent: { left: 200, right: 200 },
  border: {
    left: { color: '2E74B5', size: 12, style: BorderStyle.SINGLE },
  },
});

const WarningBox = (text) => InfoBox('⚠️', text, 'FEF9E7');
const SuccessBox = (text) => InfoBox('✅', text, 'EAFAF1');
const DangerBox = (text) => InfoBox('❌', text, 'FDEDEC');

// ─── 테이블 헬퍼 ────────────────────────────────────────────────

const cell = (text, opts = {}) => new TableCell({
  children: [new Paragraph({
    children: [new TextRun({ text, size: 19, ...opts })],
    spacing: { after: 60 },
    alignment: AlignmentType.LEFT,
  })],
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  ...( opts.fill ? { shading: { type: ShadingType.CLEAR, color: 'auto', fill: opts.fill } } : {} ),
});

const headerCell = (text) => new TableCell({
  children: [new Paragraph({
    children: [new TextRun({ text, size: 20, bold: true, color: 'FFFFFF' })],
    spacing: { after: 60 },
    alignment: AlignmentType.CENTER,
  })],
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: '2E74B5' },
  margins: { top: 100, bottom: 100, left: 120, right: 120 },
});

// ─── 비교 테이블 ────────────────────────────────────────────────

function makeComparisonTable() {
  const rows = [
    ['항목', '브라우저 자동화 (현재)', 'REST API', '로컬 LLM', '하이브리드'],
    ['API 비용', '없음 (무료)', '사용량 기반 과금', '없음 (무료)', '일부 과금'],
    ['속도', '느림 (30~120초)', '빠름 (1~5초)', '보통 (5~30초)', '빠름'],
    ['안정성', '낮음 (UI 변경에 취약)', '높음', '중간', '높음'],
    ['이미지 품질', 'DALL-E 3 / Gemini Pro', 'DALL-E 3 / Imagen', '제한적', '최상급'],
    ['유지보수', '높음 (셀렉터 깨짐)', '낮음', '중간', '중간'],
    ['로그인 필요', '예 (Chrome 프로필)', 'API 키만', '불필요', '일부'],
    ['오프라인 가능', '불가', '불가', '가능', '일부 가능'],
    ['구현 난이도', '중간 (완료)', '낮음', '높음', '중간'],
    ['GPT-4o 이미지', '가능 (유료 플랜)', '가능 (API 과금)', '불가', '가능'],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, ri) =>
      new TableRow({
        children: row.map((text, ci) => {
          if (ri === 0) return headerCell(text);
          const fill = ri % 2 === 0 ? 'F2F9FF' : 'FFFFFF';
          const bold = ci === 0;
          const color = ci === 1 ? '1A5276' : ci === 2 ? '145A32' : ci === 3 ? '4A235A' : '784212';
          return cell(text, { bold, fill, color: ci > 0 ? color : '000000' });
        }),
      })
    ),
  });
}

// ─── 비용 테이블 ────────────────────────────────────────────────

function makeCostTable() {
  const rows = [
    ['API / 서비스', '모델', '입력 가격', '출력 가격', '이미지 생성', '월 100회 포스팅 예상'],
    ['OpenAI API', 'GPT-4o', '$2.50/1M tokens', '$10.00/1M tokens', '$0.040/장', '약 $15~25'],
    ['OpenAI API', 'GPT-4o-mini', '$0.15/1M tokens', '$0.60/1M tokens', '미지원', '약 $1~3'],
    ['Google Gemini', 'Gemini 1.5 Flash', '$0.075/1M tokens', '$0.30/1M tokens', '$0.03/장', '약 $8~15'],
    ['Google Gemini', 'Gemini 1.5 Pro', '$1.25/1M tokens', '$5.00/1M tokens', '$0.04/장', '약 $15~30'],
    ['Naver CLOVA', 'HyperCLOVA X', '별도 문의', '-', '미지원', '별도 계약'],
    ['Ollama (로컬)', 'Llama 3.1 8B', '무료', '무료', '미지원', '$0 (전기세만)'],
    ['브라우저 자동화', '현재 방식', '무료', '무료', '무료', '$0'],
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, ri) =>
      new TableRow({
        children: row.map((text, ci) => {
          if (ri === 0) return headerCell(text);
          const fill = ri % 2 === 0 ? 'F9F9F9' : 'FFFFFF';
          return cell(text, { fill });
        }),
      })
    ),
  });
}

// ─── 코드 블록 ─────────────────────────────────────────────────

const CodeBlock = (lines) => new Paragraph({
  children: lines.map((l, i) => new TextRun({
    text: l + (i < lines.length - 1 ? '\n' : ''),
    font: 'Consolas',
    size: 18,
    color: '2C3E50',
  })),
  shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'F4F6F7' },
  spacing: { before: 100, after: 100, line: 240 },
  indent: { left: 300, right: 300 },
  border: {
    left: { color: '5DADE2', size: 12, style: BorderStyle.SINGLE },
  },
});

// ─── 문서 구성 ─────────────────────────────────────────────────

const doc = new Document({
  styles: {
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1',
        run: { size: 32, bold: true, color: '1A3A6B', font: '맑은 고딕' },
      },
      {
        id: 'Heading2', name: 'Heading 2',
        run: { size: 26, bold: true, color: '2E74B5', font: '맑은 고딕' },
      },
      {
        id: 'Heading3', name: 'Heading 3',
        run: { size: 23, bold: true, color: '2E86AB', font: '맑은 고딕' },
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        margin: {
          top: convertInchesToTwip(1),
          right: convertInchesToTwip(1),
          bottom: convertInchesToTwip(1),
          left: convertInchesToTwip(1.2),
        },
      },
    },
    children: [

      // ══════════════════════════════════════════════
      // 표지
      // ══════════════════════════════════════════════
      new Paragraph({
        children: [new TextRun({ text: '', size: 22 })],
        spacing: { after: 1200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '네이버 블로그 자동화', size: 52, bold: true, color: '1A3A6B', font: '맑은 고딕' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '자동화 방식 비교 분석 레포트', size: 40, bold: true, color: '2E74B5', font: '맑은 고딕' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '브라우저 자동화 vs REST API vs 로컬 LLM vs 하이브리드', size: 24, color: '5D6D7E', font: '맑은 고딕' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '작성일: 2026년 2월', size: 22, color: '7F8C8D' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }),
      new Paragraph({
        children: [new TextRun({ text: '대상 프로젝트: naver-blog-automation', size: 22, color: '7F8C8D' })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 3000 },
      }),

      // ══════════════════════════════════════════════
      // 1. 개요
      // ══════════════════════════════════════════════
      H1('1. 분석 개요'),

      P('본 레포트는 현재 네이버 블로그 자동화 시스템(naver-blog-automation)이 사용하는 브라우저 자동화 방식 이외의 대안적 자동화 방식들을 분석하고, 각 방식의 장단점·비용·구현 복잡도·적합성을 종합 비교합니다.'),
      BlankLine(),

      H2('1.1 현재 시스템 구조'),
      InfoBox('현재 방식', 'Playwright + Chrome CDP 브라우저 자동화 (API 미사용)'),
      BlankLine(),

      Bullet('콘텐츠 생성: chatgpt.com 또는 gemini.google.com 브라우저 직접 조작'),
      Bullet('이미지 생성: ChatGPT DALL-E 3 / Gemini 이미지 생성 브라우저 조작'),
      Bullet('블로그 포스팅: blog.naver.com SmartEditor ONE 브라우저 자동화'),
      Bullet('Chrome 연결: CDP (Chrome DevTools Protocol) 디버그 프로필 사용'),
      BlankLine(),

      H2('1.2 분석 대상 방식'),
      Bullet('방식 A: REST API 방식 (OpenAI API, Google Gemini API)'),
      Bullet('방식 B: 네이버 공식 API (Naver Open API, CLOVA)'),
      Bullet('방식 C: 로컬 LLM (Ollama, LM Studio)'),
      Bullet('방식 D: 하이브리드 방식 (API + 최소 브라우저 자동화)'),
      Bullet('방식 E: MCP (Model Context Protocol) 기반 자동화'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 2. 전체 비교 요약
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('2. 전체 방식 비교 요약'),
      BlankLine(),
      makeComparisonTable(),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 3. 방식 A: REST API
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('3. 방식 A — REST API 방식'),

      InfoBox('핵심 개념', '웹사이트 조작 없이 서비스가 제공하는 공식 HTTP API를 직접 호출'),
      BlankLine(),

      H2('3.1 OpenAI API'),

      H3('3.1.1 텍스트 생성 (GPT-4o / GPT-4o-mini)'),
      P('OpenAI REST API를 통해 GPT 모델을 직접 호출하여 블로그 글을 생성합니다. 브라우저 조작 없이 JSON 요청/응답으로 처리됩니다.'),
      BlankLine(),
      CodeBlock([
        '// 현재 방식 (브라우저 자동화)',
        'await page.goto("https://chatgpt.com")',
        'await sendPrompt(prompt)           // 30~120초 소요',
        '',
        '// API 방식',
        'const res = await fetch("https://api.openai.com/v1/chat/completions", {',
        '  method: "POST",',
        '  headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },',
        '  body: JSON.stringify({',
        '    model: "gpt-4o",',
        '    messages: [{ role: "user", content: prompt }]',
        '  })',
        '})',
        'const text = res.choices[0].message.content  // 1~3초 소요',
      ]),
      BlankLine(),

      H3('3.1.2 이미지 생성 (DALL-E 3)'),
      CodeBlock([
        'const res = await fetch("https://api.openai.com/v1/images/generations", {',
        '  method: "POST",',
        '  headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },',
        '  body: JSON.stringify({',
        '    model: "dall-e-3",',
        '    prompt: imagePrompt,',
        '    n: 1,',
        '    size: "1024x1024",',
        '    quality: "hd"',
        '  })',
        '})',
        'const imageUrl = res.data[0].url',
      ]),
      BlankLine(),

      H3('3.1.3 OpenAI API 비용 분석'),
      new Paragraph({
        children: [
          Bold('GPT-4o 텍스트: '), Normal('입력 $2.50/1M tokens, 출력 $10.00/1M tokens\n'),
          Bold('GPT-4o-mini: '), Normal('입력 $0.15/1M tokens, 출력 $0.60/1M tokens\n'),
          Bold('DALL-E 3 HD: '), Normal('$0.080/장 (1024×1024), $0.120/장 (1792×1024)\n'),
          Bold('월 100회 포스팅 예상 비용: '), Colored('약 $15~30 (GPT-4o 기준)', 'C0392B'),
        ],
        spacing: { after: 100, line: 276 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FEF9E7' },
        indent: { left: 200, right: 200 },
      }),
      BlankLine(),

      H3('3.1.4 장단점'),
      SuccessBox('응답 속도 10~30배 향상 (브라우저 조작 대비)'),
      SuccessBox('UI 변경에 영향 없음 — API 스펙은 안정적'),
      SuccessBox('동시 다수 요청 처리 가능 (병렬 처리)'),
      SuccessBox('에러 처리, 재시도 로직 구현이 명확'),
      WarningBox('API 키 관리 필요 — .env 파일 보안 중요'),
      DangerBox('비용 발생 — 특히 이미지 생성은 건당 과금'),
      DangerBox('GPT-4o 이미지 생성(canvas 기능)은 API 미지원, DALL-E 3만 가능'),
      BlankLine(),

      H2('3.2 Google Gemini API'),

      H3('3.2.1 텍스트 생성 (Gemini 1.5 Flash / Pro)'),
      CodeBlock([
        'import { GoogleGenerativeAI } from "@google/generative-ai"',
        '',
        'const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)',
        'const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })',
        '',
        'const result = await model.generateContent(prompt)',
        'const text = result.response.text()',
      ]),
      BlankLine(),

      H3('3.2.2 이미지 생성 (Imagen 3)'),
      CodeBlock([
        '// Gemini Imagen API (Vertex AI 경유)',
        'const { PredictionServiceClient } = require("@google-cloud/aiplatform")',
        '',
        '// 또는 직접 REST API',
        'POST https://us-central1-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/us-central1/',
        '     publishers/google/models/imagegeneration@006:predict',
        '{',
        '  "instances": [{ "prompt": imagePrompt }],',
        '  "parameters": { "sampleCount": 1, "aspectRatio": "1:1" }',
        '}',
      ]),
      BlankLine(),

      H3('3.2.3 Gemini API 비용 분석'),
      new Paragraph({
        children: [
          Bold('Gemini 1.5 Flash: '), Normal('입력 $0.075/1M tokens (무료 티어: 15 req/min)\n'),
          Bold('Gemini 1.5 Pro: '), Normal('입력 $1.25/1M tokens (무료 티어: 2 req/min)\n'),
          Bold('Gemini 2.0 Flash: '), Normal('무료 티어 제공 (실험적)\n'),
          Bold('Imagen 3: '), Normal('$0.03/장 (Vertex AI 경유, GCP 프로젝트 필요)\n'),
          Bold('월 100회 포스팅 예상 비용: '), Colored('Flash 기준 약 $5~15', '1A5276'),
        ],
        spacing: { after: 100, line: 276 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EBF3FB' },
        indent: { left: 200, right: 200 },
      }),
      BlankLine(),
      SuccessBox('Gemini 1.5 Flash 무료 티어: 하루 1,500 req 무료 (소규모 운영 시 비용 $0)'),
      WarningBox('Imagen 이미지 생성은 Vertex AI 설정 필요 — GCP 프로젝트, 빌링 계정'),
      DangerBox('한국어 품질: GPT-4o 대비 약간 낮을 수 있음 (모델에 따라 다름)'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 4. 방식 B: 네이버 공식 API
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('4. 방식 B — 네이버 공식 API'),

      InfoBox('핵심 개념', '네이버가 공식 제공하는 Open API와 CLOVA AI 서비스 활용'),
      BlankLine(),

      H2('4.1 네이버 블로그 API (Open API)'),
      P('네이버 개발자 센터(developers.naver.com)에서 제공하는 블로그 검색 API입니다.'),
      BlankLine(),

      WarningBox('중요: 네이버 블로그 포스팅(글쓰기) API는 2023년 기준 비공개 — 검색 전용만 공식 제공'),
      BlankLine(),

      new Paragraph({
        children: [
          Bold('제공 API: '), Normal('블로그 검색 (GET /v1/search/blog.json) — 읽기 전용\n'),
          Bold('미제공: '), Colored('글 작성, 수정, 삭제, 이미지 업로드 API — 공식 미지원', 'C0392B'),
        ],
        spacing: { after: 100, line: 276 },
        indent: { left: 200 },
      }),
      BlankLine(),

      H2('4.2 네이버 CLOVA Studio API'),
      P('네이버 AI 플랫폼으로 한국어 특화 LLM(HyperCLOVA X)을 제공합니다.'),
      BlankLine(),

      CodeBlock([
        '// CLOVA Studio 텍스트 생성',
        'POST https://clovastudio.stream.ntruss.com/testapp/v1/chat-completions/HCX-003',
        'Headers: {',
        '  "X-NCP-CLOVASTUDIO-API-KEY": CLOVA_API_KEY,',
        '  "X-NCP-APIGW-API-KEY": APIGW_API_KEY,',
        '  "X-NCP-CLOVASTUDIO-REQUEST-ID": requestId',
        '}',
        'Body: {',
        '  "messages": [{ "role": "user", "content": prompt }],',
        '  "maxTokens": 4096',
        '}',
      ]),
      BlankLine(),

      H3('4.2.1 CLOVA 비용'),
      new Paragraph({
        children: [
          Bold('HyperCLOVA X: '), Normal('기업 고객 별도 계약 (개인 사용 어려움)\n'),
          Bold('CLOVA Studio 체험판: '), Normal('제한된 무료 크레딧 제공\n'),
          Bold('이미지 생성: '), Colored('CLOVA AI API에서 이미지 생성 미지원', 'C0392B'),
        ],
        spacing: { after: 100, line: 276 },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'FEF9E7' },
        indent: { left: 200, right: 200 },
      }),
      BlankLine(),

      SuccessBox('한국어 최적화: 네이버 서비스에 특화된 한국어 이해 및 생성'),
      SuccessBox('네이버 생태계 통합: 네이버 쇼핑, 검색 트렌드 연동 가능성'),
      WarningBox('개인 사용: 접근성 제한, 기업 중심 서비스'),
      DangerBox('블로그 포스팅 API 부재: 글쓰기는 여전히 브라우저 자동화 필요'),
      DangerBox('이미지 생성 불가: 별도 이미지 생성 서비스 조합 필요'),
      BlankLine(),

      H2('4.3 네이버 OAuth 2.0 (로그인 API)'),
      P('네이버 계정으로 로그인하는 OAuth 2.0을 활용하면, 인증 처리를 자동화할 수 있습니다.'),
      BlankLine(),

      CodeBlock([
        '// 1단계: 인증 URL 생성',
        'const authUrl = `https://nid.naver.com/oauth2.0/authorize?',
        '  response_type=code&client_id=${CLIENT_ID}&',
        '  redirect_uri=${REDIRECT_URI}&state=${STATE}`',
        '',
        '// 2단계: 코드로 토큰 발급',
        'POST https://nid.naver.com/oauth2.0/token?grant_type=authorization_code',
        '',
        '// 3단계: 사용자 정보 조회',
        'GET https://openapi.naver.com/v1/nid/me',
        'Authorization: Bearer {ACCESS_TOKEN}',
      ]),
      BlankLine(),
      WarningBox('블로그 글쓰기 scope 없음: OAuth로 로그인해도 블로그 API 없어 포스팅 불가'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 5. 방식 C: 로컬 LLM
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('5. 방식 C — 로컬 LLM (Ollama / LM Studio)'),

      InfoBox('핵심 개념', '인터넷 연결 없이 로컬 PC에서 LLM을 실행하여 텍스트 생성'),
      BlankLine(),

      H2('5.1 Ollama'),
      P('Meta Llama, Mistral, Qwen 등 오픈소스 LLM을 로컬에서 실행하는 도구입니다. OpenAI API와 호환되는 REST API를 제공합니다.'),
      BlankLine(),

      H3('5.1.1 설치 및 사용'),
      CodeBlock([
        '# 설치 (Windows)',
        'winget install Ollama.Ollama',
        '',
        '# 한국어 지원 모델 다운로드',
        'ollama pull qwen2.5:7b          # 알리바바 Qwen 7B (한국어 우수)',
        'ollama pull llama3.1:8b         # Meta Llama 3.1 8B',
        'ollama pull mistral:7b          # Mistral 7B',
        '',
        '# API 호출 (OpenAI 호환 엔드포인트)',
        'const res = await fetch("http://localhost:11434/v1/chat/completions", {',
        '  method: "POST",',
        '  body: JSON.stringify({',
        '    model: "qwen2.5:7b",',
        '    messages: [{ role: "user", content: prompt }]',
        '  })',
        '})',
      ]),
      BlankLine(),

      H3('5.1.2 한국어 성능 비교'),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['모델', '크기', '한국어 품질', 'VRAM 필요', '속도'].map(headerCell) }),
          new TableRow({ children: [cell('qwen2.5:72b'), cell('72B'), cell('★★★★☆'), cell('48GB+'), cell('느림')] }),
          new TableRow({ children: [cell('qwen2.5:14b'), cell('14B'), cell('★★★★☆', { fill: 'F2F9FF' }), cell('10GB+', { fill: 'F2F9FF' }), cell('보통', { fill: 'F2F9FF' })] }),
          new TableRow({ children: [cell('qwen2.5:7b'), cell('7B'), cell('★★★☆☆'), cell('6GB+'), cell('빠름')] }),
          new TableRow({ children: [cell('llama3.1:8b'), cell('8B'), cell('★★★☆☆', { fill: 'F2F9FF' }), cell('6GB+', { fill: 'F2F9FF' }), cell('빠름', { fill: 'F2F9FF' })] }),
          new TableRow({ children: [cell('gemma2:9b'), cell('9B'), cell('★★☆☆☆'), cell('8GB+'), cell('보통')] }),
        ],
      }),
      BlankLine(),

      H2('5.2 LM Studio'),
      P('GUI 기반 로컬 LLM 실행 도구로, Hugging Face의 GGUF 모델을 다운로드하여 실행합니다. Ollama와 동일하게 OpenAI 호환 API를 제공합니다.'),
      BlankLine(),

      H2('5.3 로컬 LLM 이미지 생성'),
      P('로컬에서 이미지를 생성하려면 별도의 Stable Diffusion 서버가 필요합니다.'),
      BlankLine(),

      CodeBlock([
        '// Stable Diffusion WebUI API (AUTOMATIC1111)',
        'POST http://127.0.0.1:7860/sdapi/v1/txt2img',
        '{',
        '  "prompt": imagePrompt,',
        '  "negative_prompt": "low quality, blurry",',
        '  "width": 1024,',
        '  "height": 1024,',
        '  "steps": 20',
        '}',
        '// 응답: base64 인코딩된 이미지',
      ]),
      BlankLine(),

      H3('5.3.1 로컬 이미지 생성 요구사항'),
      Bullet('NVIDIA GPU VRAM 최소 6GB (SD 1.5), 8GB+ (SDXL 권장)'),
      Bullet('저장공간: 모델 파일 2~8GB'),
      Bullet('품질: DALL-E 3 / Imagen 대비 낮음 — 프롬프트 엔지니어링 필요'),
      Bullet('속도: GPU 성능에 따라 10~60초/장'),
      BlankLine(),

      H3('5.3.2 장단점'),
      SuccessBox('비용 $0 — API 호출 비용 없음'),
      SuccessBox('오프라인 동작 가능 — 인터넷 없이 운영'),
      SuccessBox('데이터 프라이버시 — 외부 서버에 콘텐츠 전송 없음'),
      WarningBox('초기 설치 복잡: Ollama + Stable Diffusion 별도 설치 필요'),
      WarningBox('고성능 GPU 필요: 이미지 생성 시 VRAM 6~16GB 권장'),
      DangerBox('한국어 품질: GPT-4o 대비 현저히 낮음 (특히 7B 이하 모델)'),
      DangerBox('이미지 품질: DALL-E 3 / Imagen 대비 낮음'),
      DangerBox('블로그 포스팅: 여전히 브라우저 자동화 필요'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 6. 방식 D: 하이브리드
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('6. 방식 D — 하이브리드 방식 (권장)'),

      InfoBox('핵심 개념', 'API로 콘텐츠 생성 + 최소한의 브라우저 자동화로 포스팅'),
      BlankLine(),

      H2('6.1 아키텍처'),
      P('네이버 블로그 포스팅 API가 없으므로 블로그 글쓰기는 브라우저 자동화가 불가피합니다. 단, 콘텐츠/이미지 생성 부분만 API로 교체하면 안정성이 크게 향상됩니다.'),
      BlankLine(),

      new Paragraph({
        children: [
          Colored('【현재】', '7F8C8D', 20), Normal(' chatgpt.com 브라우저 → ', 20),
          Colored('느림+불안정', 'C0392B', 20), Normal('\n', 20),
          Colored('【개선】', '1A5276', 20), Normal(' OpenAI API 호출 → ', 20),
          Colored('빠름+안정적', '1E8449', 20),
        ],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EBF3FB' },
        spacing: { before: 100, after: 100, line: 260 },
        indent: { left: 200, right: 200 },
      }),
      BlankLine(),

      CodeBlock([
        '// 하이브리드 방식 구현 예시',
        '',
        '// 1단계: API로 블로그 글 생성 (빠름, 안정적)',
        'async function generateContentWithAPI(topic: string): Promise<BlogContent> {',
        '  const res = await fetch("https://api.openai.com/v1/chat/completions", {',
        '    method: "POST",',
        '    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },',
        '    body: JSON.stringify({',
        '      model: "gpt-4o",',
        '      messages: [{ role: "user", content: buildBlogPrompt(topic) }]',
        '    })',
        '  })',
        '  return parseBlogContent(await res.json())',
        '}',
        '',
        '// 2단계: API로 이미지 생성 (빠름, 고품질)',
        'async function generateImageWithAPI(prompt: string, savePath: string) {',
        '  const res = await fetch("https://api.openai.com/v1/images/generations", {',
        '    method: "POST",',
        '    headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}` },',
        '    body: JSON.stringify({ model: "dall-e-3", prompt, n: 1, size: "1024x1024" })',
        '  })',
        '  const { url } = (await res.json()).data[0]',
        '  // URL에서 이미지 다운로드',
        '  const imgRes = await fetch(url)',
        '  fs.writeFileSync(savePath, Buffer.from(await imgRes.arrayBuffer()))',
        '}',
        '',
        '// 3단계: 브라우저 자동화로 네이버 블로그 포스팅 (유지)',
        'await editor.createInterleavedPost(postData)',
      ]),
      BlankLine(),

      H2('6.2 하이브리드 방식 환경 설정'),
      CodeBlock([
        '# .env 파일 추가 항목',
        'OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx',
        'GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx',
        '',
        '# 선택: 기본 제공자 설정',
        'CONTENT_PROVIDER=openai   # openai | gemini | local',
        'IMAGE_PROVIDER=openai     # openai | gemini | local',
      ]),
      BlankLine(),

      H2('6.3 장단점'),
      SuccessBox('속도 10~30배 향상: 글 생성 30~120초 → 2~5초'),
      SuccessBox('안정성 대폭 향상: UI 변경에 영향 없음'),
      SuccessBox('병렬 처리: 여러 포스팅 동시 진행 가능'),
      SuccessBox('Chrome 디버그 프로필 불필요: ChatGPT/Gemini 로그인 유지 필요 없음'),
      WarningBox('월 비용 발생: $5~30 (사용량에 따라 다름)'),
      WarningBox('API 키 관리 필요'),
      DangerBox('네이버 블로그 포스팅은 여전히 브라우저 자동화 필요'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 7. 방식 E: MCP 기반
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('7. 방식 E — MCP (Model Context Protocol) 기반'),

      InfoBox('핵심 개념', 'Claude 등 AI 에이전트가 MCP 서버를 통해 외부 서비스를 직접 조작'),
      BlankLine(),

      H2('7.1 MCP 개요'),
      P('MCP(Model Context Protocol)는 Anthropic이 2024년 발표한 프로토콜로, AI 모델이 외부 도구/서비스를 표준화된 방식으로 사용할 수 있게 합니다. Claude Code와 같은 AI 에이전트가 직접 API를 호출하거나 브라우저를 제어할 수 있습니다.'),
      BlankLine(),

      H3('7.1.1 MCP 기반 자동화 아키텍처'),
      CodeBlock([
        '// MCP 서버 구성 (claude_desktop_config.json)',
        '{',
        '  "mcpServers": {',
        '    "naver-blog": {',
        '      "command": "npx",',
        '      "args": ["@your/naver-blog-mcp"],',
        '      "env": { "BLOG_ID": "recensione" }',
        '    },',
        '    "openai": {',
        '      "command": "npx",',
        '      "args": ["@openai/mcp-server"]',
        '    }',
        '  }',
        '}',
        '',
        '// Claude가 자동으로 블로그 포스팅',
        '// "벚꽃 명소 BEST3 블로그 글 작성하고 네이버 블로그에 올려줘"',
        '// → Claude가 GPT API 호출 + 블로그 포스팅 자동 처리',
      ]),
      BlankLine(),

      SuccessBox('AI 에이전트가 전체 워크플로우를 자율적으로 처리'),
      SuccessBox('자연어 명령으로 복잡한 자동화 실행 가능'),
      WarningBox('MCP 서버 개발 필요 — 네이버 블로그용 MCP 서버 직접 구현'),
      WarningBox('현재 성숙도: 2024~2025년 초기 생태계, 레퍼런스 부족'),
      DangerBox('네이버 블로그 포스팅: 공식 API 없어 MCP도 결국 브라우저 자동화 래핑 필요'),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 8. 비용 상세 분석
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('8. API 비용 상세 분석 (2025년 기준)'),
      BlankLine(),
      makeCostTable(),
      BlankLine(),

      H2('8.1 시나리오별 월 비용 계산'),
      P('기준: 포스팅 1회당 글 1편(약 1,500 토큰 입력/출력) + 이미지 3장'),
      BlankLine(),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['시나리오', '월 10회', '월 50회', '월 100회', '추천 여부'].map(headerCell) }),
          new TableRow({ children: [cell('브라우저 자동화 (현재)'), cell('$0'), cell('$0'), cell('$0'), cell('✅ 소규모')] }),
          new TableRow({ children: [cell('GPT-4o-mini + DALL-E 3'), cell('~$1'), cell('~$5'), cell('~$10'), cell('✅ 추천')] }),
          new TableRow({ children: [cell('GPT-4o + DALL-E 3'), cell('~$3'), cell('~$15'), cell('~$30'), cell('⚠️ 대규모')] }),
          new TableRow({ children: [cell('Gemini Flash + Imagen'), cell('~$0'), cell('~$2'), cell('~$5'), cell('✅ 추천')] }),
          new TableRow({ children: [cell('로컬 LLM (Ollama)'), cell('$0'), cell('$0'), cell('$0'), cell('⚠️ 품질 한계')] }),
          new TableRow({ children: [cell('하이브리드 (GPT-4o-mini)'), cell('~$1'), cell('~$5'), cell('~$10'), cell('✅ 최적')] }),
        ],
      }),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 9. 현재 프로젝트에 적용 방안
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('9. 현재 프로젝트 적용 권장 방안'),

      H2('9.1 단계별 마이그레이션 계획'),
      BlankLine(),

      H3('Phase 1: 즉시 적용 가능 (하이브리드 방식)'),
      InfoBox('예상 공수', '2~4시간 / 비용 절감 효과: 운영 안정성 대폭 향상'),
      BlankLine(),

      Bullet('1-1. .env에 OPENAI_API_KEY 또는 GEMINI_API_KEY 추가'),
      Bullet('1-2. src/server.ts의 generate-content API에 조건부 분기 추가'),
      SubBullet('provider=chatgpt → 기존 브라우저 자동화 유지'),
      SubBullet('provider=openai-api → OpenAI API 직접 호출 (신규)'),
      SubBullet('provider=gemini-api → Gemini API 직접 호출 (신규)'),
      Bullet('1-3. 이미지 생성도 동일하게 분기 처리'),
      Bullet('1-4. GUI에 "API 방식" 선택 옵션 추가'),
      BlankLine(),

      H3('Phase 2: 선택적 개선'),
      Bullet('2-1. Gemini 1.5 Flash API 무료 티어 활용 → 비용 $0 유지하면서 안정성 향상'),
      Bullet('2-2. GPT-4o-mini로 초안 생성 → 비용 최소화'),
      Bullet('2-3. 이미지가 필요없는 포스팅은 API만 사용'),
      BlankLine(),

      H3('Phase 3: 장기 계획'),
      Bullet('3-1. 네이버 블로그 포스팅 API 공식화 여부 모니터링'),
      Bullet('3-2. Playwright MCP 서버 도입으로 코드 없이 자동화 실행'),
      Bullet('3-3. 로컬 LLM(Qwen2.5) 활용한 완전 무료 파이프라인 구성'),
      BlankLine(),

      H2('9.2 최종 권장 구성'),
      new Paragraph({
        children: [
          Bold('콘텐츠 생성: ', 24), Colored('Gemini 1.5 Flash API (무료 티어)', '1A5276', 22), Normal(' 또는 GPT-4o-mini\n', 22),
          Bold('이미지 생성: ', 24), Colored('DALL-E 3 API', '145A32', 22), Normal(' (건당 $0.04, 월 100장 = $4)\n', 22),
          Bold('블로그 포스팅: ', 24), Normal('기존 Playwright 브라우저 자동화 유지\n', 22),
          Bold('예상 월 비용: ', 24), Colored('$0~5 (Gemini Flash 무료티어 + DALL-E 3만 과금)', 'C0392B', 22),
        ],
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: 'EAFAF1' },
        spacing: { before: 150, after: 150, line: 320 },
        indent: { left: 300, right: 300 },
        border: { left: { color: '1E8449', size: 12, style: BorderStyle.SINGLE } },
      }),
      BlankLine(),

      // ══════════════════════════════════════════════
      // 10. 결론
      // ══════════════════════════════════════════════
      new Paragraph({ children: [new PageBreak()] }),
      H1('10. 결론'),
      BlankLine(),

      P('네이버 블로그 자동화 시스템의 핵심 제약은 네이버 블로그 포스팅 공식 API의 부재입니다. 이로 인해 글쓰기 부분은 브라우저 자동화를 완전히 대체할 수 없습니다. 그러나 콘텐츠와 이미지 생성 부분은 REST API로 교체 시 안정성과 속도를 크게 개선할 수 있습니다.'),
      BlankLine(),

      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ['기능', '현재', '권장 (단기)', '권장 (장기)'].map(headerCell) }),
          new TableRow({ children: [cell('블로그 글 생성'), cell('브라우저 자동화'), cell('Gemini API (무료)'), cell('GPT-4o API')] }),
          new TableRow({ children: [cell('이미지 생성'), cell('브라우저 자동화'), cell('DALL-E 3 API'), cell('Imagen 3 API')] }),
          new TableRow({ children: [cell('블로그 포스팅'), cell('브라우저 자동화'), cell('브라우저 자동화 유지'), cell('브라우저 자동화 유지')] }),
          new TableRow({ children: [cell('월 비용'), cell('$0'), cell('$0~5'), cell('$5~15')] }),
          new TableRow({ children: [cell('안정성'), cell('낮음'), cell('높음'), cell('매우 높음')] }),
        ],
      }),
      BlankLine(),

      InfoBox('최종 권장', 'Phase 1 하이브리드 적용: Gemini 1.5 Flash API(무료) + DALL-E 3 API + Playwright 포스팅'),
      BlankLine(),

      new Paragraph({
        children: [
          new TextRun({ text: '본 레포트는 2026년 2월 기준으로 작성되었습니다. API 가격 및 정책은 변경될 수 있습니다.', size: 18, color: '95A5A6', italics: true }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
      }),
    ],
  }],
});

// ─── 저장 ─────────────────────────────────────────────────────

const buffer = await Packer.toBuffer(doc);
fs.writeFileSync(OUTPUT_PATH, buffer);
console.log(`✅ 레포트 생성 완료: ${OUTPUT_PATH}`);
