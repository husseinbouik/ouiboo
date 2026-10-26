import { AgencyProfileSchema } from '@ouiboo/schemas';

const ribField = AgencyProfileSchema.shape.rib;

describe('AgencyProfileSchema rib validation', () => {
    it('accepts a valid 24-character Moroccan RIB (2 letters + 22 digits)', () => {
        const result = ribField.safeParse('MA6400010001000100010001');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('MA6400010001000100010001');
        }
    });

    it('accepts a valid RIB with spaces and normalizes it', () => {
        const result = ribField.safeParse('MA64 0001 0001 0001 0001 0001');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('MA6400010001000100010001');
        }
    });

    it('accepts a valid lowercase RIB and normalizes it to uppercase', () => {
        const result = ribField.safeParse('ma6400010001000100010001');
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toBe('MA6400010001000100010001');
        }
    });

    it('rejects a RIB that is too short', () => {
        expect(ribField.safeParse('MA640001000100010001').success).toBe(false);
    });

    it('rejects a RIB that is too long', () => {
        expect(ribField.safeParse('MA64000100010001000100012').success).toBe(false);
    });

    it('rejects non-alphanumeric characters', () => {
        expect(ribField.safeParse('MA640001000100010001000!').success).toBe(false);
        expect(ribField.safeParse('M@6400010001000100010001').success).toBe(false);
    });

    it('rejects a digits-only value with no country code', () => {
        expect(ribField.safeParse('640001000100010001000100').success).toBe(false);
    });

    it('rejects a value with a digit where a letter is required', () => {
        expect(ribField.safeParse('6A6400010001000100010001').success).toBe(false);
    });
});
