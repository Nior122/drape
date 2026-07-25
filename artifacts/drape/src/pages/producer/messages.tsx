import { useState, useEffect } from "react";
import { getToken } from "@/lib/token-storage";
import { Loader2, MessageSquare, ArrowRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

type MessageThread = {
  id: string; orderId: string; senderId: string; content: string;
  readByProducer: boolean; createdAt: string;
  orderTitle: string; clientName: string;
};

export default function MessagesPage() {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);

  const token = getToken();

  useEffect(() => {
    fetch(`${API_BASE}/api/designer/messages`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then((r) => r.json())
      .then(setThreads)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-[#C08B4E]" /></div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-medium">Messages</h1>
        <p className="text-sm text-white/40 mt-1">Recent client conversations from your projects.</p>
      </div>

      {threads.length === 0 ? (
        <div className="text-center py-20 text-white/30">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium text-white/40">No messages yet</p>
          <p className="text-sm mt-1">Messages from clients will appear here once you have active projects.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => (
            <a
              key={t.id}
              href={`/designer/orders/${t.orderId}`}
              className={cn(
                "flex items-center gap-4 bg-[#111] border border-white/10 rounded-xl p-4 hover:border-[#C08B4E]/30 transition-colors group",
                !t.readByProducer && "border-[#C08B4E]/30 bg-[#C08B4E]/5"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                !t.readByProducer ? "bg-[#C08B4E]/20" : "bg-white/5"
              )}>
                <MessageSquare className={cn("h-4 w-4", !t.readByProducer ? "text-[#C08B4E]" : "text-white/30")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{t.clientName}</span>
                  {!t.readByProducer && <span className="bg-[#C08B4E] text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">NEW</span>}
                </div>
                <p className="text-xs text-white/40 truncate mt-0.5">
                  <span className="text-white/60 font-medium">{t.orderTitle}</span> — {t.content}
                </p>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-white/20">
                  <Clock className="h-3 w-3" />
                  {new Date(t.createdAt).toLocaleDateString()}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#C08B4E] transition-colors shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
