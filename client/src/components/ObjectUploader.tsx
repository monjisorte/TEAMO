import { useState } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A file upload component that renders as a button and provides a modal interface for
 * file management.
 * 
 * Features:
 * - Renders as a customizable button that opens a file upload modal
 * - Provides a modal interface for:
 *   - File selection
 *   - File preview
 *   - Upload progress tracking
 *   - Upload status display
 * 
 * The component uses Uppy under the hood to handle all file upload functionality.
 * All file management features are automatically handled by the Uppy dashboard modal.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: false,
      locale: {
        strings: {
          dropHereOr: 'ここにファイルをドロップするか、%{browse}',
          browse: 'ファイルを選択',
          uploadComplete: 'アップロード完了',
          uploadPaused: 'アップロード一時停止',
          resumeUpload: 'アップロード再開',
          pauseUpload: 'アップロード一時停止',
          retryUpload: '再試行',
          cancelUpload: 'キャンセル',
          xFilesSelected: {
            0: '%{smart_count} 個のファイルを選択',
            1: '%{smart_count} 個のファイルを選択',
          },
          uploadingXFiles: {
            0: '%{smart_count} 個のファイルをアップロード中',
            1: '%{smart_count} 個のファイルをアップロード中',
          },
          processingXFiles: {
            0: '%{smart_count} 個のファイルを処理中',
            1: '%{smart_count} 個のファイルを処理中',
          },
          uploading: 'アップロード中',
          complete: '完了',
          uploadFailed: 'アップロード失敗',
          paused: '一時停止',
          retry: '再試行',
          cancel: 'キャンセル',
          done: '完了',
          filesUploadedOfTotal: {
            0: '%{complete} / %{smart_count} ファイル',
            1: '%{complete} / %{smart_count} ファイル',
          },
          dataUploadedOfTotal: '%{complete} / %{total}',
          xTimeLeft: '残り %{time}',
          uploadXFiles: {
            0: '%{smart_count} 個のファイルをアップロード',
            1: '%{smart_count} 個のファイルをアップロード',
          },
          uploadXNewFiles: {
            0: '+%{smart_count} 個のファイルをアップロード',
            1: '+%{smart_count} 個のファイルをアップロード',
          },
          addMore: 'さらに追加',
          addMoreFiles: 'さらにファイルを追加',
          removeFile: 'ファイルを削除',
          editFile: 'ファイルを編集',
        },
        pluralize: (n: number) => (n === 1 ? 0 : 1),
      },
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: async (file) => {
          console.log("Getting upload parameters for file:", file);
          try {
            const params = await onGetUploadParameters();
            console.log("Upload parameters received:", params);
            
            // Store the upload URL in file metadata so we can access it later
            uppy.setFileMeta(file.id, { uploadURL: params.url });
            
            return params;
          } catch (error) {
            console.error("Error getting upload parameters:", error);
            throw error;
          }
        },
      })
      .on("upload", () => {
        console.log("Upload started");
      })
      .on("upload-success", (file, response) => {
        console.log("Upload success:", file, response);
        // Store uploadURL in the file object for easy access in complete handler
        if (file) {
          (file as any).uploadURL = file.meta.uploadURL;
        }
      })
      .on("upload-error", (file, error) => {
        console.error("Upload error:", file, error);
      })
      .on("complete", (result) => {
        console.log("Upload complete:", result);
        onComplete?.(result);
        setShowModal(false);
      })
  );

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} type="button">
        {children}
      </Button>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
      />
    </div>
  );
}
