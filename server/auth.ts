// 認証（セッション）: ログイン時に JWT を HttpOnly Cookie で発行し、以降の /api/* で検証する。
// クライアントが送ってくる teamId / studentId / coachId は信用せず、
// authz.ts の所属チェックでセッションと突き合わせる。
import type { Express, Request, Response, NextFunction } from "express";
import { SignJWT, jwtVerify } from "jose";

export type Role = "coach" | "student" | "admin";

export interface Session {
  role: Role;
  id: string;             // coach.id / student.id / admin.id
  teamId: string | null;  // admin は null
}

const COOKIE_NAME = "teamo_session";
const SESSION_TTL_SEC = 30 * 24 * 60 * 60; // 30日

function secretKey(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production");
    }
    console.warn("SESSION_SECRET 未設定: 開発用の固定値を使用します");
    return new TextEncoder().encode("dev-only-insecure-secret-change-me");
  }
  return new TextEncoder().encode(s);
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}

export async function issueSession(res: Response, session: Session): Promise<void> {
  const token = await new SignJWT({ role: session.role, teamId: session.teamId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(session.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SEC}s`)
    .sign(secretKey());
  const secure = process.env.NODE_ENV === "production";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}${secure ? "; Secure" : ""}`,
  );
}

export function clearSession(res: Response): void {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

export async function readSession(req: Request): Promise<Session | null> {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    const role = payload.role as Role;
    if (!payload.sub || !["coach", "student", "admin"].includes(role)) return null;
    return { role, id: payload.sub, teamId: (payload.teamId as string | null) ?? null };
  } catch {
    return null;
  }
}

/** ルート個別で使う「ログイン必須」ミドルウェア（グローバルゲートと併用可） */
export async function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.auth) return next();
  const session = await readSession(req);
  if (!session) return res.status(401).json({ error: "ログインが必要です" });
  req.auth = session;
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "権限がありません" });
    }
    next();
  };
}

// --- 認証不要（公開）エンドポイント ---
const PUBLIC_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  { method: "POST", pattern: /^\/api\/teams\/register$/ },
  { method: "POST", pattern: /^\/api\/student\/(register|login|request-password-reset|verify-reset-token|reset-password)$/ },
  { method: "POST", pattern: /^\/api\/coach\/(login|request-password-reset|verify-reset-token|reset-password)$/ },
  // 注: /api/coach/register は既存コーチがコーチを追加する操作なのでログイン必須（teamId は payload チェックで検証）
  { method: "POST", pattern: /^\/api\/admin\/(register|login)$/ },
  { method: "GET", pattern: /^\/api\/admin\/setup-needed$/ },
  { method: "GET", pattern: /^\/api\/sports$/ },
  { method: "POST", pattern: /^\/api\/stripe\/webhook$/ },
  { method: "GET", pattern: /^\/api\/auth\/me$/ },
  { method: "POST", pattern: /^\/api\/auth\/logout$/ },
];

// --- 選手（student）ロールに許可するエンドポイント（それ以外は 403）---
const STUDENT_ALLOWED: Array<{ methods: string[]; pattern: RegExp }> = [
  { methods: ["GET"], pattern: /^\/api\/teams\/[^/]+$/ },
  { methods: ["GET"], pattern: /^\/api\/categories\/[^/]+$/ },
  { methods: ["GET"], pattern: /^\/api\/schedules$/ },
  { methods: ["GET"], pattern: /^\/api\/schedule-files$/ },
  { methods: ["GET", "POST"], pattern: /^\/api\/attendances$/ },
  { methods: ["PUT"], pattern: /^\/api\/attendances\/[^/]+$/ },
  { methods: ["GET", "PATCH", "PUT", "POST"], pattern: /^\/api\/student\/[^/]+(\/.*)?$/ },
  { methods: ["DELETE"], pattern: /^\/api\/students\/[^/]+$/ }, // 退会（本人のみ。authz で検証）
  { methods: ["GET", "POST", "DELETE"], pattern: /^\/api\/student-categories(\/.*)?$/ },
  { methods: ["GET"], pattern: /^\/api\/team\/[^/]+\/(documents|coaches)$/ },
  { methods: ["POST"], pattern: /^\/api\/team\/[^/]+\/contact$/ },
  { methods: ["GET"], pattern: /^\/api\/(documents|folders)$/ },
  { methods: ["GET"], pattern: /^\/api\/coach\/[^/]+$/ },
  { methods: ["GET", "POST", "PUT", "DELETE"], pattern: /^\/api\/sibling-links(\/.*)?$/ },
  { methods: ["GET"], pattern: /^\/api\/siblings\/[^/]+$/ },
  { methods: ["POST"], pattern: /^\/api\/objects\/(upload-public|download-url)$/ },
  { methods: ["GET"], pattern: /^\/api\/auth\/me$/ },
  { methods: ["POST"], pattern: /^\/api\/auth\/logout$/ },
];

/**
 * /api 全体のゲート: 公開ルート以外はセッション必須。
 * 管理者ルートは admin のみ、選手は許可リストのみ。所属チェックは authz.ts。
 */
export async function apiGate(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  const path = (req.baseUrl || "") + req.path; // app.use("/api", ...) 内では req.path から /api が落ちるため

  // セッションは公開ルートでも読んでおく（/api/auth/me 用）
  req.auth = await readSession(req);

  if (PUBLIC_ROUTES.some((r) => r.method === method && r.pattern.test(path))) return next();
  if (!req.auth) return res.status(401).json({ error: "ログインが必要です" });

  if (path.startsWith("/api/admin/")) {
    if (req.auth.role !== "admin") return res.status(403).json({ error: "権限がありません" });
    return next();
  }
  if (req.auth.role === "admin") return next(); // 管理者は全許可

  if (req.auth.role === "student") {
    const ok = STUDENT_ALLOWED.some((r) => r.methods.includes(method) && r.pattern.test(path));
    if (!ok) return res.status(403).json({ error: "権限がありません" });
  }
  next();
}

/** /api/auth/* を登録 */
export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/me", async (req, res) => {
    res.json({ session: req.auth ?? null });
  });
  app.post("/api/auth/logout", (_req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });
}

// 旧 replitAuth 互換（呼び出し側が残っていても壊れないように）
export async function setupAuth(_app: Express): Promise<void> {}

declare global {
  namespace Express {
    interface Request {
      auth?: Session | null;
    }
  }
}
