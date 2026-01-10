import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';

@Controller('api/admin/circuit-breaker')
@UseGuards(JwtAuthGuard)
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Get all circuit breakers
   */
  @Get()
  async getAll() {
    const states = this.circuitBreakerService.getAllStates();
    const result: any[] = [];
    
    // Add known important circuits if they don't exist yet (for visibility)
    // In a real app, these might be discovered dynamically or from config
    const knownCircuits = ['ollama-primary', 'vllm-backup'];
    for (const id of knownCircuits) {
      if (!states.has(id)) {
        // Just to show them in the list even if not triggered yet
        // The service will create them on demand, but we can't force create without triggering
        // For UI purposes, we'll only show active ones or we'd need a registry of all possible circuits
      }
    }

    states.forEach((metrics, key) => {
      result.push({
        resourceId: key,
        ...metrics,
      });
    });

    return result;
  }

  /**
   * Get circuit breaker configuration
   */
  @Get('config')
  async getConfig() {
    return this.circuitBreakerService.getConfig();
  }

  /**
   * Get circuit breaker by ID
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const metrics = this.circuitBreakerService.getMetrics(id);
    return { resourceId: id, ...metrics };
  }

  /**
   * Reset circuit breaker
   */
  @Post(':id/reset')
  async reset(@Param('id') id: string) {
    this.circuitBreakerService.reset(id);
    return { success: true, id };
  }

  /**
   * Force open circuit breaker
   */
  @Post(':id/force-open')
  async forceOpen(@Param('id') id: string) {
    this.circuitBreakerService.forceOpen(id);
    return { success: true, id, state: 'OPEN' };
  }

  /**
   * Force close circuit breaker
   */
  @Post(':id/force-close')
  async forceClose(@Param('id') id: string) {
    this.circuitBreakerService.forceClose(id);
    return { success: true, id, state: 'CLOSED' };
  }

  /**
   * Reset all circuit breakers
   */
  @Post('reset-all')
  async resetAll() {
    // Ideally the service should support this, or we iterate current keys
    // For now, we'll just reset known ones from the current state
    const states = this.circuitBreakerService.getAllStates();
    for (const id of states.keys()) {
      this.circuitBreakerService.reset(id);
    }
    return { success: true, message: 'All active circuit breakers reset' };
  }

  /**
   * Get statistics
   */
  @Get('stats/summary')
  async getStatistics() {
    const states = this.circuitBreakerService.getAllStates();
    let closed = 0, open = 0, halfOpen = 0;
    
    states.forEach((cb) => {
      if (cb.state === 'CLOSED') closed++;
      else if (cb.state === 'OPEN') open++;
      else halfOpen++;
    });

    return {
      total: states.size,
      closed,
      open,
      halfOpen,
    };
  }
}
