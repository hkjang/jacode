import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';

@Controller('api/admin/circuit-breaker')
@UseGuards(JwtAuthGuard)
export class CircuitBreakerController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  /**
   * Get all circuit breakers (including known circuits)
   */
  @Get()
  async getAll() {
    const states = this.circuitBreakerService.getAllStates();
    const result: any[] = [];
    
    // Known circuits - always show these even if not triggered yet
    const knownCircuits = [
      { id: 'ollama-primary', provider: 'ollama', label: 'Ollama Primary' },
      { id: 'vllm-primary', provider: 'vllm', label: 'vLLM Primary' },
    ];
    
    for (const circuit of knownCircuits) {
      const metrics = this.circuitBreakerService.getMetrics(circuit.id);
      result.push({
        resourceId: circuit.id,
        provider: circuit.provider,
        label: circuit.label,
        ...metrics,
        failureRate: this.circuitBreakerService.getFailureRate(circuit.id),
      });
    }
    
    // Add any additional dynamic circuits not in the known list
    states.forEach((metrics, key) => {
      if (!knownCircuits.some(kc => kc.id === key)) {
        result.push({
          resourceId: key,
          provider: 'unknown',
          label: key,
          ...metrics,
          failureRate: this.circuitBreakerService.getFailureRate(key),
        });
      }
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
