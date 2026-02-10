import { CurlBuilderService } from './curl-builder.service';

describe('CurlBuilderService', () => {
  let service: CurlBuilderService;

  beforeEach(() => {
    service = new CurlBuilderService();
  });

  it('escapes single quotes in url, headers, and body', () => {
    const actualCurl: string = service.buildCurl({
      method: 'POST',
      url: "https://example.com/it's",
      headers: {
        "x-test": "O'Reilly",
      },
      queryParams: {},
      body: "hi ' there",
    });

    expect(actualCurl).toContain("curl 'https://example.com/it'\"'\"'s'");
    expect(actualCurl).toContain("-H 'x-test: O'\"'\"'Reilly'");
    expect(actualCurl).toContain("--data-raw 'hi '\"'\"' there'");
  });

  it('omits accept-encoding and pseudo headers', () => {
    const actualCurl: string = service.buildCurl({
      method: 'GET',
      url: 'https://example.com',
      headers: {
        'accept-encoding': 'gzip',
        ':authority': 'example.com',
        ':method': 'GET',
        'x-keep': '1',
      },
      queryParams: {},
    });

    expect(actualCurl).not.toContain('accept-encoding');
    expect(actualCurl).not.toContain(':authority');
    expect(actualCurl).toContain("-H 'x-keep: 1'");
  });
});

