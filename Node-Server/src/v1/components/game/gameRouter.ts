import { Router } from "express";
import { 
    createWordGame, 
    joinWordGame, 
    startWordGame, 
    submitGuess, 
    getWordGame, 
    getActiveGame,
    endWordGame
} from "./gameController";
import authMiddleware from "../../middleware/authMiddleware";

const gameRoutes = Router();

// Test endpoint to check conversation participants
gameRoutes.get('/test-participants/:conversationId', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { ConversationModel } = await import('../chat/chatModel');
        
        const conversation = await ConversationModel.findOne({
            _id: conversationId
        }).populate('participants.userId', 'username');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        res.json({
            conversationId,
            participantsCount: conversation.participants.length,
            participants: conversation.participants.map(p => ({
                userId: (p.userId as any)._id,
                username: (p.userId as any).username,
                isActive: p.isActive,
                role: p.role
            }))
        });
    } catch (error) {
        console.error('Error testing participants:', error);
        res.status(500).json({ message: 'Error testing participants' });
    }
});

// Create a new word game
gameRoutes.post('/word-game/create', authMiddleware, createWordGame);

// Join an existing game
gameRoutes.post('/word-game/join', authMiddleware, joinWordGame);

// Start a game (creator only)
gameRoutes.post('/word-game/start', authMiddleware, startWordGame);

// End a game (creator only)
gameRoutes.post('/word-game/end', authMiddleware, endWordGame);

// Submit a guess
gameRoutes.post('/word-game/guess', authMiddleware, submitGuess);

// Get game details
gameRoutes.get('/word-game/:gameId', authMiddleware, getWordGame);

// Get active game for a conversation
gameRoutes.get('/conversation/:conversationId/active-game', authMiddleware, getActiveGame);

// Update existing game to include all participants
gameRoutes.post('/word-game/update-participants', authMiddleware, async (req, res) => {
    try {
        const { gameId } = req.body;
        const { WordGameModel } = await import('./gameModel');
        const { ConversationModel } = await import('../chat/chatModel');
        
        const game = await WordGameModel.findOne({ gameId });
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        const conversation = await ConversationModel.findOne({
            _id: game.conversationId
        }).populate('participants.userId', 'username');

        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }

        // Add all active participants as players
        const existingPlayerIds = game.players.map(p => p.userId.toString());
        const newPlayers: any[] = [];

        conversation.participants.forEach(p => {
            if (p.isActive && !existingPlayerIds.includes((p.userId as any)._id.toString())) {
                newPlayers.push({
                    userId: (p.userId as any)._id,
                    attempts: []
                });
            }
        });

        if (newPlayers.length > 0) {
            game.players.push(...newPlayers);
            await game.save();
        }

        // Populate and return updated game
        await game.populate('players.userId', 'username');
        
        res.json({
            message: `Added ${newPlayers.length} new players to the game`,
            playersCount: game.players.length,
            players: game.players.map(p => ({
                username: (p.userId as any).username,
                hasWon: p.hasWon,
                attemptsCount: p.attempts.length
            }))
        });

    } catch (error) {
        console.error('Error updating game participants:', error);
        res.status(500).json({ message: 'Error updating game participants' });
    }
});

// Direct fix for specific game
gameRoutes.post('/fix-game/:gameId', async (req, res) => {
    try {
        const { gameId } = req.params;
        const { WordGameModel } = await import('./gameModel');
        
        console.log('Attempting to fix game:', gameId);
        
        const game = await WordGameModel.findOne({ gameId });
        if (!game) {
            return res.status(404).json({ message: 'Game not found' });
        }

        console.log('Game found, current players:', game.players.length);

        // Add the known users directly
        const knownUsers = [
            { userId: '68b493e74f8f62197ddeade8', username: 'varun' },
            { userId: '68b5b4c91bdb5007123c93ed', username: 'ravish' }
        ];

        const existingPlayerIds = game.players.map(p => p.userId.toString());
        console.log('Existing player IDs:', existingPlayerIds);

        let addedCount = 0;
        for (const user of knownUsers) {
            if (!existingPlayerIds.includes(user.userId)) {
                game.players.push({
                    userId: user.userId,
                    attempts: []
                });
                addedCount++;
                console.log('Added user:', user.username);
            }
        }

        if (addedCount > 0) {
            await game.save();
            console.log('Game saved with', addedCount, 'new players');
        }

        // Return updated game info
        await game.populate('players.userId', 'username');
        
        res.json({
            message: `Added ${addedCount} players to the game`,
            playersCount: game.players.length,
            players: game.players.map(p => ({
                username: (p.userId as any).username,
                hasWon: p.hasWon,
                attemptsCount: p.attempts.length
            }))
        });

    } catch (error) {
        console.error('Error fixing game:', error);
        res.status(500).json({ message: 'Error fixing game' });
    }
});

export default gameRoutes;
