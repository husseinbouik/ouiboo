type TripTemplateFixtureInput = {
    agencyId: string;
    title?: string;
    description?: string;
    category?: 'ADVENTURE' | 'CULTURAL' | 'LUXURY' | 'BUDGET';
    startLocation?: string;
    durationDays?: number;
    durationNights?: number;
    inclusions?: string[];
    exclusions?: string[];
    checklist?: string[];
    images?: string[];
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    [key: string]: unknown;
};

export function tripTemplateFixture(overrides: TripTemplateFixtureInput) {
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

