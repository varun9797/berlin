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
          // Also store user data if available
          if (response.body.user) {
            localStorage.setItem('currentUser', JSON.stringify(response.body.user));
          }
        }
      })
    );
  }

  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user?._id || user?.userId || '';
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

}
