import { Router } from "express";
const router = Router();

import { getConversationsApi } from "./chatController";

router.post('/conversations', getConversationsApi);

export default router;