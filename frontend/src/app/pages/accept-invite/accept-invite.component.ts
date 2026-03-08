import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-accept-invite',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="page">
            <div class="card glass-card">
                <div class="header">
                    <span class="icon">🎉</span>
                    <h1>Activez votre compte</h1>
                    <p class="subtitle">Bienvenue sur AI Maturity Platform</p>
                </div>

                <div *ngIf="success" class="success-box">
                    <p>✅ Compte activé avec succès !</p>
                    <a routerLink="/login" class="btn btn-primary">Se connecter</a>
                </div>

                <form *ngIf="!success" (ngSubmit)="activate()" class="form">
                    <div class="form-group">
                        <label class="form-label">Votre nom</label>
                        <input type="text" class="form-control" [(ngModel)]="name" name="name" placeholder="Prénom Nom" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Mot de passe</label>
                        <input type="password" class="form-control" [(ngModel)]="password" name="password" placeholder="Min. 8 caractères" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Confirmer le mot de passe</label>
                        <input type="password" class="form-control" [(ngModel)]="confirmPassword" name="confirmPassword" placeholder="••••••••" required />
                    </div>

                    <div class="error-msg" *ngIf="errorMsg">{{ errorMsg }}</div>

                    <button type="submit" class="btn btn-primary btn-full" [disabled]="loading">
                        {{ loading ? 'Activation...' : 'Activer mon compte' }}
                    </button>
                </form>
            </div>
        </div>
    `,
    styles: [`
        .page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .card { width: 100%; max-width: 440px; padding: 48px 40px; }
        .header { text-align: center; margin-bottom: 32px; }
        .icon { font-size: 3rem; display: block; margin-bottom: 12px; }
        h1 { font-size: 1.5rem; font-weight: 800; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; margin: 0 0 8px; }
        .subtitle { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }
        .form { display: flex; flex-direction: column; gap: 18px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .btn-full { width: 100%; padding: 14px; }
        .error-msg { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; }
        .success-box { text-align: center; padding: 24px; background: rgba(34,197,94,0.1); border-radius: 12px; border: 1px solid rgba(34,197,94,0.3); }
        .success-box p { color: #4ade80; font-size: 1.1rem; margin-bottom: 16px; }
    `]
})
export class AcceptInviteComponent implements OnInit {
    name = '';
    password = '';
    confirmPassword = '';
    loading = false;
    errorMsg = '';
    success = false;
    private token = '';

    constructor(private authService: AuthService, private route: ActivatedRoute) {}

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParams['token'] || '';
        if (!this.token) this.errorMsg = 'Token d\'invitation invalide ou manquant.';
    }

    activate(): void {
        if (this.password !== this.confirmPassword) {
            this.errorMsg = 'Les mots de passe ne correspondent pas';
            return;
        }
        if (this.password.length < 8) {
            this.errorMsg = 'Le mot de passe doit contenir au moins 8 caractères';
            return;
        }
        this.loading = true;
        this.errorMsg = '';

        this.authService.acceptInvite(this.token, this.password, this.name).subscribe({
            next: () => { this.loading = false; this.success = true; },
            error: (err) => { this.loading = false; this.errorMsg = err.error?.error || 'Erreur lors de l\'activation'; }
        });
    }
}
