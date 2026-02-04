# SDK에서의 서브에이전트

Claude Agent SDK 애플리케이션에서 컨텍스트를 격리하고, 작업을 병렬로 실행하고, 특화된 지시사항을 적용하기 위해 서브에이전트를 정의하고 호출하세요.

---

서브에이전트는 메인 에이전트가 집중된 하위 작업을 처리하기 위해 생성할 수 있는 별도의 에이전트 인스턴스입니다.
서브에이전트를 사용하여 집중된 하위 작업을 위한 컨텍스트 격리, 여러 분석을 병렬로 실행, 메인 에이전트의 프롬프트를 비대하게 하지 않고 특화된 지시사항 적용이 가능합니다.

이 가이드는 `agents` 매개변수를 사용하여 SDK에서 서브에이전트를 정의하고 사용하는 방법을 설명합니다.

## 개요

서브에이전트를 세 가지 방법으로 생성할 수 있습니다:

- **프로그래밍 방식**: `query()` 옵션에서 `agents` 매개변수 사용
- **파일 시스템 기반**: `.claude/agents/` 디렉토리에 마크다운 파일로 에이전트 정의
- **내장 general-purpose**: Claude는 아무것도 정의하지 않아도 Task 도구를 통해 언제든지 내장 `general-purpose` 서브에이전트를 호출할 수 있습니다

이 가이드는 SDK 애플리케이션에 권장되는 프로그래밍 방식에 중점을 둡니다.

서브에이전트를 정의하면 Claude는 각 서브에이전트의 `description` 필드를 기반으로 호출 여부를 결정합니다. Claude가 자동으로 적절한 작업을 위임하도록 서브에이전트를 언제 사용해야 하는지 설명하는 명확한 설명을 작성하세요. 프롬프트에서 이름으로 서브에이전트를 명시적으로 요청할 수도 있습니다(예: "code-reviewer 에이전트를 사용하여...").

## 서브에이전트 사용의 이점

### 컨텍스트 관리
서브에이전트는 메인 에이전트와 별도의 컨텍스트를 유지하여 정보 과부하를 방지하고 상호 작용을 집중적으로 유지합니다. 이러한 격리는 특화된 작업이 관련 없는 세부 사항으로 메인 대화 컨텍스트를 오염시키지 않도록 보장합니다.

**예시**: `research-assistant` 서브에이전트는 수십 개의 파일과 문서 페이지를 탐색하면서도 모든 중간 검색 결과로 메인 대화를 어지럽히지 않고 관련 결과만 반환할 수 있습니다.

### 병렬화
여러 서브에이전트가 동시에 실행될 수 있어 복잡한 워크플로우를 극적으로 가속화합니다.

**예시**: 코드 검토 중에 `style-checker`, `security-scanner`, `test-coverage` 서브에이전트를 동시에 실행하여 검토 시간을 몇 분에서 몇 초로 단축할 수 있습니다.

### 특화된 지시사항 및 지식
각 서브에이전트는 특정 전문 지식, 모범 사례 및 제약 조건이 포함된 맞춤형 시스템 프롬프트를 가질 수 있습니다.

**예시**: `database-migration` 서브에이전트는 메인 에이전트의 지시사항에서는 불필요한 노이즈가 될 SQL 모범 사례, 롤백 전략 및 데이터 무결성 검사에 대한 자세한 지식을 가질 수 있습니다.

### 도구 제한
서브에이전트는 특정 도구로 제한될 수 있어 의도하지 않은 작업의 위험을 줄입니다.

**예시**: `doc-reviewer` 서브에이전트는 Read 및 Grep 도구에만 액세스할 수 있어 문서 파일을 분석할 수 있지만 실수로 수정하지 않도록 보장합니다.

## 서브에이전트 생성

### 프로그래밍 방식 정의 (권장)

`agents` 매개변수를 사용하여 코드에서 직접 서브에이전트를 정의합니다. 이 예제는 읽기 전용 액세스 권한이 있는 코드 리뷰어와 명령을 실행할 수 있는 테스트 러너의 두 가지 서브에이전트를 생성합니다. Claude가 Task 도구를 통해 서브에이전트를 호출하므로 `Task` 도구를 `allowedTools`에 포함해야 합니다.

**Python:**
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async def main():
    async for message in query(
        prompt="보안 문제에 대해 인증 모듈을 검토하세요",
        options=ClaudeAgentOptions(
            # 서브에이전트 호출을 위해 Task 도구 필수
            allowed_tools=["Read", "Grep", "Glob", "Task"],
            agents={
                "code-reviewer": AgentDefinition(
                    # description은 Claude에게 이 서브에이전트를 언제 사용할지 알려줍니다
                    description="전문 코드 검토 전문가. 품질, 보안 및 유지보수성 검토에 사용하세요.",
                    # prompt는 서브에이전트의 동작과 전문성을 정의합니다
                    prompt="""당신은 보안, 성능 및 모범 사례에 대한 전문 지식을 가진 코드 검토 전문가입니다.

코드 검토 시:
- 보안 취약점 식별
- 성능 문제 확인
- 코딩 표준 준수 확인
- 구체적인 개선 사항 제안

철저하면서도 간결한 피드백을 제공하세요.""",
                    # tools는 서브에이전트가 할 수 있는 것을 제한합니다 (여기서는 읽기 전용)
                    tools=["Read", "Grep", "Glob"],
                    # model은 이 서브에이전트의 기본 모델을 재정의합니다
                    model="sonnet"
                ),
                "test-runner": AgentDefinition(
                    description="테스트 스위트를 실행하고 분석합니다. 테스트 실행 및 커버리지 분석에 사용하세요.",
                    prompt="""당신은 테스트 실행 전문가입니다. 테스트를 실행하고 결과에 대한 명확한 분석을 제공하세요.

집중 사항:
- 테스트 명령 실행
- 테스트 출력 분석
- 실패한 테스트 식별
- 실패에 대한 수정 제안""",
                    # Bash 액세스로 이 서브에이전트가 테스트 명령을 실행할 수 있습니다
                    tools=["Bash", "Read", "Grep"]
                )
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

**TypeScript:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const message of query({
  prompt: "보안 문제에 대해 인증 모듈을 검토하세요",
  options: {
    // 서브에이전트 호출을 위해 Task 도구 필수
    allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
    agents: {
      'code-reviewer': {
        // description은 Claude에게 이 서브에이전트를 언제 사용할지 알려줍니다
        description: '전문 코드 검토 전문가. 품질, 보안 및 유지보수성 검토에 사용하세요.',
        // prompt는 서브에이전트의 동작과 전문성을 정의합니다
        prompt: `당신은 보안, 성능 및 모범 사례에 대한 전문 지식을 가진 코드 검토 전문가입니다.

코드 검토 시:
- 보안 취약점 식별
- 성능 문제 확인
- 코딩 표준 준수 확인
- 구체적인 개선 사항 제안

철저하면서도 간결한 피드백을 제공하세요.`,
        // tools는 서브에이전트가 할 수 있는 것을 제한합니다 (여기서는 읽기 전용)
        tools: ['Read', 'Grep', 'Glob'],
        // model은 이 서브에이전트의 기본 모델을 재정의합니다
        model: 'sonnet'
      },
      'test-runner': {
        description: '테스트 스위트를 실행하고 분석합니다. 테스트 실행 및 커버리지 분석에 사용하세요.',
        prompt: `당신은 테스트 실행 전문가입니다. 테스트를 실행하고 결과에 대한 명확한 분석을 제공하세요.

집중 사항:
- 테스트 명령 실행
- 테스트 출력 분석
- 실패한 테스트 식별
- 실패에 대한 수정 제안`,
        // Bash 액세스로 이 서브에이전트가 테스트 명령을 실행할 수 있습니다
        tools: ['Bash', 'Read', 'Grep'],
      }
    }
  }
})) {
  if ('result' in message) console.log(message.result);
}
```

### AgentDefinition 구성

| 필드 | 타입 | 필수 | 설명 |
|:------|:-----|:---------|:------------|
| `description` | `string` | 예 | 이 에이전트를 언제 사용할지에 대한 자연어 설명 |
| `prompt` | `string` | 예 | 에이전트의 역할과 동작을 정의하는 시스템 프롬프트 |
| `tools` | `string[]` | 아니오 | 허용된 도구 이름 배열. 생략하면 모든 도구 상속 |
| `model` | `'sonnet' \| 'opus' \| 'haiku' \| 'inherit'` | 아니오 | 이 에이전트의 모델 재정의. 생략하면 메인 모델 사용 |

**참고**: 서브에이전트는 자체 서브에이전트를 생성할 수 없습니다. 서브에이전트의 `tools` 배열에 `Task`를 포함하지 마세요.

## 서브에이전트 호출

### 자동 호출

Claude는 작업과 각 서브에이전트의 `description`을 기반으로 서브에이전트를 자동으로 호출할 시기를 결정합니다. 예를 들어, "쿼리 튜닝을 위한 성능 최적화 전문가"라는 설명으로 `performance-optimizer` 서브에이전트를 정의하면 프롬프트에 쿼리 최적화가 언급될 때 Claude가 이를 호출합니다.

Claude가 작업을 올바른 서브에이전트에 매칭할 수 있도록 명확하고 구체적인 설명을 작성하세요.

### 명시적 호출

Claude가 특정 서브에이전트를 사용하도록 보장하려면 프롬프트에서 이름으로 언급하세요:

```
"code-reviewer 에이전트를 사용하여 인증 모듈을 확인하세요"
```

이는 자동 매칭을 우회하고 명명된 서브에이전트를 직접 호출합니다.

### 동적 에이전트 구성

런타임 조건에 따라 에이전트 정의를 동적으로 생성할 수 있습니다. 이 예제는 다양한 엄격성 수준으로 보안 리뷰어를 생성하며, 엄격한 검토에는 더 강력한 모델을 사용합니다.

**Python:**
```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

# AgentDefinition을 반환하는 팩토리 함수
# 이 패턴을 사용하면 런타임 조건에 따라 에이전트를 커스터마이즈할 수 있습니다
def create_security_agent(security_level: str) -> AgentDefinition:
    is_strict = security_level == "strict"
    return AgentDefinition(
        description="보안 코드 리뷰어",
        # 엄격성 수준에 따라 프롬프트 커스터마이즈
        prompt=f"당신은 {'엄격한' if is_strict else '균형잡힌'} 보안 리뷰어입니다...",
        tools=["Read", "Grep", "Glob"],
        # 핵심 통찰: 중요한 검토에는 더 유능한 모델 사용
        model="opus" if is_strict else "sonnet"
    )

async def main():
    # 에이전트는 쿼리 시간에 생성되므로 각 요청은 다른 설정을 사용할 수 있습니다
    async for message in query(
        prompt="보안 문제에 대해 이 PR을 검토하세요",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Grep", "Glob", "Task"],
            agents={
                # 원하는 구성으로 팩토리 호출
                "security-reviewer": create_security_agent("strict")
            }
        )
    ):
        if hasattr(message, "result"):
            print(message.result)

asyncio.run(main())
```

## 서브에이전트 호출 감지

서브에이전트는 Task 도구를 통해 호출됩니다. 서브에이전트가 호출되는 시기를 감지하려면 `name: "Task"`인 `tool_use` 블록을 확인하세요. 서브에이전트의 컨텍스트 내에서 발생한 메시지에는 `parent_tool_use_id` 필드가 포함됩니다.

## 서브에이전트 재개

서브에이전트를 재개하여 중단한 곳에서 계속할 수 있습니다. 재개된 서브에이전트는 모든 이전 도구 호출, 결과 및 추론을 포함하여 전체 대화 기록을 유지합니다. 서브에이전트는 처음부터 시작하는 대신 정확히 중단한 곳에서 시작합니다.

서브에이전트가 완료되면 Claude는 Task 도구 결과에서 에이전트 ID를 받습니다. 프로그래밍 방식으로 서브에이전트를 재개하려면:

1. **세션 ID 캡처**: 첫 번째 쿼리 중 메시지에서 `session_id` 추출
2. **에이전트 ID 추출**: 메시지 콘텐츠에서 `agentId` 파싱
3. **세션 재개**: 두 번째 쿼리의 옵션에 `resume: sessionId`를 전달하고 프롬프트에 에이전트 ID 포함

**참고**: 서브에이전트의 트랜스크립트에 액세스하려면 동일한 세션을 재개해야 합니다. 각 `query()` 호출은 기본적으로 새 세션을 시작하므로 동일한 세션에서 계속하려면 `resume: sessionId`를 전달하세요.

서브에이전트 트랜스크립트는 메인 대화와 독립적으로 유지됩니다:

- **메인 대화 압축**: 메인 대화가 압축되어도 서브에이전트 트랜스크립트는 영향을 받지 않습니다. 별도의 파일에 저장됩니다.
- **세션 지속성**: 서브에이전트 트랜스크립트는 세션 내에서 유지됩니다. 동일한 세션을 재개하여 Claude Code를 재시작한 후 서브에이전트를 재개할 수 있습니다.
- **자동 정리**: 트랜스크립트는 `cleanupPeriodDays` 설정(기본값: 30일)에 따라 정리됩니다.

## 도구 제한

서브에이전트는 `tools` 필드를 통해 제한된 도구 액세스를 가질 수 있습니다:

- **필드 생략**: 에이전트가 사용 가능한 모든 도구를 상속받습니다 (기본값)
- **도구 지정**: 에이전트가 나열된 도구만 사용할 수 있습니다

이 예제는 코드를 검사할 수 있지만 파일을 수정하거나 명령을 실행할 수 없는 읽기 전용 분석 에이전트를 생성합니다.

### 일반적인 도구 조합

| 사용 사례 | 도구 | 설명 |
|:---------|:------|:------------|
| 읽기 전용 분석 | `Read`, `Grep`, `Glob` | 코드를 검사할 수 있지만 수정하거나 실행할 수 없음 |
| 테스트 실행 | `Bash`, `Read`, `Grep` | 명령을 실행하고 출력을 분석할 수 있음 |
| 코드 수정 | `Read`, `Edit`, `Write`, `Grep`, `Glob` | 명령 실행 없이 전체 읽기/쓰기 액세스 |
| 전체 액세스 | 모든 도구 | 부모로부터 모든 도구를 상속받음 (`tools` 필드 생략) |

## 문제 해결

### Claude가 서브에이전트에 위임하지 않음

Claude가 서브에이전트에 위임하는 대신 작업을 직접 완료하는 경우:

1. **Task 도구 포함**: 서브에이전트는 Task 도구를 통해 호출되므로 `allowedTools`에 있어야 합니다
2. **명시적 프롬프팅 사용**: 프롬프트에서 서브에이전트를 이름으로 언급하세요 (예: "code-reviewer 에이전트를 사용하여...")
3. **명확한 설명 작성**: Claude가 작업을 적절하게 매칭할 수 있도록 서브에이전트를 정확히 언제 사용해야 하는지 설명하세요

### 파일 시스템 기반 에이전트가 로드되지 않음

`.claude/agents/`에 정의된 에이전트는 시작 시에만 로드됩니다. Claude Code가 실행 중일 때 새 에이전트 파일을 생성하는 경우 세션을 다시 시작하여 로드하세요.

## 관련 문서

- [Claude Code 서브에이전트](https://code.claude.com/docs/en/sub-agents): 파일 시스템 기반 정의를 포함한 포괄적인 서브에이전트 문서
- [SDK 개요](/docs/en/agent-sdk/overview): Claude Agent SDK 시작하기
