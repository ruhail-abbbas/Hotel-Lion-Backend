import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Check if hotel already exists
  let hotel = await prisma.hotel.findFirst({
    where: { name: 'Hotel Lion' }
  });

  if (!hotel) {
    // Create the hotel
    hotel = await prisma.hotel.create({
      data: {
        name: 'Hotel Lion',
        location: 'Your Location',
        contact_info: {
          email: 'contact@hotel-lion.com',
          phone: '+1234567890'
        },
        policies: 'Standard hotel policies',
        default_checkin_time: '15:00',
        default_checkout_time: '11:00'
      }
    });
    console.log('✅ Created hotel:', hotel.name);
  } else {
    console.log('🏨 Hotel already exists:', hotel.name);
  }

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@hotel-lion.com' }
  });

  if (existingAdmin) {
    console.log('👤 Admin user already exists: admin@hotel-lion.com');
    return;
  }

  // Hash password for admin user
  const saltRounds = 10;
  const adminPassword = 'admin123';
  const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

  // Create admin user
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@hotel-lion.com',
      password_hash: hashedPassword,
      role: UserRole.admin,
      phone: '+1234567890'
    }
  });

  // Associate admin user with hotel
  await prisma.hotelUsersPivot.create({
    data: {
      user_id: adminUser.id,
      hotel_id: hotel.id
    }
  });

  console.log('✅ Created admin user:');
  console.log('   Email: admin@hotel-lion.com');
  console.log('   Password: admin123');
  console.log('   Role: admin');

  // Create initial rooms if they don't exist
  const roomNames = ['Y1A', 'Y1B', 'Y2', 'Y3A', 'Y3B', 'Y4', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];
  
  for (const roomName of roomNames) {
    const existingRoom = await prisma.room.findFirst({
      where: { 
        hotel_id: hotel.id,
        name: roomName 
      }
    });

    if (!existingRoom) {
      await prisma.room.create({
        data: {
          hotel_id: hotel.id,
          name: roomName,
          description: `Room ${roomName} at Hotel Lion`,
          size_sqm: roomName.startsWith('Y') ? 25 : 20, // Y rooms are slightly larger
          bed_setup: roomName.startsWith('Y') ? 'King bed' : 'Queen bed',
          base_price: roomName.startsWith('Y') ? 15000 : 12000, // Price in cents ($150 vs $120)
          max_capacity: 2,
          status: 'available',
          amenities: {
            wifi: true,
            air_conditioning: true,
            private_bathroom: true,
            tv: true,
            mini_fridge: true
          }
        }
      });
      console.log(`✅ Created room: ${roomName}`);
    } else {
      console.log(`🏠 Room already exists: ${roomName}`);
    }
  }

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });