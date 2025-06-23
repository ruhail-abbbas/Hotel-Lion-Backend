import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

@ApiTags('Authentication')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('sign-in')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Sign in with credentials' })
  @ApiResponse({
    status: 200,
    description: 'User signed in successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signIn(
    @Body() signInDto: SignInDto,
    @Request() req,
  ): Promise<AuthResponseDto> {
    return this.authService.signIn(req.user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string' },
        refresh_token: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    try {
      return await this.authService.refreshToken(refreshTokenDto.refresh_token);
    } catch (error) {
      throw new BadRequestException('Invalid refresh token');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(user.id);
  }

  @Post('sign-out')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Sign out and invalidate refresh tokens' })
  @ApiResponse({ status: 200, description: 'Signed out successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async signOut(@CurrentUser() user: User): Promise<{ message: string }> {
    await this.authService.signOut(user.id);
    return { message: 'Signed out successfully' };
  }
}
