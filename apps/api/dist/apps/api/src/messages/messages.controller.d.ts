import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagesController {
    private messagesService;
    constructor(messagesService: MessagesService);
    sendMessage(dto: SendMessageDto, req: any): Promise<{
        conversation: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agencyId: string;
            travelerId: string;
            lastMessageAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        content: string;
        attachmentUrl: string | null;
        conversationId: string;
        senderId: string;
        isRead: boolean;
        readAt: Date | null;
    }>;
    getMessages(conversationId: string, page: string, limit: string, req: any): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            attachmentUrl: string | null;
            conversationId: string;
            senderId: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        total: number;
        page: number;
        pages: number;
    }>;
    getConversations(page: string, limit: string, req: any): Promise<{
        conversations: ({
            messages: {
                id: string;
                createdAt: Date;
                content: string;
                attachmentUrl: string | null;
                conversationId: string;
                senderId: string;
                isRead: boolean;
                readAt: Date | null;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            agencyId: string;
            travelerId: string;
            lastMessageAt: Date | null;
        })[];
        total: number;
        page: number;
        pages: number;
    }>;
    getUnreadCount(req: any): Promise<{
        unreadCount: number;
    }>;
    searchMessages(query: string, page: string, limit: string, req: any): Promise<{
        messages: {
            id: string;
            createdAt: Date;
            content: string;
            attachmentUrl: string | null;
            conversationId: string;
            senderId: string;
            isRead: boolean;
            readAt: Date | null;
        }[];
        total: number;
        page: number;
        pages: number;
    }>;
    deleteMessage(messageId: string, req: any): Promise<void>;
}
