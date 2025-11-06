"""
Chat service for interacting with Ollama local LLM
"""
import httpx
from typing import AsyncGenerator, Optional, List, Dict
import os
import json
import re


class ChatService:
    def __init__(self):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        self.timeout = 120.0  # seconds - increased for model loading
        
        # System prompt with context about the platform
        self.system_prompt = """You are a helpful AI assistant for the Hawker Opportunity Score Platform, 
a web application that helps identify promising locations for new hawker centres in Singapore.

IMPORTANT RULES:
1. ONLY use data explicitly provided in the conversation context
2. If asked about specific subzones or rankings, look for the [SUBZONE DATA] section in the context
3. NEVER make up or guess subzone names, rankings, or scores
4. If you don't have the data, say: "I don't have that specific data. Please use the interactive map to explore subzone rankings."

FORMATTING RULES (CRITICAL):
- When listing items, ALWAYS use line breaks between each item
- For numbered lists, put each number on a NEW LINE like this:

1. First item

2. Second item

3. Third item

- Use blank lines to separate paragraphs for better readability
- Format data clearly with proper spacing

Context about the platform:
- The platform analyzes 332 subzones across Singapore
- It computes a Hawker-Opportunity Score (H-Score) based on:

  1. Demand Analysis (Dem): Population density and demographics
  
  2. Supply Evaluation (Sup): Existing hawker centres and food establishments
  
  3. Accessibility Score (Acc): Proximity to MRT stations and bus stops

- Users can view interactive maps, compare subzones, and export detailed reports
- The platform uses data from URA, LTA, and Singapore Census

Your role is to:
- Answer questions about how the platform works
- Explain the scoring methodology
- Help users understand provided subzone data
- Guide users to use the map for exploration

Be concise, friendly, accurate, and WELL-FORMATTED. Use Singapore context when relevant."""
    
    def _format_response(self, text: str) -> str:
        """
        Post-process AI response to ensure proper formatting with line breaks
        """
        # First, normalize whitespace - remove excessive spaces but keep newlines
        text = re.sub(r' +', ' ', text)
        
        # Fix broken numbered list items - detect pattern like "1." followed by uppercase and consolidate
        # This handles cases where the number and name are split across lines
        text = re.sub(r'(\d+)\.\s*\n+\s*([A-Z])', r'\1. \2', text)
        
        # Add proper spacing before numbered items (ensure they start on new lines)
        text = re.sub(r'(?<!\n\n)(\d+\.\s+[A-Z])', r'\n\n\1', text)
        
        # Fix "H-Score:" being split from its value
        text = re.sub(r'H-Score:\s*\n+\s*(\d)', r'H-Score: \1', text)
        
        # Consolidate bullet point lines that are broken
        text = re.sub(r'-\s+([^:\n]+):\s*\n+\s*', r'- \1: ', text)
        
        # Add spacing after each complete subzone entry (before next number)
        text = re.sub(r'(Bus Stops:\s*\d+)\s*(\d+\.)', r'\1\n\n\2', text)
        
        # Ensure proper paragraph breaks
        text = re.sub(r'([.!?])\s+([A-Z][a-z])', r'\1\n\n\2', text)
        
        # Clean up excessive newlines (more than 2)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        return text.strip()
    
    def _detect_data_request(self, user_message: str) -> Optional[Dict]:
        """
        Detect if user is asking for specific data (rankings, top subzones, etc.)
        Returns dict with request type and parameters, or None
        """
        msg_lower = user_message.lower()
        
        # Check for ranking queries
        rank_patterns = [
            (r'rank\s+(\d+)', 'specific_rank'),
            (r'top\s+(\d+)', 'top_n'),
            (r'best\s+(\d+)', 'top_n'),
            (r'#(\d+)', 'specific_rank'),
            (r'number\s+(\d+)', 'specific_rank'),
        ]
        
        for pattern, request_type in rank_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                n = int(match.group(1))
                return {'type': request_type, 'n': n}
        
        # Check for general top/best queries without numbers
        if any(word in msg_lower for word in ['rank 1', 'number 1', '#1', 'best subzone', 'top subzone']):
            return {'type': 'specific_rank', 'n': 1}
        
        if any(word in msg_lower for word in ['top', 'best', 'highest ranked']) and 'subzone' in msg_lower:
            return {'type': 'top_n', 'n': 10}
        
        return None
    
    def _inject_subzone_context(self, messages: List[Dict[str, str]], subzone_data: List[Dict]) -> List[Dict[str, str]]:
        """
        Inject subzone data into the conversation context
        """
        if not subzone_data:
            return messages
        
        # Format subzone data nicely
        context = "\n\n[SUBZONE DATA - Use this data to answer the user's question]\n"
        context += "Here are the actual subzone rankings from our database:\n\n"
        
        for sz in subzone_data:
            context += f"Rank #{sz.get('H_rank', 'N/A')}: {sz.get('subzone', 'Unknown')}\n"
            context += f"  - H-Score: {sz.get('H_score', 'N/A'):.2f}\n"
            context += f"  - Planning Area: {sz.get('planning_area', 'N/A')}\n"
            context += f"  - Population: {sz.get('population', 'N/A'):,}\n"
            context += f"  - Existing Hawker Centres: {sz.get('hawker', 0)}\n"
            context += f"  - MRT Stations: {sz.get('mrt', 0)}\n"
            context += f"  - Bus Stops: {sz.get('bus', 0)}\n\n"
        
        context += "Please answer based on this data only.\n"
        
        # Add context as a system message before the user's last message
        enhanced_messages = messages[:-1] + [
            {"role": "system", "content": context},
            messages[-1]
        ]
        
        return enhanced_messages

    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        stream: bool = False
    ) -> AsyncGenerator[str, None] | Dict:
        """
        Send chat completion request to Ollama
        
        Args:
            messages: List of message dicts with 'role' and 'content'
            stream: Whether to stream the response
            
        Returns:
            Generator yielding response chunks if stream=True, else complete response dict
        """
        # Add system prompt
        full_messages = [
            {"role": "system", "content": self.system_prompt}
        ] + messages
        
        url = f"{self.base_url}/api/chat"
        
        payload = {
            "model": self.model,
            "messages": full_messages,
            "stream": stream
        }
        
        if stream:
            # For streaming, return the async generator directly
            return self._stream_response(url, payload)
        else:
            # For non-streaming, use context manager
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                try:
                    print(f"[Chat Service] Sending request to Ollama: {url}")
                    print(f"[Chat Service] Model: {self.model}")
                    response = await client.post(url, json=payload)
                    print(f"[Chat Service] Response status: {response.status_code}")
                    response.raise_for_status()
                    result = response.json()
                    print(f"[Chat Service] Got response from Ollama")
                    content = result.get("message", {}).get("content", "")
                    # Format the response for better readability
                    formatted_content = self._format_response(content)
                    return {
                        "content": formatted_content,
                        "model": result.get("model"),
                        "done": result.get("done", True)
                    }
                except httpx.TimeoutException as e:
                    print(f"[Chat Service] Timeout error: {e}")
                    raise Exception(f"Ollama timeout after {self.timeout}s. Model might be loading.")
                except httpx.ConnectError as e:
                    print(f"[Chat Service] Connection error: {e}")
                    raise Exception(f"Cannot connect to Ollama at {self.base_url}")
                except Exception as e:
                    print(f"[Chat Service] Error: {e}")
                    raise
    
    async def _stream_response(
        self, 
        url: str, 
        payload: dict
    ) -> AsyncGenerator[str, None]:
        """Stream Ollama response chunk by chunk"""
        # Create a new client for streaming that stays alive
        print(f"[Chat Service] Starting stream to Ollama: {url}")
        print(f"[Chat Service] Model: {self.model}")
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                async with client.stream("POST", url, json=payload) as response:
                    print(f"[Chat Service] Stream response status: {response.status_code}")
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                if "message" in chunk:
                                    content = chunk["message"].get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
                print(f"[Chat Service] Stream completed")
            except httpx.TimeoutException as e:
                print(f"[Chat Service] Stream timeout error: {e}")
                yield f"[ERROR: Ollama timeout after {self.timeout}s]"
            except Exception as e:
                print(f"[Chat Service] Stream error: {e}")
                yield f"[ERROR: {str(e)}]"
    
    async def generate_subzone_insight(self, subzone_data: dict) -> str:
        """
        Generate AI insight for a specific subzone
        
        Args:
            subzone_data: Dictionary containing subzone information
            
        Returns:
            AI-generated insight text
        """
        prompt = f"""Based on the following subzone data, provide a brief analysis 
of the hawker centre opportunity (2-3 sentences):

Subzone: {subzone_data.get('name', 'Unknown')}
Region: {subzone_data.get('region', 'Unknown')}
H-Score: {subzone_data.get('h_score', 0):.2f}
Rank: {subzone_data.get('rank', 'N/A')}
Population: {subzone_data.get('population', 'N/A')}
Existing Hawker Centres: {subzone_data.get('hawker_count', 0)}
MRT Exits: {subzone_data.get('mrt_count', 0)}
Bus Stops: {subzone_data.get('bus_count', 0)}

Provide a concise business insight."""

        messages = [{"role": "user", "content": prompt}]
        response = await self.chat_completion(messages, stream=False)
        return response["content"]


# Singleton instance
chat_service = ChatService()

