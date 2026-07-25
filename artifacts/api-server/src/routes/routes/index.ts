import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import aiRouter from "./ai";
import aiStudioRouter from "./ai-studio";
import storageRouter from "./storage";
import clientRouter from "./client";
import clientPhase3Router from "./client-phase3";
import producerRouter from "./producer";
import productionGuideRouter from "./production-guide";
import whatsappRouter from "./whatsapp";
import notificationsStreamRouter from "./notifications-stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(aiRouter);

// Mount AI Studio BEFORE producer router so its enhanced routes take precedence
router.use(aiStudioRouter);

router.use(storageRouter);
router.use(clientRouter);
router.use(clientPhase3Router);

// Mount producer/designer routes
router.use(producerRouter);

router.use(productionGuideRouter);
router.use(whatsappRouter);
router.use(notificationsStreamRouter);

export default router;
