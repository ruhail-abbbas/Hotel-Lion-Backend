import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceService } from './performance.service';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  constructor(private readonly performanceService: PerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const method = request.method;
    const endpoint = request.route?.path || request.url;
    const operation = `${method} ${endpoint}`;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.performanceService.recordMetric({
            operation,
            duration,
            endpoint,
            method,
            statusCode: response.statusCode,
            metadata: {
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              queryParams: Object.keys(request.query || {}).length,
              bodySize: request.headers['content-length'] ? parseInt(request.headers['content-length']) : 0,
            },
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.performanceService.recordMetric({
            operation,
            duration,
            endpoint,
            method,
            statusCode: error.status || 500,
            metadata: {
              error: error.message,
              userAgent: request.headers['user-agent'],
              ip: request.ip,
              queryParams: Object.keys(request.query || {}).length,
            },
          });
        },
      }),
    );
  }
}