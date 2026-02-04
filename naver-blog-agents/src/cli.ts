#!/usr/bin/env node

/**
 * 네이버 블로그 콘텐츠 생성 CLI
 */

import { Command } from 'commander';
import { config } from 'dotenv';
import { mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import type { ContentRequest, ContentType, FinalContent } from './types/index.js';
import { generateBlogContent, type OrchestratorOptions } from './workflow/index.js';
import type { ImageCollectionStageOptions } from './workflow/stages/image-collection.js';
import { getOutputPath } from './utils/config.js';
import { createLogger } from './utils/logger.js';
import { serializeJSON } from './formatters/json.js';
import { searchAptByName, isCheongyakDbAvailable, type CheongyakData } from './services/cheongyak-db.js';
import { crawlHomepage, mergeWithHomepageInfo } from './services/homepage-crawler.js';

// 환경 변수 로드
config();

const logger = createLogger('CLI');

// 색상 코드 (chalk 대신 직접 사용)
const colors = {
  green: (text: string) => `\x1b[32m${text}\x1b[0m`,
  red: (text: string) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
};

/**
 * 메인 CLI 프로그램
 */
const program = new Command();

program
  .name('geulto')
  .description('글또 - 네이버 블로그 콘텐츠 자동 생성 AI 에이전트 팀')
  .version('1.0.0');

/**
 * generate 명령어
 */
program
  .command('generate')
  .description('블로그 콘텐츠 생성')
  .requiredOption('-t, --topic <topic>', '콘텐츠 주제')
  .requiredOption(
    '-T, --type <type>',
    '콘텐츠 유형 (info, marketing, review, food, travel, tech, lifestyle, parenting)',
    'info'
  )
  .option('-k, --keywords <keywords>', '키워드 (쉼표로 구분)')
  .option('-a, --audience <audience>', '타겟 독자층')
  .option('--tone <tone>', '톤 (formal, casual, friendly)', 'friendly')
  .option('-c, --context <context>', '추가 컨텍스트')
  .option('-d, --data <file>', '참조 데이터 JSON 파일 (팩트체크용)')
  .option('--apt <name>', '청약홈 DB에서 아파트명으로 검색하여 참조 데이터 자동 로드')
  .option('--crawl', '분양 홈페이지 크롤링하여 추가 정보 수집 (--apt와 함께 사용)')
  .option('-o, --output <dir>', '출력 디렉토리')
  .option('--timeout <ms>', '타임아웃 (밀리초)', '600000')
  .option('--verbose', '상세 로그 출력')
  .option('--with-images', '이미지 자동 수집 (기본: 활성화)', true)
  .option('--no-images', '이미지 수집 비활성화')
  .option('--image-source <sources>', '이미지 소스 (google,stock,ai 쉼표 구분)', 'google,stock,ai')
  .option('--max-images <count>', '최대 이미지 수', '10')
  .action(async (options) => {
    console.log(colors.bold('\n🚀 글또가 콘텐츠 생성을 시작합니다\n'));

    // 콘텐츠 유형 검증
    const validTypes: ContentType[] = ['info', 'marketing', 'review', 'food', 'travel', 'tech', 'lifestyle', 'parenting'];
    if (!validTypes.includes(options.type as ContentType)) {
      console.error(
        colors.red(
          `❌ 유효하지 않은 콘텐츠 유형: ${options.type}\n   사용 가능: ${validTypes.join(', ')}`
        )
      );
      process.exit(1);
    }

    // 참조 데이터 로드
    let referenceData: Record<string, unknown> | undefined;

    // 1. 청약홈 DB에서 아파트 검색 (--apt 옵션)
    if (options.apt) {
      if (!isCheongyakDbAvailable()) {
        console.error(colors.red('❌ 청약홈 DB를 찾을 수 없습니다.'));
        console.error(colors.dim('   D:\\AI프로그램제작\\cheongyak-spsply\\public\\cheongyak.db 경로를 확인하세요.'));
        process.exit(1);
      }

      console.log(colors.cyan(`🔍 청약홈 DB에서 검색 중: "${options.apt}"`));
      const cheongyakData = searchAptByName(options.apt);

      if (cheongyakData) {
        referenceData = cheongyakData as unknown as Record<string, unknown>;
        console.log(colors.green(`✅ 청약홈 DB 검색 완료: ${cheongyakData.기본정보.아파트명}`));
        console.log(colors.dim(`   공고번호: ${cheongyakData.수집정보.공고번호}`));
        console.log(colors.dim(`   총세대수: ${cheongyakData.기본정보.총세대수}세대`));
        console.log(colors.dim(`   평형정보: ${cheongyakData.평형정보.length}개 타입`));

        // 홈페이지 크롤링 (--crawl 옵션)
        if (options.crawl) {
          const homepageUrl = cheongyakData.출처?.find(s => s.출처명 === '분양 홈페이지')?.URL;
          if (homepageUrl) {
            console.log(colors.cyan(`🌐 분양 홈페이지 크롤링 중: ${homepageUrl}`));
            try {
              const homepageInfo = await crawlHomepage(homepageUrl);
              if (homepageInfo) {
                referenceData = mergeWithHomepageInfo(referenceData, homepageInfo);
                console.log(colors.green(`✅ 홈페이지 정보 수집 완료`));
                console.log(colors.dim(`   공식 브랜드명: ${homepageInfo.브랜드명.한글} (${homepageInfo.브랜드명.영문})`));
                console.log(colors.dim(`   주요 특징: ${homepageInfo.주요특징.slice(0, 3).join(', ')}`));
              } else {
                console.log(colors.yellow(`⚠️ 홈페이지 정보 추출 실패 (청약홈 데이터만 사용)`));
              }
            } catch (err) {
              console.log(colors.yellow(`⚠️ 홈페이지 크롤링 오류: ${err instanceof Error ? err.message : String(err)}`));
            }
          } else {
            console.log(colors.yellow(`⚠️ 분양 홈페이지 URL이 없습니다 (청약홈 데이터만 사용)`));
          }
        }
      } else {
        console.error(colors.yellow(`⚠️ 청약홈 DB에서 "${options.apt}" 검색 결과가 없습니다.`));
        console.log(colors.dim('   --data 옵션으로 별도의 참조 데이터를 제공하거나, 검색어를 수정해 보세요.'));
      }
    }

    // 2. JSON 파일에서 참조 데이터 로드 (--data 옵션)
    if (options.data) {
      try {
        const dataContent = await readFile(options.data, 'utf-8');
        const fileData = JSON.parse(dataContent);
        // 기존 데이터가 있으면 병합, 없으면 새로 설정
        if (referenceData) {
          referenceData = { ...referenceData, ...fileData };
          console.log(colors.green(`✅ 추가 참조 데이터 병합: ${options.data}`));
        } else {
          referenceData = fileData;
          console.log(colors.green(`✅ 참조 데이터 로드: ${options.data}`));
        }
      } catch (err) {
        console.error(colors.red(`❌ 참조 데이터 로드 실패: ${options.data}`));
        console.error(colors.dim(`   ${err instanceof Error ? err.message : String(err)}`));
        process.exit(1);
      }
    }

    // 요청 구성
    const request: ContentRequest = {
      topic: options.topic,
      type: options.type as ContentType,
      keywords: options.keywords?.split(',').map((k: string) => k.trim()),
      targetAudience: options.audience,
      tone: options.tone as ContentRequest['tone'],
      additionalContext: options.context,
      referenceData,
    };

    console.log(colors.cyan('📋 요청 정보:'));
    console.log(`   주제: ${colors.bold(request.topic)}`);
    console.log(`   유형: ${request.type}`);
    if (request.keywords) {
      console.log(`   키워드: ${request.keywords.join(', ')}`);
    }
    if (request.targetAudience) {
      console.log(`   타겟: ${request.targetAudience}`);
    }
    if (options.withImages) {
      console.log(`   이미지: ${colors.green('활성화')} (소스: ${options.imageSource})`);
    }
    console.log('');

    // 출력 디렉토리 결정
    const outputDir = options.output || getOutputPath(request.topic);

    // 이미지 옵션 구성
    const imageOptions: ImageCollectionStageOptions = {
      withImages: !!options.withImages,
      imageSources: options.imageSource?.split(',').map((s: string) => s.trim()) as ('google' | 'stock' | 'ai')[],
      maxImages: parseInt(options.maxImages, 10),
      outputDir,  // 이미지 출력 디렉토리 전달
    };

    // 오케스트레이터 옵션
    const orchestratorOptions: OrchestratorOptions = {
      totalTimeout: parseInt(options.timeout, 10),
      imageOptions,
      onEvent: (event) => {
        if (options.verbose) {
          console.log(colors.dim(`   [${event.type}]`));
        }
      },
    };

    try {
      // 콘텐츠 생성
      const startTime = Date.now();
      const result = await generateBlogContent(request, orchestratorOptions);
      const elapsed = Date.now() - startTime;

      if (!result.success || !result.content) {
        console.error(colors.red('\n❌ 콘텐츠 생성 실패'));
        if (result.errors.length > 0) {
          console.error(colors.red('   오류 목록:'));
          for (const error of result.errors) {
            console.error(colors.red(`   - [${error.stage}] ${error.message}`));
          }
        }
        process.exit(1);
      }

      console.log(colors.green('\n✅ 콘텐츠 생성 완료!'));
      console.log(colors.dim(`   소요 시간: ${(elapsed / 1000).toFixed(2)}초`));

      // 결과 저장
      await saveOutput(outputDir, result.content);

      console.log(colors.cyan(`\n📁 저장 위치: ${outputDir}`));
      console.log('   - content.html (네이버 스마트에디터용)');
      console.log('   - content.md (마크다운)');
      console.log('   - content.json (JSON 구조)');
      console.log('   - metadata.json (메타데이터)');
      if (options.withImages) {
        console.log('   - images/ (수집된 이미지)');
        console.log('   - image_map.json (이미지 배치 정보)');
      }

      // 요약 출력
      console.log(colors.cyan('\n📊 콘텐츠 요약:'));
      console.log(`   제목: ${colors.bold(result.content.title)}`);
      console.log(`   SEO 점수: ${result.content.metadata.seoScore}/100`);
      console.log(`   글자 수: ${result.content.metadata.wordCount}자`);
      console.log(`   예상 읽기 시간: ${result.content.metadata.readingTime}분`);
      console.log(`   태그: ${result.content.tags.slice(0, 5).join(', ')}...`);
      console.log('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(colors.red(`\n❌ 오류 발생: ${errorMessage}`));
      if (options.verbose && error instanceof Error && error.stack) {
        console.error(colors.dim(error.stack));
      }
      process.exit(1);
    }
  });

/**
 * 결과 저장
 */
async function saveOutput(outputDir: string, content: FinalContent): Promise<void> {
  // 디렉토리 생성
  await mkdir(outputDir, { recursive: true });

  // HTML 저장
  await writeFile(
    join(outputDir, 'content.html'),
    content.formats.naverHtml,
    'utf-8'
  );

  // 마크다운 저장
  await writeFile(
    join(outputDir, 'content.md'),
    content.formats.markdown,
    'utf-8'
  );

  // JSON 저장
  await writeFile(
    join(outputDir, 'content.json'),
    serializeJSON(content.formats.json),
    'utf-8'
  );

  // 메타데이터 저장
  const metadata = {
    title: content.title,
    seoTitle: content.seoTitle,
    metaDescription: content.metaDescription,
    tags: content.tags,
    metadata: {
      ...content.metadata,
      createdAt: content.metadata.createdAt.toISOString(),
    },
  };
  await writeFile(
    join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf-8'
  );
}

/**
 * team 명령어 - 팀 정보 출력
 */
program
  .command('team')
  .description('에이전트 팀 정보 출력')
  .action(() => {
    console.log(colors.bold('\n🎭 글또 (Geulto) - 네이버 블로그 AI 에이전트 팀\n'));

    const team = [
      {
        emoji: '📋',
        name: '민준 팀장',
        role: '기획자',
        age: 38,
        description: '차분하고 전략적인 베테랑 기획자',
      },
      {
        emoji: '🔍',
        name: '수빈',
        role: '리서처',
        age: 29,
        description: '꼼꼼한 팩트체커, 정보 수집의 달인',
      },
      {
        emoji: '📚',
        name: '현우 선생님',
        role: '정보성 작가',
        age: 45,
        description: '쉬운 설명의 달인, 교육적 접근',
      },
      {
        emoji: '✨',
        name: '지은 언니',
        role: '마케팅 작가',
        age: 33,
        description: '감성 스토리텔러, 트렌드 민감',
      },
      {
        emoji: '⭐',
        name: '태현',
        role: '제품리뷰 작가',
        age: 27,
        description: '솔직한 장단점 분석, 실용주의',
      },
      {
        emoji: '🍽️',
        name: '하린',
        role: '맛집리뷰 작가',
        age: 31,
        description: '오감 묘사 전문, 감성적 표현',
      },
      {
        emoji: '✏️',
        name: '서연 실장',
        role: '편집자',
        age: 40,
        description: '완벽주의자, 디테일의 여왕',
      },
      {
        emoji: '🎯',
        name: '준서',
        role: 'SEO 전문가',
        age: 35,
        description: '데이터 기반 사고, 키워드 마스터',
      },
      {
        emoji: '✈️',
        name: '유진',
        role: '여행 작가',
        age: 32,
        description: '감성 여행 블로거, 사진 중심 스토리텔링',
      },
      {
        emoji: '💻',
        name: '민석',
        role: '테크 작가',
        age: 35,
        description: 'IT 전문가, 스펙 비교의 달인',
      },
      {
        emoji: '🌸',
        name: '수아',
        role: '라이프스타일 작가',
        age: 28,
        description: '트렌디한 감성, 친근한 언니 같은 스타일',
      },
      {
        emoji: '👶',
        name: '예원맘',
        role: '육아 작가',
        age: 38,
        description: '경험 기반 육아 노하우, 따뜻한 조언',
      },
    ];

    for (const member of team) {
      console.log(
        `${member.emoji} ${colors.bold(member.name)} (${member.age}세) - ${colors.cyan(member.role)}`
      );
      console.log(`   ${colors.dim(member.description)}`);
      console.log('');
    }
  });

/**
 * types 명령어 - 콘텐츠 유형 정보
 */
program
  .command('types')
  .description('콘텐츠 유형 정보 출력')
  .action(() => {
    console.log(colors.bold('\n📝 콘텐츠 유형 안내\n'));

    const types = [
      {
        type: 'info',
        name: '정보성',
        writer: '현우 선생님',
        description: 'How-to, 가이드, 설명 콘텐츠',
        examples: ['~하는 방법', '~완벽 가이드', '~총정리'],
      },
      {
        type: 'marketing',
        name: '마케팅',
        writer: '지은 언니',
        description: '브랜드 콘텐츠, 협찬, 프로모션',
        examples: ['협찬 리뷰', '이벤트 소개', '브랜드 스토리'],
      },
      {
        type: 'review',
        name: '제품리뷰',
        writer: '태현',
        description: 'IT, 가전, 서비스 리뷰',
        examples: ['~솔직 후기', '~비교 분석', '~추천'],
      },
      {
        type: 'food',
        name: '맛집리뷰',
        writer: '하린',
        description: '맛집, 카페, 음식 리뷰',
        examples: ['맛집 추천', '카페 후기', '~먹방'],
      },
      {
        type: 'travel',
        name: '여행',
        writer: '유진',
        description: '국내/해외 여행 후기, 코스 추천',
        examples: ['여행 코스', '숙소 추천', '~여행기'],
      },
      {
        type: 'tech',
        name: '테크/IT',
        writer: '민석',
        description: 'IT, 전자기기, 앱/서비스 리뷰',
        examples: ['스펙 비교', '사용 후기', '~추천'],
      },
      {
        type: 'lifestyle',
        name: '라이프스타일',
        writer: '수아',
        description: '일상, 인테리어, 취미, 자기계발',
        examples: ['일상 브이로그', '인테리어 꿀팁', '~루틴'],
      },
      {
        type: 'parenting',
        name: '육아',
        writer: '예원맘',
        description: '육아 정보, 아이템 추천, 경험담',
        examples: ['육아템 추천', '아이 성장기', '~노하우'],
      },
    ];

    for (const t of types) {
      console.log(
        `${colors.bold(t.name)} (${colors.cyan(t.type)}) - 담당: ${t.writer}`
      );
      console.log(`   ${t.description}`);
      console.log(`   예시: ${colors.dim(t.examples.join(', '))}`);
      console.log('');
    }
  });

// 프로그램 실행
program.parse(process.argv);

// 인자가 없으면 도움말 출력
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
