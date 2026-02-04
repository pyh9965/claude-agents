# Agent Skills: 특화된 역량으로 AI 에이전트 강화하기

## 개요

Anthropic은 조직화된 파일 구조를 통해 AI 에이전트에 도메인별 전문성을 제공하는 프레임워크인 Agent Skills를 도입했습니다. 기사에서 언급한 바와 같이, "Claude는 강력하지만 실제 작업에는 절차적 지식과 조직적 컨텍스트가 필요합니다."

## Agent Skills란 무엇인가?

Agent Skills는 "에이전트가 특정 작업을 더 잘 수행하기 위해 동적으로 발견하고 로드할 수 있는 조직화된 지시사항, 스크립트 및 리소스 폴더"를 나타냅니다. 각 사용 사례마다 별도의 커스텀 에이전트를 구축하는 대신, 이제 개발자는 재사용 가능한 특화된 역량으로 범용 모델을 구성할 수 있습니다.

## 핵심 아키텍처

### 점진적 공개(Progressive Disclosure) 설계

프레임워크는 다층 정보 구조를 사용합니다:

1. **메타데이터 레이어**: 각 스킬은 `name`과 `description` 필드가 있는 YAML frontmatter를 포함하는 `SKILL.md` 파일로 시작합니다. 이것들은 시스템 프롬프트에 사전 로드되어 Claude가 스킬이 적용되는 시기를 인식할 수 있게 합니다.

2. **주요 콘텐츠**: Claude가 관련성을 판단하면 자세한 지침을 위해 완전한 `SKILL.md`를 컨텍스트로 읽습니다.

3. **보충 리소스**: 스킬은 Claude가 필요할 때만 액세스하는 추가 파일(`reference.md` 또는 `forms.md`와 같은)을 번들로 제공할 수 있어 컨텍스트 사용을 간소하게 유지합니다.

이 설계 원칙은 에이전트가 파일 시스템 및 코드 실행 기능을 가지고 있을 때 "스킬에 번들로 제공될 수 있는 컨텍스트의 양이 사실상 무제한"임을 보장합니다.

## 실용적인 예: PDF 스킬

기사는 Claude의 문서 편집 기능으로 이를 설명합니다. Claude는 PDF 이해 능력을 가지고 있었지만 직접 조작 능력이 부족했습니다. PDF 스킬은 전체 문서를 컨텍스트로 로드하지 않고 양식 필드를 추출하는 사전 작성된 Python 스크립트를 포함하여 양식 작성 작업을 가능하게 합니다.

## 구현 가이드라인

개발자는 다음 관행을 따라야 합니다:

- **평가로 시작**: 대표적인 작업 테스트를 통해 역량 격차 식별
- **확장을 위한 구조**: `SKILL.md`가 다루기 어려워지면 참조된 파일에 콘텐츠 배포
- **관점 채택**: 실제 Claude 동작을 모니터링하고 스킬 이름 및 설명 개선
- **반복 개발**: Claude와 협력하여 성공적인 패턴을 재사용 가능한 컨텍스트로 캡처

## 코드 실행 통합

스킬은 실행 가능한 코드를 포함할 수 있습니다. 기사는 "대형 언어 모델은 많은 작업에 뛰어나지만 특정 작업은 기존 코드 실행에 더 적합합니다"라고 강조합니다. 결정론적 알고리즘은 토큰 기반 솔루션보다 더 효율적이고 신뢰할 수 있습니다.

## 보안 고려사항

프레임워크는 신중한 검증이 필요합니다. "신뢰할 수 있는 소스의 스킬만 설치하는 것을 권장합니다." 사용자는 스킬 구성 요소, 특히 코드 종속성과 Claude를 외부 네트워크 소스로 안내하는 지시사항을 감사해야 합니다.

## 현재 가용성 및 향후 방향

Agent Skills는 현재 Claude.ai, Claude Code, Claude Agent SDK 및 Claude Developer Platform에서 지원됩니다. 로드맵에는 향상된 발견, 공유 메커니즘 및 잠재적인 Model Context Protocol 통합이 포함됩니다.

앞으로 Anthropic은 에이전트가 자율적으로 자체 스킬을 생성하고 개선하여 자기 개선 사이클을 가능하게 하는 것을 구상하고 있습니다.

## 핵심 요점

스킬은 전문가 지식을 구성 가능한 모듈로 변환하여 에이전트 특화를 민주화하고, 개발을 분산된 커스텀 솔루션에서 모듈식의 확장 가능한 아키텍처로 전환합니다.

---

## Agent Skills의 주요 특징

### 1. 동적 발견 및 로드
- 에이전트는 작업 요구사항에 따라 필요한 스킬을 자동으로 발견
- 관련 스킬만 컨텍스트에 로드하여 효율성 최대화
- 스킬은 필요할 때만 활성화되어 토큰 사용량 최소화

### 2. 계층적 정보 구조
```
skill-name/
├── SKILL.md           # 스킬의 주요 설명 및 지시사항
├── reference.md       # 추가 참조 자료
├── scripts/           # 실행 가능한 유틸리티 스크립트
│   └── helper.py
└── templates/         # 템플릿 파일
    └── form.md
```

### 3. SKILL.md 파일 구조
```markdown
---
name: pdf-form-filler
description: PDF 양식을 채우고 필드를 추출하는 스킬
---

# PDF 양식 작성 스킬

이 스킬을 사용하면 PDF 양식을 작성하고 필드를 추출할 수 있습니다.

## 사용법

1. PDF 파일 열기
2. 양식 필드 식별
3. 데이터로 필드 채우기
4. 저장 또는 제출

## 사용 가능한 스크립트

- `scripts/extract_fields.py`: PDF에서 양식 필드 추출
- `scripts/fill_form.py`: 데이터로 양식 채우기
```

## 스킬 생성 모범 사례

### 1. 명확한 이름과 설명
- **이름**: 스킬이 무엇을 하는지 명확하게 나타냄
- **설명**: Claude가 언제 이 스킬을 사용해야 하는지 이해할 수 있도록 구체적으로 작성

### 2. 점진적 세부 정보
- 메타데이터: 간결하고 핵심만 포함
- 주요 콘텐츠: 상세한 지침과 예제
- 보충 자료: 필요시 참조할 수 있는 심화 정보

### 3. 실행 가능한 코드 포함
```python
# scripts/extract_fields.py
import PyPDF2

def extract_pdf_fields(pdf_path):
    """PDF에서 양식 필드 추출"""
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        fields = reader.get_fields()
        return fields

if __name__ == "__main__":
    import sys
    fields = extract_pdf_fields(sys.argv[1])
    for field_name, field_data in fields.items():
        print(f"{field_name}: {field_data}")
```

### 4. 템플릿 및 예제 제공
```markdown
# templates/api_request.md

## API 요청 템플릿

```json
{
  "endpoint": "/api/users",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer {token}"
  },
  "body": {
    "name": "{user_name}",
    "email": "{user_email}"
  }
}
```
```

## 스킬 사용 예제

### 예제 1: 데이터 분석 스킬

```markdown
---
name: data-analysis
description: 데이터를 분석하고 인사이트를 생성하는 스킬
---

# 데이터 분석 스킬

CSV, Excel, JSON 형식의 데이터를 분석합니다.

## 기능

1. **데이터 로드**: 다양한 형식의 데이터 파일 읽기
2. **통계 분석**: 기본 통계 및 추세 분석
3. **시각화**: 차트 및 그래프 생성
4. **인사이트 생성**: 패턴 및 이상치 식별

## 사용 가능한 도구

- `scripts/analyze.py`: 데이터 분석 실행
- `scripts/visualize.py`: 시각화 생성
- `templates/report.md`: 분석 보고서 템플릿
```

### 예제 2: API 통합 스킬

```markdown
---
name: rest-api-integration
description: REST API와 상호작용하는 스킬
---

# REST API 통합 스킬

외부 REST API와 통합하고 데이터를 교환합니다.

## 지원 기능

1. **GET 요청**: 데이터 조회
2. **POST 요청**: 데이터 생성
3. **PUT/PATCH 요청**: 데이터 업데이트
4. **DELETE 요청**: 데이터 삭제
5. **인증**: OAuth, API 키, Bearer 토큰 지원

## 스크립트

- `scripts/api_client.py`: API 클라이언트 유틸리티
- `scripts/auth_handler.py`: 인증 처리
```

## 보안 체크리스트

스킬을 설치하기 전에 다음을 확인하세요:

- [ ] 신뢰할 수 있는 소스에서 제공됨
- [ ] 코드에 악의적인 명령이 없음
- [ ] 외부 네트워크 호출이 안전함
- [ ] 민감한 데이터 처리가 적절함
- [ ] 종속성이 검증됨
- [ ] 권한 요구사항이 명확함

## 스킬 배포

### 로컬 스킬
```bash
# 사용자 수준 스킬
~/.claude/skills/my-skill/

# 프로젝트 수준 스킬
.claude/skills/project-skill/
```

### 공유 스킬
- GitHub 저장소로 공유
- 팀 내부 저장소
- Anthropic 공식 스킬 레지스트리 (계획 중)

## 향후 발전 방향

1. **자율 스킬 생성**: 에이전트가 작업 수행 중 새로운 스킬을 자동으로 생성
2. **스킬 마켓플레이스**: 커뮤니티가 스킬을 공유하고 발견하는 플랫폼
3. **MCP 통합**: Model Context Protocol과의 완전한 통합
4. **버전 관리**: 스킬 업데이트 및 호환성 관리
5. **성능 분석**: 스킬 효과성 측정 및 최적화

## 결론

Agent Skills는 AI 에이전트의 역량을 확장하는 혁신적인 방법입니다. 조직화된 지식과 도구를 제공함으로써, 에이전트는 더 복잡하고 특화된 작업을 수행할 수 있게 됩니다. 개발자는 재사용 가능한 스킬을 만들어 팀 전체의 생산성을 향상시킬 수 있습니다.
