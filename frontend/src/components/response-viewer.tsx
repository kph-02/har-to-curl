"use client";

import * as React from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { ExecutionResult } from "@/lib/types";

type ResponseViewerProps = {
  result: ExecutionResult;
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

export const ResponseViewer = ({ result }: ResponseViewerProps) => {
  const headerRows: Array<{ key: string; value: string }> = React.useMemo(() => {
    const entries: Array<[string, string]> = Object.entries(result.headers || {});
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, value]) => ({ key, value }));
  }, [result.headers]);

  const handleCopyBody = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(result.body || "");
      toast.success("Copied response body to clipboard.");
    } catch {
      toast.error("Unable to copy response body.");
    }
  };

  return (
    <Card className="mt-4 border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-zinc-100">Response</CardTitle>
        <div className="mt-3 space-y-2 text-xs text-zinc-400">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Status Code
            </span>
            <Badge
              variant="outline"
              className={["font-mono text-[11px]", getStatusBadgeClassName(result.status)].join(" ")}
              aria-label={`Status code ${result.status}`}
            >
              {result.status}
            </Badge>
            {result.statusText ? (
              <span className="text-xs text-zinc-300">{result.statusText}</span>
            ) : null}
            <span className="rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-400">
              {Math.max(0, Math.round(result.duration))}ms
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Headers</h3>
          <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/20">
            <ScrollArea className="h-[240px]">
              <div className="space-y-2 p-3">
                {headerRows.length === 0 ? (
                  <p className="text-sm text-zinc-500">None</p>
                ) : (
                  headerRows.map((row) => (
                    <div
                      key={`${row.key}:${row.value}`}
                      className="grid grid-cols-12 gap-3 rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2"
                    >
                      <div className="col-span-4 font-mono text-xs text-zinc-400 break-words">
                        {row.key}
                      </div>
                      <div className="col-span-8 font-mono text-xs text-zinc-200 break-words">
                        {row.value}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-100">Body</h3>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyBody}
              aria-label="Copy response body"
              className="border-zinc-700"
            >
              Copy body
            </Button>
          </div>
          <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-4">
            <Textarea
              readOnly
              value={result.body || "No body"}
              aria-label="Response body"
              className="min-h-[180px] max-h-[520px] resize-y overflow-auto bg-transparent p-0 border-0 shadow-none font-mono text-xs text-zinc-200 focus-visible:ring-0"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

