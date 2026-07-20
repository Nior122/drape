import { Router, type IRouter } from "express";
import innerRouter from "./routes";

const router: IRouter = Router();

router.use(innerRouter);

export default router;
