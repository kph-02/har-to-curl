import { Injectable } from '@nestjs/common';
import { HarEntry } from '../shared/models/har-entry.model';
import { AppConfig } from '../shared/config/app.config';

type NarrowManifestEntry = {
  index: number;
  method: string;
  sanitizedUrlPath: string;
  host: string;
  requestMimeType?: string;
  responseMimeType?: string;
  statusCode: number;
  bodyTopLevelKeys?: string[];
};

type RedactedHeader = {
  name: string;
  value: string;
};

type RedactedCandidate = {
  index: number;
  method: string;
  sanitizedUrl: string;
  requestHeaders: RedactedHeader[];
  requestBodyPreview?: string;
  responseStatus?: number;
  responseBodyPreview?: string;
};

@Injectable()
export class RedactionService {
  private readonly safeHeaderAllowlist = new Set<string>([
    'content-type',
    'accept',
    'accept-encoding',
    'accept-language',
  ]);

  sanitizeForNarrowPass(entries: HarEntry[]): NarrowManifestEntry[] {
    return entries.map((entry, index) => {
      const sanitizedUrlPath: string = this.sanitizeUrlPath(entry.request.url);
      const host: string = this.getHost(entry.request.url);
      const requestMimeType: string | undefined = entry.request.postData?.mimeType;
      const responseMimeType: string | undefined = entry.response.content?.mimeType;
      const statusCode: number = entry.response.status;
      const bodyTopLevelKeys: string[] | undefined = this.getTopLevelKeys(entry);
      return {
        index,
        method: entry.request.method,
        sanitizedUrlPath,
        host,
        requestMimeType,
        responseMimeType,
        statusCode,
        bodyTopLevelKeys,
      };
    });
  }

  redactForDetailPass(entries: HarEntry[], candidateIndices: number[]): RedactedCandidate[] {
    const redactedCandidates: RedactedCandidate[] = [];
    candidateIndices.forEach((candidateIndex) => {
      const entry: HarEntry | undefined = entries[candidateIndex];
      if (!entry) {
        return;
      }
      const sanitizedUrl: string = this.sanitizeUrlWithHost(entry.request.url);
      const requestHeaders: RedactedHeader[] = this.redactHeaders(entry.request.headers);
      const requestBodyPreview: string | undefined = this.redactBodyPreview(entry.request.postData?.text);
      const responseStatus: number | undefined = entry.response?.status;
      const responseBodyPreview: string | undefined = this.redactBodyPreview(entry.response?.content?.text);
      redactedCandidates.push({
        index: candidateIndex,
        method: entry.request.method,
        sanitizedUrl,
        requestHeaders,
        requestBodyPreview,
        responseStatus,
        responseBodyPreview,
      });
    });
    return redactedCandidates;
  }

  private getTopLevelKeys(entry: HarEntry): string[] | undefined {
    const method: string = entry.request.method.toUpperCase();
    if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
      return undefined;
    }
    const rawBody: string | undefined = entry.request.postData?.text;
    if (!rawBody) {
      return undefined;
    }
    const limitedBody: string = this.truncateWithHeadTail(rawBody, AppConfig.har.bodyTruncateLimit);
    try {
      const parsed: unknown = JSON.parse(limitedBody);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.keys(parsed as Record<string, unknown>);
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  private redactHeaders(headers: Array<{ name: string; value: string }>): RedactedHeader[] {
    return headers.map((header) => {
      const headerName: string = header.name;
      const lowerName: string = headerName.toLowerCase();
      if (this.safeHeaderAllowlist.has(lowerName)) {
        return { name: headerName, value: header.value };
      }
      return { name: headerName, value: '<REDACTED>' };
    });
  }

  private redactBodyPreview(body?: string): string | undefined {
    if (!body) {
      return undefined;
    }
    const limitedBody: string = this.truncateWithHeadTail(body, AppConfig.har.bodyTruncateLimit);
    let redactedTokens: string = this.redactTokenLikeValues(limitedBody);
    redactedTokens = this.redactCookiePairs(redactedTokens);
    return this.redactSensitiveJsonValues(redactedTokens);
  }

  private sanitizeUrlPath(rawUrl: string): string {
    try {
      const parsed: URL = new URL(rawUrl);
      return this.normalizePath(parsed.pathname || '/');
    } catch {
      return this.normalizePath(rawUrl);
    }
  }

  private sanitizeUrlWithHost(rawUrl: string): string {
    try {
      const parsed: URL = new URL(rawUrl);
      const normalizedPath: string = this.normalizePath(parsed.pathname || '/');
      return `${parsed.host}${normalizedPath}`;
    } catch {
      return this.normalizePath(rawUrl);
    }
  }

  private getHost(rawUrl: string): string {
    try {
      return new URL(rawUrl).host;
    } catch {
      return '';
    }
  }

  private normalizePath(pathname: string): string {
    const segments: string[] = pathname.split('/').map((segment) => {
      if (!segment) {
        return segment;
      }
      if (this.isUuid(segment)) {
        return '{id}';
      }
      if (this.isLongNumeric(segment)) {
        return '{id}';
      }
      if (this.isEmail(segment)) {
        return '{email}';
      }
      if (this.isTokenLike(segment)) {
        return '{token}';
      }
      return segment;
    });
    return segments.join('/');
  }

  private isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  private isLongNumeric(value: string): boolean {
    return /^[0-9]{6,}$/.test(value);
  }

  private isEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isTokenLike(value: string): boolean {
    return /^[A-Za-z0-9\-_]{20,}$/.test(value);
  }

  private truncateWithHeadTail(value: string, limit: number): string {
    if (value.length <= limit) {
      return value;
    }
    const half: number = Math.floor(limit / 2);
    const head: string = value.slice(0, half);
    const tail: string = value.slice(value.length - half);
    return `${head}...<TRUNCATED>...${tail}`;
  }

  private redactTokenLikeValues(value: string): string {
    const jwtPattern: RegExp = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
    const longTokenPattern: RegExp = /[A-Za-z0-9\-_]{24,}/g;
    return value.replace(jwtPattern, '<REDACTED>').replace(longTokenPattern, '<REDACTED>');
  }

  private redactSensitiveJsonValues(value: string): string {
    const keyPattern = /"([^"]+)"\s*:\s*"([^"]*)"/g;
    return value.replace(keyPattern, (match, key: string) => {
      if (this.isSensitiveKey(key)) {
        return `"${key}":"<REDACTED>"`;
      }
      return match;
    });
  }

  private redactCookiePairs(value: string): string {
    const cookiePattern: RegExp = /([A-Za-z0-9_-]+)\s*=\s*[^;,\s]+/g;
    return value.replace(cookiePattern, (match, key: string) => {
      if (this.isSensitiveKey(key)) {
        return `${key}=<REDACTED>`;
      }
      return match;
    });
  }

  private isSensitiveKey(key: string): boolean {
    return /password|secret|token|api[_-]?key|authorization|cookie|session/i.test(key);
  }
}
