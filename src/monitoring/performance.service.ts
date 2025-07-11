import { Injectable, Logger } from '@nestjs/common';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: Date;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceStats {
  operation: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
}

@Injectable()
export class PerformanceService {
  private readonly logger = new Logger(PerformanceService.name);
  private readonly metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics in memory

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      ...metric,
      timestamp: new Date(),
    };

    this.metrics.push(fullMetric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.splice(0, this.metrics.length - this.maxMetrics);
    }

    // Log slow operations
    if (metric.duration > 1000) {
      this.logger.warn(
        `Slow operation: ${metric.operation} took ${metric.duration}ms`,
        {
          endpoint: metric.endpoint,
          method: metric.method,
          metadata: metric.metadata,
        },
      );
    } else if (metric.duration > 500) {
      this.logger.log(
        `Medium-slow operation: ${metric.operation} took ${metric.duration}ms`,
        {
          endpoint: metric.endpoint,
          method: metric.method,
        },
      );
    }
  }

  /**
   * Get performance statistics for a specific operation
   */
  getOperationStats(
    operation: string,
    timeWindowMinutes = 60,
  ): PerformanceStats {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const relevantMetrics = this.metrics.filter(
      (m) => m.operation === operation && m.timestamp >= cutoffTime,
    );

    if (relevantMetrics.length === 0) {
      return {
        operation,
        count: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p95Duration: 0,
        p99Duration: 0,
        errorRate: 0,
      };
    }

    const durations = relevantMetrics
      .map((m) => m.duration)
      .sort((a, b) => a - b);
    const errors = relevantMetrics.filter(
      (m) => m.statusCode && m.statusCode >= 400,
    );

    return {
      operation,
      count: relevantMetrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p95Duration: durations[Math.floor(durations.length * 0.95)],
      p99Duration: durations[Math.floor(durations.length * 0.99)],
      errorRate: errors.length / relevantMetrics.length,
    };
  }

  /**
   * Get top slowest operations
   */
  getSlowestOperations(limit = 10, timeWindowMinutes = 60): PerformanceStats[] {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter((m) => m.timestamp >= cutoffTime);

    const operationGroups = new Map<string, PerformanceMetric[]>();

    for (const metric of recentMetrics) {
      if (!operationGroups.has(metric.operation)) {
        operationGroups.set(metric.operation, []);
      }
      operationGroups.get(metric.operation)!.push(metric);
    }

    const stats: PerformanceStats[] = [];

    for (const [operation, metrics] of operationGroups) {
      const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
      const errors = metrics.filter((m) => m.statusCode && m.statusCode >= 400);

      stats.push({
        operation,
        count: metrics.length,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: durations[0],
        maxDuration: durations[durations.length - 1],
        p95Duration: durations[Math.floor(durations.length * 0.95)],
        p99Duration: durations[Math.floor(durations.length * 0.99)],
        errorRate: errors.length / metrics.length,
      });
    }

    return stats.sort((a, b) => b.p95Duration - a.p95Duration).slice(0, limit);
  }

  /**
   * Get endpoint performance summary
   */
  getEndpointStats(
    timeWindowMinutes = 60,
  ): { endpoint: string; stats: PerformanceStats }[] {
    const cutoffTime = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    const recentMetrics = this.metrics.filter(
      (m) => m.timestamp >= cutoffTime && m.endpoint,
    );

    const endpointGroups = new Map<string, PerformanceMetric[]>();

    for (const metric of recentMetrics) {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointGroups.has(key)) {
        endpointGroups.set(key, []);
      }
      endpointGroups.get(key)!.push(metric);
    }

    const endpointStats: { endpoint: string; stats: PerformanceStats }[] = [];

    for (const [endpoint, metrics] of endpointGroups) {
      const durations = metrics.map((m) => m.duration).sort((a, b) => a - b);
      const errors = metrics.filter((m) => m.statusCode && m.statusCode >= 400);

      endpointStats.push({
        endpoint,
        stats: {
          operation: endpoint,
          count: metrics.length,
          avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: durations[0],
          maxDuration: durations[durations.length - 1],
          p95Duration: durations[Math.floor(durations.length * 0.95)],
          p99Duration: durations[Math.floor(durations.length * 0.99)],
          errorRate: errors.length / metrics.length,
        },
      });
    }

    return endpointStats.sort(
      (a, b) => b.stats.p95Duration - a.stats.p95Duration,
    );
  }

  /**
   * Clear old metrics to free memory
   */
  cleanup(olderThanHours = 24): void {
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const initialLength = this.metrics.length;

    // Remove metrics older than cutoff
    for (let i = this.metrics.length - 1; i >= 0; i--) {
      if (this.metrics[i].timestamp < cutoffTime) {
        this.metrics.splice(i, 1);
      }
    }

    const removedCount = initialLength - this.metrics.length;
    if (removedCount > 0) {
      this.logger.log(`Cleaned up ${removedCount} old performance metrics`);
    }
  }

  /**
   * Get current memory usage of metrics
   */
  getMemoryUsage(): { count: number; estimatedSizeKB: number } {
    const estimatedSize = this.metrics.length * 200; // Rough estimate: 200 bytes per metric
    return {
      count: this.metrics.length,
      estimatedSizeKB: Math.round(estimatedSize / 1024),
    };
  }

  /**
   * Get health check info
   */
  getHealthInfo(): {
    isHealthy: boolean;
    issues: string[];
    metrics: {
      totalMetrics: number;
      memoryUsageKB: number;
      slowOperationsLast10Min: number;
    };
  } {
    const issues: string[] = [];
    const memoryUsage = this.getMemoryUsage();

    // Check for memory usage
    if (memoryUsage.estimatedSizeKB > 10 * 1024) {
      // 10MB
      issues.push('High memory usage from performance metrics');
    }

    // Check for slow operations
    const last10MinMetrics = this.metrics.filter(
      (m) => m.timestamp >= new Date(Date.now() - 10 * 60 * 1000),
    );
    const slowOperations = last10MinMetrics.filter((m) => m.duration > 1000);

    if (slowOperations.length > 10) {
      issues.push(
        `High number of slow operations: ${slowOperations.length} in last 10 minutes`,
      );
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      metrics: {
        totalMetrics: this.metrics.length,
        memoryUsageKB: memoryUsage.estimatedSizeKB,
        slowOperationsLast10Min: slowOperations.length,
      },
    };
  }
}
