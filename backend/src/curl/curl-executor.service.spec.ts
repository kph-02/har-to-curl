import axios from 'axios';
import { BadRequestException } from '@nestjs/common';
import { CurlExecutorService } from './curl-executor.service';
import { AppConfig } from '../shared/config/app.config';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    request: jest.fn(),
    isAxiosError: jest.fn(),
  },
}));

describe('CurlExecutorService', () => {
  let service: CurlExecutorService;

  beforeEach(() => {
    service = new CurlExecutorService();
    AppConfig.curl.executeTimeoutMs = 1234;
    AppConfig.curl.maxResponseBytes = 5678;
    AppConfig.curl.maxRequestBodyBytes = 9012;
    (axios.request as unknown as jest.Mock).mockReset();
    (axios.isAxiosError as unknown as jest.Mock).mockReset();
  });

  it('sets axios execution limits and does not follow redirects', async () => {
    (axios.request as unknown as jest.Mock).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'text/plain' },
      data: Buffer.from('ok'),
    });

    const actualResult = await service.executeRequest({
      method: 'GET',
      url: 'https://example.com/path',
      headers: {},
      queryParams: { a: '1' },
    });

    expect(actualResult.status).toBe(200);
    expect(axios.request).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 1234,
        maxRedirects: 0,
        maxContentLength: 5678,
        maxBodyLength: 9012,
        responseType: 'arraybuffer',
        validateStatus: expect.any(Function),
      }),
    );
  });

  it('rejects invalid JSON body when content-type is application/json', async () => {
    await expect(
      service.executeRequest({
        method: 'POST',
        url: 'https://example.com/path',
        headers: { 'Content-Type': 'application/json' },
        queryParams: {},
        body: '{not valid json',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

