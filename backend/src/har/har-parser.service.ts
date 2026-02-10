import { Injectable, BadRequestException } from '@nestjs/common';
import { HarEntry } from '../shared/models/har-entry.model';

/**
 * Parses and validates HAR 1.2 format files
 */
@Injectable()
export class HarParserService {
  /**
   * Parse raw HAR file buffer and validate structure
   * @throws BadRequestException if file is not valid HAR format
   */
  parse(buffer: Buffer): HarEntry[] {
    let parsed: any;

    // Step 1: Validate JSON
    try {
      const text = buffer.toString('utf8');
      parsed = JSON.parse(text);
    } catch (error) {
      throw new BadRequestException(
        'This file is not valid JSON. It may be corrupted -- try exporting a new .har file from your browser\'s DevTools.',
      );
    }

    // Step 2: Validate HAR structure
    if (!parsed.log) {
      throw new BadRequestException(
        'This file doesn\'t appear to be a HAR file. It must contain a `log` object with `entries`.',
      );
    }

    if (!Array.isArray(parsed.log.entries)) {
      throw new BadRequestException(
        'This file doesn\'t appear to be a HAR file. It must contain a `log` object with `entries`.',
      );
    }

    if (parsed.log.entries.length === 0) {
      throw new BadRequestException(
        'This HAR file contains no entries. Please use a recording with network activity.',
      );
    }

    // Return typed entries
    return parsed.log.entries as HarEntry[];
  }
}
