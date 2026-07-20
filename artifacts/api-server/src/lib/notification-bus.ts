import type { Response } from "express";

const clients = new Map<string, Set<Response>>();

export function addSseClient(userId: string, res: Response): void {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
}

export function removeSseClient(userId: string, res: Response): void {
  clients.get(userId)?.delete(res);
  if (clients.get(userId)?.size === 0) clients.delete(userId);
}

export function broadcastToUser(userId: string, event: string, data: unknown): void {
  const subs = clients.get(userId);
  if (!subs || subs.size === 0) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  subs.forEach((res) => {
    try {
      res.write(payload);
    } catch {
      subs.delete(res);
    }
  });
}
