import mongoose, { Schema } from "mongoose";
import { ShcemaConstants } from "../../utils/const";

const conversationsSchema = new Schema({
    senderId: { type: String, required: true },
    participands: [{
        type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true
    }],

    readBy: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
}, { timestamps: true });

const messageSchema = new Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.CONVERSATION_SCHEMA, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
    content: { type: String, required: true },
}, { timestamps: true });

export const ConversationModel = mongoose.model(ShcemaConstants.CONVERSATION_SCHEMA, conversationsSchema);
export const MessageModel = mongoose.model(ShcemaConstants.MESSAGE_SCHEMA, messageSchema);