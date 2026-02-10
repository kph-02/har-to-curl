/**
 * Summary of a HAR entry returned from backend
 */
export interface HarEntrySummary {
  index: number;
  method: string;
  url: string;
  status: number;
  timestamp: string;
  size: number;
  duration: number;
}

/**
 * Structured representation of an HTTP request
 */
export interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
}

/**
 * Result of LLM analysis with matched entry and generated curl
 */
export interface CurlResult {
  matchedEntry: HarEntrySummary;
  parsedRequest: ParsedRequest;
  curlCommand: string;
}

/**
 * Standardized API error response
 */
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
  timestamp?: string;
  path?: string;
}

/**
 * Result of executing an API request
 */
export interface ExecutionResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}
