import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CurlController } from './curl.controller';
import { CurlExecutorService } from './curl-executor.service';

@Module({
  imports: [SharedModule],
  controllers: [CurlController],
  providers: [CurlExecutorService],
})
export class CurlModule {}

