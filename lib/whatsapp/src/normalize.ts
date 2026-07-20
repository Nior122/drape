/**
 * Normalizes a phone number to E.164 international format (+country+digits).
 * Returns null if the number cannot be reliably normalized.
 *
 * Examples:
 *   "+44 7700 900 000"  →  "+447700900000"
 *   "07700 900000"      →  "+447700900000"  (UK local assumed)
 *   "447700900000"      →  "+447700900000"
 *   "+1-800-555-0100"   →  "+18005550100"
 */
export function normalizePhone(raw: string): string | null {
  if (!raw) return null;

  const stripped = raw.trim().replace(/[\s\-().]/g, "");
  if (!stripped) return null;

  if (stripped.startsWith("+")) {
    const digits = stripped.slice(1).replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) return `+${digits}`;
    return null;
  }

  const digits = stripped.replace(/\D/g, "");

  if (stripped.startsWith("0") && digits.length >= 10) {
    return `+44${digits.slice(1)}`;
  }

  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}

/**
 * Converts a normalized E.164 number to a wa.me URL (without the leading +).
 * Used for WhatsApp web click-to-chat links.
 */
export function toWaMeNumber(normalized: string): string {
  return normalized.startsWith("+") ? normalized.slice(1) : normalized;
}
