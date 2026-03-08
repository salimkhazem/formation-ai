import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthUser {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
    company_id: string;
    company_name: string;
}

export interface LoginResponse {
    token: string;
    refreshToken: string;
    user: AuthUser;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = 'http://localhost:3000/api/auth';
    private currentUserSubject = new BehaviorSubject<AuthUser | null>(this.loadUser());
    currentUser$ = this.currentUserSubject.asObservable();

    constructor(private http: HttpClient, private router: Router) {}

    private loadUser(): AuthUser | null {
        const stored = localStorage.getItem('auth_user');
        return stored ? JSON.parse(stored) : null;
    }

    get currentUser(): AuthUser | null {
        return this.currentUserSubject.value;
    }

    get token(): string | null {
        return localStorage.getItem('auth_token');
    }

    get isLoggedIn(): boolean {
        return !!this.token && !!this.currentUser;
    }

    get isAdmin(): boolean {
        return this.currentUser?.role === 'admin';
    }

    login(email: string, password: string): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
            tap(response => {
                localStorage.setItem('auth_token', response.token);
                localStorage.setItem('auth_refresh_token', response.refreshToken);
                localStorage.setItem('auth_user', JSON.stringify(response.user));
                this.currentUserSubject.next(response.user);
            })
        );
    }

    logout(): void {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('auth_user');
        this.currentUserSubject.next(null);
        this.router.navigate(['/login']);
    }

    refreshToken(): Observable<{ token: string }> {
        const refreshToken = localStorage.getItem('auth_refresh_token');
        return this.http.post<{ token: string }>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
            tap(response => {
                localStorage.setItem('auth_token', response.token);
            })
        );
    }

    sendInvitation(email: string, name: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/invite`, { email, name });
    }

    acceptInvite(token: string, password: string, name: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/accept-invite`, { token, password, name });
    }

    getMe(): Observable<AuthUser> {
        return this.http.get<AuthUser>(`${this.apiUrl}/me`);
    }
}
