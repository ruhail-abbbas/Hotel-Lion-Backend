import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AirbnbService } from './airbnb.service';
import { AirbnbCalendarRequestDto } from './dto/airbnb-calendar-request.dto';
import { AirbnbCalendarResponseDto } from './dto/airbnb-calendar-response.dto';
import { CreateAirbnbListingDto } from './dto/create-airbnb-listing.dto';
import { UpdateAirbnbListingDto } from './dto/update-airbnb-listing.dto';
import { AirbnbListingResponseDto } from './dto/airbnb-listing-response.dto';

@ApiTags('Airbnb Calendar')
@Controller('api/v1/airbnb')
export class AirbnbController {
  constructor(private readonly airbnbService: AirbnbService) {}

  @Post('calendar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Fetch Airbnb listing calendar data',
    description:
      'Retrieves availability calendar data from an Airbnb listing using Apify API. Admin access required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar data retrieved successfully',
    type: AirbnbCalendarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'No calendar data found for the listing',
  })
  @ApiResponse({
    status: 502,
    description: 'Failed to fetch data from Apify API',
  })
  async getCalendarData(
    @Body() requestDto: AirbnbCalendarRequestDto,
  ): Promise<AirbnbCalendarResponseDto> {
    return this.airbnbService.getCalendarData(requestDto);
  }

  @Post('listings')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new Airbnb listing',
    description: 'Stores an Airbnb listing URL for a hotel',
  })
  @ApiResponse({
    status: 201,
    description: 'Listing created successfully',
    type: AirbnbListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async createListing(
    @Body() createDto: CreateAirbnbListingDto,
  ): Promise<AirbnbListingResponseDto> {
    return this.airbnbService.createListing(createDto);
  }

  @Get('listings')
  @ApiOperation({
    summary: 'Get Airbnb listings for a hotel or room',
    description:
      'Retrieves all active Airbnb listings for a specific hotel or room. Use either hotel_id or room_id parameter.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listings retrieved successfully',
    type: [AirbnbListingResponseDto],
  })
  async getListings(
    @Query('hotel_id') hotelId?: string,
    @Query('room_id') roomId?: string,
  ): Promise<AirbnbListingResponseDto[]> {
    if (roomId) {
      return this.airbnbService.getListingsByRoom(roomId);
    } else if (hotelId) {
      return this.airbnbService.getListingsByHotel(hotelId);
    } else {
      throw new HttpException(
        'Either hotel_id or room_id must be provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('listings/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an Airbnb listing',
    description: 'Updates an existing Airbnb listing',
  })
  @ApiResponse({
    status: 200,
    description: 'Listing updated successfully',
    type: AirbnbListingResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'Listing not found',
  })
  async updateListing(
    @Param('id') id: string,
    @Body() updateDto: UpdateAirbnbListingDto,
  ): Promise<AirbnbListingResponseDto> {
    return this.airbnbService.updateListing(id, updateDto);
  }

  @Delete('listings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an Airbnb listing',
    description: 'Soft deletes an Airbnb listing by setting is_active to false',
  })
  @ApiResponse({
    status: 204,
    description: 'Listing deleted successfully',
  })
  async deleteListing(@Param('id') id: string): Promise<void> {
    return this.airbnbService.deleteListing(id);
  }
}
