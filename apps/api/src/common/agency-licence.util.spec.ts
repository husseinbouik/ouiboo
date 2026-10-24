import {
    effectiveLicenceStatus,
    getAgencyActivationBlock,
    isLicenceVerified,
} from './agency-licence.util';

const NOW = new Date('2026-10-23T12:00:00.000Z');
const FUTURE = new Date('2027-06-01T00:00:00.000Z');
const PAST = new Date('2026-01-01T00:00:00.000Z');

describe('agency licence utilities (#371)', () => {
    describe('effectiveLicenceStatus', () => {
        it('defaults to NOT_SUBMITTED when nothing was submitted', () => {
            expect(effectiveLicenceStatus({}, NOW)).toBe('NOT_SUBMITTED');
            expect(effectiveLicenceStatus({ travelLicenceStatus: null }, NOW)).toBe('NOT_SUBMITTED');
        });

        it('passes through stored statuses', () => {
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'PENDING_REVIEW' }, NOW)).toBe('PENDING_REVIEW');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'REJECTED' }, NOW)).toBe('REJECTED');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'EXPIRED' }, NOW)).toBe('EXPIRED');
        });

        it('keeps a VERIFIED licence with a future expiry verified', () => {
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: FUTURE }, NOW)).toBe('VERIFIED');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: null }, NOW)).toBe('VERIFIED');
        });

        it('derives EXPIRED for a VERIFIED licence past its expiry (check on read)', () => {
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: PAST }, NOW)).toBe('EXPIRED');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: PAST.toISOString() }, NOW)).toBe('EXPIRED');
        });
    });

    describe('isLicenceVerified', () => {
        it('is true only for an unexpired verified licence', () => {
            expect(isLicenceVerified({ travelLicenceStatus: 'VERIFIED', licenceExpiry: FUTURE }, NOW)).toBe(true);
            expect(isLicenceVerified({ travelLicenceStatus: 'VERIFIED', licenceExpiry: PAST }, NOW)).toBe(false);
            expect(isLicenceVerified({ travelLicenceStatus: 'PENDING_REVIEW' }, NOW)).toBe(false);
        });
    });

    describe('getAgencyActivationBlock', () => {
        it('blocks when identity is not verified, whatever the licence state', () => {
            expect(getAgencyActivationBlock({ verificationStatus: 'PENDING', travelLicenceStatus: 'VERIFIED' }, NOW))
                .toMatch(/identity must be verified/i);
            expect(getAgencyActivationBlock({ verificationStatus: 'REJECTED', travelLicenceStatus: 'VERIFIED' }, NOW))
                .toMatch(/identity must be verified/i);
        });

        it('blocks a verified-identity agency without a verified licence', () => {
            expect(getAgencyActivationBlock({ verificationStatus: 'VERIFIED', travelLicenceStatus: 'NOT_SUBMITTED' }, NOW))
                .toMatch(/licence must be submitted and verified/i);
            expect(getAgencyActivationBlock({ verificationStatus: 'VERIFIED', travelLicenceStatus: 'PENDING_REVIEW' }, NOW))
                .toMatch(/licence must be submitted and verified/i);
            expect(getAgencyActivationBlock({ verificationStatus: 'VERIFIED', travelLicenceStatus: 'REJECTED' }, NOW))
                .toMatch(/licence must be submitted and verified/i);
        });

        it('blocks a verified agency whose licence has expired', () => {
            expect(getAgencyActivationBlock(
                { verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', licenceExpiry: PAST }, NOW,
            )).toMatch(/licence has expired/i);
        });

        it('allows a verified agency with a verified, unexpired licence', () => {
            expect(getAgencyActivationBlock(
                { verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', licenceExpiry: FUTURE }, NOW,
            )).toBeNull();
            expect(getAgencyActivationBlock(
                { verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', licenceExpiry: null }, NOW,
            )).toBeNull();
        });
    });
});
