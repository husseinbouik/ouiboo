import type { Prisma } from '@ouiboo/database';

type TripTemplateFixtureInput = Pick<Prisma.TripTemplateUncheckedCreateInput, 'agencyId'>
    & Partial<Prisma.TripTemplateUncheckedCreateInput>;

export function tripTemplateFixture(
    overrides: TripTemplateFixtureInput,
): Prisma.TripTemplateUncheckedCreateInput {
    return {
        title: 'Demo Trip',
        description: 'A production-shaped test trip',
        category: 'ADVENTURE',
        startLocation: 'Marrakech, Morocco',
        durationDays: 3,
        durationNights: 2,
        inclusions: [],
        exclusions: [],
        checklist: [],
        images: [],
        status: 'ACTIVE',
        ...overrides,
    };
}

