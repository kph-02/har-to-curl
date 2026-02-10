"use client";

import * as React from "react";

import { HarUploadZone } from "@/components/har-upload-zone";
import { EntryList } from "@/components/entry-list";
import { RequestDetailPanel } from "@/components/request-detail-panel";
import type { HarEntrySummary, UploadResponse } from "@/lib/types";

const DEFAULT_MAX_SIZE_MB: number = 100;

export default function Home() {
  const [sessionId, setSessionId] = React.useState<string>("");
  const [entries, setEntries] = React.useState<HarEntrySummary[]>([]);
  const [selectedIndices, setSelectedIndices] = React.useState<ReadonlySet<number>>(
    new Set<number>(),
  );
  const [inspectedEntry, setInspectedEntry] = React.useState<HarEntrySummary | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState<boolean>(false);

  const handleUploadSuccess = (response: UploadResponse): void => {
    setSessionId(response.sessionId);
    setEntries(response.entries);
    setSelectedIndices(new Set<number>());
    setInspectedEntry(null);
    setIsDetailOpen(false);
  };

  const handleInspectEntry = (entry: HarEntrySummary): void => {
    setInspectedEntry(entry);
    setIsDetailOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">API Reverse Engineering Tool</h1>
          <p className="text-muted-foreground mb-8">
            Upload a HAR file, describe an API, and get a functional curl command
          </p>

          <div className="space-y-6">
            <HarUploadZone
              maxSizeMB={DEFAULT_MAX_SIZE_MB}
              onUploadSuccess={(response: UploadResponse) => handleUploadSuccess(response)}
            />

            {sessionId && entries.length > 0 ? (
              <EntryList
                entries={entries}
                selectedIndices={selectedIndices}
                onSelectedIndicesChange={setSelectedIndices}
                onInspectEntry={handleInspectEntry}
              />
            ) : null}
          </div>

          <RequestDetailPanel
            isOpen={isDetailOpen}
            sessionId={sessionId}
            entrySummary={inspectedEntry}
            onOpenChange={setIsDetailOpen}
          />
        </div>
      </main>
    </div>
  );
}
