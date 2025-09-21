import { Router } from "express";
import {
    createGroupInvitation,
    getInvitationDetails,
    submitJoinRequest,
    getGroupJoinRequests,
    processJoinRequest,
    getGroupInvitations,
    revokeInvitation
} from "./invitationController";

const router = Router();

// Create invitation link for group (admin only)
router.post('/create', createGroupInvitation);

// Get invitation details by token (public)
router.get('/details/:token', getInvitationDetails);

// Submit join request via invitation link
router.post('/join-request', submitJoinRequest);

// Get pending join requests for a group (admin only)
router.get('/join-requests/:conversationId', getGroupJoinRequests);

// Process join request (approve/reject) (admin only)
router.post('/process-request', processJoinRequest);

// Get group invitations (admin only)
router.get('/group/:conversationId', getGroupInvitations);

// Revoke invitation (admin only)
router.delete('/:invitationId', revokeInvitation);

export default router;
