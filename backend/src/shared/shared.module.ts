import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { SessionStoreService } from './session-store.service';
import { SsrfGuard } from './guards/ssrf.guard';
import { CurlBuilderService } from './services/curl-builder.service';

/**
 * Shared module with globally available services
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '..', '.env.secrets'),  // Load secrets first (higher priority)
        join(process.cwd(), '..', '.env'),          // Then general config
      ],
      ignoreEnvFile: false,
    }),
    ScheduleModule.forRoot(),
  ],
  providers: [SessionStoreService, SsrfGuard, CurlBuilderService],
  exports: [SessionStoreService, SsrfGuard, CurlBuilderService],
})
export class SharedModule {}
