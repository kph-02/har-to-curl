import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { HarParserService } from './har-parser.service';

describe('HarParserService', () => {
  let service: HarParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HarParserService],
    }).compile();

    service = module.get<HarParserService>(HarParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parse', () => {
    it('should successfully parse a valid HAR file', () => {
      const validHar = {
        log: {
          version: '1.2',
          entries: [
            {
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
            },
          ],
        },
      };

      const buffer = Buffer.from(JSON.stringify(validHar), 'utf8');
      const result = service.parse(buffer);

      expect(result).toHaveLength(1);
      expect(result[0].request.method).toBe('GET');
      expect(result[0].request.url).toBe('https://example.com/api');
    });

    it('should throw BadRequestException for invalid JSON', () => {
      const invalidJson = Buffer.from('not valid json {', 'utf8');

      expect(() => service.parse(invalidJson)).toThrow(BadRequestException);
      expect(() => service.parse(invalidJson)).toThrow(
        /not valid JSON/i,
      );
    });

    it('should throw BadRequestException when log object is missing', () => {
      const noLog = { data: 'something else' };
      const buffer = Buffer.from(JSON.stringify(noLog), 'utf8');

      expect(() => service.parse(buffer)).toThrow(BadRequestException);
      expect(() => service.parse(buffer)).toThrow(
        /doesn't appear to be a HAR file/i,
      );
    });

    it('should throw BadRequestException when entries is not an array', () => {
      const invalidEntries = { log: { entries: 'not an array' } };
      const buffer = Buffer.from(JSON.stringify(invalidEntries), 'utf8');

      expect(() => service.parse(buffer)).toThrow(BadRequestException);
      expect(() => service.parse(buffer)).toThrow(
        /doesn't appear to be a HAR file/i,
      );
    });

    it('should throw BadRequestException when entries array is empty', () => {
      const emptyEntries = { log: { entries: [] } };
      const buffer = Buffer.from(JSON.stringify(emptyEntries), 'utf8');

      expect(() => service.parse(buffer)).toThrow(BadRequestException);
      expect(() => service.parse(buffer)).toThrow(
        /contains no entries/i,
      );
    });
  });
});
