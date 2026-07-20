import type { WhatsAppProvider } from "./types";

/**
 * Log-only provider — used when Twilio credentials are absent (dev / unconfigured).
 * Prints the message to stdout so the full notification flow is exercised
 * without sending real messages.
 */
export class LogProvider implements WhatsAppProvider {
  async sendMessage(to: string, body: string): Promise<void> {
    console.log(`[WhatsApp log-only] to=${to}\n${body.slice(0, 200)}`);
  }
}
