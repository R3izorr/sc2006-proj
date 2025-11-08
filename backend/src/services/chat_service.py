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
2. When asked about rankings, scores, or specific subzones, look for the [SUBZONE DATA] section
3. NEVER make up or guess subzone names, rankings, scores, or statistics
4. If you don't have the data in context, say: "I don't have that specific data in this conversation. Please use the interactive map to explore subzone details."

FORMATTING RULES (CRITICAL):
- When listing items, ALWAYS use line breaks between each item
- For numbered lists, put EACH NUMBER ON A COMPLETELY NEW LINE like this:

1. First item
2. Second item
3. Third item

NOT like this: "1. First item 2. Second item 3. Third item"

- ALWAYS add a line break after each numbered list item
- Use blank lines to separate paragraphs for better readability
- Format data clearly with proper spacing
- When presenting subzone data, organize it clearly with headers and bullet points

ANSWERING RULES (CRITICAL - FOLLOW STRICTLY):
- Be CLEAR and DECISIVE - give definitive answers, not vague possibilities
- When asked "which has the most/highest", identify THE SINGLE answer with the maximum value
- Give ONE answer only - never list multiple candidates or show comparison tables
- Use ACTUAL subzone names from the data, NEVER generic labels like "Subzone 1"
- COPY subzone names EXACTLY character-by-character from the data
- DO NOT modify, abbreviate, or change subzone names (e.g., 'Tampines East' ≠ 'Tampines North')
- If data shows 'Bedok South', write 'Bedok South' - NOT 'Bedok', NOT 'Bedok North', NOT anything else
- State your answer confidently with exact numbers from the data
- Format: "The subzone with the most [X] is [ACTUAL_NAME] with [NUMBER] [units] (Rank #Y)."
- Do NOT explain your search process - just state the answer directly

Platform Overview:
The platform analyzes 332 subzones across Singapore and computes a Hawker-Opportunity Score (H-Score) for each.

H-Score Components:
1. Demand Analysis (Dem): Based on population density and demographics (age groups 0-25, 25-65, 65+)
2. Supply Evaluation (Sup): Considers existing hawker centres in the area
3. Accessibility Score (Acc): Evaluates proximity to MRT stations/exits and bus stops

CRITICAL UNDERSTANDING - Ranking System:
- Rankings are BASED ON H-Score (higher H-Score = better rank)
- Rank #1 = HIGHEST H-Score (best opportunity)
- Rank #332 = LOWEST H-Score (worst opportunity)
- When asked "highest/best/most H-Score", answer with Rank #1
- When asked "lowest/worst H-Score", answer with the highest rank number
- The ranking directly reflects the H-Score ordering

Data Available:
For each subzone, we track:
- Ranking (H_rank): Overall position from 1 (best/highest H-Score) to 332 (lowest H-Score)
- H-Score: Composite score (higher is better, determines ranking)
- Planning Area: The larger region the subzone belongs to
- Total Population: Resident population count
- Population by Age Groups: 0-25, 25-65, and 65+ years old
- Existing Hawker Centres: Number of hawker centres currently in the subzone
- MRT Stations/Exits: Number of MRT access points
- Bus Stops: Number of bus stops

Your Role:
- Answer questions about rankings, scores, and subzone statistics using provided data
- Explain the scoring methodology and what makes a good location
- Compare subzones when data is provided
- Help users understand demographic and infrastructure patterns
- When asked "which subzone has the most/highest/maximum":
  * Look at the '⚠️ MAXIMUM VALUES' section at the TOP of the data
  * Find the line matching the user's question (population/MRT/bus/hawker)
  * Copy the EXACT subzone name and numbers from that line
  * Give your answer using those EXACT values - do NOT search elsewhere
  * Never use generic labels, never list multiple options, never explain your process
  * Format: "The subzone with the most [X] is [NAME] with [NUMBER] [units] (Rank #Y)."
  * Example: "The subzone with the most population is Tampines East with 131,010 residents (Rank #1)."
- When asked for "top N subzones by [ATTRIBUTE]" (e.g., "top 5 with most population"):
  * Look for '🚨🚨🚨 TOP N SUBZONES BY [ATTRIBUTE]' section at the VERY TOP
  * Find lines with format: 'SUBZONE NAME: 'Name' | VALUE: number'
  * Copy the EXACT text inside the quotes (e.g., if it says 'Tampines East', write 'Tampines East')
  * DO NOT change, abbreviate, or modify the name (e.g., don't change 'Tampines East' to 'Tampines North')
  * Present them with their exact values in order (1, 2, 3...)
  * CRITICAL: The names are in QUOTES - copy them character-by-character
- Guide users to the interactive map for visual exploration

Be concise, accurate, data-driven, and WELL-FORMATTED. Always cite the actual numbers from the data provided."""
    
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
        Detect if user is asking for specific data (rankings, top subzones, stats, etc.)
        Returns dict with request type and parameters, or None
        """
        msg_lower = user_message.lower()
        
        # Check for "top N by attribute" queries (e.g., "top 5 with most population")
        top_n_by_attribute_patterns = [
            (r'top\s+(\d+).*(?:with\s+)?(?:the\s+)?(most|highest|maximum)\s+(population|residents|people)', 'top_n_by_attribute'),
            (r'top\s+(\d+).*(?:with\s+)?(?:the\s+)?(most|highest|maximum)\s+(mrt|mrt station|mrt exit)', 'top_n_by_attribute'),
            (r'top\s+(\d+).*(?:with\s+)?(?:the\s+)?(most|highest|maximum)\s+(bus|bus stop)', 'top_n_by_attribute'),
            (r'top\s+(\d+).*(?:with\s+)?(?:the\s+)?(most|highest|maximum)\s+(hawker|hawker centre|hawker center)', 'top_n_by_attribute'),
            (r'(\d+)\s+subzones?\s+with\s+(the\s+)?(most|highest|maximum)\s+(population|mrt|bus|hawker)', 'top_n_by_attribute'),
        ]
        
        for pattern, request_type in top_n_by_attribute_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                n = int(match.group(1))
                # Detect which attribute they're asking about
                attribute = None
                if 'population' in msg_lower or 'resident' in msg_lower or 'people' in msg_lower:
                    attribute = 'population'
                elif 'mrt' in msg_lower:
                    attribute = 'mrt'
                elif 'bus' in msg_lower:
                    attribute = 'bus'
                elif 'hawker' in msg_lower:
                    attribute = 'hawker'
                return {'type': request_type, 'n': 332, 'top_n': n, 'attribute': attribute}
        
        # Check for "most/highest/maximum" or "least/lowest/minimum" queries for specific attributes
        # These need more data to search through
        attribute_extremes_patterns = [
            (r'(most|highest|maximum|largest|greatest)\s+(population|residents|people)', 'find_max_attribute'),
            (r'(most|highest|maximum)\s+(mrt|mrt station|mrt exit)', 'find_max_attribute'),
            (r'(most|highest|maximum)\s+(bus|bus stop)', 'find_max_attribute'),
            (r'(most|highest|maximum)\s+(hawker|hawker centre|hawker center)', 'find_max_attribute'),
            (r'(least|lowest|minimum|smallest|fewest)\s+(population|residents|people)', 'find_max_attribute'),
            (r'(least|lowest|minimum|fewest)\s+(mrt|mrt station|mrt exit)', 'find_max_attribute'),
            (r'(least|lowest|minimum|fewest)\s+(bus|bus stop)', 'find_max_attribute'),
            (r'(least|lowest|minimum|fewest)\s+(hawker|hawker centre|hawker center)', 'find_max_attribute'),
            (r'which\s+subzone\s+has\s+(the\s+)?(most|highest|maximum|least|lowest|minimum)\s+(population|mrt|bus|hawker)', 'find_max_attribute'),
            (r'subzone\s+with\s+(the\s+)?(most|highest|maximum|least|lowest|minimum)\s+(population|mrt|bus|hawker)', 'find_max_attribute'),
        ]
        
        for pattern, request_type in attribute_extremes_patterns:
            if re.search(pattern, msg_lower):
                # Fetch ALL subzones to find the true maximum/minimum
                # We need ALL 332 subzones because:
                # - High population doesn't correlate with high H-Score rank
                # - A subzone ranked #200 by H-Score could have the highest population
                # - We must search through the entire dataset to find the true maximum
                return {'type': request_type, 'n': 332}
        
        # Check for ranking queries with numbers
        rank_patterns = [
            (r'rank\s+(\d+)', 'specific_rank'),
            (r'top\s+(\d+)', 'top_n'),
            (r'best\s+(\d+)', 'top_n'),
            (r'#(\d+)', 'specific_rank'),
            (r'ranked\s+(\d+)', 'specific_rank'),
        ]
        
        for pattern, request_type in rank_patterns:
            match = re.search(pattern, msg_lower)
            if match:
                n = int(match.group(1))
                return {'type': request_type, 'n': n}
        
        # Check for general top/best queries without numbers
        if any(word in msg_lower for word in ['rank 1', 'number 1', '#1', 'best subzone', 'top subzone']):
            return {'type': 'specific_rank', 'n': 1}
        
        # Check for highest/most H-score queries (should return rank 1)
        # Match: h-score, h_score, h score, hscore
        h_score_patterns = [
            r'(highest|most|best|maximum|greatest|top)\s+(h[-_\s]?score)',
            r'which\s+subzone\s+has\s+(the\s+)?(highest|most|best|maximum)\s+(h[-_\s]?score)',
            r'subzone\s+with\s+(the\s+)?(highest|most|best|maximum)\s+(h[-_\s]?score)',
        ]
        
        for pattern in h_score_patterns:
            if re.search(pattern, msg_lower):
                return {'type': 'specific_rank', 'n': 1}
        
        if any(word in msg_lower for word in ['top', 'best', 'highest ranked']) and 'subzone' in msg_lower:
            return {'type': 'top_n', 'n': 10}
        
        # Check for questions about rankings, scores, or statistics
        data_keywords = [
            'ranking', 'rank', 'h-score', 'h score', 'score',
            'population', 'demographic', 'residents',
            'mrt', 'bus stop', 'hawker centre', 'hawker center',
            'infrastructure', 'facilities',
            'highest', 'lowest', 'most', 'least',
            'compare', 'comparison', 'versus', 'vs',
            'which subzone', 'what subzone', 'tell me about',
            'how many', 'statistics', 'data', 'info about'
        ]
        
        # If any data keywords are present and "subzone" is mentioned, fetch top data
        if any(keyword in msg_lower for keyword in data_keywords):
            if 'subzone' in msg_lower or 'area' in msg_lower or 'location' in msg_lower:
                # Default to top 20 for general data questions
                return {'type': 'top_n', 'n': 20}
        
        # Check for questions about specific planning areas or regions
        if any(word in msg_lower for word in ['planning area', 'region', 'district']):
            return {'type': 'top_n', 'n': 30}
        
        return None
    
    def _inject_subzone_context(self, messages: List[Dict[str, str]], subzone_data: List[Dict], request_info: Optional[Dict] = None) -> List[Dict[str, str]]:
        """
        Inject comprehensive subzone data into the conversation context
        """
        if not subzone_data:
            return messages
        
        # Sort by rank to ensure proper ordering
        sorted_data = sorted(subzone_data, key=lambda x: x.get('H_rank', 999))
        
        # Pre-compute maximum values to highlight them clearly
        max_pop = max(sorted_data, key=lambda x: x.get('population', 0))
        max_mrt = max(sorted_data, key=lambda x: x.get('mrt', 0))
        max_bus = max(sorted_data, key=lambda x: x.get('bus', 0))
        max_hawker = max(sorted_data, key=lambda x: x.get('hawker', 0))
        
        # Create a summary section first
        context = "\n\n[SUBZONE DATA - Use this data to answer the user's question]\n"
        context += "=" * 80 + "\n"
        context += f"SUMMARY: Showing {len(sorted_data)} subzone(s) with complete data\n"
        context += "=" * 80 + "\n\n"
        
        # If this is a "top N by attribute" query, add a sorted list
        if request_info and request_info.get('type') == 'top_n_by_attribute':
            top_n = request_info.get('top_n', 10)
            attribute = request_info.get('attribute', 'population')
            
            # Sort by the specific attribute
            sorted_by_attr = sorted(sorted_data, key=lambda x: x.get(attribute, 0), reverse=True)[:top_n]
            
            attr_labels = {
                'population': ('POPULATION', 'residents'),
                'mrt': ('MRT STATIONS', 'MRT exits'),
                'bus': ('BUS STOPS', 'bus stops'),
                'hawker': ('HAWKER CENTRES', 'hawker centres')
            }
            
            attr_label, attr_unit = attr_labels.get(attribute, ('ATTRIBUTE', 'units'))
            
            context += f"🚨🚨🚨 TOP {top_n} SUBZONES BY {attr_label} 🚨🚨🚨\n"
            context += "=" * 80 + "\n"
            context += "⚠️ COPY THESE EXACTLY - DO NOT CHANGE ANY NAMES OR NUMBERS! ⚠️\n"
            context += "=" * 80 + "\n"
            for i, sz in enumerate(sorted_by_attr, 1):
                name = sz.get('subzone', 'Unknown')
                value = sz.get(attribute, 0)
                rank = sz.get('H_rank', 'N/A')
                if attribute == 'population':
                    context += f"{i}. SUBZONE NAME: '{name}' | VALUE: {value:,} {attr_unit} | H-Score Rank: #{rank}\n"
                else:
                    context += f"{i}. SUBZONE NAME: '{name}' | VALUE: {value} {attr_unit} | H-Score Rank: #{rank}\n"
            context += "=" * 80 + "\n"
            context += f"🚨 MANDATORY: Copy the SUBZONE NAME in quotes EXACTLY as written above!\n"
            context += f"🚨 DO NOT change 'Tampines East' to 'Tampines North' or any other variation!\n"
            context += f"🚨 DO NOT invent names - use ONLY the {top_n} names listed above!\n"
            context += f"🚨 If you change even ONE character of the subzone names, you FAIL!\n"
            context += "=" * 80 + "\n\n"
        
        # Add MAXIMUM VALUES section for quick reference
        context += "⚠️ MAXIMUM VALUES (USE THESE TO ANSWER 'MOST/HIGHEST' QUESTIONS):\n"
        context += "-" * 80 + "\n"
        context += f"HIGHEST POPULATION: {max_pop.get('subzone')} with {max_pop.get('population', 0):,} residents (Rank #{max_pop.get('H_rank', 'N/A')})\n"
        context += f"MOST MRT STATIONS:  {max_mrt.get('subzone')} with {max_mrt.get('mrt', 0)} MRT exits (Rank #{max_mrt.get('H_rank', 'N/A')})\n"
        context += f"MOST BUS STOPS:     {max_bus.get('subzone')} with {max_bus.get('bus', 0)} bus stops (Rank #{max_bus.get('H_rank', 'N/A')})\n"
        context += f"MOST HAWKER CENTRES: {max_hawker.get('subzone')} with {max_hawker.get('hawker', 0)} hawker centres (Rank #{max_hawker.get('H_rank', 'N/A')})\n"
        context += "-" * 80 + "\n\n"
        
        # Only add detailed tables if we DON'T have a top N by attribute request
        # (to avoid overwhelming the context window)
        if not (request_info and request_info.get('type') == 'top_n_by_attribute'):
            # Quick reference table (only for non-top-N queries)
            # Limit to first 50 for context window
            display_limit = min(len(sorted_data), 50)
            context += "QUICK REFERENCE TABLE (showing top 50 by H-Score rank):\n"
            context += "-" * 80 + "\n"
            context += f"{'Rank':<6} {'Subzone':<30} {'H-Score':<10} {'Pop':<10} {'MRT':<5} {'Bus':<5} {'Hawker':<7}\n"
            context += "-" * 80 + "\n"
            for sz in sorted_data[:display_limit]:
                rank = sz.get('H_rank', 'N/A')
                name = sz.get('subzone', 'Unknown')[:28]
                h_score = sz.get('H_score')
                pop = sz.get('population', 0)
                mrt = sz.get('mrt', 0)
                bus = sz.get('bus', 0)
                hawker = sz.get('hawker', 0)
                
                score_str = f"{h_score:.3f}" if h_score is not None else "N/A"
                pop_str = f"{pop:,}" if pop else "0"
                
                context += f"#{rank:<5} {name:<30} {score_str:<10} {pop_str:<10} {mrt:<5} {bus:<5} {hawker:<7}\n"
            context += "-" * 80 + "\n\n"
        
        context += "=" * 80 + "\n"
        context += "CRITICAL INSTRUCTIONS FOR AI - READ CAREFULLY:\n"
        context += "=" * 80 + "\n\n"
        context += "1. Use ONLY the data provided above - do not make up or guess any information\n\n"
        context += "2. IMPORTANT: Rankings are based on H-Score:\n"
        context += "   - Rank #1 = HIGHEST H-Score (best opportunity)\n"
        context += "   - Higher rank number = LOWER H-Score\n"
        context += "   - When asked 'highest/most/best H-Score', answer with Rank #1\n\n"
        
        # Add special instructions based on query type
        if request_info and request_info.get('type') == 'top_n_by_attribute':
            context += "3. 🚨🚨🚨 CRITICAL: YOU ARE ANSWERING A 'TOP N' QUESTION 🚨🚨🚨\n\n"
            context += "   The user asked for a LIST of subzones.\n"
            context += f"   The answer is already prepared for you at the VERY TOP.\n\n"
            context += "   MANDATORY PROCESS (FOLLOW EXACTLY):\n"
            context += f"   Step 1: Scroll to the VERY TOP and find the section starting with:\n"
            context += f"           '🚨🚨🚨 TOP {request_info.get('top_n')} SUBZONES BY'\n"
            context += "   Step 2: You will see a numbered list with format:\n"
            context += "           '1. SUBZONE NAME: 'Name' | VALUE: number | H-Score Rank: #X'\n"
            context += "   Step 3: Copy the EXACT text inside the QUOTES after 'SUBZONE NAME:'\n"
            context += "   Step 4: DO NOT modify, paraphrase, or abbreviate the name\n"
            context += "   Step 5: Present all entries from the list in order\n\n"
            context += "   ✅ CORRECT FORMAT:\n"
            context += "   'Here are the top 5 subzones by population:\n"
            context += "   1. [EXACT NAME FROM DATA] with [EXACT NUMBER] residents\n"
            context += "   2. [EXACT NAME FROM DATA] with [EXACT NUMBER] residents\n"
            context += "   ...'\n\n"
            context += "   ❌ DO NOT:\n"
            context += "   - Say 'I don't have that data' (YOU DO! IT'S AT THE TOP!)\n"
            context += "   - Change any subzone names\n"
            context += "   - Make up numbers\n"
            context += "   - Skip entries from the list\n\n"
            context += "   🚨 THE DATA IS RIGHT THERE! SCROLL UP AND USE IT!\n\n"
        else:
            context += "3. ⚠️ CRITICAL: When asked 'which subzone has the most/highest [ATTRIBUTE]':\n\n"
            context += "   MANDATORY PROCESS:\n"
            context += "   Step 1: Look at the '⚠️ MAXIMUM VALUES' section at the top\n"
            context += "   Step 2: Find the line matching the user's question (population/MRT/bus/hawker)\n"
            context += "   Step 3: Copy the EXACT subzone name and numbers from that line\n"
            context += "   Step 4: State your answer using those EXACT values\n"
            context += "   Step 5: Do NOT search elsewhere, do NOT make up names - use ONLY the pre-computed maximum\n\n"
        context += "   ⚠️ FORBIDDEN BEHAVIORS:\n"
        context += "   ❌ Do NOT list multiple subzones (e.g., 'Subzone 1, Subzone 2, Subzone 3...')\n"
        context += "   ❌ Do NOT show a comparison table with '...' ellipsis\n"
        context += "   ❌ Do NOT use generic labels like 'Subzone 1' - use REAL names from data\n"
        context += "   ❌ Do NOT explain the search process - just give the answer\n"
        context += "   ❌ Do NOT be uncertain or hedging - be definitive\n\n"
        context += "   ✅ CORRECT FORMAT (FOLLOW THIS EXACTLY):\n"
        context += "   'The subzone with the most population is [ACTUAL_SUBZONE_NAME] with [EXACT_NUMBER] residents (Rank #[X]).'\n\n"
        context += "   Example - If MAXIMUM VALUES section shows:\n"
        context += "   'HIGHEST POPULATION: Tampines East with 131,010 residents (Rank #1)'\n"
        context += "   \n"
        context += "   Then your answer should be:\n"
        context += "   'The subzone with the most population is Tampines East with 131,010 residents (Rank #1).'\n\n"
        context += "   ❌ NEVER do this:\n"
        context += "   'According to the data: Subzone 1: 50k, Subzone 2: 60k... The highest is Subzone 2 with 60k'\n"
        context += "   'The subzone with the most population is Bedok...' (if Bedok is not in MAXIMUM VALUES)\n\n"
        context += "4. When answering, cite specific numbers and rankings from this data\n"
        context += "5. Format your response with proper line breaks and spacing for readability\n"
        context += "6. If asked about data not shown above, acknowledge the limitation\n\n"
        context += "⚠️ REMEMBER: The user wants ONE clear answer with the actual subzone name. Be decisive!\n"
        context += "=" * 80 + "\n"
        
        # Add context as a system message before the user's last message
        enhanced_messages = messages[:-1] + [
            {"role": "system", "content": context},
            messages[-1]
        ]
        
        # Log context size for debugging
        context_chars = len(context)
        context_tokens_estimate = context_chars // 4  # Rough estimate: 1 token ≈ 4 chars
        print(f"[Chat Service] Context size: {context_chars:,} characters (~{context_tokens_estimate:,} tokens)")
        if context_tokens_estimate > 4000:
            print(f"[Chat Service] ⚠️ WARNING: Context is large! May exceed model limits.")
        
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
            "stream": stream,
            "options": {
                "num_ctx": 8192,  # Increase context window to 8K tokens
                "temperature": 0.1,  # Lower temperature for more factual responses
            }
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

