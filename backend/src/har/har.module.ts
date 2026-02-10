import { Module } from '@nestjs/common';
import { HarController } from './har.controller';
import { HarParserService } from './har-parser.service';
import { HarFilterService } from './har-filter.service';
import { SharedModule } from '../shared/shared.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [SharedModule, LlmModule],
  controllers: [HarController],
  providers: [HarParserService, HarFilterService],
})
export class HarModule {}
