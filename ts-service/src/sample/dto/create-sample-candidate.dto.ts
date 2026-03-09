import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSampleCandidateDto {
  @ApiProperty({
    description: 'Full name of the candidate',
    example: 'John Doe',
    minLength: 2,
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({
    description: 'Email address of the candidate',
    example: 'john.doe@example.com',
    required: false,
    maxLength: 160,
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;
}
