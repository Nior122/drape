import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import aiRouter from "./ai";
import storageRouter from "./storage";
import clientRouter from "./client";
import producerRouter from "./producer";
import productionGuideRouter from "./production-guide";
import whatsappRouter from "./whatsapp";
import notificationsStreamRouter from "./notifications-stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(aiRouter);
router.use(storageRouter);
router.use(clientRouter);

// Mount producer/designer routes — the producer router contains absolute
// path routes for both /producer/* (backward compat) and /designer/* (new)
router.use(producerRouter);

router.use(productionGuideRouter);
router.use(whatsappRouter);
router.use(notificationsStreamRouter);

export default router;
