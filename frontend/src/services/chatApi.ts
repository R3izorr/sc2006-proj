/**
 * Chat API service
 */

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model?: string;
}

/**
 * Send chat message (non-streaming)
 */
export async function sendChatMessage(
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch("/chat/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat failed: ${response.statusText} - ${error}`);
  }

  return response.json();
}

/**
 * Send chat message with streaming response
 */
export async function* streamChatMessage(
  messages: ChatMessage[]
): AsyncGenerator<string, void, unknown> {
  const accessToken = localStorage.getItem("accessToken");

  console.log("[Chat API] Starting stream request...");
  console.log("[Chat API] Token present:", !!accessToken);
  console.log("[Chat API] Messages count:", messages.length);

  const response = await fetch("/chat/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messages,
      stream: true,
    }),
  });

  console.log("[Chat API] Response status:", response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Chat API] Error response:", errorText);
    throw new Error(`Chat stream failed (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error("No response body");
  }

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }
          yield data;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Get AI insight for a subzone
 */
export async function getSubzoneInsight(
  subzoneName: string,
  subzoneData: any
): Promise<ChatResponse> {
  const accessToken = localStorage.getItem("accessToken");

  const response = await fetch("/chat/subzone-insight", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      subzone_name: subzoneName,
      subzone_data: subzoneData,
    }),
  });

  if (!response.ok) {
    throw new Error(`Insight generation failed: ${response.statusText}`);
  }

  return response.json();
}

