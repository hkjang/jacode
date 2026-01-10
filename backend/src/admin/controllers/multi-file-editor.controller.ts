import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MultiFileEditorService } from '../../ai/services/multi-file-editor.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class PlanChangesDto {
  projectId: string;
  userRequest: string;
}

export class ExecuteChangesDto {
  projectId: string;
  task: any; // MultiFileTask
}

export class EditMultipleFilesDto {
  projectId: string;
  userRequest: string;
}

@Controller('api/admin/multi-file-editor')
@UseGuards(JwtAuthGuard)
export class MultiFileEditorController {
  constructor(private readonly multiFileEditor: MultiFileEditorService) {}

  /**
   * Plan multi-file changes
   */
  @Post('plan')
  async plan(@Body() dto: PlanChangesDto) {
    return this.multiFileEditor.planChanges(dto.projectId, dto.userRequest);
  }

  /**
   * Execute planned changes
   */
  @Post('execute')
  async execute(@Body() dto: ExecuteChangesDto) {
    return this.multiFileEditor.executeChanges(dto.projectId, dto.task);
  }

  /**
   * Plan and execute in one call
   */
  @Post('edit')
  async edit(@Body() dto: EditMultipleFilesDto) {
    return this.multiFileEditor.editMultipleFiles(dto.projectId, dto.userRequest);
  }
}
