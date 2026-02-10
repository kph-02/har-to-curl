/**
 * Result of executing a curl request
 */
export interface CurlResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
}
