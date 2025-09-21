import mongoose, { Schema } from "mongoose";
import { ShcemaConstants } from "../../utils/const";

const invitationSchema = new Schema({
    conversationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: ShcemaConstants.CONVERSATION_SCHEMA, 
        required: true 
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: ShcemaConstants.USER_SCHEMA, 
        required: true 
    },
    inviteToken: { 
        type: String, 
        required: true, 
        unique: true 
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    expiresAt: { 
        type: Date, 
        required: true 
    },
    maxUses: { 
        type: Number, 
        default: null // null means unlimited
    },
    usedCount: { 
        type: Number, 
        default: 0 
    }
}, { timestamps: true });

const joinRequestSchema = new Schema({
    conversationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: ShcemaConstants.CONVERSATION_SCHEMA, 
        required: true 
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: ShcemaConstants.USER_SCHEMA, 
        required: true 
    },
    invitationId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Invitation', 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'approved', 'rejected'], 
        default: 'pending' 
    },
    message: { 
        type: String, 
        maxlength: 200 
    },
    processedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: ShcemaConstants.USER_SCHEMA 
    },
    processedAt: { 
        type: Date 
    }
}, { timestamps: true });

// Add indexes for better performance
invitationSchema.index({ inviteToken: 1 });
invitationSchema.index({ conversationId: 1 });
invitationSchema.index({ expiresAt: 1 });

joinRequestSchema.index({ conversationId: 1, status: 1 });
joinRequestSchema.index({ userId: 1 });

export const InvitationModel = mongoose.model('Invitation', invitationSchema);
export const JoinRequestModel = mongoose.model('JoinRequest', joinRequestSchema);
