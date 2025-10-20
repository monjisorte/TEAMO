import { useState, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
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
 * A file upload component that opens a native file picker on click
 * and automatically uploads selected files.
 * 
 * Features:
 * - Opens native file picker dialog when button is clicked
 * - Automatically uploads files after selection
 * - Progress tracking and error handling
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
      },
      autoProceed: true, // Auto-upload after file selection
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
        // Reset the input after upload
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Clear all files from Uppy
        uppy.cancelAll();
      })
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // Add files to Uppy
      Array.from(files).forEach((file) => {
        try {
          uppy.addFile({
            name: file.name,
            type: file.type,
            data: file,
          });
        } catch (error) {
          console.error("Error adding file to Uppy:", error);
        }
      });
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple={maxNumberOfFiles > 1}
        data-testid="input-file-upload"
      />
      <Button onClick={handleButtonClick} className={buttonClassName} type="button">
        {children}
      </Button>
    </div>
  );
}
