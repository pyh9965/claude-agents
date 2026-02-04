from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Generic, TypeVar
from pydantic import BaseModel
from datetime import datetime
import asyncio
from loguru import logger

T = TypeVar('T')

class AgentResult(BaseModel, Generic[T]):
    """에이전트 실행 결과"""
    success: bool
    data: Optional[T] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = {}
    executed_at: datetime = datetime.now()

class BaseAgent(ABC):
    """모든 에이전트의 기본 클래스"""

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.name = self.__class__.__name__
        self._is_initialized = False

    async def initialize(self) -> None:
        """에이전트 초기화 (필요시 오버라이드)"""
        self._is_initialized = True
        logger.info(f"{self.name} initialized")

    async def cleanup(self) -> None:
        """리소스 정리 (필요시 오버라이드)"""
        self._is_initialized = False
        logger.info(f"{self.name} cleaned up")

    @abstractmethod
    async def execute(self, input_data: Any) -> AgentResult:
        """에이전트의 주요 작업 수행"""
        pass

    @abstractmethod
    async def validate_input(self, input_data: Any) -> bool:
        """입력 데이터 유효성 검증"""
        pass

    async def pre_execute(self, input_data: Any) -> Any:
        """실행 전 처리"""
        return input_data

    async def post_execute(self, result: AgentResult) -> AgentResult:
        """실행 후 처리"""
        return result

    async def run(self, input_data: Any) -> AgentResult:
        """전체 실행 파이프라인"""
        try:
            if not self._is_initialized:
                await self.initialize()

            # 입력 검증
            await self.validate_input(input_data)

            # 전처리
            processed_input = await self.pre_execute(input_data)

            # 실행
            result = await self.execute(processed_input)

            # 후처리
            final_result = await self.post_execute(result)

            return final_result

        except Exception as e:
            logger.error(f"{self.name} error: {str(e)}")
            return AgentResult(
                success=False,
                error=str(e),
                metadata={"agent": self.name}
            )
