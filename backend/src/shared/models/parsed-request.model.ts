/**
 * Structured representation of an HTTP request
 * Used for curl generation and execution
 */
export interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
}
