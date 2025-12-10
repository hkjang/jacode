import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReviewCodeDto {
  @ApiProperty({ description: 'Code to review' })
  @IsString()
  code: string;

  @ApiProperty({ required: false, description: 'Programming language' })
  @IsOptional()
  @IsString()
  language?: string;
}
