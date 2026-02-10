import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { LlmService } from './llm.service';
import { RedactionService } from './redaction.service';

@Module({
  imports: [SharedModule],
  providers: [LlmService, RedactionService],
  exports: [LlmService],
})
export class LlmModule {}
