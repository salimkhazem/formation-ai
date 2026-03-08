import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <h1>Tableau de bord Admin</h1>
                    <p class="subtitle">{{ auth.currentUser?.company_name }}</p>
                </div>
                <div class="header-actions">
                    <a routerLink="/admin/team" class="btn btn-secondary">👥 Équipe</a>
                    <a routerLink="/admin/export" class="btn btn-primary">📊 Exporter</a>
                </div>
            </div>

            <!-- Stats -->
            <div class="stats-grid">
                <div class="stat-card glass-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-value">{{ users.length }}</div>
                    <div class="stat-label">Membres</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon">📋</div>
                    <div class="stat-value">{{ audits.length }}</div>
                    <div class="stat-label">Évaluations</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon">🎯</div>
                    <div class="stat-value">{{ avgScore }}%</div>
                    <div class="stat-label">Score moyen</div>
                </div>
                <div class="stat-card glass-card">
                    <div class="stat-icon">⏳</div>
                    <div class="stat-value">{{ pendingUsers }}</div>
                    <div class="stat-label">Invitations en attente</div>
                </div>
            </div>

            <!-- Recent Audits -->
            <div class="section">
                <div class="section-header">
                    <h2>Évaluations récentes</h2>
                    <a routerLink="/admin/export" class="btn-link">Voir tout →</a>
                </div>

                <div *ngIf="loading" class="loading">Chargement...</div>

                <div *ngIf="!loading && audits.length === 0" class="empty-state glass-card">
                    <span class="empty-icon">📭</span>
                    <p>Aucune évaluation pour le moment.</p>
                    <p class="hint">Invitez des membres de votre équipe pour commencer.</p>
                    <a routerLink="/admin/team" class="btn btn-primary">Inviter des membres</a>
                </div>

                <div *ngIf="!loading && audits.length > 0" class="audits-table glass-card">
                    <table>
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Profil</th>
                                <th>Score</th>
                                <th>Niveau</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr *ngFor="let audit of audits.slice(0, 10)">
                                <td>
                                    <div class="participant">
                                        <span class="avatar">{{ (audit.user_name || 'A')[0].toUpperCase() }}</span>
                                        <div>
                                            <div class="name">{{ audit.user_name || 'Anonyme' }}</div>
                                            <div class="email">{{ audit.user_email }}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{{ profileLabel(audit.profile_id) }}</td>
                                <td>
                                    <div class="score-badge" [style.background]="getScoreColor(audit.scores?.overall)">
                                        {{ audit.scores?.overall || 0 }}%
                                    </div>
                                </td>
                                <td>
                                    <span class="level-badge">{{ audit.scores?.levelEmoji }} {{ audit.scores?.levelLabel }}</span>
                                </td>
                                <td class="date">{{ audit.created_at | date:'dd/MM/yyyy' }}</td>
                                <td>
                                    <a [href]="getPdfUrl(audit.id)" class="btn-icon" title="Télécharger PDF" target="_blank">📄</a>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }
        .header-actions { display: flex; gap: 12px; }

        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .stat-card { padding: 24px; text-align: center; }
        .stat-icon { font-size: 2rem; margin-bottom: 8px; }
        .stat-value { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, #6366f1, #ec4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .stat-label { color: var(--text-secondary); font-size: 0.875rem; margin-top: 4px; }

        .section { margin-bottom: 32px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
        .btn-link { color: #6366f1; font-size: 0.875rem; }

        .loading { text-align: center; padding: 40px; color: var(--text-secondary); }

        .empty-state { padding: 48px; text-align: center; }
        .empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
        .hint { color: var(--text-secondary); font-size: 0.875rem; }

        .audits-table { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { padding: 12px 16px; text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; border-bottom: 1px solid rgba(255,255,255,0.06); }
        td { padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        tr:last-child td { border-bottom: none; }

        .participant { display: flex; align-items: center; gap: 12px; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.875rem; flex-shrink: 0; }
        .name { font-weight: 600; font-size: 0.9rem; }
        .email { color: var(--text-secondary); font-size: 0.8rem; }

        .score-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 0.875rem; color: white; }
        .level-badge { font-size: 0.85rem; }
        .date { color: var(--text-secondary); font-size: 0.875rem; }
        .btn-icon { font-size: 1.2rem; cursor: pointer; }
    `]
})
export class AdminDashboardComponent implements OnInit {
    users: any[] = [];
    audits: any[] = [];
    loading = true;

    private profileNames: Record<string, string> = {
        'developpeur': 'Développeur', 'business-analyst': 'Business Analyst',
        'manager': 'Manager', 'fonctionnel': 'Fonctionnel', 'expert-ia': 'Expert IA'
    };

    get avgScore(): number {
        if (!this.audits.length) return 0;
        const sum = this.audits.reduce((acc, a) => acc + (a.scores?.overall || 0), 0);
        return Math.round(sum / this.audits.length);
    }

    get pendingUsers(): number {
        return this.users.filter(u => u.status === 'pending').length;
    }

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        const companyId = this.auth.currentUser?.company_id;
        if (!companyId) return;

        this.adminService.getCompanyUsers(companyId).subscribe({
            next: users => this.users = users,
            error: () => {}
        });

        this.adminService.getCompanyAudits(companyId).subscribe({
            next: audits => { this.audits = audits; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    profileLabel(id: string): string {
        return this.profileNames[id] || id;
    }

    getScoreColor(score: number = 0): string {
        if (score <= 25) return 'rgba(239,68,68,0.8)';
        if (score <= 50) return 'rgba(249,115,22,0.8)';
        if (score <= 75) return 'rgba(234,179,8,0.8)';
        return 'rgba(34,197,94,0.8)';
    }

    getPdfUrl(auditId: string): string {
        return `http://localhost:3000/api/export/pdf?auditId=${auditId}`;
    }
}
