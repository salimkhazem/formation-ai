import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn) return true;
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
};

export const adminGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn) {
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
    if (!auth.isAdmin) {
        router.navigate(['/']);
        return false;
    }
    return true;
};

export const guestGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.isLoggedIn) {
        router.navigate([auth.isAdmin ? '/admin/dashboard' : '/']);
        return false;
    }
    return true;
};
