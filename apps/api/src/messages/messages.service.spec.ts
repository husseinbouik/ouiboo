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
