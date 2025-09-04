import mongoose from "mongoose";
import { ConversationModel, MessageModel } from "./chatModel";
import { AuthRequest, PaginationDetailsType } from "../../../types/types";
import { Request, Response } from "express";
import { httpStatusCodes } from "../../utils/httpStatusCodes";

export const storeConversation = async (senderId: string, receiverId: string, message: string) => {
    console.log('Storing conversation:', { senderId, receiverId, message });
    try {
        const newConversation = new ConversationModel({
            senderId: new mongoose.Types.ObjectId(senderId),
            participands: [
                new mongoose.Types.ObjectId(senderId),
                new mongoose.Types.ObjectId(receiverId)
            ]
        });

        let responseOfSavedCoversation = await newConversation.save();
        console.log('Conversation stored successfully:', responseOfSavedCoversation);
        const conversationId = responseOfSavedCoversation._id;
        const newMessage = new MessageModel({
            conversationId: new mongoose.Types.ObjectId(conversationId),
            senderId: new mongoose.Types.ObjectId(senderId),
            content: message,
        })
        let responseOfSavedMessage = await newMessage.save();
        console.log('Message stored successfully:', responseOfSavedMessage);

    } catch (error) {
        console.error('Error storing conversation:', error);
    }
}

export const getOfflineConversation = async (userIds: string[], paginationDetails: PaginationDetailsType) => {
    try {
        let conversations = await MessageModel.aggregate([
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
                    'conversationDetails.participands': {
                        $all:
                            userIds.map(id => new mongoose.Types.ObjectId(id))
                    }
                }
            }, {
                $sort: { createdAt: -1 } // Sort by latest messages
            }, {
                $skip: (paginationDetails.page - 1) * paginationDetails.limit
            }, {
                $limit: paginationDetails.limit
            }, {
                $sort: { createdAt: 1 } // Sort by latest messages
            }, {
                $project: {
                    // _id: 1,
                    conversationId: 1,
                    senderId: 1,
                    content: 1,
                    "conversationDetails.participands": 1
                }
            }
        ])
        return conversations;
        // console.log('Conversations found:', conversations);
    } catch (error) { }
}


export const getConversationsApi = async (req: AuthRequest, res: Response): Promise<void> => {
    console.log('getConversationsApi called with body:', req.body);
    const userIds: string[] = req.body.userIds || [];
    let userIdsArr: string[] = [];
    if (req.userId) {
        userIdsArr = [req.userId, ...userIds];
    } else {
        res.status(httpStatusCodes.FORBIDDEN).json({ message: "Something went wrong" });
    }

    const paginationDetails: PaginationDetailsType = req.body.paginationDetails || { page: 1, limit: 10 };

    try {
        let conversationResponse = await getOfflineConversation(userIds, paginationDetails);
        console.log('Conversations found:', conversationResponse);
        res.status(httpStatusCodes.OK).json({ data: conversationResponse });
    } catch (error) {
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
}