/**
 * HAR Entry models based on HAR 1.2 spec
 */

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

export interface HarPostData {
  mimeType: string;
  text?: string;
  params?: HarParam[];
  comment?: string;
}

export interface HarParam {
  name: string;
  value?: string;
  fileName?: string;
  contentType?: string;
  comment?: string;
}

export interface HarContent {
  size: number;
  mimeType: string;
  text?: string;
  encoding?: string;
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

/**
 * Lightweight summary of HAR entry for frontend display
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
