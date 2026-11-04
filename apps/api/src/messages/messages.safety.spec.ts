import { BadRequestException, ForbiddenException, HttpException } from '@nestjs/common';
import { MessagesService } from './messages.service';

/**
 * Chat doors + safety (#729 / #754 remainder / #629).
 *
 * The pair-level conversation stays open for traveller-initiated
 * pre-booking inquiries, but the S7-2 guardrails are enforced at the
 * API: agencies are reply-only without a booking/quote relationship,
 * a traveller block freezes non-booking conversations (booking-linked
 * ones stay usable), attachments are storage-bound AND tenant-bound
 * with a moderation flag on blocked attempts, a database-counted
 * per-conversation burst cap returns 429, and either participant can
 * report a conversation. Contact-exchange detection stays
 * detection-only: the flagged message is delivered unchanged.
 */
describe('MessagesService safety (#729/#754/#629)', () => {
    const createService = () => {
        const db: any = {
            agencyProfile: { findUnique: jest.fn().mockResolvedValue({ id: 'agency-1' }) },
            user: {
                findFirst: jest.fn().mockResolvedValue({ id: 'traveler-1' }),
                findUnique: jest.fn().mockResolvedValue({ id: 'traveler-1', name: 'Test Traveller' }),
            },
            conversation: {
                upsert: jest.fn().mockResolvedValue({ id: 'conv-1' }),
                update: jest.fn().mockResolvedValue({}),
                findUnique: jest.fn().mockResolvedValue(null),
            },
            booking: { count: jest.fn().mockResolvedValue(0) },
            quoteRequest: { count: jest.fn().mockResolvedValue(0) },
            agencyBlock: {
                findUnique: jest.fn().mockResolvedValue(null),
                upsert: jest.fn().mockResolvedValue({ id: 'block-1' }),
                deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
                findMany: jest.fn().mockResolvedValue([]),
            },
            conversationReport: {
                create: jest.fn(async (args: any) => ({ id: 'report-1', ...args.data })),
            },
            message: {
                create: jest.fn(async (args: any) => ({ id: 'msg-1', ...args.data })),
                count: jest.fn().mockResolvedValue(0),
                findUnique: jest.fn(),
                update: jest.fn().mockResolvedValue({}),
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

    describe('agency cold-start (#754 lifecycle eligibility)', () => {
        it('forbids an agency first message with no conversation, booking or quote', async () => {
            const { db, service } = createService();

            await expect(service.sendMessage('agency-user-1', 'AGENCY', {
                recipientId: 'traveler-1',
                content: 'Hello, book direct with us!',
            })).rejects.toThrow(ForbiddenException);
            expect(db.message.create).not.toHaveBeenCalled();
        });

        it('allows an agency first message when a quote relationship exists', async () => {
            const { db, service } = createService();
            db.quoteRequest.count.mockResolvedValue(1);

            await expect(service.sendMessage('agency-user-1', 'AGENCY', {
                recipientId: 'traveler-1',
                content: 'Your quote is ready',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });

        it('allows an agency first message when a booking relationship exists', async () => {
            const { db, service } = createService();
            db.booking.count.mockResolvedValue(1);

            await expect(service.sendMessage('agency-user-1', 'AGENCY', {
                recipientId: 'traveler-1',
                content: 'About your booking',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });

        it('allows an agency reply in an existing conversation without any booking', async () => {
            const { db, service } = createService();
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });

            await expect(service.sendMessage('agency-user-1', 'AGENCY', {
                recipientId: 'traveler-1',
                content: 'Replying to your inquiry',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });

        it('still allows a traveller to open a pre-booking inquiry', async () => {
            const { service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Is the trip suitable for kids?',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });
    });

    describe('traveller block (#729/#754)', () => {
        it('prevents starting a new conversation while blocked', async () => {
            const { db, service } = createService();
            db.agencyBlock.findUnique.mockResolvedValue({ id: 'block-1' });

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Hello again',
            })).rejects.toThrow(ForbiddenException);
            expect(db.message.create).not.toHaveBeenCalled();
        });

        it('freezes sends in an existing non-booking conversation, for both sides', async () => {
            const { db, service } = createService();
            db.agencyBlock.findUnique.mockResolvedValue({ id: 'block-1' });
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });

            await expect(service.sendMessage('agency-user-1', 'AGENCY', {
                recipientId: 'traveler-1',
                content: 'One more offer',
            })).rejects.toThrow(ForbiddenException);
            expect(db.message.create).not.toHaveBeenCalled();
        });

        it('keeps a booking-linked conversation usable despite the block', async () => {
            const { db, service } = createService();
            db.agencyBlock.findUnique.mockResolvedValue({ id: 'block-1' });
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
            db.booking.count.mockResolvedValue(1);

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Where do we meet tomorrow?',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });

        it('blockAgency upserts the block and audits it; unblock removes it', async () => {
            const { db, service } = createService();

            await expect(service.blockAgency('traveler-1', 'agency-1')).resolves.toEqual({ blocked: true, agencyId: 'agency-1' });
            expect(db.agencyBlock.upsert).toHaveBeenCalled();
            expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: 'AGENCY_BLOCKED_BY_TRAVELER', targetId: 'agency-1' }),
            }));

            await expect(service.unblockAgency('traveler-1', 'agency-1')).resolves.toEqual({ blocked: false, agencyId: 'agency-1' });
            expect(db.agencyBlock.deleteMany).toHaveBeenCalled();
        });

        it('blockAgency refuses an unknown agency', async () => {
            const { db, service } = createService();
            db.agencyProfile.findUnique.mockResolvedValue(null);

            await expect(service.blockAgency('traveler-1', 'nope')).rejects.toThrow(BadRequestException);
        });
    });

    describe('attachment tenant binding + moderation flag (#629/#754)', () => {
        it("rejects another agency's catalogue upload and flags the attempt by class only", async () => {
            const { db, service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Look at this',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-2/photo.png',
            })).rejects.toThrow(BadRequestException);
            expect(db.message.create).not.toHaveBeenCalled();
            expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    action: 'MESSAGE_ATTACHMENT_BLOCKED',
                    metadata: expect.objectContaining({ storageClass: 'OTHER_TENANT' }),
                }),
            }));
        });

        it('flags a private (ID-document class) attempt without recording the key', async () => {
            const { db, service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'My passport',
                attachmentUrl: 'private/traveler-1/passport.jpg',
            })).rejects.toThrow(BadRequestException);

            const auditCall = db.auditLog.create.mock.calls.find(
                (call: any) => call[0]?.data?.action === 'MESSAGE_ATTACHMENT_BLOCKED',
            );
            expect(auditCall).toBeTruthy();
            expect(auditCall[0].data.metadata.storageClass).toBe('PRIVATE_DOCUMENT');
            expect(JSON.stringify(auditCall[0].data)).not.toContain('passport');
        });

        it("accepts the conversation agency's own catalogue upload", async () => {
            const { service } = createService();

            await expect(service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'This beach?',
                attachmentUrl: 'https://cdn.ouiboo.test/trips/agency-1/beach.png',
            })).resolves.toMatchObject({ id: 'msg-1' });
        });
    });

    describe('per-conversation burst cap (#754)', () => {
        it('returns 429 once the sender hits the per-conversation cap', async () => {
            const { db, service } = createService();
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });
            db.message.count.mockResolvedValue(50);

            const error = await service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'spam',
            }).catch((e: unknown) => e);
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(429);
            expect(db.message.create).not.toHaveBeenCalled();
        });
    });

    describe('report a conversation (#729/#754)', () => {
        it('records a participant report and audits the category only', async () => {
            const { db, service } = createService();
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1', travelerId: 'traveler-1', agencyId: 'agency-1' });

            await expect(service.reportConversation('conv-1', 'traveler-1', {
                reason: 'OFF_PLATFORM_PAYMENT',
            })).resolves.toEqual({ id: 'report-1', status: 'RECEIVED' });
            expect(db.conversationReport.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ conversationId: 'conv-1', reporterId: 'traveler-1', reason: 'OFF_PLATFORM_PAYMENT' }),
            }));
            expect(db.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ action: 'CONVERSATION_REPORTED', targetId: 'conv-1' }),
            }));
        });

        it('refuses a report from a non-participant', async () => {
            const { db, service } = createService();
            db.conversation.findUnique.mockResolvedValue({ id: 'conv-1', travelerId: 'traveler-1', agencyId: 'agency-1' });
            db.agencyProfile.findUnique.mockResolvedValue(null);

            await expect(service.reportConversation('conv-1', 'traveler-2', {
                reason: 'SPAM',
            })).rejects.toThrow(ForbiddenException);
            expect(db.conversationReport.create).not.toHaveBeenCalled();
        });
    });

    describe('contact-exchange detection stays detection-only (Council S7)', () => {
        it('delivers a flagged pre-booking message unchanged and returns the sender notice signal', async () => {
            const { db, service } = createService();

            const result: any = await service.sendMessage('traveler-1', 'TRAVELER', {
                recipientId: 'agency-1',
                content: 'Call me on 0612345678 instead',
            });

            expect(db.message.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ content: 'Call me on 0612345678 instead' }),
            }));
            expect(result.contactExchange).toEqual(expect.objectContaining({ detected: true, phase: 'PRE_BOOKING' }));
            const auditCall = db.auditLog.create.mock.calls.find(
                (call: any) => call[0]?.data?.action === 'MESSAGE_CONTACT_EXCHANGE_DETECTED',
            );
            expect(auditCall).toBeTruthy();
            expect(JSON.stringify(auditCall[0].data)).not.toContain('0612345678');
        });
    });
});
