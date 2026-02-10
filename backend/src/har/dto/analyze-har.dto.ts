import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ArrayUnique } from 'class-validator';

/**
 * DTO for analyzing a HAR session with an LLM.
 */
export class AnalyzeHarDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(0, { each: true })
  selectedIndices?: number[];
}
