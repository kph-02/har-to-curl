"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiRequest } from "@/lib/api-client";
import type { HarEntry, HarEntrySummary, HarHeader, HarCookie } from "@/lib/types";

type RequestDetailPanelProps = {
  isOpen: boolean;
  sessionId: string;
  entrySummary: HarEntrySummary | null;
  onOpenChange: (nextOpen: boolean) => void;
};

type LoadState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "loaded"; entry: HarEntry }
  | { kind: "error"; message: string };

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

const renderKeyValueTable = (rows: Array<{ key: string; value: string }>): React.ReactNode => {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">None</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div
          key={`${row.key}:${row.value}`}
          className="grid grid-cols-12 gap-3 rounded-md border border-zinc-800 bg-zinc-950/30 px-3 py-2"
        >
          <div className="col-span-4 font-mono text-xs text-zinc-400">{row.key}</div>
          <div className="col-span-8 font-mono text-xs text-zinc-200 break-words">{row.value}</div>
        </div>
      ))}
    </div>
  );
};

const toHeaderRows = (headers: HarHeader[] | undefined): Array<{ key: string; value: string }> => {
  if (!headers || headers.length === 0) {
    return [];
  }
  return headers.map((header) => ({ key: header.name, value: header.value }));
};

const toCookieRows = (cookies: HarCookie[] | undefined): Array<{ key: string; value: string }> => {
  if (!cookies || cookies.length === 0) {
    return [];
  }
  return cookies.map((cookie) => ({ key: cookie.name, value: cookie.value }));
};

const getBodyText = (entry: HarEntry | null, section: "request" | "response"): string => {
  if (!entry) {
    return "";
  }
  if (section === "request") {
    return entry.request.postData?.text || "";
  }
  return entry.response.content?.text || "";
};

export const RequestDetailPanel = ({
  isOpen,
  sessionId,
  entrySummary,
  onOpenChange,
}: RequestDetailPanelProps) => {
  const [loadState, setLoadState] = React.useState<LoadState>({ kind: "idle" });
  const sheetContentRef = React.useRef<HTMLDivElement | null>(null);
  const urlInlineRef = React.useRef<HTMLSpanElement | null>(null);
  const tabsListRef = React.useRef<HTMLDivElement | null>(null);
  const requestScrollAreaRef = React.useRef<HTMLDivElement | null>(null);
  const responseScrollAreaRef = React.useRef<HTMLDivElement | null>(null);

  const inspectedIndex: number | null = entrySummary ? entrySummary.index : null;

  React.useEffect(() => {
    const shouldFetch: boolean = isOpen && !!sessionId && inspectedIndex !== null;
    if (!shouldFetch) {
      return;
    }
    let isCancelled: boolean = false;
    const fetchEntry = async (): Promise<void> => {
      setLoadState({ kind: "loading" });
      try {
        const entry: HarEntry = await apiRequest<HarEntry>(
          `/har/sessions/${encodeURIComponent(sessionId)}/entries/${inspectedIndex}`,
          { method: "GET" },
        );
        if (isCancelled) {
          return;
        }
        setLoadState({ kind: "loaded", entry });
      } catch (error) {
        const message: string =
          error instanceof Error ? error.message : "Failed to load request details.";
        if (isCancelled) {
          return;
        }
        setLoadState({ kind: "error", message });
        toast.error(message);
      }
    };
    void fetchEntry();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, sessionId, inspectedIndex]);

  const entry: HarEntry | null = loadState.kind === "loaded" ? loadState.entry : null;
  const requestHeaders = toHeaderRows(entry?.request.headers);
  const requestCookies = toCookieRows(entry?.request.cookies);
  const responseHeaders = toHeaderRows(entry?.response.headers);
  const responseCookies = toCookieRows(entry?.response.cookies);

  const requestBody: string = getBodyText(entry, "request");
  const responseBody: string = getBodyText(entry, "response");
  const responseStatus: number = entry?.response.status ?? 0;
  const responseStatusText: string = entry?.response.statusText ?? "";

  return (
    <TooltipProvider>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent
          ref={sheetContentRef}
          side="right"
          className="w-screen sm:w-[50vw] sm:max-w-[50vw] h-dvh bg-zinc-950 border-zinc-800 flex flex-col"
        >
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {entrySummary ? (
                <Badge
                  variant="outline"
                  className={[
                    "font-mono text-[11px]",
                    getMethodBadgeClassName(entrySummary.method),
                  ].join(" ")}
                >
                  {entrySummary.method.toUpperCase()}
                </Badge>
              ) : null}
              <span className="text-zinc-100">Request details</span>
            </SheetTitle>
            <SheetDescription>
              {entrySummary ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      ref={urlInlineRef}
                      className="flex h-14 max-w-full items-center overflow-x-auto whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-950/30 px-3 font-mono text-sm text-zinc-200 pr-10"
                      aria-label="Full URL"
                    >
                      {entrySummary.url}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[420px] break-words">
                    {entrySummary.url}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <p className="text-xs text-zinc-500">Select a request to inspect.</p>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex-1 min-h-0">
            {loadState.kind === "loading" ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : null}

            {loadState.kind === "error" ? (
              <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-4">
                <p className="text-sm text-zinc-300">{loadState.message}</p>
              </div>
            ) : null}

            {loadState.kind === "loaded" ? (
              <Tabs defaultValue="request" className="w-full flex flex-col h-full min-h-0">
                <TabsList ref={tabsListRef} className="bg-zinc-900 self-start justify-start">
                  <TabsTrigger value="request">Request</TabsTrigger>
                  <TabsTrigger value="response">Response</TabsTrigger>
                </TabsList>

                <TabsContent value="request" className="flex-1 min-h-0">
                  <ScrollArea
                    ref={requestScrollAreaRef}
                    className="h-full pr-2 rounded-md border border-zinc-800 bg-zinc-950/20"
                  >
                    <div className="space-y-6 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Headers</h3>
                        <div className="mt-2">{renderKeyValueTable(requestHeaders)}</div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Cookies</h3>
                        <div className="mt-2">{renderKeyValueTable(requestCookies)}</div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Body</h3>
                        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-4">
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">
                            {requestBody || "No body"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="response" className="flex-1 min-h-0">
                  <ScrollArea
                    ref={responseScrollAreaRef}
                    className="h-full pr-2 rounded-md border border-zinc-800 bg-zinc-950/20"
                  >
                    <div className="space-y-6 p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                          Status Code
                        </span>
                        <Badge
                          variant="outline"
                          aria-label={`Status code ${responseStatus}`}
                          className={[
                            "font-mono text-[11px]",
                            responseStatus >= 200 && responseStatus < 300
                              ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/30"
                              : responseStatus >= 400
                                ? "bg-rose-600/20 text-rose-300 border-rose-600/30"
                                : "bg-amber-600/20 text-amber-300 border-amber-600/30",
                          ].join(" ")}
                        >
                          {responseStatus}
                        </Badge>
                        <span className="text-sm text-zinc-200">{responseStatusText}</span>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Headers</h3>
                        <div className="mt-2">{renderKeyValueTable(responseHeaders)}</div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Cookies</h3>
                        <div className="mt-2">{renderKeyValueTable(responseCookies)}</div>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-zinc-100">Body</h3>
                        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-4">
                          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-zinc-200">
                            {responseBody || "No body"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
};
