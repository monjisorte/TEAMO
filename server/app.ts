import express, { type Express, type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { apiGate, registerAuthRoutes } from "./auth.js";
import { registerAuthz, checkIdsInPayload } from "./authz.js";

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

  // 認証・認可（/api 全体）
  app.use("/api", apiGate);            // セッション必須 + ロール別ポリシー
  app.use("/api", checkIdsInPayload);  // query/body 内の ID がセッションの所属と一致するか
  registerAuthz(app);                  // パスパラメータ（:teamId 等）の所属チェック
  registerAuthRoutes(app);             // /api/auth/me, /api/auth/logout

  await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(err);
    if (!res.headersSent) res.status(status).json({ message });
  });

  return app;
}
