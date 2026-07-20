/**
 * WhatsApp notification service for Drape.
 *
 * Provider resolution (first match wins):
 *   1. Twilio  — when TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM are set
 *   2. Log-only — prints to stdout; used in dev or when credentials are absent
 *
 * All public functions catch their own errors so a failed notification
 * never breaks the calling request flow.
 */
import {
  createTwilioProvider,
  LogProvider,
  normalizePhone,
  briefReadyMessage,
  orderAcceptedMessage,
  statusUpdateMessage,
  measurementReminderMessage,
  productionGuideReadyMessage,
  type WhatsAppProvider,
  type OrderContext,
  type BriefContext,
} from "@workspace/whatsapp";
import { db } from "@workspace/db";
import { profilesTable, usersTable, producerProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const provider: WhatsAppProvider = createTwilioProvider() ?? new LogProvider();

async function resolvePhone(userId: string): Promise<string | null> {
  const [profile] = await db
    .select({ phone: profilesTable.phone, whatsapp: profilesTable.whatsapp })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  const raw = profile?.whatsapp ?? profile?.phone;
  if (!raw) return null;
  return normalizePhone(raw);
}

async function send(userId: string, body: string): Promise<void> {
  try {
    const to = await resolvePhone(userId);
    if (!to) return;
    await provider.sendMessage(to, body);
    logger.info({ userId, to }, "whatsapp: message sent");
  } catch (err) {
    logger.warn({ err, userId }, "whatsapp: send failed (silenced)");
  }
}

/** Notify a client that their AI fashion brief is finalised. */
export async function notifyBriefReady(userId: string, brief: BriefContext): Promise<void> {
  try {
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, userId));
    await send(userId, briefReadyMessage(user?.name ?? null, brief));
  } catch (err) {
    logger.warn({ err, userId }, "whatsapp: notifyBriefReady failed (silenced)");
  }
}

/** Notify a producer that they have accepted an order. */
export async function notifyOrderAccepted(producerId: string, order: OrderContext): Promise<void> {
  try {
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, producerId));
    await send(producerId, orderAcceptedMessage(user?.name ?? null, order));
  } catch (err) {
    logger.warn({ err, producerId }, "whatsapp: notifyOrderAccepted failed (silenced)");
  }
}

/** Notify a client that their order status has changed. */
export async function notifyStatusUpdate(
  clientId: string,
  order: OrderContext,
): Promise<void> {
  try {
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, clientId));

    let enriched = order;
    if (!enriched.studioName && enriched.producerId) {
      const [prod] = await db
        .select({ studioName: producerProfilesTable.studioName })
        .from(producerProfilesTable)
        .where(eq(producerProfilesTable.userId, enriched.producerId));
      enriched = { ...enriched, studioName: prod?.studioName ?? null };
    }

    await send(clientId, statusUpdateMessage(user?.name ?? null, enriched));
  } catch (err) {
    logger.warn({ err, clientId }, "whatsapp: notifyStatusUpdate failed (silenced)");
  }
}

/** Remind a client to add their measurements before production. */
export async function notifyMeasurementReminder(
  clientId: string,
  order: OrderContext,
): Promise<void> {
  try {
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, clientId));
    await send(clientId, measurementReminderMessage(user?.name ?? null, order));
  } catch (err) {
    logger.warn({ err, clientId }, "whatsapp: notifyMeasurementReminder failed (silenced)");
  }
}

/** Notify a producer that the AI production guide is ready. */
export async function notifyProductionGuideReady(
  producerId: string,
  order: OrderContext,
): Promise<void> {
  try {
    const [user] = await db
      .select({ name: usersTable.name })
      .from(usersTable)
      .where(eq(usersTable.id, producerId));
    await send(producerId, productionGuideReadyMessage(user?.name ?? null, order));
  } catch (err) {
    logger.warn({ err, producerId }, "whatsapp: notifyProductionGuideReady failed (silenced)");
  }
}
