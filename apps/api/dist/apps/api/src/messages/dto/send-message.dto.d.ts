export declare class SendMessageDto {
    content: string;
    attachmentUrl?: string;
    recipientId: string;
}
export declare class GetMessagesDto {
    conversationId: string;
    page?: number;
    limit?: number;
}
