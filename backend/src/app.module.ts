import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { SharedModule } from './shared/shared.module';
import { AppConfig } from './shared/config/app.config';

@Module({
  imports: [
    SharedModule,
    ThrottlerModule.forRoot([
      {
        ttl: AppConfig.throttle.ttl * 1000, // Convert to milliseconds
        limit: AppConfig.throttle.limit,
      },
    ]),
    // Feature modules will be imported here
  ],
})
export class AppModule {}
