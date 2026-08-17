// Vercel Serverless Function エントリ。/api/* と /objects/* がここに rewrite される（vercel.json）。
import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/app";

const appPromise = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await appPromise;
  app(req as any, res as any);
}
