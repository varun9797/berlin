import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { TokenService } from "../services/token-service";

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const tokenService = inject(TokenService);

    // Check if user is authenticated with a valid, non-expired token
    const isAuthenticated = tokenService.isAuthenticated();
    
    if (!isAuthenticated) {
        console.log("User not authenticated or token expired, redirecting to login");
        // The tokenService.logout() will handle the navigation, but let's be explicit
        tokenService.logout('Auth guard: Invalid or expired token');
        return false;
    }
    
    console.log("User authenticated, allowing access to protected route");
    return true;
};