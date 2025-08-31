import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { UserService } from "./services/user-service";
import { constants } from "./utils/const";
import { TokenService } from "./services/token-service";

export const authGuard: CanActivateFn = (route, state) => {
    const router = inject(Router);
    const tokenService = inject(TokenService);
    const userService = inject(UserService);

    // Here you would typically check if the user is authenticated
    // For example, by checking a token in local storage or a user service
    // const isAuthenticated = false; // Replace with actual authentication check
    let isAuthenticated = tokenService.isTokenExpired(tokenService.getToken() || '') === false;
    if (!isAuthenticated) {
        console.log("User not authenticated, redirecting to login");
        router.navigate(['/login']); // todo keep this in seperate constant file
        return false;
    }
    return true;
};