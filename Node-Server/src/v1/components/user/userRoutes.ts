import { Router } from "express";
import { userRegistration, getUserProfile, userLogin, getOnlineUsers } from "./userController";
import { validateLogin, validateRegistration } from "./userValidator";

const router = Router();

router.post('/register', validateRegistration, userRegistration);
router.get('/', getUserProfile);
router.get('/onlineUsers', getOnlineUsers);
router.post('/login', validateLogin, userLogin);

export default router;