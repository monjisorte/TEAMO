import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  /** サーバーが発行したアップロード先 URL（そのまま fileUrl として保存し、サーバー側で正規化する） */
  uploadURL: string;
}

export interface UploadResult {
  successful: UploadedFile[];
  failed: { name: string; error: string }[];
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  /** アップロード先（presigned PUT URL）を1ファイルごとに取得する */
  onGetUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  onComplete?: (result: UploadResult) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * ボタンを押すとファイル選択ダイアログを開き、選択後すぐにアップロードする。
 * 各ファイルは onGetUploadParameters() で得た URL に PUT される（Vercel Blob の presigned URL）。
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10 * 1024 * 1024,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, maxNumberOfFiles);
    if (files.length === 0) return;

    setUploading(true);
    const result: UploadResult = { successful: [], failed: [] };

    for (const file of files) {
      if (file.size > maxFileSize) {
        result.failed.push({ name: file.name, error: "ファイルサイズが上限を超えています" });
        continue;
      }
      try {
        const { url } = await onGetUploadParameters();
        const res = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type || "application/octet-stream" },
        });
        if (!res.ok) throw new Error(`upload failed: ${res.status}`);
        result.successful.push({ name: file.name, size: file.size, type: file.type, uploadURL: url });
      } catch (e: any) {
        console.error("Upload error:", file.name, e);
        result.failed.push({ name: file.name, error: e?.message || "upload failed" });
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onComplete?.(result);
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: "none" }}
        multiple={maxNumberOfFiles > 1}
        data-testid="input-file-upload"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        className={buttonClassName}
        type="button"
        disabled={uploading}
      >
        {uploading ? "アップロード中…" : children}
      </Button>
    </div>
  );
}
