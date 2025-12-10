import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';

// Services
import {
  ModelServerService,
  FeatureToggleService,
  PromptTemplateService,
  AnalyticsService,
  LogService,
  TeamService,
  SystemSettingsService,
} from './services';

import { HealthCheckService } from './services/health-check.service';
import { CleanupService } from './services/cleanup.service';
import { AuditLogService } from './services/audit-log.service';
import { SettingsHistoryService } from './services/settings-history.service';
import { BackupService } from './services/backup.service';
import { QueueManagementService } from './services/queue-management.service';

// Controllers
import {
  ModelServerController,
  PromptTemplateController,
  FeatureToggleController,
  AnalyticsController,
  LogController,
  TeamController,
  SystemSettingsController,
} from './controllers';
import { AuditController } from './controllers/audit.controller';
import { BackupController } from './controllers/backup.controller';
import { QueueController } from './controllers/queue.controller';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'agent-tasks' }),
  ],
  controllers: [
    AdminController,
    ModelServerController,
    PromptTemplateController,
    FeatureToggleController,
    AnalyticsController,
    LogController,
    TeamController,
    SystemSettingsController,
    AuditController,
    BackupController,
    QueueController,
  ],
  providers: [
    ModelServerService,
    FeatureToggleService,
    PromptTemplateService,
    AnalyticsService,
    LogService,
    TeamService,
    SystemSettingsService,
    HealthCheckService,
    CleanupService,
    AuditLogService,
    SettingsHistoryService,
    BackupService,
    QueueManagementService,
  ],
  exports: [
    ModelServerService,
    FeatureToggleService,
    PromptTemplateService,
    AnalyticsService,
    LogService,
    TeamService,
    SystemSettingsService,
    HealthCheckService,
    CleanupService,
    AuditLogService,
    SettingsHistoryService,
    BackupService,
    QueueManagementService,
  ],
})
export class AdminModule {}
