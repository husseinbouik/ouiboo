import { deriveDestinationSlug, isDestinationSlug } from './destinations.util';

describe('destination taxonomy (#675)', () => {
    it('derives slugs from startLocation in EN/FR/AR and local spellings', () => {
        expect(deriveDestinationSlug('Tangier, Morocco')).toBe('tangier');
        expect(deriveDestinationSlug('Tanger')).toBe('tangier');
        expect(deriveDestinationSlug('Tétouan — départ médina')).toBe('tetouan');
        expect(deriveDestinationSlug('Tetuan, Morocco')).toBe('tetouan');
        expect(deriveDestinationSlug('Chefchaouen old town')).toBe('chefchaouen');
        expect(deriveDestinationSlug('Chaouen')).toBe('chefchaouen');
        expect(deriveDestinationSlug('الانطلاق من طنجة')).toBe('tangier');
        expect(deriveDestinationSlug('شفشاون')).toBe('chefchaouen');
    });

    it('returns null outside the configured cluster', () => {
        expect(deriveDestinationSlug('Marrakech')).toBeNull();
        expect(deriveDestinationSlug('Casablanca')).toBeNull();
        expect(deriveDestinationSlug('')).toBeNull();
        expect(deriveDestinationSlug(null)).toBeNull();
    });

    it('validates slugs against the configuration (exactly 3)', () => {
        expect(isDestinationSlug('tangier')).toBe(true);
        expect(isDestinationSlug('tetouan')).toBe(true);
        expect(isDestinationSlug('chefchaouen')).toBe(true);
        expect(isDestinationSlug('marrakech')).toBe(false);
        expect(isDestinationSlug('')).toBe(false);
        expect(isDestinationSlug(undefined)).toBe(false);
    });
});
