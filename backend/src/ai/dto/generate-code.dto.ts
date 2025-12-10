import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateCodeDto {
  @ApiProperty({ description: 'Natural language prompt for code generation' })
  @IsString()
  prompt: string;

  @ApiProperty({ required: false, description: 'Additional context (existing code, etc.)' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiProperty({ required: false, description: 'Target programming language' })
  @IsOptional()
  @IsString()
  language?: string;
}
