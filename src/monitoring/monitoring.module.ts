import { Module, Global } from '@nestjs/common';
import { PerformanceService } from './performance.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { MonitoringController } from './monitoring.controller';

@Global()
@Module({
  controllers: [MonitoringController],
  providers: [PerformanceService, PerformanceInterceptor],
  exports: [PerformanceService, PerformanceInterceptor],
})
export class MonitoringModule {}
