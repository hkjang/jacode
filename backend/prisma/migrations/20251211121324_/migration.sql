-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ServerType" AS ENUM ('VLLM', 'OLLAMA');

-- CreateEnum
CREATE TYPE "ServerStatus" AS ENUM ('ONLINE', 'OFFLINE', 'DEGRADED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PromptType" AS ENUM ('SYSTEM', 'CODE_GENERATION', 'CODE_REVIEW', 'BUG_FIX', 'REFACTORING', 'DOCUMENTATION', 'CUSTOM');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL');

-- CreateEnum
CREATE TYPE "AggregationPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CostAlertType" AS ENUM ('TOKEN_LIMIT', 'COST_LIMIT', 'RATE_LIMIT');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'EDITOR';

-- DropIndex
DROP INDEX "agent_tasks_status_idx";

-- DropIndex
DROP INDEX "agent_tasks_userId_idx";

-- DropIndex
DROP INDEX "artifacts_type_idx";

-- DropIndex
DROP INDEX "knowledge_entries_userId_idx";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "teamId" TEXT;

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "usageLimit" INTEGER NOT NULL DEFAULT 10000,
    "currentUsage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_servers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ServerType" NOT NULL,
    "url" TEXT NOT NULL,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "device" TEXT NOT NULL DEFAULT 'auto',
    "status" "ServerStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastHealthCheck" TIMESTAMP(3),
    "routingWeight" INTEGER NOT NULL DEFAULT 100,
    "rateLimit" INTEGER NOT NULL DEFAULT 100,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_toggles" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_toggles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "PromptType" NOT NULL,
    "description" TEXT,
    "content" TEXT NOT NULL,
    "variables" TEXT[],
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prompt_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_template_versions" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "changeLog" TEXT,
    "templateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_template_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "responseTimeMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT,
    "resourceId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "category" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stackTrace" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminName" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "before" JSONB,
    "after" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings_history" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "oldValue" JSONB NOT NULL,
    "newValue" JSONB NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedByEmail" TEXT NOT NULL,
    "changedByName" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_aggregations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "period" "AggregationPeriod" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "modelBreakdown" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_aggregations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "name" TEXT NOT NULL,
    "type" "CostAlertType" NOT NULL,
    "threshold" DECIMAL(10,2) NOT NULL,
    "period" "AggregationPeriod" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "notificationChannels" TEXT[] DEFAULT ARRAY['email', 'inapp']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "model_servers_name_key" ON "model_servers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feature_toggles_key_key" ON "feature_toggles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_templates_name_key" ON "prompt_templates"("name");

-- CreateIndex
CREATE INDEX "prompt_template_versions_templateId_idx" ON "prompt_template_versions"("templateId");

-- CreateIndex
CREATE INDEX "usage_logs_userId_idx" ON "usage_logs"("userId");

-- CreateIndex
CREATE INDEX "usage_logs_createdAt_idx" ON "usage_logs"("createdAt");

-- CreateIndex
CREATE INDEX "usage_logs_modelName_idx" ON "usage_logs"("modelName");

-- CreateIndex
CREATE INDEX "usage_logs_feature_idx" ON "usage_logs"("feature");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "system_logs_level_idx" ON "system_logs"("level");

-- CreateIndex
CREATE INDEX "system_logs_category_idx" ON "system_logs"("category");

-- CreateIndex
CREATE INDEX "system_logs_createdAt_idx" ON "system_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX "system_settings_category_idx" ON "system_settings"("category");

-- CreateIndex
CREATE INDEX "admin_audit_logs_adminId_idx" ON "admin_audit_logs"("adminId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- CreateIndex
CREATE INDEX "admin_audit_logs_resource_idx" ON "admin_audit_logs"("resource");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "settings_history_key_idx" ON "settings_history"("key");

-- CreateIndex
CREATE INDEX "settings_history_category_idx" ON "settings_history"("category");

-- CreateIndex
CREATE INDEX "settings_history_changedById_idx" ON "settings_history"("changedById");

-- CreateIndex
CREATE INDEX "settings_history_createdAt_idx" ON "settings_history"("createdAt");

-- CreateIndex
CREATE INDEX "usage_aggregations_userId_periodStart_idx" ON "usage_aggregations"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "usage_aggregations_teamId_periodStart_idx" ON "usage_aggregations"("teamId", "periodStart");

-- CreateIndex
CREATE INDEX "usage_aggregations_periodStart_idx" ON "usage_aggregations"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "usage_aggregations_userId_period_periodStart_key" ON "usage_aggregations"("userId", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "usage_aggregations_teamId_period_periodStart_key" ON "usage_aggregations"("teamId", "period", "periodStart");

-- CreateIndex
CREATE INDEX "cost_alerts_userId_idx" ON "cost_alerts"("userId");

-- CreateIndex
CREATE INDEX "cost_alerts_teamId_idx" ON "cost_alerts"("teamId");

-- CreateIndex
CREATE INDEX "cost_alerts_isEnabled_idx" ON "cost_alerts"("isEnabled");

-- CreateIndex
CREATE INDEX "agent_tasks_userId_status_idx" ON "agent_tasks"("userId", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_userId_status_createdAt_idx" ON "agent_tasks"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "agent_tasks_projectId_status_idx" ON "agent_tasks"("projectId", "status");

-- CreateIndex
CREATE INDEX "agent_tasks_status_priority_idx" ON "agent_tasks"("status", "priority");

-- CreateIndex
CREATE INDEX "agent_tasks_status_createdAt_idx" ON "agent_tasks"("status", "createdAt");

-- CreateIndex
CREATE INDEX "artifacts_type_status_idx" ON "artifacts"("type", "status");

-- CreateIndex
CREATE INDEX "artifacts_agentTaskId_type_idx" ON "artifacts"("agentTaskId", "type");

-- CreateIndex
CREATE INDEX "artifacts_status_createdAt_idx" ON "artifacts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "file_versions_fileId_version_idx" ON "file_versions"("fileId", "version");

-- CreateIndex
CREATE INDEX "file_versions_fileId_createdAt_idx" ON "file_versions"("fileId", "createdAt");

-- CreateIndex
CREATE INDEX "files_projectId_isDirectory_idx" ON "files"("projectId", "isDirectory");

-- CreateIndex
CREATE INDEX "files_projectId_extension_idx" ON "files"("projectId", "extension");

-- CreateIndex
CREATE INDEX "files_projectId_updatedAt_idx" ON "files"("projectId", "updatedAt");

-- CreateIndex
CREATE INDEX "knowledge_entries_userId_type_idx" ON "knowledge_entries"("userId", "type");

-- CreateIndex
CREATE INDEX "knowledge_entries_userId_type_language_idx" ON "knowledge_entries"("userId", "type", "language");

-- CreateIndex
CREATE INDEX "knowledge_entries_userId_updatedAt_idx" ON "knowledge_entries"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "knowledge_entries_type_language_usageCount_idx" ON "knowledge_entries"("type", "language", "usageCount");

-- CreateIndex
CREATE INDEX "project_snapshots_projectId_createdAt_idx" ON "project_snapshots"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "users_teamId_idx" ON "users"("teamId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_template_versions" ADD CONSTRAINT "prompt_template_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "prompt_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
