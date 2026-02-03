"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagesService = void 0;
const common_1 = require("@nestjs/common");
const database_service_1 = require("../database/database.service");
let MessagesService = class MessagesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendMessage(senderId, senderRole, dto) {
        const travelerId = senderRole === 'TRAVELER' ? senderId : dto.recipientId;
        const agencyId = senderRole === 'AGENCY' ? senderId : dto.recipientId;
        let conversation = await this.prisma.conversation.findUnique({
            where: {
                travelerId_agencyId: {
                    travelerId,
                    agencyId,
                },
            },
        });
        if (!conversation) {
            conversation = await this.prisma.conversation.create({
                data: {
                    travelerId,
                    agencyId,
                },
            });
        }
        const message = await this.prisma.message.create({
            data: {
                conversationId: conversation.id,
                senderId,
                content: dto.content,
                attachmentUrl: dto.attachmentUrl,
            },
            include: {
                conversation: true,
            },
        });
        await this.prisma.conversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() },
        });
        return message;
    }
    async getMessages(conversationId, userId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
        });
        if (!conversation) {
            throw new common_1.BadRequestException('Conversation not found');
        }
        const userAgent = await this.prisma.agencyProfile.findUnique({
            where: { userId },
        });
        const isAgency = userAgent?.id === conversation.agencyId;
        const isTraveler = userId === conversation.travelerId;
        if (!isAgency && !isTraveler) {
            throw new common_1.ForbiddenException('Not authorized to access this conversation');
        }
        const [messages, total] = await Promise.all([
            this.prisma.message.findMany({
                where: { conversationId },
                orderBy: { createdAt: 'asc' },
                skip,
                take: limit,
            }),
            this.prisma.message.count({
                where: { conversationId },
            }),
        ]);
        await this.prisma.message.updateMany({
            where: {
                conversationId,
                isRead: false,
                senderId: { not: userId },
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
        return {
            messages,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async getConversations(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId },
        });
        const where = agency
            ? { agencyId: agency.id }
            : { travelerId: userId };
        const [conversations, total] = await Promise.all([
            this.prisma.conversation.findMany({
                where,
                include: {
                    messages: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                },
                orderBy: { lastMessageAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.conversation.count({ where }),
        ]);
        return {
            conversations,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async getUnreadCount(userId) {
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId },
        });
        let count = 0;
        if (agency) {
            count = await this.prisma.message.count({
                where: {
                    conversation: { agencyId: agency.id },
                    isRead: false,
                    senderId: { not: userId },
                },
            });
        }
        else {
            count = await this.prisma.message.count({
                where: {
                    conversation: { travelerId: userId },
                    isRead: false,
                    senderId: { not: userId },
                },
            });
        }
        return count;
    }
    async searchMessages(userId, query, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const agency = await this.prisma.agencyProfile.findUnique({
            where: { userId },
        });
        const where = agency
            ? {
                conversation: { agencyId: agency.id },
                content: { contains: query, mode: 'insensitive' },
            }
            : {
                conversation: { travelerId: userId },
                content: { contains: query, mode: 'insensitive' },
            };
        const [messages, total] = await Promise.all([
            this.prisma.message.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.message.count({ where }),
        ]);
        return {
            messages,
            total,
            page,
            pages: Math.ceil(total / limit),
        };
    }
    async deleteMessage(messageId, userId) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
        });
        if (!message) {
            throw new common_1.BadRequestException('Message not found');
        }
        if (message.senderId !== userId) {
            throw new common_1.ForbiddenException('Not authorized to delete this message');
        }
        await this.prisma.message.delete({
            where: { id: messageId },
        });
    }
};
exports.MessagesService = MessagesService;
exports.MessagesService = MessagesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [database_service_1.DatabaseService])
], MessagesService);
//# sourceMappingURL=messages.service.js.map