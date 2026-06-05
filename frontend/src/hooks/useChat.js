import { useState, useCallback, useRef } from "react";
import { sendChatMessage } from "../services/api";
import { v4 as uuidv4 } from "uuid";

export function useChat(sessionId) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState(null);

  const sendMessage = useCallback(
    async (content, model, overrideSessionId) => {
      if (!content.trim() || isStreaming) return;

      // Use override (newly created) session id if provided
      const activeSessionId = overrideSessionId || sessionId;

      if (!activeSessionId) {
        console.error("No session ID available");
        return;
      }

      setError(null);

      // Add user message immediately
      const userMessage = {
        id: uuidv4(),
        role: "user",
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);
      setStreamingContent("");

      const assistantId = uuidv4();

      try {
        console.log("Sending to session:", activeSessionId);

        const response = await sendChatMessage({
          message: content.trim(),
          session_id: activeSessionId,
          model: model || "llama3",
          stream: true,
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let metadata = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const event = JSON.parse(jsonStr);

              if (event.type === "metadata") {
                metadata = event;
              } else if (event.type === "token") {
                fullContent += event.content;
                setStreamingContent(fullContent);
              } else if (event.type === "done") {
                const assistantMessage = {
                  id: assistantId,
                  role: "assistant",
                  content: fullContent,
                  timestamp: new Date().toISOString(),
                  metadata: metadata,
                };
                setMessages((prev) => [...prev, assistantMessage]);
                setStreamingContent("");
              } else if (event.type === "error") {
                throw new Error(event.content);
              }
            } catch (parseError) {
              if (parseError.message !== "Unexpected end of JSON input") {
                console.warn("SSE parse warning:", parseError.message);
              }
            }
          }
        }
      } catch (err) {
        console.error("Chat error:", err);

        // Extract readable error message
        let errorMsg = "Something went wrong. Please try again.";
        if (err.message && err.message !== "[object Object]") {
          errorMsg = err.message;
        }

        setError(errorMsg);
        setStreamingContent("");

        setMessages((prev) => [
          ...prev,
          {
            id: assistantId,
            role: "assistant",
            content: `⚠️ Error: ${errorMsg}`,
            timestamp: new Date().toISOString(),
            isError: true,
          },
        ]);
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [sessionId, isStreaming],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingContent("");
    setError(null);
  }, []);

  return {
    messages,
    setMessages,
    isStreaming,
    streamingContent,
    error,
    sendMessage,
    clearMessages,
  };
}
