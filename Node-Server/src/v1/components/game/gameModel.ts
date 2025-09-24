import mongoose, { Schema } from "mongoose";
import { ShcemaConstants } from "../../utils/const";

const wordGameSchema = new Schema({
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.CONVERSATION_SCHEMA, required: true },
    gameId: { type: String, required: true, unique: true },
    gameType: {
        type: String,
        enum: ['wordle'],
        default: 'wordle'
    },
    status: {
        type: String,
        enum: ['waiting', 'active', 'completed', 'cancelled'],
        default: 'waiting'
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
    targetWord: { type: String, required: true },
    wordLength: { type: Number, default: 5 },
    maxAttempts: { type: Number, default: 6 },
    timeLimit: { type: Number, default: 300 }, // 5 minutes in seconds
    players: [{
        userId: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA, required: true },
        joinedAt: { type: Date, default: Date.now },
        attempts: [{
            word: { type: String, required: true },
            result: [{ // Array of objects for each letter
                letter: { type: String, required: true },
                status: { 
                    type: String, 
                    enum: ['correct', 'present', 'absent'], 
                    required: true 
                }
            }],
            attemptNumber: { type: Number, required: true },
            timestamp: { type: Date, default: Date.now }
        }],
        hasWon: { type: Boolean, default: false },
        completedAt: { type: Date },
        score: { type: Number, default: 0 }
    }],
    winner: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA },
    startedAt: { type: Date },
    completedAt: { type: Date },
    endReason: { 
        type: String, 
        enum: ['natural_completion', 'ended_by_admin', 'timeout', 'cancelled'],
        default: 'natural_completion'
    },
    hints: [{
        text: { type: String, required: true },
        revealedBy: { type: mongoose.Schema.Types.ObjectId, ref: ShcemaConstants.USER_SCHEMA },
        revealedAt: { type: Date, default: Date.now }
    }]
}, { timestamps: true });

// Create compound index for faster queries
wordGameSchema.index({ conversationId: 1, status: 1 });
wordGameSchema.index({ gameId: 1 });

export const WordGameModel = mongoose.model(ShcemaConstants.WORD_GAME_SCHEMA, wordGameSchema);
