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

  // ==================== Basic CRUD ====================

  @Get()
  @ApiOperation({ summary: 'Get all model servers' })
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get active servers only' })
  findActive() {
    return this.service.findActive();
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Get servers by type' })
  findByType(@Param('type') type: ServerType) {
    return this.service.findByType(type);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get global server statistics' })
  getGlobalStatistics() {
    return this.service.getGlobalStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get server by ID' })
  findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/statistics')
  @ApiOperation({ summary: 'Get server statistics' })
  getStatistics(@Param('id') id: string) {
    return this.service.getServerStatistics(id);
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

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate server' })
  duplicate(@Param('id') id: string) {
    return this.service.duplicate(id);
  }

  // ==================== Bulk Operations ====================

  @Post('bulk/create')
  @ApiOperation({ summary: 'Bulk create servers' })
  bulkCreate(@Body() data: { servers: Array<{ name: string; type: ServerType; url: string }> }) {
    return this.service.bulkCreate(data.servers);
  }

  @Delete('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete servers' })
  bulkDelete(@Body() data: { ids: string[] }) {
    return this.service.bulkDelete(data.ids);
  }

  @Patch('bulk/toggle')
  @ApiOperation({ summary: 'Bulk toggle servers' })
  bulkToggle(@Body() data: { ids: string[]; isActive: boolean }) {
    return this.service.bulkToggle(data.ids, data.isActive);
  }

  // ==================== Health Check ====================

  @Get('health')
  @ApiOperation({ summary: 'Check health of all active servers' })
  checkAllHealth() {
    return this.service.checkAllHealth();
  }

  @Get(':id/health')
  @ApiOperation({ summary: 'Check server health' })
  checkHealth(@Param('id') id: string) {
    return this.service.checkHealth(id);
  }

  @Post('test-connection')
  @ApiOperation({ summary: 'Test connection to URL' })
  testConnection(@Body() data: { url: string; type: ServerType }) {
    return this.service.testConnection(data.url, data.type);
  }

  // ==================== Ollama Model Management ====================

  @Get(':id/models')
  @ApiOperation({ summary: 'Scan available models' })
  scanModels(@Param('id') id: string) {
    return this.service.scanOllamaModels(id);
  }

  @Get(':id/models/:modelName')
  @ApiOperation({ summary: 'Get model info' })
  getModelInfo(@Param('id') id: string, @Param('modelName') modelName: string) {
    return this.service.getOllamaModelInfo(id, modelName);
  }

  @Post(':id/models/pull')
  @ApiOperation({ summary: 'Pull a model' })
  pullModel(@Param('id') id: string, @Body() data: { modelName: string }) {
    return this.service.pullOllamaModel(id, data.modelName);
  }

  @Delete(':id/models/:modelName')
  @ApiOperation({ summary: 'Delete a model' })
  deleteModel(@Param('id') id: string, @Param('modelName') modelName: string) {
    return this.service.deleteOllamaModel(id, modelName);
  }
}

