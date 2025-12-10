import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeatureToggleService {
  private readonly logger = new Logger(FeatureToggleService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD ====================

  async findAll() {
    return this.prisma.featureToggle.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async findByKey(key: string) {
    return this.prisma.featureToggle.findUnique({
      where: { key },
    });
  }

  async isEnabled(key: string): Promise<boolean> {
    const feature = await this.findByKey(key);
    return feature?.isEnabled ?? false;
  }

  async toggle(key: string, isEnabled: boolean) {
    return this.prisma.featureToggle.update({
      where: { key },
      data: { isEnabled },
    });
  }

  async updateSettings(key: string, settings: object) {
    return this.prisma.featureToggle.update({
      where: { key },
      data: { settings },
    });
  }

  async create(data: {
    key: string;
    name: string;
    description?: string;
    isEnabled?: boolean;
    settings?: object;
  }) {
    return this.prisma.featureToggle.create({
      data: {
        ...data,
        settings: data.settings || {},
      },
    });
  }

  // ==================== Batch Operations ====================

  async toggleMultiple(updates: { key: string; isEnabled: boolean }[]) {
    return this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.featureToggle.update({
          where: { key: u.key },
          data: { isEnabled: u.isEnabled },
        })
      )
    );
  }

  async getEnabledFeatures(): Promise<string[]> {
    const features = await this.prisma.featureToggle.findMany({
      where: { isEnabled: true },
      select: { key: true },
    });
    return features.map((f) => f.key);
  }

  // ==================== Initialize Default Features ====================

  async initializeDefaults() {
    const defaults = [
      { key: 'smart_context', name: 'Smart Context Injection', description: '자동 문맥 확장 적용' },
      { key: 'patch_generation', name: 'Patch Generation', description: '기존 코드와 diff 기반 패치 생성' },
      { key: 'inline_explain', name: 'Inline Explain', description: '코드에 대한 설명 삽입' },
      { key: 'auto_fix', name: 'Auto Fix', description: '모델 기반 자동 오류 수정' },
      { key: 'code_security_filter', name: 'Code Security Filter', description: '위험한 코드 차단' },
      { key: 'code_review', name: 'Code Review', description: 'AI 코드 리뷰 기능' },
    ];

    for (const feature of defaults) {
      await this.prisma.featureToggle.upsert({
        where: { key: feature.key },
        update: {},
        create: { ...feature, isEnabled: true, settings: {} },
      });
    }

    this.logger.log('Default feature toggles initialized');
  }
}
