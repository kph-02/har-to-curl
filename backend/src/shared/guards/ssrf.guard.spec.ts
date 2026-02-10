import { ExecutionContext } from '@nestjs/common';
import { SsrfGuard } from './ssrf.guard';

const createContext = (url: string): ExecutionContext => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        body: { url },
        query: {},
      }),
    }),
  } as unknown as ExecutionContext;
};

describe('SsrfGuard', () => {
  const originalNodeEnv: string | undefined = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('blocks private IP targets with 403', () => {
    process.env.NODE_ENV = 'production';
    const guard = new SsrfGuard();
    expect(() => guard.canActivate(createContext('http://169.254.169.254/latest/meta-data'))).toThrow();
  });

  it('allows localhost in development', () => {
    process.env.NODE_ENV = 'development';
    const guard = new SsrfGuard();
    expect(guard.canActivate(createContext('http://127.0.0.1:1234/ok'))).toBe(true);
  });

  it('allows localhost in test', () => {
    process.env.NODE_ENV = 'test';
    const guard = new SsrfGuard();
    expect(guard.canActivate(createContext('http://127.0.0.1:1234/ok'))).toBe(true);
  });
});

