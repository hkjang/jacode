import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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

@Module({
  imports: [ScheduleModule.forRoot()],
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
  ],
})
export class AdminModule {}
