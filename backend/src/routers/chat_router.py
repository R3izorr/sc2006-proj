"""
Chat API endpoints
"""
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from typing import AsyncGenerator
from sqlalchemy.orm import Session
from ..controllers.chat_controller import chat_controller
from ..schemas.chat_schemas import ChatRequest, ChatResponse, SubzoneInsightRequest
from .deps import get_current_user, db_session
from ..models.user import User


router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(db_session)
):
    """
    Chat with AI assistant
    
    Requires authentication. Supports both streaming and non-streaming responses.
    Automatically injects relevant subzone data when user asks about rankings or specific subzones.
    """
    result = await chat_controller.process_chat(request, session=session)
    
    if request.stream:
        # Return streaming response
        async def generate() -> AsyncGenerator[str, None]:
            async for chunk in result:
                yield f"data: {chunk}\n\n"
            yield "data: [DONE]\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream"
        )
    else:
        return result


@router.post("/subzone-insight", response_model=ChatResponse)
async def subzone_insight(
    request: SubzoneInsightRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Generate AI insight for a specific subzone
    
    Requires authentication. Provides a brief analysis of hawker centre opportunity.
    """
    return await chat_controller.generate_subzone_insight(request)


@router.get("/health")
async def chat_health():
    """Check if chat service is available"""
    try:
        # Simple health check
        return {"status": "ok", "service": "chat"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

