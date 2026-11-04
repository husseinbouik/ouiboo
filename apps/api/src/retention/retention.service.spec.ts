import { RetentionService } from './retention.service';

/**
 * #438: retention enforcement against the ADOPTED schedule.
 * For every category: a fixture row older than the period is purged,
 * a younger one survives, and a dry-run deletes nothing.
 * now is pinned to 2026-11-04.
 */
describe('RetentionService (#438)', () => {
    const NOW = new Date(Date.UTC(2026, 10, 4));
    const d = (iso: string) => new Date(iso);

    type Row = Record<string, any>;
    const matches = (row: Row, where: Row): boolean =>
        Object.entries(where).every(([key, cond]) => {
            if (key === 'OR') return (cond as Row[]).some((sub) => matches(row, sub));
            const value = row[key];
            if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
                if ('lt' in cond) return value instanceof Date && value < (cond.lt as Date);
                if ('in' in cond) return (cond.in as unknown[]).includes(value);
                if ('not' in cond) return value !== cond.not && value !== undefined;
                // nested relation filter (e.g. refundCase: { status: ... })
                return value !== null && typeof value === 'object' ? matches(value as Row, cond as Row) : false;
            }
            return value === cond;
        });

    const makeTable = (rows: Row[]) => ({
        rows,
        count: jest.fn(async ({ where }: { where: Row }) => rows.filter((r) => matches(r, where)).length),
        findMany: jest.fn(async ({ where, take }: { where: Row; take?: number }) => {
            const found = rows.filter((r) => matches(r, where));
            return take ? found.slice(0, take) : found;
        }),
        deleteMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
            const before = rows.length;
            for (let i = rows.length - 1; i >= 0; i--) {
                if (where.id.in.includes(rows[i].id)) rows.splice(i, 1);
            }
            return { count: before - rows.length };
        }),
        delete: jest.fn(async ({ where }: { where: { id: string } }) => {
            const idx = rows.findIndex((r) => r.id === where.id);
            if (idx >= 0) rows.splice(idx, 1);
            return {};
        }),
        updateMany: jest.fn(async ({ where, data }: { where: Row; data: Row }) => {
            let count = 0;
            for (const row of rows) {
                if (matches(row, where)) {
                    Object.assign(row, data);
                    count += 1;
                }
            }
            return { count };
        }),
        create: jest.fn(async ({ data }: { data: Row }) => {
            rows.push({ id: `row-${rows.length + 1}`, ...data });
            return data;
        }),
    });

    let tables: Record<string, ReturnType<typeof makeTable>>;
    let storageDeletes: string[];
    let storageFailOn: string | null;
    let service: RetentionService;

    const buildService = () => {
        tables = {
            auditLog: makeTable([
                { id: 'audit-old', createdAt: d('2022-01-01T00:00:00Z') },
                { id: 'audit-young', createdAt: d('2025-01-01T00:00:00Z') },
            ]),
            searchEvent: makeTable([
                { id: 'search-old', createdAt: d('2025-09-01T00:00:00Z') },
                { id: 'search-young', createdAt: d('2026-06-01T00:00:00Z') },
            ]),
            notificationLog: makeTable([
                { id: 'notif-old', sentAt: d('2026-07-01T00:00:00Z') },
                { id: 'notif-young', sentAt: d('2026-10-30T00:00:00Z') },
            ]),
            webhookInboxEntry: makeTable([
                { id: 'hook-old-done', receivedAt: d('2026-07-01T00:00:00Z'), processingStatus: 'PROCESSED' },
                { id: 'hook-old-received', receivedAt: d('2026-07-01T00:00:00Z'), processingStatus: 'RECEIVED' },
                { id: 'hook-young', receivedAt: d('2026-10-30T00:00:00Z'), processingStatus: 'PROCESSED' },
            ]),
            refreshToken: makeTable([
                { id: 'token-expired', expiresAt: d('2026-10-01T00:00:00Z') },
                { id: 'token-live', expiresAt: d('2027-01-01T00:00:00Z') },
            ]),
            user: makeTable([
                { id: 'u-otp', otp: 'hash', otpExpiresAt: d('2026-10-01T00:00:00Z'), otpLastSentAt: d('2026-10-01T00:00:00Z'), passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null },
                { id: 'u-reset', otp: null, otpExpiresAt: null, otpLastSentAt: null, passwordResetTokenHash: 'hash', passwordResetExpiresAt: d('2026-10-01T00:00:00Z'), passwordResetSentAt: d('2026-10-01T00:00:00Z') },
                { id: 'u-live', otp: 'hash', otpExpiresAt: d('2027-01-01T00:00:00Z'), otpLastSentAt: d('2026-11-01T00:00:00Z'), passwordResetTokenHash: null, passwordResetExpiresAt: null, passwordResetSentAt: null },
            ]),
            conversation: makeTable([
                { id: 'conv-old', lastMessageAt: d('2024-10-01T00:00:00Z'), createdAt: d('2024-09-01T00:00:00Z') },
                { id: 'conv-young', lastMessageAt: d('2026-10-01T00:00:00Z'), createdAt: d('2026-09-01T00:00:00Z') },
            ]),
            message: makeTable([
                { id: 'msg-old', conversationId: 'conv-old', attachmentUrl: 'https://cdn.test/messages/conv-old/a.png' },
                { id: 'msg-young', conversationId: 'conv-young', attachmentUrl: null },
            ]),
            paymentProof: makeTable([
                {
                    id: 'proof-old',
                    imageUrl: 'https://cdn.test/proofs/old.png',
                    bookingId: 'booking-old',
                    uploadedAt: d('2024-07-01T00:00:00Z'),
                    booking: {
                        status: 'COMPLETED',
                        paymentProofUrl: 'https://cdn.test/proofs/old.png',
                        session: { endDate: d('2024-06-01T00:00:00Z') },
                        refundCases: [],
                    },
                },
                {
                    id: 'proof-open-case',
                    imageUrl: 'https://cdn.test/proofs/open.png',
                    bookingId: 'booking-open',
                    uploadedAt: d('2024-07-01T00:00:00Z'),
                    booking: {
                        status: 'COMPLETED',
                        paymentProofUrl: 'https://cdn.test/proofs/open.png',
                        session: { endDate: d('2024-06-01T00:00:00Z') },
                        refundCases: [{ status: 'REFUND_REQUESTED', completedAt: null, updatedAt: d('2026-01-01T00:00:00Z') }],
                    },
                },
            ]),
            booking: makeTable([{ id: 'booking-old', paymentProofUrl: 'https://cdn.test/proofs/old.png' }]),
            refundEvidence: makeTable([
                {
                    id: 'evidence-old',
                    proofUrl: 'https://cdn.test/evidence/old.pdf',
                    refundCase: { status: 'REFUND_COMPLETED', completedAt: d('2024-05-01T00:00:00Z'), updatedAt: d('2024-05-01T00:00:00Z') },
                },
                {
                    id: 'evidence-young',
                    proofUrl: 'https://cdn.test/evidence/young.pdf',
                    refundCase: { status: 'REFUND_COMPLETED', completedAt: d('2026-01-01T00:00:00Z'), updatedAt: d('2026-01-01T00:00:00Z') },
                },
            ]),
        };
        // booking.update is used to clear the legacy proof pointer.
        (tables.booking as any).update = jest.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
            const row = tables.booking.rows.find((r) => r.id === where.id);
            if (row) Object.assign(row, data);
            return row;
        });
        storageDeletes = [];
        storageFailOn = null;
        const uploadService = {
            deleteFileByReference: jest.fn(async (ref: string) => {
                if (storageFailOn && ref.includes(storageFailOn)) throw new Error('storage down');
                storageDeletes.push(ref);
                return true;
            }),
        };
        service = new RetentionService(tables as never, uploadService as never);
    };

    beforeEach(buildService);

    it('purges rows older than each schedule period and keeps younger rows', async () => {
        const report = await service.runRetention({ now: NOW });
        expect(report.dryRun).toBe(false);
        expect(tables.auditLog.rows.map((r) => r.id)).toEqual(expect.arrayContaining(['audit-young']));
        expect(tables.auditLog.rows.map((r) => r.id)).not.toContain('audit-old');
        expect(tables.searchEvent.rows.map((r) => r.id)).toEqual(['search-young']);
        expect(tables.notificationLog.rows.map((r) => r.id)).toEqual(['notif-young']);
        // RECEIVED webhook rows are never purged, even when old.
        expect(tables.webhookInboxEntry.rows.map((r) => r.id).sort()).toEqual(['hook-old-received', 'hook-young']);
        expect(report.categories.auditLogs).toMatchObject({ matched: 1, deleted: 1 });
        expect(report.categories.searchEvents).toMatchObject({ matched: 1, deleted: 1 });
        expect(report.categories.notificationLogs).toMatchObject({ matched: 1, deleted: 1 });
        expect(report.categories.webhookInbox).toMatchObject({ matched: 1, deleted: 1 });
    });

    it('clears expired auth material and keeps live material', async () => {
        const report = await service.runRetention({ now: NOW });
        expect(tables.refreshToken.rows.map((r) => r.id)).toEqual(['token-live']);
        const otpUser = tables.user.rows.find((r) => r.id === 'u-otp');
        expect(otpUser?.otp).toBeNull();
        const resetUser = tables.user.rows.find((r) => r.id === 'u-reset');
        expect(resetUser?.passwordResetTokenHash).toBeNull();
        const liveUser = tables.user.rows.find((r) => r.id === 'u-live');
        expect(liveUser?.otp).toBe('hash');
        expect(report.categories.expiredAuthMaterial.matched).toBe(3);
        expect(report.categories.expiredAuthMaterial.deleted).toBe(3);
    });

    it('purges old conversations with their attachment objects, keeps young threads', async () => {
        const report = await service.runRetention({ now: NOW });
        expect(tables.conversation.rows.map((r) => r.id)).toEqual(['conv-young']);
        expect(storageDeletes).toContain('https://cdn.test/messages/conv-old/a.png');
        expect(report.categories.messages).toMatchObject({ matched: 1, deleted: 1, storageDeleted: 1 });
    });

    it('purges payment proofs only after the dispute window closes, deleting the storage object', async () => {
        const report = await service.runRetention({ now: NOW });
        expect(tables.paymentProof.rows.map((r) => r.id)).toEqual(['proof-open-case']);
        expect(storageDeletes).toContain('https://cdn.test/proofs/old.png');
        expect(tables.booking.rows[0].paymentProofUrl).toBeNull();
        expect(report.categories.paymentProofs).toMatchObject({ matched: 1, deleted: 1, storageDeleted: 1 });
    });

    it('purges refund evidence 2 years after case closure, keeping the case-era young evidence', async () => {
        const report = await service.runRetention({ now: NOW });
        expect(tables.refundEvidence.rows.map((r) => r.id)).toEqual(['evidence-young']);
        expect(storageDeletes).toContain('https://cdn.test/evidence/old.pdf');
        expect(report.categories.refundEvidence).toMatchObject({ matched: 1, deleted: 1 });
    });

    it('skips a row whose storage object cannot be deleted (no silent orphans)', async () => {
        storageFailOn = 'proofs/old.png';
        const report = await service.runRetention({ now: NOW });
        expect(tables.paymentProof.rows.map((r) => r.id)).toContain('proof-old');
        expect(report.categories.paymentProofs.storageFailed).toBe(1);
        expect(report.categories.paymentProofs.deleted).toBe(0);
    });

    it('dry-run reports the same matches and deletes nothing (no audit row either)', async () => {
        const before = JSON.stringify(
            Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, t.rows.map((r) => r.id)])),
        );
        const report = await service.runRetention({ now: NOW, dryRun: true });
        expect(report.dryRun).toBe(true);
        expect(report.totals.matched).toBeGreaterThan(0);
        expect(report.totals.deleted).toBe(0);
        expect(report.totals.storageDeleted).toBe(0);
        expect(storageDeletes).toEqual([]);
        const after = JSON.stringify(
            Object.fromEntries(Object.entries(tables).map(([k, t]) => [k, t.rows.map((r) => r.id)])),
        );
        expect(after).toBe(before);
    });

    it('writes exactly one RETENTION_PURGE audit row with structured counts on a real run', async () => {
        await service.runRetention({ now: NOW });
        const purgeRows = tables.auditLog.rows.filter((r) => r.action === 'RETENTION_PURGE');
        expect(purgeRows).toHaveLength(1);
        expect(purgeRows[0].metadata.categories.auditLogs.deleted).toBe(1);
        expect(purgeRows[0].metadata.totals.deleted).toBeGreaterThan(0);
    });
});
