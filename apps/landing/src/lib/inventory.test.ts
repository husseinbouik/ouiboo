import type { DestinationInventory } from '@ouiboo/types';
import { interpolate, liveCategoryPaths, tripFromPrice } from './inventory';

/**
 * #685 (Council S6): Layer B helpers — interpolation for the locale
 * templates, the from-price derivation, and the category gate that
 * decides which category×city children exist.
 */
const inventory: DestinationInventory = {
    slug: 'tangier',
    tripCount: 3,
    agencyCount: 2,
    reviewCount: 7,
    averageRating: 4.6,
    categories: [
        { category: 'ADVENTURE', tripCount: 2 },
        { category: 'CULTURAL', tripCount: 1 },
        { category: 'LUXURY', tripCount: 0 },
    ],
    trips: [],
};

describe('Layer B inventory helpers (#685)', () => {
    it('interpolates {{placeholders}} and blanks unknown ones', () => {
        expect(interpolate('{{count}} trips in {{city}}', { count: 3, city: 'Tangier' })).toBe('3 trips in Tangier');
        expect(interpolate('{{missing}}', {})).toBe('');
    });

    it('derives the from-price from startingPrice, else the first session', () => {
        expect(tripFromPrice({ id: 'a', title: 'A', category: 'ADVENTURE', currency: 'MAD', startingPrice: '450.00' })).toBe('450 MAD');
        expect(tripFromPrice({ id: 'b', title: 'B', category: 'ADVENTURE', currency: 'MAD', startingPrice: null, sessions: [{ price: 300 }] })).toBe('300 MAD');
        expect(tripFromPrice({ id: 'c', title: 'C', category: 'ADVENTURE', currency: 'MAD' })).toBeNull();
    });

    it('gates category children on live inventory cells only', () => {
        expect(liveCategoryPaths('tangier', inventory)).toEqual([
            '/guides/tangier/adventure',
            '/guides/tangier/cultural',
        ]);
        expect(liveCategoryPaths('tangier', null)).toEqual([]);
        expect(liveCategoryPaths('tangier', { ...inventory, categories: [] })).toEqual([]);
    });
});
