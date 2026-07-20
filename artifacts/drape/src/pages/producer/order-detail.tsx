import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProducerOrder, useUpdateProducerOrder, useSendProducerMessage,
  useGenerateProductionGuide,
  getGetProducerOrderQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/auth";
import { cn, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, Download, RefreshCw, Send, CheckSquare, Square,
  User, Ruler, Palette, Clock, ChevronRight, Loader2, Zap,
  CheckCircle2, AlertCircle, MessageSquare, Image as ImageIcon,
} from "lucide-react";

const ORDER_STATUSES = [
  "ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION", "FITTING", "FINAL_PAYMENT", "DELIVERED", "COMPLETED",
] as const;

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ENQUIRY:       { label: "Enquiry",       color: "text-blue-400",    bg: "bg-blue-400/10",   border: "border-blue-400/30"    },
  ACCEPTED:      { label: "Accepted",      color: "text-emerald-400", bg: "bg-emerald-400/10",border: "border-emerald-400/30" },
  DEPOSIT_PAID:  { label: "Deposit Paid",  color: "text-cyan-400",    bg: "bg-cyan-400/10",   border: "border-cyan-400/30"    },
  IN_PRODUCTION: { label: "In Production", color: "text-[#C08B4E]",   bg: "bg-[#C08B4E]/10",  border: "border-[#C08B4E]/30"   },
  FITTING:       { label: "Fitting",       color: "text-purple-400",  bg: "bg-purple-400/10", border: "border-purple-400/30"  },
  FINAL_PAYMENT: { label: "Final Payment", color: "text-yellow-400",  bg: "bg-yellow-400/10", border: "border-yellow-400/30"  },
  DELIVERED:     { label: "Delivered",     color: "text-green-400",   bg: "bg-green-400/10",  border: "border-green-400/30"   },
  COMPLETED:     { label: "Completed",     color: "text-green-500",   bg: "bg-green-500/10",  border: "border-green-500/30"   },
  CANCELLED:     { label: "Cancelled",     color: "text-red-400",     bg: "bg-red-400/10",    border: "border-red-400/30"     },
};

type GuideContent = {
  garmentType: string; orderSummary: string; fabricNotes: string;
  cuttingGuide: string[]; sewingSequence: string[]; finishingSteps: string[];
  fittingChecklist: string[]; qualityChecklist: string[]; technicalNotes: string; estimatedHours: number;
};

type OrderDetail = {
  id: string; title: string; status: string; description: string | null;
  agreedPrice: number | null; currency: string; depositPaid: boolean;
  dueDate: string | null; estimatedDays: number | null; notes: string | null;
  timelineEvents: Array<{ date: string; label: string; completed: boolean; note?: string }>;
  productionGuideContent: GuideContent | null; productionGuideAt: string | null;
  createdAt: string; updatedAt: string;
  client: { id: string; name: string | null; email: string; phone: string | null; whatsapp: string | null; city: string | null; country: string | null } | null;
  measurements: { unit: string; data: Record<string, number | null>; notes: string | null } | null;
  brief: { occasion: string | null; aestheticDirection: string | null; silhouette: string | null; fabricPreferences: string | null; colorPalette: string[]; specialNotes: string | null } | null;
  lookbookImages: Array<{ id: string; objectPath: string; prompt: string }>;
  messages: Array<{ id: string; senderId: string; senderRole: string; senderName: string | null; content: string; createdAt: string }>;
};

function ChecklistSection({ title, items }: { title: string; items: string[] }) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) => setChecked((prev) => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  return (
    <div>
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <button key={i} onClick={() => toggle(i)} className="w-full flex items-start gap-2.5 text-left group">
            {checked.has(i) ? <CheckSquare className="h-4 w-4 text-[#C08B4E] shrink-0 mt-0.5" /> : <Square className="h-4 w-4 text-white/20 shrink-0 mt-0.5 group-hover:text-white/40" />}
            <span className={cn("text-xs leading-relaxed transition-colors", checked.has(i) ? "text-white/30 line-through" : "text-white/70")}>{item}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ProducerOrderDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id!;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [notesValue, setNotesValue] = useState("");
  const [notesDirty, setNotesDirty] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [generatingGuide, setGeneratingGuide] = useState(false);

  const { data, isLoading } = useGetProducerOrder(id, { query: { queryKey: getGetProducerOrderQueryKey(id) } });
  const order = data as OrderDetail | undefined;

  const updateOrder = useUpdateProducerOrder();
  const sendMessage = useSendProducerMessage();
  const generateGuide = useGenerateProductionGuide();

  useEffect(() => { if (order?.notes !== undefined) setNotesValue(order.notes ?? ""); }, [order?.notes]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [order?.messages?.length]);

  function refetch() { qc.invalidateQueries({ queryKey: getGetProducerOrderQueryKey(id) }); }

  function handleStatusChange(newStatus: string) {
    updateOrder.mutate({ id, data: { status: newStatus } }, {
      onSuccess: refetch,
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });
  }

  function handleSaveNotes() {
    updateOrder.mutate({ id, data: { notes: notesValue } }, {
      onSuccess: () => { setNotesDirty(false); refetch(); toast({ title: "Notes saved" }); },
      onError: () => toast({ title: "Failed to save notes", variant: "destructive" }),
    });
  }

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgInput.trim()) return;
    sendMessage.mutate({ id, data: { content: msgInput } }, {
      onSuccess: () => { setMsgInput(""); refetch(); },
      onError: () => toast({ title: "Failed to send message", variant: "destructive" }),
    });
  }

  function handleGenerateGuide() {
    setGeneratingGuide(true);
    generateGuide.mutate({ data: { orderId: id } }, {
      onSuccess: () => { refetch(); toast({ title: "Production guide generated!", description: "Download it from the guide panel." }); setGeneratingGuide(false); },
      onError: () => { toast({ title: "Guide generation failed", variant: "destructive" }); setGeneratingGuide(false); },
    });
  }

  if (isLoading) return <div className="flex items-center justify-center h-full p-8"><Loader2 className="h-6 w-6 animate-spin text-[#C08B4E]" /></div>;
  if (!order) return (
    <div className="p-8 text-center">
      <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
      <p className="text-sm text-white/60">Order not found</p>
      <Button variant="ghost" onClick={() => navigate("/producer/orders")} className="mt-4 text-white/60">Go back</Button>
    </div>
  );

  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["ENQUIRY"];
  const currentStatusIdx = ORDER_STATUSES.indexOf(order.status as typeof ORDER_STATUSES[number]);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[currentStatusIdx + 1] : null;
  const guide = order.productionGuideContent;
  const measEntries = order.measurements ? Object.entries(order.measurements.data).filter(([, v]) => v != null) : [];

  return (
    <div className="pb-24 md:pb-8">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-[#0E0E0E]/95 backdrop-blur border-b border-white/5 px-4 md:px-8 py-4 flex items-start gap-4">
        <button onClick={() => navigate("/producer/orders")} className="text-white/40 hover:text-white mt-0.5 transition-colors shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-white truncate">{order.title}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide", cfg.color, cfg.bg)}>{cfg.label}</span>
            {order.agreedPrice && <span className="text-xs text-white/40">£{(order.agreedPrice / 100).toFixed(0)}</span>}
            {order.dueDate && <span className="text-xs text-white/30 flex items-center gap-1"><Clock className="h-3 w-3" /> Due {formatDate(order.dueDate)}</span>}
          </div>
        </div>
        {nextStatus && (
          <Button size="sm" onClick={() => handleStatusChange(nextStatus)} disabled={updateOrder.isPending} className="shrink-0 bg-[#C08B4E] hover:bg-[#d4a96a] text-white text-xs h-8">
            {updateOrder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <>{STATUS_CONFIG[nextStatus]?.label} <ChevronRight className="h-3 w-3 ml-1" /></>}
          </Button>
        )}
      </div>

      <div className="p-4 md:p-8 flex flex-col lg:flex-row gap-6">
        {/* LEFT PANEL */}
        <div className="flex-[3] space-y-5 min-w-0">
          {/* Status stepper */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Order Progress</p>
            <div className="flex items-center overflow-x-auto">
              {ORDER_STATUSES.map((s, i) => {
                const done = i < currentStatusIdx;
                const active = i === currentStatusIdx;
                const sCfg = STATUS_CONFIG[s];
                return (
                  <div key={s} className="flex items-center shrink-0">
                    <button
                      onClick={() => !active && handleStatusChange(s)}
                      title={sCfg.label}
                      className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold transition-all border",
                        done ? "bg-[#C08B4E] border-[#C08B4E] text-white" :
                        active ? cn("border-2", sCfg.border, sCfg.color, "bg-transparent") :
                        "bg-white/5 border-white/10 text-white/20 hover:border-white/30 cursor-pointer")}
                    >
                      {done ? "✓" : i + 1}
                    </button>
                    {i < ORDER_STATUSES.length - 1 && <div className={cn("w-5 h-px", i < currentStatusIdx ? "bg-[#C08B4E]" : "bg-white/10")} />}
                  </div>
                );
              })}
            </div>
            <p className={cn("text-[10px] font-medium mt-2", cfg.color)}>{cfg.label}{nextStatus && <span className="text-white/20"> → {STATUS_CONFIG[nextStatus]?.label}</span>}</p>
          </div>

          {/* Client */}
          {order.client && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3"><User className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Client</p></div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#C08B4E]/15 flex items-center justify-center text-[#C08B4E] text-sm font-bold shrink-0">
                  {order.client.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() ?? "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{order.client.name ?? "Unknown"}</p>
                  <p className="text-xs text-white/40">{order.client.email}</p>
                  {(order.client.city || order.client.country) && <p className="text-xs text-white/30">{[order.client.city, order.client.country].filter(Boolean).join(", ")}</p>}
                </div>
              </div>
              {(order.client.phone || order.client.whatsapp) && (
                <div className="flex gap-2 mt-3">
                  {order.client.phone && <a href={`tel:${order.client.phone}`} className="text-xs text-[#C08B4E] hover:text-[#d4a96a] bg-[#C08B4E]/10 px-2.5 py-1 rounded-full">Call</a>}
                  {order.client.whatsapp && <a href={`https://wa.me/${order.client.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-400/10 px-2.5 py-1 rounded-full">WhatsApp</a>}
                </div>
              )}
            </div>
          )}

          {/* Brief */}
          {order.brief && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3"><Palette className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Client Brief</p></div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {order.brief.occasion && <div><p className="text-white/30 mb-0.5">Occasion</p><p className="text-white/80">{order.brief.occasion}</p></div>}
                {order.brief.aestheticDirection && <div><p className="text-white/30 mb-0.5">Aesthetic</p><p className="text-white/80">{order.brief.aestheticDirection}</p></div>}
                {order.brief.silhouette && <div><p className="text-white/30 mb-0.5">Silhouette</p><p className="text-white/80">{order.brief.silhouette}</p></div>}
                {order.brief.fabricPreferences && <div><p className="text-white/30 mb-0.5">Fabrics</p><p className="text-white/80">{order.brief.fabricPreferences}</p></div>}
              </div>
              {order.brief.colorPalette?.length > 0 && (
                <div className="mt-3">
                  <p className="text-white/30 text-xs mb-1.5">Colour palette</p>
                  <div className="flex gap-2 flex-wrap">
                    {order.brief.colorPalette.map((c: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: /^#[0-9A-Fa-f]{6}$/.test(c) ? c : undefined }} />
                        <span className="text-[10px] text-white/40">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {order.brief.specialNotes && (
                <div className="mt-3 bg-white/5 rounded-lg px-3 py-2.5">
                  <p className="text-white/30 text-[10px] mb-1">Special notes</p>
                  <p className="text-xs text-white/70">{order.brief.specialNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Measurements */}
          {measEntries.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3"><Ruler className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Client Measurements ({order.measurements?.unit})</p></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {measEntries.map(([key, val]) => (
                  <div key={key} className="bg-white/5 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-white/30 capitalize">{key.replace(/_/g, " ")}</p>
                    <p className="text-sm font-semibold text-white mt-0.5">{val}{order.measurements?.unit}</p>
                  </div>
                ))}
              </div>
              {order.measurements?.notes && <p className="text-xs text-white/50 mt-3 italic">{order.measurements.notes}</p>}
            </div>
          )}

          {/* Lookbook images */}
          {order.lookbookImages.length > 0 && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
              <div className="flex items-center gap-2 mb-3"><ImageIcon className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Design References</p></div>
              <div className="grid grid-cols-3 gap-2">
                {order.lookbookImages.map((img) => (
                  <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-white/5">
                    <img src={img.objectPath} alt={img.prompt} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Production Notes</p>
            <Textarea value={notesValue} onChange={(e) => { setNotesValue(e.target.value); setNotesDirty(true); }} placeholder="Add internal notes for this order…" className="bg-white/5 border-white/10 text-white placeholder:text-white/20 resize-none min-h-[100px] text-sm focus-visible:ring-[#C08B4E]/30" rows={4} />
            {notesDirty && (
              <Button size="sm" onClick={handleSaveNotes} disabled={updateOrder.isPending} className="mt-2 bg-[#C08B4E] hover:bg-[#d4a96a] text-white text-xs h-7">
                {updateOrder.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save notes"}
              </Button>
            )}
          </div>

          {/* Messages */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-4"><MessageSquare className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Messages ({order.messages.length})</p></div>
            <div className="space-y-3 max-h-80 overflow-y-auto mb-4 pr-1">
              {order.messages.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">No messages yet</p>
              ) : (
                order.messages.map((msg) => {
                  const isMe = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                      <div className={cn("max-w-[80%] rounded-xl px-3.5 py-2.5", isMe ? "bg-[#C08B4E]/20" : "bg-white/8")}>
                        {!isMe && <p className="text-[10px] text-white/40 mb-1">{msg.senderName ?? msg.senderRole}</p>}
                        <p className="text-sm text-white/90 leading-relaxed">{msg.content}</p>
                        <p className="text-[10px] text-white/25 mt-1">{formatDate(msg.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input value={msgInput} onChange={(e) => setMsgInput(e.target.value)} placeholder="Message client…" className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-white/20 text-sm focus-visible:ring-[#C08B4E]/30" />
              <Button type="submit" size="icon" disabled={!msgInput.trim() || sendMessage.isPending} className="bg-[#C08B4E] hover:bg-[#d4a96a] h-9 w-9">
                {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:w-80 xl:w-96 shrink-0 space-y-5">
          {/* Production Guide */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-[#C08B4E]" /><p className="text-sm font-semibold text-white">Production Guide</p></div>
            <p className="text-xs text-white/40 mb-4">AI-generated PDF with cutting diagrams, sewing sequence, and checklists.</p>
            {order.productionGuideAt && (
              <div className="bg-[#C08B4E]/10 border border-[#C08B4E]/20 rounded-lg px-3 py-2.5 mb-3">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#C08B4E]" /><p className="text-xs text-[#C08B4E] font-medium">Guide ready</p></div>
                {guide && <p className="text-[10px] text-white/40 mt-1">{guide.garmentType} · Est. {guide.estimatedHours}h</p>}
                <p className="text-[10px] text-white/25 mt-0.5">Generated {formatDate(order.productionGuideAt)}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {order.productionGuideAt && (
                <a href={`/api/ai/production-guide/${order.id}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-[#C08B4E] hover:bg-[#d4a96a] text-white text-xs font-semibold py-2.5 rounded-lg transition-colors">
                  <Download className="h-3.5 w-3.5" /> Download PDF Guide
                </a>
              )}
              <Button onClick={handleGenerateGuide} disabled={generatingGuide} variant="outline" size="sm" className={cn("w-full border-white/10 text-white/70 hover:text-white hover:border-white/20 text-xs h-9", generatingGuide && "opacity-70")}>
                {generatingGuide ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Generating with AI…</> : <>{order.productionGuideAt ? <RefreshCw className="h-3.5 w-3.5 mr-2" /> : <Zap className="h-3.5 w-3.5 mr-2" />}{order.productionGuideAt ? "Regenerate Guide" : "Generate Guide"}</>}
              </Button>
            </div>
          </div>

          {/* AI Checklist */}
          {guide && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
              <p className="text-sm font-semibold text-white mb-4">Production Checklist</p>
              <div className="space-y-5">
                {guide.fittingChecklist?.length > 0 && <ChecklistSection title="Fitting" items={guide.fittingChecklist} />}
                {guide.qualityChecklist?.length > 0 && <ChecklistSection title="Quality Control" items={guide.qualityChecklist} />}
              </div>
            </div>
          )}

          {/* Guide summary */}
          {guide && (
            <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4 space-y-3">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Guide Summary</p>
              {guide.orderSummary && <p className="text-xs text-white/60 leading-relaxed">{guide.orderSummary}</p>}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Cutting steps", val: guide.cuttingGuide?.length ?? 0 },
                  { label: "Sewing steps", val: guide.sewingSequence?.length ?? 0 },
                  { label: "Est. hours", val: `${guide.estimatedHours}h` },
                  { label: "Garment", val: guide.garmentType },
                ].map((item) => (
                  <div key={item.label} className="bg-white/5 rounded-lg px-2.5 py-2">
                    <p className="text-white/30 text-[10px]">{item.label}</p>
                    <p className="text-white font-semibold text-xs mt-0.5 capitalize">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order details */}
          <div className="bg-[#1A1A1A] rounded-xl border border-white/5 p-4">
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Order Details</p>
            <div className="space-y-2 text-xs">
              {order.agreedPrice && <div className="flex justify-between"><span className="text-white/40">Price</span><span className="text-white font-medium">£{(order.agreedPrice / 100).toFixed(0)}</span></div>}
              <div className="flex justify-between"><span className="text-white/40">Deposit</span><span className={order.depositPaid ? "text-emerald-400" : "text-white/40"}>{order.depositPaid ? "Paid" : "Not paid"}</span></div>
              {order.estimatedDays && <div className="flex justify-between"><span className="text-white/40">Est. days</span><span className="text-white">{order.estimatedDays}d</span></div>}
              {order.dueDate && <div className="flex justify-between"><span className="text-white/40">Due date</span><span className="text-white">{formatDate(order.dueDate)}</span></div>}
              <div className="flex justify-between"><span className="text-white/40">Created</span><span className="text-white/60">{formatDate(order.createdAt)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
