import { Response } from "express";
import { AuthRequest } from "../../../types/types";
import { httpStatusCodes } from "../../utils/httpStatusCodes";
import { WordGameModel } from "./gameModel";
import { ConversationModel } from "../chat/chatModel";
import { v4 as uuidv4 } from 'uuid';
import { Types } from 'mongoose';
import { emitGameEvent } from '../../utils/socketInstance';

// Common English 5-letter words for random selection
const WORD_BANK = [
    'ABOUT', 'ABOVE', 'ABUSE', 'ACTOR', 'ACUTE', 'ADMIT', 'ADOPT', 'ADULT', 'AFTER', 'AGAIN',
    'AGENT', 'AGREE', 'AHEAD', 'ALARM', 'ALBUM', 'ALERT', 'ALIEN', 'ALIGN', 'ALIKE', 'ALIVE',
    'ALLOW', 'ALONE', 'ALONG', 'ALTER', 'ANGER', 'ANGLE', 'ANGRY', 'APART', 'APPLE', 'APPLY',
    'ARENA', 'ARGUE', 'ARISE', 'ARMED', 'ARMOR', 'ARRAY', 'ARROW', 'ASIDE', 'ASSET', 'AVOID',
    'AWAKE', 'AWARD', 'AWARE', 'BADLY', 'BASIC', 'BEACH', 'BEGAN', 'BEGIN', 'BEING', 'BELOW',
    'BENCH', 'BILLY', 'BIRTH', 'BLACK', 'BLAME', 'BLANK', 'BLAST', 'BLIND', 'BLOCK', 'BLOOD',
    'BOARD', 'BOOST', 'BOOTH', 'BOUND', 'BRAIN', 'BRAND', 'BRASS', 'BRAVE', 'BREAD', 'BREAK',
    'BREED', 'BRIEF', 'BRING', 'BROAD', 'BROKE', 'BROWN', 'BUILD', 'BUILT', 'BURST', 'BUYER',
    'CABLE', 'CANDY', 'CARRY', 'CATCH', 'CAUSE', 'CHAIN', 'CHAIR', 'CHAOS', 'CHARM', 'CHART',
    'CHASE', 'CHEAP', 'CHECK', 'CHEST', 'CHIEF', 'CHILD', 'CHINA', 'CHOSE', 'CIVIL', 'CLAIM'
];

// Create a new word game
export const createWordGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { conversationId, targetWord, wordLength = 5, maxAttempts = 6, timeLimit = 300 } = req.body;

        if (!conversationId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Conversation ID is required"
            });
            return;
        }

        // Check if user is member of the conversation
        const conversation = await ConversationModel.findOne({
            _id: conversationId,
            'participants.userId': userId
        }).populate('participants.userId', 'username');

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "You are not a member of this conversation"
            });
            return;
        }

        console.log('Full conversation object:', JSON.stringify(conversation, null, 2));

        // Check if there's already an active game
        const activeGame = await WordGameModel.findOne({
            conversationId,
            status: { $in: ['waiting', 'active'] }
        });

        if (activeGame) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "There's already an active game in this group"
            });
            return;
        }

        // Use provided word or pick random one
        const word = targetWord ? targetWord.toUpperCase() : WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
        
        // Validate word length
        if (word.length !== wordLength) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: `Word must be exactly ${wordLength} letters long`
            });
            return;
        }

        // Create new game with all conversation participants as players
        console.log('Conversation participants:', conversation.participants);
        const players = conversation.participants
            .filter(p => p.isActive) // Only include active participants
            .map(p => ({
                userId: p.userId,
                attempts: []
            }));

        console.log('Players to be added to game:', players);

        const newGame = new WordGameModel({
            conversationId,
            gameId: uuidv4(),
            createdBy: userId,
            targetWord: word,
            wordLength,
            maxAttempts,
            timeLimit,
            players
        });

        await newGame.save();

        // Populate creator and players info
        await newGame.populate('createdBy', 'username');
        await newGame.populate('players.userId', 'username');

        console.log('Game created with players:', newGame.players);

        // Emit real-time game creation event
        emitGameEvent({
            gameId: newGame.gameId,
            conversationId: conversationId,
            event: 'game_created',
            data: {
                gameId: newGame.gameId,
                conversationId: newGame.conversationId,
                status: newGame.status,
                createdBy: newGame.createdBy,
                playersCount: newGame.players.length,
                wordLength: newGame.wordLength,
                maxAttempts: newGame.maxAttempts
            },
            timestamp: new Date()
        });

        res.status(httpStatusCodes.CREATED).json({
            message: "Word game created successfully",
            game: {
                gameId: newGame.gameId,
                conversationId: newGame.conversationId,
                gameType: newGame.gameType,
                status: newGame.status,
                wordLength: newGame.wordLength,
                maxAttempts: newGame.maxAttempts,
                timeLimit: newGame.timeLimit,
                createdBy: newGame.createdBy,
                playersCount: newGame.players.length,
                players: newGame.players.map(p => ({
                    username: (p.userId as any).username,
                    hasWon: p.hasWon,
                    attemptsCount: p.attempts.length,
                    score: p.score
                }))
            }
        });

    } catch (error) {
        console.error('Error creating word game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error creating word game"
        });
    }
};

// Join an existing game
export const joinWordGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { gameId } = req.body;

        if (!gameId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game ID is required"
            });
            return;
        }

        const game = await WordGameModel.findOne({ gameId });

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Game not found"
            });
            return;
        }

        if (game.status !== 'waiting') {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game is not accepting new players"
            });
            return;
        }

        // Check if user is already a player (they should be auto-added)
        const existingPlayer = game.players.find(p => p.userId.toString() === userId);
        if (existingPlayer) {
            res.status(httpStatusCodes.OK).json({
                message: "You are already in this game",
                playersCount: game.players.length
            });
            return;
        }

        // Check if user is member of the conversation
        const conversation = await ConversationModel.findOne({
            _id: game.conversationId,
            'participants.userId': userId
        });

        if (!conversation) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "You are not a member of this conversation"
            });
            return;
        }

        // Add player to game (shouldn't normally happen since they should be auto-added)
        game.players.push({
            userId,
            attempts: []
        });

        await game.save();

        res.status(httpStatusCodes.OK).json({
            message: "Joined game successfully",
            playersCount: game.players.length
        });

    } catch (error) {
        console.error('Error joining word game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error joining word game"
        });
    }
};

// Start the game
export const startWordGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { gameId } = req.body;

        const game = await WordGameModel.findOne({ gameId });

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Game not found"
            });
            return;
        }

        // Only creator can start the game
        if (game.createdBy.toString() !== userId) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only the game creator can start the game"
            });
            return;
        }

        if (game.status !== 'waiting') {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game cannot be started"
            });
            return;
        }

        // Start the game
        game.status = 'active';
        game.startedAt = new Date();

        await game.save();

        // Emit real-time game start event
        emitGameEvent({
            gameId: game.gameId,
            conversationId: game.conversationId.toString(),
            event: 'game_started',
            data: {
                gameId: game.gameId,
                status: 'active',
                startedAt: game.startedAt
            },
            timestamp: new Date()
        });

        res.status(httpStatusCodes.OK).json({
            message: "Game started successfully",
            startedAt: game.startedAt
        });

    } catch (error) {
        console.error('Error starting word game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error starting word game"
        });
    }
};

// Submit a guess
export const submitGuess = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { gameId, word } = req.body;

        if (!gameId || !word) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game ID and word are required"
            });
            return;
        }

        const game = await WordGameModel.findOne({ gameId });

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Game not found"
            });
            return;
        }

        if (game.status !== 'active') {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game is not active"
            });
            return;
        }

        // Find player
        const player = game.players.find(p => p.userId.toString() === userId);
        if (!player) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "You are not a player in this game"
            });
            return;
        }

        // Check if player already won
        if (player.hasWon) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "You have already won this game"
            });
            return;
        }

        // Check attempt limit
        if (player.attempts.length >= game.maxAttempts) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "You have reached the maximum number of attempts"
            });
            return;
        }

        const guessWord = word.toUpperCase();
        const targetWord = game.targetWord;

        // Validate word length
        if (guessWord.length !== game.wordLength) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: `Word must be exactly ${game.wordLength} letters long`
            });
            return;
        }

        // Process the guess
        const result = [];
        const targetLetters = targetWord.split('');
        const guessLetters = guessWord.split('');
        
        // First pass - mark correct positions
        const usedTargetIndices = new Set();
        const usedGuessIndices = new Set();
        
        for (let i = 0; i < guessLetters.length; i++) {
            if (guessLetters[i] === targetLetters[i]) {
                result[i] = { letter: guessLetters[i], status: 'correct' };
                usedTargetIndices.add(i);
                usedGuessIndices.add(i);
            }
        }
        
        // Second pass - mark present letters
        for (let i = 0; i < guessLetters.length; i++) {
            if (usedGuessIndices.has(i)) continue;
            
            let found = false;
            for (let j = 0; j < targetLetters.length; j++) {
                if (!usedTargetIndices.has(j) && guessLetters[i] === targetLetters[j]) {
                    result[i] = { letter: guessLetters[i], status: 'present' };
                    usedTargetIndices.add(j);
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                result[i] = { letter: guessLetters[i], status: 'absent' };
            }
        }

        // Add attempt
        const attemptNumber = player.attempts.length + 1;
        player.attempts.push({
            word: guessWord,
            result,
            attemptNumber,
            timestamp: new Date()
        });

        // Check if won
        const isWinner = guessWord === targetWord;
        if (isWinner) {
            player.hasWon = true;
            player.completedAt = new Date();
            player.score = (game.maxAttempts - attemptNumber + 1) * 10; // Better score for fewer attempts
            
            if (!game.winner) {
                game.winner = new Types.ObjectId(userId);
            }
        }

        // Check if game should end
        const allPlayersFinished = game.players.every(p => 
            p.hasWon || p.attempts.length >= game.maxAttempts
        );

        if (allPlayersFinished) {
            game.status = 'completed';
            game.completedAt = new Date();
        }

        await game.save();

        // Populate user info for the guess event
        await game.populate('players.userId', 'username');
        const playerWithUser = game.players.find(p => p.userId._id.toString() === userId);
        
        // Emit real-time guess event to all players
        emitGameEvent({
            gameId: game.gameId,
            conversationId: game.conversationId.toString(),
            event: 'guess_made',
            data: {
                gameId: game.gameId,
                player: {
                    username: (playerWithUser?.userId as any)?.username || 'Unknown',
                    userId: userId
                },
                guess: {
                    word: guessWord,
                    result,
                    attemptNumber,
                    isWinner,
                    attemptsLeft: game.maxAttempts - attemptNumber
                },
                gameStatus: game.status,
                allPlayersFinished
            },
            timestamp: new Date()
        });

        // If someone won, emit player won event
        if (isWinner) {
            emitGameEvent({
                gameId: game.gameId,
                conversationId: game.conversationId.toString(),
                event: 'player_won',
                data: {
                    gameId: game.gameId,
                    winner: {
                        username: (playerWithUser?.userId as any)?.username || 'Unknown',
                        userId: userId,
                        score: player.score,
                        attempts: attemptNumber
                    },
                    gameStatus: game.status
                },
                timestamp: new Date()
            });
        }

        res.status(httpStatusCodes.OK).json({
            message: isWinner ? "Congratulations! You won!" : "Guess submitted",
            result,
            isWinner,
            attemptNumber,
            attemptsLeft: game.maxAttempts - attemptNumber,
            gameStatus: game.status,
            score: player.score
        });

    } catch (error) {
        console.error('Error submitting guess:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error submitting guess"
        });
    }
};

// Get game details
export const getWordGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { gameId } = req.params;
        const userId = req.userId;

        const game = await WordGameModel.findOne({ gameId })
            .populate('createdBy', 'username')
            .populate('players.userId', 'username')
            .populate('winner', 'username');

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Game not found"
            });
            return;
        }

        // Check if user is a player
        const isPlayer = game.players.some(p => (p.userId as any)._id.toString() === userId);
        
        const response: any = {
            gameId: game.gameId,
            conversationId: game.conversationId,
            gameType: game.gameType,
            status: game.status,
            wordLength: game.wordLength,
            maxAttempts: game.maxAttempts,
            timeLimit: game.timeLimit,
            createdBy: game.createdBy,
            playersCount: game.players.length,
            players: game.players.map(p => ({
                username: (p.userId as any).username,
                hasWon: p.hasWon,
                attemptsCount: p.attempts.length,
                score: p.score,
                completedAt: p.completedAt
            })),
            startedAt: game.startedAt,
            completedAt: game.completedAt,
            winner: game.winner
        };

        // Only show attempts to the player themselves
        if (isPlayer) {
            const currentPlayer = game.players.find(p => (p.userId as any)._id.toString() === userId);
            response.myAttempts = currentPlayer?.attempts || [];
        }

        // Only show target word if game is completed
        if (game.status === 'completed') {
            response.targetWord = game.targetWord;
        }

        res.status(httpStatusCodes.OK).json(response);

    } catch (error) {
        console.error('Error getting word game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error getting word game"
        });
    }
};

// End/stop the game (admin only)
export const endWordGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const { gameId } = req.body;

        if (!gameId) {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game ID is required"
            });
            return;
        }

        const game = await WordGameModel.findOne({ gameId });

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "Game not found"
            });
            return;
        }

        // Only creator can end the game
        if (game.createdBy.toString() !== userId) {
            res.status(httpStatusCodes.FORBIDDEN).json({
                message: "Only the game creator can end the game"
            });
            return;
        }

        if (game.status === 'completed') {
            res.status(httpStatusCodes.BAD_REQUEST).json({
                message: "Game is already completed"
            });
            return;
        }

        // End the game
        game.status = 'completed';
        game.completedAt = new Date();

        // Set reason for ending
        game.endReason = 'ended_by_admin';

        await game.save();

        // Emit real-time game end event
        emitGameEvent({
            gameId: game.gameId,
            conversationId: game.conversationId.toString(),
            event: 'game_ended',
            data: {
                gameId: game.gameId,
                status: 'completed',
                endReason: 'ended_by_admin',
                targetWord: game.targetWord,
                completedAt: game.completedAt
            },
            timestamp: new Date()
        });

        res.status(httpStatusCodes.OK).json({
            message: "Game ended by admin",
            completedAt: game.completedAt,
            targetWord: game.targetWord
        });

    } catch (error) {
        console.error('Error ending word game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error ending word game"
        });
    }
};

// Get active game for a conversation
export const getActiveGame = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { conversationId } = req.params;

        const game = await WordGameModel.findOne({
            conversationId,
            status: { $in: ['waiting', 'active'] }
        }).populate('createdBy', 'username');

        if (!game) {
            res.status(httpStatusCodes.NOT_FOUND).json({
                message: "No active game found"
            });
            return;
        }

        res.status(httpStatusCodes.OK).json({
            gameId: game.gameId,
            status: game.status,
            createdBy: game.createdBy,
            playersCount: game.players.length
        });

    } catch (error) {
        console.error('Error getting active game:', error);
        res.status(httpStatusCodes.INTERNAL_SERVER_ERROR).json({
            message: "Error getting active game"
        });
    }
};
