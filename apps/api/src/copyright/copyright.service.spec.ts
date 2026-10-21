import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CopyrightService } from './copyright.service';

describe('CopyrightService (#325)', () => {
    const created: Array<Record<string, unknown>> = [];
    const db = {
        copyrightReport: {
            create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                created.push(data);
                return { id: 'report-1', status: 'OPEN', createdAt: new Date(), ...data };
            }),
            findMany: jest.fn(async () => []),
            findUnique: jest.fn(async () => ({ id: 'report-1', status: 'OPEN' })),
            update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'report-1', ...data })),
        },
        tripTemplate: {
            update: jest.fn(async () => ({})),
        },
    };
    const service = new CopyrightService(db as never);

    const validDto = {
        reporterName: 'Jane Rightsowner',
        reporterEmail: 'Jane@Example.com',
        contentUrl: 'https://ouiboo-traveler.vercel.app/trip/abc123',
        description: 'This listing uses my copyrighted photographs without a license.',
        rightsAttestation: true,
    };

    beforeEach(() => {
        created.length = 0;
        jest.clearAllMocks();
        db.copyrightReport.findUnique.mockResolvedValue({ id: 'report-1', status: 'OPEN' });
    });

    it('rejects a report without the rights attestation', async () => {
        await expect(
            service.createReport({ ...validDto, rightsAttestation: false }),
        ).rejects.toThrow(BadRequestException);
        expect(db.copyrightReport.create).not.toHaveBeenCalled();
    });

    it('stores a valid report with a normalized email', async () => {
        const result = await service.createReport(validDto);
        expect(result.id).toBe('report-1');
        expect(created[0].reporterEmail).toBe('jane@example.com');
    });

    it('an ACTIONED resolution with a tripId deactivates the trip (takedown)', async () => {
        await service.resolveReport('report-1', { status: 'ACTIONED', tripId: 'trip-9' }, 'admin-1');
        expect(db.tripTemplate.update).toHaveBeenCalledWith({
            where: { id: 'trip-9' },
            data: { status: 'INACTIVE' },
        });
    });

    it('throws for an unknown report id', async () => {
        db.copyrightReport.findUnique.mockResolvedValue(null);
        await expect(
            service.resolveReport('nope', { status: 'DISMISSED' }, 'admin-1'),
        ).rejects.toThrow(NotFoundException);
    });
});
