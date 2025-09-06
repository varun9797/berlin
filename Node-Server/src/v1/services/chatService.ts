import { Server, Socket } from "socket.io";
import { getOfflineConversation, storeConversation } from "../components/chat/chatController";
import { SendMessageType, UserType, PaginationDetailsType } from "../../types/types";
export const onlineUsers: any = {}; // { userId: socketId }



export default function chatSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        const userId = socket.handshake.query.userId as string;

        // const userId = Object.keys(onlineUsers).filter(key => onlineUsers[key].socketId === socket.id);

        // Store the user when they join
        socket.on("register", (userDetails: UserType) => {
            console.log("User registered:", userDetails);
            onlineUsers[userDetails.userId] = {
                ...userDetails, socketId: socket.id

            }
            setTimeout(() => {
                io.emit('online-users', Object.values(onlineUsers));
            }, 0);
            console.log(onlineUsers);
        });

        socket.on("privateMessage", (messageDetails: SendMessageType) => {
            console.log("privateMessage", messageDetails.reciverId, messageDetails.reciverId);
            const toSocketId = onlineUsers[messageDetails.reciverId]?.socketId;
            if (toSocketId) {
                storeConversation(messageDetails.senderId, messageDetails.reciverId, messageDetails.message);
                io.to(toSocketId).emit("privateMessage", {
                    senderName: onlineUsers[messageDetails.senderId]?.username,
                    content: messageDetails.message,
                    senderId: onlineUsers[messageDetails.senderId]?.userId,
                });
            }
            const toSenderSocketId = onlineUsers[messageDetails.senderId]?.socketId;
            if (toSenderSocketId) {
                io.to(toSenderSocketId).emit("privateMessage", {
                    senderName: onlineUsers[messageDetails.senderId]?.username,
                    content: messageDetails.message,
                    senderId: onlineUsers[messageDetails.senderId]?.userId,
                });
            }

            let paginationDetails: PaginationDetailsType = { page: 1, limit: 10 };

            getOfflineConversation([messageDetails.reciverId, messageDetails.senderId], paginationDetails)
        });


        // socket.on("chatMessage", (msg: string) => {
        //     console.log("💬 Message received:", msg);
        //     io.emit("chatMessage", msg); // broadcast to all
        // });

        socket.on("disconnect", () => {
            // console.log("❌ User disconnected:", socket.id, onlineUsers, userId, "***");
            delete onlineUsers[userId];
            // console.log(userId, 'disconnected', onlineUsers);
            io.emit('online-users', Object.values(onlineUsers));
        });
    });
}
