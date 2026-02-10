import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { SessionStoreService } from './session-store.service';
import { SsrfGuard } from './guards/ssrf.guard';

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
  providers: [SessionStoreService, SsrfGuard],
  exports: [SessionStoreService, SsrfGuard],
})
export class SharedModule {}
