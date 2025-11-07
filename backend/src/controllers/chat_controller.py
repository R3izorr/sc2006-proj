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
            print(f"[Chat Controller] User message: '{user_message}'")
            print(f"[Chat Controller] Data request detected: {data_request}")
            
            if data_request:
                # Fetch relevant subzone data
                try:
                    if data_request['type'] == 'specific_rank':
                        # Fetch specific rank with context (neighbors)
                        n = data_request['n']
                        subzones = data_controller.list_subzones(
                            session, 
                            rank_top=max(n + 5, 10),  # Get extra for context
                            snapshot="current"
                        )
                        # Filter to include the specific rank and 2 neighbors on each side
                        if n > 1:
                            subzones = [sz for sz in subzones if abs(sz.get('H_rank', 999) - n) <= 2]
                        else:
                            # For rank 1, show top 5
                            subzones = subzones[:5]
                    elif data_request['type'] == 'top_n_by_attribute':
                        # Fetch ALL subzones for "top N by attribute" queries
                        # E.g., "top 5 with most population"
                        n = data_request.get('n', 332)
                        subzones = data_controller.list_subzones(
                            session,
                            rank_top=n,
                            snapshot="current"
                        )
                        print(f"[Chat Controller] Fetching {len(subzones)} subzones for top {data_request.get('top_n')} by {data_request.get('attribute')}")
                    elif data_request['type'] == 'find_max_attribute':
                        # Fetch ALL subzones to find true max/min population/MRT/bus/hawker
                        # Must fetch all 332 because attribute max doesn't correlate with H-Score rank
                        n = data_request.get('n', 332)
                        subzones = data_controller.list_subzones(
                            session,
                            rank_top=n,
                            snapshot="current"
                        )
                        print(f"[Chat Controller] Fetching ALL {len(subzones)} subzones to find extreme attribute values")
                    elif data_request['type'] == 'top_n':
                        # Fetch top N subzones
                        n = min(data_request['n'], 100)  # Cap at 100 for performance
                        subzones = data_controller.list_subzones(
                            session,
                            rank_top=n,
                            snapshot="current"
                        )
                    else:
                        subzones = []
                    
                    # Inject data into context if we have results
                    if subzones:
                        print(f"[Chat Controller] ✅ Successfully fetched {len(subzones)} subzones")
                        print(f"[Chat Controller] Sample subzone: {subzones[0] if subzones else 'None'}")
                        messages = chat_service._inject_subzone_context(messages, subzones, data_request)
                        print(f"[Chat Controller] Injected {len(subzones)} subzones into context (request type: {data_request['type']}, n={data_request.get('n', 'N/A')})")
                    else:
                        print(f"[Chat Controller] ❌ WARNING: No subzones returned from database!")
                        print(f"[Chat Controller] This likely means:")
                        print(f"[Chat Controller] - No snapshot data in database")
                        print(f"[Chat Controller] - Database not initialized")
                        print(f"[Chat Controller] - Need to run data import/bootstrap script")
                except Exception as e:
                    print(f"[Chat Controller] Error fetching subzone data: {e}")
                    # Continue without data injection - AI will handle gracefully
        
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

