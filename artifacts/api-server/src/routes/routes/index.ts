import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import aiRouter from "./ai";
import aiStudioRouter from "./ai-studio";
import visionRouter from "./vision";
import storageRouter from "./storage";
import clientRouter from "./client";
import producerRouter from "./producer";
import productionRouter from "./production";
import productionGuideRouter from "./production-guide";
import whatsappRouter from "./whatsapp";
import notificationsStreamRouter from "./notifications-stream";
import businessRouter from "./business";
import marketplaceRouter from "./marketplace";
import adminRouter from "./admin";
import observabilityRouter from "./observability";

const router: IRouter = Router();

// Observability & health (no auth)
router.use(observabilityRouter);

// Business routes
router.use(healthRouter);
router.use(authRouter);
router.use(aiRouter);
router.use(aiStudioRouter);
router.use(visionRouter);
router.use(storageRouter);
router.use(clientRouter);
router.use(producerRouter);
router.use(productionRouter);
router.use(productionGuideRouter);
router.use(whatsappRouter);
router.use(notificationsStreamRouter);
router.use(businessRouter);
router.use(marketplaceRouter);

// Admin (requireAuth + requireRole("ADMIN") inside router)
router.use(adminRouter);

export default router;
