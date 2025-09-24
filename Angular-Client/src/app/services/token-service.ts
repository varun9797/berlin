import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { constants } from '../utils/const';
import { NotificationService } from './notification.service';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private jwtHelper = new JwtHelperService();
  private router: Router;
  private notificationService: NotificationService;
  
  // Observable to track authentication state
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(router: Router, notificationService: NotificationService) {
    this.router = router;
    this.notificationService = notificationService;
    
    // Simple initialization - just check if we have a valid token
    this.isAuthenticatedSubject.next(this.hasValidToken());
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    return token ? !this.isTokenExpired(token) : false;
  }

  isTokenExpired(token: string): boolean {
    if (!token) return true;
    
    try {
      return this.jwtHelper.isTokenExpired(token);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  getTokenExpirationDate(token: string): Date | null {
    return this.jwtHelper.getTokenExpirationDate(token);
  }

  setToken(token: string): void {
    localStorage.setItem(constants.AUTH_TOKEN_KEY, token);
    this.isAuthenticatedSubject.next(true);
  }

  getToken(): string | null {
    return localStorage.getItem(constants.AUTH_TOKEN_KEY);
  }

  getUserNameFromToken(): string | null {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) return null;
    
    const decodedToken = this.jwtHelper.decodeToken(token);
    return decodedToken ? decodedToken.username : null;
  }

  getUserIdFromToken(): string | null {
    const token = this.getToken();
    if (!token || this.isTokenExpired(token)) return null;
    
    const decodedToken = this.jwtHelper.decodeToken(token);
    return decodedToken ? decodedToken.userId : null;
  }

  logout(reason?: string): void {
    console.log('Logging out user:', reason || 'Manual logout');
    
    // Clear token and user data
    localStorage.removeItem(constants.AUTH_TOKEN_KEY);
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('currentUserName');
    localStorage.removeItem('currentUser');
    
    // Update authentication state
    this.isAuthenticatedSubject.next(false);
    
    // Navigate to login
    this.router.navigate(['/login']);
  }

  // Simple method to check if user is currently authenticated
  isAuthenticated(): boolean {
    return this.hasValidToken();
  }
}
