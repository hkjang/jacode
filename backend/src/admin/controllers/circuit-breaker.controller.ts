import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { CircuitBreakerService } from '../../ai/services/circuit-breaker.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('admin/circuit-breaker')
@UseGuards(JwtAuthGuard)
export class CircuitBreakerController {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  /**
   * Get all circuit breaker states
   */
  @Get()
  getAllStates() {
    const states = this.circuitBreaker.getAllStates();
    return Array.from(states.entries()).map(([id, state]) => ({
      resourceId: id,
      ...state,
    }));
  }

  /**
   * Get state for specific resource
   */
  @Get(':resourceId')
  getState(@Param('resourceId') resourceId: string) {
    return this.circuitBreaker.getState(resourceId);
  }

  /**
   * Check if circuit is open
   */
  @Get(':resourceId/is-open')
  isOpen(@Param('resourceId') resourceId: string) {
    return { isOpen: this.circuitBreaker.isOpen(resourceId) };
  }

  /**
   * Record success
   */
  @Post(':resourceId/success')
  recordSuccess(@Param('resourceId') resourceId: string) {
    this.circuitBreaker.recordSuccess(resourceId);
    return { message: 'Success recorded' };
  }

  /**
   * Record failure
   */
  @Post(':resourceId/failure')
  recordFailure(@Param('resourceId') resourceId: string) {
    this.circuitBreaker.recordFailure(resourceId);
    return { message: 'Failure recorded' };
  }

  /**
   * Reset circuit breaker
   */
  @Post(':resourceId/reset')
  reset(@Param('resourceId') resourceId: string) {
    this.circuitBreaker.reset(resourceId);
    return { message: 'Circuit breaker reset' };
  }

  /**
   * Force open circuit
   */
  @Post(':resourceId/force-open')
  forceOpen(@Param('resourceId') resourceId: string) {
    this.circuitBreaker.forceOpen(resourceId);
    return { message: 'Circuit forced open' };
  }

  /**
   * Force close circuit
   */
  @Post(':resourceId/force-close')
  forceClose(@Param('resourceId') resourceId: string) {
    this.circuitBreaker.forceClose(resourceId);
    return { message: 'Circuit forced closed' };
  }

  /**
   * Reset all circuits
   */
  @Post('reset-all')
  resetAll() {
    this.circuitBreaker.resetAll();
    return { message: 'All circuits reset' };
  }

  /**
   * Get statistics
   */
  @Get('stats/summary')
  getStats() {
    return this.circuitBreaker.getStatistics();
  }
}
