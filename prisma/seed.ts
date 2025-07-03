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
  } else {
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
  }

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
      const room = await prisma.room.create({
        data: {
          hotel_id: hotel.id,
          name: roomName,
          description: `Room ${roomName} at Hotel Lion`,
          size_sqm: roomName.startsWith('Y') ? 25 : 20, // Y rooms are slightly larger
          bed_setup: roomName.startsWith('Y') ? 'King bed' : 'Queen bed',
          base_price: roomName.startsWith('Y') ? 15000 : 12000, // Base fallback price in cents
          max_capacity: 2,
          status: 'available',
          pet_fee: 2500, // $25 pet fee
          minimum_nights: roomName.startsWith('Y') ? 2 : 1, // Y rooms require 2 nights minimum
          cleaning_fee: 5000, // $50 cleaning fee
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

      // Create rate rules for this room
      // Default rate rule for the entire year 2025 and beyond
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2026-12-31');
      
      // Set pricing based on room type
      const pricePerNight = roomName.startsWith('Y') ? 15000 : 12000; // Y rooms: $150, B rooms: $120
      
      await prisma.rateRule.create({
        data: {
          room_id: room.id,
          start_date: startDate,
          end_date: endDate,
          price_per_night: pricePerNight,
          min_stay_nights: 1,
          day_of_week: [0, 1, 2, 3, 4, 5, 6], // All days of the week
          source: 'website'
        }
      });
      console.log(`✅ Created default rate rule for room: ${roomName} - $${pricePerNight / 100}/night`);

      // Create weekend premium rate rule (Friday & Saturday)
      const weekendPremium = Math.round(pricePerNight * 1.2); // 20% premium for weekends
      
      await prisma.rateRule.create({
        data: {
          room_id: room.id,
          start_date: startDate,
          end_date: endDate,
          price_per_night: weekendPremium,
          min_stay_nights: 1,
          day_of_week: [5, 6], // Friday & Saturday
          source: 'website'
        }
      });
      console.log(`✅ Created weekend rate rule for room: ${roomName} - $${weekendPremium / 100}/night (Fri-Sat)`);
      
    } else {
      console.log(`🏠 Room already exists: ${roomName}`);
      
      // Check if rate rules exist for this room
      const existingRateRules = await prisma.rateRule.findMany({
        where: { room_id: existingRoom.id }
      });
      
      if (existingRateRules.length === 0) {
        // Create rate rules for existing room
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2026-12-31');
        const pricePerNight = roomName.startsWith('Y') ? 15000 : 12000;
        
        await prisma.rateRule.create({
          data: {
            room_id: existingRoom.id,
            start_date: startDate,
            end_date: endDate,
            price_per_night: pricePerNight,
            min_stay_nights: 1,
            day_of_week: [0, 1, 2, 3, 4, 5, 6],
            source: 'website'
          }
        });
        
        const weekendPremium = Math.round(pricePerNight * 1.2);
        await prisma.rateRule.create({
          data: {
            room_id: existingRoom.id,
            start_date: startDate,
            end_date: endDate,
            price_per_night: weekendPremium,
            min_stay_nights: 1,
            day_of_week: [5, 6],
            source: 'website'
          }
        });
        console.log(`✅ Created rate rules for existing room: ${roomName}`);
      } else {
        console.log(`📋 Rate rules already exist for room: ${roomName}`);
      }
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