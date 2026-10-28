import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from './messages.service';

/**
 * Message attachments (#251 — Council B23).
 *
 * Attachments are the one chat ingress that could carry identity
 * documents after checkout stopped collecting them. The service must
 * refuse private uploads (identity documents, payment proofs, refund
 * evidence) and non-platform URLs at send time, and admin moderation
 * must be able to strip an attachment: tombstone the URL, delete the
 * stored object, and write an audit row with the mandatory reason.
 */
describe('MessagesService attachments (#251/B23)', () => {
    const createService = () => {
        const db: any = {
            agencyProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'agency-1' }) },
            user: { findFirst: jest.fn() },
            conversation: {
                upsert: jest.fn().mockResolvedValue({ id: 'conv-1' }),
                update: jest.fn().mockResolvedValue({}),
            },
            message: {
                create: jest.fn(async (args: any) => ({ id: 'msg-1', ...args.data })),
                findUnique: jest.fn(),
                update: jest.fn(async (args: any) => ({ id: args.where.id, attachmentUrl: null })),
                delete: jest.fn().mockResolvedValue({}),
            },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
            $transaction: jest.fn(async (callback: any) => callback(db)),
        };
        const upload = {
            resolveStorageKey: jest.fn((ref: string | null | undefined) => {
                if (!ref) return null;
                const match = ref.match(/(?:private|trips)\/[A-Za-z0-9._\-/]+/);
                return match ? match[0] : null;
            }),
            deleteFileByReference: jest.fn(async (_ref: string) => true),
        };
        return { db, upload, service: new MessagesService(db as any, upload as any) };
    };

    describe('sendMessage attachment validation', () => {
        it('rejects a private upload (identity-document class) as an attachment', async () => {
            const { db, service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Here is my document',
                attachmentUrl: 'private/traveler-1/passport.jpg',
            })).rejects.toThrow(BadRequestException);
            expect(db.message.create).not.toHaveBeenCalled();
        });

        it('rejects an attachment that is not a platform upload', async () => {
            const { db, service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'See this link',
                attachmentUrl: 'https://external.example.com/scan.jpg',
            })).rejects.toThrow(BadRequestException);
            expect(db.message.create).not.toHaveBeenCalled();
        });

        it('accepts a public trip-asset upload as an attachment', async () => {
            const { db, service } = createService();

            const message = await service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'This is the beach we discussed',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/beach.png',
            });

            expect(message.id).toBe('msg-1');
            expect(db.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/beach.png' }),
            }));
        });

        it('sends a plain message without an attachment unchanged', async () => {
            const { service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Hello',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });
    });

    describe('removeMessageAttachmentAsAdmin', () => {
        const actor = { id: 'admin-1', email: 'admin@ouiboo.test' };

        it('tombstones the URL, deletes the stored object and audits the removal', async () => {
            const { db, upload, service } = createService();
            db.message.findUnique.mockResolvedValue({
                id: 'msg-9',
                senderId: 'traveler-1',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/chat.png',
            });

            await service.removeMessageAttachmentAsAdmin('msg-9', actor, 'Contains a payment card photo');

            expect(upload.deleteFileByReference).toHaveBeenCalledWith('https://cdn.ouiboo.test/trips/agency-1/chat.png');
            expect(db.message.update).toHaveBeenCalledWith({
                where: { id: 'msg-9' },
                data: { attachmentUrl: null },
            });
            expect(db.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    actorId: 'admin-1',
                    action: 'MESSAGE_ATTACHMENT_REMOVED',
                    targetType: 'MESSAGE',
                    targetId: 'msg-9',
                    metadata: expect.objectContaining({
                        reason: 'Contains a payment card photo',
                        storageKey: 'trips/agency-1/chat.png',
                        storageDeleted: true,
                    }),
                }),
            });
        });

        it('still tombstones and audits honestly when the storage deletion fails', async () => {
            const { db, upload, service } = createService();
            db.message.findUnique.mockResolvedValue({
                id: 'msg-9',
                senderId: 'traveler-1',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/chat.png',
            });
            upload.deleteFileByReference.mockRejectedValue(new Error('storage unavailable'));

            await service.removeMessageAttachmentAsAdmin('msg-9', actor, 'ID document in chat');

            expect(db.message.update).toHaveBeenCalledWith({
                where: { id: 'msg-9' },
                data: { attachmentUrl: null },
            });
            expect(db.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    metadata: expect.objectContaining({ storageDeleted: false }),
                }),
            });
        });

        it('refuses a message without an attachment', async () => {
            const { db, upload, service } = createService();
            db.message.findUnique.mockResolvedValue({ id: 'msg-9', senderId: 'traveler-1', attachmentUrl: null });

            await expect(
                service.removeMessageAttachmentAsAdmin('msg-9', actor, 'Nothing to remove'),
            ).rejects.toThrow(BadRequestException);
            expect(upload.deleteFileByReference).not.toHaveBeenCalled();
            expect(db.message.update).not.toHaveBeenCalled();
        });

        it('requires a written reason before touching anything', async () => {
            const { db, service } = createService();

            await expect(
                service.removeMessageAttachmentAsAdmin('msg-9', actor, '   '),
            ).rejects.toThrow(BadRequestException);
            expect(db.message.findUnique).not.toHaveBeenCalled();
        });
    });

    describe('deleteMessage attachment cleanup', () => {
        it('deletes the stored attachment object when the sender deletes the message', async () => {
            const { db, upload, service } = createService();
            db.message.findUnique.mockResolvedValue({
                id: 'msg-5',
                senderId: 'traveler-1',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/chat.png',
            });

            await service.deleteMessage('msg-5', 'traveler-1');

            expect(upload.deleteFileByReference).toHaveBeenCalledWith('https://cdn.ouiboo.test/trips/agency-1/chat.png');
            expect(db.message.delete).toHaveBeenCalledWith({ where: { id: 'msg-5' } });
        });

        it('does not touch storage when a non-sender tries to delete', async () => {
            const { db, upload, service } = createService();
            db.message.findUnique.mockResolvedValue({
                id: 'msg-5',
                senderId: 'traveler-1',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/chat.png',
            });

            await expect(service.deleteMessage('msg-5', 'traveler-2')).rejects.toThrow(ForbiddenException);
            expect(upload.deleteFileByReference).not.toHaveBeenCalled();
            expect(db.message.delete).not.toHaveBeenCalled();
        });
    });
});

/**
 * #444 (Council P2-05): pre-booking contact-exchange detection.
 *
 * Contact/RIB exchange AFTER a booking exists is by design and is
 * never flagged. Before any booking, a message carrying a phone
 * number, e-mail, bank details or an off-platform link is delivered
 * (detection never blocks), the response carries the warning shape
 * for the client, and an AuditLog row records the CATEGORIES only —
 * the spec asserts the matched values never reach the audit row.
 */
describe('MessagesService contact-exchange detection (#444)', () => {
    const createService = (pairBookings = 0) => {
        const db: any = {
            agencyProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'agency-1' }) },
            user: { findFirst: jest.fn() },
            conversation: {
                upsert: jest.fn().mockResolvedValue({ id: 'conv-1' }),
                update: jest.fn().mockResolvedValue({}),
            },
            message: {
                create: jest.fn(async (args: any) => ({ id: 'msg-1', ...args.data })),
            },
            booking: { count: jest.fn().mockResolvedValue(pairBookings) },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
            $transaction: jest.fn(async (callback: any) => callback(db)),
        };
        const upload = {
            resolveStorageKey: jest.fn(() => null),
            deleteFileByReference: jest.fn(async (_ref: string) => true),
        };
        return { db, upload, service: new MessagesService(db as any, upload as any) };
    };

    it('delivers a pre-booking phone-number message, warns, and audits categories only', async () => {
        const { db, service } = createService(0);

        const result: any = await service.sendMessage('traveler-1', 'TRAVELER', {
            recipientId: 'agency-1',
            content: 'Call me on 0612345678 to arrange it directly',
        });

        // The message is created and returned, never blocked.
        expect(db.message.create).toHaveBeenCalled();
        expect(result.id).toBe('msg-1');
        expect(result.contactExchange).toEqual({
            detected: true,
            phase: 'PRE_BOOKING',
            categories: ['PHONE'],
        });
        expect(db.auditLog.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                actorId: 'traveler-1',
                action: 'MESSAGE_CONTACT_EXCHANGE_DETECTED',
                targetType: 'CONVERSATION',
                targetId: 'conv-1',
                metadata: { categories: ['PHONE'], phase: 'PRE_BOOKING', senderRole: 'TRAVELER' },
            }),
        });
        // The matched number itself must never be copied into the audit row.
        expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain('0612345678');
    });

    it('flags an agency sending its RIB before any booking (the fee-capture leak)', async () => {
        const { db, service } = createService(0);
        db.user.findFirst.mockResolvedValue({ id: 'traveler-1' });

        const result: any = await service.sendMessage('agency-user-1', 'AGENCY', {
            recipientId: 'traveler-1',
            content: 'Pay the deposit to RIB 1234 5678 9012 3456 7890 1234',
        });

        expect(result.contactExchange).toEqual({
            detected: true,
            phase: 'PRE_BOOKING',
            categories: ['BANK_DETAILS'],
        });
        expect(db.auditLog.create).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(db.auditLog.create.mock.calls)).not.toContain('1234 5678');
    });

    it('does not flag contact exchange once a live booking exists (by design)', async () => {
        const { db, service } = createService(1);

        const result: any = await service.sendMessage('traveler-1', 'TRAVELER', {
            recipientId: 'agency-1',
            content: 'Call me on 0612345678 when you reach the meeting point',
        });

        expect(result.id).toBe('msg-1');
        expect(result.contactExchange).toBeUndefined();
        expect(db.auditLog.create).not.toHaveBeenCalled();
    });

    it('does not flag or audit ordinary pre-booking questions', async () => {
        const { db, service } = createService(0);

        const result: any = await service.sendMessage('traveler-1', 'TRAVELER', {
            recipientId: 'agency-1',
            content: 'Hello, is the trip available for 4 people on Friday? The price is 2000 MAD, right?',
        });

        expect(result.contactExchange).toBeUndefined();
        expect(db.auditLog.create).not.toHaveBeenCalled();
        // No detection means the pair-booking lookup is never needed.
        expect(db.booking.count).not.toHaveBeenCalled();
    });

    it('still delivers the message when the audit write fails', async () => {
        const { db, service } = createService(0);
        db.auditLog.create.mockRejectedValue(new Error('audit store unavailable'));

        const result: any = await service.sendMessage('traveler-1', 'TRAVELER', {
            recipientId: 'agency-1',
            content: 'My email is traveler@example.com',
        });

        expect(result.id).toBe('msg-1');
        expect(result.contactExchange.categories).toEqual(['EMAIL']);
    });
});
