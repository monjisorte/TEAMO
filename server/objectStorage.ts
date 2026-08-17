// ファイル保存: Vercel Blob（private ストア）
//
// 流れ:
//   1. クライアントが POST /api/objects/upload(-public) → presigned PUT URL を受け取る
//   2. クライアントがその URL に PUT
//   3. DB には uploadURL をそのまま渡す → normalizeObjectEntityPath() で "/objects/<pathname>" に正規化して保存
//   4. 閲覧は GET /objects/<pathname>（サーバーがストリーム配信）か、
//      POST /api/objects/download-url で presigned GET URL（1時間有効）を取得
//
// pathname 規約:
//   uploads/<uuid>   … 非公開（要ログイン。認可はルート側で行う）
//   public/<uuid>    … 公開（プロフィール写真など。/objects/public/... は認証なしで配信）
//
// 必要な環境変数: BLOB_READ_WRITE_TOKEN（Vercel の Blob ストア連携で自動付与）

import { randomUUID } from "crypto";
import type { Response } from "express";
import { get, head, del, issueSignedToken, presignUrl, BlobNotFoundError } from "@vercel/blob";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

const UPLOAD_TTL_MS = 15 * 60 * 1000;   // PUT URL の有効期間
const DOWNLOAD_TTL_MS = 60 * 60 * 1000; // GET URL の有効期間

/** Blob 上の pathname を表す（旧 GCS File の代替） */
export interface StoredObject {
  pathname: string;
  isPublic: boolean;
}

export class ObjectStorageService {
  private async presign(pathname: string, operation: "put" | "get", ttlMs: number, extra: Record<string, unknown> = {}) {
    const validUntil = Date.now() + ttlMs;
    const token = await issueSignedToken({ pathname, operations: [operation], validUntil });
    const { presignedUrl } = await presignUrl(token, {
      operation,
      pathname,
      access: "private",
      validUntil,
      ...(extra as any),
    });
    return presignedUrl;
  }

  /** 非公開ファイル用の PUT URL */
  async getObjectEntityUploadURL(): Promise<string> {
    return this.presign(`uploads/${randomUUID()}`, "put", UPLOAD_TTL_MS, { addRandomSuffix: false, allowOverwrite: false });
  }

  /** 公開ファイル（プロフィール写真等）用の PUT URL と、保存後に使う公開パスを返す */
  async getPublicUpload(): Promise<{ uploadURL: string; publicURL: string }> {
    const pathname = `public/${randomUUID()}`;
    const uploadURL = await this.presign(pathname, "put", UPLOAD_TTL_MS, { addRandomSuffix: false, allowOverwrite: false });
    return { uploadURL, publicURL: `/objects/${pathname}` };
  }

  /**
   * uploadURL / 旧形式のパスを "/objects/<pathname>" に正規化する。
   * 既に "/objects/..." ならそのまま。それ以外の外部 URL もそのまま返す。
   */
  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath) return rawPath;
    if (rawPath.startsWith("/objects/")) return rawPath;
    let pathname: string;
    try {
      pathname = new URL(rawPath).pathname; // presigned URL → "/uploads/<uuid>" 等
    } catch {
      return rawPath;
    }
    const m = pathname.match(/\/((?:uploads|public)\/[^/?#]+)$/);
    return m ? `/objects/${m[1]}` : rawPath;
  }

  /** "/objects/<pathname>" を Blob 上のオブジェクトに解決する（存在確認つき） */
  async getObjectEntityFile(objectPath: string): Promise<StoredObject> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const pathname = objectPath.slice("/objects/".length);
    if (!/^(uploads|public)\/[^/?#]+$/.test(pathname)) throw new ObjectNotFoundError();
    try {
      await head(pathname, { access: "private" } as any);
    } catch (e) {
      if (e instanceof BlobNotFoundError) throw new ObjectNotFoundError();
      throw e;
    }
    return { pathname, isPublic: pathname.startsWith("public/") };
  }

  /** ストリーム配信（/objects/* ルート用） */
  async downloadObject(file: StoredObject, res: Response, cacheTtlSec = 3600) {
    const result = await get(file.pathname, { access: "private" });
    if (!result || !result.stream) throw new ObjectNotFoundError();
    const h = result.headers as any;
    const contentType = h?.get?.("content-type") ?? h?.["content-type"] ?? "application/octet-stream";
    const contentLength = h?.get?.("content-length") ?? h?.["content-length"];
    res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    res.setHeader("Cache-Control", file.isPublic ? `public, max-age=${cacheTtlSec}` : "private, max-age=0");
    const reader = result.stream.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) { res.end(); return; }
      if (!res.write(Buffer.from(value))) await new Promise<void>((r) => res.once("drain", () => r()));
      return pump();
    };
    await pump();
  }

  /** presigned GET URL（1時間） */
  async getDownloadURL(objectPathOrUrl: string): Promise<string> {
    const normalized = this.normalizeObjectEntityPath(objectPathOrUrl);
    const pathname = normalized.startsWith("/objects/") ? normalized.slice("/objects/".length) : normalized;
    return this.presign(pathname, "get", DOWNLOAD_TTL_MS);
  }

  /** 削除（失敗しても呼び出し側は続行できるよう例外は握りつぶす） */
  async deleteObject(objectPathOrUrl: string): Promise<void> {
    try {
      const normalized = this.normalizeObjectEntityPath(objectPathOrUrl);
      if (!normalized.startsWith("/objects/")) return;
      await del(normalized.slice("/objects/".length), { access: "private" } as any);
    } catch (e) {
      console.warn("blob delete failed:", (e as Error).message);
    }
  }
}
