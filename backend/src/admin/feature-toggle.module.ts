import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FeatureToggleService } from './services/feature-toggle.service';
import { FeatureToggleController } from './controllers/feature-toggle.controller';

@Module({
  imports: [PrismaModule],
  providers: [FeatureToggleService],
  controllers: [FeatureToggleController],
  exports: [FeatureToggleService],
})
export class FeatureToggleModule {}
