#!/usr/bin/env node
/**
 * Staging seed data — realistic Moroccan trips for testing.
 *
 * Creates a demo agency (verified) with 12 trips across all categories,
 * each with sessions, itinerary, and images.
 *
 * ⚠️  STAGING ONLY — never run against production.
 * Idempotent: skips if seed data already exists.
 *
 * Usage: DATABASE_URL=... node apps/api/prisma/seed-staging.js
 */

const bcrypt = require('bcrypt');
const { PrismaClient } = require('../../packages/database/generated-client');

const prisma = new PrismaClient();

const SEED_MARKER = 'staging-seed-v1';

const DEMO_AGENCY = {
  email: 'demo-agency@ouiboo-staging.local',
  name: 'Atlas Adventures',
  companyName: 'Atlas Adventures SARL',
};

// Unsplash images of Morocco (stable URLs)
const IMG = {
  marrakech: 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=1200&auto=format&fit=crop',
  sahara: 'https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=1200&auto=format&fit=crop',
  atlas: 'https://images.unsplash.com/photo-1489493585363-d69421e0edd3?q=80&w=1200&auto=format&fit=crop',
  chefchaouen: 'https://images.unsplash.com/photo-1553603227-2358aabe821e?q=80&w=1200&auto=format&fit=crop',
  essaouira: 'https://images.unsplash.com/photo-1569383746724-6f1b882b8f46?q=80&w=1200&auto=format&fit=crop',
  fes: 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=1200&auto=format&fit=crop',
};

const TRIPS = [
  {
    title: 'Marrakech Medina Discovery',
    description: 'Wander through the vibrant souks, historic palaces, and hidden riads of the Red City with a local guide.',
    category: 'CULTURAL',
    startLocation: 'Marrakech',
    endLocation: 'Marrakech',
    durationDays: 3, durationNights: 2,
    price: 1800, sessions: 3,
    images: [IMG.marrakech],
    inclusions: ['Local guide', 'Riad accommodation', 'Daily breakfast', 'Medina walking tour'],
    exclusions: ['Flights', 'Lunches and dinners', 'Personal expenses'],
  },
  {
    title: 'Sahara Desert Luxury Camp',
    description: 'Sleep under a blanket of stars in a luxury Berber camp deep in the Erg Chebbi dunes.',
    category: 'LUXURY',
    startLocation: 'Merzouga',
    endLocation: 'Merzouga',
    durationDays: 2, durationNights: 1,
    price: 3500, sessions: 2,
    images: [IMG.sahara],
    inclusions: ['Luxury tent', 'Camel trek at sunset', 'Traditional dinner', '4x4 transfers'],
    exclusions: ['Flights to Errachidia', 'Travel insurance', 'Tips'],
  },
  {
    title: 'Atlas Mountains Trek',
    description: 'Challenge yourself on a guided trek through Berber villages and up to panoramic mountain passes.',
    category: 'ADVENTURE',
    startLocation: 'Imlil',
    endLocation: 'Imlil',
    durationDays: 4, durationNights: 3,
    price: 2200, sessions: 2,
    images: [IMG.atlas],
    inclusions: ['Mountain guide', 'Mule support', 'Guesthouse stays', 'All meals on trek'],
    exclusions: ['Hiking gear rental', 'Flights', 'Personal expenses'],
  },
  {
    title: 'Chefchaouen Blue City Day Trip',
    description: 'Get lost in the blue-washed streets of Morocco\'s most photogenic mountain town.',
    category: 'CULTURAL',
    startLocation: 'Fes',
    endLocation: 'Fes',
    durationDays: 1, durationNights: 0,
    price: 650, sessions: 4,
    images: [IMG.chefchaouen],
    inclusions: ['Transport', 'Local guide', 'Plaza Uta el-Hammam visit'],
    exclusions: ['Meals', 'Entrance fees', 'Shopping'],
  },
  {
    title: 'Essaouira Coastal Escape',
    description: 'Seafood, surf, and sunsets in Morocco\'s laid-back Atlantic port city.',
    category: 'NATURE',
    startLocation: 'Essaouira',
    endLocation: 'Essaouira',
    durationDays: 2, durationNights: 1,
    price: 1200, sessions: 3,
    images: [IMG.essaouira],
    inclusions: ['Beachfront hotel', 'Seafood dinner', 'Medina tour', 'Sunset sailing'],
    exclusions: ['Surf lessons', 'Flights', 'Lunches'],
  },
  {
    title: 'Fes Imperial City Tour',
    description: 'Step back in time in the world\'s oldest living medieval city with artisan workshops and ancient madrasas.',
    category: 'CULTURAL',
    startLocation: 'Fes',
    endLocation: 'Fes',
    durationDays: 3, durationNights: 2,
    price: 1600, sessions: 2,
    images: [IMG.fes],
    inclusions: ['Riad stay', 'Expert guide', 'Tannery visit', 'Cooking class'],
    exclusions: ['Flights', 'Some meals', 'Personal shopping'],
  },
  {
    title: 'Agafay Desert Sunset Experience',
    description: 'Dune buggies, camel rides, and dinner under the stars — just 40 minutes from Marrakech.',
    category: 'ADVENTURE',
    startLocation: 'Marrakech',
    endLocation: 'Marrakech',
    durationDays: 1, durationNights: 0,
    price: 850, sessions: 5,
    images: [IMG.sahara],
    inclusions: ['4x4 transport', 'Camel ride', 'Sunset dinner', 'Traditional music'],
    exclusions: ['Quad biking (optional)', 'Drinks', 'Tips'],
  },
  {
    title: 'Dades Valley & Todra Gorges',
    description: 'Drive the Road of a Thousand Kasbahs through dramatic canyons and palm-filled valleys.',
    category: 'NATURE',
    startLocation: 'Ouarzazate',
    endLocation: 'Ouarzazate',
    durationDays: 3, durationNights: 2,
    price: 1900, sessions: 2,
    images: [IMG.atlas],
    inclusions: ['4x4 with driver', 'Kasbah stays', 'Gorge hike', 'All breakfasts'],
    exclusions: ['Flights', 'Dinners', 'Entrance fees'],
  },
  {
    title: 'Ourika Valley Waterfalls Hike',
    description: 'A refreshing day trip from Marrakech to cascading waterfalls and Berber villages.',
    category: 'NATURE',
    startLocation: 'Marrakech',
    endLocation: 'Marrakech',
    durationDays: 1, durationNights: 0,
    price: 450, sessions: 6,
    images: [IMG.atlas],
    inclusions: ['Transport', 'Local mountain guide', 'Mint tea with Berber family'],
    exclusions: ['Lunch', 'Waterfall entrance', 'Tips'],
  },
  {
    title: 'Casablanca & Rabat Heritage',
    description: 'Two imperial cities in two days — Hassan II Mosque, Art Deco boulevards, and the Kasbah of the Udayas.',
    category: 'BUDGET',
    startLocation: 'Casablanca',
    endLocation: 'Rabat',
    durationDays: 2, durationNights: 1,
    price: 950, sessions: 3,
    images: [IMG.marrakech],
    inclusions: ['3-star hotel', 'City guides', 'Train between cities', 'Mosque visit'],
    exclusions: ['Flights', 'Meals', 'Personal expenses'],
  },
  {
    title: 'Merzouga Camel Trek & Night in Dunes',
    description: 'The classic Sahara experience — ride into the dunes as the sun sets and sleep in a desert bivouac.',
    category: 'ADVENTURE',
    startLocation: 'Merzouga',
    endLocation: 'Merzouga',
    durationDays: 2, durationNights: 1,
    price: 1400, sessions: 3,
    images: [IMG.sahara],
    inclusions: ['Camel trek', 'Desert bivouac', 'Sandboarding', 'All desert meals'],
    exclusions: ['Transport to Merzouga', 'Sleeping bag', 'Insurance'],
  },
  {
    title: 'Blue Pearl Photography Tour',
    description: 'A photographer-led deep dive into Chefchaouen\'s most stunning corners, from sunrise to blue hour.',
    category: 'CULTURAL',
    startLocation: 'Chefchaouen',
    endLocation: 'Chefchaouen',
    durationDays: 2, durationNights: 1,
    price: 1100, sessions: 2,
    images: [IMG.chefchaouen],
    inclusions: ['Photography guide', 'Guesthouse', 'Sunrise shoot', 'Editing workshop'],
    exclusions: ['Camera rental', 'Flights', 'Meals'],
  },
];

async function main() {
  console.log('🌱 Staging seed starting...');

  // Safety: refuse to run on production
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('prod') || dbUrl.includes('production')) {
    throw new Error('⛔ Refusing to seed — DATABASE_URL looks like production!');
  }

  // Check if already seeded
  const existing = await prisma.tripTemplate.findFirst({
    where: { description: { contains: SEED_MARKER } },
  });
  if (existing) {
    console.log('✅ Seed data already exists, skipping.');
    return;
  }

  // Create or find demo agency
  const password = await bcrypt.hash('staging-demo-123', 10);
  let user = await prisma.user.findUnique({ where: { email: DEMO_AGENCY.email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: DEMO_AGENCY.email,
        name: DEMO_AGENCY.name,
        password,
        role: 'AGENCY',
        isEmailVerified: true,
      },
    });
    console.log(`  Created agency user: ${user.email}`);
  }

  let profile = await prisma.agencyProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.agencyProfile.create({
      data: {
        userId: user.id,
        companyName: DEMO_AGENCY.companyName,
        ice: 'STAGING001',
        patente: 'STAGING001',
        rib: 'STAGING-RIB-001',
        verificationStatus: 'VERIFIED',
        bio: 'Demo agency for staging testing. Showcasing the best of Morocco.',
        bankDetails: JSON.stringify({ bank: 'Demo Bank', rib: 'STAGING-RIB-001' }),
      },
    });
    console.log(`  Created verified agency profile`);
  }

  // Create trips
  let tripCount = 0;
  for (const trip of TRIPS) {
    const template = await prisma.tripTemplate.create({
      data: {
        agencyId: profile.id,
        title: trip.title,
        description: `${trip.description}\n\n[${SEED_MARKER}]`,
        category: trip.category,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        durationDays: trip.durationDays,
        durationNights: trip.durationNights,
        inclusions: trip.inclusions,
        exclusions: trip.exclusions,
        checklist: ['Passport or CIN', 'Comfortable shoes', 'Sunscreen'],
        images: trip.images,
        status: 'ACTIVE',
        featured: tripCount < 3,
        currency: 'MAD',
        startingPrice: trip.price,
        itinerary: {
          create: Array.from({ length: trip.durationDays }, (_, i) => ({
            dayNumber: i + 1,
            title: `Day ${i + 1}`,
            description: `Explore and enjoy day ${i + 1} of your ${trip.title.toLowerCase()} adventure.`,
            activities: ['Guided tour', 'Free time', 'Local cuisine'],
          })),
        },
      },
    });

    // Create sessions (future dates)
    for (let s = 0; s < trip.sessions; s++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 14 + s * 21);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + trip.durationDays);

      await prisma.tripSession.create({
        data: {
          templateId: template.id,
          currency: 'MAD',
          startDate,
          endDate,
          price: trip.price,
          totalSeats: 20,
          availableSeats: 20 - s * 3,
          status: 'OPEN',
        },
      });
    }

    tripCount++;
    console.log(`  ✓ ${trip.title}`);
  }

  console.log(`\n🎉 Seeded ${tripCount} trips with sessions.`);
  console.log(`   Demo agency: ${DEMO_AGENCY.email} / staging-demo-123`);
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
