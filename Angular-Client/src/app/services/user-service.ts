import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';
import { constants, statusCodes } from '../utils/const';
import { TokenService } from './token-service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  isAuthenticated = false;
  constructor(public httpClient: HttpClient, private tokenService: TokenService) { }

  registerUser(userData: UserResgistration) {
    return this.httpClient.post('http://localhost:3000/v1/user/register', userData)
  }

  getOnlineUsers() {
    return this.httpClient.get('http://localhost:3000/v1/user/onlineUsers', { withCredentials: true });
  }

  loginUser(loginData: UserLogin) {
    return this.httpClient.post('http://localhost:3000/v1/user/login', loginData, { withCredentials: true, observe: 'response' }).pipe(
      tap((response: HttpResponse<any>) => {
        this.isAuthenticated = response.status === statusCodes.SUCCESS;
        console.log('Login response:', response.body.token);
        // save the token in local storage
        if (response.body && response.body.token) {
          this.tokenService.setToken(response.body.token);
        }
      })
    );
  }

}
