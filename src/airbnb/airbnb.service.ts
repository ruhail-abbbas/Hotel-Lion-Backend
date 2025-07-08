import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AirbnbCalendarRequestDto } from './dto/airbnb-calendar-request.dto';
import { AirbnbCalendarResponseDto } from './dto/airbnb-calendar-response.dto';
import { CreateAirbnbListingDto } from './dto/create-airbnb-listing.dto';
import { UpdateAirbnbListingDto } from './dto/update-airbnb-listing.dto';
import { AirbnbListingResponseDto } from './dto/airbnb-listing-response.dto';

interface ApifyCalendarDay {
  available: boolean;
  date: string;
  availableForCheckin: boolean;
  availableForCheckout: boolean;
}

@Injectable()
export class AirbnbService {
  private readonly logger = new Logger(AirbnbService.name);
  private readonly apifyApiUrl = 'https://api.apify.com/v2';
  private readonly actorId = 'rigelbytes~airbnb-availability-calendar';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async getCalendarData(
    requestDto: AirbnbCalendarRequestDto,
  ): Promise<AirbnbCalendarResponseDto> {
    const apifyToken = this.configService.get<string>('APIFY_API_TOKEN');

    if (!apifyToken) {
      throw new HttpException(
        'Apify API token not configured',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      // Prepare the input for Apify actor
      const actorInput = {
        url: requestDto.url,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ['RESIDENTIAL'],
        },
      };

      this.logger.log(`Fetching calendar data for URL: ${requestDto.url}`);

      // Run the actor and get dataset items
      const response = await fetch(
        `${this.apifyApiUrl}/acts/${this.actorId}/run-sync-get-dataset-items?token=${apifyToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(actorInput),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Apify API error: ${response.status} - ${errorText}`);
        throw new HttpException(
          'Failed to fetch calendar data from Apify',
          HttpStatus.BAD_GATEWAY,
        );
      }

      const data = (await response.json()) as ApifyCalendarDay[];

      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new HttpException(
          'No calendar data returned from Apify',
          HttpStatus.NOT_FOUND,
        );
      }
      console.log(data);
      return {
        listingId: this.extractListingIdFromUrl(requestDto.url),
        calendar: data,
        extractedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Error fetching Airbnb calendar data:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Internal server error while fetching calendar data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private extractListingIdFromUrl(url: string): string {
    const matches = url.match(/\/rooms\/(\d+)/);
    return matches ? matches[1] : 'unknown';
  }

  // CRUD operations for Airbnb listings
  async createListing(
    createDto: CreateAirbnbListingDto,
  ): Promise<AirbnbListingResponseDto> {
    try {
      const listing = await this.prisma.airbnbListing.create({
        data: {
          hotel_id: createDto.hotel_id,
          room_id: createDto.room_id,
          listing_url: createDto.listing_url,
          title: createDto.title,
        },
      });

      return this.formatListingResponse(listing);
    } catch (error) {
      this.logger.error('Error creating Airbnb listing:', error);
      throw new HttpException(
        'Failed to create Airbnb listing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getListingsByHotel(
    hotelId: string,
  ): Promise<AirbnbListingResponseDto[]> {
    try {
      const listings = await this.prisma.airbnbListing.findMany({
        where: {
          hotel_id: hotelId,
          is_active: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return listings.map((listing) => this.formatListingResponse(listing));
    } catch (error) {
      this.logger.error('Error fetching Airbnb listings:', error);
      throw new HttpException(
        'Failed to fetch Airbnb listings',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getListingsByRoom(roomId: string): Promise<AirbnbListingResponseDto[]> {
    try {
      const listings = await this.prisma.airbnbListing.findMany({
        where: {
          room_id: roomId,
          is_active: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      return listings.map((listing) => this.formatListingResponse(listing));
    } catch (error) {
      this.logger.error('Error fetching Airbnb listings by room:', error);
      throw new HttpException(
        'Failed to fetch Airbnb listings by room',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateListing(
    id: string,
    updateDto: UpdateAirbnbListingDto,
  ): Promise<AirbnbListingResponseDto> {
    try {
      const listing = await this.prisma.airbnbListing.update({
        where: { id },
        data: {
          room_id: updateDto.room_id,
          listing_url: updateDto.listing_url,
          title: updateDto.title,
          is_active: updateDto.is_active,
        },
      });

      return this.formatListingResponse(listing);
    } catch (error) {
      this.logger.error('Error updating Airbnb listing:', error);
      throw new HttpException(
        'Failed to update Airbnb listing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteListing(id: string): Promise<void> {
    try {
      await this.prisma.airbnbListing.update({
        where: { id },
        data: { is_active: false },
      });
    } catch (error) {
      this.logger.error('Error deleting Airbnb listing:', error);
      throw new HttpException(
        'Failed to delete Airbnb listing',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private formatListingResponse(listing: {
    id: string;
    hotel_id: string;
    room_id: string;
    listing_url: string;
    title: string | null;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): AirbnbListingResponseDto {
    return {
      id: listing.id,
      hotel_id: listing.hotel_id,
      room_id: listing.room_id,
      listing_url: listing.listing_url,
      title: listing.title || undefined,
      is_active: listing.is_active,
      created_at: listing.created_at.toISOString(),
      updated_at: listing.updated_at.toISOString(),
    };
  }
}
