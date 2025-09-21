import { Response } from "express";
import { AuthRequest } from "../../../types/types";
import { httpStatusCodes } from "../../utils/httpStatusCodes";
import { InvitationModel, JoinRequestModel } from "./invitationModel";
import { ConversationModel } from "../chat/chatModel";
import { UserModel } from "../user/userModel";
import crypto from 'crypto';
import mongoose from "mongoose";

// Generate invitation link for group
export const createGroupInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId, expiresInDays = 7, maxUses = null } = req.body;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID is required"
            });
            return;
        }

        // Check if user is admin of the group
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can create invitation links"
            });
            return;
        }

        // Deactivate existing active invitations for this group (optional - keep only one active)
        await InvitationModel.updateMany(
            { conversationId, isActive: true },
            { isActive: false }
        );

        // Generate unique invitation token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        
        // Calculate expiration date
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const invitation = new InvitationModel({
            conversationId,
            createdBy: userId,
            inviteToken,
            expiresAt,
            maxUses
        });

        await invitation.save();

        res.status(httpStatusCodes.CREATED).json({
            data: {
                inviteToken,
                inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/join-group?token=${inviteToken}`,
                expiresAt,
                maxUses
            },
            message: "Invitation link created successfully"
        });
    } catch (error) {
        console.error('Error creating invitation:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error creating invitation link"
        });
    }
};

// Get invitation details by token (for displaying group info before joining)
export const getInvitationDetails = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { token } = req.params;

        if (!token) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Invitation token is required"
            });
            return;
        }

        const invitation = await InvitationModel.findOne({
            inviteToken: token,
            isActive: true,
            expiresAt: { $gt: new Date() }
        }).populate({
            path: 'conversationId',
            select: 'name description participants',
            populate: {
                path: 'participants.userId',
                select: 'username email'
            }
        });

        if (!invitation) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Invalid or expired invitation link"
            });
            return;
        }

        // Check if max uses reached
        if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "This invitation link has reached its maximum usage limit"
            });
            return;
        }

        const conversation = invitation.conversationId as any;
        
        res.status(httpStatusCodes.OK).json({
            data: {
                groupName: conversation.name,
                groupDescription: conversation.description,
                memberCount: conversation.participants.length,
                expiresAt: invitation.expiresAt,
                remainingUses: invitation.maxUses ? invitation.maxUses - invitation.usedCount : null
            }
        });
    } catch (error) {
        console.error('Error getting invitation details:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error retrieving invitation details"
        });
    }
};

// Submit join request via invitation link
export const submitJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { token, message = '' } = req.body;

        if (!token) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Invitation token is required"
            });
            return;
        }

        const invitation = await InvitationModel.findOne({
            inviteToken: token,
            isActive: true,
            expiresAt: { $gt: new Date() }
        });

        if (!invitation) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Invalid or expired invitation link"
            });
            return;
        }

        // Check if max uses reached
        if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "This invitation link has reached its maximum usage limit"
            });
            return;
        }

        // Check if user is already a participant
        const conversation = await ConversationModel.findById(invitation.conversationId);
        if (!conversation) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Group not found"
            });
            return;
        }

        const isAlreadyMember = conversation.participants.some(
            p => p.userId.toString() === userId && p.isActive
        );

        if (isAlreadyMember) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "You are already a member of this group"
            });
            return;
        }

        // Check if user already has a pending request
        const existingRequest = await JoinRequestModel.findOne({
            conversationId: invitation.conversationId,
            userId,
            status: 'pending'
        });

        if (existingRequest) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "You already have a pending join request for this group"
            });
            return;
        }

        // Create join request
        const joinRequest = new JoinRequestModel({
            conversationId: invitation.conversationId,
            userId,
            invitationId: invitation._id,
            message: message.trim()
        });

        await joinRequest.save();

        // Increment used count
        await InvitationModel.findByIdAndUpdate(invitation._id, {
            $inc: { usedCount: 1 }
        });

        res.status(httpStatusCodes.CREATED).json({
            message: "Join request submitted successfully. Wait for admin approval."
        });
    } catch (error) {
        console.error('Error submitting join request:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error submitting join request"
        });
    }
};

// Get pending join requests for a group (admin only)
export const getGroupJoinRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID is required"
            });
            return;
        }

        // Check if user is admin of the group
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can view join requests"
            });
            return;
        }

        const joinRequests = await JoinRequestModel.find({
            conversationId,
            status: 'pending'
        }).populate('userId', 'username email')
          .sort({ createdAt: -1 });

        res.status(httpStatusCodes.OK).json({
            data: joinRequests
        });
    } catch (error) {
        console.error('Error getting join requests:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error retrieving join requests"
        });
    }
};

// Process join request (approve/reject)
export const processJoinRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { requestId, action } = req.body; // action: 'approve' | 'reject'

        if (!requestId || !action || !['approve', 'reject'].includes(action)) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Request ID and valid action (approve/reject) are required"
            });
            return;
        }

        const joinRequest = await JoinRequestModel.findById(requestId).populate('userId', 'username email');
        if (!joinRequest) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Join request not found"
            });
            return;
        }

        if (joinRequest.status !== 'pending') {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "This request has already been processed"
            });
            return;
        }

        // Check if user is admin of the group
        const conversation = await ConversationModel.findOne({
            _id: joinRequest.conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can process join requests"
            });
            return;
        }

        // Update join request status
        joinRequest.status = action === 'approve' ? 'approved' : 'rejected';
        joinRequest.processedBy = new mongoose.Types.ObjectId(userId);
        joinRequest.processedAt = new Date();
        await joinRequest.save();

        // If approved, add user to group
        if (action === 'approve') {
            const updatedConversation = await ConversationModel.findByIdAndUpdate(
                joinRequest.conversationId,
                {
                    $push: {
                        participants: {
                            userId: joinRequest.userId,
                            role: 'member',
                            joinedAt: new Date(),
                            isActive: true
                        }
                    },
                    updatedAt: new Date()
                },
                { new: true }
            ).populate('participants.userId', 'username email');

            res.status(httpStatusCodes.OK).json({
                data: updatedConversation,
                message: `Join request ${action}d successfully`
            });
        } else {
            res.status(httpStatusCodes.OK).json({
                message: `Join request ${action}d successfully`
            });
        }
    } catch (error) {
        console.error('Error processing join request:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error processing join request"
        });
    }
};

// Get group invitations created by admin
export const getGroupInvitations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID is required"
            });
            return;
        }

        // Check if user is admin of the group
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can view invitations"
            });
            return;
        }

        const invitations = await InvitationModel.find({
            conversationId,
            isActive: true
        }).sort({ createdAt: -1 });

        const invitationsWithLinks = invitations.map(invitation => ({
            _id: invitation._id,
            inviteToken: invitation.inviteToken,
            inviteLink: `${process.env.FRONTEND_URL || 'http://localhost:4200'}/join-group?token=${invitation.inviteToken}`,
            expiresAt: invitation.expiresAt,
            maxUses: invitation.maxUses,
            usedCount: invitation.usedCount,
            createdAt: invitation.createdAt
        }));

        res.status(httpStatusCodes.OK).json({
            data: invitationsWithLinks
        });
    } catch (error) {
        console.error('Error getting invitations:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error retrieving invitations"
        });
    }
};

// Revoke invitation
export const revokeInvitation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { invitationId } = req.params;

        if (!invitationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Invitation ID is required"
            });
            return;
        }

        const invitation = await InvitationModel.findById(invitationId);
        if (!invitation) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Invitation not found"
            });
            return;
        }

        // Check if user is admin of the group
        const conversation = await ConversationModel.findOne({
            _id: invitation.conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can revoke invitations"
            });
            return;
        }

        // Deactivate invitation
        invitation.isActive = false;
        await invitation.save();

        res.status(httpStatusCodes.OK).json({
            message: "Invitation revoked successfully"
        });
    } catch (error) {
        console.error('Error revoking invitation:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error revoking invitation"
        });
    }
};
