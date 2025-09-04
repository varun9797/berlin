import { Router } from "express";
const router = Router();

import { getConversationsApi } from "./chatController";
import { validateGetConversations } from "./chatValidator";

router.post('/conversations', validateGetConversations, getConversationsApi);

export default router;