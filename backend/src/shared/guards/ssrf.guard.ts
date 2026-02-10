import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

/**
 * Guard to prevent SSRF attacks by validating URLs
 * Blocks private IP ranges, localhost (in production), and suspicious patterns
 * 
 * DEVELOPMENT MODE: Allows localhost for local testing
 * PRODUCTION MODE: Blocks all private/internal networks
 * 
 * KNOWN LIMITATIONS (documented for reviewers):
 * - DNS rebinding: Cannot prevent time-of-check-time-of-use attacks
 * - Redirects: HTTP client must disable or re-validate redirects
 * - Production: Use network-level controls + application-level validation
 */
@Injectable()
export class SsrfGuard implements CanActivate {
  private readonly isDevelopmentOrTest =
    process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

  private readonly blockedPatterns = [
    // IPv4 private ranges
    /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0)/i,
    /^https?:\/\/(10\.\d+\.\d+\.\d+)/i,
    /^https?:\/\/(172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)/i,
    /^https?:\/\/(192\.168\.\d+\.\d+)/i,
    /^https?:\/\/(169\.254\.\d+\.\d+)/i, // Link-local
    
    // IPv6 private ranges
    /^https?:\/\/\[::1\]/i, // IPv6 loopback
    /^https?:\/\/\[::ffff:127\./i, // IPv4-mapped IPv6 loopback
    /^https?:\/\/\[fe80:/i, // IPv6 link-local
    /^https?:\/\/\[fc00:/i, // IPv6 unique local (private)
    /^https?:\/\/\[fd00:/i, // IPv6 unique local (private)
    
    // Encoded/obfuscated IPs
    /^https?:\/\/(0x[0-9a-f]+)/i, // Hex IP
    /^https?:\/\/(\d+)/i, // Integer IP
    
    // Known bypass domains that resolve to localhost
    /^https?:\/\/(.*\.)?localtest\.me/i,
    /^https?:\/\/(.*\.)?vcap\.me/i,
    /^https?:\/\/(.*\.)?lvh\.me/i,
  ];

  private readonly localhostPatterns = [
    /^https?:\/\/(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0)/i,
    /^https?:\/\/\[::1\]/i,
    /^https?:\/\/\[::ffff:127\./i,
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    let url = request.body?.url || request.query?.url;

    if (!url) {
      return true; // No URL to validate
    }

    // Whitelist only HTTP/HTTPS protocols
    if (!/^https?:\/\//i.test(url)) {
      throw new BadRequestException(
        'Only HTTP and HTTPS protocols are allowed',
      );
    }

    // Decode URL to prevent encoding bypass
    try {
      url = decodeURIComponent(url);
    } catch {
      throw new BadRequestException('Invalid URL encoding');
    }

    // In development mode, allow localhost for local testing
    if (this.isDevelopmentOrTest) {
      const isLocalhost = this.localhostPatterns.some(pattern => pattern.test(url));
      if (isLocalhost) {
        return true; // Allow localhost in development/test
      }
    }

    // Check against all blocked patterns
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(url)) {
        throw new ForbiddenException(
          'Invalid URL: requests to private/internal networks are not allowed',
        );
      }
    }

    return true;
  }
}
