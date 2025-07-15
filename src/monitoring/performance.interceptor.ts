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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const request = context.switchToHttp().getRequest();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = context.switchToHttp().getResponse();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const method = request.method;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const endpoint = request.route?.path || request.url;
    const operation = `${method} ${endpoint}`;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.performanceService.recordMetric({
            operation,
            duration,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            endpoint,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            method,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            statusCode: response.statusCode,
            metadata: {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              userAgent: request.headers?.['user-agent'] || '',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              ip: request.ip,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              queryParams: Object.keys(request.query || {}).length,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              bodySize: request.headers?.['content-length']
                ? // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  parseInt(request.headers['content-length'])
                : 0,
            },
          });
        },
        error: (error: { status?: number; message?: string }) => {
          const duration = Date.now() - startTime;
          this.performanceService.recordMetric({
            operation,
            duration,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            endpoint,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            method,
            statusCode: error.status || 500,
            metadata: {
              error: error.message || 'Unknown error',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              userAgent: request.headers?.['user-agent'] || '',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              ip: request.ip,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
              queryParams: Object.keys(request.query || {}).length,
            },
          });
        },
      }),
    );
  }
}
