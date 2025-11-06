"""
Pydantic schemas for chat API
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class ChatMessage(BaseModel):
    """Single chat message"""
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    """Request body for chat endpoint"""
    messages: List[ChatMessage]
    stream: bool = Field(default=False, description="Enable streaming response")


class ChatResponse(BaseModel):
    """Response for non-streaming chat"""
    content: str
    model: Optional[str] = None
    
    
class SubzoneInsightRequest(BaseModel):
    """Request for subzone-specific insight"""
    subzone_name: str
    subzone_data: dict  # Full subzone properties

