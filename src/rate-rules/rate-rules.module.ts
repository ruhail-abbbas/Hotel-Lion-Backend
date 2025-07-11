import { Module } from '@nestjs/common';
import { RateRulesController } from './rate-rules.controller';
import { RateRulesService } from './rate-rules.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RateRulesController],
  providers: [RateRulesService],
  exports: [RateRulesService],
})
export class RateRulesModule {}
