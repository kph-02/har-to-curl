import { Injectable } from '@nestjs/common';
import { ParsedRequest } from '../models/parsed-request.model';

/**
 * Deterministically build a curl command from a ParsedRequest.
 * Display-only: no execution or shell usage.
 */
@Injectable()
export class CurlBuilderService {
  buildCurl(parsedRequest: ParsedRequest): string {
    let method: string = parsedRequest.method.toUpperCase();
    const url: string = this.escapeSingleQuotes(parsedRequest.url);
    const headerParts: string[] = [];
    let hasCacheControl = false;
    let hasPragma = false;

    for (const [name, value] of Object.entries(parsedRequest.headers)) {
      const lowerName = name.toLowerCase();
      if (lowerName.startsWith(':')) {
        if (lowerName === ':method' && value) {
          method = value.toUpperCase();
        }
        continue;
      }
      if (lowerName === 'accept-encoding') {
        continue;
      }
      if (lowerName === 'cache-control') {
        hasCacheControl = true;
      }
      if (lowerName === 'pragma') {
        hasPragma = true;
      }
      const headerName: string = this.escapeSingleQuotes(name);
      const headerValue: string = this.escapeSingleQuotes(value);
      headerParts.push(`-H '${headerName}: ${headerValue}'`);
    }

    if (!hasCacheControl) {
      headerParts.push(`-H 'cache-control: no-cache'`);
    }

    if (!hasPragma) {
      headerParts.push(`-H 'pragma: no-cache'`);
    }

    headerParts.sort((a, b) => a.localeCompare(b));

    const multilineParts: string[] = [];
    multilineParts.push(`curl '${url}'`);

    if (method !== 'GET') {
      multilineParts.push(`-X ${method}`);
    }

    headerParts.forEach((headerPart) => {
      multilineParts.push(headerPart);
    });

    if (parsedRequest.body && parsedRequest.body.length > 0) {
      const bodyValue: string = this.escapeSingleQuotes(parsedRequest.body);
      multilineParts.push(`--data-raw '${bodyValue}'`);
    }

    const output = multilineParts
      .map((part, index) => {
        if (index === 0) {
          return `${part} \\`;
        }
        if (index === multilineParts.length - 1) {
          return `  ${part}`;
        }
        return `  ${part} \\`;
      })
      .join('\n');
    return output;
  }

  private escapeSingleQuotes(value: string): string {
    return value.replace(/'/g, `'\"'\"'`);
  }
}
