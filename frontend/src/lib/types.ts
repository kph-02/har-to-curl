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
  duplicateCount: number;
}

export interface UploadResponse {
  sessionId: string;
  entries: HarEntrySummary[];
}

export interface AnalyzeHarRequest {
  sessionId: string;
  description: string;
  selectedIndices?: number[];
}

export interface AnalyzeHarResponse {
  matchedEntryIndex: number;
  parsedRequest: ParsedRequest;
  curlCommand: string;
}

export interface HarCookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
  comment?: string;
}

export interface HarHeader {
  name: string;
  value: string;
  comment?: string;
}

export interface HarQueryParam {
  name: string;
  value: string;
  comment?: string;
}

export interface HarPostData {
  mimeType: string;
  text?: string;
  params?: Array<{
    name: string;
    value?: string;
    fileName?: string;
    contentType?: string;
    comment?: string;
  }>;
  comment?: string;
}

export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
  encoding?: string;
  comment?: string;
}

export interface HarRequest {
  method: string;
  url: string;
  httpVersion: string;
  headers: HarHeader[];
  queryString: HarQueryParam[];
  cookies?: HarCookie[];
  postData?: HarPostData;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HarResponse {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: HarHeader[];
  cookies?: HarCookie[];
  content: HarContent;
  redirectURL: string;
  headersSize: number;
  bodySize: number;
  comment?: string;
}

export interface HarTimings {
  blocked?: number;
  dns?: number;
  connect?: number;
  send: number;
  wait: number;
  receive: number;
  ssl?: number;
  comment?: string;
}

export interface HarEntry {
  startedDateTime: string;
  time: number;
  request: HarRequest;
  response: HarResponse;
  cache?: unknown;
  timings: HarTimings;
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
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
