-- CreateTable
CREATE TABLE "model_routing_policies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_routing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_style_presets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "conventions" TEXT NOT NULL,
    "teamId" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_style_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_work_snapshots" (
    "id" TEXT NOT NULL,
    "agentTaskId" TEXT NOT NULL,
    "stepName" TEXT NOT NULL,
    "beforeState" JSONB NOT NULL DEFAULT '{}',
    "afterState" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_work_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_executions" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "promptContent" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "qualityMetrics" JSONB NOT NULL DEFAULT '{}',
    "agentTaskId" TEXT,
    "executionTimeMs" INTEGER NOT NULL DEFAULT 0,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prompt_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_backups" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdBy" TEXT NOT NULL,
    "createdByEmail" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_backups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "model_routing_policies_name_key" ON "model_routing_policies"("name");

-- CreateIndex
CREATE INDEX "model_routing_policies_isActive_idx" ON "model_routing_policies"("isActive");

-- CreateIndex
CREATE INDEX "model_routing_policies_priority_idx" ON "model_routing_policies"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "code_style_presets_name_key" ON "code_style_presets"("name");

-- CreateIndex
CREATE INDEX "code_style_presets_language_idx" ON "code_style_presets"("language");

-- CreateIndex
CREATE INDEX "code_style_presets_teamId_idx" ON "code_style_presets"("teamId");

-- CreateIndex
CREATE INDEX "code_style_presets_isGlobal_idx" ON "code_style_presets"("isGlobal");

-- CreateIndex
CREATE INDEX "ai_work_snapshots_agentTaskId_idx" ON "ai_work_snapshots"("agentTaskId");

-- CreateIndex
CREATE INDEX "ai_work_snapshots_createdAt_idx" ON "ai_work_snapshots"("createdAt");

-- CreateIndex
CREATE INDEX "prompt_executions_agentTaskId_idx" ON "prompt_executions"("agentTaskId");

-- CreateIndex
CREATE INDEX "prompt_executions_confidenceScore_idx" ON "prompt_executions"("confidenceScore");

-- CreateIndex
CREATE INDEX "prompt_executions_modelName_idx" ON "prompt_executions"("modelName");

-- CreateIndex
CREATE INDEX "prompt_executions_createdAt_idx" ON "prompt_executions"("createdAt");

-- CreateIndex
CREATE INDEX "config_backups_category_idx" ON "config_backups"("category");

-- CreateIndex
CREATE INDEX "config_backups_createdAt_idx" ON "config_backups"("createdAt");

-- CreateIndex
CREATE INDEX "config_backups_createdBy_idx" ON "config_backups"("createdBy");
