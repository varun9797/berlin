import { Server, Socket } from "socket.io";
import { getOfflineConversation, storeConversation } from "../components/chat/chatController";
import { SendMessageType, UserType, PaginationDetailsType } from "../../types/types";
export const users: any = {}; // { userId: socketId }



export default function chatSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("✅ New user connected:", socket.id);

        // Store the user when they join
        socket.on("register", (userDetails: UserType) => {
            console.log("User registered:", userDetails);
            socket.data[userDetails.userId] = userDetails; // ✅ store userId safely
            users[userDetails.userId] = {
                ...userDetails, socketId: socket.id

            }
            console.log(users);
        });

        socket.on("privateMessage", (messageDetails: SendMessageType) => {
            console.log("privateMessage", messageDetails.reciverId, messageDetails.reciverId);
            const toSocketId = users[messageDetails.reciverId]?.socketId;
            if (toSocketId) {
                storeConversation(messageDetails.senderId, messageDetails.reciverId, messageDetails.message);
                // console.log(` private message from ${socket.data.senderId} to ${messageDetails.reciverId}: ${messageDetails.message}`);
                io.to(toSocketId).emit("privateMessage", {
                    senderName: socket.data[messageDetails.senderId]?.username,
                    content: messageDetails.message,
                    senderId: socket.data[messageDetails.senderId]?.userId,
                });
            }
            const toSenderSocketId = users[messageDetails.senderId]?.socketId;
            if (toSenderSocketId) {
                console.log(` private message from ${JSON.stringify(socket.data[messageDetails.senderId])} to ${messageDetails.reciverId}: ${messageDetails.message}`);
                io.to(toSenderSocketId).emit("privateMessage", {
                    senderName: socket.data[messageDetails.senderId]?.username,
                    content: messageDetails.message,
                    senderId: socket.data[messageDetails.senderId]?.userId,
                });
            }

            let paginationDetails: PaginationDetailsType = { page: 1, limit: 10 };

            getOfflineConversation([messageDetails.reciverId, messageDetails.senderId], paginationDetails)
        });


        socket.on("chatMessage", (msg: string) => {
            console.log("💬 Message received:", msg);
            io.emit("chatMessage", msg); // broadcast to all
        });

        socket.on("disconnect", () => {
            console.log("❌ User disconnected:", socket.id);
        });
    });
}
