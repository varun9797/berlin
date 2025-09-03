import { Server, Socket } from "socket.io";
import { storeConversation } from "../components/chat/chatController";
import { SendMessageType, UserType } from "../../types/types";
export const users: any = {}; // { userId: socketId }



export default function chatSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("✅ New user connected:", socket.id);

        // Store the user when they join
        socket.on("register", (userDetails: UserType) => {
            console.log("User registered:", userDetails);
            socket.data[userDetails.id] = userDetails; // ✅ store userId safely
            users[userDetails.id] = {
                ...userDetails, socketId: socket.id

            }
            console.log(users);
        });

        socket.on("privateMessage", (messageDetails: SendMessageType) => {
            console.log("privateMessage", users, messageDetails);
            storeConversation(socket.data.userId, messageDetails.reciverId, messageDetails.message);
            const toSocketId = users[messageDetails.reciverId].socketId;
            if (toSocketId) {
                console.log(` private message from ${socket.data.userId} to ${messageDetails.reciverId}: ${messageDetails.message}`);
                io.to(toSocketId).emit("privateMessage", {
                    sender: socket.data.userId,
                    content: messageDetails.message,
                    senderId: socket.data.userId,
                });
            }
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
