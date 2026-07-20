import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../../lib/logger";

const router: IRouter = Router();

/**
 * POST /api/whatsapp/webhook
 *
 * Twilio status-callback endpoint.
 * Twilio POSTs delivery status updates here when configured as the
 * "Status Callback URL" on a message or messaging service.
 *
 * We log the event and return 204. Failures are never surfaced to Twilio
 * (it would retry) — we treat delivery tracking as best-effort.
 *
 * To enable: set the Twilio webhook URL to:
 *   https://<your-domain>/api/whatsapp/webhook
 */
router.post("/whatsapp/webhook", (req: Request, res: Response): void => {
  const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body as {
    MessageSid?: string;
    MessageStatus?: string;
    To?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
  };

  if (ErrorCode) {
    logger.warn({ MessageSid, MessageStatus, To, ErrorCode, ErrorMessage }, "whatsapp: delivery error");
  } else {
    logger.info({ MessageSid, MessageStatus, To }, "whatsapp: status update");
  }

  res.sendStatus(204);
});

export default router;
