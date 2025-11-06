"""
Chat controller - handles business logic for chat operations
"""
from typing import AsyncGenerator, Optional
from sqlalchemy.orm import Session
from ..services.chat_service import chat_service
from ..schemas.chat_schemas import ChatRequest, ChatResponse, SubzoneInsightRequest
from . import data_controller


class ChatController:
    def __init__(self):
        self.db_session: Optional[Session] = None
    
    def set_db_session(self, session: Session):
        """Set database session for data fetching"""
        self.db_session = session
    async def process_chat(
        self, 
        request: ChatRequest,
        session: Optional[Session] = None
    ) -> ChatResponse | AsyncGenerator[str, None]:
        """
        Process chat request with smart context injection
        
        Args:
            request: ChatRequest with messages and stream flag
            session: Database session for fetching subzone data
            
        Returns:
            ChatResponse or async generator of string chunks
        """
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        # Detect if user is asking for specific data
        if messages and session:
            user_message = messages[-1].get("content", "")
            data_request = chat_service._detect_data_request(user_message)
            
            if data_request:
                # Fetch relevant subzone data
                try:
                    if data_request['type'] == 'specific_rank':
                        # Fetch specific rank
                        n = data_request['n']
                        subzones = data_controller.list_subzones(
                            session, 
                            rank_top=max(n, 5),  # Get at least 5 for context
                            snapshot="current"
                        )
                        # Filter to include the specific rank and neighbors
                        subzones = [sz for sz in subzones if abs(sz.get('H_rank', 999) - n) <= 2]
                    elif data_request['type'] == 'top_n':
                        # Fetch top N
                        n = min(data_request['n'], 50)  # Cap at 50
                        subzones = data_controller.list_subzones(
                            session,
                            rank_top=n,
                            snapshot="current"
                        )
                    else:
                        subzones = []
                    
                    # Inject data into context
                    if subzones:
                        messages = chat_service._inject_subzone_context(messages, subzones)
                        print(f"[Chat Controller] Injected {len(subzones)} subzones into context")
                except Exception as e:
                    print(f"[Chat Controller] Error fetching subzone data: {e}")
        
        if request.stream:
            # Return the async generator directly
            result = chat_service.chat_completion(messages, stream=True)
            if hasattr(result, '__aiter__'):
                return result
            else:
                return await result
        else:
            result = await chat_service.chat_completion(messages, stream=False)
            return ChatResponse(
                content=result["content"],
                model=result.get("model")
            )
    
    async def generate_subzone_insight(
        self, 
        request: SubzoneInsightRequest
    ) -> ChatResponse:
        """
        Generate AI insight for a specific subzone
        
        Args:
            request: SubzoneInsightRequest with subzone data
            
        Returns:
            ChatResponse with generated insight
        """
        insight = await chat_service.generate_subzone_insight(request.subzone_data)
        return ChatResponse(content=insight)


# Singleton instance
chat_controller = ChatController()

