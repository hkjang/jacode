import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

// In-memory circuit breaker state for demo
const circuitBreakers = new Map<string, { 
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  successes: number;
  lastStateChange: Date;
}>();

@Controller('api/admin/circuit-breaker')
@UseGuards(JwtAuthGuard)
export class CircuitBreakerController {
  /**
   * Get all circuit breakers
   */
  @Get()
  async getAll() {
    const result: any[] = [];
    circuitBreakers.forEach((value, key) => {
      result.push({
        id: key,
        ...value,
      });
    });

    // Add some default ones if empty
    if (result.length === 0) {
      return [
        { id: 'ollama-primary', state: 'CLOSED', failures: 0, successes: 100, lastStateChange: new Date() },
        { id: 'vllm-backup', state: 'CLOSED', failures: 0, successes: 50, lastStateChange: new Date() },
      ];
    }

    return result;
  }

  /**
   * Get circuit breaker by ID
   */
  @Get(':id')
  async getOne(@Param('id') id: string) {
    const cb = circuitBreakers.get(id);
    if (cb) {
      return { id, ...cb };
    }
    return { id, state: 'CLOSED', failures: 0, successes: 0, lastStateChange: new Date() };
  }

  /**
   * Reset circuit breaker
   */
  @Post(':id/reset')
  async reset(@Param('id') id: string) {
    circuitBreakers.set(id, {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastStateChange: new Date(),
    });
    return { success: true, id };
  }

  /**
   * Force open circuit breaker
   */
  @Post(':id/force-open')
  async forceOpen(@Param('id') id: string) {
    const cb = circuitBreakers.get(id) || {
      state: 'CLOSED',
      failures: 0,
      successes: 0,
      lastStateChange: new Date(),
    };
    cb.state = 'OPEN';
    cb.lastStateChange = new Date();
    circuitBreakers.set(id, cb);
    return { success: true, id, state: 'OPEN' };
  }

  /**
   * Force close circuit breaker
   */
  @Post(':id/force-close')
  async forceClose(@Param('id') id: string) {
    const cb = circuitBreakers.get(id) || {
      state: 'OPEN',
      failures: 0,
      successes: 0,
      lastStateChange: new Date(),
    };
    cb.state = 'CLOSED';
    cb.failures = 0;
    cb.lastStateChange = new Date();
    circuitBreakers.set(id, cb);
    return { success: true, id, state: 'CLOSED' };
  }

  /**
   * Reset all circuit breakers
   */
  @Post('reset-all')
  async resetAll() {
    circuitBreakers.clear();
    return { success: true, message: 'All circuit breakers reset' };
  }

  /**
   * Get statistics
   */
  @Get('stats/summary')
  async getStatistics() {
    let closed = 0, open = 0, halfOpen = 0;
    circuitBreakers.forEach((cb) => {
      if (cb.state === 'CLOSED') closed++;
      else if (cb.state === 'OPEN') open++;
      else halfOpen++;
    });

    return {
      total: circuitBreakers.size || 2,
      closed: closed || 2,
      open,
      halfOpen,
    };
  }
}
