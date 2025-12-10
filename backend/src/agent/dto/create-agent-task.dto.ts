import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from '@prisma/client';

export class CreateAgentTaskDto {
  @ApiProperty({ enum: AgentType })
  @IsEnum(AgentType)
  type: AgentType;

  @ApiProperty({ description: 'Natural language prompt' })
  @IsString()
  prompt: string;

  @ApiProperty({ description: 'Project ID' })
  @IsString()
  projectId: string;

  @ApiProperty({ required: false, description: 'Context object' })
  @IsOptional()
  @IsObject()
  context?: object;

  @ApiProperty({ required: false, default: 1, minimum: 0, maximum: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  priority?: number;

  @ApiProperty({ required: false, description: 'Task group ID for batch operations' })
  @IsOptional()
  @IsString()
  groupId?: string;
}
