"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import type { ExecutionResult, ParsedRequest } from "@/lib/types";

type KeyValueRow = {
  id: string;
  key: string;
  value: string;
};

type RequestEditorProps = {
  initialParsedRequest: ParsedRequest;
  onExecuteSuccess: (result: ExecutionResult) => void;
};

const SUPPORTED_METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;

const createRowId = (): string => {
  return Math.random().toString(36).slice(2, 10);
};

const toKeyValueRows = (record: Record<string, string> | undefined): KeyValueRow[] => {
  const entries: Array<[string, string]> = Object.entries(record || {});
  if (entries.length === 0) {
    return [{ id: createRowId(), key: "", value: "" }];
  }
  return entries.map(([key, value]) => ({ id: createRowId(), key, value }));
};

const rowsToRecord = (rows: KeyValueRow[]): Record<string, string> => {
  const output: Record<string, string> = {};
  for (const row of rows) {
    const key: string = row.key.trim();
    if (!key) {
      continue;
    }
    output[key] = row.value;
  }
  return output;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url: URL = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

const getJsonBodyError = (headers: Record<string, string>, body: string): string | null => {
  if (!body.trim()) {
    return null;
  }
  const contentTypeEntry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === "content-type",
  );
  if (!contentTypeEntry) {
    return null;
  }
  const contentTypeValue: string = contentTypeEntry[1] || "";
  if (!contentTypeValue.toLowerCase().includes("application/json")) {
    return null;
  }
  try {
    JSON.parse(body);
    return null;
  } catch {
    return "Body is not valid JSON for Content-Type: application/json.";
  }
};

export const RequestEditor = ({ initialParsedRequest, onExecuteSuccess }: RequestEditorProps) => {
  const [method, setMethod] = React.useState<string>(
    initialParsedRequest.method?.toUpperCase() || "GET",
  );
  const [url, setUrl] = React.useState<string>(initialParsedRequest.url || "");
  const [body, setBody] = React.useState<string>(initialParsedRequest.body || "");
  const [headerRows, setHeaderRows] = React.useState<KeyValueRow[]>(
    toKeyValueRows(initialParsedRequest.headers),
  );
  const [queryParamRows, setQueryParamRows] = React.useState<KeyValueRow[]>(
    toKeyValueRows(initialParsedRequest.queryParams),
  );
  const [isExecuting, setIsExecuting] = React.useState<boolean>(false);

  const headersRecord: Record<string, string> = React.useMemo(
    () => rowsToRecord(headerRows),
    [headerRows],
  );
  const queryParamsRecord: Record<string, string> = React.useMemo(
    () => rowsToRecord(queryParamRows),
    [queryParamRows],
  );

  const isUrlValid: boolean = url.trim().length > 0 && isValidHttpUrl(url.trim());
  const jsonBodyError: string | null = React.useMemo(
    () => getJsonBodyError(headersRecord, body),
    [headersRecord, body],
  );
  const canExecute: boolean = isUrlValid && !jsonBodyError && !isExecuting;

  const handleAddRow = (
    setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>,
  ): void => {
    setRows((prev) => [...prev, { id: createRowId(), key: "", value: "" }]);
  };

  const handleRemoveRow = (
    setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>,
    id: string,
  ): void => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length > 0 ? next : [{ id: createRowId(), key: "", value: "" }];
    });
  };

  const handleUpdateRow = (
    setRows: React.Dispatch<React.SetStateAction<KeyValueRow[]>>,
    id: string,
    patch: Partial<Pick<KeyValueRow, "key" | "value">>,
  ): void => {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  };

  const handleExecute = async (): Promise<void> => {
    if (!canExecute) {
      if (!isUrlValid) {
        toast.error("Please enter a valid URL (must start with http:// or https://).");
      }
      if (jsonBodyError) {
        toast.error(jsonBodyError);
      }
      return;
    }
    setIsExecuting(true);
    const payload: ParsedRequest = {
      method: method.toUpperCase(),
      url: url.trim(),
      headers: headersRecord,
      queryParams: queryParamsRecord,
      ...(body.trim().length > 0 ? { body } : {}),
    };
    try {
      const result: ExecutionResult = await apiRequest<ExecutionResult>("/curl/execute", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onExecuteSuccess(result);
    } catch (error) {
      const message: string =
        error instanceof ApiClientError ? error.error : "Unable to execute this request.";
      toast.error(message);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-40">
          <Select value={method} onValueChange={(value: string) => setMethod(value)}>
            <SelectTrigger
              aria-label="HTTP method"
              className="bg-zinc-950 text-zinc-100 border-zinc-800"
            >
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 text-zinc-100 border-zinc-800">
              {SUPPORTED_METHODS.map((m) => (
                <SelectItem
                  key={m}
                  value={m}
                  className="focus:bg-zinc-800 focus:text-zinc-50"
                >
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Input
            value={url}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setUrl(event.target.value)}
            placeholder="https://api.example.com/v1/endpoint"
            aria-label="Request URL"
            className={[
              "bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500",
              isUrlValid ? "" : "border-rose-800 focus-visible:ring-rose-500/40",
            ].join(" ")}
          />
          {!isUrlValid && url.trim().length > 0 ? (
            <p className="mt-1 text-xs text-rose-300">
              URL must start with http:// or https://
            </p>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="headers" className="mt-4 w-full">
        <TabsList className="bg-zinc-900">
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="query">Query params</TabsTrigger>
          <TabsTrigger value="body">Body</TabsTrigger>
        </TabsList>

        <TabsContent value="headers" className="mt-4 space-y-3">
          {headerRows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input
                  value={row.key}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateRow(setHeaderRows, row.id, { key: event.target.value })
                  }
                  placeholder="Header name"
                  aria-label="Header name"
                  className="bg-zinc-950/60 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="col-span-6">
                <Input
                  value={row.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateRow(setHeaderRows, row.id, { value: event.target.value })
                  }
                  placeholder="Header value"
                  aria-label="Header value"
                  className="bg-zinc-950/60 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 px-0 text-zinc-300 hover:text-zinc-50"
                  onClick={() => handleRemoveRow(setHeaderRows, row.id)}
                  aria-label="Remove header row"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddRow(setHeaderRows)}
              aria-label="Add header"
              className="border-zinc-700"
            >
              Add header
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="query" className="mt-4 space-y-3">
          {queryParamRows.map((row) => (
            <div key={row.id} className="grid grid-cols-12 gap-2">
              <div className="col-span-5">
                <Input
                  value={row.key}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateRow(setQueryParamRows, row.id, { key: event.target.value })
                  }
                  placeholder="Param name"
                  aria-label="Query param name"
                  className="bg-zinc-950/60 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="col-span-6">
                <Input
                  value={row.value}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    handleUpdateRow(setQueryParamRows, row.id, { value: event.target.value })
                  }
                  placeholder="Param value"
                  aria-label="Query param value"
                  className="bg-zinc-950/60 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-9 px-0 text-zinc-300 hover:text-zinc-50"
                  onClick={() => handleRemoveRow(setQueryParamRows, row.id)}
                  aria-label="Remove query param row"
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddRow(setQueryParamRows)}
              aria-label="Add query parameter"
              className="border-zinc-700"
            >
              Add param
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="body" className="mt-4">
          <Textarea
            value={body}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setBody(event.target.value)}
            placeholder="Request body (optional)"
            aria-label="Request body"
            className="min-h-[140px] bg-zinc-950/60 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
          />
          {jsonBodyError ? (
            <p className="mt-2 text-xs text-rose-300">{jsonBodyError}</p>
          ) : null}
        </TabsContent>
      </Tabs>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          onClick={() => void handleExecute()}
          disabled={!canExecute}
          aria-label="Execute request"
          variant="outline"
          className="border-zinc-700"
        >
          {isExecuting ? "Executing..." : "Execute"}
        </Button>
      </div>
    </div>
  );
};

