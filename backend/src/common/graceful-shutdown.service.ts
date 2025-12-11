import { Injectable, Logger, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GracefulShutdownService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private isShuttingDown = false;
  private activeRequests = 0;

  constructor(private readonly prisma: PrismaService) {
    // Handle process signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
  }

  // Track active requests
  incrementActiveRequests() {
    this.activeRequests++;
  }

  decrementActiveRequests() {
    this.activeRequests--;
  }

  isTerminating(): boolean {
    return this.isShuttingDown;
  }

  private async handleShutdown(signal: string) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.logger.log(`Received ${signal}, starting graceful shutdown...`);

    // Wait for active requests to complete (max 30 seconds)
    const maxWaitTime = 30000;
    const checkInterval = 100;
    let waited = 0;

    while (this.activeRequests > 0 && waited < maxWaitTime) {
      await this.sleep(checkInterval);
      waited += checkInterval;
      if (waited % 5000 === 0) {
        this.logger.log(`Waiting for ${this.activeRequests} active requests to complete...`);
      }
    }

    if (this.activeRequests > 0) {
      this.logger.warn(`Forcing shutdown with ${this.activeRequests} active requests`);
    } else {
      this.logger.log('All requests completed, proceeding with shutdown');
    }
  }

  async onModuleDestroy() {
    this.logger.log('Module destroy - closing connections...');

    // Close database connection
    try {
      await this.prisma.$disconnect();
      this.logger.log('Database connection closed');
    } catch (error) {
      this.logger.error(`Error closing database: ${error}`);
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutdown complete (signal: ${signal})`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Middleware to track active requests
export function requestTrackingMiddleware(shutdownService: GracefulShutdownService) {
  return (req: any, res: any, next: any) => {
    // Reject new requests during shutdown
    if (shutdownService.isTerminating()) {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Server is shutting down',
        },
      });
      return;
    }

    shutdownService.incrementActiveRequests();

    res.on('finish', () => {
      shutdownService.decrementActiveRequests();
    });

    next();
  };
}
