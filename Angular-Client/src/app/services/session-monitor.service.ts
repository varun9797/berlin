import { Injectable, OnDestroy } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { TokenService } from './token-service';

@Injectable({
  providedIn: 'root'
})
export class SessionMonitorService implements OnDestroy {
  private monitoringSubscription?: Subscription;
  private readonly CHECK_INTERVAL = 60000; // Check every minute

  constructor(private tokenService: TokenService) {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Only monitor if user is authenticated
    if (!this.tokenService.isAuthenticated()) {
      return;
    }

    this.monitoringSubscription = interval(this.CHECK_INTERVAL).subscribe(() => {
      const token = this.tokenService.getToken();
      
      if (!token) {
        console.log('Session Monitor: No token found');
        this.stopMonitoring();
        return;
      }

      if (this.tokenService.isTokenExpired(token)) {
        console.log('Session Monitor: Token expired, logging out');
        this.tokenService.logout('Session monitor detected expired token');
        this.stopMonitoring();
      } else {
        const expirationDate = this.tokenService.getTokenExpirationDate(token);
        if (expirationDate) {
          const timeUntilExpiration = expirationDate.getTime() - new Date().getTime();
          const minutesLeft = Math.round(timeUntilExpiration / 1000 / 60);
          
          // Log remaining time for debugging (you can remove this in production)
          if (minutesLeft <= 5) {
            console.log(`Session Monitor: Token expires in ${minutesLeft} minutes`);
          }
        }
      }
    });
  }

  public stopMonitoring(): void {
    if (this.monitoringSubscription) {
      this.monitoringSubscription.unsubscribe();
      this.monitoringSubscription = undefined;
      console.log('Session monitoring stopped');
    }
  }

  public restartMonitoring(): void {
    this.stopMonitoring();
    this.startMonitoring();
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
