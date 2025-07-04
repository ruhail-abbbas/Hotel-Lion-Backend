import { Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CleaningService } from './cleaning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Cleaning')
@Controller('api/v1/admin/cleaning')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CleaningController {
  constructor(private readonly cleaningService: CleaningService) {}

  @Post('send-notifications')
  @Roles('admin')
  @ApiOperation({
    summary: 'Send cleaning notifications manually',
    description:
      "Manually trigger cleaning notifications for today's checkouts. Useful for testing or sending notifications outside the scheduled time.",
  })
  @ApiResponse({
    status: 200,
    description: 'Cleaning notifications sent successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Cleaning notifications sent successfully',
        },
        checkoutsFound: { type: 'number', example: 3 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async sendCleaningNotifications(): Promise<{
    success: boolean;
    message: string;
    checkoutsFound: number;
  }> {
    return this.cleaningService.triggerCleaningNotifications();
  }
}
