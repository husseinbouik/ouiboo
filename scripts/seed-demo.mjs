import 'dotenv/config';
import bcrypt from 'bcrypt';
import {
  PrismaClient,
  UserRole,
  VerificationStatus,
  TripCategory,
  TripStatus,
  SessionStatus,
  BookingStatus,
  BookingPaymentStatus,
  PaymentMethod,
  TransactionType,
} from '../packages/database/generated-client/index.js';

const prisma = new PrismaClient();

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Password123!';
const hashPassword = () => bcrypt.hash(DEMO_PASSWORD, 10);

async function upsertUser({ email, name, role }) {
  const password = await hashPassword();
  return prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      isEmailVerified: true,
      password,
    },
    create: {
      email,
      name,
      role,
      password,
      isEmailVerified: true,
    },
  });
}

async function main() {
  const [admin, traveler, agencyUser] = await Promise.all([
    upsertUser({ email: 'admin@ouiboo.demo', name: 'Ouiboo Admin', role: UserRole.ADMIN }),
    upsertUser({ email: 'traveler@ouiboo.demo', name: 'Demo Traveler', role: UserRole.TRAVELER }),
    upsertUser({ email: 'agency@ouiboo.demo', name: 'Atlas Demo Agency', role: UserRole.AGENCY }),
  ]);

  const agency = await prisma.agencyProfile.upsert({
    where: { userId: agencyUser.id },
    update: {
      companyName: 'Atlas Demo Agency',
      verificationStatus: VerificationStatus.VERIFIED,
      bio: 'Curated Morocco trips for launch demos.',
      bankDetails: 'Demo bank account for payout testing',
    },
    create: {
      userId: agencyUser.id,
      companyName: 'Atlas Demo Agency',
      ice: '123456789012345',
      patente: 'DEMO-PATENTE',
      rib: '123456789012345678901234',
      verificationStatus: VerificationStatus.VERIFIED,
      bio: 'Curated Morocco trips for launch demos.',
      bankDetails: 'Demo bank account for payout testing',
    },
  });

  const template = await prisma.tripTemplate.upsert({
    where: { id: 'demo-trip-sahara' },
    update: {
      agencyId: agency.id,
      title: 'Sahara Weekend Escape',
      status: TripStatus.ACTIVE,
      featured: true,
    },
    create: {
      id: 'demo-trip-sahara',
      agencyId: agency.id,
      title: 'Sahara Weekend Escape',
      description: 'A launch-ready demo trip with transport, guide, camp stay, and desert activities.',
      category: TripCategory.ADVENTURE,
      startLocation: 'Marrakech, Morocco',
      durationDays: 3,
      durationNights: 2,
      inclusions: ['Transport', 'Guide', 'Camp stay', 'Breakfast'],
      exclusions: ['Flights', 'Personal expenses'],
      checklist: ['Passport', 'Comfortable shoes', 'Warm evening layer'],
      images: ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee'],
      status: TripStatus.ACTIVE,
      featured: true,
      itinerary: {
        create: [
          { dayNumber: 1, title: 'Marrakech to desert camp', description: 'Transfer through the Atlas route.', activities: ['Pickup', 'Scenic stops', 'Camp dinner'] },
          { dayNumber: 2, title: 'Desert activities', description: 'Guided dunes and cultural stops.', activities: ['Camel ride', 'Local lunch', 'Sunset'] },
          { dayNumber: 3, title: 'Return to Marrakech', description: 'Breakfast and transfer back.', activities: ['Breakfast', 'Return transfer'] },
        ],
      },
    },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 21);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 3);

  const session = await prisma.tripSession.upsert({
    where: { id: 'demo-session-sahara' },
    update: {
      startDate,
      endDate,
      price: '1200.00',
      deposit: '300.00',
      totalSeats: 20,
      availableSeats: 18,
      status: SessionStatus.OPEN,
    },
    create: {
      id: 'demo-session-sahara',
      templateId: template.id,
      startDate,
      endDate,
      price: '1200.00',
      deposit: '300.00',
      totalSeats: 20,
      availableSeats: 18,
      status: SessionStatus.OPEN,
    },
  });

  const booking = await prisma.booking.upsert({
    where: { id: 'demo-booking-confirmed' },
    update: {
      status: BookingStatus.CONFIRMED,
      paymentStatus: BookingPaymentStatus.PAID,
      totalAmount: '2400.00',
      guestsCount: 2,
      confirmedAt: new Date(),
    },
    create: {
      id: 'demo-booking-confirmed',
      sessionId: session.id,
      travelerId: traveler.id,
      status: BookingStatus.CONFIRMED,
      paymentStatus: BookingPaymentStatus.PAID,
      paymentMethod: PaymentMethod.GATEWAY,
      totalAmount: '2400.00',
      guestsCount: 2,
      fullName: traveler.name,
      phoneNumber: '+212600000000',
      confirmedAt: new Date(),
    },
  });

  const wallet = await prisma.wallet.upsert({
    where: { agencyId: agency.id },
    update: {
      availableBalance: '2400.00',
      pendingBalance: '0.00',
    },
    create: {
      agencyId: agency.id,
      availableBalance: '2400.00',
      pendingBalance: '0.00',
    },
  });

  await prisma.paymentTransaction.upsert({
    where: { id: 'demo-payment-transaction' },
    update: {
      amount: '2400.00',
      status: 'SUCCESS',
      provider: 'DEMO',
    },
    create: {
      id: 'demo-payment-transaction',
      bookingId: booking.id,
      amount: '2400.00',
      method: PaymentMethod.GATEWAY,
      transactionId: 'demo-gateway-transaction',
      status: 'SUCCESS',
      provider: 'DEMO',
      metadata: { seeded: true },
    },
  });

  await prisma.walletTransaction.upsert({
    where: { id: 'demo-wallet-transaction' },
    update: {
      amount: '2400.00',
      type: TransactionType.BOOKING,
      reason: 'Demo confirmed booking revenue',
    },
    create: {
      id: 'demo-wallet-transaction',
      walletId: wallet.id,
      amount: '2400.00',
      type: TransactionType.BOOKING,
      reason: 'Demo confirmed booking revenue',
      referenceId: booking.id,
    },
  });

  console.log(JSON.stringify({
    password: DEMO_PASSWORD,
    accounts: {
      admin: admin.email,
      agency: agencyUser.email,
      traveler: traveler.email,
    },
    demoTripId: template.id,
    demoSessionId: session.id,
    demoBookingId: booking.id,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
