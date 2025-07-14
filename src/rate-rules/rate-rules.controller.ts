import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { RateRulesService } from './rate-rules.service';
import { CreateRateRuleDto } from './dto/create-rate-rule.dto';
import { UpdateRateRuleDto } from './dto/update-rate-rule.dto';
import {
  RateRuleResponseDto,
  RateRuleListResponseDto,
} from './dto/rate-rule-response.dto';
import { RateRuleQueryDto } from './dto/rate-rule-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Rate Rules')
@Controller('api/v1/rate-rules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth('JWT-auth')
export class RateRulesController {
  constructor(private readonly rateRulesService: RateRulesService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new rate rule (Admin only)',
    description:
      'Create a new rate rule with premium pricing for specific rooms, dates, and days of the week.',
  })
  @ApiBody({
    type: CreateRateRuleDto,
    description: 'Rate rule creation details',
  })
  @ApiResponse({
    status: 201,
    description: 'Rate rule created successfully',
    type: RateRuleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Room not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping rate rule exists',
  })
  async create(
    @Body() createRateRuleDto: CreateRateRuleDto,
  ): Promise<RateRuleResponseDto> {
    return this.rateRulesService.create(createRateRuleDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all rate rules (Admin only)',
    description:
      'Retrieve all rate rules with optional filtering by room ID, hotel ID, or source platform.',
  })
  @ApiQuery({
    name: 'room_id',
    description: 'Filter by room ID',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'hotel_id',
    description:
      'Filter by hotel ID (returns rate rules for all rooms in the hotel)',
    required: false,
    type: 'string',
  })
  @ApiQuery({
    name: 'source',
    description: 'Filter by source platform',
    required: false,
    enum: ['website', 'airbnb', 'booking.com'],
  })
  @ApiResponse({
    status: 200,
    description: 'List of rate rules retrieved successfully',
    type: RateRuleListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  async findAll(
    @Query() query: RateRuleQueryDto,
  ): Promise<RateRuleListResponseDto> {
    return this.rateRulesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific rate rule (Admin only)',
    description: 'Retrieve a specific rate rule by its ID.',
  })
  @ApiParam({
    name: 'id',
    description: 'Rate rule UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate rule retrieved successfully',
    type: RateRuleResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate rule not found',
  })
  async findOne(@Param('id') id: string): Promise<RateRuleResponseDto> {
    return this.rateRulesService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update a rate rule (Admin only)',
    description:
      'Update an existing rate rule with new pricing or date information.',
  })
  @ApiParam({
    name: 'id',
    description: 'Rate rule UUID',
    type: 'string',
  })
  @ApiBody({
    type: UpdateRateRuleDto,
    description: 'Rate rule update details',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate rule updated successfully',
    type: RateRuleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data or validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate rule not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Overlapping rate rule exists',
  })
  async update(
    @Param('id') id: string,
    @Body() updateRateRuleDto: UpdateRateRuleDto,
  ): Promise<RateRuleResponseDto> {
    return this.rateRulesService.update(id, updateRateRuleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a rate rule (Admin only)',
    description: 'Delete an existing rate rule permanently.',
  })
  @ApiParam({
    name: 'id',
    description: 'Rate rule UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Rate rule deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Rate rule 123e4567-e89b-12d3-a456-426614174000 has been successfully deleted',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Rate rule not found',
  })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    return this.rateRulesService.remove(id);
  }
}
