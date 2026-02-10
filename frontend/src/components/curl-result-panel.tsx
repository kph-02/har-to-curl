"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { ExecutionResult, HarEntrySummary, ParsedRequest } from "@/lib/types";
import { RequestEditor } from "@/components/request-editor";
import { ResponseViewer } from "@/components/response-viewer";

type CurlResultPanelProps = {
  matchedEntryIndex: number;
  curlCommand: string;
  entries: HarEntrySummary[];
  parsedRequest: ParsedRequest;
};

const getMethodBadgeClassName = (method: string): string => {
  const upperMethod: string = method.toUpperCase();
  if (upperMethod === "GET") {
    return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
  }
  if (upperMethod === "POST") {
    return "bg-sky-600/20 text-sky-300 border-sky-600/30";
  }
  if (upperMethod === "PUT" || upperMethod === "PATCH") {
    return "bg-amber-600/20 text-amber-300 border-amber-600/30";
  }
  if (upperMethod === "DELETE") {
    return "bg-rose-600/20 text-rose-300 border-rose-600/30";
  }
  return "bg-zinc-700/40 text-zinc-200 border-zinc-600/40";
};

const getStatusBadgeClassName = (status: number): string => {
  if (status >= 200 && status < 300) {
    return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
  }
  if (status >= 300 && status < 400) {
    return "bg-amber-600/20 text-amber-300 border-amber-600/30";
  }
  if (status >= 400) {
    return "bg-rose-600/20 text-rose-300 border-rose-600/30";
  }
  return "bg-zinc-700/40 text-zinc-200 border-zinc-600/40";
};

export const CurlResultPanel = ({
  matchedEntryIndex,
  curlCommand,
  entries,
  parsedRequest,
}: CurlResultPanelProps) => {
  const matchedEntry = entries.find((entry) => entry.index === matchedEntryIndex);
  const [isEditing, setIsEditing] = React.useState<boolean>(false);
  const [executionResult, setExecutionResult] = React.useState<ExecutionResult | null>(null);
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(curlCommand);
      toast.success("Copied curl command to clipboard.");
    } catch {
      toast.error("Unable to copy curl command.");
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">Generated curl</CardTitle>
        {matchedEntry ? (
          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Matched Request
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={["font-mono text-[11px]", getMethodBadgeClassName(matchedEntry.method)].join(" ")}
              >
                {matchedEntry.method}
              </Badge>
              <span className="truncate font-mono text-xs text-zinc-300">
                {matchedEntry.url}
              </span>
              {matchedEntry.duplicateCount > 1 ? (
                <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-400">
                  x{matchedEntry.duplicateCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Status Code
              </span>
              <Badge
                variant="outline"
                className={["font-mono text-[11px]", getStatusBadgeClassName(matchedEntry.status)].join(" ")}
                aria-label={`Status code ${matchedEntry.status}`}
              >
                {matchedEntry.status}
              </Badge>
            </div>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-100">
            {curlCommand}
          </pre>
        </div>
        <div className="mt-4 flex justify-end">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
              className="border-zinc-700"
            >
              Copy curl
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditing((prev) => !prev);
              }}
              aria-label="Edit request and execute"
              className="border-zinc-700"
            >
              {isEditing ? "Hide editor" : "Edit and Run"}
            </Button>
          </div>
        </div>
        {isEditing ? (
          <RequestEditor
            initialParsedRequest={parsedRequest}
            onExecuteSuccess={(result: ExecutionResult) => setExecutionResult(result)}
          />
        ) : null}
        {executionResult ? <ResponseViewer result={executionResult} /> : null}
      </CardContent>
    </Card>
  );
};
