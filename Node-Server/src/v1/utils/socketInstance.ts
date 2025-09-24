import { Server } from "socket.io";

let io: Server | null = null;

export const setSocketInstance = (socketInstance: Server): void => {
    io = socketInstance;
};

export const getSocketInstance = (): Server | null => {
    return io;
};

// Game event types
export interface GameEventData {
    gameId: string;
    conversationId: string;
    event: 'game_created' | 'game_started' | 'game_ended' | 'guess_made' | 'player_won' | 'game_updated';
    data: any;
    timestamp: Date;
}

export const emitGameEvent = (eventData: GameEventData): void => {
    if (!io) {
        console.warn('Socket.IO instance not available');
        return;
    }

    console.log('Emitting game event:', eventData.event, 'for game:', eventData.gameId);
    
    // Emit to specific game room
    io.to(`game_${eventData.gameId}`).emit('gameEvent', eventData);
    
    // Also emit to conversation room for broader updates
    io.to(`gameConv_${eventData.conversationId}`).emit('gameUpdate', eventData);
};
