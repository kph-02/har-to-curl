import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  PayloadTooLargeException,
  NotFoundException,
} from '@nestjs/common';
import { HarController } from './har.controller';
import { HarParserService } from './har-parser.service';
import { HarFilterService } from './har-filter.service';
import { SessionStoreService } from '../shared/session-store.service';
import { HarEntry } from '../shared/models/har-entry.model';

describe('HarController', () => {
  let controller: HarController;
  let parserService: HarParserService;
  let filterService: HarFilterService;
  let sessionStore: SessionStoreService;

  const mockEntry: HarEntry = {
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
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HarController],
      providers: [HarParserService, HarFilterService, SessionStoreService],
    }).compile();

    controller = module.get<HarController>(HarController);
    parserService = module.get<HarParserService>(HarParserService);
    filterService = module.get<HarFilterService>(HarFilterService);
    sessionStore = module.get<SessionStoreService>(SessionStoreService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /har/upload', () => {
    it('should successfully upload a valid HAR file', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [mockEntry],
            },
          }),
        ),
        size: 1024,
      } as Express.Multer.File;

      const result = controller.uploadHar(mockFile);

      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('entries');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toHaveProperty('index');
      expect(result.entries[0]).toHaveProperty('duplicateCount');
    });

    it('should throw BadRequestException when no file is provided', () => {
      expect(() => controller.uploadHar(undefined as any)).toThrow(
        BadRequestException,
      );
      expect(() => controller.uploadHar(undefined as any)).toThrow(
        /No file was uploaded/i,
      );
    });

    it('should throw BadRequestException for non-.har file extension', () => {
      const mockFile = {
        originalname: 'test.json',
        buffer: Buffer.from('{}'),
        size: 100,
      } as Express.Multer.File;

      expect(() => controller.uploadHar(mockFile)).toThrow(BadRequestException);
      expect(() => controller.uploadHar(mockFile)).toThrow(
        /Only .har files are supported/i,
      );
    });

    it('should throw PayloadTooLargeException for files exceeding size limit', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from('{}'),
        size: 200 * 1024 * 1024, // 200 MB (exceeds default 100 MB limit)
      } as Express.Multer.File;

      expect(() => controller.uploadHar(mockFile)).toThrow(
        PayloadTooLargeException,
      );
      expect(() => controller.uploadHar(mockFile)).toThrow(/too large/i);
    });

    it('should throw BadRequestException for invalid JSON', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from('not valid json'),
        size: 100,
      } as Express.Multer.File;

      expect(() => controller.uploadHar(mockFile)).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-HAR JSON', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(JSON.stringify({ data: 'something else' })),
        size: 100,
      } as Express.Multer.File;

      expect(() => controller.uploadHar(mockFile)).toThrow(BadRequestException);
      expect(() => controller.uploadHar(mockFile)).toThrow(
        /doesn't appear to be a HAR file/i,
      );
    });

    it('should store full entries in session and return summaries', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [mockEntry],
            },
          }),
        ),
        size: 1024,
      } as Express.Multer.File;

      const result = controller.uploadHar(mockFile);
      const storedEntries = sessionStore.get(result.sessionId);

      expect(storedEntries).toBeDefined();
      expect(storedEntries).toHaveLength(1);
      expect(storedEntries![0]).toHaveProperty('request');
      expect(storedEntries![0]).toHaveProperty('response');
    });
  });

  describe('GET /har/sessions/:sessionId/entries/:index', () => {
    it('should return full entry for valid session and index', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [mockEntry],
            },
          }),
        ),
        size: 1024,
      } as Express.Multer.File;

      const { sessionId } = controller.uploadHar(mockFile);
      const entry = controller.getEntry(sessionId, 0);

      expect(entry).toBeDefined();
      expect(entry.request.url).toBe('https://example.com/api');
      expect(entry.response.status).toBe(200);
    });

    it('should throw NotFoundException for expired/invalid session', () => {
      expect(() => controller.getEntry('invalid-session-id', 0)).toThrow(
        NotFoundException,
      );
      expect(() => controller.getEntry('invalid-session-id', 0)).toThrow(
        /session has expired/i,
      );
    });

    it('should throw BadRequestException for out-of-range index', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [mockEntry],
            },
          }),
        ),
        size: 1024,
      } as Express.Multer.File;

      const { sessionId } = controller.uploadHar(mockFile);

      expect(() => controller.getEntry(sessionId, 999)).toThrow(
        BadRequestException,
      );
      expect(() => controller.getEntry(sessionId, 999)).toThrow(
        /entries are invalid/i,
      );
    });

    it('should throw BadRequestException for negative index', () => {
      const mockFile = {
        originalname: 'test.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [mockEntry],
            },
          }),
        ),
        size: 1024,
      } as Express.Multer.File;

      const { sessionId } = controller.uploadHar(mockFile);

      expect(() => controller.getEntry(sessionId, -1)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('Integration with services', () => {
    it('should integrate parser and filter services correctly', () => {
      const mockFile = {
        originalname: 'complex.har',
        buffer: Buffer.from(
          JSON.stringify({
            log: {
              entries: [
                mockEntry,
                {
                  ...mockEntry,
                  request: { ...mockEntry.request, method: 'OPTIONS' },
                },
                {
                  ...mockEntry,
                  response: {
                    ...mockEntry.response,
                    content: { size: 0, mimeType: 'image/png' },
                  },
                },
              ],
            },
          }),
        ),
        size: 2048,
      } as Express.Multer.File;

      const result = controller.uploadHar(mockFile);

      // Should only have 1 entry after filtering (OPTIONS and image filtered out)
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].method).toBe('GET');
    });
  });
});
