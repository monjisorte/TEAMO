import express, { type Express, type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";

export function log(message: string, source = "express") {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [${source}] ${message}`);
}

/**
 * Express アプリを構築して返す（listen はしない）。
 * - ローカル開発: server/index.ts が listen + Vite middleware を付ける
 * - Vercel:       api/index.ts がそのままハンドラとして export する
 */
export async function createApp(): Promise<Express> {
  const app = express();
  app.set("trust proxy", 1);

  // Stripe webhook は署名検証のため raw body が必要（json パーサより前に）
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
      if (path.startsWith("/api")) {
        log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
      }
    });
    next();
  });

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    if (!res.headersSent) res.status(status).json({ message });
  });

  return app;
}
