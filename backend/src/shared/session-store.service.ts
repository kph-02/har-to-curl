import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AppConfig } from './config/app.config';
import { HarEntry } from './models/har-entry.model';

interface SessionData {
  unredactedEntries: HarEntry[];
  createdAt: Date;
}

/**
 * In-memory session store for temporary HAR data
 * NOTE: Not suitable for horizontal scaling - use Redis in production
 */
@Injectable()
export class SessionStoreService {
  private readonly logger = new Logger(SessionStoreService.name);
  private readonly store = new Map<string, SessionData>();
  private readonly ttlMinutes = AppConfig.session.ttlMinutes;

  /**
   * Store unredacted HAR entries for a session
   */
  set(sessionId: string, entries: HarEntry[]): void {
    this.store.set(sessionId, {
      unredactedEntries: entries,
      createdAt: new Date(),
    });
    this.logger.log(`Session ${sessionId} created with ${entries.length} entries`);
  }

  /**
   * Retrieve unredacted HAR entries by session ID
   */
  get(sessionId: string): HarEntry[] | null {
    const session = this.store.get(sessionId);
    if (!session) {
      return null;
    }

    const ageMinutes =
      (Date.now() - session.createdAt.getTime()) / 1000 / 60;
    if (ageMinutes > this.ttlMinutes) {
      this.store.delete(sessionId);
      this.logger.warn(`Session ${sessionId} expired (age: ${ageMinutes.toFixed(1)}min)`);
      return null;
    }

    return session.unredactedEntries;
  }

  /**
   * Delete a session
   */
  delete(sessionId: string): void {
    this.store.delete(sessionId);
    this.logger.log(`Session ${sessionId} deleted`);
  }

  /**
   * Clean up expired sessions every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.store.entries()) {
      const ageMinutes = (now - session.createdAt.getTime()) / 1000 / 60;
      if (ageMinutes > this.ttlMinutes) {
        this.store.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired sessions`);
    }
  }
}
