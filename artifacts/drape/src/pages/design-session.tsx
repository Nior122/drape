import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  ArrowLeft, Send, Sparkles, RotateCcw, CheckCircle2,
  MessageSquarePlus, Clock, ChevronLeft, Paperclip, ImageIcon,
  Loader2, ZoomIn, AlertCircle, Check, X, PanelRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useEnquiryStream,
  fetchSessionsForDesigner,
  fetchSessionMessages,
  type FashionBrief,
  type BriefStatus,
  type SessionSummary,
} from "@/lib/useEnquiryStream";
import { DesignBriefPanel } from "@/components/ai/DesignBriefPanel";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth";
import { getToken } from "@/lib/token-storage";
import { getDesignerBySlug } from "@/data/designers";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

const WELCOME = `Hi! I'm Aria, your personal style consultant on Drape.\n\nI'm here to help you articulate your perfect bespoke piece — from occasion and silhouette to fabrics and budget. As we chat, I'll build your complete brief in real-time.\n\nTell me what you have in mind, or feel free to drop in a reference image to show me your inspiration.`;

type GenImage = {
  id?: string;
  objectPath: string;
  prompt: string;
  mode: string;
  promptIndex?: number;
};

function resolveImageUrl(objectPath: string): string {
  if (!objectPath) return "";
  if (objectPath.startsWith("http") || objectPath.startsWith("data:")) return objectPath;
  return `/api/storage${objectPath}`;
}

async function compressImage(file: File, maxPx = 1024, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas ctx unavailable")); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STEP_LABELS = ["Discover", "Brief", "Concepts", "Select", "Review", "Confirm"];

function StepIndicator({ briefReady, briefStatus, hasSelectedImage, genDone }: {
  briefReady: boolean;
  briefStatus: BriefStatus;
  hasSelectedImage: boolean;
  genDone: boolean;
}) {
  const isConfirmed = briefStatus === "confirmed" || briefStatus === "finalized" || briefStatus === "forwarded";

  const currentStep = !briefReady ? 0
    : !genDone ? 1
    : !hasSelectedImage ? 2
    : briefStatus === "awaiting_confirmation" ? 3
    : isConfirmed ? 5
    : 2;

  return (
    <div className="hidden md:flex items-center gap-1">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all duration-300",
            i < currentStep ? "bg-primary/20 text-primary" :
            i === currentStep ? "bg-white/10 text-white/80 ring-1 ring-white/20" :
            "text-white/20"
          )}>
            {i < currentStep && <CheckCircle2 size={9} className="text-primary" />}
            {label}
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={cn("w-3 h-px", i < currentStep ? "bg-primary/40" : "bg-white/8")} />
          )}
        </div>
      ))}
    </div>
  );
}

function SessionHistoryPanel({ sessions, onSelect, onNewChat }: {
  sessions: SessionSummary[];
  onSelect: (s: SessionSummary) => void;
  onNewChat: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="px-4 pt-5 pb-3">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-colors"
        >
          <MessageSquarePlus size={16} />
          Start a new conversation
        </button>
      </div>
      {sessions.length > 0 && (
        <>
          <p className="px-5 pt-2 pb-1 text-[10px] uppercase tracking-widest text-white/30 font-semibold">
            Previous conversations
          </p>
          <div className="px-3 pb-4 space-y-1">
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 group-hover:text-white truncate leading-snug">
                      {s.lastMessage?.preview
                        ? s.lastMessage.preview + (s.lastMessage.preview.length >= 80 ? "…" : "")
                        : "Empty session"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {s.briefReady && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400">
                          <CheckCircle2 size={10} /> Brief ready
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-[10px] text-white/30">
                        <Clock size={10} /> {formatRelativeTime(s.updatedAt)}
                      </span>
                      <span className="text-[10px] text-white/20">
                        {s.messageCount} msg{s.messageCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function DesignSessionPage() {
  const params = useParams<{ designerSlug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const designer = getDesignerBySlug(params.designerSlug);

  const {
    messages, sessionId, isStreaming,
    brief, briefReady, briefStatus, briefId,
    awaitingConfirmation, selectedImageId, selectedImageUrl,
    generateImages, setGenerateImages,
    sendMessage, selectImage, confirmBrief, declineBrief,
    loadSession, reset,
  } = useEnquiryStream();

  const [input, setInput] = useState("");
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [imageUploading, setImageUploading] = useState(false);
  const [view, setView] = useState<"loading" | "history" | "chat">("loading");
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showMobileBrief, setShowMobileBrief] = useState(false);

  const [genState, setGenState] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [genImages, setGenImages] = useState<GenImage[]>([]);
  const [genError, setGenError] = useState<string | null>(null);
  const [genElapsed, setGenElapsed] = useState(0);
  const [genStep, setGenStep] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [forwardLoading, setForwardLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) { setView("chat"); return; }
    if (!params.designerSlug) { setView("chat"); return; }
    setLoadingHistory(true);
    fetchSessionsForDesigner(params.designerSlug).then((found) => {
      setSessions(found);
      if (found.length > 0 && found[0].messageCount > 0) {
        resumeSession(found[0]);
      } else {
        setView("chat");
      }
      setLoadingHistory(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resumeSession = useCallback(async (s: SessionSummary) => {
    setView("loading");
    const data = await fetchSessionMessages(s.id);
    if (data && data.messages.length > 0) {
      loadSession(s.id, data.messages, data.briefReady, data.brief, data.briefStatus, data.briefId, data.selectedImageId, data.selectedImageUrl);
    }
    setView("chat");
  }, [loadSession]);

  const startNewChat = useCallback(() => {
    reset();
    setAttachedImages([]);
    setInput("");
    setGenState("idle");
    setGenImages([]);
    setGenError(null);
    setView("chat");
  }, [reset]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming, genState, awaitingConfirmation]);

  const generateLookbook = useCallback(async () => {
    if (!sessionId) return;
    setGenState("generating");
    setGenError(null);
    setGenElapsed(0);
    setGenStep(1);
    setGenerateImages(false);

    const stepTimer = setInterval(() => setGenStep((s) => Math.min(s + 1, 3)), 35_000);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ sessionId }),
        signal: AbortSignal.timeout(300_000),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? "Generation failed");
      setGenImages(data.results ?? []);
      setGenState("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setGenError(msg.includes("AbortError") || msg.includes("timed out") ? "Timed out — please try again." : msg);
      setGenState("error");
    } finally {
      clearInterval(stepTimer);
    }
  }, [sessionId, setGenerateImages]);

  useEffect(() => {
    if (generateImages && sessionId && briefReady) generateLookbook();
  }, [generateImages, sessionId, briefReady, generateLookbook]);

  useEffect(() => {
    if (genState !== "generating") return;
    const t = setInterval(() => setGenElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [genState]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setImageUploading(true);
    try {
      const compressed = await Promise.all(files.slice(0, 3).map((f) => compressImage(f)));
      setAttachedImages((prev) => [...prev, ...compressed].slice(0, 3));
    } finally {
      setImageUploading(false);
    }
  };

  const removeAttachment = (idx: number) => setAttachedImages((prev) => prev.filter((_, i) => i !== idx));

  const handleSend = () => {
    const text = input.trim();
    if ((!text && attachedImages.length === 0) || isStreaming) return;
    const imgs = [...attachedImages];
    setInput("");
    setAttachedImages([]);
    sendMessage(text || "Here's a reference image.", imgs, params.designerSlug);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleConfirm = async () => {
    setConfirmLoading(true);
    try { await confirmBrief(); } finally { setConfirmLoading(false); }
  };

  const handleDecline = async () => {
    setConfirmLoading(true);
    try { await declineBrief(); } finally { setConfirmLoading(false); }
  };

  const handleSelectImage = async (img: GenImage, index: number) => {
    if (!img.id && !sessionId) return;
    const url = resolveImageUrl(img.objectPath);
    await selectImage(img.id ?? `local-${index}`, url, img.prompt, img.promptIndex ?? index);
  };

  const handleForwardToDesigner = async () => {
    if (!briefId && !sessionId) return;
    setForwardLoading(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/ai/brief/forward`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ briefId, sessionId }),
      });
      if (res.ok) {
        navigate(`/designers/${params.designerSlug}`);
      }
    } catch {
      // ignore
    } finally {
      setForwardLoading(false);
    }
  };

  const displayMessages = messages.length === 0
    ? [{ id: "welcome", role: "assistant" as const, content: WELCOME, imageUrls: [] as string[] }]
    : messages;

  const canSend = (input.trim().length > 0 || attachedImages.length > 0) && !isStreaming;
  const isConfirmedOrFinal = briefStatus === "confirmed" || briefStatus === "finalized" || briefStatus === "forwarded";
  const genDone = genState === "done";

  if (!designer) {
    return (
      <div className="min-h-screen bg-[#0c0c0c] flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-white/50 mb-4">Designer not found.</p>
          <Link href="/marketplace">
            <Button variant="outline">Browse Designers</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0c0c0c] overflow-hidden">
      {/* ── Top navigation bar ── */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-white/8 bg-[#0c0c0c] shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/designers/${params.designerSlug}`}>
            <button className="flex items-center gap-2 text-white/40 hover:text-white/80 transition-colors text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">{designer.name}</span>
            </button>
          </Link>
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-3 h-3 text-black" />
            </div>
            <span className="text-sm font-medium text-white/80">Aria</span>
            <span className="text-xs text-white/30 hidden sm:inline">· Designing for {designer.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <StepIndicator
            briefReady={briefReady}
            briefStatus={briefStatus}
            hasSelectedImage={Boolean(selectedImageId)}
            genDone={genDone}
          />
          {user && sessions.length > 0 && view === "chat" && (
            <button
              onClick={() => setView("history")}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/80 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <Clock size={13} />
              <span className="hidden sm:inline">History</span>
            </button>
          )}
          {view === "chat" && (
            <button
              onClick={startNewChat}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-500/10"
            >
              <MessageSquarePlus size={13} />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
          {/* Mobile brief toggle */}
          <button
            onClick={() => setShowMobileBrief(true)}
            className="md:hidden flex items-center gap-1.5 text-xs text-white/40 hover:text-amber-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5"
          >
            <PanelRight size={13} />
            Brief
          </button>
        </div>
      </header>

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── Left: chat area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Sign-in gate */}
          {!user && (
            <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-serif text-white mb-2">Sign in to design with Aria</h3>
                <p className="text-sm text-white/50 leading-relaxed max-w-xs">
                  Create a free Drape account to chat with Aria and get a personalised style brief.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <a href="/signup" className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm text-center transition-colors">
                  Create account
                </a>
                <a href="/login" className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm text-center transition-colors">
                  Sign in
                </a>
              </div>
            </div>
          )}

          {/* Loading */}
          {user && (view === "loading" || loadingHistory) && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                <p className="text-xs text-white/30">Loading your conversation…</p>
              </div>
            </div>
          )}

          {/* History view */}
          {user && view === "history" && !loadingHistory && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-white/8 shrink-0">
                <button
                  onClick={() => setView("chat")}
                  className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} />
                  Back to conversation
                </button>
              </div>
              <SessionHistoryPanel sessions={sessions} onSelect={resumeSession} onNewChat={startNewChat} />
            </div>
          )}

          {/* Chat view */}
          {user && view === "chat" && !loadingHistory && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                {displayMessages.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                      </div>
                    )}
                    <div className="max-w-[80%] flex flex-col gap-2">
                      {msg.imageUrls && msg.imageUrls.length > 0 && (
                        <div className={cn("flex flex-wrap gap-1.5", msg.role === "user" ? "justify-end" : "justify-start")}>
                          {msg.imageUrls.map((url, i) => (
                            <img key={i} src={url} alt="Reference" className="w-28 h-28 object-cover rounded-xl border border-white/10" />
                          ))}
                        </div>
                      )}
                      {(msg.content || (!msg.content && (!msg.imageUrls || msg.imageUrls.length === 0))) && (
                        <div className={cn(
                          "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                          msg.role === "assistant"
                            ? "bg-white/5 text-white/90 rounded-tl-sm"
                            : "bg-amber-500 text-black font-medium rounded-tr-sm",
                        )}>
                          {msg.content || (
                            <span className="flex gap-1 items-center h-4">
                              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Generate lookbook CTA */}
                {briefReady && genState === "idle" && (
                  <div className="flex justify-center pt-2">
                    <button
                      onClick={generateLookbook}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-105"
                    >
                      <Sparkles size={14} />
                      Generate visual concepts
                    </button>
                  </div>
                )}

                {/* Generating progress */}
                {genState === "generating" && (
                  <div className="rounded-2xl bg-white/5 border border-white/8 p-5 space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="relative w-9 h-9 shrink-0">
                        <div className="absolute inset-0 rounded-full border border-amber-400/30" />
                        <div className="absolute inset-0 rounded-full border-t-2 border-amber-400 animate-spin" style={{ animationDuration: "2s" }} />
                        <div className="absolute inset-1.5 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {genStep === 1 ? "Generating concept 1 of 3…" : genStep === 2 ? "Generating concept 2 of 3…" : "Generating concept 3 of 3…"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-mono text-amber-400 tabular-nums">
                            {String(Math.floor(genElapsed / 60)).padStart(2, "0")}:{String(genElapsed % 60).padStart(2, "0")}
                          </span>
                          <span className="text-xs text-white/30">
                            {genElapsed < 35 ? "· FLUX AI rendering" : genElapsed < 100 ? `· ~${Math.max(1, Math.round((120 - genElapsed) / 60))} min left` : "· almost done…"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {["Concept 1", "Concept 2", "Concept 3"].map((label, i) => (
                        <div key={i} className={cn("flex items-center gap-2.5 text-xs transition-all duration-500",
                          genStep > i + 1 ? "text-amber-400" : genStep === i + 1 ? "text-white/80" : "text-white/20")}>
                          <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0",
                            genStep > i + 1 ? "border-amber-400 bg-amber-400/20" : genStep === i + 1 ? "border-white/40" : "border-white/10")}>
                            {genStep > i + 1 ? <CheckCircle2 className="w-2.5 h-2.5 text-amber-400" /> : genStep === i + 1 ? <Loader2 className="w-2.5 h-2.5 animate-spin text-white/60" /> : null}
                          </div>
                          {label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {genState === "error" && (
                  <div className="rounded-2xl bg-white/5 border border-white/8 p-5 flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/80">{genError ?? "Generation failed."}</p>
                      <button onClick={generateLookbook} className="mt-2 text-xs text-amber-400 hover:text-amber-300 underline">
                        Try again
                      </button>
                    </div>
                  </div>
                )}

                {/* Generated images */}
                {genState === "done" && genImages.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-amber-400" />
                      </div>
                      <p className="text-xs font-medium text-amber-300 uppercase tracking-widest">Your Visual Concepts</p>
                      <span className="text-[10px] text-white/30 ml-auto">Select the one that captures your vision</span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {genImages.filter((img) => img.mode === "image" && img.objectPath).map((img, i) => {
                        const url = resolveImageUrl(img.objectPath);
                        const imgId = img.id ?? `local-${i}`;
                        const isSelected = selectedImageId === imgId;
                        return (
                          <div key={i} className="relative group flex flex-col gap-2">
                            <div
                              className={cn(
                                "relative rounded-xl overflow-hidden border-2 transition-all duration-200 aspect-[3/4] cursor-pointer",
                                isSelected ? "border-amber-400 shadow-lg shadow-amber-400/20" : "border-white/10 hover:border-white/30",
                              )}
                              onClick={() => handleSelectImage(img, i)}
                            >
                              <img
                                src={url}
                                alt={`Concept ${i + 1}`}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                              {!isSelected && (
                                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3 rounded-xl">
                                  <span className="flex items-center gap-1 text-xs text-white font-medium">
                                    <Check className="w-3.5 h-3.5" /> Select
                                  </span>
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                                  <Check className="w-3.5 h-3.5 text-black" />
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setLightboxIdx(i); }}
                                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <ZoomIn className="w-3 h-3 text-white" />
                              </button>
                              <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded-full">
                                {i + 1}
                              </span>
                            </div>

                            {/* Per-image action buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleSelectImage(img, i)}
                                className={cn(
                                  "flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-colors",
                                  isSelected
                                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                                    : "bg-white/8 hover:bg-amber-500/20 text-white/50 hover:text-amber-300",
                                )}
                              >
                                {isSelected ? "✓ Selected" : "Select"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={generateLookbook}
                      className="w-full text-xs text-white/30 hover:text-white/60 transition-colors py-1 flex items-center justify-center gap-1"
                    >
                      <RotateCcw size={11} /> Regenerate concepts
                    </button>
                  </div>
                )}

                {/* ── Confirmation panel ── */}
                {awaitingConfirmation && !isConfirmedOrFinal && (
                  <div className="rounded-2xl bg-amber-500/8 border border-amber-500/25 p-6 space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-black" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white mb-1">Your brief is ready to confirm</p>
                        <p className="text-xs text-white/50 leading-relaxed">
                          Review your brief in the panel on the right. Once you confirm, it will be sent to {designer.name}.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleConfirm}
                        disabled={confirmLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {confirmLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Yes, this is my brief
                      </button>
                      <button
                        onClick={handleDecline}
                        disabled={confirmLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/80 hover:text-white font-medium text-sm transition-all disabled:opacity-50 border border-white/10"
                      >
                        No, make changes
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Confirmed state ── */}
                {isConfirmedOrFinal && (
                  <div className="rounded-2xl bg-green-500/8 border border-green-500/20 p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-green-300">Brief confirmed!</p>
                        <p className="text-xs text-white/40 mt-0.5">
                          {briefStatus === "forwarded"
                            ? `Your brief has been sent to ${designer.name}. They'll be in touch soon.`
                            : "Your brief is ready. Click below to send it to the designer."}
                        </p>
                      </div>
                    </div>
                    {briefStatus !== "forwarded" && (
                      <button
                        onClick={handleForwardToDesigner}
                        disabled={forwardLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {forwardLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send brief to {designer.name}
                      </button>
                    )}
                    {briefStatus === "forwarded" && (
                      <Link href={`/designers/${params.designerSlug}`}>
                        <button className="w-full py-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 text-sm transition-colors">
                          Return to {designer.name}'s profile
                        </button>
                      </Link>
                    )}
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Input area */}
              <div className="px-5 py-4 border-t border-white/8 bg-[#0c0c0c] shrink-0">
                {attachedImages.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {attachedImages.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt={`Attachment ${i + 1}`} className="w-14 h-14 object-cover rounded-lg border border-white/10" />
                        <button
                          onClick={() => removeAttachment(i)}
                          className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-black border border-white/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={9} className="text-white" />
                        </button>
                      </div>
                    ))}
                    {imageUploading && (
                      <div className="w-14 h-14 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                        <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-end gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading || attachedImages.length >= 3}
                    className={cn("shrink-0 transition-colors mb-0.5",
                      attachedImages.length >= 3 ? "text-white/15 cursor-not-allowed" : "text-white/30 hover:text-amber-400")}
                    title="Attach reference image"
                  >
                    {imageUploading
                      ? <div className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
                      : <Paperclip size={16} />}
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={
                      isConfirmedOrFinal
                        ? "Brief confirmed — start a new chat to make changes"
                        : attachedImages.length > 0
                        ? "Add a note, or just send the image…"
                        : "Describe your vision or drop in a reference image…"
                    }
                    disabled={isConfirmedOrFinal}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none outline-none max-h-32 leading-relaxed disabled:opacity-40"
                    style={{ height: "auto" }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = `${t.scrollHeight}px`;
                    }}
                  />
                  <Button
                    size="icon"
                    disabled={!canSend || isConfirmedOrFinal}
                    onClick={handleSend}
                    className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-30 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2 px-0.5">
                  <p className="text-xs text-white/20 flex items-center gap-1.5">
                    <ImageIcon size={11} /> Attach reference images
                  </p>
                  <p className="text-xs text-white/20 hidden sm:block">Enter to send · Shift+Enter new line</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Right: persistent brief panel (desktop only) ── */}
        <div className="hidden md:flex w-80 shrink-0 flex-col overflow-hidden">
          <DesignBriefPanel
            brief={brief}
            briefStatus={briefStatus}
            briefReady={briefReady}
            selectedImageUrl={selectedImageUrl}
            className="h-full"
          />
        </div>
      </div>

      {/* ── Mobile brief panel overlay ── */}
      {showMobileBrief && (
        <div className="fixed inset-0 z-50 flex flex-col md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowMobileBrief(false)} />
          <div className="relative mt-auto w-full h-[80vh] flex flex-col rounded-t-2xl overflow-hidden border-t border-white/10">
            <div className="flex items-center justify-between px-5 py-4 bg-[#0a0a0a] border-b border-white/8 shrink-0">
              <span className="text-sm font-medium text-white">Your Brief</span>
              <button onClick={() => setShowMobileBrief(false)} className="text-white/40 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <DesignBriefPanel
              brief={brief}
              briefStatus={briefStatus}
              briefReady={briefReady}
              selectedImageUrl={selectedImageUrl}
              className="flex-1"
            />
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && genImages[lightboxIdx] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-6" onClick={() => setLightboxIdx(null)}>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); setLightboxIdx(null); }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={resolveImageUrl(genImages[lightboxIdx].objectPath)}
              alt={`Concept ${lightboxIdx + 1}`}
              className="w-full max-h-[75vh] object-contain rounded-2xl"
            />
            <p className="mt-3 text-xs text-white/40 text-center px-4 leading-relaxed">
              {genImages[lightboxIdx].prompt}
            </p>
            {genImages[lightboxIdx].mode === "image" && (
              <button
                onClick={() => { handleSelectImage(genImages[lightboxIdx], lightboxIdx); setLightboxIdx(null); }}
                className={cn(
                  "mt-3 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2",
                  selectedImageId === (genImages[lightboxIdx].id ?? `local-${lightboxIdx}`)
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "bg-amber-500 hover:bg-amber-400 text-black",
                )}
              >
                <Check className="w-4 h-4" />
                {selectedImageId === (genImages[lightboxIdx].id ?? `local-${lightboxIdx}`) ? "Selected ✓" : "Select this concept"}
              </button>
            )}
          </div>
          {lightboxIdx > 0 && (
            <button className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}>
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          )}
          {lightboxIdx < genImages.length - 1 && (
            <button className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}>
              <ChevronLeft className="w-5 h-5 text-white rotate-180" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
