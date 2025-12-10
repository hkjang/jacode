import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService {
  private readonly logger = new Logger(SystemSettingsService.name);

  constructor(private readonly prisma: PrismaService) {}

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

  async set(key: string, value: any, options?: { description?: string; category?: string }) {
    return this.prisma.systemSetting.upsert({
      where: { key },
      update: { value, ...options },
      create: { key, value, ...options },
    });
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

  async setMultiple(settings: { key: string; value: any }[], category?: string) {
    return this.prisma.$transaction(
      settings.map((s) =>
        this.prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value },
          create: { key: s.key, value: s.value, category },
        })
      )
    );
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

  async updateEditorPolicy(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `editor.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'editor');
  }

  // ==================== Queue Settings ====================

  async getQueueSettings() {
    return this.getByCategory('queue');
  }

  async updateQueueSettings(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `queue.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'queue');
  }

  // ==================== Model Settings ====================

  async getModelSettings() {
    return this.getByCategory('model');
  }

  async updateModelSettings(settings: Record<string, any>) {
    const updates = Object.entries(settings).map(([key, value]) => ({
      key: `model.${key}`,
      value,
    }));
    return this.setMultiple(updates, 'model');
  }
}
