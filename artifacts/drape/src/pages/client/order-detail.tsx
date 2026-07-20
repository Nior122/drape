import { useState, useRef, useEffect } from "react";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, CheckCircle2, Clock, MessageSquare,
  Star, Send, ExternalLink,
} from "lucide-react";
import {
  useGetClientOrder,
  useCreateOrderReview,
  useSendOrderMessage,
  getGetClientOrderQueryKey,
} from "@workspace/api-client-react";
import type { OrderMessage } from "@workspace/api-client-react";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

/* ── Status stepper ─────────────────────────────────────────────── */

const STEPS = [
  "ENQUIRY", "ACCEPTED", "DEPOSIT_PAID", "IN_PRODUCTION",
  "FITTING", "FINAL_PAYMENT", "DELIVERED", "COMPLETED",
];

const STEP_LABELS: Record<string, string> = {
  ENQUIRY: "Sent",
  ACCEPTED: "Accepted",
  DEPOSIT_PAID: "Deposit",
  IN_PRODUCTION: "Making",
  FITTING: "Fitting",
  FINAL_PAYMENT: "Payment",
  DELIVERED: "Delivered",
  COMPLETED: "Done",
};

function StatusStepper({ status }: { status: string }) {
  if (status === "CANCELLED") {
    return (
      <p className="text-sm text-red-400 font-medium flex items-center gap-2 py-1">
        <Clock size={15} /> Order Cancelled
      </p>
    );
  }

  const currentIdx = STEPS.indexOf(status);

  return (
    <div className="flex items-start overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
      {STEPS.map((step, idx) => {
        const done = idx < currentIdx;
        const current = idx === currentIdx;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step} className="flex items-center shrink-0">
            <div className="flex flex-col items-center gap-1.5 min-w-[44px]">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all shrink-0",
                  done && "bg-primary border-primary",
                  current && "bg-primary/15 border-primary",
                  !done && !current && "bg-transparent border-border"
                )}
              >
                {done ? (
                  <CheckCircle2 size={12} className="text-primary-foreground" />
                ) : (
                  <div
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      current ? "bg-primary" : "bg-border"
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[9px] font-medium text-center leading-tight max-w-[38px]",
                  done || current ? "text-primary" : "text-muted-foreground/40"
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "h-0.5 w-4 mx-0.5 mb-5 shrink-0",
                  idx < currentIdx ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Star rating ─────────────────────────────────────────────────── */

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          className="transition-transform active:scale-90 hover:scale-110"
        >
          <Star
            size={26}
            className={cn(
              "transition-colors",
              (hovered || value) >= star
                ? "fill-amber-400 text-amber-400"
                : "text-border"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* ── Message bubble ──────────────────────────────────────────────── */

function Bubble({ msg, isMe }: { msg: OrderMessage; isMe: boolean }) {
  return (
    <div className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-4 py-2.5",
          isMe
            ? "bg-primary text-primary-foreground rounded-tr-sm"
            : "bg-muted text-foreground rounded-tl-sm"
        )}
      >
        <p className="text-sm leading-relaxed">{msg.content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isMe ? "text-primary-foreground/60 text-right" : "text-muted-foreground"
          )}
        >
          {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? "";
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { toast } = useToast();

  const { data: order, isLoading } = useGetClientOrder(id, {
    query: { enabled: !!id, queryKey: getGetClientOrderQueryKey(id) },
  });
  const sendMsg = useSendOrderMessage();
  const createReview = useCreateOrderReview();

  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [showReviewForm, setShowReviewForm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = order?.messages ?? [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetClientOrderQueryKey(id) });

  const handleSend = () => {
    if (!message.trim() || !id) return;
    const content = message.trim();
    setMessage("");
    sendMsg.mutate(
      { orderId: id, data: { content } },
      {
        onSuccess: invalidate,
        onError: () =>
          toast({ title: "Message failed to send", description: "Please try again.", variant: "destructive" }),
      }
    );
  };

  const handleReview = () => {
    if (!rating || !id) return;
    createReview.mutate(
      { id, data: { rating, comment: reviewComment || undefined } },
      {
        onSuccess: () => {
          invalidate();
          setShowReviewForm(false);
          toast({ title: "Review submitted", description: "Thank you for your feedback." });
        },
        onError: () =>
          toast({ title: "Failed to submit review", description: "Please try again.", variant: "destructive" }),
      }
    );
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {[120, 96, 240].map((h, i) => (
          <div
            key={i}
            className="rounded-xl bg-muted/25 animate-pulse"
            style={{ height: h }}
          />
        ))}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-muted-foreground text-sm">Order not found</p>
      </div>
    );
  }

  const canReview =
    (order.status === "DELIVERED" || order.status === "COMPLETED") && !order.review;

  return (
    <motion.div
      className="max-w-2xl mx-auto px-4 py-6 space-y-5"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <Link href="/client/orders">
          <button className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={17} />
          </button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-[Cormorant_Garamond] text-xl font-semibold text-foreground truncate">
            {order.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {order.producerStudioName ?? order.producerName ?? "Designer"} ·{" "}
            {formatDate(order.createdAt)}
          </p>
        </div>
      </div>

      {/* ── Progress ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Progress
        </p>
        <StatusStepper status={order.status} />
      </div>

      {/* ── Details ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Details
        </p>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          {order.agreedPrice != null && (
            <>
              <dt className="text-muted-foreground">Price</dt>
              <dd className="font-medium">
                {formatPrice(order.agreedPrice, order.currency)}
              </dd>
            </>
          )}
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className={cn("font-medium", order.depositPaid ? "text-green-400" : "")}>
            {order.depositPaid ? "Paid ✓" : "Pending"}
          </dd>
          {order.dueDate && (
            <>
              <dt className="text-muted-foreground">Due date</dt>
              <dd className="font-medium">{formatDate(order.dueDate)}</dd>
            </>
          )}
          {order.estimatedDays && (
            <>
              <dt className="text-muted-foreground">Timeline</dt>
              <dd className="font-medium">{order.estimatedDays} days</dd>
            </>
          )}
        </dl>
        {order.description && (
          <p className="text-sm text-muted-foreground border-t border-border pt-3 mt-3 leading-relaxed">
            {order.description}
          </p>
        )}
      </div>

      {/* ── Timeline events ── */}
      {order.timelineEvents && order.timelineEvents.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Timeline
          </p>
          <div className="space-y-3">
            {order.timelineEvents.map((evt, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className={cn(
                    "mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                    evt.completed
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {evt.completed ? (
                    <CheckCircle2 size={11} />
                  ) : (
                    <Clock size={11} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      evt.completed ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {evt.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(evt.date)}</p>
                  {evt.note && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{evt.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <MessageSquare size={13} className="text-muted-foreground" />
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Messages
          </p>
        </div>

        <div className="h-64 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground/40">
              No messages yet — start the conversation
            </div>
          ) : (
            messages.map((msg) => (
              <Bubble key={msg.id} msg={msg} isMe={msg.senderId === user?.id} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2 items-end">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Send a message…"
            rows={1}
            className="resize-none min-h-0 text-sm bg-muted/30 border-muted-foreground/10 flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sendMsg.isPending}
            size="icon"
            className="shrink-0 h-9 w-9"
          >
            <Send size={14} />
          </Button>
        </div>
      </div>

      {/* ── Review form ── */}
      {canReview && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Leave a Review
          </p>
          {!showReviewForm ? (
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => setShowReviewForm(true)}
            >
              <Star size={14} className="mr-2" />
              Rate your experience
            </Button>
          ) : (
            <div className="space-y-4">
              <StarRating value={rating} onChange={setRating} />
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Share your experience with other clients (optional)…"
                rows={3}
                className="resize-none text-sm bg-muted/30 border-muted-foreground/10"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleReview}
                  disabled={!rating || createReview.isPending}
                  className="flex-1 text-sm"
                >
                  {createReview.isPending ? "Submitting…" : "Submit Review"}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setShowReviewForm(false)}
                  className="text-sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Existing review ── */}
      {order.review && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Your Review
          </p>
          <div className="flex gap-0.5 mb-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={cn(
                  s <= order.review!.rating
                    ? "fill-amber-400 text-amber-400"
                    : "text-border"
                )}
              />
            ))}
          </div>
          {order.review.comment && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {order.review.comment}
            </p>
          )}
        </div>
      )}

      {/* ── Producer contact ── */}
      {order.producerWhatsapp && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">Contact Designer</p>
            <p className="text-xs text-muted-foreground">
              {order.producerStudioName ?? order.producerName}
            </p>
          </div>
          <a
            href={`https://wa.me/${order.producerWhatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-green-400 hover:text-green-300 font-medium transition-colors"
          >
            WhatsApp
            <ExternalLink size={12} />
          </a>
        </div>
      )}
    </motion.div>
  );
}
