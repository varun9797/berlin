import { Router } from "express";
import userRoutes from "../components/user/userRoutes";
const router = Router();

router.use('/user', userRoutes);

export default router;