import { Router } from "express";
import userRoutes from "../components/user/userRoutes";
import chatRouter from "../components/chat/chatRouter";
import verifyToken from "../middleware/authMiddleware";
const router = Router();

router.use('/user', userRoutes);
router.use('/chat', verifyToken, chatRouter);

export default router;