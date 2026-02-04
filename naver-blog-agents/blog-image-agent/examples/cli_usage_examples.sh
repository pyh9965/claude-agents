#!/bin/bash
# Blog Image Agent CLI 사용 예시

echo "=== Blog Image Agent CLI 사용 예시 ==="

# 1. 설정 확인
echo -e "\n[1] 설정 확인"
echo "blog-image config"

# 2. 콘텐츠 분석
echo -e "\n[2] 콘텐츠 분석하여 이미지 요구사항 추출"
echo "blog-image analyze examples/sample_blog_post.html -o requirements.json"

# 3. 단일 AI 이미지 생성
echo -e "\n[3] AI 이미지 생성 (나노바나나)"
echo "blog-image generate -p '맛있는 김치찌개' -t food_photo -s food -o kimchi.png"

# 4. 전체 파이프라인 실행
echo -e "\n[4] 전체 파이프라인 실행 (분석→수집→최적화→삽입)"
echo "blog-image collect examples/sample_blog_post.html -o output"

# 5. 우선순위 변경
echo -e "\n[5] 스톡 이미지 우선"
echo "blog-image collect examples/sample_blog_post.html -o output_stock -p stock"

# 6. AI 생성 우선
echo -e "\n[6] AI 생성 우선"
echo "blog-image collect examples/sample_blog_post.html -o output_ai -p ai"

# 7. 고품질 모델 사용
echo -e "\n[7] Gemini 2.0 Pro 사용 (더 정확한 분석)"
echo "blog-image collect examples/sample_blog_post.html -m gemini-2.0-pro"

# 8. 최적화 건너뛰기 (빠른 실행)
echo -e "\n[8] 이미지 최적화 비활성화"
echo "blog-image collect examples/sample_blog_post.html --no-optimize"

# 9. 이미지만 삽입 (이미 수집된 이미지 사용)
echo -e "\n[9] 기존 이미지를 콘텐츠에 삽입"
echo "blog-image insert examples/sample_blog_post.html -i output/images -o final.html"

# 10. 배치 처리 예시
echo -e "\n[10] 여러 파일 배치 처리"
cat << 'EOF'
for file in examples/*.html; do
  output_dir="output/$(basename $file .html)"
  blog-image collect "$file" -o "$output_dir"
done
EOF

echo -e "\n=== 고급 예시 ==="

# 11. 여행 블로그 썸네일 생성
echo -e "\n[11] 여행 블로그 썸네일 생성"
echo "blog-image generate -p '서울 북촌 한옥마을, 봄날 햇살' -t thumbnail -s travel"

# 12. 인포그래픽 생성
echo -e "\n[12] 인포그래픽 생성"
echo "blog-image generate -p '블로그 통계 데이터' -t infographic -s tech"

# 13. 배너 이미지 생성
echo -e "\n[13] 배너 이미지 생성"
echo "blog-image generate -p '음식 블로그 헤더' -t banner -s food"

# 14. 커스텀 프롬프트로 고급 AI 생성
echo -e "\n[14] 상세 프롬프트로 AI 이미지 생성"
cat << 'EOF'
blog-image generate \
  -p "한국 전통 김치찌개, 뜨거운 김이 오르는, 돌솥에 담긴, 따뜻한 조명, 한식당 배경, 프로페셔널 푸드 포토그래피, 4K 고화질" \
  -t food_photo \
  -s food \
  -o premium_kimchi.png
EOF

echo -e "\n=== 워크플로우 예시 ==="

# 시나리오 1: 빠른 자동화
echo -e "\n[시나리오 1] 빠른 전체 자동화"
cat << 'EOF'
blog-image pipeline my_post.html -o final_output
EOF

# 시나리오 2: 단계별 제어
echo -e "\n[시나리오 2] 단계별 세밀한 제어"
cat << 'EOF'
# 1. 분석
blog-image analyze my_post.html -o reqs.json

# 2. 요구사항 확인 및 수정
cat reqs.json
# (필요시 JSON 파일 수동 편집)

# 3. 수집
blog-image collect my_post.html -o images_output

# 4. 추가 AI 이미지 생성
blog-image generate -p "커스텀 썸네일" -o custom.png

# 5. 최종 삽입
blog-image insert my_post.html -i images_output/images -o final.html
EOF

# 시나리오 3: AI 중심 워크플로우
echo -e "\n[시나리오 3] AI 생성 중심 워크플로우"
cat << 'EOF'
# AI 우선, 최적화 없이 빠르게
blog-image collect my_post.html -p ai --no-optimize -o ai_output
EOF

echo -e "\n=== 문제 해결 예시 ==="

# API 키 문제
echo -e "\n[문제 1] API 키 확인"
cat << 'EOF'
# .env 파일 확인
cat .env

# 설정 상태 확인
blog-image config

# 환경변수로 직접 설정
export GOOGLE_API_KEY="your_key_here"
blog-image config
EOF

# 수집 실패 시
echo -e "\n[문제 2] 이미지 수집 실패 시"
cat << 'EOF'
# 우선순위 변경 시도
blog-image collect content.html -p stock

# 또는 AI만 사용
blog-image collect content.html -p ai

# 최적화 비활성화로 속도 향상
blog-image collect content.html --no-optimize
EOF

echo -e "\n=== 모든 예시 종료 ==="
