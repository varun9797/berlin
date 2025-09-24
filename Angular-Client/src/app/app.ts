import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserService } from './services/user-service';
import { TokenService } from './services/token-service';
import { SessionMonitorService } from './services/session-monitor.service';
import { ActivityTrackerService } from './services/activity-tracker.service';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NotificationComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  protected readonly title = signal('Angular-client');

  constructor(
    private userService: UserService,
    private tokenService: TokenService,
    private sessionMonitor: SessionMonitorService, // This will initialize the service
    private activityTracker: ActivityTrackerService // This will initialize activity tracking
  ) {}

  ngOnInit(): void {
    // Initialize user data from token on app startup
    this.userService.initializeFromToken();
    
    // The TokenService constructor already handles token expiration checking
    // SessionMonitorService provides additional monitoring
    // ActivityTrackerService handles inactivity-based logout
    console.log('App initialized. Authentication status:', this.tokenService.isAuthenticated());
    
    // Subscribe to authentication state changes
    this.tokenService.isAuthenticated$.subscribe(isAuth => {
      if (isAuth) {
        console.log('User authenticated - starting session monitoring and activity tracking');
        this.sessionMonitor.restartMonitoring();
        this.activityTracker.restartTracking();
      } else {
        console.log('User not authenticated - stopping session monitoring and activity tracking');
        this.sessionMonitor.stopMonitoring();
        this.activityTracker.stopTracking();
      }
    });
  }
}
