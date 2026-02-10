import { IsNotEmpty } from 'class-validator';

/**
 * DTO for HAR file upload validation
 * Note: File validation happens in the controller with Multer
 */
export class UploadHarDto {
  @IsNotEmpty({ message: 'No file was uploaded. Please select a .har file.' })
  file: any;
}
