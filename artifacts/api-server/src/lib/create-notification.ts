import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { broadcastToUser } from "./notification-bus";

type NotifType = typeof notificationsTable.$inferInsert["type"];

export interface NotificationInput {
  userId: string;
  type: NotifType;
  title: string;
  body?: string;
  link?: string;
  relatedId?: string;
}

export async function createNotification(input: NotificationInput): Promise<void> {
  if (!input.userId) return;
  try {
    const [notification] = await db
      .insert(notificationsTable)
      .values(input)
      .returning();
    broadcastToUser(input.userId, "notification", notification);
  } catch (err) {
    console.error("[notification] failed to create:", err);
  }
}
