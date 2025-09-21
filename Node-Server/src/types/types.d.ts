import { Request } from "express";
import { Socket } from "socket.io";


export interface SendMessageType {
    senderId: string;
    reciverId: string;
    message: string;
    conversationId?: string; // For group messages
    conversationType?: 'one-to-one' | 'group';
}

export interface GroupMessageType {
    conversationId: string;
    senderId: string;
    message: string;
    messageType?: 'text' | 'image' | 'file' | 'system';
}

export interface UserType {
    username: string;
    userId: string;
    email?: string;
    avatar?: string;
}

export interface ConversationType {
    _id: string;
    type: 'one-to-one' | 'group';
    name?: string; // For group chats
    description?: string;
    avatar?: string;
    participants: ParticipantType[];
    createdBy: string;
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: Date;
    };
    settings?: {
        allowMembersToAddOthers: boolean;
        onlyAdminsCanSendMessages: boolean;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface ParticipantType {
    userId: string;
    role: 'admin' | 'member';
    joinedAt: Date;
    isActive: boolean;
}

export interface MessageType {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    messageType: 'text' | 'image' | 'file' | 'system';
    replyTo?: string;
    readBy: {
        userId: string;
        readAt: Date;
    }[];
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    deletedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface AuthRequest extends Request {
    userId?: string;
}

export interface PaginationDetailsType {
    page: number;
    limit: number;
}

export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

export interface TypingIndicatorType {
    conversationId: string;
    userId: string;
    username: string;
    isTyping: boolean;
    conversationType: 'one-to-one' | 'group';
}