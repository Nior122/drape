import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppButtonProps {
  /** Raw phone number in any format — international, local UK, or E.164. */
  phone: string;
  /** Pre-filled message text (URL-encoded automatically). */
  message?: string;
  /** Button label. Defaults to "WhatsApp". */
  label?: string;
  className?: string;
  variant?: "default" | "icon";
}

/**
 * Normalises a phone number to a wa.me-compatible string (digits only, no +).
 * Handles international (+44...) and UK local (07...) formats.
 */
function toWaMe(phone: string): string {
  const stripped = phone.trim().replace(/[\s\-().]/g, "");
  if (stripped.startsWith("+")) return stripped.slice(1).replace(/\D/g, "");
  const digits = stripped.replace(/\D/g, "");
  if (stripped.startsWith("0") && digits.length >= 10) return `44${digits.slice(1)}`;
  return digits;
}

/**
 * Opens WhatsApp Web / the WhatsApp app with the given phone number
 * and an optional pre-filled message.
 *
 * Usage:
 *   <WhatsAppButton phone="+44 7700 900000" message="Hi, I saw your Drape profile!" />
 *   <WhatsAppButton phone="07700900000" variant="icon" />
 */
export function WhatsAppButton({
  phone,
  message,
  label = "WhatsApp",
  className,
  variant = "default",
}: WhatsAppButtonProps) {
  const number = toWaMe(phone);
  const href = message
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : `https://wa.me/${number}`;

  if (!number) return null;

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open WhatsApp"
        className={cn(
          "inline-flex items-center justify-center w-9 h-9 rounded-full",
          "bg-[#25D366] hover:bg-[#20BD5C] text-white transition-colors",
          className,
        )}
      >
        <MessageCircle size={16} />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
        "bg-[#25D366] hover:bg-[#20BD5C] text-white transition-colors",
        className,
      )}
    >
      <MessageCircle size={15} />
      {label}
    </a>
  );
}
