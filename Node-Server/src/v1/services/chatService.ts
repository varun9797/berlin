import { Server, Socket } from "socket.io";
import { getOfflineConversation, storeConversation } from "../components/chat/chatController";
import { SendMessageType, UserType, PaginationDetailsType, AuthenticatedSocket } from "../../types/types";
import { ConversationModel } from "../components/chat/chatModel";
export const onlineUsers: any = {}; // { userId: socketId }
import jwt, { JwtPayload } from "jsonwebtoken"
import { JWT_CONSTANTS } from "../utils/const";


export default function chatSocket(io: Server) {

    io.use((socket: AuthenticatedSocket, next) => {
        const token: string = socket.handshake.auth.token?.replace('Bearer ', '');
        if (!token) {
            return next(new Error("Authentication error"));
        }

        jwt.verify(token, JWT_CONSTANTS.SECRET_KEY_TOKEN, (err, decoded) => {
            if (err) {
                return next(new Error("Authentication error"));
            }
            socket.userId = (decoded as JwtPayload).userId; // attach user info to socket
            next();
            return;
        });

    });

    io.on("connection", (socket: Socket) => {
        const userId = socket.handshake.query.userId as string;

        // Store the user when they join
        socket.on("register", (userDetails: UserType) => {
            console.log("User registered:", userDetails);
            onlineUsers[userDetails.userId] = {
                ...userDetails, socketId: socket.id
            }

            // Join user to their conversation rooms
            joinUserConversationRooms(socket, userDetails.userId);

            setTimeout(() => {
                io.emit('online-users', Object.values(onlineUsers));
            }, 0);
            console.log(onlineUsers);
        });

        // Handle private messages (one-to-one)
        socket.on("privateMessage", async (messageDetails: SendMessageType) => {
            try {
                const savedMessage = await storeConversation(
                    messageDetails.senderId,
                    messageDetails.reciverId,
                    messageDetails.message
                );

                // Emit to receiver
                const toSocketId = onlineUsers[messageDetails.reciverId]?.socketId;
                if (toSocketId) {
                    io.to(toSocketId).emit("privateMessage", {
                        senderName: onlineUsers[messageDetails.senderId]?.username,
                        content: messageDetails.message,
                        senderId: messageDetails.senderId,
                        timestamp: new Date(),
                        messageId: savedMessage._id
                    });
                }

                // Emit to sender (confirmation)
                const toSenderSocketId = onlineUsers[messageDetails.senderId]?.socketId;
                if (toSenderSocketId) {
                    io.to(toSenderSocketId).emit("privateMessage", {
                        senderName: onlineUsers[messageDetails.senderId]?.username,
                        content: messageDetails.message,
                        senderId: messageDetails.senderId,
                        timestamp: new Date(),
                        messageId: savedMessage._id
                    });
                }

                let paginationDetails: PaginationDetailsType = { page: 1, limit: 10 };
                getOfflineConversation([messageDetails.reciverId, messageDetails.senderId], paginationDetails);
            } catch (error) {
                console.error('Error handling private message:', error);
            }
        });

        // Handle group messages
        socket.on("groupMessage", async (messageDetails: any) => {
            try {
                console.log('Received group message:', messageDetails);
                const { conversationId, senderId, message } = messageDetails;

                // Verify user is participant in the group
                const conversation = await ConversationModel.findById(conversationId);
                if (!conversation || conversation.type !== 'group') {
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const isParticipant = conversation.participants.some(
                    p => p.userId.toString() === senderId && p.isActive
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'You are not a participant in this group' });
                    return;
                }

                const savedMessage = await storeConversation(
                    senderId,
                    '', // No specific receiver for group
                    message,
                    conversationId
                );

                // Emit to all group participants
                const groupMessage = {
                    conversationId,
                    senderId,
                    message: message,
                    messageType: 'text',
                    senderName: onlineUsers[senderId]?.username || 'Unknown',
                    timestamp: new Date(),
                    messageId: savedMessage._id,
                    groupName: conversation.name
                };

                // Emit to group room
                io.to(`group_${conversationId}`).emit("groupMessage", groupMessage);

            } catch (error) {
                console.error('Error handling group message:', error);
                socket.emit('error', { message: 'Error sending group message' });
            }
        });

        // Game Events - Real-time game synchronization
        socket.on("joinGameRoom", (data: { gameId: string, conversationId: string }) => {
            console.log(`User ${userId} joining game room: ${data.gameId}`);
            socket.join(`game_${data.gameId}`);
            socket.join(`gameConv_${data.conversationId}`);
        });

        socket.on("leaveGameRoom", (data: { gameId: string, conversationId: string }) => {
            console.log(`User ${userId} leaving game room: ${data.gameId}`);
            socket.leave(`game_${data.gameId}`);
            socket.leave(`gameConv_${data.conversationId}`);
        });

        // Join a group conversation
        socket.on("joinGroup", async (data: { conversationId: string }) => {
            try {
                const conversation = await ConversationModel.findById(data.conversationId);
                if (!conversation || conversation.type !== 'group') {
                    socket.emit('error', { message: 'Group not found' });
                    return;
                }

                const isParticipant = conversation.participants.some(
                    p => p.userId.toString() === userId && p.isActive
                );

                if (!isParticipant) {
                    socket.emit('error', { message: 'You are not a participant in this group' });
                    return;
                }

                socket.join(`group_${data.conversationId}`);
                socket.emit('joinedGroup', {
                    conversationId: data.conversationId,
                    groupName: conversation.name
                });

            } catch (error) {
                console.error('Error joining group:', error);
                socket.emit('error', { message: 'Error joining group' });
            }
        });

        // Leave a group conversation
        socket.on("leaveGroup", (data: { conversationId: string }) => {
            socket.leave(`group_${data.conversationId}`);
            socket.emit('leftGroup', { conversationId: data.conversationId });
        });

        // Handle typing indicators
        socket.on("typing", (data: { conversationId: string, isTyping: boolean, conversationType: 'one-to-one' | 'group' }) => {
            if (data.conversationType === 'group') {
                socket.to(`group_${data.conversationId}`).emit("userTyping", {
                    userId: userId,
                    username: onlineUsers[userId]?.username,
                    isTyping: data.isTyping,
                    conversationId: data.conversationId
                });
            } else {
                // For one-to-one, emit to specific user
                socket.broadcast.emit("userTyping", {
                    userId: userId,
                    username: onlineUsers[userId]?.username,
                    isTyping: data.isTyping,
                    conversationId: data.conversationId
                });
            }
        });

        socket.on("disconnect", () => {
            delete onlineUsers[userId];
            io.emit('online-users', Object.values(onlineUsers));
        });
    });

    // Helper function to join user to their conversation rooms
    async function joinUserConversationRooms(socket: Socket, userId: string) {
        try {
            const userConversations = await ConversationModel.find({
                'participants.userId': userId,
                'participants.isActive': true,
                type: 'group'
            });

            userConversations.forEach(conversation => {
                socket.join(`group_${conversation._id}`);
            });

            console.log(`User ${userId} joined ${userConversations.length} group rooms`);
        } catch (error) {
            console.error('Error joining user to conversation rooms:', error);
        }
    }
}