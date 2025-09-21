import mongoose from "mongoose";
import { ConversationModel, MessageModel } from "./chatModel";
import { AuthRequest, PaginationDetailsType } from "../../../types/types";
import { Request, Response } from "express";
import { httpStatusCodes } from "../../utils/httpStatusCodes";

// Create or get one-to-one conversation
export const getOrCreateOneToOneConversation = async (userId1: string, userId2: string) => {
    try {
        // Check if conversation already exists
        let conversation = await ConversationModel.findOne({
            type: 'one-to-one',
            'participants.userId': {
                $all: [
                    new mongoose.Types.ObjectId(userId1),
                    new mongoose.Types.ObjectId(userId2)
                ]
            }
        });

        if (!conversation) {
            // Create new one-to-one conversation
            conversation = new ConversationModel({
                type: 'one-to-one',
                participants: [
                    { userId: new mongoose.Types.ObjectId(userId1), role: 'member' },
                    { userId: new mongoose.Types.ObjectId(userId2), role: 'member' }
                ],
                createdBy: new mongoose.Types.ObjectId(userId1)
            });
            await conversation.save();
        }

        return conversation;
    } catch (error) {
        console.error('Error creating/getting one-to-one conversation:', error);
        throw error;
    }
};

// Create group conversation
export const createGroupConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { name, description, participantIds, settings } = req.body;

        if (!name || !participantIds || participantIds.length < 2) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Group name and at least 2 participants are required"
            });
            return;
        }

        const participants = participantIds.map((id: string, index: number) => ({
            userId: new mongoose.Types.ObjectId(id),
            role: index === 0 ? 'admin' : 'member' // First participant is admin
        }));

        // Add creator as admin if not already in list
        if (!participantIds.includes(req.userId)) {
            participants.unshift({
                userId: new mongoose.Types.ObjectId(req.userId),
                role: 'admin'
            });
        }

        const groupConversation = new ConversationModel({
            type: 'group',
            name,
            description,
            participants,
            createdBy: new mongoose.Types.ObjectId(req.userId),
            settings: settings || {}
        });

        const savedConversation = await groupConversation.save();
        await savedConversation.populate('participants.userId', 'username email');

        res.status(httpStatusCodes.CREATED).json({
            data: savedConversation,
            message: "Group created successfully"
        });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error creating group"
        });
    }
};

// Add participants to group
export const addParticipantsToGroup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { conversationId, participantIds } = req.body;

        const conversation = await ConversationModel.findById(conversationId);
        if (!conversation || conversation.type !== 'group') {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Group not found"
            });
            return;
        }

        // Check if user is admin or has permission
        const userParticipant = conversation.participants.find(
            p => p.userId.toString() === req.userId
        );

        if (!userParticipant ||
            (userParticipant.role !== 'admin' && !conversation.settings?.allowMembersToAddOthers)) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "You don't have permission to add participants"
            });
            return;
        }

        const newParticipants = participantIds.map((id: string) => ({
            userId: new mongoose.Types.ObjectId(id),
            role: 'member'
        }));

        conversation.participants.push(...newParticipants);
        await conversation.save();

        res.status(httpStatusCodes.OK).json({
            message: "Participants added successfully"
        });
    } catch (error) {
        console.error('Error adding participants:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error adding participants"
        });
    }
};

// Store message (enhanced for both one-to-one and group)
export const storeConversation = async (senderId: string, receiverId: string, message: string, conversationId?: string) => {
    try {
        let conversation;

        if (conversationId) {
            // Use existing conversation (group chat)
            conversation = await ConversationModel.findById(conversationId);
        } else {
            // Get or create one-to-one conversation
            conversation = await getOrCreateOneToOneConversation(senderId, receiverId);
        }

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const newMessage = new MessageModel({
            conversationId: conversation._id,
            senderId: new mongoose.Types.ObjectId(senderId),
            content: message,
            messageType: 'text'
        });

        const savedMessage = await newMessage.save();

        // Update last message in conversation
        conversation.lastMessage = {
            content: message,
            senderId: new mongoose.Types.ObjectId(senderId),
            timestamp: new Date()
        };
        await conversation.save();

        console.log('Message stored successfully:', savedMessage);
        return savedMessage;
    } catch (error) {
        console.error('Error storing message:', error);
        throw error;
    }
};

export const getOfflineConversation = async (userIds: string[], paginationDetails: PaginationDetailsType) => {
    try {
        let messages = await MessageModel.aggregate([
            {
                $lookup: {
                    from: 'conversations',
                    localField: 'conversationId',
                    foreignField: '_id',
                    as: 'conversationDetails'
                }
            }, {
                $unwind: '$conversationDetails'
            }, {
                $match: {
                    'conversationDetails.participants.userId': {
                        $all: userIds.map(id => new mongoose.Types.ObjectId(id))
                    }
                }
            }, {
                $sort: { createdAt: -1 }
            }, {
                $skip: (paginationDetails.page - 1) * paginationDetails.limit
            }, {
                $limit: paginationDetails.limit
            }, {
                $sort: { createdAt: 1 }
            }, {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'senderDetails'
                }
            }, {
                $project: {
                    conversationId: 1,
                    senderId: 1,
                    content: 1,
                    messageType: 1,
                    createdAt: 1,
                    'senderDetails.username': 1,
                    'conversationDetails.type': 1,
                    'conversationDetails.name': 1
                }
            }
        ]);
        return messages;
    } catch (error) {
        console.error('Error getting offline conversation:', error);
        return [];
    }
};

// Get user's conversations (both one-to-one and groups)
export const getUserConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { page = 1, limit = 20 } = req.query;

        const conversations = await ConversationModel.aggregate([
            {
                $match: {
                    'participants.userId': new mongoose.Types.ObjectId(userId),
                    'participants.isActive': true
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participants.userId',
                    foreignField: '_id',
                    as: 'participantDetails'
                }
            },
            {
                $lookup: {
                    from: 'messages',
                    localField: 'lastMessage.senderId',
                    foreignField: 'senderId',
                    as: 'lastMessageSender'
                }
            },
            {
                $sort: { 'lastMessage.timestamp': -1, updatedAt: -1 }
            },
            {
                $skip: (Number(page) - 1) * Number(limit)
            },
            {
                $limit: Number(limit)
            },
            {
                $addFields: {
                    participants: {
                        $map: {
                            input: '$participants',
                            as: 'participant',
                            in: {
                                $mergeObjects: [
                                    '$$participant',
                                    {
                                        $arrayElemAt: [
                                            {
                                                $filter: {
                                                    input: '$participantDetails',
                                                    cond: { $eq: ['$$this._id', '$$participant.userId'] }
                                                }
                                            },
                                            0
                                        ]
                                    }
                                ]
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    type: 1,
                    name: 1,
                    description: 1,
                    avatar: 1,
                    lastMessage: 1,
                    participants: {
                        $map: {
                            input: '$participants',
                            as: 'participant',
                            in: {
                                _id: '$$participant._id',
                                username: '$$participant.username',
                                email: '$$participant.email',
                                role: '$$participant.role',
                                joinedAt: '$$participant.joinedAt',
                                isActive: '$$participant.isActive'
                            }
                        }
                    },
                    createdAt: 1,
                    updatedAt: 1
                }
            }
        ]);

        res.status(httpStatusCodes.OK).json({
            data: conversations,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: conversations.length
            }
        });
    } catch (error) {
        console.error('Error getting user conversations:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error getting conversations"
        });
    }
};

export const getConversationsApi = async (req: AuthRequest, res: Response): Promise<void> => {
    const userIds: string[] = req.body.userIds || [];
    let userIdsArr: string[] = [];
    if (req.userId) {
        userIdsArr = [req.userId, ...userIds];
    } else {
        res.status(httpStatusCodes.FORBIDDEN).json({ message: "Something went wrong" });
        return;
    }

    const paginationDetails: PaginationDetailsType = req.body.paginationDetails || { page: 1, limit: 10 };

    try {
        let conversationResponse = await getOfflineConversation(userIdsArr, paginationDetails);
        res.status(httpStatusCodes.OK).json({ data: conversationResponse });
    } catch (error) {
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId, paginationDetails = { page: 1, limit: 50 } } = req.body;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({ message: "Conversation ID is required" });
            return;
        }

        // Verify user is part of the conversation
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            'participants.userId': userId,
            'participants.isActive': true
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({ message: "Access denied" });
            return;
        }

        const messages = await MessageModel.aggregate([
            {
                $match: {
                    conversationId: new mongoose.Types.ObjectId(conversationId)
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $skip: (paginationDetails.page - 1) * paginationDetails.limit
            },
            {
                $limit: paginationDetails.limit
            },
            {
                $sort: { createdAt: 1 }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'senderId',
                    foreignField: '_id',
                    as: 'senderDetails'
                }
            },
            {
                $project: {
                    conversationId: 1,
                    senderId: 1,
                    content: 1,
                    messageType: 1,
                    timestamp: '$createdAt',
                    createdAt: 1,
                    'senderDetails.username': 1
                }
            }
        ]);

        res.status(httpStatusCodes.OK).json(messages);
    } catch (error) {
        console.error('Error getting conversation messages:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error getting messages"
        });
    }
};

// Remove participant from group
export const removeParticipantFromGroup = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId, participantId } = req.body;

        if (!conversationId || !participantId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID and participant ID are required"
            });
            return;
        }

        // Find the conversation and check if user is admin
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can remove participants"
            });
            return;
        }

        // Remove participant
        const updatedConversation = await ConversationModel.findByIdAndUpdate(
            conversationId,
            {
                $pull: {
                    participants: { userId: participantId }
                },
                updatedAt: new Date()
            },
            { new: true }
        ).populate('participants.userId', 'username email');

        if (!updatedConversation) {
            res.status(httpStatusCodes.NOT_FOUND).json({ message: "Conversation not found" });
            return;
        }

        res.status(httpStatusCodes.OK).json(updatedConversation);
    } catch (error) {
        console.error('Error removing participant:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error removing participant"
        });
    }
};

// Update group information
export const updateGroupInfo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId } = req.params;
        const { name, description } = req.body;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID is required"
            });
            return;
        }

        // Find the conversation and check if user is admin
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            type: 'group',
            'participants.userId': userId,
            'participants.role': 'admin'
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only group admins can update group information"
            });
            return;
        }

        // Update group info
        const updateData: any = { updatedAt: new Date() };
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        const updatedConversation = await ConversationModel.findByIdAndUpdate(
            conversationId,
            updateData,
            { new: true }
        ).populate('participants.userId', 'username email');

        if (!updatedConversation) {
            res.status(httpStatusCodes.NOT_FOUND).json({ message: "Conversation not found" });
            return;
        }

        res.status(httpStatusCodes.OK).json(updatedConversation);
    } catch (error) {
        console.error('Error updating group info:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error updating group information"
        });
    }
};