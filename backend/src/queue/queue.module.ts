import { Module, forwardRef, Logger } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { CodeProcessor } from './processors/code.processor';
import { PlanProcessor } from './processors/plan.processor';
import { QUEUE_NAMES } from './constants';
import { AIModule } from '../ai/ai.module';

// Re-export for convenience
export { QUEUE_NAMES } from './constants';

const logger = new Logger('QueueModule');

@Module({
  imports: [
    forwardRef(() => AIModule),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          // Redis connection retry settings
          retryStrategy: (times: number) => {
            if (times > 10) {
              logger.error('Redis connection failed after 10 retries');
              return null; // Stop retrying
            }
            const delay = Math.min(times * 500, 5000);
            logger.warn(`Redis connection attempt ${times}, retrying in ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 100, // Keep last 100 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
            count: 50, // Keep last 50 failed jobs
          },
          // Job timeout settings
          timeout: 300000, // 5 minutes max per job
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CODE_GENERATION },
      { name: QUEUE_NAMES.CODE_MODIFICATION },
      { name: QUEUE_NAMES.PLAN_GENERATION },
      { name: QUEUE_NAMES.CODE_REVIEW },
      { name: QUEUE_NAMES.TEST_GENERATION },
    ),
  ],
  providers: [QueueService, CodeProcessor, PlanProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}


