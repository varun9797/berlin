import { Router } from "express";
import userRoutes from "../components/user/userRoutes";
import chatRouter from "../components/chat/chatRouter";
import invitationRouter from "../components/invitation/invitationRouter";
import verifyToken from "../middleware/authMiddleware";
const router = Router();

router.use('/user', userRoutes);
router.use('/chat', verifyToken, chatRouter);
router.use('/invitation', verifyToken, invitationRouter);

export default router;