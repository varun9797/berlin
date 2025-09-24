import { Injectable, OnDestroy } from '@angular/core';
import { fromEvent, merge, timer, Subscription } from 'rxjs';
import { throttleTime, filter } from 'rxjs/operators';
import { TokenService } from './token-service';

@Injectable({
  providedIn: 'root'
})
export class ActivityTrackerService implements OnDestroy {
  private activitySubscription?: Subscription;
  private inactivityTimer?: Subscription;
  private lastActivity = new Date();
  
  // Configuration
  private readonly ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  private readonly ACTIVITY_THROTTLE = 5000; // Track activity every 5 seconds max
  private readonly INACTIVITY_WARNING_TIME = 25 * 60 * 1000; // 25 minutes of inactivity
  private readonly AUTO_LOGOUT_TIME = 30 * 60 * 1000; // 30 minutes of inactivity

  constructor(private tokenService: TokenService) {
    this.startTracking();
  }

  private startTracking(): void {
    if (typeof window === 'undefined') return; // SSR protection

    // Track user activity
    const activity$ = merge(
      ...this.ACTIVITY_EVENTS.map(event => fromEvent(document, event))
    ).pipe(
      throttleTime(this.ACTIVITY_THROTTLE),
      filter(() => this.tokenService.isAuthenticated()) // Only track when authenticated
    );

    this.activitySubscription = activity$.subscribe(() => {
      this.onActivity();
    });

    // Start inactivity monitoring
    this.resetInactivityTimer();
  }

  private onActivity(): void {
    this.lastActivity = new Date();
    console.log('User activity detected');
    this.resetInactivityTimer();
  }

  private resetInactivityTimer(): void {
    // Clear existing timer
    if (this.inactivityTimer) {
      this.inactivityTimer.unsubscribe();
    }

    // Set warning timer
    this.inactivityTimer = timer(this.INACTIVITY_WARNING_TIME).subscribe(() => {
      if (this.tokenService.isAuthenticated()) {
        this.tokenService['notificationService'].showWarning(
          'Inactivity Warning',
          'You have been inactive for 25 minutes. You will be logged out in 5 minutes for security.',
          10000
        );

        // Set final logout timer
        this.inactivityTimer = timer(this.AUTO_LOGOUT_TIME - this.INACTIVITY_WARNING_TIME).subscribe(() => {
          if (this.tokenService.isAuthenticated()) {
            this.tokenService.logout('Auto-logout due to inactivity (30 minutes)');
          }
        });
      }
    });
  }

  public getLastActivityTime(): Date {
    return this.lastActivity;
  }

  public getTimeSinceLastActivity(): number {
    return new Date().getTime() - this.lastActivity.getTime();
  }

  public isUserActive(): boolean {
    const timeSinceActivity = this.getTimeSinceLastActivity();
    return timeSinceActivity < this.INACTIVITY_WARNING_TIME;
  }

  public stopTracking(): void {
    if (this.activitySubscription) {
      this.activitySubscription.unsubscribe();
      this.activitySubscription = undefined;
    }
    
    if (this.inactivityTimer) {
      this.inactivityTimer.unsubscribe();
      this.inactivityTimer = undefined;
    }
    
    console.log('Activity tracking stopped');
  }

  public restartTracking(): void {
    this.stopTracking();
    this.lastActivity = new Date();
    this.startTracking();
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
