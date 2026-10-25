import {
    canOrganise,
    effectiveInsuranceStatus,
    effectiveLicenceStatus,
    getAgencyActivationBlock,
    getAgencyInsuranceBlock,
    isInsuranceVerified,
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
        });

        it('does NOT treat a VERIFIED licence with no expiry as verified forever (#415)', () => {
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: null }, NOW)).toBe('PENDING_REVIEW');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED' }, NOW)).toBe('PENDING_REVIEW');
            expect(effectiveLicenceStatus({ travelLicenceStatus: 'VERIFIED', licenceExpiry: 'not-a-date' }, NOW)).toBe('PENDING_REVIEW');
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
            expect(isLicenceVerified({ travelLicenceStatus: 'VERIFIED', licenceExpiry: null }, NOW)).toBe(false);
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
        });

        it('blocks a verified agency whose VERIFIED licence has no expiry on file (#415)', () => {
            expect(getAgencyActivationBlock(
                { verificationStatus: 'VERIFIED', travelLicenceStatus: 'VERIFIED', licenceExpiry: null }, NOW,
            )).toMatch(/licence must be submitted and verified/i);
        });
    });

    describe('effectiveInsuranceStatus (#415)', () => {
        it('defaults to NOT_SUBMITTED and passes stored statuses through', () => {
            expect(effectiveInsuranceStatus({}, NOW)).toBe('NOT_SUBMITTED');
            expect(effectiveInsuranceStatus({ insuranceStatus: 'PENDING_REVIEW' }, NOW)).toBe('PENDING_REVIEW');
            expect(effectiveInsuranceStatus({ insuranceStatus: 'REJECTED' }, NOW)).toBe('REJECTED');
        });

        it('keeps VERIFIED insurance with a future expiry verified', () => {
            expect(effectiveInsuranceStatus({ insuranceStatus: 'VERIFIED', insuranceExpiry: FUTURE }, NOW)).toBe('VERIFIED');
            expect(isInsuranceVerified({ insuranceStatus: 'VERIFIED', insuranceExpiry: FUTURE }, NOW)).toBe(true);
        });

        it('derives EXPIRED for VERIFIED insurance past its expiry', () => {
            expect(effectiveInsuranceStatus({ insuranceStatus: 'VERIFIED', insuranceExpiry: PAST }, NOW)).toBe('EXPIRED');
            expect(isInsuranceVerified({ insuranceStatus: 'VERIFIED', insuranceExpiry: PAST }, NOW)).toBe(false);
        });

        it('does NOT treat VERIFIED insurance with no expiry as verified forever', () => {
            expect(effectiveInsuranceStatus({ insuranceStatus: 'VERIFIED', insuranceExpiry: null }, NOW)).toBe('PENDING_REVIEW');
            expect(isInsuranceVerified({ insuranceStatus: 'VERIFIED', insuranceExpiry: null }, NOW)).toBe(false);
        });
    });

    describe('getAgencyInsuranceBlock (#415)', () => {
        it('is null for verified, unexpired insurance', () => {
            expect(getAgencyInsuranceBlock({ insuranceStatus: 'VERIFIED', insuranceExpiry: FUTURE }, NOW)).toBeNull();
        });

        it('blocks missing, pending, rejected, and expired insurance', () => {
            expect(getAgencyInsuranceBlock({ insuranceStatus: 'NOT_SUBMITTED' }, NOW)).toMatch(/must be submitted and verified/i);
            expect(getAgencyInsuranceBlock({ insuranceStatus: 'PENDING_REVIEW' }, NOW)).toMatch(/must be submitted and verified/i);
            expect(getAgencyInsuranceBlock({ insuranceStatus: 'VERIFIED', insuranceExpiry: null }, NOW)).toMatch(/must be submitted and verified/i);
            expect(getAgencyInsuranceBlock({ insuranceStatus: 'VERIFIED', insuranceExpiry: PAST }, NOW)).toMatch(/has expired/i);
        });
    });

    describe('canOrganise (#415)', () => {
        it('allows only ODV agencies to organise', () => {
            expect(canOrganise({ travelLicenceType: 'ODV' })).toBe(true);
            expect(canOrganise({ travelLicenceType: 'DV' })).toBe(false);
            expect(canOrganise({ travelLicenceType: null })).toBe(false);
            expect(canOrganise({})).toBe(false);
        });
    });
});
