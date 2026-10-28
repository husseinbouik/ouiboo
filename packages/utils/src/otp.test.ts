import { distributeOtpInput } from './otp';

const empty = () => ['', '', '', '', '', ''];

describe('distributeOtpInput (#492)', () => {
    it('returns null when the value carries no digit', () => {
        expect(distributeOtpInput(empty(), 0, '')).toBeNull();
        expect(distributeOtpInput(empty(), 0, 'abc')).toBeNull();
    });

    it('writes a single typed digit and advances focus', () => {
        const result = distributeOtpInput(empty(), 0, '5');
        expect(result?.code).toEqual(['5', '', '', '', '', '']);
        expect(result?.nextFocusIndex).toBe(1);
    });

    it('overwrites the digit in a filled box', () => {
        const current = ['1', '2', '', '', '', ''];
        const result = distributeOtpInput(current, 1, '9');
        expect(result?.code).toEqual(['1', '9', '', '', '', '']);
        expect(result?.nextFocusIndex).toBe(2);
    });

    it('keeps focus on the last box when typing there', () => {
        const current = ['1', '2', '3', '4', '5', ''];
        const result = distributeOtpInput(current, 5, '6');
        expect(result?.code).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(result?.nextFocusIndex).toBe(5);
    });

    it('distributes a full autofill/paste from the first box', () => {
        const result = distributeOtpInput(empty(), 0, '123456');
        expect(result?.code).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(result?.nextFocusIndex).toBe(5);
    });

    it('distributes a partial paste from a middle box', () => {
        const current = ['1', '2', '', '', '', ''];
        const result = distributeOtpInput(current, 2, '345');
        expect(result?.code).toEqual(['1', '2', '3', '4', '5', '']);
        expect(result?.nextFocusIndex).toBe(5);
    });

    it('drops digits that would run past the last box', () => {
        const current = ['1', '2', '3', '4', '', ''];
        const result = distributeOtpInput(current, 4, '5678');
        expect(result?.code).toEqual(['1', '2', '3', '4', '5', '6']);
        expect(result?.nextFocusIndex).toBe(5);
    });

    it('strips non-digit characters before distributing', () => {
        const result = distributeOtpInput(empty(), 0, '12-34 56');
        expect(result?.code).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('does not mutate the current code array', () => {
        const current = empty();
        distributeOtpInput(current, 0, '123456');
        expect(current).toEqual(['', '', '', '', '', '']);
    });
});
