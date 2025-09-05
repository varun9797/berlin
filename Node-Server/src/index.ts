import 'dotenv/config'
import { connectToMongo } from './configs/mongoConnection';
import express from 'express';
import chatSocket from "./v1/services/chatService";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from 'cors';
import privateRoutes from "./v1/routes/privateRoutes";
import publicRoutes from './v1/routes/publicRoutes';

const app = express();
app.use(cors({
    origin: ["http://localhost:4200", "https://angular-client-five.vercel.app"], // Angular dev server
    methods: ["GET", "POST"],
    credentials: true,                 // allow cookies / auth headers
    exposedHeaders: ['Authorization']
}));
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
        origin: "http://localhost:4200", // Angular dev server
        methods: ["GET", "POST"],
        credentials: true                 // allow cookies / auth headers
    }
});
chatSocket(io);

const PORT = process.env.PORT || 3000;

// ✅ Start the HTTP server (with both Express + Socket.io)
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});