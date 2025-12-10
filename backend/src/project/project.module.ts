import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { VersionService } from './version.service';
import { VersionController } from './version.controller';

@Module({
  providers: [ProjectService, VersionService],
  controllers: [ProjectController, VersionController],
  exports: [ProjectService, VersionService],
})
export class ProjectModule {}

