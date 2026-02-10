import { RedactionService } from './redaction.service';
import { HarEntry } from '../shared/models/har-entry.model';

describe('RedactionService', () => {
  const service = new RedactionService();

  const createEntry = (overrides: Partial<HarEntry> = {}): HarEntry => ({
    startedDateTime: '2024-01-01T00:00:00.000Z',
    time: 10,
    request: {
      method: 'GET',
      url: 'https://api.example.com/users/123456?token=secret',
      httpVersion: 'HTTP/1.1',
      headers: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Authorization', value: 'Bearer secret' },
      ],
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

  it('sanitizes URLs for narrow pass', () => {
    const manifest = service.sanitizeForNarrowPass([createEntry()]);
    expect(manifest[0].sanitizedUrlPath).toBe('/users/{id}');
    expect(manifest[0].host).toBe('api.example.com');
  });

  it('redacts non-allowlisted headers in detail pass', () => {
    const candidates = service.redactForDetailPass([createEntry()], [0]);
    const headerMap = new Map(candidates[0].requestHeaders.map((h) => [h.name, h.value]));
    expect(headerMap.get('Content-Type')).toBe('application/json');
    expect(headerMap.get('Authorization')).toBe('<REDACTED>');
  });

  it('extracts top-level keys when JSON body is present', () => {
    const entry = createEntry({
      request: {
        ...createEntry().request,
        method: 'POST',
        postData: {
          mimeType: 'application/json',
          text: JSON.stringify({ email: 'test@example.com', password: 'secret' }),
        },
      },
    });
    const manifest = service.sanitizeForNarrowPass([entry]);
    expect(manifest[0].bodyTopLevelKeys).toEqual(['email', 'password']);
  });
});
