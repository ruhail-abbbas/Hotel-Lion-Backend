import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from '../auth/dto/auth-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user with email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if hotel exists
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: createUserDto.hotel_id },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(createUserDto.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password_hash,
        role: createUserDto.role,
        phone: createUserDto.phone,
      },
    });

    // Associate user with hotel
    await this.prisma.hotelUsersPivot.create({
      data: {
        user_id: user.id,
        hotel_id: createUserDto.hotel_id,
      },
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      include: {
        hotel_users: {
          include: {
            hotel: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return users.map(
      (user) =>
        ({
          id: user.id,
          email: user.email,
          phone: user.phone || undefined,
          role: user.role,
          created_at: user.created_at,
          updated_at: user.updated_at,
        }) as UserResponseDto,
    );
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        hotel_users: {
          include: {
            hotel: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it already exists
    if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (emailExists) {
        throw new ConflictException('User with this email already exists');
      }
    }

    const updateData: any = {
      email: updateUserDto.email,
      role: updateUserDto.role,
      phone: updateUserDto.phone,
    };

    // Hash new password if provided
    if (updateUserDto.password) {
      const saltRounds = 10;
      updateData.password_hash = await bcrypt.hash(
        updateUserDto.password,
        saltRounds,
      );
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone || undefined,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  async remove(id: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // This will cascade delete hotel_users_pivot and refresh_tokens
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }
}
