import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  PayloadTooLargeException,
} from '@nestjs/common';
import { HarFilterService } from './har-filter.service';
import { HarEntry } from '../shared/models/har-entry.model';

describe('HarFilterService', () => {
  let service: HarFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HarFilterService],
    }).compile();

    service = module.get<HarFilterService>(HarFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const createMockEntry = (overrides: Partial<HarEntry> = {}): HarEntry => ({
    startedDateTime: '2024-01-01T00:00:00.000Z',
    time: 100,
    request: {
      method: 'GET',
      url: 'https://example.com/api',
      httpVersion: 'HTTP/1.1',
      headers: [],
      queryString: [],
      headersSize: 0,
      bodySize: 0,
    },
    response: {
      status: 200,
      statusText: 'OK',
      httpVersion: 'HTTP/1.1',
      headers: [],
      content: { size: 0, mimeType: 'application/json' },
      redirectURL: '',
      headersSize: 0,
      bodySize: 0,
    },
    timings: { send: 0, wait: 0, receive: 0 },
    ...overrides,
  });

  describe('filter - Phase 1: Method filter', () => {
    it('should filter out OPTIONS requests', () => {
      const entries = [
        createMockEntry({ request: { ...createMockEntry().request, method: 'GET' } }),
        createMockEntry({ request: { ...createMockEntry().request, method: 'OPTIONS' } }),
        createMockEntry({ request: { ...createMockEntry().request, method: 'POST' } }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.request.method !== 'OPTIONS')).toBe(true);
    });
  });

  describe('filter - Phase 2: Status filter', () => {
    it('should filter out status 0 entries', () => {
      const entries = [
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/v1' },
        }),
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/v2' },
          response: { ...createMockEntry().response, status: 0 },
        }),
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/v3' },
          response: { ...createMockEntry().response, status: 404 },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(2);
      expect(filtered.every((e) => e.response.status !== 0)).toBe(true);
    });
  });

  describe('filter - Phase 3: Content-type filter', () => {
    it('should keep JSON content types', () => {
      const entries = [
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'application/json' },
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(1);
    });

    it('should keep XML content types', () => {
      const entries = [
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/xml1' },
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'text/xml' },
          },
        }),
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/xml2' },
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'application/xml' },
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(2);
    });

    it('should keep plain text and form content types', () => {
      const entries = [
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/text' },
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'text/plain' },
          },
        }),
        createMockEntry({
          request: { ...createMockEntry().request, url: 'https://example.com/api/form' },
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'application/x-www-form-urlencoded' },
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(2);
    });

    it('should filter out image, font, CSS, and JS content types', () => {
      const entries = [
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'image/png' },
          },
        }),
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'font/woff2' },
          },
        }),
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'text/css' },
          },
        }),
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'application/javascript' },
          },
        }),
      ];

      expect(() => service.filter(entries)).toThrow(UnprocessableEntityException);
      expect(() => service.filter(entries)).toThrow(/No API requests found/i);
    });

    it('should handle content-type with charset parameter', () => {
      const entries = [
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'application/json; charset=utf-8' },
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(1);
    });
  });

  describe('filter - Phase 4: Header noise removal', () => {
    it('should remove noisy headers', () => {
      const entries = [
        createMockEntry({
          request: {
            ...createMockEntry().request,
            headers: [
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Content-Security-Policy', value: 'default-src self' },
              { name: 'X-Request-Id', value: '123' },
              { name: 'Authorization', value: 'Bearer token' },
            ],
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered[0].request.headers).toHaveLength(2);
      expect(filtered[0].request.headers.find((h) => h.name === 'Content-Type')).toBeDefined();
      expect(filtered[0].request.headers.find((h) => h.name === 'Authorization')).toBeDefined();
      expect(filtered[0].request.headers.find((h) => h.name === 'Content-Security-Policy')).toBeUndefined();
      expect(filtered[0].request.headers.find((h) => h.name === 'X-Request-Id')).toBeUndefined();
    });

    it('should preserve functional headers', () => {
      const entries = [
        createMockEntry({
          request: {
            ...createMockEntry().request,
            headers: [
              { name: 'Authorization', value: 'Bearer token' },
              { name: 'Content-Type', value: 'application/json' },
              { name: 'Accept', value: 'application/json' },
              { name: 'X-API-Key', value: 'key123' },
            ],
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered[0].request.headers).toHaveLength(4);
    });
  });

  describe('filter - Phase 5: URL-pattern deduplication', () => {
    it('should deduplicate by method + pathname', () => {
      const entries = [
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://example.com/api/events?id=1',
          },
        }),
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://example.com/api/events?id=2',
          },
        }),
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://example.com/api/events?id=3',
          },
        }),
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'GET',
            url: 'https://example.com/api/users',
          },
        }),
      ];

      const { entries: filtered, summaries } = service.filter(entries);

      expect(filtered).toHaveLength(2);
      expect(summaries[0].duplicateCount).toBe(3);
      expect(summaries[1].duplicateCount).toBe(1);
    });

    it('should treat different methods as different patterns', () => {
      const entries = [
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'GET',
            url: 'https://example.com/api/users',
          },
        }),
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://example.com/api/users',
          },
        }),
      ];

      const { entries: filtered } = service.filter(entries);

      expect(filtered).toHaveLength(2);
    });
  });

  describe('filter - Error cases', () => {
    it('should throw UnprocessableEntityException when all entries are filtered out', () => {
      const entries = [
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'image/png' },
          },
        }),
      ];

      expect(() => service.filter(entries)).toThrow(UnprocessableEntityException);
      expect(() => service.filter(entries)).toThrow(/No API requests found/i);
    });

    it('should throw PayloadTooLargeException when entries exceed max limit', () => {
      // Create 501 entries (over the default limit of 500)
      const entries = Array.from({ length: 501 }, (_, i) =>
        createMockEntry({
          request: {
            ...createMockEntry().request,
            url: `https://example.com/api/${i}`,
          },
        }),
      );

      expect(() => service.filter(entries)).toThrow(PayloadTooLargeException);
      expect(() => service.filter(entries)).toThrow(/too many API requests/i);
    });
  });

  describe('filter - Summary generation', () => {
    it('should generate correct HarEntrySummary objects', () => {
      const entries = [
        createMockEntry({
          startedDateTime: '2024-01-01T12:00:00.000Z',
          time: 250,
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://api.example.com/v1/users',
          },
          response: {
            ...createMockEntry().response,
            status: 201,
            bodySize: 1024,
          },
        }),
      ];

      const { summaries } = service.filter(entries);

      expect(summaries).toHaveLength(1);
      expect(summaries[0]).toMatchObject({
        index: 0,
        method: 'POST',
        url: 'https://api.example.com/v1/users',
        status: 201,
        timestamp: '2024-01-01T12:00:00.000Z',
        size: 1024,
        duration: 250,
        duplicateCount: 1,
      });
    });
  });

  describe('filter - Full integration', () => {
    it('should correctly filter a mixed set of entries', () => {
      const entries = [
        // Valid JSON API call
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'GET',
            url: 'https://api.example.com/users',
          },
        }),
        // OPTIONS (should be filtered)
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'OPTIONS',
            url: 'https://api.example.com/users',
          },
        }),
        // Status 0 (should be filtered)
        createMockEntry({
          response: {
            ...createMockEntry().response,
            status: 0,
          },
        }),
        // Image (should be filtered)
        createMockEntry({
          response: {
            ...createMockEntry().response,
            content: { size: 0, mimeType: 'image/png' },
          },
        }),
        // Valid POST (duplicate of next)
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://api.example.com/events?id=1',
          },
        }),
        // Duplicate POST
        createMockEntry({
          request: {
            ...createMockEntry().request,
            method: 'POST',
            url: 'https://api.example.com/events?id=2',
          },
        }),
      ];

      const { entries: filtered, summaries } = service.filter(entries);

      expect(filtered).toHaveLength(2);
      expect(summaries[0].method).toBe('GET');
      expect(summaries[0].duplicateCount).toBe(1);
      expect(summaries[1].method).toBe('POST');
      expect(summaries[1].duplicateCount).toBe(2);
    });
  });
});
