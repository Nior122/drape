import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/auth";
import { getToken } from "@/lib/token-storage";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Plus, Trash2, MessageSquare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type Conversation = {
  id: string; title: string; messages: Array<{ role: string; content: string; createdAt: string }>;
  createdAt: string; updatedAt: string;
};

export default function AiStudioPage() {
  const { user } = useAuth();
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = convs.find((c) => c.id === activeId) ?? null;
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };

  useEffect(() => {
    fetch(`${API_BASE}/api/designer/ai-studio/conversations`, { headers })
      .then((r) => r.json())
      .then((data) => { setConvs(data); setLoading(false); if (data.length > 0) setActiveId(data[0].id); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConv?.messages]);

  const createConversation = async () => {
    const res = await fetch(`${API_BASE}/api/designer/ai-studio/conversations`, {
      method: "POST", headers, body: JSON.stringify({ title: "New Design Session" }),
    });
    if (res.ok) {
      const conv = await res.json();
      setConvs((prev) => [conv, ...prev]);
      setActiveId(conv.id);
    }
  };

  const deleteConversation = async (id: string) => {
    await fetch(`${API_BASE}/api/designer/ai-studio/conversations/${id}`, { method: "DELETE", headers });
    setConvs((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(convs.find((c) => c.id !== id)?.id ?? null);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeId || sending) return;
    const text = input;
    setInput("");
    setSending(true);

    // Add user message optimistically
    const userMsg = { role: "user" as const, content: text, createdAt: new Date().toISOString() };
    setConvs((prev) =>
      prev.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, userMsg] } : c)
    );

    // Save user message
    await fetch(`${API_BASE}/api/designer/ai-studio/conversations/${activeId}/messages`, {
      method: "POST", headers, body: JSON.stringify({ role: "user", content: text }),
    });

    // Call OpenRouter via the AI endpoint
    const aiRes = await fetch(`${API_BASE}/api/designer/ai-studio/prompt`, {
      method: "POST", headers, body: JSON.stringify({ prompt: text, conversationId: activeId }),
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      // Save AI response
      await fetch(`${API_BASE}/api/designer/ai-studio/conversations/${activeId}/messages`, {
        method: "POST", headers,
        body: JSON.stringify({ role: "assistant", content: data.reply ?? "I've noted your design request." }),
      });

      // Refresh conversation
      const convRes = await fetch(`${API_BASE}/api/designer/ai-studio/conversations/${activeId}`, { headers });
      if (convRes.ok) {
        const updated = await convRes.json();
        setConvs((prev) => prev.map((c) => c.id === activeId ? { ...c, messages: updated.messages } : c));
      }
    } else {
      // If AI fails, still add a placeholder
      const fallbackMsg = { role: "assistant" as const, content: "I'm processing your design ideas. Let me think about this...", createdAt: new Date().toISOString() };
      await fetch(`${API_BASE}/api/designer/ai-studio/conversations/${activeId}/messages`, {
        method: "POST", headers, body: JSON.stringify(fallbackMsg),
      });
      setConvs((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, fallbackMsg] } : c)
      );
    }
    setSending(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-[#C08B4E]" /></div>
  );

  return (
    <div className="flex h-full">
      {/* Sidebar — conversation list */}
      <div className="w-60 shrink-0 border-r border-white/10 bg-[#0A0A0A] flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Button onClick={createConversation} className="w-full gap-2 text-xs bg-[#C08B4E] hover:bg-[#C08B4E]/80 text-white rounded-lg">
            <Plus className="h-3.5 w-3.5" /> New Session
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {convs.map((c) => (
            <div
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors group",
                activeId === c.id ? "bg-[#C08B4E]/15 text-white" : "text-white/50 hover:text-white hover:bg-white/5",
              )}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate flex-1">{c.title}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          {convs.length === 0 && (
            <p className="text-xs text-white/30 text-center py-8">No sessions yet.<br/>Start a new design session.</p>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {activeConv ? (
          <>
            <div className="p-4 border-b border-white/10 bg-[#0A0A0A]">
              <h2 className="text-sm font-medium truncate">{activeConv.title}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {activeConv.messages.length === 0 && (
                <div className="text-center py-16 text-white/30">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Ask Aria for design ideas, fabric suggestions, or production advice.</p>
                </div>
              )}
              {activeConv.messages.map((m, i) => (
                <div key={i} className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2.5 text-sm",
                    m.role === "user" ? "bg-[#C08B4E]/20 text-white" : "bg-white/5 text-white/80",
                  )}>
                    <p className="text-[10px] text-white/30 mb-1 uppercase tracking-wider">
                      {m.role === "user" ? "You" : "Aria"}
                    </p>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Ask about a design concept, fabric, or technique..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#C08B4E]/50"
                />
                <Button onClick={sendMessage} disabled={!input.trim() || sending} className="bg-[#C08B4E] hover:bg-[#C08B4E]/80 text-white rounded-lg px-4">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30">
            <div className="text-center">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium text-white/40">AI Design Studio</p>
              <p className="text-sm mt-1">Create a new session to start designing with AI.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
