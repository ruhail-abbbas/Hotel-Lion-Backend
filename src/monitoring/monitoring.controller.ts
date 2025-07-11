import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PerformanceService, PerformanceStats } from './performance.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Monitoring')
@Controller('api/v1/admin/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(
    private readonly performanceService: PerformanceService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('performance/overview')
  @ApiOperation({
    summary: 'Get performance overview (Admin only)',
    description: 'Get overall performance metrics and health status',
  })
  @ApiResponse({
    status: 200,
    description: 'Performance overview retrieved successfully',
  })
  async getPerformanceOverview() {
    const healthInfo = this.performanceService.getHealthInfo();
    const slowestOperations = this.performanceService.getSlowestOperations(5);
    const endpointStats = this.performanceService.getEndpointStats().slice(0, 10);

    return {
      health: healthInfo,
      slowest_operations: slowestOperations,
      top_endpoints: endpointStats,
    };
  }

  @Get('performance/operations')
  @ApiOperation({
    summary: 'Get slowest operations (Admin only)',
    description: 'Get list of slowest operations with performance statistics',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of operations to return',
    required: false,
    type: 'number',
    example: 10,
  })
  @ApiQuery({
    name: 'timeWindowMinutes',
    description: 'Time window in minutes',
    required: false,
    type: 'number',
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'Slowest operations retrieved successfully',
  })
  async getSlowestOperations(
    @Query('limit') limit?: string,
    @Query('timeWindowMinutes') timeWindowMinutes?: string,
  ): Promise<PerformanceStats[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const timeWindowNum = timeWindowMinutes ? parseInt(timeWindowMinutes, 10) : 60;

    return this.performanceService.getSlowestOperations(limitNum, timeWindowNum);
  }

  @Get('performance/endpoints')
  @ApiOperation({
    summary: 'Get endpoint performance statistics (Admin only)',
    description: 'Get performance statistics for all API endpoints',
  })
  @ApiQuery({
    name: 'timeWindowMinutes',
    description: 'Time window in minutes',
    required: false,
    type: 'number',
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'Endpoint statistics retrieved successfully',
  })
  async getEndpointStats(@Query('timeWindowMinutes') timeWindowMinutes?: string) {
    const timeWindowNum = timeWindowMinutes ? parseInt(timeWindowMinutes, 10) : 60;
    return this.performanceService.getEndpointStats(timeWindowNum);
  }

  @Get('performance/operation/:operation')
  @ApiOperation({
    summary: 'Get specific operation performance (Admin only)',
    description: 'Get detailed performance statistics for a specific operation',
  })
  @ApiQuery({
    name: 'timeWindowMinutes',
    description: 'Time window in minutes',
    required: false,
    type: 'number',
    example: 60,
  })
  @ApiResponse({
    status: 200,
    description: 'Operation statistics retrieved successfully',
  })
  async getOperationStats(
    @Query('operation') operation: string,
    @Query('timeWindowMinutes') timeWindowMinutes?: string,
  ): Promise<PerformanceStats> {
    const timeWindowNum = timeWindowMinutes ? parseInt(timeWindowMinutes, 10) : 60;
    return this.performanceService.getOperationStats(operation, timeWindowNum);
  }

  @Get('database/metrics')
  @ApiOperation({
    summary: 'Get database performance metrics (Admin only)',
    description: 'Get Prisma database performance metrics and statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Database metrics retrieved successfully',
  })
  async getDatabaseMetrics() {
    try {
      const metrics = await this.prismaService.getQueryMetrics();
      return {
        success: true,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Prisma metrics not available. Enable metrics in Prisma schema.',
        message: error.message,
      };
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Get system health status (Admin only)',
    description: 'Get overall system health including performance and database status',
  })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  async getHealthStatus() {
    const performanceHealth = this.performanceService.getHealthInfo();
    const memoryUsage = this.performanceService.getMemoryUsage();

    // Test database connection
    let databaseHealth = { isHealthy: true, error: null };
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseHealth = {
        isHealthy: false,
        error: error.message,
      };
    }

    return {
      overall_health: performanceHealth.isHealthy && databaseHealth.isHealthy,
      performance: performanceHealth,
      database: databaseHealth,
      memory_usage: memoryUsage,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('cleanup')
  @ApiOperation({
    summary: 'Cleanup old performance metrics (Admin only)',
    description: 'Remove old performance metrics to free up memory',
  })
  @ApiQuery({
    name: 'olderThanHours',
    description: 'Remove metrics older than this many hours',
    required: false,
    type: 'number',
    example: 24,
  })
  @ApiResponse({
    status: 200,
    description: 'Cleanup completed successfully',
  })
  async cleanupMetrics(@Query('olderThanHours') olderThanHours?: string) {
    const hours = olderThanHours ? parseInt(olderThanHours, 10) : 24;
    const beforeMemory = this.performanceService.getMemoryUsage();
    
    this.performanceService.cleanup(hours);
    
    const afterMemory = this.performanceService.getMemoryUsage();
    
    return {
      success: true,
      before: beforeMemory,
      after: afterMemory,
      cleaned_metrics: beforeMemory.count - afterMemory.count,
      freed_memory_kb: beforeMemory.estimatedSizeKB - afterMemory.estimatedSizeKB,
    };
  }
}