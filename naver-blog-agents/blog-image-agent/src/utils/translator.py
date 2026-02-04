from typing import List, Dict
import os


class KeywordTranslator:
    """한국어 → 영어 키워드 번역기"""

    # 음식/맛집 관련
    FOOD_MAPPING: Dict[str, str] = {
        "김치찌개": "kimchi stew",
        "김치": "kimchi",
        "삼겹살": "Korean BBQ pork belly samgyeopsal",
        "비빔밥": "bibimbap Korean rice bowl",
        "된장찌개": "doenjang soybean paste stew",
        "불고기": "bulgogi Korean BBQ beef",
        "떡볶이": "tteokbokki spicy rice cakes",
        "치킨": "Korean fried chicken",
        "라면": "Korean ramen ramyeon",
        "순두부찌개": "soft tofu stew sundubu",
        "갈비": "galbi Korean short ribs",
        "냉면": "naengmyeon cold noodles",
        "국수": "Korean noodles guksu",
        "파전": "pajeon Korean pancake",
        "규동": "gyudon beef bowl",
        "돈까스": "tonkatsu pork cutlet donkatsu",
        "수육": "boiled pork slices suyuk",
        "보쌈": "bossam wrapped pork",
        "족발": "jokbal pig's feet",
        "곱창": "gopchang grilled intestines",
        "막걸리": "makgeolli rice wine",
        "소주": "soju Korean alcohol",
    }

    # 장소/여행 관련
    PLACE_MAPPING: Dict[str, str] = {
        "서울": "Seoul Korea",
        "부산": "Busan Korea",
        "제주": "Jeju Island Korea",
        "경주": "Gyeongju Korea",
        "강남": "Gangnam Seoul",
        "홍대": "Hongdae Seoul",
        "이태원": "Itaewon Seoul",
        "명동": "Myeongdong Seoul",
        "인사동": "Insadong Seoul",
        "북촌": "Bukchon Hanok Village",
        "남산": "Namsan Tower Seoul",
        "한강": "Han River Seoul",
        "카페": "cafe coffee shop",
        "맛집": "restaurant food",
        "한식": "Korean food cuisine",
        "일식": "Japanese food",
        "중식": "Chinese food",
        "분식": "Korean street food snacks",
        "양식": "Western food",
    }

    # 일반 키워드
    GENERAL_MAPPING: Dict[str, str] = {
        "여행": "travel trip",
        "관광": "tourism sightseeing",
        "숙소": "accommodation hotel",
        "호텔": "hotel",
        "펜션": "pension guesthouse",
        "에어비앤비": "airbnb",
        "쇼핑": "shopping",
        "데이트": "date couple",
        "가족": "family",
        "친구": "friends",
        "혼자": "solo alone",
        "주말": "weekend",
        "휴가": "vacation holiday",
        "야경": "night view nightscape",
        "일출": "sunrise",
        "일몰": "sunset",
        "벚꽃": "cherry blossom sakura",
        "단풍": "autumn leaves fall foliage",
        "겨울": "winter snow",
        "여름": "summer beach",
        "봄": "spring",
        "가을": "autumn fall",
    }

    def __init__(self, use_ai: bool = False):
        """
        Args:
            use_ai: AI 번역 사용 여부 (Gemini)
        """
        self.use_ai = use_ai
        self.all_mappings = {
            **self.FOOD_MAPPING,
            **self.PLACE_MAPPING,
            **self.GENERAL_MAPPING
        }

    def translate(self, keywords: List[str]) -> str:
        """키워드 리스트를 영어로 번역

        Args:
            keywords: 한국어 키워드 리스트

        Returns:
            영어 검색어 문자열
        """
        translated = []

        for kw in keywords:
            kw_lower = kw.lower().strip()

            # 매핑 테이블에서 찾기
            if kw_lower in self.all_mappings:
                translated.append(self.all_mappings[kw_lower])
            else:
                # 부분 매칭 시도
                found = False
                for korean, english in self.all_mappings.items():
                    if korean in kw_lower or kw_lower in korean:
                        translated.append(english)
                        found = True
                        break

                if not found:
                    # 원본 사용 (이미 영어일 수 있음)
                    translated.append(kw)

        return " ".join(translated)

    async def translate_with_ai(self, keywords: List[str]) -> str:
        """AI를 사용한 번역 (Gemini)

        Args:
            keywords: 한국어 키워드 리스트

        Returns:
            영어 검색어 문자열
        """
        if not self.use_ai:
            return self.translate(keywords)

        try:
            from google import genai

            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                return self.translate(keywords)

            client = genai.Client(api_key=api_key)

            prompt = f"""Translate these Korean keywords to English for image search.
Keep food/place names in romanized Korean + English description.
Return only the translated keywords, space-separated.

Keywords: {', '.join(keywords)}"""

            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt
            )

            return response.text.strip()

        except Exception:
            # 실패 시 매핑 테이블 사용
            return self.translate(keywords)
