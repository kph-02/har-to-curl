"use client";

import * as React from "react";
import { Upload, FileUp, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";
import type { UploadResponse } from "@/lib/types";

type HarUploadZoneProps = {
  maxSizeMB: number;
  onUploadSuccess: (response: UploadResponse, fileName: string) => void;
};

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading"; progress: number }
  | { kind: "success"; fileName: string; entryCount: number };

const BYTES_PER_MB: number = 1024 * 1024;

const isHarFileName = (fileName: string): boolean => {
  const lowerName: string = fileName.toLowerCase();
  return lowerName.endsWith(".har");
};

const formatFileSize = (bytes: number): string => {
  if (bytes < BYTES_PER_MB) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
};

export const HarUploadZone = ({ maxSizeMB, onUploadSuccess }: HarUploadZoneProps) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragOver, setIsDragOver] = React.useState<boolean>(false);
  const [uploadState, setUploadState] = React.useState<UploadState>({ kind: "idle" });

  const handlePickFile = (): void => {
    fileInputRef.current?.click();
  };

  const handleReset = (): void => {
    setUploadState({ kind: "idle" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleValidateFile = (file: File): { isValid: boolean; message?: string } => {
    if (!isHarFileName(file.name)) {
      return { isValid: false, message: "Only .har files are supported." };
    }
    const maxBytes: number = maxSizeMB * BYTES_PER_MB;
    if (file.size > maxBytes) {
      return {
        isValid: false,
        message: `File is too large. Limit is ${maxSizeMB} MB (got ${formatFileSize(file.size)}).`,
      };
    }
    return { isValid: true };
  };

  const handleUploadFile = async (file: File): Promise<void> => {
    const validation = handleValidateFile(file);
    if (!validation.isValid) {
      toast.error(validation.message || "Invalid file.");
      return;
    }
    setUploadState({ kind: "uploading", progress: 15 });
    const formData: FormData = new FormData();
    formData.append("file", file);
    try {
      setUploadState({ kind: "uploading", progress: 35 });
      const result: UploadResponse = await apiRequest<UploadResponse>("/har/upload", {
        method: "POST",
        body: formData,
      });
      setUploadState({ kind: "uploading", progress: 100 });
      setUploadState({
        kind: "success",
        fileName: file.name,
        entryCount: result.entries.length,
      });
      onUploadSuccess(result, file.name);
    } catch (error) {
      const message: string =
        error instanceof Error ? error.message : "Failed to upload HAR file.";
      setUploadState({ kind: "idle" });
      toast.error(message);
    }
  };

  const handleInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    const file: File | undefined = event.target.files?.[0];
    if (!file) {
      return;
    }
    await handleUploadFile(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    const file: File | undefined = event.dataTransfer.files?.[0];
    if (!file) {
      return;
    }
    await handleUploadFile(file);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (uploadState.kind === "uploading") {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handlePickFile();
    }
  };

  const isUploading: boolean = uploadState.kind === "uploading";
  const isSuccess: boolean = uploadState.kind === "success";

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">Upload HAR file</CardTitle>
      </CardHeader>
      <CardContent>
        <input
          ref={fileInputRef}
          type="file"
          accept=".har"
          className="hidden"
          onChange={handleInputChange}
        />
        <div
          role="button"
          tabIndex={0}
          aria-label="Upload HAR file by clicking or dragging and dropping"
          onClick={handlePickFile}
          onKeyDown={handleKeyDown}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "relative flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
            isDragOver ? "border-zinc-400 bg-zinc-950/40" : "border-zinc-700 bg-zinc-950/20",
            isUploading ? "cursor-not-allowed opacity-80" : "cursor-pointer",
          ].join(" ")}
        >
          <div className="flex items-center gap-2 text-zinc-200">
            {isSuccess ? (
              <FileUp className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Upload className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="text-sm font-medium">
              {isSuccess ? "HAR uploaded" : "Drop your .har file here or click to browse"}
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Max file size: {maxSizeMB} MB. Sensitive headers will be redacted before AI analysis.
          </p>
          {uploadState.kind === "uploading" ? (
            <div className="w-full pt-2">
              <Progress value={uploadState.progress} />
              <p className="mt-2 text-xs text-zinc-400">Uploading…</p>
            </div>
          ) : null}
          {uploadState.kind === "success" ? (
            <div className="mt-2 flex w-full items-center justify-between gap-3 rounded-md border border-zinc-800 bg-zinc-950/40 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm text-zinc-200">{uploadState.fileName}</p>
                <p className="text-xs text-zinc-400">
                  {uploadState.entryCount} request{uploadState.entryCount === 1 ? "" : "s"} after
                  filtering
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.stopPropagation();
                  handleReset();
                }}
                aria-label="Replace uploaded HAR file"
              >
                <RefreshCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                Replace
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};
