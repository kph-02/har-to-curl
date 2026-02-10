import { Test, TestingModule } from '@nestjs/testing';
import { LlmService } from './llm.service';
import { RedactionService } from './redaction.service';
import { SessionStoreService } from '../shared/session-store.service';
import { CurlBuilderService } from '../shared/services/curl-builder.service';
import { AppConfig } from '../shared/config/app.config';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(),
      },
    },
  }));
});

describe('LlmService', () => {
  let service: LlmService;
  let sessionStore: SessionStoreService;

  const createEntry = (url: string) => ({
    startedDateTime: '2024-01-01T00:00:00.000Z',
    time: 10,
    request: {
      method: 'GET',
      url,
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
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LlmService, RedactionService, SessionStoreService, CurlBuilderService],
    }).compile();

    service = module.get<LlmService>(LlmService);
    sessionStore = module.get<SessionStoreService>(SessionStoreService);
  });

  it('selects a match in single-pass mode', async () => {
    const entries = [createEntry('https://example.com/one'), createEntry('https://example.com/two')];
    sessionStore.set('session-1', entries as any);
    const openAiClient = (service as any).client;
    openAiClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ matchedIndex: 1 }) } }],
    });
    const result = await service.analyzeSession({
      sessionId: 'session-1',
      description: 'two',
    });
    expect(result.matchedEntryIndex).toBe(1);
    expect(result.curlCommand).toContain('curl');
  });

  it('uses two-pass mode when entry count exceeds threshold', async () => {
    const entries = Array.from({ length: AppConfig.llm.singlePassThreshold + 1 }, (_, i) =>
      createEntry(`https://example.com/${i}`),
    );
    sessionStore.set('session-2', entries as any);
    const openAiClient = (service as any).client;
    openAiClient.chat.completions.create
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ topCandidates: [1, 2] }) } }],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ matchedIndex: 2 }) } }],
      });
    const result = await service.analyzeSession({
      sessionId: 'session-2',
      description: 'entry 2',
    });
    expect(result.matchedEntryIndex).toBe(2);
  });

  it('throws on invalid candidate index', async () => {
    const entries = [createEntry('https://example.com/one')];
    sessionStore.set('session-3', entries as any);
    const openAiClient = (service as any).client;
    openAiClient.chat.completions.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ matchedIndex: 99 }) } }],
    });
    await expect(
      service.analyzeSession({
        sessionId: 'session-3',
        description: 'invalid',
      }),
    ).rejects.toThrow(/Could not determine a match/i);
  });
});
