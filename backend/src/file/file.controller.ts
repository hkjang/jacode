import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { Express } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { FileService } from './file.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects/:projectId/files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new file or directory' })
  @ApiParam({ name: 'projectId', type: String })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateFileDto,
  ) {
    return this.fileService.create({ ...dto, projectId });
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get file tree for project' })
  @ApiParam({ name: 'projectId', type: String })
  async getFileTree(@Param('projectId') projectId: string) {
    return this.fileService.getFileTree(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file content (optionally with line range for large files)' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  async getContent(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Query('startLine') startLine?: string,
    @Query('endLine') endLine?: string,
  ) {
    if (startLine !== undefined && endLine !== undefined) {
      return this.fileService.getContentChunk(
        id,
        projectId,
        parseInt(startLine, 10),
        parseInt(endLine, 10),
      );
    }
    return this.fileService.getContent(id, projectId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.fileService.update(id, projectId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete file or directory' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.fileService.remove(id, projectId);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get file version history' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  async getVersions(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
  ) {
    return this.fileService.getVersions(id, projectId);
  }

  @Post(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore file to a specific version' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiParam({ name: 'versionId', type: String })
  async restoreVersion(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.fileService.restoreVersion(id, projectId, versionId);
  }
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload file' })
  @ApiParam({ name: 'projectId', type: String })
  async uploadFile(
    @Param('projectId') projectId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('parentPath') parentPath?: string,
  ) {
    return this.fileService.uploadFile(projectId, file, parentPath);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download file' })
  @ApiParam({ name: 'projectId', type: String })
  @ApiParam({ name: 'id', type: String })
  async downloadFile(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { name, content, mimeType } = await this.fileService.getDownloadData(id, projectId);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${name}"`,
    });

    return new StreamableFile(content);
  }
}
