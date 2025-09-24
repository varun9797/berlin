import 'dotenv/config'
import { connectToMongo } from './configs/mongoConnection';
import express from 'express';
import chatSocket from "./v1/services/chatService";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from 'cors';
import privateRoutes from "./v1/routes/privateRoutes";
import publicRoutes from './v1/routes/publicRoutes';
import { setSocketInstance } from './v1/utils/socketInstance';

const app = express();
const allowedOrigins = [
    "http://localhost:4200",
    "https://angular-client-five.vercel.app"
];

app.use(
    cors({
        origin: (origin, callback) => {
            // allow requests with no origin (like mobile apps, curl, etc.)
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        exposedHeaders: ["Authorization"],
    })
);
app.use(express.json());

// Create HTTP server
const server = createServer(app);

app.use('/api/v1', privateRoutes);
app.use('/v1', publicRoutes);

// Connect DB
connectToMongo();

// Socket.io setup
const io = new Server(server, {
    cors: {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Set Socket.IO instance for game events
setSocketInstance(io);
chatSocket(io);

const PORT = process.env.PORT || 3000;

// ✅ Start the HTTP server (with both Express + Socket.io)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});