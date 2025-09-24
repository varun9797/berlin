import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

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

  constructor(private http: HttpClient) {}

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
          // If there's an active game, fetch its details
          this.getWordGame(response.gameId, conversationId).subscribe();
        } else {
          gameSubject.next(null);
        }
      })
    );
  }

  // Refresh current game data for a specific conversation
  refreshCurrentGame(conversationId: string): void {
    const gameSubject = this.getGameSubjectForConversation(conversationId);
    const currentGame = gameSubject.value;
    if (currentGame) {
      this.getWordGame(currentGame.gameId, conversationId).subscribe();
    }
  }

  // Clear current game for a specific conversation
  clearCurrentGame(conversationId: string): void {
    const gameSubject = this.getGameSubjectForConversation(conversationId);
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
