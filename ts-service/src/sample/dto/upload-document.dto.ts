import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type of document (e.g., resume, cover_letter, transcript)',
    example: 'resume',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  documentType!: string;

  @ApiProperty({
    description: 'Original filename of the document',
    example: 'john_doe_resume.pdf',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'Extracted text content from the document',
    example: 'John Doe\nSoftware Engineer\n\nEXPERIENCE:\nSenior Software Engineer at Tech Corp...',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  rawText!: string;
}
