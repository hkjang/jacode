import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Failing, reject requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening
  successThreshold: number; // Successes needed in half-open before closing
  timeout: number; // Time in ms before attempting half-open
  monitoringWindow: number; // Time window for failure tracking (ms)
}

interface CircuitMetrics {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime?: number;
  lastStateChange: number;
  totalRequests: number;
  failedRequests: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, CircuitMetrics>();
  private readonly defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
  };

  /**
   * Check if circuit is open (should reject requests)
   */
  isOpen(resourceId: string): boolean {
    const circuit = this.getOrCreateCircuit(resourceId);

    if (circuit.state === CircuitState.OPEN) {
      // Check if timeout has passed, transition to half-open
      const now = Date.now();
      if (circuit.lastFailureTime && now - circuit.lastFailureTime >= this.defaultConfig.timeout) {
        this.transitionTo(resourceId, CircuitState.HALF_OPEN);
        this.logger.log(`Circuit ${resourceId} transitioning to HALF_OPEN`);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a successful request
   */
  recordSuccess(resourceId: string): void {
    const circuit = this.getOrCreateCircuit(resourceId);
    circuit.successes++;
    circuit.totalRequests++;

    if (circuit.state === CircuitState.HALF_OPEN) {
      // Check if we have enough successes to close the circuit
      if (circuit.successes >= this.defaultConfig.successThreshold) {
        this.transitionTo(resourceId, CircuitState.CLOSED);
        this.logger.log(`Circuit ${resourceId} closed after successful recovery`);
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(resourceId: string): void {
    const circuit = this.getOrCreateCircuit(resourceId);
    circuit.failures++;
    circuit.failedRequests++;
    circuit.totalRequests++;
    circuit.lastFailureTime = Date.now();

    // Clean old failures outside monitoring window
    this.cleanOldFailures(resourceId);

    const failureRate = this.getFailureRate(resourceId);

    if (circuit.state === CircuitState.CLOSED) {
      // Check if we should open the circuit
      if (circuit.failures >= this.defaultConfig.failureThreshold) {
        this.transitionTo(resourceId, CircuitState.OPEN);
        this.logger.warn(
          `Circuit ${resourceId} OPENED after ${circuit.failures} failures (rate: ${(failureRate * 100).toFixed(1)}%)`
        );
      }
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens the circuit
      this.transitionTo(resourceId, CircuitState.OPEN);
      this.logger.warn(`Circuit ${resourceId} reopened during recovery attempt`);
    }
  }

  /**
   * Get failure rate (0.0 - 1.0)
   */
  getFailureRate(resourceId: string): number {
    const circuit = this.circuits.get(resourceId);
    if (!circuit || circuit.totalRequests === 0) {
      return 0;
    }
    return circuit.failedRequests / circuit.totalRequests;
  }

  /**
   * Get circuit state
   */
  getState(resourceId: string): CircuitState {
    return this.getOrCreateCircuit(resourceId).state;
  }

  /**
   * Get circuit metrics
   */
  getMetrics(resourceId: string): CircuitMetrics {
    return { ...this.getOrCreateCircuit(resourceId) };
  }

  /**
   * Get all circuit states
   */
  getAllStates(): Map<string, CircuitMetrics> {
    return new Map(
      Array.from(this.circuits.entries()).map(([id, metrics]) => [
        id,
        { ...metrics },
      ])
    );
  }

  /**
   * Manually reset a circuit
   */
  reset(resourceId: string): void {
    const circuit = this.getOrCreateCircuit(resourceId);
    circuit.state = CircuitState.CLOSED;
    circuit.failures = 0;
    circuit.successes = 0;
    circuit.failedRequests = 0;
    circuit.totalRequests = 0;
    circuit.lastStateChange = Date.now();
    this.logger.log(`Circuit ${resourceId} manually reset`);
  }

  /**
   * Get or create circuit for resource
   */
  private getOrCreateCircuit(resourceId: string): CircuitMetrics {
    if (!this.circuits.has(resourceId)) {
      this.circuits.set(resourceId, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        lastStateChange: Date.now(),
        totalRequests: 0,
        failedRequests: 0,
      });
    }
    return this.circuits.get(resourceId)!;
  }

  /**
   * Transition to new state
   */
  private transitionTo(resourceId: string, newState: CircuitState): void {
    const circuit = this.getOrCreateCircuit(resourceId);
    circuit.state = newState;
    circuit.lastStateChange = Date.now();
    
    // Reset counters on state change
    if (newState === CircuitState.CLOSED) {
      circuit.failures = 0;
      circuit.successes = 0;
      circuit.failedRequests = 0;
      circuit.totalRequests = 0;
    } else if (newState === CircuitState.HALF_OPEN) {
      circuit.successes = 0;
      circuit.failures = 0;
    }
  }

  /**
   * Clean failures outside monitoring window
   */
  private cleanOldFailures(resourceId: string): void {
    const circuit = this.circuits.get(resourceId);
    if (!circuit || !circuit.lastFailureTime) return;

    const now = Date.now();
    const windowStart = now - this.defaultConfig.monitoringWindow;

    if (circuit.lastFailureTime < windowStart) {
      // Reset failure count if last failure was outside window
      circuit.failures = 1; // Keep current failure
      circuit.failedRequests = 1;
      circuit.totalRequests = 1;
    }
  }

  /**
   * Get circuit breaker configuration
   */
  getConfig(): CircuitBreakerConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Force open a circuit (Admin)
   */
  forceOpen(resourceId: string): void {
    this.transitionTo(resourceId, CircuitState.OPEN);
    this.logger.warn(`Circuit ${resourceId} FORCE OPENED by admin`);
  }

  /**
   * Force close a circuit (Admin)
   */
  forceClose(resourceId: string): void {
    this.transitionTo(resourceId, CircuitState.CLOSED);
    this.logger.warn(`Circuit ${resourceId} FORCE CLOSED by admin`);
  }
}
