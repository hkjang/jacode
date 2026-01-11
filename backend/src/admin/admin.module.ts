import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { FeatureToggleModule } from './feature-toggle.module';

// Services
import {
  ModelServerService,
  PromptTemplateService,
  AnalyticsService,
  LogService,
  TeamService,
  SystemSettingsService,
  UsageAggregationService,
  CostAlertService,
} from './services';

import { HealthCheckService } from './services/health-check.service';
import { CleanupService } from './services/cleanup.service';
import { AuditLogService } from './services/audit-log.service';
import { SettingsHistoryService } from './services/settings-history.service';
import { BackupService } from './services/backup.service';
import { QueueManagementService } from './services/queue-management.service';
import { MonitoringService } from './services/monitoring.service';

// Controllers
import {
  ModelServerController,
  PromptTemplateController,
  AnalyticsController,
  LogController,
  TeamController,
  SystemSettingsController,
} from './controllers';
import { AuditController } from './controllers/audit.controller';
import { BackupController } from './controllers/backup.controller';
import { QueueController } from './controllers/queue.controller';
import { CostAlertController } from './controllers/cost-alert.controller';
import { MonitoringController } from './controllers/monitoring.controller';
import { CodeStyleController } from './controllers/code-style.controller';
import { QuotaController } from './controllers/quota.controller';
import { RoutingPolicyController } from './controllers/routing-policy.controller';
import { AutoRefactoringController } from './controllers/auto-refactoring.controller';
import { MultiFileEditorController } from './controllers/multi-file-editor.controller';
import { BatchProcessingController } from './controllers/batch-processing.controller';
import { CacheController } from './controllers/cache.controller';
import { AIProviderController } from './controllers/ai-provider.controller';
import { PromptVersionController } from './controllers/prompt-version.controller';
import { ConfigBackupController } from './controllers/config-backup.controller';
import { CircuitBreakerController } from './controllers/circuit-breaker.controller';
import { ChatHistoryController } from './controllers/chat-history.controller';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: 'agent-tasks' }),
    AIModule,
    FeatureToggleModule,
  ],
  controllers: [
    AdminController,
    ModelServerController,
    PromptTemplateController,
    AnalyticsController,
    LogController,
    TeamController,
    SystemSettingsController,
    AuditController,
    BackupController,
    QueueController,
    CostAlertController,
    MonitoringController,
    CodeStyleController,
    QuotaController,
    RoutingPolicyController,
    AutoRefactoringController,
    MultiFileEditorController,
    BatchProcessingController,
    CacheController,
    AIProviderController,
    PromptVersionController,
    ConfigBackupController,
    CircuitBreakerController,
    ChatHistoryController,
  ],
  providers: [
    ModelServerService,
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
    UsageAggregationService,
    CostAlertService,
    MonitoringService,
  ],
  exports: [
    ModelServerService,
    FeatureToggleModule,
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
    UsageAggregationService,
    CostAlertService,
  ],
})
export class AdminModule {}

