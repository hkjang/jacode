import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AutoRefactoringAgent } from '../../ai/services/auto-refactoring.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class AnalyzeCodeDto {
  projectId: string;
  filePath: string;
}

export class ExecuteRefactoringDto {
  task: any; // RefactoringTask
}

export class RefactorFileDto {
  projectId: string;
  filePath: string;
}

@Controller('api/admin/auto-refactoring')
@UseGuards(JwtAuthGuard)
export class AutoRefactoringController {
  constructor(private readonly refactoringAgent: AutoRefactoringAgent) {}

  /**
   * Analyze code and get refactoring suggestions
   */
  @Post('analyze')
  async analyze(@Body() dto: AnalyzeCodeDto) {
    return this.refactoringAgent.analyzeCode(dto.projectId, dto.filePath);
  }

  /**
   * Execute specific refactoring task
   */
  @Post('execute')
  async execute(@Body() dto: ExecuteRefactoringDto) {
    return this.refactoringAgent.executeRefactoring(dto.task);
  }

  /**
   * Auto-refactor entire file
   */
  @Post('refactor-file')
  async refactorFile(@Body() dto: RefactorFileDto) {
    return this.refactoringAgent.refactorFile(dto.projectId, dto.filePath);
  }
}
