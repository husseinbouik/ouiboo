import 'reflect-metadata';
import { UserRole } from '@ouiboo/types';
import { AdminMessagesController } from './admin-messages.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

/**
 * Admin message-attachment moderation (#251/B23): the controller is a
 * thin admin-only shell over MessagesService — these tests pin the
 * delegation (actor taken from the JWT, never from the body) and the
 * admin role gate metadata. (Module registration is exercised by the
 * cross-tenant e2e, which boots MessagesModule.)
 */
describe('AdminMessagesController (#251/B23)', () => {
    const req: any = { user: { userId: 'admin-1', email: 'admin@ouiboo.test' } };

    function makeController() {
        const messagesService: any = {
            removeMessageAttachmentAsAdmin: jest.fn(async (messageId: string) => ({ id: messageId, attachmentUrl: null })),
        };
        return { controller: new AdminMessagesController(messagesService), messagesService };
    }

    it('delegates to the service with the JWT actor and the DTO reason', async () => {
        const { controller, messagesService } = makeController();

        const result = await controller.removeMessageAttachment(req, 'msg-1', { reason: 'ID document sent in chat' });

        expect(messagesService.removeMessageAttachmentAsAdmin).toHaveBeenCalledWith(
            'msg-1',
            { id: 'admin-1', email: 'admin@ouiboo.test' },
            'ID document sent in chat',
        );
        expect(result).toEqual({ id: 'msg-1', attachmentUrl: null });
    });

    it('is gated to the admin role', () => {
        expect(Reflect.getMetadata(ROLES_KEY, AdminMessagesController)).toEqual([UserRole.Admin]);
    });
});
