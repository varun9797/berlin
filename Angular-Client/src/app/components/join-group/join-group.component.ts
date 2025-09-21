import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InvitationService } from '../../services/invitation-service';
import { TokenService } from '../../services/token-service';

@Component({
  selector: 'app-join-group',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="join-group-container">
      <div class="join-group-card">
        <h2>Join Group Invitation</h2>
        
        <div *ngIf="loading" class="loading">
          <p>Processing your invitation...</p>
        </div>
        
        <div *ngIf="invitationDetails && !loading" class="invitation-details">
          <h3>You're invited to join:</h3>
          <p class="group-name">{{ invitationDetails.groupName }}</p>
          <p class="group-description" *ngIf="invitationDetails.groupDescription">
            {{ invitationDetails.groupDescription }}
          </p>
          
          <div class="invitation-info">
            <p><strong>Invited by:</strong> {{ invitationDetails.createdBy }}</p>
            <p><strong>Expires:</strong> {{ invitationDetails.expiresAt | date:'medium' }}</p>
            <p><strong>Uses remaining:</strong> {{ invitationDetails.usesRemaining }}</p>
          </div>
          
          <div class="actions">
            <button *ngIf="!isLoggedIn" (click)="redirectToLogin()" class="btn btn-primary">
              Login to Join
            </button>
            <button *ngIf="isLoggedIn" (click)="joinGroup()" class="btn btn-primary" [disabled]="joining">
              {{ joining ? 'Joining...' : 'Join Group' }}
            </button>
            <button (click)="goHome()" class="btn btn-secondary">
              Cancel
            </button>
          </div>
        </div>
        
        <div *ngIf="error && !loading" class="error">
          <h3>Error</h3>
          <p>{{ error }}</p>
          <button (click)="goHome()" class="btn btn-secondary">
            Go to Home
          </button>
        </div>
        
        <div *ngIf="success && !loading" class="success">
          <h3>Request Submitted!</h3>
          <p>Your join request has been submitted and is pending approval by the group admin.</p>
          <button (click)="goToChat()" class="btn btn-primary">
            Go to Chat
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .join-group-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background-color: #f5f5f5;
      padding: 20px;
    }
    
    .join-group-card {
      background: white;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
      text-align: center;
    }
    
    h2 {
      color: #333;
      margin-bottom: 1.5rem;
    }
    
    h3 {
      color: #555;
      margin-bottom: 1rem;
    }
    
    .group-name {
      font-size: 1.5rem;
      font-weight: bold;
      color: #007bff;
      margin: 1rem 0;
    }
    
    .group-description {
      color: #666;
      margin-bottom: 1.5rem;
      font-style: italic;
    }
    
    .invitation-info {
      background-color: #f8f9fa;
      border-radius: 4px;
      padding: 1rem;
      margin: 1.5rem 0;
      text-align: left;
    }
    
    .invitation-info p {
      margin: 0.5rem 0;
      color: #555;
    }
    
    .actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
      margin-top: 2rem;
    }
    
    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
      transition: background-color 0.3s;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
    }
    
    .btn-primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #5a6268;
    }
    
    .loading {
      padding: 2rem;
      color: #007bff;
    }
    
    .error {
      color: #dc3545;
      padding: 1rem;
    }
    
    .success {
      color: #28a745;
      padding: 1rem;
    }
    
    @media (max-width: 600px) {
      .actions {
        flex-direction: column;
      }
      
      .join-group-card {
        padding: 1rem;
      }
    }
  `]
})
export class JoinGroupComponent implements OnInit {
  invitationToken: string = '';
  invitationDetails: any = null;
  loading = true;
  error = '';
  success = false;
  joining = false;
  isLoggedIn = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private invitationService: InvitationService,
    private tokenService: TokenService
  ) {}

  ngOnInit() {
    this.checkLoginStatus();
    this.route.queryParams.subscribe(params => {
      this.invitationToken = params['token'];
      if (this.invitationToken) {
        this.loadInvitationDetails();
      } else {
        this.error = 'Invalid invitation link';
        this.loading = false;
      }
    });
  }

  checkLoginStatus() {
    const token = this.tokenService.getToken();
    this.isLoggedIn = token !== null && !this.tokenService.isTokenExpired(token);
  }

  loadInvitationDetails() {
    this.invitationService.getInvitationDetails(this.invitationToken).subscribe({
      next: (response: any) => {
        this.invitationDetails = response.data;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading invitation details:', error);
        this.error = error.error?.message || 'Failed to load invitation details';
        this.loading = false;
      }
    });
  }

  joinGroup() {
    if (!this.isLoggedIn) {
      this.redirectToLogin();
      return;
    }

    this.joining = true;
    // Submit join request via invitation link
    this.invitationService.submitJoinRequest({ token: this.invitationToken }).subscribe({
      next: (response: any) => {
        this.success = true;
        this.joining = false;
        console.log('Successfully submitted join request:', response);
      },
      error: (error: any) => {
        console.error('Error submitting join request:', error);
        this.error = error.error?.message || 'Failed to submit join request';
        this.joining = false;
      }
    });
  }

  redirectToLogin() {
    // Store the current URL to redirect back after login
    localStorage.setItem('redirectUrl', this.router.url);
    this.router.navigate(['/login']);
  }

  goHome() {
    this.router.navigate(['/']);
  }

  goToChat() {
    this.router.navigate(['/chat']);
  }
}
