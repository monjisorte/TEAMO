// ローカル開発用エントリ（npm run dev / npm start）。Vercel では api/index.ts が使われる。
import { createServer } from "http";
import { createApp, log } from "./app";
import { setupVite, serveStatic } from "./vite";

(async () => {
  const app = await createApp();
  const server = createServer(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0" }, () => log(`serving on port ${port}`));
})();
