import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole, ServerType } from '@prisma/client';
import { ModelServerService } from '../services/model-server.service';

@ApiTags('admin/servers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('api/admin/servers')
export class ModelServerController {
  constructor(private readonly service: ModelServerService) {}

  @Get()
  @ApiOperation({ summary: 'Get all model servers' })
  findAll() {
    return this.service.findAll();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check health of all active servers' })
  checkAllHealth() {
    return this.service.checkAllHealth();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Check server health' })
  checkHealth(@Param('id') id: string) {
    return this.service.checkHealth(id);
  }

  @Get(':id/models')
  @ApiOperation({ summary: 'Scan Ollama models' })
  scanModels(@Param('id') id: string) {
    return this.service.scanOllamaModels(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create model server' })
  create(@Body() data: {
    name: string;
    type: ServerType;
    url: string;
    maxTokens?: number;
    device?: string;
    routingWeight?: number;
    rateLimit?: number;
  }) {
    return this.service.create(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update model server' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete model server' })
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
