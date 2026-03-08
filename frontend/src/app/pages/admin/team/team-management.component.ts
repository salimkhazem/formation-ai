import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';

@Component({
    selector: 'app-team-management',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <a routerLink="/admin/dashboard" class="back-link">← Dashboard</a>
                    <h1>Gestion de l'équipe</h1>
                    <p class="subtitle">{{ auth.currentUser?.company_name }}</p>
                </div>
                <button class="btn btn-primary" (click)="showInviteModal = true">✉️ Inviter un membre</button>
            </div>

            <!-- Members Table -->
            <div class="glass-card">
                <div class="table-header">
                    <h2>Membres ({{ users.length }})</h2>
                </div>

                <div *ngIf="loading" class="loading">Chargement...</div>

                <div *ngIf="!loading && users.length === 0" class="empty-state">
                    <p>Aucun membre pour le moment.</p>
                </div>

                <table *ngIf="!loading && users.length > 0">
                    <thead>
                        <tr>
                            <th>Membre</th>
                            <th>Rôle</th>
                            <th>Statut</th>
                            <th>Membre depuis</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let user of users">
                            <td>
                                <div class="member-info">
                                    <div class="avatar" [style.background]="user.role === 'admin' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)'">
                                        {{ (user.name || user.email)[0].toUpperCase() }}
                                    </div>
                                    <div>
                                        <div class="name">{{ user.name || 'Sans nom' }}</div>
                                        <div class="email">{{ user.email }}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="role-badge" [class.admin]="user.role === 'admin'">
                                    {{ user.role === 'admin' ? '👑 Admin' : '👤 User' }}
                                </span>
                            </td>
                            <td>
                                <span class="status-badge" [class.active]="user.status === 'active'" [class.pending]="user.status === 'pending'">
                                    {{ user.status === 'active' ? '✅ Actif' : '⏳ En attente' }}
                                </span>
                            </td>
                            <td class="date">{{ user.created_at | date:'dd/MM/yyyy' }}</td>
                            <td>
                                <button *ngIf="user.id !== auth.currentUser?.id"
                                        class="btn btn-danger btn-sm"
                                        (click)="removeUser(user)">
                                    Supprimer
                                </button>
                                <span *ngIf="user.id === auth.currentUser?.id" class="you-badge">Vous</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Invite Modal -->
            <div class="modal-overlay" *ngIf="showInviteModal" (click)="closeModal($event)">
                <div class="modal glass-card">
                    <h2>Inviter un membre</h2>
                    <p class="modal-hint">Un email d'invitation sera envoyé avec un lien pour activer le compte.</p>

                    <form (ngSubmit)="sendInvite()" class="invite-form">
                        <div class="form-group">
                            <label class="form-label">Nom (optionnel)</label>
                            <input type="text" class="form-control" [(ngModel)]="inviteName" name="inviteName" placeholder="Prénom Nom" />
                        </div>
                        <div class="form-group">
                            <label class="form-label">Email *</label>
                            <input type="email" class="form-control" [(ngModel)]="inviteEmail" name="inviteEmail" placeholder="email@exemple.com" required />
                        </div>

                        <div class="success-msg" *ngIf="inviteSuccess">✅ {{ inviteSuccess }}</div>
                        <div class="error-msg" *ngIf="inviteError">{{ inviteError }}</div>

                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" (click)="showInviteModal = false">Annuler</button>
                            <button type="submit" class="btn btn-primary" [disabled]="inviteLoading">
                                {{ inviteLoading ? 'Envoi...' : 'Envoyer l\'invitation' }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
        .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        .back-link { display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px; }
        .back-link:hover { color: var(--text-primary); }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }
        .table-header { padding: 20px 24px 0; }
        h2 { font-size: 1.1rem; font-weight: 700; margin: 0 0 16px; }
        .loading, .empty-state { padding: 40px; text-align: center; color: var(--text-secondary); }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 12px 24px; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); }
        td { padding: 14px 24px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        tr:last-child td { border-bottom: none; }
        .member-info { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.9rem; color: white; flex-shrink: 0; }
        .name { font-weight: 600; font-size: 0.9rem; }
        .email { color: var(--text-secondary); font-size: 0.8rem; }
        .role-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; background: rgba(99,102,241,0.15); color: #818cf8; }
        .role-badge.admin { background: rgba(245,158,11,0.15); color: #fbbf24; }
        .status-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 500; }
        .status-badge.active { background: rgba(34,197,94,0.15); color: #4ade80; }
        .status-badge.pending { background: rgba(249,115,22,0.15); color: #fb923c; }
        .date { color: var(--text-secondary); font-size: 0.875rem; }
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; }
        .you-badge { font-size: 0.8rem; color: var(--text-secondary); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; }
        .modal { width: 100%; max-width: 480px; padding: 36px; }
        .modal h2 { margin: 0 0 8px; font-size: 1.25rem; }
        .modal-hint { color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 24px; }
        .invite-form { display: flex; flex-direction: column; gap: 18px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; }
        .success-msg { background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3); color: #4ade80; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; }
        .error-msg { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; }
    `]
})
export class TeamManagementComponent implements OnInit {
    users: any[] = [];
    loading = true;
    showInviteModal = false;
    inviteEmail = '';
    inviteName = '';
    inviteLoading = false;
    inviteSuccess = '';
    inviteError = '';

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        this.loadUsers();
    }

    loadUsers(): void {
        const companyId = this.auth.currentUser?.company_id;
        if (!companyId) return;
        this.adminService.getCompanyUsers(companyId).subscribe({
            next: users => { this.users = users; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    sendInvite(): void {
        if (!this.inviteEmail) { this.inviteError = 'Email requis'; return; }
        this.inviteLoading = true;
        this.inviteError = '';
        this.inviteSuccess = '';

        this.auth.sendInvitation(this.inviteEmail, this.inviteName).subscribe({
            next: () => {
                this.inviteLoading = false;
                this.inviteSuccess = `Invitation envoyée à ${this.inviteEmail}`;
                this.inviteEmail = '';
                this.inviteName = '';
                this.loadUsers();
            },
            error: (err) => {
                this.inviteLoading = false;
                this.inviteError = err.error?.error || 'Erreur lors de l\'envoi';
            }
        });
    }

    removeUser(user: any): void {
        if (!confirm(`Supprimer ${user.name || user.email} ?`)) return;
        this.adminService.deleteUser(user.id).subscribe({
            next: () => this.loadUsers(),
            error: (err) => alert(err.error?.error || 'Erreur lors de la suppression')
        });
    }

    closeModal(event: Event): void {
        if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
            this.showInviteModal = false;
        }
    }
}
