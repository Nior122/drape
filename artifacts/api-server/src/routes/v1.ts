/**
 * API Versioning — /api/v1 mount
 *
 * This file re-exports all current routes under the /api/v1 namespace.
 * When v2 arrives, create v2.ts with the new handlers and mount it
 * alongside v1 so both versions coexist.
 *
 * Deprecation strategy:
 *   - v1 endpoints are deprecated with a Deprecation header
 *   - After 6-month notice, v1 can be removed
 *   - Clients receive Sunset header indicating removal date
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import router from "./index";

const v1Router: IRouter = Router();

// Add version-awareness to every v1 request
v1Router.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-API-Version", "1.0");
  // Uncomment when v2 is live:
  // res.setHeader("Deprecation", "true");
  // res.setHeader("Sunset", "Sat, 31 Dec 2027 23:59:59 GMT");
  // res.setHeader("Link", '</api/v2>; rel="successor-version"');
  next();
});

v1Router.use(router);

export default v1Router;
