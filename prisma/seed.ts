import {
  PrismaClient,
  UserRole,
  BookingStatus,
  PaymentMethod,
  RoomStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Helper function to generate random dates
function getRandomDateInRange(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime()),
  );
}

// Helper function to generate booking reference
function generateBookingReference(): string {
  return 'HL' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

async function main() {
  console.log('🌱 Starting comprehensive seed...');

  // Check if hotel already exists
  let hotel = await prisma.hotel.findFirst({
    where: { name: 'Hotel Lion' },
  });

  if (!hotel) {
    // Create the hotel
    hotel = await prisma.hotel.create({
      data: {
        name: 'Hotel Lion',
        location: 'Downtown Historic District, City Center',
        contact_info: {
          email: 'contact@hotel-lion.com',
          phone: '+1-555-LION-123',
          website: 'https://hotel-lion.com',
          address: '123 Lion Street, Downtown, City 12345',
        },
        policies:
          'Check-in: 3:00 PM, Check-out: 11:00 AM. No smoking. Pets allowed with fee. Cancellation 24h before arrival.',
        default_checkin_time: '15:00',
        default_checkout_time: '11:00',
      },
    });
    console.log('✅ Created hotel:', hotel.name);
  } else {
    console.log('🏨 Hotel already exists:', hotel.name);
  }

  // Create admin user and cleaning staff
  const users = [
    {
      email: 'admin@hotel-lion.com',
      password: 'admin123',
      role: UserRole.admin,
      phone: '+1-555-ADMIN-01',
    },
    {
      email: 'cleaning1@hotel-lion.com',
      password: 'cleaning123',
      role: UserRole.cleaning,
      phone: '+923335037773',
    },
    {
      email: 'cleaning2@hotel-lion.com',
      password: 'cleaning123',
      role: UserRole.cleaning,
      phone: '+923335037773',
    },
  ];

  const createdUsers: any[] = [];
  const saltRounds = 10;

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          password_hash: hashedPassword,
          role: userData.role,
          phone: userData.phone,
        },
      });

      // Associate user with hotel
      await prisma.hotelUsersPivot.create({
        data: {
          user_id: user.id,
          hotel_id: hotel.id,
        },
      });

      createdUsers.push(user);
      console.log(`✅ Created user: ${userData.email} (${userData.role})`);
    } else {
      createdUsers.push(existingUser);
      console.log(`👤 User already exists: ${userData.email}`);
    }
  }

  // Create rooms with detailed information
  const roomsData = [
    {
      name: 'Y1A',
      type: 'luxury',
      size: 28,
      price: 18000,
      bed: 'King bed',
      floor: 1,
    },
    {
      name: 'Y1B',
      type: 'luxury',
      size: 26,
      price: 17000,
      bed: 'King bed',
      floor: 1,
    },
    {
      name: 'Y2',
      type: 'luxury',
      size: 30,
      price: 20000,
      bed: 'King bed with sofa',
      floor: 2,
    },
    {
      name: 'Y3A',
      type: 'luxury',
      size: 25,
      price: 16000,
      bed: 'King bed',
      floor: 3,
    },
    {
      name: 'Y3B',
      type: 'luxury',
      size: 25,
      price: 16000,
      bed: 'King bed',
      floor: 3,
    },
    {
      name: 'Y4',
      type: 'penthouse',
      size: 40,
      price: 25000,
      bed: 'King bed with living area',
      floor: 4,
    },
    {
      name: 'B1',
      type: 'standard',
      size: 20,
      price: 12000,
      bed: 'Queen bed',
      floor: 1,
    },
    {
      name: 'B2',
      type: 'standard',
      size: 22,
      price: 13000,
      bed: 'Queen bed',
      floor: 1,
    },
    {
      name: 'B3',
      type: 'standard',
      size: 20,
      price: 12000,
      bed: 'Queen bed',
      floor: 2,
    },
    {
      name: 'B4',
      type: 'standard',
      size: 22,
      price: 13000,
      bed: 'Queen bed',
      floor: 2,
    },
    {
      name: 'B5',
      type: 'standard',
      size: 24,
      price: 14000,
      bed: 'Queen bed with desk',
      floor: 3,
    },
    {
      name: 'B6',
      type: 'standard',
      size: 20,
      price: 12000,
      bed: 'Queen bed',
      floor: 3,
    },
    {
      name: 'B7',
      type: 'standard',
      size: 22,
      price: 13000,
      bed: 'Queen bed',
      floor: 4,
    },
    {
      name: 'B8',
      type: 'deluxe',
      size: 26,
      price: 15000,
      bed: 'Queen bed with balcony',
      floor: 4,
    },
  ];
  const createdRooms: any[] = [];

  for (const roomData of roomsData) {
    const existingRoom = await prisma.room.findFirst({
      where: {
        hotel_id: hotel.id,
        name: roomData.name,
      },
    });

    if (!existingRoom) {
      const room = await prisma.room.create({
        data: {
          hotel_id: hotel.id,
          name: roomData.name,
          description: `${roomData.type.charAt(0).toUpperCase() + roomData.type.slice(1)} room ${roomData.name} - ${roomData.bed} with ${roomData.size}sqm`,
          size_sqm: roomData.size,
          bed_setup: roomData.bed,
          base_price: roomData.price,
          max_capacity: 2,
          status: 'available',
          pet_fee: 2500, // $25 pet fee
          minimum_nights: roomData.name.startsWith('Y') ? 2 : 1, // Y rooms require 2 nights minimum
          cleaning_fee: 5000, // $50 cleaning fee
          amenities: {
            wifi: true,
            air_conditioning: true,
            private_bathroom: true,
            tv: true,
            mini_fridge: true,
            coffee_maker: roomData.type !== 'standard',
            balcony: roomData.name === 'B8' || roomData.type === 'penthouse',
            city_view: roomData.floor >= 3,
            room_service:
              roomData.type === 'luxury' || roomData.type === 'penthouse',
            work_desk: roomData.type !== 'standard' || roomData.name === 'B5',
          },
        },
      });
      createdRooms.push(room);
      console.log(`✅ Created room: ${roomData.name}`);

      // Create rate rules for this room
      // Default rate rule for the entire year 2025 and beyond
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2026-12-31');

      // No default premium (0 means no change to base price)
      await prisma.rateRule.create({
        data: {
          room_id: room.id,
          start_date: startDate,
          end_date: endDate,
          price_per_night: 0, // No premium for default days
          min_stay_nights: 1,
          day_of_week: [0, 1, 2, 3, 4], // Sunday through Thursday
          source: 'website',
        },
      });
      console.log(
        `✅ Created default rate rule for room: ${roomData.name} - $${roomData.price / 100}/night (base price)`,
      );

      // Create weekend premium rate rule (Friday & Saturday)
      const weekendPremium = Math.round(roomData.price * 0.2); // 20% premium for weekends

      await prisma.rateRule.create({
        data: {
          room_id: room.id,
          start_date: startDate,
          end_date: endDate,
          price_per_night: weekendPremium,
          min_stay_nights: 1,
          day_of_week: [5, 6], // Friday & Saturday
          source: 'website',
        },
      });
      console.log(
        `✅ Created weekend rate rule for room: ${roomData.name} - $${(roomData.price + weekendPremium) / 100}/night (Fri-Sat)`,
      );
    } else {
      createdRooms.push(existingRoom);
      console.log(`🏠 Room already exists: ${roomData.name}`);

      // Check if rate rules exist for this room
      const existingRateRules = await prisma.rateRule.findMany({
        where: { room_id: existingRoom.id },
      });

      if (existingRateRules.length === 0) {
        // Create rate rules for existing room
        const startDate = new Date('2025-01-01');
        const endDate = new Date('2026-12-31');
        const pricePerNight = roomData.price;

        await prisma.rateRule.create({
          data: {
            room_id: existingRoom.id,
            start_date: startDate,
            end_date: endDate,
            price_per_night: pricePerNight,
            min_stay_nights: 1,
            day_of_week: [0, 1, 2, 3, 4, 5, 6],
            source: 'website',
          },
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
            source: 'website',
          },
        });
        console.log(
          `✅ Created rate rules for existing room: ${roomData.name}`,
        );
      } else {
        console.log(`📋 Rate rules already exist for room: ${roomData.name}`);
      }
    }
  }

  // Add room photos
  for (const room of createdRooms) {
    const existingPhotos = await prisma.roomPhoto.findFirst({
      where: { room_id: room.id },
    });

    if (!existingPhotos) {
      const photoCount = Math.floor(Math.random() * 3) + 2; // 2-4 photos per room
      for (let i = 0; i < photoCount; i++) {
        await prisma.roomPhoto.create({
          data: {
            room_id: room.id,
            image_url: `https://images.hotel-lion.com/rooms/${room.name.toLowerCase()}/photo-${i + 1}.jpg`,
            sort_order: i,
          },
        });
      }
      console.log(`📸 Added ${photoCount} photos for room ${room.name}`);
    }
  }

  // Create rate rules for different periods and sources
  const rateSources = ['Website', 'Airbnb', 'Booking.com'];
  const startDate = new Date('2025-07-01');
  const endDate = new Date('2025-12-31');

  for (const room of createdRooms) {
    for (const source of rateSources) {
      const existingRateRule = await prisma.rateRule.findFirst({
        where: {
          room_id: room.id,
          source: source,
        },
      });

      if (!existingRateRule) {
        // Different pricing strategy per source - now using premiums
        let premiumAmount = 0;
        if (source === 'Airbnb') premiumAmount = Math.round(room.base_price * 0.15); // 15% premium
        if (source === 'Booking.com') premiumAmount = Math.round(room.base_price * 0.25); // 25% premium

        await prisma.rateRule.create({
          data: {
            room_id: room.id,
            start_date: startDate,
            end_date: endDate,
            price_per_night: premiumAmount,
            min_stay_nights: source === 'Website' ? 1 : 2,
            day_of_week: [0, 1, 2, 3, 4, 5, 6], // All days
            source: source,
          },
        });
      }
    }
    console.log(`💰 Created rate rules for room ${room.name}`);
  }

  // Create sample bookings from July 1, 2025 onwards
  const guestNames = [
    'John Smith',
    'Sarah Johnson',
    'Michael Brown',
    'Emily Davis',
    'David Wilson',
    'Lisa Anderson',
    'James Taylor',
    'Maria Garcia',
    'Robert Miller',
    'Jennifer Lopez',
    'William Moore',
    'Jessica Martinez',
    'Thomas Jackson',
    'Ashley White',
    'Christopher Lee',
    'Amanda Clark',
  ];

  const emailDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'apple.com',
  ];
  const bookingSources = [
    'Website',
    'Airbnb',
    'Booking.com',
    'Phone',
    'Walk-in',
  ];

  // Generate bookings for the next 6 months
  const bookingStartDate = new Date('2025-07-01');
  const bookingEndDate = new Date('2025-12-31');

  const createdBookings: any[] = [];

  for (let i = 0; i < 50; i++) {
    // Create 50 sample bookings
    const room = createdRooms[Math.floor(Math.random() * createdRooms.length)];
    const guestName = guestNames[Math.floor(Math.random() * guestNames.length)];
    const emailDomain =
      emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const guestEmail = `${guestName.toLowerCase().replace(' ', '.')}${Math.floor(Math.random() * 100)}@${emailDomain}`;
    const source =
      bookingSources[Math.floor(Math.random() * bookingSources.length)];

    const checkInDate = getRandomDateInRange(
      bookingStartDate,
      new Date('2025-11-30'),
    );
    const stayDuration = Math.floor(Math.random() * 7) + 1; // 1-7 nights
    const checkOutDate = new Date(checkInDate);
    checkOutDate.setDate(checkOutDate.getDate() + stayDuration);

    const nightlyRate = room.base_price;
    const totalCost = nightlyRate * stayDuration;

    const status =
      Math.random() > 0.2
        ? BookingStatus.confirmed
        : Math.random() > 0.5
          ? BookingStatus.pending
          : BookingStatus.cancelled;

    const existingBooking = await prisma.booking.findFirst({
      where: {
        room_id: room.id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
      },
    });

    if (!existingBooking) {
      const booking = await prisma.booking.create({
        data: {
          room_id: room.id,
          reference_number: generateBookingReference(),
          guest_name: guestName,
          guest_contact: `+1-555-${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          guest_email: guestEmail,
          check_in_date: checkInDate,
          check_out_date: checkOutDate,
          total_cost: totalCost,
          status: status,
          source: source,
        },
      });

      createdBookings.push(booking);

      // Create payment for confirmed bookings
      if (status === BookingStatus.confirmed) {
        const paymentMethod =
          Math.random() > 0.7 ? PaymentMethod.Cash : PaymentMethod.Card;
        await prisma.payment.create({
          data: {
            booking_id: booking.id,
            amount: totalCost,
            payment_method: paymentMethod,
            identifier:
              paymentMethod === PaymentMethod.Card
                ? `card_${Math.random().toString(36).substr(2, 16)}`
                : `cash_${booking.reference_number}`,
          },
        });
      }
    }
  }

  console.log(`✅ Created ${createdBookings.length} sample bookings`);

  // Create some reviews for past bookings
  const pastBookings = createdBookings.filter(
    (b) =>
      b.status === BookingStatus.confirmed && b.check_out_date < new Date(),
  );

  const reviewComments = [
    'Excellent stay! The room was clean and comfortable.',
    'Great location and friendly staff. Will definitely return.',
    'Beautiful room with amazing city views. Highly recommended!',
    'Perfect for a business trip. Everything was as expected.',
    'Lovely boutique hotel with character. Great value for money.',
    'Outstanding service and attention to detail.',
    'Clean, comfortable, and well-located. Perfect stay!',
  ];

  for (const booking of pastBookings.slice(0, 15)) {
    // Add reviews to 15 bookings
    const existingReview = await prisma.review.findUnique({
      where: { booking_id: booking.id },
    });

    if (!existingReview) {
      const rating = Math.floor(Math.random() * 2) + 4; // 4-5 stars mostly
      const comment =
        reviewComments[Math.floor(Math.random() * reviewComments.length)];

      await prisma.review.create({
        data: {
          booking_id: booking.id,
          room_id: booking.room_id,
          rating: rating,
          comment: comment,
          is_published: Math.random() > 0.2, // 80% published
        },
      });
    }
  }

  console.log('⭐ Created sample reviews');

  // Create some blocked dates for maintenance
  const maintenanceDates = [
    new Date('2025-07-15'),
    new Date('2025-08-10'),
    new Date('2025-09-05'),
    new Date('2025-10-20'),
    new Date('2025-11-12'),
  ];

  for (const date of maintenanceDates) {
    const randomRoom =
      createdRooms[Math.floor(Math.random() * createdRooms.length)];

    const existingBlock = await prisma.blockedDate.findFirst({
      where: {
        room_id: randomRoom.id,
        blocked_date: date,
      },
    });

    if (!existingBlock) {
      await prisma.blockedDate.create({
        data: {
          room_id: randomRoom.id,
          blocked_date: date,
          notes: 'Scheduled maintenance and deep cleaning',
        },
      });
    }
  }

  console.log('🔧 Created maintenance blocked dates');

  console.log('\n🎉 Comprehensive seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Hotel: ${hotel.name}`);
  console.log(`   Users: ${users.length} (1 admin, 2 cleaning)`);
  console.log(
    `   Rooms: ${roomsData.length} (6 luxury/penthouse, 8 standard/deluxe)`,
  );
  console.log(`   Bookings: ${createdBookings.length} sample bookings`);
  console.log(`   Reviews: Up to 15 reviews created`);
  console.log(`   Rate Rules: 3 sources per room`);
  console.log(`   Photos: 2-4 per room`);
  console.log(`   Blocked Dates: 5 maintenance dates`);
  console.log('\n🔐 Login Credentials:');
  console.log('   Admin: admin@hotel-lion.com / admin123');
  console.log('   Cleaning: cleaning1@hotel-lion.com / cleaning123');
  console.log('   Cleaning: cleaning2@hotel-lion.com / cleaning123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
