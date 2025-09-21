import mongoose, { Schema } from "mongoose";
import { ShcemaConstants } from "../../utils/const";

const conversationsSchema = new Schema({
    type: {
        type: String,
        enum: ['one-to-one', 'group'],
        default: 'one-to-one'
    },
    name: {
        type: String,
        required: function (this: any) { return this.type === 'group'; }
    },
    description: { type: String },
    avatar: { type: String },
    participants: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
        isActive: { type: Boolean, default: true }
    }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
    lastMessage: {
        content: { type: String },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA },
        timestamp: { type: Date }
    },
    settings: {
        allowMembersToAddOthers: { type: Boolean, default: false },
        onlyAdminsCanSendMessages: { type: Boolean, default: false }
    }
}, { timestamps: true });

const messageSchema = new Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.CONVERSATION_SCHEMA, required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
    content: { type: String, required: true },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file', 'system'],
        default: 'text'
    },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.MESSAGE_SCHEMA },
    readBy: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA },
        readAt: { type: Date, default: Date.now }
    }],
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date }
}, { timestamps: true });

// Add indexes for better performance
conversationsSchema.index({ 'participants.userId': 1 });
conversationsSchema.index({ type: 1 });
conversationsSchema.index({ createdAt: -1 });

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

export const ConversationModel = mongoose.model(ShcemaConstants.CONVERSATION_SCHEMA, conversationsSchema);
export const MessageModel = mongoose.model(ShcemaConstants.MESSAGE_SCHEMA, messageSchema);