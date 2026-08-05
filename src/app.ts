import express, { Router, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { webhookRoutes } from "./webhook/routes";
import { bapWebhookRoutes } from "./bap-webhook/routes";
import { logIncoming } from "./utils/logger";
export function createApp() {
  const app = express();
  app.use(cors());
  app.use(helmet());

  app.use(express.json({ limit: "5mb" }));
  app.use((req, _res, next) => {
    logIncoming(req.method, req.originalUrl, req.body);
    next();
  });

  // Create main API router
  const apiRouter = Router();

  // Mount all routes under the main API router
  apiRouter.use("/webhook", webhookRoutes());
  apiRouter.use("/bap-webhook", bapWebhookRoutes());
  // Mount the main API router with /api prefix
  apiRouter.use("/health", (req: Request, res: Response) => {
    return res.status(200).json({ message: "OK!" });
  });
  app.use("/api", apiRouter);

  // Global error fallback
  app.use((err: any, req: any, res: any, _next: any) => {
    req?.log?.error?.(err);
    res.status(err.status || 500).json({ error: "internal_error" });
  });
  return app;
}
