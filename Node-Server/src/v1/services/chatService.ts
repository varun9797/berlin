import { Server, Socket } from "socket.io";
export const users: any = {}; // { userId: socketId }


export default function chatSocket(io: Server) {
    io.on("connection", (socket: Socket) => {
        console.log("✅ New user connected:", socket.id);

        // Store the user when they join
        socket.on("register", (userId) => {
            socket.data.userId = userId; // ✅ store userId safely
            users[userId] = socket.id;
            console.log(users);
        });

        // Handle sending a message
        socket.on("privateMessage", ({ toUserId, message }) => {
            console.log("privateMessage", users);
            const toSocketId = users[toUserId];
            if (toSocketId) {
                console.log(` private message from ${socket.data.userId} to ${toUserId}: ${message}`);
                io.to(toSocketId).emit("privateMessage", {
                    fromUserId: socket.data.userId,
                    message
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
