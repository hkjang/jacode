import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { AgentGateway } from './agent.gateway';
import { AIModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [AIModule, QueueModule],
  providers: [AgentService, AgentGateway],
  controllers: [AgentController],
  exports: [AgentService],
})
export class AgentModule {}
