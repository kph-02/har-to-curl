import {
  Injectable,
  UnprocessableEntityException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { HarEntry, HarEntrySummary } from '../shared/models/har-entry.model';
import { AppConfig } from '../shared/config/app.config';

/**
 * Filters HAR entries to keep only API-relevant requests
 * Five-phase pipeline: method, status, content-type, headers, dedup
 */
@Injectable()
export class HarFilterService {
  private readonly ALLOWED_CONTENT_TYPES = [
    'application/json',
    'text/xml',
    'application/xml',
    'text/plain',
    'application/x-www-form-urlencoded',
  ];

  private readonly NOISY_HEADERS = new Set([
    'content-security-policy',
    'x-request-id',
    'strict-transport-security',
    'report-to',
    'etag',
    'if-none-match',
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
    'cross-origin-opener-policy',
    'cross-origin-embedder-policy',
    'cross-origin-resource-policy',
    'nel',
    'server-timing',
    'x-powered-by',
    'via',
    'age',
    'cache-control',
    'pragma',
    'expires',
  ]);

  /**
   * Filter HAR entries through 5-phase pipeline
   * Returns full entries for session store + lightweight summaries for frontend
   */
  filter(entries: HarEntry[]): {
    entries: HarEntry[];
    summaries: HarEntrySummary[];
  } {
    // Phase 1: Method filter (drop OPTIONS)
    let filtered = entries.filter((e) => e.request.method !== 'OPTIONS');

    // Phase 2: Status filter (drop status 0)
    filtered = filtered.filter((e) => e.response.status !== 0);

    // Phase 3: Content-type filter
    filtered = filtered.filter((e) => {
      const mimeType = e.response.content.mimeType || '';
      const baseType = mimeType.split(';')[0].trim().toLowerCase();
      return this.ALLOWED_CONTENT_TYPES.includes(baseType);
    });

    // Phase 4: Header noise removal
    filtered = filtered.map((entry) => ({
      ...entry,
      request: {
        ...entry.request,
        headers: this.filterHeaders(entry.request.headers),
      },
      response: {
        ...entry.response,
        headers: this.filterHeaders(entry.response.headers),
      },
    }));

    // Phase 5: URL-pattern deduplication
    const { dedupedEntries, duplicateCounts } = this.deduplicateByUrlPattern(
      filtered,
    );

    // Validate results
    if (dedupedEntries.length === 0) {
      throw new UnprocessableEntityException(
        'No API requests found in this file. It only contains static assets (images, CSS, JS).',
      );
    }

    if (dedupedEntries.length > AppConfig.har.maxEntries) {
      throw new PayloadTooLargeException(
        `This HAR contains too many API requests (${dedupedEntries.length}). Please use a shorter recording (max ${AppConfig.har.maxEntries}).`,
      );
    }

    // Build summaries with stable indices
    const summaries: HarEntrySummary[] = dedupedEntries.map((entry, index) => ({
      index,
      method: entry.request.method,
      url: entry.request.url,
      status: entry.response.status,
      timestamp: entry.startedDateTime,
      size: entry.response.bodySize,
      duration: entry.time,
      duplicateCount: duplicateCounts[index],
    }));

    return { entries: dedupedEntries, summaries };
  }

  /**
   * Remove noisy non-functional headers
   */
  private filterHeaders(
    headers: Array<{ name: string; value: string }>,
  ): Array<{ name: string; value: string }> {
    return headers.filter(
      (h) => !this.NOISY_HEADERS.has(h.name.toLowerCase()),
    );
  }

  /**
   * Deduplicate by method + URL pathname (ignoring query string)
   * Keep first occurrence, track duplicate count
   * Optimized O(n) algorithm using Map lookups
   */
  private deduplicateByUrlPattern(entries: HarEntry[]): {
    dedupedEntries: HarEntry[];
    duplicateCounts: number[];
  } {
    const patternToIndex = new Map<string, number>(); // pattern -> index in dedupedEntries
    const patternCounts = new Map<string, number>(); // pattern -> total count
    const dedupedEntries: HarEntry[] = [];
    const duplicateCounts: number[] = [];

    for (const entry of entries) {
      const pattern = this.extractUrlPattern(entry.request.method, entry.request.url);

      if (!patternToIndex.has(pattern)) {
        // First occurrence - keep it
        const newIndex = dedupedEntries.length;
        patternToIndex.set(pattern, newIndex);
        patternCounts.set(pattern, 1);
        dedupedEntries.push(entry);
        duplicateCounts.push(1);
      } else {
        // Duplicate - increment count
        const existingIndex = patternToIndex.get(pattern)!;
        const newCount = (patternCounts.get(pattern) || 1) + 1;
        patternCounts.set(pattern, newCount);
        duplicateCounts[existingIndex] = newCount;
      }
    }

    return { dedupedEntries, duplicateCounts };
  }

  /**
   * Extract URL pattern: method + pathname (no query string, no host)
   */
  private extractUrlPattern(method: string, url: string): string {
    try {
      const parsed = new URL(url);
      return `${method} ${parsed.pathname}`;
    } catch {
      // If URL parsing fails, use the whole URL as fallback
      return `${method} ${url}`;
    }
  }
}
