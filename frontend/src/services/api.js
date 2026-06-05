import axios from "axios";

const BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Chat API ────────────────────────────────────────────────────────────────

/**
 * Send a chat message and return a streaming EventSource-compatible fetch.
 * @param {Object} params
 * @param {string} params.message
 * @param {string} params.session_id
 * @param {string} [params.model]
 * @returns {Promise<Response>} - Raw fetch response for stream reading
 */
export async function sendChatMessage({
  message,
  session_id,
  model,
  stream = true,
}) {
  // Guard against missing session_id
  if (!session_id) {
    throw new Error("session_id is required");
  }

  const payload = {
    message,
    session_id,
    model: model || "llama3",
    stream: stream,
  };

  console.log("POST /chat payload:", payload);

  const response = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // Parse the actual FastAPI error
    try {
      const errorData = await response.json();
      console.error("FastAPI error response:", errorData);

      // FastAPI 422 returns { detail: [...] }
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          // Validation errors — show field + message
          const messages = errorData.detail
            .map((e) => `${e.loc?.join(".")}: ${e.msg}`)
            .join(", ");
          throw new Error(messages);
        }
        throw new Error(String(errorData.detail));
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (jsonError) {
      if (jsonError.message.startsWith("HTTP")) throw jsonError;
      throw new Error(
        `Request failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  return response;
}

/**
 * Get all chat sessions.
 */
export async function getSessions() {
  const { data } = await api.get("/chat/sessions");
  return data;
}

/**
 * Get messages for a specific session.
 */
export async function getSessionMessages(sessionId) {
  const { data } = await api.get(`/chat/sessions/${sessionId}/messages`);
  return data;
}

/**
 * Delete a chat session.
 */
export async function deleteSession(sessionId) {
  const { data } = await api.delete(`/chat/sessions/${sessionId}`);
  return data;
}

// ─── Upload API ───────────────────────────────────────────────────────────────

/**
 * Upload a document for RAG processing.
 */
export async function uploadDocument(file, sessionId, onProgress) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("session_id", sessionId);

  const { data } = await api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        const percent = Math.round((event.loaded * 100) / event.total);
        onProgress(percent);
      }
    },
  });

  return data;
}

/**
 * Get documents uploaded for a session.
 */
export async function getDocuments(sessionId) {
  const { data } = await api.get(`/documents/${sessionId}`);
  return data;
}

/**
 * Delete a document by ID.
 */
export async function deleteDocument(documentId) {
  const { data } = await api.delete(`/documents/${documentId}`);
  return data;
}

// ─── Memory API ───────────────────────────────────────────────────────────────

/**
 * Get memories for a session.
 */
export async function getMemories(sessionId) {
  const { data } = await api.get(`/memory/${sessionId}`);
  return data;
}

/**
 * Manually add a memory.
 */
export async function addMemory({ session_id, fact, category }) {
  const { data } = await api.post("/memory", { session_id, fact, category });
  return data;
}

/**
 * Delete a memory entry.
 */
export async function deleteMemory(memoryId) {
  const { data } = await api.delete(`/memory/${memoryId}`);
  return data;
}

// ─── System API ───────────────────────────────────────────────────────────────

/**
 * Check system health (Ollama + API).
 */
export async function checkHealth() {
  try {
    const { data } = await api.get("/health");
    return data;
  } catch {
    return { api: "unhealthy", ollama: { status: "unhealthy" } };
  }
}

export default api;
