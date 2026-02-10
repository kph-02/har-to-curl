"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { apiRequest, ApiClientError } from "@/lib/api-client";
import type { AnalyzeHarResponse } from "@/lib/types";
import { toast } from "sonner";

type ApiDescriptionFormProps = {
  sessionId: string;
  selectedIndices: ReadonlySet<number>;
  onAnalyzeSuccess: (response: AnalyzeHarResponse) => void;
};

export const ApiDescriptionForm = ({
  sessionId,
  selectedIndices,
  onAnalyzeSuccess,
}: ApiDescriptionFormProps) => {
  const [description, setDescription] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!description.trim()) {
      toast.error("Please describe the API you want to reverse-engineer.");
      return;
    }
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const payload: { sessionId: string; description: string; selectedIndices?: number[] } = {
        sessionId,
        description: description.trim(),
      };
      if (selectedIndices.size > 0) {
        payload.selectedIndices = Array.from(selectedIndices);
      }
      const response = await apiRequest<AnalyzeHarResponse>("/har/analyze", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      onAnalyzeSuccess(response);
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.error : "Unable to analyze this request.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-100">Describe the API</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Provide a short description (e.g., “login endpoint that returns a JWT”).
          </p>
        </div>
        {isLoading ? (
          <span className="text-xs text-zinc-400">Analyzing...</span>
        ) : null}
      </div>
      <Textarea
        value={description}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          setDescription(event.target.value)
        }
        placeholder="Describe the API you want to reverse-engineer"
        className="mt-3 min-h-[120px] bg-zinc-950/60 text-zinc-100 placeholder:text-zinc-500"
      />
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={isLoading}>
          Analyze
        </Button>
      </div>
    </form>
  );
};
