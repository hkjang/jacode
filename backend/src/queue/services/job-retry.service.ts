import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  DEAD = 'dead',
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffType: 'fixed' | 'exponential' | 'linear';
  initialDelay: number; // ms
  maxDelay: number; // ms
  retryableErrors?: string[];
}

@Injectable()
export class JobRetryService {
  private readonly logger = new Logger(JobRetryService.name);
  
  private readonly defaultPolicy: RetryPolicy = {
    maxAttempts: 3,
    backoffType: 'exponential',
    initialDelay: 1000,
    maxDelay: 60000,
  };

  /**
   * Calculate next retry delay based on policy
   */
  calculateDelay(attempt: number, policy: RetryPolicy = this.defaultPolicy): number {
    let delay: number;

    switch (policy.backoffType) {
      case 'exponential':
        delay = policy.initialDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = policy.initialDelay * attempt;
        break;
      case 'fixed':
      default:
        delay = policy.initialDelay;
        break;
    }

    return Math.min(delay, policy.maxDelay);
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: any, policy: RetryPolicy = this.defaultPolicy): boolean {
    // If specific retryable errors are defined, check them
    if (policy.retryableErrors && policy.retryableErrors.length > 0) {
      const errorMessage = error?.message || String(error);
      return policy.retryableErrors.some(pattern => 
        errorMessage.includes(pattern)
      );
    }

    // Default: retry on network errors, timeouts, and temporary failures
    const retryablePatterns = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'timeout',
      'network',
      'temporary',
      'unavailable',
      '503',
      '504',
    ];

    const errorString = String(error).toLowerCase();
    return retryablePatterns.some(pattern => 
      errorString.includes(pattern.toLowerCase())
    );
  }

  /**
   * Create retry configuration for BullMQ
   */
  createRetryConfig(policy: RetryPolicy = this.defaultPolicy) {
    return {
      attempts: policy.maxAttempts,
      backoff: {
        type: policy.backoffType,
        delay: policy.initialDelay,
      },
    };
  }

  /**
   * Handle job failure and determine next action
   */
  async handleJobFailure(
    jobId: string,
    error: any,
    currentAttempt: number,
    policy: RetryPolicy = this.defaultPolicy
  ): Promise<{
    shouldRetry: boolean;
    delay?: number;
    reason: string;
  }> {
    // Check if max attempts reached
    if (currentAttempt >= policy.maxAttempts) {
      this.logger.error(`Job ${jobId} exceeded max retry attempts (${policy.maxAttempts})`);
      return {
        shouldRetry: false,
        reason: 'Max attempts exceeded',
      };
    }

    // Check if error is retryable
    if (!this.isRetryable(error, policy)) {
      this.logger.error(`Job ${jobId} failed with non-retryable error: ${error}`);
      return {
        shouldRetry: false,
        reason: 'Non-retryable error',
      };
    }

    // Calculate retry delay
    const delay = this.calculateDelay(currentAttempt + 1, policy);

    this.logger.log(
      `Job ${jobId} will retry in ${delay}ms (attempt ${currentAttempt + 1}/${policy.maxAttempts})`
    );

    return {
      shouldRetry: true,
      delay,
      reason: 'Retryable error',
    };
  }

  /**
   * Get retry statistics
   */
  getRetryStats(attempts: { timestamp: number; error?: string }[]) {
    return {
      totalAttempts: attempts.length,
      successfulAttempts: attempts.filter(a => !a.error).length,
      failedAttempts: attempts.filter(a => a.error).length,
      lastAttempt: attempts[attempts.length - 1],
      averageInterval: this.calculateAverageInterval(attempts),
    };
  }

  /**
   * Calculate average interval between attempts
   */
  private calculateAverageInterval(attempts: { timestamp: number }[]): number {
    if (attempts.length < 2) return 0;

    let totalInterval = 0;
    for (let i = 1; i < attempts.length; i++) {
      totalInterval += attempts[i].timestamp - attempts[i - 1].timestamp;
    }

    return totalInterval / (attempts.length - 1);
  }
}
