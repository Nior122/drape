import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { addSseClient, removeSseClient } from "../../lib/notification-bus";

const router: IRouter = Router();

router.use("/notifications", requireAuth);

router.get("/notifications/stream", (req: Request, res: Response): void => {
  const userId = req.userId!;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  res.write(`event: connected\ndata: ${JSON.stringify({ userId })}\n\n`);

  addSseClient(userId, res);

  const keepalive = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(keepalive);
    }
  }, 20_000);

  req.on("close", () => {
    clearInterval(keepalive);
    removeSseClient(userId, res);
  });
});

export default router;
