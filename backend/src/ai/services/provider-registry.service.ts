import { Injectable, Logger } from '@nestjs/common';
import { IAIProvider, ProviderConfig, ProviderMetrics } from '../interfaces/ai-provider.interface';

@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);
  private providers = new Map<string, IAIProvider>();
  private metrics = new Map<string, ProviderMetrics>();

  /**
   * Register a provider
   */
  registerProvider(provider: IAIProvider): void {
    this.providers.set(provider.name, provider);
    this.logger.log(`Provider registered: ${provider.name} (${provider.type})`);
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): IAIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Provider ${name} not found. Available: ${Array.from(this.providers.keys()).join(', ')}`);
    }
    return provider;
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IAIProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: string): IAIProvider[] {
    return Array.from(this.providers.values()).filter(p => p.type === type);
  }

  /**
   * Check if provider exists
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(name: string): boolean {
    const removed = this.providers.delete(name);
    if (removed) {
      this.metrics.delete(name);
      this.logger.log(`Provider unregistered: ${name}`);
    }
    return removed;
  }

  /**
   * Update provider metrics
   */
  updateMetrics(providerName: string, metrics: ProviderMetrics): void {
    this.metrics.set(providerName, metrics);
  }

  /**
   * Get provider metrics
   */
  getMetrics(providerName: string): ProviderMetrics | undefined {
    return this.metrics.get(providerName);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, ProviderMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Dynamically load and register a provider plugin
   */
  async loadProviderPlugin(pluginPath: string, config: ProviderConfig): Promise<void> {
    try {
      const ProviderClass = await import(pluginPath);
      const provider = new ProviderClass.default() as IAIProvider;
      
      await provider.initialize(config);
      this.registerProvider(provider);
      
      this.logger.log(`Plugin loaded: ${pluginPath}`);
    } catch (error) {
      this.logger.error(`Failed to load provider plugin from ${pluginPath}`, error);
      throw error;
    }
  }

  /**
   * Health check for all providers
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const healthMap = new Map<string, boolean>();

    const checks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const healthy = await provider.checkHealth();
        healthMap.set(name, healthy);
      } catch (error) {
        this.logger.warn(`Health check failed for ${name}:`, error);
        healthMap.set(name, false);
      }
    });

    await Promise.all(checks);
    return healthMap;
  }
}
