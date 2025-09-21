import { Router } from "express";
const router = Router();

import {
    getConversationsApi,
    createGroupConversation,
    addParticipantsToGroup,
    getUserConversations,
    getConversationMessages,
    removeParticipantFromGroup,
    updateGroupInfo,
    deleteGroup
} from "./chatController";
import { validateGetConversations } from "./chatValidator";

// Get user's conversations (inbox)
router.get('/user-conversations', getUserConversations);

// Get messages for specific conversation
router.post('/conversations', validateGetConversations, getConversationsApi);

// Get messages for a specific conversation
router.post('/conversation-messages', getConversationMessages);

// Create group conversation
router.post('/create-group', createGroupConversation);

// Add participants to group
router.post('/add-participants', addParticipantsToGroup);

// Remove participant from group
router.post('/remove-participant', removeParticipantFromGroup);

// Update group information
router.put('/group/:conversationId', updateGroupInfo);

// Delete group
router.delete('/group/:conversationId', deleteGroup);

export default router;