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