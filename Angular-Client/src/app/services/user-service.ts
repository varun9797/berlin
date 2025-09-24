import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { constants, statusCodes } from '../utils/const';
import { TokenService } from './token-service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  isAuthenticated = false;
  constructor(public httpClient: HttpClient, private tokenService: TokenService) { }

  registerUser(userData: UserResgistration) {
    return this.httpClient.post(`${environment.apiUrl}/v1/user/register`, userData)
  }

  getOnlineUsers(): Observable<UserObject[]> {
    return this.httpClient.get<UserObject[]>(`${environment.apiUrl}/v1/user/onlineUsers`, { withCredentials: true });
  }

  loginUser(loginData: UserLogin) {
    return this.httpClient.post(`${environment.apiUrl}/v1/user/login`, loginData, { withCredentials: true, observe: 'response' }).pipe(
      tap((response: HttpResponse<any>) => {
        this.isAuthenticated = response.status === statusCodes.SUCCESS;
        console.log('Login response:', response.body.token);
        // save the token in local storage
        if (response.body && response.body.token) {
          this.tokenService.setToken(response.body.token);
          
          // Extract user info from token and store it
          const username = this.tokenService.getUserNameFromToken();
          const userId = this.tokenService.getUserIdFromToken();
          
          if (username && userId) {
            const userFromToken = {
              _id: userId,
              userId: userId,
              username: username
            };
            this.setCurrentUser(userFromToken);
            console.log('User info extracted from token and stored:', userFromToken);
          }
          
          // Also store user data from response if available
          if (response.body.user) {
            this.setCurrentUser(response.body.user);
            console.log('User info from response stored:', response.body.user);
          }
        }
      })
    );
  }

  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    if (user?._id || user?.userId) {
      return user._id || user.userId || '';
    }
    
    // Fallback to token if no user in localStorage
    const userIdFromToken = this.tokenService.getUserIdFromToken();
    if (userIdFromToken) {
      // Update localStorage with token data
      const userFromToken = {
        _id: userIdFromToken,
        userId: userIdFromToken,
        username: this.tokenService.getUserNameFromToken() || ''
      };
      this.setCurrentUser(userFromToken);
      return userIdFromToken;
    }
    
    return '';
  }

  getCurrentUsername(): string {
    const user = this.getCurrentUser();
    if (user?.username) {
      return user.username;
    }
    
    // Fallback to token if no user in localStorage
    const usernameFromToken = this.tokenService.getUserNameFromToken();
    if (usernameFromToken) {
      // Update localStorage with token data
      const userFromToken = {
        _id: this.tokenService.getUserIdFromToken() || '',
        userId: this.tokenService.getUserIdFromToken() || '',
        username: usernameFromToken
      };
      this.setCurrentUser(userFromToken);
      return usernameFromToken;
    }
    
    return '';
  }

  getCurrentUser(): any {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error parsing current user from localStorage:', error);
      return null;
    }
  }

  setCurrentUser(user: any): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearCurrentUser(): void {
    localStorage.removeItem('currentUser');
  }

  // Initialize user data from token if available
  initializeFromToken(): void {
    const token = this.tokenService.getToken();
    if (token && !this.tokenService.isTokenExpired(token)) {
      const username = this.tokenService.getUserNameFromToken();
      const userId = this.tokenService.getUserIdFromToken();
      
      // Only set if we don't already have user data
      const currentUser = this.getCurrentUser();
      if (!currentUser && username && userId) {
        const userFromToken = {
          _id: userId,
          userId: userId,
          username: username
        };
        this.setCurrentUser(userFromToken);
        console.log('User data initialized from token:', userFromToken);
      }
    }
  }

  // Logout user
  logout(): void {
    this.isAuthenticated = false;
    this.clearCurrentUser();
    // The token service will handle token removal and navigation
  }
}
