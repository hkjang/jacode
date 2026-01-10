import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProviderRegistryService } from '../../ai/services/provider-registry.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

export class RegisterProviderDto {
  id: string;
  name: string;
  providerType: string;
  config: any;
}

@Controller('admin/ai-providers')
@UseGuards(JwtAuthGuard)
export class AIProviderController {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  /**
   * Get all registered providers
   */
  @Get()
  getAll() {
    return this.providerRegistry.getAllProviders();
  }

  /**
   * Get provider by ID
   */
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.providerRegistry.getProvider(id);
  }

  /**
   * Register new provider
   */
  @Post()
  async register(@Body() dto: RegisterProviderDto) {
    return this.providerRegistry.registerProvider(dto.id, dto as any);
  }

  /**
   * Unregister provider
   */
  @Delete(':id')
  unregister(@Param('id') id: string) {
    this.providerRegistry.unregisterProvider(id);
    return { message: `Provider ${id} unregistered` };
  }

  /**
   * Check provider health
   */
  @Get(':id/health')
  async checkHealth(@Param('id') id: string) {
    const provider = this.providerRegistry.getProvider(id);
    if (!provider) {
      return { error: 'Provider not found' };
    }
    return provider.healthCheck();
  }

  /**
   * Get provider metrics
   */
  @Get(':id/metrics')
  async getMetrics(@Param('id') id: string) {
    const provider = this.providerRegistry.getProvider(id);
    if (!provider) {
      return { error: 'Provider not found' };
    }
    return provider.getMetrics();
  }

  /**
   * Check all providers health
   */
  @Get('health/all')
  async checkAllHealth() {
    return this.providerRegistry.checkAllHealth();
  }

  /**
   * Get all healthy providers
   */
  @Get('status/healthy')
  getHealthyProviders() {
    return this.providerRegistry.getHealthyProviders();
  }
}
