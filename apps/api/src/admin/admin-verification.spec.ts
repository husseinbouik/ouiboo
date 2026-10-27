import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

/**
 * #415: hardened admin verification endpoints — licence verify requires
 * the document, a Ministry-check attestation, and a present/future
 * expiry; insurance verify mirrors the same evidence rules.
 */
describe('AdminController agency verification (#415)', () => {
    const future = new Date(Date.now() + 365 * 24 * 3600 * 1000);
    const past = new Date(Date.now() - 24 * 3600 * 1000);
    const req = { user: { userId: 'admin-1', email: 'admin@example.com' } };

    const createController = (agency: any) => {
        const db = {
            agencyProfile: {
                findUnique: jest.fn().mockResolvedValue(agency),
                update: jest.fn().mockImplementation(async (args: any) => ({ id: 'agency-1', ...args.data })),
            },
        };
        const auditLogService = { log: jest.fn().mockResolvedValue(undefined) };
        const controller = new AdminController(
            db as any,
            {} as any,
            {} as any,
            {} as any,
            auditLogService as any,
            {} as any,
        );
        return { db, auditLogService, controller };
    };

    const completeLicence = {
        id: 'agency-1',
        travelLicenceType: 'ODV',
        travelLicenceNumber: 'AV-2024-0187',
        travelLicenceStatus: 'PENDING_REVIEW',
        licenceExpiry: future,
        licenceIssuedAt: new Date('2024-03-15T00:00:00.000Z'),
        licenceIssuingAuthority: 'Ministère du Tourisme',
        licenceDocumentKey: 'private/user-9/licence.pdf',
    };

    const completeInsurance = {
        id: 'agency-1',
        insuranceInsurer: 'AXA Assurance Maroc',
        insurancePolicyNumber: 'RC-2026-00421',
        insuranceInsuredName: 'Atlas Adventures SARL',
        insuranceExpiry: future,
        insuranceCertificateKey: 'private/user-9/rc.pdf',
    };

    describe('verifyAgencyLicence', () => {
        it('rejects an invalid status and an unknown agency', async () => {
            const { controller } = createController(completeLicence);
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'PENDING_REVIEW' as any }))
                .rejects.toBeInstanceOf(BadRequestException);

            const { controller: missing } = createController(null);
            await expect(missing.verifyAgencyLicence(req, 'nope', { status: 'REJECTED' }))
                .rejects.toThrow(/agency not found/i);
        });

        it('refuses VERIFIED without a licence document', async () => {
            const { controller } = createController({ ...completeLicence, licenceDocumentKey: null });
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/licence document/i);
        });

        it('refuses VERIFIED without a licence type', async () => {
            const { controller } = createController({ ...completeLicence, travelLicenceType: null });
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/licence type/i);
        });

        it('refuses VERIFIED with a missing or past expiry', async () => {
            const { controller: noExpiry } = createController({ ...completeLicence, licenceExpiry: null });
            await expect(noExpiry.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/expiry is required/i);

            const { controller: expired } = createController({ ...completeLicence, licenceExpiry: past });
            await expect(expired.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/already expired/i);
        });

        it('refuses VERIFIED without the licence issue date (B4)', async () => {
            const { controller } = createController({ ...completeLicence, licenceIssuedAt: null });
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/issue date is required/i);
        });

        it('refuses VERIFIED without the licence issuing authority (B4)', async () => {
            const { controller } = createController({ ...completeLicence, licenceIssuingAuthority: null });
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/issuing authority is required/i);

            const { controller: blank } = createController({ ...completeLicence, licenceIssuingAuthority: '   ' });
            await expect(blank.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true }))
                .rejects.toThrow(/issuing authority is required/i);
        });

        it('refuses VERIFIED without the Ministry-check attestation', async () => {
            const { controller } = createController(completeLicence);
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED' }))
                .rejects.toThrow(/ministry/i);
            await expect(controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: false }))
                .rejects.toThrow(/ministry/i);
        });

        it('verifies a complete licence and stamps the Ministry check', async () => {
            const { db, auditLogService, controller } = createController(completeLicence);

            await controller.verifyAgencyLicence(req, 'agency-1', { status: 'VERIFIED', ministryChecked: true });

            const update = db.agencyProfile.update.mock.calls[0][0];
            expect(update.data.travelLicenceStatus).toBe('VERIFIED');
            expect(update.data.licenceVerifiedAt).toBeInstanceOf(Date);
            expect(update.data.licenceMinistryCheckedAt).toBeInstanceOf(Date);
            expect(update.data.licenceMinistryCheckedBy).toBe('admin-1');
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'AGENCY_LICENCE_VERIFIED',
                metadata: expect.objectContaining({ ministryChecked: true, licenceDocumentKey: 'private/user-9/licence.pdf' }),
            }));
        });

        it('rejects a licence with a reason and no Ministry stamp', async () => {
            const { db, auditLogService, controller } = createController(completeLicence);

            await controller.verifyAgencyLicence(req, 'agency-1', { status: 'REJECTED', reason: 'Number not on the Ministry list' });

            const update = db.agencyProfile.update.mock.calls[0][0];
            expect(update.data.travelLicenceStatus).toBe('REJECTED');
            expect(update.data.licenceRejectionReason).toBe('Number not on the Ministry list');
            expect(update.data.licenceMinistryCheckedAt).toBeNull();
            expect(update.data.licenceMinistryCheckedBy).toBeNull();
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AGENCY_LICENCE_REJECTED' }));
        });
    });

    describe('verifyAgencyInsurance', () => {
        it('rejects an invalid status and an unknown agency', async () => {
            const { controller } = createController(completeInsurance);
            await expect(controller.verifyAgencyInsurance(req, 'agency-1', { status: 'EXPIRED' as any }))
                .rejects.toBeInstanceOf(BadRequestException);

            const { controller: missing } = createController(null);
            await expect(missing.verifyAgencyInsurance(req, 'nope', { status: 'VERIFIED' }))
                .rejects.toThrow(/agency not found/i);
        });

        it('refuses VERIFIED without a certificate or an insurer', async () => {
            const { controller: noCert } = createController({ ...completeInsurance, insuranceCertificateKey: null });
            await expect(noCert.verifyAgencyInsurance(req, 'agency-1', { status: 'VERIFIED' }))
                .rejects.toThrow(/certificate/i);

            const { controller: noInsurer } = createController({ ...completeInsurance, insuranceInsurer: null });
            await expect(noInsurer.verifyAgencyInsurance(req, 'agency-1', { status: 'VERIFIED' }))
                .rejects.toThrow(/insurer/i);
        });

        it('refuses VERIFIED with a missing or past expiry', async () => {
            const { controller: noExpiry } = createController({ ...completeInsurance, insuranceExpiry: null });
            await expect(noExpiry.verifyAgencyInsurance(req, 'agency-1', { status: 'VERIFIED' }))
                .rejects.toThrow(/expiry is required/i);

            const { controller: expired } = createController({ ...completeInsurance, insuranceExpiry: past });
            await expect(expired.verifyAgencyInsurance(req, 'agency-1', { status: 'VERIFIED' }))
                .rejects.toThrow(/already expired/i);
        });

        it('verifies complete insurance and audits it', async () => {
            const { db, auditLogService, controller } = createController(completeInsurance);

            await controller.verifyAgencyInsurance(req, 'agency-1', { status: 'VERIFIED' });

            const update = db.agencyProfile.update.mock.calls[0][0];
            expect(update.data.insuranceStatus).toBe('VERIFIED');
            expect(update.data.insuranceVerifiedAt).toBeInstanceOf(Date);
            expect(update.data.insuranceRejectionReason).toBeNull();
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({
                action: 'AGENCY_INSURANCE_VERIFIED',
                metadata: expect.objectContaining({ insurancePolicyNumber: 'RC-2026-00421' }),
            }));
        });

        it('rejects insurance with a reason', async () => {
            const { db, auditLogService, controller } = createController(completeInsurance);

            await controller.verifyAgencyInsurance(req, 'agency-1', { status: 'REJECTED', reason: 'Insured name does not match the legal name' });

            const update = db.agencyProfile.update.mock.calls[0][0];
            expect(update.data.insuranceStatus).toBe('REJECTED');
            expect(update.data.insuranceRejectionReason).toBe('Insured name does not match the legal name');
            expect(auditLogService.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AGENCY_INSURANCE_REJECTED' }));
        });
    });
});
