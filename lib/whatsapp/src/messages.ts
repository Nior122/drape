import type { OrderContext, BriefContext } from "./types";

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    ENQUIRY: "Enquiry Received",
    ACCEPTED: "Accepted",
    DEPOSIT_PAID: "Deposit Paid",
    IN_PRODUCTION: "In Production",
    FITTING: "Fitting Scheduled",
    FINAL_PAYMENT: "Final Payment Due",
    DELIVERED: "Delivered",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  };
  return labels[status] ?? status.replace(/_/g, " ");
}

function fmt(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Sent to the client when their AI fashion brief is finalised.
 */
export function briefReadyMessage(clientName: string | null, brief: BriefContext): string {
  const name = clientName ?? "there";
  const summary = brief.styleSummary ? `\n\n_"${brief.styleSummary}"_` : "";
  return (
    `✨ Hi ${name}! Your Drape fashion brief is ready.${summary}\n\n` +
    `Your style vision has been captured and is ready to match with a talented designer. ` +
    `Log in to Drape to view your brief and explore producers.\n\n` +
    `— The Drape Team`
  );
}

/**
 * Sent to the producer when they accept an order.
 */
export function orderAcceptedMessage(producerName: string | null, order: OrderContext): string {
  const name = producerName ?? "there";
  const priceLine =
    order.agreedPrice != null
      ? `\n💰 Agreed price: ${order.currency ?? "GBP"} ${(order.agreedPrice / 100).toFixed(2)}`
      : "";
  return (
    `🎉 Hi ${name}! You've accepted order *${order.title}*.${priceLine}\n\n` +
    `The client has been notified. Log in to your Drape studio to review measurements and start production planning.\n\n` +
    `— Drape`
  );
}

/**
 * Sent to the client whenever the producer changes the order status.
 */
export function statusUpdateMessage(clientName: string | null, order: OrderContext): string {
  const name = clientName ?? "there";
  const label = statusLabel(order.status);
  const studio = order.studioName ?? order.producerName ?? "your designer";
  const dueLine = order.dueDate ? `\n📅 Due: ${fmt(order.dueDate)}` : "";
  return (
    `👗 Hi ${name}! Your order *${order.title}* with ${studio} has been updated.\n\n` +
    `New status: *${label}*${dueLine}\n\n` +
    `Log in to Drape for full details.\n\n` +
    `— Drape`
  );
}

/**
 * Sent to the client as a nudge to add measurements before production begins.
 */
export function measurementReminderMessage(clientName: string | null, order: OrderContext): string {
  const name = clientName ?? "there";
  return (
    `📏 Hi ${name}! A quick reminder for your order *${order.title}*.\n\n` +
    `Your designer needs your measurements before production can begin. ` +
    `Please log in to Drape and add them under your profile — it only takes a minute!\n\n` +
    `— Drape`
  );
}

/**
 * Sent to the producer when the AI production guide is generated for their order.
 */
export function productionGuideReadyMessage(producerName: string | null, order: OrderContext): string {
  const name = producerName ?? "there";
  return (
    `📋 Hi ${name}! The AI production guide for *${order.title}* is ready.\n\n` +
    `It includes cutting instructions, sewing sequence, fitting checklists, and QC steps. ` +
    `Log in to your Drape studio to view and download the PDF.\n\n` +
    `— Drape`
  );
}
