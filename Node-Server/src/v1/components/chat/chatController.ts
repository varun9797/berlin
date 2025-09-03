import mongoose from "mongoose";
import { ConversationModel, MessageModel } from "./chatModel";

export const storeConversation = async (senderId: string, receiverId: string, message: string) => {
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