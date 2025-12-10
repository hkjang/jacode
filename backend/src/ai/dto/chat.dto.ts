import { IsArray, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class MessageDto {
  @ApiProperty({ enum: ['system', 'user', 'assistant'] })
  role: 'system' | 'user' | 'assistant';

  @ApiProperty()
  content: string;
}

class ChatOptionsDto {
  @ApiProperty({ required: false })
  model?: string;

  @ApiProperty({ required: false })
  temperature?: number;

  @ApiProperty({ required: false })
  maxTokens?: number;

  @ApiProperty({ required: false })
  topP?: number;
}

export class ChatDto {
  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  options?: ChatOptionsDto;
}
