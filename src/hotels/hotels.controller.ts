import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { HotelsService } from './hotels.service';
import { UpdateHotelDto, HotelResponseDto } from './dto/update-hotel.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Hotels')
@Controller('api/v1/admin/hotels')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth('JWT-auth')
export class HotelsController {
  constructor(private readonly hotelsService: HotelsService) {}

  @Get(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get hotel details',
    description: 'Get detailed information about a specific hotel',
  })
  @ApiParam({
    name: 'id',
    description: 'Hotel UUID',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Hotel details retrieved successfully',
    type: HotelResponseDto,
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
    description: 'Hotel not found',
  })
  async getHotel(@Param('id') hotelId: string): Promise<HotelResponseDto> {
    return this.hotelsService.getHotel(hotelId);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOperation({
    summary: 'Update hotel details',
    description:
      'Update hotel identity and booking rules including contact info, check-in/out times, policies, currency, and tax rate',
  })
  @ApiParam({
    name: 'id',
    description: 'Hotel UUID',
    type: 'string',
  })
  @ApiBody({
    type: UpdateHotelDto,
    description: 'Hotel update details',
  })
  @ApiResponse({
    status: 200,
    description: 'Hotel updated successfully',
    type: HotelResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
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
    description: 'Hotel not found',
  })
  async updateHotel(
    @Param('id') hotelId: string,
    @Body() updateHotelDto: UpdateHotelDto,
  ): Promise<HotelResponseDto> {
    return this.hotelsService.updateHotel(hotelId, updateHotelDto);
  }
}
