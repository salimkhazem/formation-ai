import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="login-page">
            <div class="login-card glass-card">
                <div class="login-header">
                    <span class="login-icon">🤖</span>
                    <h1>AI Maturity Platform</h1>
                    <p class="subtitle">Connectez-vous à votre compte</p>
                </div>

                <form (ngSubmit)="login()" class="login-form">
                    <div class="form-group">
                        <label class="form-label">Email</label>
                        <input
                            type="email"
                            class="form-control"
                            [(ngModel)]="email"
                            name="email"
                            placeholder="votre@email.com"
                            required
                            autocomplete="email"
                        />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Mot de passe</label>
                        <input
                            type="password"
                            class="form-control"
                            [(ngModel)]="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            autocomplete="current-password"
                        />
                    </div>

                    <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>

                    <button type="submit" class="btn btn-primary btn-full" [disabled]="loading">
                        <span *ngIf="!loading">Se connecter</span>
                        <span *ngIf="loading" class="spinner">⏳</span>
                    </button>
                </form>

                <div class="login-footer">
                    <a routerLink="/" class="back-link">← Retour à l'accueil</a>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .login-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
        }

        .login-card {
            width: 100%;
            max-width: 420px;
            padding: 48px 40px;
        }

        .login-header {
            text-align: center;
            margin-bottom: 36px;
        }

        .login-icon {
            font-size: 3rem;
            display: block;
            margin-bottom: 12px;
        }

        h1 {
            font-size: 1.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #6366f1, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin: 0 0 8px;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 0.9rem;
            margin: 0;
        }

        .login-form {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .form-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: var(--text-secondary);
        }

        .btn-full {
            width: 100%;
            padding: 14px;
            font-size: 1rem;
        }

        .error-msg {
            background: rgba(239, 68, 68, 0.15);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #f87171;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 0.875rem;
        }

        .spinner {
            animation: spin 1s linear infinite;
            display: inline-block;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-footer {
            margin-top: 28px;
            text-align: center;
        }

        .back-link {
            color: var(--text-secondary);
            font-size: 0.875rem;
            transition: color 0.2s;
        }

        .back-link:hover { color: var(--text-primary); }
    `]
})
export class LoginComponent implements OnInit {
    email = '';
    password = '';
    loading = false;
    errorMsg = '';
    private returnUrl = '/';

    constructor(
        private authService: AuthService,
        private router: Router,
        private route: ActivatedRoute
    ) {}

    ngOnInit(): void {
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        if (this.authService.isLoggedIn) {
            this.router.navigate([this.authService.isAdmin ? '/admin/dashboard' : '/']);
        }
    }

    login(): void {
        if (!this.email || !this.password) {
            this.errorMsg = 'Veuillez remplir tous les champs';
            return;
        }
        this.loading = true;
        this.errorMsg = '';

        this.authService.login(this.email, this.password).subscribe({
            next: (response) => {
                this.loading = false;
                const dest = response.user.role === 'admin' ? '/admin/dashboard' : this.returnUrl;
                this.router.navigate([dest]);
            },
            error: (err) => {
                this.loading = false;
                this.errorMsg = err.error?.error || 'Erreur de connexion. Vérifiez vos identifiants.';
            }
        });
    }
}
