import { DatabaseService } from '../database/database.service';
import { SendMessageDto } from './dto/send-message.dto';
export declare class MessagesService {
    private prisma;
    constructor(prisma: DatabaseService);
    sendMessage(senderId: string, senderRole: string, dto: SendMessageDto): Promise<{
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
    getMessages(conversationId: string, userId: string, page?: number, limit?: number): Promise<{
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
    getConversations(userId: string, page?: number, limit?: number): Promise<{
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
    getUnreadCount(userId: string): Promise<number>;
    searchMessages(userId: string, query: string, page?: number, limit?: number): Promise<{
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
    deleteMessage(messageId: string, userId: string): Promise<void>;
}
