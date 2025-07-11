import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient<
  Prisma.PrismaClientOptions,
  'query' | 'info' | 'warn' | 'error'
> implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
        {
          emit: 'event',
          level: 'error',
        },
        {
          emit: 'event',
          level: 'info',
        },
        {
          emit: 'event',
          level: 'warn',
        },
      ],
    });

    // Query logging with performance monitoring
    this.$on('query', (e: Prisma.QueryEvent) => {
      const duration = Date.now() - new Date(e.timestamp).getTime();
      
      if (duration > 1000) {
        // Log slow queries (> 1 second)
        this.logger.warn(
          `Slow Query (${duration}ms): ${e.query}`,
          {
            duration,
            params: e.params,
            target: e.target,
          }
        );
      } else if (duration > 100) {
        // Log medium-slow queries (> 100ms) in development
        if (process.env.NODE_ENV === 'development') {
          this.logger.log(
            `Query (${duration}ms): ${e.query}`,
            {
              duration,
              params: e.params,
              target: e.target,
            }
          );
        }
      }

      // Log all queries in debug mode
      if (process.env.LOG_LEVEL === 'debug') {
        this.logger.debug(
          `Query (${duration}ms): ${e.query}`,
          {
            duration,
            params: e.params,
            target: e.target,
          }
        );
      }
    });

    // Error logging
    this.$on('error', (e: Prisma.LogEvent) => {
      this.logger.error(`Prisma Error: ${e.message}`, {
        target: e.target,
      });
    });

    // Info and warning logging
    this.$on('info', (e: Prisma.LogEvent) => {
      this.logger.log(`Prisma Info: ${e.message}`, {
        target: e.target,
      });
    });

    this.$on('warn', (e: Prisma.LogEvent) => {
      this.logger.warn(`Prisma Warning: ${e.message}`, {
        target: e.target,
      });
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Disconnected from database');
  }

  /**
   * Get query performance metrics
   */
  async getQueryMetrics() {
    try {
      // Check if $metrics is available (requires Prisma metrics feature)
      if ('$metrics' in this && typeof (this as any).$metrics === 'object') {
        const metrics = await (this as any).$metrics.json();
        return {
          counters: metrics.counters || {},
          gauges: metrics.gauges || {},
          histograms: metrics.histograms || {},
        };
      } else {
        return {
          error: 'Prisma metrics not available. Enable metrics in Prisma client configuration.',
          counters: {},
          gauges: {},
          histograms: {},
        };
      }
    } catch (error) {
      return {
        error: `Failed to get metrics: ${error.message}`,
        counters: {},
        gauges: {},
        histograms: {},
      };
    }
  }

  /**
   * Execute a query with performance timing
   */
  async timedQuery<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 500) {
        this.logger.warn(
          `Slow operation "${operationName}" completed in ${duration}ms`
        );
      }
      
      return { result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Operation "${operationName}" failed after ${duration}ms: ${error.message}`
      );
      throw error;
    }
  }
}
