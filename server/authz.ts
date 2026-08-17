// 認可（所属チェック）: リクエストに含まれる ID が、セッションのチーム／本人のものかを検証する。
//  - app.param(...) でパスパラメータ（:teamId / :studentId / :coachId / :id 等）を検証
//  - checkIdsInPayload で query / body に含まれる ID（teamId, studentId, scheduleId, ...）を検証
// 管理者（admin）はすべて許可。
import type { Express, Request, Response, NextFunction } from "express";
import { eq, or, and } from "drizzle-orm";
import { db } from "./db.js";
import {
  students, coaches, schedules, categories, venues, folders, sharedDocuments,
  attendances, coachCategories, siblingLinks, tuitionPayments, scheduleFiles, studentCategories,
} from "../shared/schema.js";

const forbidden = (res: Response) => res.status(403).json({ error: "権限がありません" });
const UUID_LIKE = /^[0-9a-zA-Z_-]{6,}$/;

// ---- 単一リソース → 所属 teamId 解決 ----
async function teamOf(table: string, id: string): Promise<string | null | undefined> {
  // undefined = 見つからない / null = チームに属さない
  const one = async (rows: any[]) => (rows.length ? (rows[0].teamId ?? null) : undefined);
  switch (table) {
    case "students":  return one(await db.select({ teamId: students.teamId }).from(students).where(eq(students.id, id)).limit(1));
    case "coaches":   return one(await db.select({ teamId: coaches.teamId }).from(coaches).where(eq(coaches.id, id)).limit(1));
    case "schedules": return one(await db.select({ teamId: schedules.teamId }).from(schedules).where(eq(schedules.id, id)).limit(1));
    case "categories":return one(await db.select({ teamId: categories.teamId }).from(categories).where(eq(categories.id, id)).limit(1));
    case "venues":    return one(await db.select({ teamId: venues.teamId }).from(venues).where(eq(venues.id, id)).limit(1));
    case "folders":   return one(await db.select({ teamId: folders.teamId }).from(folders).where(eq(folders.id, id)).limit(1));
    case "documents": return one(await db.select({ teamId: sharedDocuments.teamId }).from(sharedDocuments).where(eq(sharedDocuments.id, id)).limit(1));
    case "tuition":   return one(await db.select({ teamId: tuitionPayments.teamId }).from(tuitionPayments).where(eq(tuitionPayments.id, id)).limit(1));
    case "attendances": {
      const r = await db.select({ studentId: attendances.studentId }).from(attendances).where(eq(attendances.id, id)).limit(1);
      return r.length ? teamOf("students", r[0].studentId) : undefined;
    }
    case "coachCategories": {
      const r = await db.select({ coachId: coachCategories.coachId }).from(coachCategories).where(eq(coachCategories.id, id)).limit(1);
      return r.length ? teamOf("coaches", r[0].coachId) : undefined;
    }
    case "scheduleFiles": {
      const r = await db.select({ scheduleId: scheduleFiles.scheduleId }).from(scheduleFiles).where(eq(scheduleFiles.id, id)).limit(1);
      return r.length ? teamOf("schedules", r[0].scheduleId) : undefined;
    }
    default: return undefined;
  }
}

/** 選手本人がアクセスしてよい studentId 集合（本人 + 承認済み兄弟） */
async function allowedStudentIds(req: Request): Promise<Set<string>> {
  const me = req.auth!.id;
  if ((req as any)._allowedStudentIds) return (req as any)._allowedStudentIds;
  const set = new Set<string>([me]);
  const links = await db.select().from(siblingLinks)
    .where(and(eq(siblingLinks.status, "approved"), or(eq(siblingLinks.studentId1, me), eq(siblingLinks.studentId2, me))));
  for (const l of links) { set.add(l.studentId1); set.add(l.studentId2); }
  (req as any)._allowedStudentIds = set;
  return set;
}

// ---- 各 ID 種別の検証 ----
async function canAccessTeam(req: Request, teamId: string): Promise<boolean> {
  return req.auth!.role === "admin" || req.auth!.teamId === teamId;
}
async function canAccessStudent(req: Request, studentId: string): Promise<boolean> {
  const a = req.auth!;
  if (a.role === "admin") return true;
  if (a.role === "student") return (await allowedStudentIds(req)).has(studentId);
  const t = await teamOf("students", studentId);
  return t === undefined ? true /* 存在しない → ルート側で 404 */ : t === a.teamId;
}
async function canAccessCoach(req: Request, coachId: string): Promise<boolean> {
  const a = req.auth!;
  if (a.role === "admin") return true;
  const t = await teamOf("coaches", coachId);
  return t === undefined ? true : t === a.teamId;
}
async function canAccessResource(req: Request, table: string, id: string): Promise<boolean> {
  const a = req.auth!;
  if (a.role === "admin") return true;
  if (table === "attendances" && a.role === "student") {
    const r = await db.select({ studentId: attendances.studentId }).from(attendances).where(eq(attendances.id, id)).limit(1);
    return r.length === 0 || (await allowedStudentIds(req)).has(r[0].studentId);
  }
  const t = await teamOf(table, id);
  return t === undefined ? true : t === a.teamId;
}
async function canAccessSiblingLink(req: Request, linkId: string): Promise<boolean> {
  const a = req.auth!;
  if (a.role === "admin") return true;
  const r = await db.select().from(siblingLinks).where(eq(siblingLinks.id, linkId)).limit(1);
  if (!r.length) return true;
  if (a.role === "student") {
    // 申請中の承認は相手側が行うので、承認済み集合ではなく本人一致で判定
    return r[0].studentId1 === a.id || r[0].studentId2 === a.id;
  }
  const t = await teamOf("students", r[0].studentId1);
  return t === a.teamId;
}

// ":id" は複数ルートで使われるため、パスから種別を判定
function tableForGenericId(path: string): string | null {
  if (path.startsWith("/api/schedules/")) return "schedules";
  if (path.startsWith("/api/categories/")) return "categories";
  if (path.startsWith("/api/attendances/")) return "attendances";
  if (path.startsWith("/api/folders/")) return "folders";
  if (path.startsWith("/api/documents/")) return "documents";
  if (path.startsWith("/api/students/")) return "students";
  if (path.startsWith("/api/coach-categories/")) return "coachCategories";
  if (path.startsWith("/api/tuition-payments/")) return "tuition";
  if (path.startsWith("/api/teams/")) return "teams";
  if (path.startsWith("/api/sports/")) return "sports";
  return null;
}

export function registerAuthz(app: Express) {
  const guard = (check: (req: Request, value: string) => Promise<boolean>) =>
    async (req: Request, res: Response, next: NextFunction, value: string) => {
      if (!req.auth) return res.status(401).json({ error: "ログインが必要です" });
      try {
        if (await check(req, value)) return next();
        return forbidden(res);
      } catch (e) {
        console.error("authz error:", e);
        return res.status(500).json({ error: "Internal server error" });
      }
    };

  app.param("teamId", guard(canAccessTeam));
  app.param("studentId", guard(canAccessStudent));
  app.param("coachId", guard(canAccessCoach));
  app.param("venueId", guard((req, v) => canAccessResource(req, "venues", v)));
  app.param("linkId", guard(canAccessSiblingLink));
  app.param("categoryId", guard((req, v) => canAccessResource(req, "categories", v)));
  app.param("id", guard(async (req, v) => {
    const table = tableForGenericId(req.path);
    if (table === "teams") return canAccessTeam(req, v);
    if (table === "sports") return req.auth!.role === "admin";
    if (table === "students") {
      // 選手本人の退会は許可、それ以外はチーム所属で判定
      if (req.auth!.role === "student") return (await allowedStudentIds(req)).has(v);
      return canAccessResource(req, "students", v);
    }
    if (!table) return true;
    return canAccessResource(req, table, v);
  }));
}

/**
 * query / body に含まれる ID を検証するミドルウェア（/api 全体に適用）。
 * 対象キー: teamId, studentId, coachId, scheduleId, categoryId, venueId, folderId, documentId,
 *          studentIds[], categoryIds[], scheduleIds[]
 */
export async function checkIdsInPayload(req: Request, res: Response, next: NextFunction) {
  if (!req.auth || req.auth.role === "admin") return next();
  const sources: any[] = [req.query, req.body].filter((s) => s && typeof s === "object");
  const checks: Array<Promise<boolean>> = [];
  const pick = (obj: any, key: string): string[] => {
    const v = obj[key];
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
    return typeof v === "string" && v ? [v] : [];
  };
  for (const src of sources) {
    for (const t of pick(src, "teamId")) checks.push(canAccessTeam(req, t));
    for (const s of [...pick(src, "studentId"), ...pick(src, "studentIds")]) checks.push(canAccessStudent(req, s));
    for (const c of pick(src, "coachId")) checks.push(canAccessCoach(req, c));
    for (const s of [...pick(src, "scheduleId"), ...pick(src, "scheduleIds")]) checks.push(canAccessResource(req, "schedules", s));
    for (const c of [...pick(src, "categoryId"), ...pick(src, "categoryIds")]) checks.push(canAccessResource(req, "categories", c));
    for (const v of pick(src, "venueId")) checks.push(canAccessResource(req, "venues", v));
    for (const f of pick(src, "folderId")) checks.push(canAccessResource(req, "folders", f));
    for (const d of pick(src, "documentId")) checks.push(canAccessResource(req, "documents", d));
  }
  if (checks.length === 0) return next();
  try {
    const results = await Promise.all(checks);
    if (results.every(Boolean)) return next();
    return forbidden(res);
  } catch (e) {
    console.error("authz payload error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/** ルート内で明示的に使う補助 */
export { canAccessTeam, canAccessStudent, canAccessCoach, canAccessResource, allowedStudentIds };
