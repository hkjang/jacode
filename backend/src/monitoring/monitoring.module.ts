import { Module, Global } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { CustomLoggerService } from '../common/logger.service';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class MonitoringModule {}
