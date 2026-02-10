"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { HarEntrySummary } from "@/lib/types";

type EntryListProps = {
  entries: HarEntrySummary[];
  selectedIndices: ReadonlySet<number>;
  onSelectedIndicesChange: (nextSelectedIndices: ReadonlySet<number>) => void;
  onInspectEntry: (entry: HarEntrySummary) => void;
};

const MAX_VISIBLE_ENTRIES_BEFORE_SCROLL: number = 8;

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

const getUrlPathDisplay = (url: string): { primary: string; secondary?: string } => {
  try {
    const parsedUrl: URL = new URL(url);
    const path: string = parsedUrl.pathname || "/";
    const query: string = parsedUrl.search || "";
    return { primary: path, secondary: query ? query : undefined };
  } catch {
    return { primary: url };
  }
};

export const EntryList = ({
  entries,
  selectedIndices,
  onSelectedIndicesChange,
  onInspectEntry,
}: EntryListProps) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const shouldUseScrollArea: boolean = entries.length > MAX_VISIBLE_ENTRIES_BEFORE_SCROLL;

  void listRef;

  const handleToggleIndex = (index: number): void => {
    const nextSelected = new Set<number>(selectedIndices);
    if (nextSelected.has(index)) {
      nextSelected.delete(index);
    } else {
      nextSelected.add(index);
    }
    onSelectedIndicesChange(nextSelected);
  };

  const handleSelectAll = (): void => {
    onSelectedIndicesChange(new Set<number>(entries.map((entry) => entry.index)));
  };

  const handleClearSelection = (): void => {
    onSelectedIndicesChange(new Set<number>());
  };

  const handleRowKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    entry: HarEntrySummary,
  ): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onInspectEntry(entry);
    }
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base text-zinc-100">Requests</CardTitle>
            <p className="mt-1 text-xs text-zinc-400">
              {entries.length} request{entries.length === 1 ? "" : "s"} after filtering and
              deduplication
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-zinc-300 hover:text-zinc-100"
              onClick={handleSelectAll}
              aria-label="Select all requests"
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-xs text-zinc-300 hover:text-zinc-100"
              onClick={handleClearSelection}
              aria-label="Clear selection"
            >
              Clear
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {shouldUseScrollArea ? (
          <ScrollArea className="h-[420px] rounded-md border border-zinc-800 bg-zinc-950/20">
            <div ref={listRef} className="divide-y divide-zinc-800">
              {entries.map((entry) => {
                const urlDisplay = getUrlPathDisplay(entry.url);
                const isSelected: boolean = selectedIndices.has(entry.index);
                const showDuplicate: boolean = entry.duplicateCount > 1;
                return (
                  <div
                    key={`${entry.index}-${entry.method}-${entry.url}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${entry.method} ${entry.url}`}
                    onClick={() => onInspectEntry(entry)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) =>
                      handleRowKeyDown(event, entry)
                    }
                    className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-zinc-900/70 focus:outline-none focus-visible:bg-zinc-900/70"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleIndex(entry.index)}
                      onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                        event.stopPropagation();
                      }}
                      aria-label={`Select request ${entry.method} ${entry.url}`}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
                    />
                    <Badge
                      variant="outline"
                      className={[
                        "shrink-0 font-mono text-[11px]",
                        getMethodBadgeClassName(entry.method),
                      ].join(" ")}
                    >
                      {entry.method.toUpperCase()}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-mono text-sm text-zinc-200">
                          {urlDisplay.primary}
                        </p>
                        {showDuplicate ? (
                          <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-400">
                            x{entry.duplicateCount}
                          </span>
                        ) : null}
                      </div>
                      {urlDisplay.secondary ? (
                        <p className="truncate font-mono text-xs text-zinc-500">
                          {urlDisplay.secondary}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={[
                        "shrink-0 font-mono text-[11px]",
                        getStatusBadgeClassName(entry.status),
                      ].join(" ")}
                    >
                      {entry.status}
                    </Badge>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <div className="rounded-md border border-zinc-800 bg-zinc-950/20">
            <div ref={listRef} className="divide-y divide-zinc-800">
              {entries.map((entry) => {
                const urlDisplay = getUrlPathDisplay(entry.url);
                const isSelected: boolean = selectedIndices.has(entry.index);
                const showDuplicate: boolean = entry.duplicateCount > 1;
                return (
                  <div
                    key={`${entry.index}-${entry.method}-${entry.url}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspect ${entry.method} ${entry.url}`}
                    onClick={() => onInspectEntry(entry)}
                    onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) =>
                      handleRowKeyDown(event, entry)
                    }
                    className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-zinc-900/70 focus:outline-none focus-visible:bg-zinc-900/70"
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleIndex(entry.index)}
                      onClick={(event: React.MouseEvent<HTMLInputElement>) => {
                        event.stopPropagation();
                      }}
                      aria-label={`Select request ${entry.method} ${entry.url}`}
                      className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
                    />
                    <Badge
                      variant="outline"
                      className={[
                        "shrink-0 font-mono text-[11px]",
                        getMethodBadgeClassName(entry.method),
                      ].join(" ")}
                    >
                      {entry.method.toUpperCase()}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-mono text-sm text-zinc-200">
                          {urlDisplay.primary}
                        </p>
                        {showDuplicate ? (
                          <span className="shrink-0 rounded-full border border-zinc-800 bg-zinc-950/40 px-2 py-0.5 text-[11px] text-zinc-400">
                            x{entry.duplicateCount}
                          </span>
                        ) : null}
                      </div>
                      {urlDisplay.secondary ? (
                        <p className="truncate font-mono text-xs text-zinc-500">
                          {urlDisplay.secondary}
                        </p>
                      ) : null}
                    </div>
                    <Badge
                      variant="outline"
                      className={[
                        "shrink-0 font-mono text-[11px]",
                        getStatusBadgeClassName(entry.status),
                      ].join(" ")}
                    >
                      {entry.status}
                    </Badge>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-zinc-500 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
