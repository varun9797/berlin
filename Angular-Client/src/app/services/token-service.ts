import { Injectable } from '@angular/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { constants } from '../utils/const';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private jwtHelper = new JwtHelperService();

  isTokenExpired(token: string): boolean {
    return this.jwtHelper.isTokenExpired(token);
  }

  getTokenExpirationDate(token: string): Date | null {
    return this.jwtHelper.getTokenExpirationDate(token);
  }

  setToken(token: string): void {
    localStorage.setItem(constants.AUTH_TOKEN_KEY, token);
  }

  getToken(): string | null {
    return localStorage.getItem(constants.AUTH_TOKEN_KEY);
  }

  getUserNameFromToken(): string | null {
    const decodedToken = this.jwtHelper.decodeToken(localStorage.getItem(constants.AUTH_TOKEN_KEY) || '');
    return decodedToken ? decodedToken.username : null;
  }
}
