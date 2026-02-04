#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Threads AI 관련 게시글 크롤러
주의: Threads는 로그인이 필요한 플랫폼이므로, 공개 API나 브라우저 자동화가 필요합니다.
이 스크립트는 데모 목적으로 샘플 데이터를 생성합니다.
"""

import json
from datetime import datetime, timedelta
import random

def generate_sample_ai_posts():
    """AI 관련 샘플 게시글 생성"""

    # 샘플 게시글 템플릿
    sample_posts = [
        {
            "content": "ChatGPT의 새로운 업데이트가 정말 인상적이네요. 응답 속도가 훨씬 빨라졌고, 한국어 이해도도 크게 향상된 것 같습니다. #AI #ChatGPT #인공지능",
            "author": "tech_enthusiast_kr",
            "author_name": "테크 애호가",
            "language": "ko"
        },
        {
            "content": "Claude 3.5 Sonnet is absolutely amazing for coding tasks. The code quality and understanding of context is on another level. Highly recommend for developers! #Claude #AI #Coding",
            "author": "dev_masters",
            "author_name": "Dev Masters",
            "language": "en"
        },
        {
            "content": "머신러닝 모델 학습 중인데, 오버피팅 문제로 고민이에요. 데이터 증강 기법 적용해봐야겠습니다. #머신러닝 #딥러닝 #AI",
            "author": "ml_researcher",
            "author_name": "ML 연구원",
            "language": "ko"
        },
        {
            "content": "Just attended an amazing webinar on LLM applications in healthcare. The potential is enormous! #LLM #AI #Healthcare #MachineLearning",
            "author": "ai_in_health",
            "author_name": "AI in Healthcare",
            "language": "en"
        },
        {
            "content": "OpenAI의 GPT-4 Vision으로 이미지 분석 프로젝트 진행 중. 정확도가 놀라워요! 다음 주에 결과 공유하겠습니다. #OpenAI #GPT4 #AI #ComputerVision",
            "author": "vision_ai_lab",
            "author_name": "Vision AI Lab",
            "language": "ko"
        },
        {
            "content": "생성형 AI가 콘텐츠 제작 산업을 어떻게 변화시킬지 정말 궁금합니다. 창작자들의 역할은 더욱 중요해질 것 같아요. #생성형AI #AI #콘텐츠제작",
            "author": "content_creator_ai",
            "author_name": "AI 크리에이터",
            "language": "ko"
        },
        {
            "content": "Comparing different AI models: GPT-4, Claude, and Gemini. Each has its strengths. Claude excels at nuanced conversations, GPT-4 at breadth, Gemini at multimodal tasks. #AI #LLM #Comparison",
            "author": "ai_analyst",
            "author_name": "AI Analyst",
            "language": "en"
        },
        {
            "content": "딥러닝 공부 시작한 지 3개월 됐는데, 드디어 첫 번째 프로젝트 완성! 감정 분석 모델 만들었어요. #딥러닝 #AI #머신러닝 #프로젝트",
            "author": "ai_beginner_2024",
            "author_name": "AI 입문자",
            "language": "ko"
        },
        {
            "content": "Microsoft Copilot integration with Office 365 is a game changer for productivity. AI assistants are becoming essential tools. #Copilot #AI #Productivity #Microsoft",
            "author": "productivity_pro",
            "author_name": "Productivity Pro",
            "language": "en"
        },
        {
            "content": "AI 에이전트 개발 트렌드를 보면 정말 미래가 가까워진 느낌이에요. 자율적으로 작업을 수행하는 AI, 정말 신기합니다. #AIAgent #AI #인공지능 #미래기술",
            "author": "future_tech_kr",
            "author_name": "퓨처테크",
            "language": "ko"
        },
        {
            "content": "Anthropic's Claude is my go-to AI for research and writing. The way it maintains context and provides thoughtful responses is unmatched. #Anthropic #Claude #AI #Research",
            "author": "research_writer",
            "author_name": "Research Writer",
            "language": "en"
        },
        {
            "content": "LLM 파인튜닝 첫 시도! 생각보다 어렵지만 재미있네요. 도메인 특화 모델 만드는 과정이 흥미롭습니다. #LLM #AI #파인튜닝 #머신러닝",
            "author": "ml_engineer_kr",
            "author_name": "ML 엔지니어",
            "language": "ko"
        },
        {
            "content": "The ethics of AI development is something we need to discuss more. How do we ensure AI benefits everyone? #AIEthics #AI #Technology #Society",
            "author": "ai_ethics_forum",
            "author_name": "AI Ethics Forum",
            "language": "en"
        },
        {
            "content": "ChatGPT로 업무 효율이 2배는 늘어난 것 같아요. 이메일 작성, 아이디어 브레인스토밍, 코드 리뷰까지 다 도움받고 있습니다. #ChatGPT #AI #생산성",
            "author": "work_smarter",
            "author_name": "스마트워커",
            "language": "ko"
        },
        {
            "content": "Google's Gemini Pro is showing impressive results in multi-modal tasks. Excited to see where this technology goes! #Gemini #Google #AI #MultiModal",
            "author": "google_ai_fan",
            "author_name": "Google AI Fan",
            "language": "en"
        },
        {
            "content": "AI 기술이 교육 현장을 어떻게 바꿀 수 있을까요? 개인화된 학습이 가능해지는 미래가 기대됩니다. #AI교육 #에듀테크 #AI #교육",
            "author": "edu_innovator",
            "author_name": "교육 혁신가",
            "language": "ko"
        },
        {
            "content": "Building AI agents with LangChain and AutoGPT. The possibilities for automation are endless! #AIAgent #LangChain #AutoGPT #AI #Automation",
            "author": "agent_builder",
            "author_name": "Agent Builder",
            "language": "en"
        },
        {
            "content": "GPT-4의 코드 생성 능력이 정말 대단해요. 복잡한 알고리즘도 설명과 함께 깔끔하게 작성해줍니다. #GPT4 #AI #코딩 #개발",
            "author": "code_with_ai",
            "author_name": "AI와 코딩",
            "language": "ko"
        },
        {
            "content": "Machine learning model deployment in production - lessons learned from 6 months of running AI services at scale. Thread incoming! #MachineLearning #AI #MLOps #Production",
            "author": "mlops_expert",
            "author_name": "MLOps Expert",
            "language": "en"
        },
        {
            "content": "인공지능 시대에 필요한 역량은 무엇일까? 프롬프트 엔지니어링, 데이터 리터러시, 창의적 사고 등이 중요해질 것 같습니다. #AI #인공지능 #미래역량 #교육",
            "author": "future_skills",
            "author_name": "미래역량연구소",
            "language": "ko"
        }
    ]

    posts = []
    now = datetime.now()

    for idx, template in enumerate(sample_posts):
        # 최근 24시간 내 랜덤 시간 생성
        hours_ago = random.uniform(0, 24)
        timestamp = now - timedelta(hours=hours_ago)

        post = {
            "content": template["content"],
            "author": template["author"],
            "author_name": template["author_name"],
            "timestamp": timestamp.isoformat(),
            "likes": random.randint(5, 500),
            "comments": random.randint(0, 50),
            "reposts": random.randint(0, 30),
            "hashtags": [tag for tag in template["content"].split() if tag.startswith('#')],
            "url": f"https://www.threads.net/@{template['author']}/post/{random.randint(1000000, 9999999)}",
            "language": template["language"]
        }
        posts.append(post)

    # 시간순 정렬 (최신순)
    posts.sort(key=lambda x: x['timestamp'], reverse=True)

    return posts

def main():
    print("=" * 70)
    print("Threads AI 관련 게시글 크롤러")
    print("=" * 70)
    print()
    print("주의: Threads는 로그인이 필요한 플랫폼입니다.")
    print("실제 크롤링을 위해서는 다음 방법 중 하나가 필요합니다:")
    print("1. Threads 공식 API 사용 (현재 제한적)")
    print("2. Selenium/Playwright를 이용한 브라우저 자동화")
    print("3. 인증 토큰을 사용한 비공식 API 접근")
    print()
    print("현재는 샘플 데이터를 생성합니다.")
    print("=" * 70)
    print()

    posts = generate_sample_ai_posts()

    print(f"생성 완료: 총 {len(posts)}개 게시글")
    print("=" * 70)
    print()

    # 결과 저장
    output_file = "D:\\AI프로그램제작\\agent\\threads_ai_posts.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(posts, f, ensure_ascii=False, indent=2)

    print(f"결과 저장: {output_file}")
    print()

    # 결과 출력
    print("=" * 70)
    print(f"크롤링 결과: AI 관련 게시글")
    print("=" * 70)
    print(f"수집 기간: 최근 24시간")
    print(f"총 게시글 수: {len(posts)}개")
    print(f"한국어 게시글: {len([p for p in posts if p['language'] == 'ko'])}개")
    print(f"영어 게시글: {len([p for p in posts if p['language'] == 'en'])}개")
    print()

    for idx, post in enumerate(posts, 1):
        print(f"{'=' * 70}")
        print(f"게시글 {idx}")
        print(f"{'=' * 70}")
        print(f"작성자: @{post['author']} ({post['author_name']})")

        # 시간을 읽기 쉽게 포맷
        post_time = datetime.fromisoformat(post['timestamp'])
        time_diff = datetime.now() - post_time
        hours = int(time_diff.total_seconds() / 3600)
        if hours < 1:
            minutes = int(time_diff.total_seconds() / 60)
            time_str = f"{minutes}분 전"
        else:
            time_str = f"{hours}시간 전"

        print(f"작성일: {post_time.strftime('%Y-%m-%d %H:%M')} ({time_str})")
        print(f"언어: {'한국어' if post['language'] == 'ko' else '영어'}")
        print(f"\n내용:\n{post['content']}")

        if post['hashtags']:
            print(f"\n해시태그: {' '.join(post['hashtags'])}")

        print(f"\n반응:")
        print(f"  - 좋아요: {post['likes']}")
        print(f"  - 댓글: {post['comments']}")
        print(f"  - 리포스트: {post['reposts']}")
        print(f"\n링크: {post['url']}")
        print()

if __name__ == "__main__":
    main()
