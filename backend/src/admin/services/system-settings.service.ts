import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ==================== Settings CRUD ====================

  async getAll(category?: string) {
    return this.prisma.systemSetting.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
  }

  async get(key: string) {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value;
  }

  async set(
    key: string,
    value: any,
    options?: { description?: string; category?: string },
    adminContext?: { id: string; email: string; name: string },
  ) {
    const output = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...options },
      create: { key, value, ...options },
    });

    if (adminContext) {
      await this.auditLogService.logUpdate(
        adminContext,
        'settings',
        key,
        null, // We don't have the old value easily available without an extra query, but that's acceptable for now or we can fetch it.
        value,
      );
    }

    return output;
  }

  async delete(key: string) {
    return this.prisma.systemSetting.delete({
      where: { key },
    });
  }

  // ==================== Category-based Operations ====================

  async getByCategory(category: string) {
    const settings = await this.prisma.systemSetting.findMany({
      where: { category },
    });

    return settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async setMultiple(
    settings: { key: string; value: any }[],
    category?: string,
    adminContext?: { id: string; email: string; name: string },
  ) {
    // Fetch old values for audit logging logic if we want perfect "before" state
    // For simplicity, we'll log the batch update.
    
    // Better strategy: Log each change or log the batch.
    // Let's do a transaction.
    
    const result = await this.prisma.$transaction(
      settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, category },
        })
      )
    );

    if (adminContext) {
      // Log the batch update
      // Since it's multiple keys, we can iterate and log or log as a "bulk" operation.
      // The AuditLogService is per-resource usually.
      // Let's log each one for clarity in the log viewer so we can see exactly what changed.
      for (const s of settings) {
         await this.auditLogService.logUpdate(
          adminContext,
          'settings',
          s.key,
          null, // undefined before state
          s.value,
        );
      }
    }

    return result;
  }

  // ==================== Default Settings ====================

  async initializeDefaults() {
    const defaults = [
      // Editor settings
      { key: 'editor.theme', value: 'vs-dark', category: 'editor', description: '기본 에디터 테마' },
      { key: 'editor.fontSize', value: 14, category: 'editor', description: '기본 폰트 크기' },
      { key: 'editor.tabSize', value: 2, category: 'editor', description: '탭 크기' },
      { key: 'editor.wordWrap', value: 'on', category: 'editor', description: '자동 줄바꿈' },
      { key: 'editor.minimap', value: true, category: 'editor', description: '미니맵 표시' },
      { key: 'editor.autoComplete', value: true, category: 'editor', description: '자동완성 활성화' },
      
      // Queue settings
      { key: 'queue.maxConcurrency', value: 5, category: 'queue', description: '최대 동시 작업 수' },
      { key: 'queue.retryAttempts', value: 3, category: 'queue', description: '재시도 횟수' },
      { key: 'queue.retryDelay', value: 5000, category: 'queue', description: '재시도 지연 (ms)' },
      { key: 'queue.jobTimeout', value: 300000, category: 'queue', description: '작업 타임아웃 (ms)' },
      
      // Model settings
      { key: 'model.defaultProvider', value: 'ollama', category: 'model', description: '기본 제공자' },
      { key: 'model.defaultModel', value: 'codellama:13b', category: 'model', description: '기본 모델' },
      { key: 'model.maxTokens', value: 4096, category: 'model', description: '최대 토큰 수' },
      { key: 'model.temperature', value: 0.7, category: 'model', description: '온도 설정' },
      
      // Security settings
      { key: 'security.rateLimit', value: 100, category: 'security', description: '분당 API 요청 제한' },
      { key: 'security.codeFilter', value: true, category: 'security', description: '위험 코드 필터' },
      { key: 'security.maxPromptLength', value: 10000, category: 'security', description: '최대 프롬프트 길이' },
    ];

    for (const setting of defaults) {
      await this.prisma.systemSetting.upsert({
        where: { key: setting.key },
        update: {},
        create: setting,
      });
    }

    this.logger.log('Default system settings initialized');
  }

  // ==================== Editor Policy ====================

  async getEditorPolicy() {
    return this.getByCategory('editor');
  }

  async updateEditorPolicy(settings: Record<string, any>, adminContext?: any) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `editor.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'editor', adminContext);
  }

  // ==================== Queue Settings ====================

  async getQueueSettings() {
    return this.getByCategory('queue');
  }

  async updateQueueSettings(settings: Record<string, any>, adminContext?: any) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `queue.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'queue', adminContext);
  }

  // ==================== Model Settings ====================

  async getModelSettings() {
    return this.getByCategory('model');
  }

  async updateModelSettings(settings: Record<string, any>, adminContext?: any) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `model.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'model', adminContext);
  }
}
