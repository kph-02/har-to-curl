import axios, { AxiosError, AxiosResponse } from 'axios';
import { Injectable, BadGatewayException, BadRequestException, GatewayTimeoutException } from '@nestjs/common';
import { AppConfig } from '../shared/config/app.config';
import { CurlResult } from '../shared/models/curl-result.model';
import { ParsedRequest } from '../shared/models/parsed-request.model';

const HOP_BY_HOP_HEADER_NAMES = new Set<string>([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  'accept-encoding',
]);

const JSON_MIME_TYPE = 'application/json';

type NormalizedHeaders = Record<string, string>;

@Injectable()
export class CurlExecutorService {
  async executeRequest(parsedRequest: ParsedRequest): Promise<CurlResult> {
    const startedAtMs: number = Date.now();
    const finalUrl: string = this.buildFinalUrl({
      url: parsedRequest.url,
      queryParams: parsedRequest.queryParams,
    });
    const headers: NormalizedHeaders = this.normalizeHeaders(parsedRequest.headers);
    const method: string = parsedRequest.method.toUpperCase();
    const body: string | undefined = parsedRequest.body;
    this.validateJsonBodyIfNeeded({ headers, body });
    try {
      const response: AxiosResponse<ArrayBuffer> = await axios.request<ArrayBuffer>({
        url: finalUrl,
        method,
        headers,
        data: body,
        timeout: AppConfig.curl.executeTimeoutMs,
        maxRedirects: 0,
        maxContentLength: AppConfig.curl.maxResponseBytes,
        maxBodyLength: AppConfig.curl.maxRequestBodyBytes,
        responseType: 'arraybuffer',
        validateStatus: () => true,
      });
      const durationMs: number = Date.now() - startedAtMs;
      return this.toCurlResult({ response, durationMs });
    } catch (error) {
      const durationMs: number = Date.now() - startedAtMs;
      void durationMs;
      throw this.mapAxiosError(error);
    }
  }

  private buildFinalUrl(params: { url: string; queryParams: Record<string, string> }): string {
    let parsed: URL;
    try {
      parsed = new URL(params.url);
    } catch {
      throw new BadRequestException('Please enter a valid URL (must start with http:// or https://).');
    }
    for (const [key, value] of Object.entries(params.queryParams || {})) {
      if (!key || key.trim().length === 0) {
        continue;
      }
      parsed.searchParams.set(key, value ?? '');
    }
    return parsed.toString();
  }

  private normalizeHeaders(inputHeaders: Record<string, string>): NormalizedHeaders {
    const output: NormalizedHeaders = {};
    for (const [rawName, rawValue] of Object.entries(inputHeaders || {})) {
      const name: string = rawName.trim();
      if (!name) {
        continue;
      }
      if (name.startsWith(':')) {
        continue;
      }
      const lowerName: string = name.toLowerCase();
      if (HOP_BY_HOP_HEADER_NAMES.has(lowerName)) {
        continue;
      }
      output[name] = `${rawValue ?? ''}`;
    }
    return output;
  }

  private validateJsonBodyIfNeeded(params: { headers: NormalizedHeaders; body?: string }): void {
    if (!params.body || params.body.length === 0) {
      return;
    }
    const contentTypeKey: string | undefined = Object.keys(params.headers).find(
      (headerName: string) => headerName.toLowerCase() === 'content-type',
    );
    if (!contentTypeKey) {
      return;
    }
    const contentTypeValue: string = params.headers[contentTypeKey] || '';
    if (!contentTypeValue.toLowerCase().includes(JSON_MIME_TYPE)) {
      return;
    }
    try {
      JSON.parse(params.body);
    } catch {
      throw new BadRequestException('The request body is not valid JSON. Please check for syntax errors.');
    }
  }

  private toCurlResult(params: { response: AxiosResponse<ArrayBuffer>; durationMs: number }): CurlResult {
    const headerEntries: Array<[string, unknown]> = Object.entries(params.response.headers || {});
    const normalizedHeaders: Record<string, string> = {};
    for (const [name, value] of headerEntries) {
      if (Array.isArray(value)) {
        normalizedHeaders[name] = value.join(', ');
        continue;
      }
      normalizedHeaders[name] = typeof value === 'string' ? value : `${value ?? ''}`;
    }
    const buffer: Buffer = Buffer.from(params.response.data);
    const bodyText: string = buffer.toString('utf8');
    return {
      status: params.response.status,
      statusText: params.response.statusText || '',
      headers: normalizedHeaders,
      body: bodyText,
      duration: params.durationMs,
    };
  }

  private mapAxiosError(error: unknown): Error {
    if (!axios.isAxiosError(error)) {
      return new BadGatewayException('An error occurred while contacting the target URL. Please check the URL and try again.');
    }
    const axiosError: AxiosError = error;
    const code: string = axiosError.code || '';
    if (code === 'ECONNABORTED') {
      return new GatewayTimeoutException('The request timed out. The server may be slow or unresponsive.');
    }
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || code === 'ECONNREFUSED' || code === 'ECONNRESET') {
      return new BadGatewayException('Could not reach the target URL. The server may be down or the URL may be incorrect.');
    }
    const message: string = axiosError.message || '';
    if (message.toLowerCase().includes('timeout')) {
      return new GatewayTimeoutException('The request timed out. The server may be slow or unresponsive.');
    }
    if (message.toLowerCase().includes('maxcontentlength') || message.toLowerCase().includes('max body length')) {
      return new BadGatewayException('Upstream response exceeded the size limit.');
    }
    return new BadGatewayException('An error occurred while contacting the target URL. Please check the URL and try again.');
  }
}

