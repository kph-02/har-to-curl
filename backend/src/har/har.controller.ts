import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  PayloadTooLargeException,
  Param,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v4 as uuidv4 } from 'uuid';
import { HarParserService } from './har-parser.service';
import { HarFilterService } from './har-filter.service';
import { SessionStoreService } from '../shared/session-store.service';
import { AppConfig } from '../shared/config/app.config';
import { HarEntrySummary } from '../shared/models/har-entry.model';

@Controller('har')
export class HarController {
  constructor(
    private readonly parserService: HarParserService,
    private readonly filterService: HarFilterService,
    private readonly sessionStore: SessionStoreService,
  ) {}

  /**
   * POST /har/upload
   * Upload and parse a .har file
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: AppConfig.har.maxSizeMB * 1024 * 1024, // Convert MB to bytes
      },
    }),
  )
  uploadHar(
    @UploadedFile() file: Express.Multer.File,
  ): { sessionId: string; entries: HarEntrySummary[] } {
    // Validate file was provided
    if (!file) {
      throw new BadRequestException(
        'No file was uploaded. Please select a .har file.',
      );
    }

    // Validate file extension
    if (!file.originalname.toLowerCase().endsWith('.har')) {
      throw new BadRequestException(
        'Only .har files are supported. Please export from your browser\'s DevTools.',
      );
    }

    // Check file size (Multer should catch this, but double-check)
    const maxBytes = AppConfig.har.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new PayloadTooLargeException(
        `This file is too large (max ${AppConfig.har.maxSizeMB} MB). Please use a shorter recording.`,
      );
    }

    // Parse HAR structure
    const rawEntries = this.parserService.parse(file.buffer);

    // Filter entries
    const { entries, summaries } = this.filterService.filter(rawEntries);

    // Generate session ID and store full entries
    const sessionId = uuidv4();
    this.sessionStore.set(sessionId, entries);

    // Return session ID and lightweight summaries
    return { sessionId, entries: summaries };
  }

  /**
   * GET /har/sessions/:sessionId/entries/:index
   * Get full entry details for inspection
   */
  @Get('sessions/:sessionId/entries/:index')
  getEntry(
    @Param('sessionId') sessionId: string,
    @Param('index', ParseIntPipe) index: number,
  ) {
    // Validate session exists
    const entries = this.sessionStore.get(sessionId);
    if (!entries) {
      throw new NotFoundException(
        'Your session has expired. Please re-upload your .har file.',
      );
    }

    // Validate index is in range
    if (index < 0 || index >= entries.length) {
      throw new BadRequestException(
        'One or more selected entries are invalid. Please refresh and try again.',
      );
    }

    // Return full entry
    return entries[index];
  }
}
