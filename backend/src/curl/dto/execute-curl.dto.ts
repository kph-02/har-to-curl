import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ParsedRequest } from '../../shared/models/parsed-request.model';

const MAX_METHOD_LENGTH: number = 16;
const MAX_URL_LENGTH: number = 8192;
const MAX_BODY_LENGTH: number = 1024 * 1024;

/**
 * DTO for executing an HTTP request server-side.
 * Uses the same shape as ParsedRequest, but adds validation.
 */
export class ExecuteCurlDto implements ParsedRequest {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_METHOD_LENGTH)
  method: string;

  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  @MaxLength(MAX_URL_LENGTH)
  url: string;

  @IsObject()
  headers: Record<string, string>;

  @IsObject()
  queryParams: Record<string, string>;

  @IsOptional()
  @IsString()
  @MaxLength(MAX_BODY_LENGTH)
  body?: string;
}

