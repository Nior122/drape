import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth";
import { getToken } from "@/lib/token-storage";
import { cn, formatDate } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Send, Plus, Trash2, MessageSquare, Sparkles, Search, Pin, Archive,
  FolderPlus, MoreHorizontal, Edit3, Check, X, FileText, Download,
  Copy, Settings, Brain, Layout, Palette, Scissors, DollarSign,
  Camera, Users, BookOpen, Lightbulb, TrendingUp, Globe, ChevronLeft,
  ChevronRight, Sidebar, Loader2, PanelRightOpen, PanelRightClose,
  Bookmark, Clock, Star, Wand2, FileDown, Quote,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// ── Types ────────────────────────────────────────────────────
interface Conversation {
  id: string; title: string; messages: Array<{ role: string; content: string; createdAt: string }>;
  folderId: string | null; pinned: boolean; archived: boolean; tags: string[];
  context: Record<string, unknown>; createdAt: string; updatedAt: string;
}
interface Folder { id: string; name: string; color: string; }
interface PromptTemplate {
  id: string; title: string; description: string; category: string;
  prompt: string; systemPrompt: string | null; isBuiltIn: boolean; isFavourite: boolean; usageCount: number;
}

const PROMPT_CATEGORIES = [
  "FASHION_DESIGN", "PRODUCTION", "MARKETING", "CLIENT_COMMUNICATION",
  "BRANDING", "PATTERN_MAKING", "PRICING", "COLLECTIONS", "GENERAL",
];
const CATEGORY_LABELS: Record<string, string> = {
  FASHION_DESIGN: "Fashion Design", PRODUCTION: "Production", MARKETING: "Marketing",
  CLIENT_COMMUNICATION: "Client Comms", BRANDING: "Branding", PATTERN_MAKING: "Pattern Making",
  PRICING: "Pricing", COLLECTIONS: "Collections", GENERAL: "General",
};
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  FASHION_DESIGN: Sparkles, PRODUCTION: Scissors, MARKETING: TrendingUp,
  CLIENT_COMMUNICATION: Users, BRANDING: Globe, PATTERN_MAKING: Layout,
  PRICING: DollarSign, COLLECTIONS: BookOpen, GENERAL: Lightbulb,
};

const GENERATION_TOOLS = [
  { id: "brief", icon: FileText, label: "Design Brief", color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "production-guide", icon: Scissors, label: "Production Guide", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { id: "fabric", icon: Palette, label: "Fabric Expert", color: "text-purple-400", bg: "bg-purple-400/10" },
  { id: "colour", icon: Palette, label: "Colour Expert", color: "text-pink-400", bg: "bg-pink-400/10" },
  { id: "collection", icon: BookOpen, label: "Collection Builder", color: "text-amber-400", bg: "bg-amber-400/10" },
  { id: "pricing", icon: DollarSign, label: "Pricing", color: "text-green-400", bg: "bg-green-400/10" },
  { id: "critique", icon: Camera, label: "Design Critique", color: "text-red-400", bg: "bg-red-400/10" },
  { id: "consultation", icon: Users, label: "Client Consult", color: "text-indigo-400", bg: "bg-indigo-400/10" },
  { id: "brand-content", icon: Globe, label: "Brand Content", color: "text-cyan-400", bg: "bg-cyan-400/10" },
];

export default function AiStudioPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  const fetchUrl = (path: string) => fetch(`${API_BASE}${path}`, { headers });

  // State
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [mode, setMode] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showGenerationTools, setShowGenerationTools] = useState(true);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Queries
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["ai-studio", "conversations", search],
    queryFn: () => fetchUrl(`/api/designer/ai-studio/conversations${search ? `?search=${encodeURIComponent(search)}` : ""}`).then(r => r.json()),
  });

  const { data: activeConv } = useQuery({
    queryKey: ["ai-studio", "conversation", activeConvId],
    queryFn: () => fetchUrl(`/api/designer/ai-studio/conversations/${activeConvId}`).then(r => r.json()),
    enabled: !!activeConvId,
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["ai-studio", "folders"],
    queryFn: () => fetchUrl("/api/designer/ai-studio/folders").then(r => r.json()),
  });

  const { data: prompts = [] } = useQuery({
    queryKey: ["ai-studio", "prompts"],
    queryFn: () => fetchUrl("/api/designer/ai-studio/prompts").then(r => r.json()),
  });

  // Mutations
  const createConv = useMutation({
    mutationFn: () => fetchUrl("/api/designer/ai-studio/conversations").then(r => r.json()).then(d => { setActiveConvId(d.id); return d; }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-studio", "conversations"] }),
  });

  const deleteConv = useMutation({
    mutationFn: (id: string) => fetchUrl(`/api/designer/ai-studio/conversations/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-studio", "conversations"] }); if (activeConvId === deleteConv.variables) setActiveConvId(null); },
  });

  const updateConv = useMutation({
    mutationFn: ({ id, ...data }: Record<string, unknown>) => fetchUrl(`/api/designer/ai-studio/conversations/${id}`, {
      method: "PATCH", headers, body: JSON.stringify(data),
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-studio"] }),
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content, mode: m }: { conversationId: string; content: string; mode?: string }) => {
      const res = await fetchUrl(`/api/designer/ai-studio/conversations/${conversationId}/messages`, {
        method: "POST", headers, body: JSON.stringify({ content, mode: m }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-studio", "conversation", activeConvId] });
      qc.invalidateQueries({ queryKey: ["ai-studio", "conversations"] });
    },
  });

  const generateTool = useMutation({
    mutationFn: async ({ tool, data }: { tool: string; data: Record<string, string> }) => {
      const res = await fetchUrl(`/api/designer/ai-studio/generate/${tool}`, {
        method: "POST", headers, body: JSON.stringify(data),
      });
      const result = await res.json();
      return { tool, reply: result.reply };
    },
    onSuccess: (result) => {
      if (activeConvId) {
        // Auto-save the result as a conversation message
        setInput(`[${result.tool}] generated result.`); // this will be replaced by the actual reply
      }
    },
  });

  // Effects
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [activeConv?.messages]);

  // Handlers
  const handleSend = async () => {
    if (!input.trim() || !activeConvId || sendMessage.isPending) return;
    const text = input;
    setInput("");
    sendMessage.mutate({ conversationId: activeConvId, content: text, mode: mode ?? undefined });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleUseTemplate = (template: PromptTemplate) => {
    setInput(template.prompt);
    if (template.systemPrompt) {
      // Create or use a conversation with the template's system prompt
      if (!activeConvId) {
        createConv.mutate(undefined, {
          onSuccess: () => setTimeout(() => setActiveConvId(activeConvId), 100)
        });
      }
    }
    setShowTemplates(false);
    inputRef.current?.focus();
  };

  const handleGenerateTool = (toolId: string) => {
    if (!activeConvId) {
      createConv.mutate(undefined);
    }
    setMode(toolId);
    // Show input for the specific tool
    const tool = GENERATION_TOOLS.find(t => t.id === toolId);
    if (tool) {
      setInput(`/${toolId} `);
      inputRef.current?.focus();
    }
  };

  const handleExport = async () => {
    if (!activeConvId) return;
    toast({ description: "Exporting conversation..." });
    const res = await fetchUrl(`/api/designer/ai-studio/conversations/${activeConvId}/export`, {
      method: "POST", headers, body: JSON.stringify({ format: "md" }),
    });
    if (res.ok) {
      const data = await res.json();
      navigator.clipboard.writeText(data.content);
      toast({ description: "Conversation copied to clipboard!" });
    }
  };

  // Active conversation messages
  const messages = (activeConv as Conversation)?.messages ?? [];
  const activeTitle = (activeConv as Conversation)?.title ?? "Select a conversation";

  // ── Left Sidebar: Conversations ──
  const LeftSidebar = () => (
    <div className={cn("flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden transition-all duration-300", showLeftPanel ? "w-72" : "w-0")}>
      <div className="p-3 space-y-2">
        <Button onClick={() => createConv.mutate()} className="w-full gap-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-xs" size="sm">
          <Plus className="h-3.5 w-3.5" /> New Session
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations..." className="w-full bg-muted/30 border border-sidebar-border rounded-lg pl-8 pr-3 py-1.5 text-xs" />
        </div>
      </div>

      {/* Folders */}
      {(folders as Folder[]).length > 0 && (
        <div className="px-3 mb-1">
          {(folders as Folder[]).map(f => (
            <div key={f.id} className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground rounded-md hover:bg-muted/30">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
              {f.name}
            </div>
          ))}
        </div>
      )}

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {(conversations as Conversation[]).filter((c: Conversation) => !c.archived).map(conv => (
          <div
            key={conv.id}
            onClick={() => { setActiveConvId(conv.id); setMode(null); }}
            className={cn(
              "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm",
              activeConvId === conv.id ? "bg-primary/10" : "hover:bg-muted/30"
            )}
          >
            {conv.pinned ? <Pin className="h-3 w-3 text-primary shrink-0" /> : <MessageSquare className="h-3 w-3 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              {editingTitle === conv.id ? (
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <input
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-full bg-muted rounded px-1 py-0.5 text-xs outline-none"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === "Enter") { updateConv.mutate({ id: conv.id, title: editValue }); setEditingTitle(null); }
                      if (e.key === "Escape") setEditingTitle(null);
                    }}
                  />
                  <Check className="h-3 w-3 text-green-400 cursor-pointer" onClick={() => { updateConv.mutate({ id: conv.id, title: editValue }); setEditingTitle(null); }} />
                </div>
              ) : (
                <p className="truncate text-xs">{conv.title}</p>
              )}
            </div>
            <div className="hidden group-hover:flex gap-1">
              <button onClick={e => { e.stopPropagation(); setEditingTitle(conv.id); setEditValue(conv.title); }}><Edit3 className="h-3 w-3 text-muted-foreground hover:text-foreground" /></button>
              <button onClick={e => { e.stopPropagation(); updateConv.mutate({ id: conv.id, pinned: !conv.pinned }); }}>
                <Pin className={cn("h-3 w-3", conv.pinned ? "text-primary" : "text-muted-foreground hover:text-foreground")} />
              </button>
              <button onClick={e => { e.stopPropagation(); deleteConv.mutate(conv.id); }}><Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" /></button>
            </div>
          </div>
        ))}
        {(conversations as Conversation[]).length === 0 && !isLoading && (
          <div className="text-center py-8 text-xs text-muted-foreground">
            <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p>No conversations yet.</p>
            <p className="mt-1">Start a new design session.</p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Right Sidebar: Context & Tools ──
  const RightSidebar = () => {
    const { data: settings } = useQuery({
      queryKey: ["ai-studio", "settings"],
      queryFn: () => fetchUrl("/api/designer/ai-studio/settings").then(r => r.json()),
    });

    return (
      <div className={cn("flex flex-col h-full bg-sidebar border-l border-sidebar-border overflow-hidden transition-all duration-300", showRightPanel ? "w-72" : "w-0")}>
        {/* Generation Tools */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">AI Tools</h3>
              <button onClick={() => setShowGenerationTools(!showGenerationTools)}>
                <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform", showGenerationTools && "rotate-90")} />
              </button>
            </div>
            {showGenerationTools && (
              <div className="space-y-1">
                {GENERATION_TOOLS.map(tool => (
                  <button
                    key={tool.id}
                    onClick={() => handleGenerateTool(tool.id)}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all text-left",
                      mode === tool.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", tool.bg)}>
                      <tool.icon className={cn("h-3.5 w-3.5", tool.color)} />
                    </div>
                    <span>{tool.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Currently active context */}
          {activeConv && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Project Context</h3>
              <div className="bg-muted/20 rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
                <p><span className="text-foreground/60">Session:</span> {(activeConv as Conversation).title}</p>
                <p><span className="text-foreground/60">Messages:</span> {(activeConv as Conversation).messages.length}</p>
                {Object.entries((activeConv as Conversation).context || {}).map(([k, v]) => (
                  v ? <p key={k}><span className="text-foreground/60">{k}:</span> {String(v)}</p> : null
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Actions</h3>
            <div className="space-y-1">
              {activeConvId && (
                <button onClick={handleExport} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
                  <Download className="h-3.5 w-3.5" /> Export & Copy
                </button>
              )}
              <button onClick={handleUseTemplate.bind(null, { prompt: "Help me create a fashion collection", title: "", description: "", category: "COLLECTIONS", systemPrompt: null, isBuiltIn: false, isFavourite: false, usageCount: 0, id: "" })} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
                <Wand2 className="h-3.5 w-3.5" /> Generate Idea
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Main Chat Workspace ──
  return (
    <div className="flex h-full bg-background overflow-hidden">
      <LeftSidebar />

      {/* ── Centre: Chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toggle buttons */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-sidebar/50">
          <div className="flex items-center gap-2">
            <button onClick={() => setShowLeftPanel(!showLeftPanel)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Toggle sidebar">
              <Sidebar className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-medium truncate max-w-[400px]">{activeTitle}</h2>
            {mode && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium uppercase">
                {GENERATION_TOOLS.find(t => t.id === mode)?.label ?? mode}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowTemplates(!showTemplates)} className={cn("p-1.5 rounded-md transition-colors", showTemplates ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30")} title="Templates">
              <Bookmark className="h-3.5 w-3.5" />
            </button>
            {activeConvId && (
              <button onClick={handleExport} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors" title="Export">
                <FileDown className="h-3.5 w-3.5" />
              </button>
            )}
            <button onClick={() => setShowRightPanel(!showRightPanel)} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors" title="Toggle tools panel">
              <PanelRightOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Templates panel */}
        <AnimatePresence>
          {showTemplates && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border/50">
              <div className="p-3 max-h-48 overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-medium">Prompt Templates</h3>
                  <span className="text-[10px] text-muted-foreground">Click to use</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(prompts as PromptTemplate[]).map(p => {
                    const Icon = CATEGORY_ICONS[p.category] ?? Lightbulb;
                    return (
                      <button key={p.id} onClick={() => handleUseTemplate(p)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-muted/20 hover:bg-muted/40 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Icon className="h-3 w-3" />
                        {p.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {activeConvId ? (
            <div className="max-w-3xl mx-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/30" />
                  <p className="text-sm text-muted-foreground">Start a conversation with Aria</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">Ask about design concepts, fabrics, or production</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {GENERATION_TOOLS.slice(0, 6).map(tool => (
                      <button key={tool.id} onClick={() => handleGenerateTool(tool.id)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors", tool.bg, tool.color)}>
                        <tool.icon className="h-3 w-3" /> {tool.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  {msg.role !== "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={cn("max-w-[75%] rounded-xl px-4 py-3", msg.role === "user" ? "bg-primary/15" : "bg-muted/30")}>
                    {msg.role !== "user" && <p className="text-[10px] text-primary/60 mb-1 font-medium">Aria</p>}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    <p className="text-[10px] text-muted-foreground/30 mt-2 text-right">{msg.createdAt ? formatDate(msg.createdAt) : ""}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <span className="text-xs font-bold text-primary">{user?.name?.[0]?.toUpperCase() ?? "U"}</span>
                    </div>
                  )}
                </motion.div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted/30 rounded-xl px-4 py-3">
                    <p className="text-[10px] text-primary/60 mb-1 font-medium">Aria</p>
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-lg font-serif font-medium mb-1">AI Fashion Studio</h2>
                <p className="text-sm text-muted-foreground">Your complete AI fashion design workspace</p>
                <div className="mt-6 grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {[
                    { label: "New Session", icon: MessageSquare, action: () => createConv.mutate() },
                    { label: "Quick Brief", icon: FileText, action: () => handleGenerateTool("brief") },
                    { label: "Fabric Help", icon: Palette, action: () => handleGenerateTool("fabric") },
                  ].map((item, i) => (
                    <button key={i} onClick={item.action} className="flex flex-col items-center gap-1.5 p-3 bg-muted/20 hover:bg-muted/40 rounded-xl transition-colors">
                      <item.icon className="h-5 w-5 text-primary/60" />
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        {activeConvId && (
          <div className="border-t border-border/50 bg-sidebar/30 p-3">
            <div className="max-w-3xl mx-auto flex gap-2 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={inputRef as React.Ref<HTMLTextAreaElement>}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={mode ? `${GENERATION_TOOLS.find(t => t.id === mode)?.label}: describe what you need...` : "Ask about fashion design, fabrics, production..."}
                  className="min-h-[44px] max-h-32 resize-none bg-muted/20 border-border/50 text-sm"
                  rows={1}
                />
              </div>
              <Button onClick={handleSend} disabled={!input.trim() || sendMessage.isPending} size="icon" className="h-11 w-11 shrink-0 rounded-xl bg-primary hover:bg-primary/80">
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="max-w-3xl mx-auto mt-2 flex items-center gap-2">
              <Quote className="h-3 w-3 text-muted-foreground/50" />
              <span className="text-[10px] text-muted-foreground/50">Shift+Enter for new line</span>
              {mode && (
                <button onClick={() => setMode(null)} className="ml-auto text-[10px] text-primary hover:text-primary/80">
                  Clear mode
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <RightSidebar />
    </div>
  );
}
