import { Request } from "express";
import { Socket } from "socket.io";


export interface SendMessageType {
    senderId: string;
    reciverId: string;
    message: string;
}

export interface UserType {
    username: string;
    userId: string;
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