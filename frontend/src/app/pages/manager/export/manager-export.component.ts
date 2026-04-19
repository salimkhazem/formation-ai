import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';

const PROFILES = [
    { id: '', label: 'Tous les profils' },
    { id: 'developpeur', label: 'Développeur' },
    { id: 'business-analyst', label: 'Business Analyst' },
    { id: 'manager', label: 'Manager' },
    { id: 'fonctionnel', label: 'Fonctionnel' },
    { id: 'expert-ia', label: 'Expert IA' },
];

const PROFILE_NAMES: Record<string, string> = {
    'developpeur': 'Développeur', 'business-analyst': 'Business Analyst',
    'manager': 'Manager', 'fonctionnel': 'Fonctionnel', 'expert-ia': 'Expert IA'
};

@Component({
    selector: 'app-manager-export',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <a routerLink="/" class="back-link">← Accueil</a>
                    <h1>Export projet</h1>
                    <p class="subtitle">{{ auth.currentUser?.company_name }}</p>
                </div>
            </div>

            <!-- Filtre profil -->
            <div class="filter-bar glass-card">
                <span class="filter-label">Filtrer par profil :</span>
                <select [(ngModel)]="selectedProfileId" (ngModelChange)="onProfileChange()" class="filter-select">
                    <option *ngFor="let p of profiles" [value]="p.id">{{ p.label }}</option>
                </select>
                <span class="filter-count" *ngIf="!loading">
                    {{ filteredAudits.length }} évaluation(s)
                    <span *ngIf="selectedProfileId"> · {{ profileLabel(selectedProfileId) }}</span>
                </span>
            </div>

            <!-- Actions export -->
            <div class="top-actions" *ngIf="!loading && filteredAudits.length > 0">
                <a [href]="excelUrl" class="btn btn-primary" target="_blank">
                    📊 Exporter Excel ({{ filteredAudits.length }} éval.)
                </a>
                <a [href]="pdfUrl" class="btn btn-secondary" target="_blank">
                    📥 PDF rapport projet
                </a>
            </div>

            <div *ngIf="loading" class="loading">Chargement...</div>
            <div *ngIf="!loading && filteredAudits.length === 0" class="empty-state glass-card">
                <span class="empty-icon">📋</span>
                <p>Aucune évaluation pour ce filtre.</p>
            </div>

            <!-- Synthèse par participant -->
            <div class="export-card glass-card" *ngIf="!loading && userGroups.length > 0">
                <div class="export-icon">👥</div>
                <h2>Synthèse par participant</h2>
                <p>Résultats des membres de votre équipe{{ selectedProfileId ? ' — ' + profileLabel(selectedProfileId) : '' }}.</p>

                <div class="audit-list">
                    <div *ngFor="let u of userGroups" class="audit-row">
                        <div class="audit-info">
                            <span class="audit-name">{{ u.name }}</span>
                            <span class="audit-meta">{{ u.email }} · {{ u.count }} éval. · Moy. {{ u.avgScore }}%</span>
                        </div>
                        <a [href]="getUserPdfUrl(u.userId)" class="btn btn-secondary btn-sm" target="_blank">
                            📥 PDF
                        </a>
                    </div>
                </div>
            </div>

            <!-- Détail par session -->
            <div class="export-card glass-card" *ngIf="!loading && filteredAudits.length > 0">
                <div class="export-icon">📄</div>
                <h2>Détail par session</h2>
                <p>Un PDF détaillé pour chaque session d'évaluation.</p>

                <div class="audit-list">
                    <div *ngFor="let audit of filteredAudits" class="audit-row">
                        <div class="audit-info">
                            <span class="audit-name">{{ audit.user_name || 'Anonyme' }}</span>
                            <span class="audit-meta">
                                {{ profileLabel(audit.profile_id) }} · {{ audit.scores?.overall || 0 }}% · {{ audit.created_at | date:'dd/MM/yyyy' }}
                            </span>
                        </div>
                        <a [href]="getSessionPdfUrl(audit.id)" class="btn btn-secondary btn-sm" target="_blank">
                            📄 PDF
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 900px; margin: 0 auto; padding: 0 24px; }
        .page-header { margin-bottom: 28px; }
        .back-link { display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px; }
        .back-link:hover { color: var(--text-primary); }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }

        .filter-bar { display: flex; align-items: center; gap: 12px; padding: 14px 20px; margin-bottom: 24px; flex-wrap: wrap; }
        .filter-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
        .filter-select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--text-primary); padding: 6px 12px; font-size: 0.875rem; cursor: pointer; }
        .filter-count { font-size: 0.8rem; color: var(--text-secondary); margin-left: auto; }

        .top-actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
        .empty-state { padding: 40px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 12px; }
        .empty-icon { font-size: 3rem; }

        .export-card { padding: 28px; display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
        .export-icon { font-size: 2.5rem; }
        h2 { font-size: 1.15rem; font-weight: 700; margin: 0; }
        p { color: var(--text-secondary); font-size: 0.9rem; margin: 0; }

        .audit-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
        .audit-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .audit-row:last-child { border-bottom: none; }
        .audit-info { display: flex; flex-direction: column; gap: 2px; }
        .audit-name { font-size: 0.9rem; font-weight: 600; }
        .audit-meta { font-size: 0.8rem; color: var(--text-secondary); }
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; white-space: nowrap; }
    `]
})
export class ManagerExportComponent implements OnInit {
    audits: any[] = [];
    filteredAudits: any[] = [];
    userGroups: { userId: string; name: string; email: string; count: number; avgScore: number }[] = [];
    loading = true;
    selectedProfileId = '';
    profiles = PROFILES;

    private get token(): string { return localStorage.getItem('auth_token') || ''; }

    get excelUrl(): string {
        const profile = this.selectedProfileId ? `?profileId=${this.selectedProfileId}&` : '?';
        return `http://localhost:3000/api/export/excel${profile}token=${this.token}`;
    }

    get pdfUrl(): string {
        const profile = this.selectedProfileId ? `?profileId=${this.selectedProfileId}&` : '?';
        return `http://localhost:3000/api/export/pdf/company${profile}token=${this.token}`;
    }

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        const companyId = this.auth.currentUser?.company_id;
        if (!companyId) return;
        this.adminService.getCompanyAudits(companyId).subscribe({
            next: audits => {
                this.audits = audits;
                this.filteredAudits = audits;
                this.buildUserGroups(audits);
                this.loading = false;
            },
            error: () => { this.loading = false; }
        });
    }

    onProfileChange(): void {
        this.filteredAudits = this.selectedProfileId
            ? this.audits.filter(a => a.profile_id === this.selectedProfileId)
            : this.audits;
        this.buildUserGroups(this.filteredAudits);
    }

    private buildUserGroups(audits: any[]): void {
        const map = new Map<string, { userId: string; name: string; email: string; count: number; totalScore: number }>();
        audits.forEach(a => {
            if (!a.user_id) return;
            if (!map.has(a.user_id)) {
                map.set(a.user_id, { userId: a.user_id, name: a.user_name || 'Anonyme', email: a.user_email || '', count: 0, totalScore: 0 });
            }
            const g = map.get(a.user_id)!;
            g.count++;
            g.totalScore += a.scores?.overall || 0;
        });
        this.userGroups = Array.from(map.values()).map(g => ({
            ...g,
            avgScore: g.count ? Math.round(g.totalScore / g.count) : 0
        }));
    }

    profileLabel(id: string): string { return PROFILE_NAMES[id] || id; }

    getUserPdfUrl(userId: string): string {
        return `http://localhost:3000/api/export/pdf/user?userId=${userId}&token=${this.token}`;
    }

    getSessionPdfUrl(auditId: string): string {
        return `http://localhost:3000/api/export/pdf?auditId=${auditId}&token=${this.token}`;
    }
}
