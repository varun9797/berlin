import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameService, WordGame, WordGameAttempt, GuessResponse } from '../../services/game-service';
import { UserService } from '../../services/user-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-word-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="word-game-container" *ngIf="currentGame">
      <!-- Game Header -->
      <div class="game-header">
        <h3>🎯 Word Game</h3>
        <div class="game-info">
          <span class="status-badge" [class]="'status-' + currentGame.status">
            {{ currentGame.status | titlecase }}
          </span>
          <span class="players-count">{{ currentGame.playersCount }} players</span>
        </div>
      </div>

      <!-- Game Status Messages -->
      <div class="game-messages">
        <div *ngIf="currentGame.status === 'waiting'" class="message waiting">
          <p *ngIf="!isGameCreator">🕐 Waiting for game creator to start the game...</p>
          <p *ngIf="isGameCreator">🎮 Ready to start! All group members are automatically included.</p>
          <p><strong>Game ID:</strong> {{ currentGame.gameId }}</p>
          <p><strong>Word Length:</strong> {{ currentGame.wordLength }} letters</p>
          <p><strong>Max Attempts:</strong> {{ currentGame.maxAttempts }}</p>
          <p><strong>Creator:</strong> {{ currentGame.createdBy.username }}</p>
        </div>

        <div *ngIf="currentGame.status === 'active'" class="message active">
          <p>🎮 Game is active! Guess the {{ currentGame.wordLength }}-letter word!</p>
          <p><strong>Attempts left:</strong> {{ attemptsLeft }}</p>
        </div>

        <div *ngIf="currentGame.status === 'completed'" class="message completed">
          <p>🏁 Game completed!</p>
          <p *ngIf="currentGame.targetWord"><strong>The word was:</strong> {{ currentGame.targetWord }}</p>
          <div *ngIf="currentGame.winner">
            <p>🏆 <strong>Winner:</strong> {{ currentGame.winner.username }}</p>
          </div>
        </div>
      </div>

      <!-- Game Controls -->
      <div class="game-controls">
        <!-- Start Game Button (Creator Only) -->
        <button 
          *ngIf="currentGame.status === 'waiting' && isGameCreator"
          class="btn-start"
          (click)="startGame()"
          [disabled]="starting"
          style="background: #28a745; color: white; padding: 12px 24px; font-size: 1.1em; font-weight: bold;">
          {{ starting ? 'Starting...' : '🚀 Start Game Now!' }}
        </button>

        <!-- End Game Button (Creator Only - for active games) -->
        <button 
          *ngIf="currentGame.status === 'active' && isGameCreator"
          class="btn-end"
          (click)="endGame()"
          [disabled]="ending"
          style="background: #dc3545; color: white; padding: 12px 24px; font-size: 1.1em; font-weight: bold; margin-left: 10px;">
          {{ ending ? 'Ending...' : '🛑 End Game' }}
        </button>

        <!-- Word Input (Active Game) -->
        <div *ngIf="currentGame.status === 'active' && isPlayerInGame && !hasPlayerWon" class="guess-input">
          <input 
            type="text" 
            [(ngModel)]="currentGuess"
            [maxlength]="currentGame.wordLength"
            (keyup.enter)="submitGuess()"
            placeholder="Enter your guess..."
            class="word-input"
            [disabled]="submitting">
          <button 
            (click)="submitGuess()"
            [disabled]="!canSubmitGuess() || submitting"
            class="btn-submit">
            {{ submitting ? 'Submitting...' : 'Guess' }}
          </button>
        </div>

        <div *ngIf="hasPlayerWon" class="winner-message">
          🎉 Congratulations! You won the game! 🎉
        </div>
      </div>

      <!-- My Attempts -->
      <div *ngIf="currentGame.myAttempts && currentGame.myAttempts.length > 0" class="my-attempts">
        <h4>Your Attempts:</h4>
        <div class="attempts-grid">
          <div *ngFor="let attempt of currentGame.myAttempts" class="attempt-row">
            <span class="attempt-number">{{ attempt.attemptNumber }}.</span>
            <div class="attempt-letters">
              <span 
                *ngFor="let letter of attempt.result" 
                class="letter-tile"
                [class]="'letter-' + letter.status">
                {{ letter.letter }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Players List -->
      <div class="players-section">
        <h4>Players ({{ currentGame.playersCount }}):</h4>
        <div class="players-list">
          <div *ngFor="let player of currentGame.players" class="player-item">
            <span class="player-name">{{ player.username }}</span>
            <span class="player-stats">
              <span class="attempts">{{ player.attemptsCount }}/{{ currentGame.maxAttempts }}</span>
              <span *ngIf="player.hasWon" class="winner-badge">👑</span>
              <span *ngIf="player.score" class="score">{{ player.score }} pts</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Error/Success Messages -->
      <div *ngIf="message" class="message-toast" [class]="messageType">
        {{ message }}
      </div>
    </div>

    <!-- No Game State -->
    <div *ngIf="!currentGame" class="no-game">
      <p>No active game. Create a new word game to start playing!</p>
    </div>
  `,
  styleUrls: ['./word-game.component.scss']
})
export class WordGameComponent implements OnInit, OnDestroy {
  @Input() conversationId: string = '';
  
  currentGame: WordGame | null = null;
  currentGuess: string = '';
  
  // State flags
  starting = false;
  ending = false;
  submitting = false;
  
  // UI state
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';
  
  // User info
  currentUserId: string = '';
  currentUsername: string = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private gameService: GameService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Initialize user data from token if available
    this.userService.initializeFromToken();
    
    // Get current user info
    this.currentUserId = this.userService.getCurrentUserId();
    this.currentUsername = this.userService.getCurrentUsername();
    
    // Subscribe to game for this specific conversation
    if (this.conversationId) {
      this.subscriptions.push(
        this.gameService.getGameObservable(this.conversationId).subscribe(game => {
          this.currentGame = game;
          this.clearMessage();
        })
      );

      // Load active game for conversation
      this.loadActiveGame();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadActiveGame(): void {
    this.gameService.getActiveGame(this.conversationId).subscribe({
      next: () => {
        // Game loaded through subscription
      },
      error: (error) => {
        if (error.status !== 404) {
          this.showMessage('Error loading game', 'error');
        }
      }
    });
  }

  startGame(): void {
    if (!this.currentGame) return;
    
    this.starting = true;
    this.gameService.startWordGame({ gameId: this.currentGame.gameId }).subscribe({
      next: () => {
        this.showMessage('Game started!', 'success');
        this.gameService.refreshCurrentGame(this.conversationId);
      },
      error: (error) => {
        this.showMessage(error.error?.message || 'Error starting game', 'error');
      },
      complete: () => {
        this.starting = false;
      }
    });
  }

  endGame(): void {
    if (!this.currentGame) return;
    
    // Show confirmation dialog
    const confirmed = confirm('Are you sure you want to end this game? This will reveal the answer and cannot be undone.');
    if (!confirmed) return;
    
    this.ending = true;
    this.gameService.endWordGame({ gameId: this.currentGame.gameId }).subscribe({
      next: (response) => {
        this.showMessage(`Game ended. The word was: ${response.targetWord}`, 'info');
        this.gameService.refreshCurrentGame(this.conversationId);
      },
      error: (error) => {
        this.showMessage(error.error?.message || 'Error ending game', 'error');
      },
      complete: () => {
        this.ending = false;
      }
    });
  }

  submitGuess(): void {
    if (!this.canSubmitGuess()) return;
    
    this.submitting = true;
    this.gameService.submitGuess({ 
      gameId: this.currentGame!.gameId, 
      word: this.currentGuess.toUpperCase() 
    }, this.conversationId).subscribe({
      next: (response: GuessResponse) => {
        this.showMessage(response.message, response.isWinner ? 'success' : 'info');
        this.currentGuess = '';
        this.gameService.refreshCurrentGame(this.conversationId);
      },
      error: (error) => {
        this.showMessage(error.error?.message || 'Error submitting guess', 'error');
      },
      complete: () => {
        this.submitting = false;
      }
    });
  }

  canSubmitGuess(): boolean {
    return !!(
      this.currentGame && 
      this.currentGuess && 
      this.currentGuess.length === this.currentGame.wordLength &&
      this.currentGame.status === 'active' &&
      this.isPlayerInGame &&
      !this.hasPlayerWon
    );
  }

  get isGameCreator(): boolean {
    return this.currentGame ? this.currentGame.createdBy._id === this.currentUserId : false;
  }

  get isPlayerInGame(): boolean {
    if (!this.currentGame) return false;
    return this.currentGame.players.some(p => p.username === this.currentUsername);
  }

  get hasPlayerWon(): boolean {
    if (!this.currentGame) return false;
    const player = this.currentGame.players.find(p => p.username === this.currentUsername);
    return player ? player.hasWon : false;
  }

  get attemptsLeft(): number {
    if (!this.currentGame) return 0;
    const player = this.currentGame.players.find(p => p.username === this.currentUsername);
    return player ? this.currentGame.maxAttempts - player.attemptsCount : this.currentGame.maxAttempts;
  }

  get playersNames(): string {
    if (!this.currentGame) return '';
    return this.currentGame.players.map(p => p.username).join(', ');
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.message = message;
    this.messageType = type;
    
    // Clear message after 5 seconds
    setTimeout(() => {
      this.clearMessage();
    }, 5000);
  }

  private clearMessage(): void {
    this.message = '';
  }
}
