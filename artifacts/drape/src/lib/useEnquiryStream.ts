import { useState, useCallback, useRef } from "react";
import { getToken } from "@/lib/token-storage";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUrls?: string[];
};

export type FashionBrief = {
  style_summary?: string;
  occasion?: string;
  aesthetic_direction?: string;
  color_palette?: string[];
  fabric_preferences?: string;
  silhouette?: string;
  budget_min?: number;
  budget_max?: number;
  timeline_days?: number;
  special_notes?: string;
  image_prompts?: string[];
};

export type BriefStatus =
  | "collecting"
  | "awaiting_confirmation"
  | "revision_requested"
  | "confirmed"
  | "finalized"
  | "forwarded";

export type SessionSummary = {
  id: string;
  designerSlug: string | null;
  createdAt: string;
  updatedAt: string;
  briefReady: boolean;
  messageCount: number;
  lastMessage: { role: string; preview: string; createdAt: string } | null;
};

export function useEnquiryStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [brief, setBrief] = useState<FashionBrief | null>(null);
  const [briefReady, setBriefReady] = useState(false);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("collecting");
  const [briefId, setBriefId] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [generateImages, setGenerateImages] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string, imageUrls: string[] = [], designerSlug?: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        imageUrls,
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setIsStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/ai/enquiry`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ message: text, sessionId, designerSlug, imageUrls }),
          signal: ctrl.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error((errData as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const data = await res.json() as {
          reply: string;
          sessionId: string;
          briefReady: boolean;
          brief: FashionBrief | null;
          briefId?: string | null;
          briefStatus?: BriefStatus;
          awaitingConfirmation?: boolean;
          generateImages?: boolean;
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: data.reply } : m)),
        );

        setSessionId(data.sessionId);

        if (data.briefReady && data.brief) {
          setBrief(data.brief);
          setBriefReady(true);
        }

        if (data.briefId) {
          setBriefId(data.briefId);
        }

        if (data.briefStatus) {
          setBriefStatus(data.briefStatus);
          setAwaitingConfirmation(data.briefStatus === "awaiting_confirmation");
        }

        if (data.generateImages) {
          setGenerateImages(true);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, something went wrong. Please try again." }
                : m,
            ),
          );
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, sessionId],
  );

  // Select an image from the lookbook — attaches it to the brief
  const selectImage = useCallback(
    async (imageId: string, imageUrl: string, prompt: string, promptIndex: number) => {
      if (!briefId && !sessionId) return;
      const token = getToken();
      try {
        const res = await fetch(`${API_BASE}/api/ai/select-look`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ briefId, sessionId, imageId, imageUrl, prompt, promptIndex }),
        });
        if (res.ok) {
          setSelectedImageId(imageId);
          setSelectedImageUrl(imageUrl);
        }
      } catch {
        // Non-critical — selection is still shown locally
        setSelectedImageId(imageId);
        setSelectedImageUrl(imageUrl);
      }
    },
    [briefId, sessionId],
  );

  // Confirm the brief (Yes button)
  const confirmBrief = useCallback(
    async (): Promise<{ reply: string } | null> => {
      if (!briefId && !sessionId) return null;
      const token = getToken();
      try {
        const res = await fetch(`${API_BASE}/api/ai/brief/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ briefId, sessionId, confirm: true }),
        });
        const data = await res.json() as { reply?: string; briefStatus?: BriefStatus };
        if (data.briefStatus) {
          setBriefStatus(data.briefStatus);
          setAwaitingConfirmation(false);
        }
        if (data.reply) {
          const msg: Message = { id: crypto.randomUUID(), role: "assistant", content: data.reply };
          setMessages((prev) => [...prev, msg]);
        }
        return data as { reply: string };
      } catch {
        return null;
      }
    },
    [briefId, sessionId],
  );

  // Decline confirmation (No button) — AI will ask what to change
  const declineBrief = useCallback(
    async (): Promise<void> => {
      if (!briefId && !sessionId) return;
      const token = getToken();
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);
      try {
        const res = await fetch(`${API_BASE}/api/ai/brief/confirm`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ briefId, sessionId, confirm: false }),
        });
        const data = await res.json() as { reply?: string; briefStatus?: BriefStatus };
        if (data.briefStatus) {
          setBriefStatus(data.briefStatus);
          setAwaitingConfirmation(false);
        }
        if (data.reply) {
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: data.reply! } : m)),
          );
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "What would you like to change before I finalise the brief?" }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [briefId, sessionId],
  );

  const loadSession = useCallback(
    (
      sid: string,
      msgs: Message[],
      isBriefReady: boolean,
      loadedBrief: FashionBrief | null,
      loadedBriefStatus?: BriefStatus,
      loadedBriefId?: string | null,
      loadedSelectedImageId?: string | null,
      loadedSelectedImageUrl?: string | null,
    ) => {
      abortRef.current?.abort();
      setSessionId(sid);
      setMessages(msgs);
      setBriefReady(isBriefReady);
      setBrief(loadedBrief);
      setBriefStatus(loadedBriefStatus ?? "collecting");
      setAwaitingConfirmation(loadedBriefStatus === "awaiting_confirmation");
      setBriefId(loadedBriefId ?? null);
      setSelectedImageId(loadedSelectedImageId ?? null);
      setSelectedImageUrl(loadedSelectedImageUrl ?? null);
      setGenerateImages(false);
      setIsStreaming(false);
    },
    [],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setBrief(null);
    setBriefReady(false);
    setBriefStatus("collecting");
    setAwaitingConfirmation(false);
    setBriefId(null);
    setSelectedImageId(null);
    setSelectedImageUrl(null);
    setGenerateImages(false);
    setIsStreaming(false);
  }, []);

  return {
    messages,
    sessionId,
    isStreaming,
    brief,
    briefReady,
    briefStatus,
    briefId,
    awaitingConfirmation,
    selectedImageId,
    selectedImageUrl,
    generateImages,
    setGenerateImages,
    sendMessage,
    selectImage,
    confirmBrief,
    declineBrief,
    loadSession,
    reset,
  };
}

// Fetch previous sessions for a designer
export async function fetchSessionsForDesigner(designerSlug: string): Promise<SessionSummary[]> {
  const token = getToken();
  if (!token) return [];
  try {
    const res = await fetch(
      `${API_BASE}/api/ai/sessions?designerSlug=${encodeURIComponent(designerSlug)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

// Fetch all messages for a session
export async function fetchSessionMessages(sessionId: string): Promise<{
  messages: Message[];
  brief: FashionBrief | null;
  briefReady: boolean;
  briefStatus?: BriefStatus;
  briefId?: string | null;
  selectedImageId?: string | null;
  selectedImageUrl?: string | null;
} | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API_BASE}/api/ai/session/${sessionId}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const messages: Message[] = (data.messages ?? []).map((m: { id: string; role: "user" | "assistant"; content: string; imageUrls?: string[] }) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imageUrls: m.imageUrls ?? [],
    }));
    const brief = data.brief
      ? {
          style_summary: data.brief.styleSummary,
          occasion: data.brief.occasion,
          aesthetic_direction: data.brief.aestheticDirection,
          color_palette: data.brief.colorPalette,
          fabric_preferences: data.brief.fabricPreferences,
          silhouette: data.brief.silhouette,
          budget_min: data.brief.budgetMin,
          budget_max: data.brief.budgetMax,
          timeline_days: data.brief.timelineDays,
          special_notes: data.brief.specialNotes,
          image_prompts: data.brief.imagePrompts,
        }
      : null;
    return {
      messages,
      brief,
      briefReady: data.session?.briefReady ?? false,
      briefStatus: data.brief?.status ?? "collecting",
      briefId: data.brief?.id ?? null,
      selectedImageId: data.brief?.selectedImageId ?? null,
      selectedImageUrl: data.brief?.selectedImageUrl ?? null,
    };
  } catch {
    return null;
  }
}
