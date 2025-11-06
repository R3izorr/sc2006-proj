import React, { useState, useRef, useEffect } from "react";
import {
  streamChatMessage,
  ChatMessage,
} from "../../services/chatApi";

interface ChatBoxProps {
  onClose: () => void;
  isOpen: boolean;
}

/**
 * Format AI response for better readability with proper line breaks
 */
function formatResponse(text: string): string {
  // First, normalize whitespace - remove excessive spaces but keep newlines
  text = text.replace(/ +/g, ' ');
  
  // Fix broken numbered list items - detect pattern like "1." followed by uppercase and consolidate
  text = text.replace(/(\d+)\.\s*\n+\s*([A-Z])/g, '$1. $2');
  
  // Add proper spacing before numbered items (ensure they start on new lines)
  text = text.replace(/(?<!\n\n)(\d+\.\s+[A-Z])/g, '\n\n$1');
  
  // Fix "H-Score:" being split from its value
  text = text.replace(/H-Score:\s*\n+\s*(\d)/g, 'H-Score: $1');
  
  // Consolidate bullet point lines that are broken
  text = text.replace(/-\s+([^:\n]+):\s*\n+\s*/g, '- $1: ');
  
  // Add spacing after each complete subzone entry (before next number)
  text = text.replace(/(Bus Stops:\s*\d+)\s*(\d+\.)/g, '$1\n\n$2');
  
  // Ensure proper paragraph breaks
  text = text.replace(/([.!?])\s+([A-Z][a-z])/g, '$1\n\n$2');
  
  // Clean up excessive newlines (more than 2)
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

export default function ChatBox({ onClose, isOpen }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant for the Hawker Opportunity Score Platform. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      textareaRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Use streaming for better UX
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Stream the response
      let hasContent = false;
      for await (const chunk of streamChatMessage([
        ...messages,
        userMessage,
      ])) {
        hasContent = true;
        assistantMessage.content += chunk;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...assistantMessage };
          return newMessages;
        });
      }

      // Format the complete response for better readability
      if (hasContent) {
        assistantMessage.content = formatResponse(assistantMessage.content);
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = { ...assistantMessage };
          return newMessages;
        });
      }

      // If no content received, remove the empty message
      if (!hasContent) {
        setMessages((prev) => prev.slice(0, -1));
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "No response received from the AI. Please try again.",
          },
        ]);
      }
    } catch (error: any) {
      console.error("Chat error:", error);
      
      // Remove the empty assistant message
      setMessages((prev) => prev.slice(0, -1));
      
      // Show detailed error message
      let errorMessage = "Sorry, I encountered an error. ";
      
      if (error.message?.includes("401")) {
        errorMessage += "Please log in again (your session may have expired).";
      } else if (error.message?.includes("fetch")) {
        errorMessage += "Cannot connect to the backend. Make sure it's running on http://127.0.0.1:8000";
      } else if (error.message?.includes("Chat stream failed")) {
        errorMessage += "Failed to connect to AI service. Please check if the backend and Ollama are running.";
      } else {
        errorMessage += error.message || "Unknown error occurred.";
      }
      
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '70px', // Position to the left of the controls
        width: '384px',
        height: '600px',
        zIndex: 1001, // Above the map controls
      }}
      className="bg-white rounded-2xl shadow-2xl flex flex-col border-2 border-gray-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-violet-600 to-purple-600 rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white">AI Assistant</h3>
            <p className="text-xs text-purple-100">Powered by Llama 3.1 8B</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          aria-label="Close chat"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white"
                  : "bg-white text-gray-800 shadow-md border border-gray-200"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </p>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything about hawker opportunities..."
            rows={2}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="self-end px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
            aria-label="Send message"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

