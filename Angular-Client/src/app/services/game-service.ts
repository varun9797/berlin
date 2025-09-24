import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subscription } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { DOCUMENT } from '@angular/common';
import { ChatServices } from './chat-services';

export interface WordGameAttempt {
  word: string;
  result: Array<{
    letter: string;
    status: 'correct' | 'present' | 'absent';
  }>;
  attemptNumber: number;
  timestamp: Date;
}

export interface WordGamePlayer {
  username: string;
  hasWon: boolean;
  attemptsCount: number;
  score?: number;
  completedAt?: Date;
}

export interface WordGame {
  gameId: string;
  conversationId: string;
  gameType: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  wordLength: number;
  maxAttempts: number;
  timeLimit: number;
  createdBy: {
    _id: string;
    username: string;
  };
  playersCount: number;
  players: WordGamePlayer[];
  startedAt?: Date;
  completedAt?: Date;
  winner?: {
    _id: string;
    username: string;
  };
  targetWord?: string;
  myAttempts?: WordGameAttempt[];
}

export interface CreateGameRequest {
  conversationId: string;
  targetWord?: string;
  wordLength?: number;
  maxAttempts?: number;
  timeLimit?: number;
}

export interface JoinGameRequest {
  gameId: string;
}

export interface StartGameRequest {
  gameId: string;
}

export interface SubmitGuessRequest {
  gameId: string;
  word: string;
}

export interface GuessResponse {
  message: string;
  result: Array<{
    letter: string;
    status: 'correct' | 'present' | 'absent';
  }>;
  isWinner: boolean;
  attemptNumber: number;
  attemptsLeft: number;
  gameStatus: string;
  score?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private apiUrl = environment.apiUrl + '/api/v1';
  
  // Store games by conversation ID to isolate state between groups
  private gamesByConversation = new Map<string, BehaviorSubject<WordGame | null>>();
  
  // Track connected rooms and game event subscription
  private connectedRooms = new Set<string>();
  private gameEventSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
    private chatService: ChatServices
  ) {
    // Subscribe to game events from chat service
    this.initializeGameEventListener();
  }

  // Initialize game event listener using chat service
  private initializeGameEventListener(): void {
    // Ensure chat service is ready for game events
    this.chatService.initializeGameEventListener();
    
    if (this.chatService.gameEventSubject) {
      this.gameEventSubscription = this.chatService.gameEventSubject.subscribe(event => {
        // Handle events for the current conversation
        this.handleGameEvent(event);
      });
    }
  }

  // Cleanup subscriptions
  public disconnect(): void {
    if (this.gameEventSubscription) {
      this.gameEventSubscription.unsubscribe();
      this.gameEventSubscription = null;
    }
    this.connectedRooms.clear();
    console.log('🎮 Game event listener disconnected');
  }

  // Handle incoming game events
  private handleGameEvent(eventData: any): void {
    console.log('🎮 Received game event:', eventData);
    
    if (!eventData.conversationId) {
      console.warn('🎮 Game event missing required conversationId:', eventData);
      return;
    }

    const conversationId = eventData.conversationId;
    
    // Refresh game data for the affected conversation
    switch (eventData.event) {
      case 'game_created':
        console.log('🎮 Game created event received');
        this.refreshCurrentGame(conversationId);
        break;
      case 'game_started':
        console.log('🎮 Game started event received');
        this.refreshCurrentGame(conversationId);
        break;
      case 'guess_made':
        console.log('🎮 Guess made event received:', eventData.data?.player?.username || 'Unknown player');
        this.refreshCurrentGame(conversationId);
        break;
      case 'player_won':
        console.log('🎮 Player won event received:', eventData.data?.winner?.username || 'Unknown player');
        this.refreshCurrentGame(conversationId);
        break;
      case 'game_ended':
        console.log('🎮 Game ended event received');
        this.refreshCurrentGame(conversationId);
        break;
      default:
        console.log('🎮 Unknown game event:', eventData.event);
    }
  }

  // Join game room for real-time updates
  public joinGameRoom(gameId: string, conversationId: string): void {
    const roomKey = `${gameId}_${conversationId}`;
    
    if (!this.connectedRooms.has(roomKey)) {
      this.chatService.joinGameRoom(conversationId);
      this.connectedRooms.add(roomKey);
      console.log(`🎮 Joined game room: ${gameId} for conversation: ${conversationId}`);
    } else {
      console.log(`🎮 Already in game room: ${gameId} for conversation: ${conversationId}`);
    }
  }

  // Leave game room when no longer needed
  public leaveGameRoom(gameId: string, conversationId: string): void {
    const roomKey = `${gameId}_${conversationId}`;
    
    if (this.connectedRooms.has(roomKey)) {
      this.chatService.leaveGameRoom(conversationId);
      this.connectedRooms.delete(roomKey);
      console.log(`🎮 Left game room: ${gameId} for conversation: ${conversationId}`);
    }
  }

  // Get or create a game subject for a specific conversation
  private getGameSubjectForConversation(conversationId: string): BehaviorSubject<WordGame | null> {
    if (!this.gamesByConversation.has(conversationId)) {
      this.gamesByConversation.set(conversationId, new BehaviorSubject<WordGame | null>(null));
    }
    return this.gamesByConversation.get(conversationId)!;
  }

  // Get game observable for a specific conversation
  public getGameObservable(conversationId: string): Observable<WordGame | null> {
    return this.getGameSubjectForConversation(conversationId).asObservable();
  }

  // Create a new word game
  createWordGame(request: CreateGameRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/word-game/create`, request).pipe(
      tap((response: any) => {
        console.log('Game created:', response);
        if (response && response.game && request.conversationId) {
          // Set the current game for this specific conversation
          const gameSubject = this.getGameSubjectForConversation(request.conversationId);
          gameSubject.next(response.game);
          
          // Join game room for real-time updates
          this.joinGameRoom(response.game.gameId, request.conversationId);
        }
      })
    );
  }

  // Join an existing game
  joinWordGame(request: JoinGameRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/word-game/join`, request);
  }

  // Start a game (creator only)
  startWordGame(request: StartGameRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/word-game/start`, request);
  }

  // End a game (creator only)
  endWordGame(request: { gameId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/word-game/end`, request);
  }

  // Update game to include all group participants
  updateGameParticipants(request: { gameId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/word-game/update-participants`, request);
  }

  // Direct fix for specific game
  directFixGame(gameId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/game/fix-game/${gameId}`, {});
  }

  // Submit a guess
  submitGuess(request: SubmitGuessRequest, conversationId?: string): Observable<GuessResponse> {
    return this.http.post<GuessResponse>(`${this.apiUrl}/game/word-game/guess`, request).pipe(
      tap(() => {
        // Refresh game data after guess
        if (conversationId) {
          this.refreshCurrentGame(conversationId);
        }
      })
    );
  }

  // Get game details
  getWordGame(gameId: string, conversationId?: string): Observable<WordGame> {
    return this.http.get<WordGame>(`${this.apiUrl}/game/word-game/${gameId}`).pipe(
      tap((game: WordGame) => {
        // Update the game for its specific conversation
        const gameConversationId = conversationId || game.conversationId;
        if (gameConversationId) {
          const gameSubject = this.getGameSubjectForConversation(gameConversationId);
          gameSubject.next(game);
          
          // Join game room if game is active and not completed
          if (game.status === 'active' || game.status === 'waiting') {
            this.joinGameRoom(gameId, gameConversationId);
          }
        }
      })
    );
  }

  // Get active game for a conversation
  getActiveGame(conversationId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/game/conversation/${conversationId}/active-game`).pipe(
      tap((response: any) => {
        const gameSubject = this.getGameSubjectForConversation(conversationId);
        if (response && response.gameId) {
          console.log('🎮 Found active game:', response.gameId, 'for conversation:', conversationId);
          // If there's an active game, fetch its details and join room
          this.getWordGame(response.gameId, conversationId).subscribe(() => {
            // Ensure we join the game room after fetching game details
            console.log('🎮 Auto-joining room for active game:', response.gameId);
            this.joinGameRoom(response.gameId, conversationId);
          });
        } else {
          console.log('🎮 No active game found for conversation:', conversationId);
          gameSubject.next(null);
        }
      })
    );
  }

  // Refresh current game data for a specific conversation
  refreshCurrentGame(conversationId: string): void {
    console.log('🎮 Refreshing current game for conversation:', conversationId);
    const gameSubject = this.getGameSubjectForConversation(conversationId);
    const currentGame = gameSubject.value;
    if (currentGame) {
      console.log('🎮 Fetching updated game data for gameId:', currentGame.gameId);
      this.getWordGame(currentGame.gameId, conversationId).subscribe({
        next: (updatedGame) => {
          console.log('🎮 Game data refreshed:', updatedGame);
        },
        error: (error) => {
          console.error('🎮 Error refreshing game data:', error);
        }
      });
    } else {
      console.warn('🎮 No current game to refresh for conversation:', conversationId);
    }
  }

  // Clear current game for a specific conversation
  clearCurrentGame(conversationId: string): void {
    const gameSubject = this.getGameSubjectForConversation(conversationId);
    const currentGame = gameSubject.value;
    
    // Leave game room if there was a current game
    if (currentGame) {
      this.leaveGameRoom(currentGame.gameId, conversationId);
    }
    
    gameSubject.next(null);
  }

  // Get current game synchronously for a specific conversation
  getCurrentGame(conversationId: string): WordGame | null {
    const gameSubject = this.getGameSubjectForConversation(conversationId);
    return gameSubject.value;
  }

  // Check if user is game creator
  isGameCreator(userId: string, conversationId: string): boolean {
    const game = this.getCurrentGame(conversationId);
    return game ? game.createdBy._id === userId : false;
  }

  // Check if user is in game
  isPlayerInGame(userId: string, conversationId: string): boolean {
    const game = this.getCurrentGame(conversationId);
    if (!game) return false;
    
    return game.players.some(player => 
      // Assuming we can get userId from the player data somehow
      // This might need adjustment based on actual API response structure
      player.username === userId // This is a placeholder - adjust as needed
    );
  }

  // Get player's attempts count
  getPlayerAttemptsCount(username: string, conversationId: string): number {
    const game = this.getCurrentGame(conversationId);
    if (!game) return 0;
    
    const player = game.players.find(p => p.username === username);
    return player ? player.attemptsCount : 0;
  }

  // Check if game is joinable
  isGameJoinable(conversationId: string): boolean {
    const game = this.getCurrentGame(conversationId);
    return game ? game.status === 'waiting' : false;
  }

  // Check if game is active
  isGameActive(conversationId: string): boolean {
    const game = this.getCurrentGame(conversationId);
    return game ? game.status === 'active' : false;
  }

  // Check if game is completed
  isGameCompleted(conversationId: string): boolean {
    const game = this.getCurrentGame(conversationId);
    return game ? game.status === 'completed' : false;
  }
}
