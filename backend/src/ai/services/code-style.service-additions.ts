import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CodeStyleService {
  // ... existing code ...

  /**
   * Get all presets
   */
  async getAllPresets() {
    return this.prisma.codeStylePreset.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get preset by ID
   */
  async getPresetById(id: string) {
    return this.prisma.codeStylePreset.findUnique({
      where: { id },
    });
  }

  /**
   * Get presets by language
   */
  async getPresetsByLanguage(language: string) {
    return this.prisma.codeStylePreset.findMany({
      where: { language },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update preset
   */
  async updatePreset(id: string, data: any) {
    return this.prisma.codeStylePreset.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete preset
   */
  async deletePreset(id: string) {
    return this.prisma.codeStylePreset.delete({
      where: { id },
    });
  }
}
