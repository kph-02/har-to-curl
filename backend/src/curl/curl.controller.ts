import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { SsrfGuard } from '../shared/guards/ssrf.guard';
import { CurlExecutorService } from './curl-executor.service';
import { ExecuteCurlDto } from './dto/execute-curl.dto';
import { CurlResult } from '../shared/models/curl-result.model';

@Controller('curl')
export class CurlController {
  constructor(private readonly executor: CurlExecutorService) {}

  /**
   * POST /curl/execute
   * Execute an HTTP request server-side with SSRF protection.
   */
  @Post('execute')
  @UseGuards(SsrfGuard)
  async executeCurl(@Body() body: ExecuteCurlDto): Promise<CurlResult> {
    return await this.executor.executeRequest(body);
  }
}

