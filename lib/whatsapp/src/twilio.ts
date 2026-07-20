import type { WhatsAppProvider } from "./types";

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  /** The Twilio WhatsApp-enabled number, e.g. "+14155238886" or "whatsapp:+14155238886" */
  from: string;
}

/**
 * Twilio WhatsApp provider.
 *
 * Uses the Twilio REST API directly with fetch (no SDK) to keep the server
 * bundle lean. Controlled by env vars:
 *   TWILIO_ACCOUNT_SID    — Twilio account SID
 *   TWILIO_AUTH_TOKEN     — Twilio auth token
 *   TWILIO_WHATSAPP_FROM  — WhatsApp-enabled Twilio number (e.g. +14155238886)
 */
export class TwilioProvider implements WhatsAppProvider {
  private readonly endpoint: string;
  private readonly credentials: string;
  private readonly from: string;

  constructor(config: TwilioConfig) {
    this.endpoint = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
    this.credentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString("base64");
    this.from = config.from.startsWith("whatsapp:") ? config.from : `whatsapp:${config.from}`;
  }

  async sendMessage(to: string, body: string): Promise<void> {
    const toAddr = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: this.from, To: toAddr, Body: body }).toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Twilio ${response.status}: ${text.slice(0, 200)}`);
    }
  }
}

/**
 * Creates a TwilioProvider from env vars, or returns null if any credential is missing.
 * Caller should fall back to LogProvider when this returns null.
 */
export function createTwilioProvider(): TwilioProvider | null {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const authToken = process.env["TWILIO_AUTH_TOKEN"];
  const from = process.env["TWILIO_WHATSAPP_FROM"];
  if (!accountSid || !authToken || !from) return null;
  return new TwilioProvider({ accountSid, authToken, from });
}
