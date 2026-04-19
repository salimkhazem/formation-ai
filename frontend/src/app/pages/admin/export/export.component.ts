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

@Component({
    selector: 'app-export',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <a routerLink="/admin/dashboard" class="back-link">← Dashboard</a>
                    <h1>Export des données</h1>
                    <p class="subtitle">{{ auth.currentUser?.company_name }}</p>
                </div>
            </div>

            <!-- Filtre par projet (profil) -->
            <div class="filter-bar glass-card">
                <span class="filter-label">Filtrer par projet / profil :</span>
                <select [(ngModel)]="selectedProfileId" (ngModelChange)="onProfileChange()" class="filter-select">
                    <option *ngFor="let p of profiles" [value]="p.id">{{ p.label }}</option>
                </select>
                <span class="filter-count" *ngIf="!loading">
                    {{ filteredAudits.length }} évaluation(s)
                    <span *ngIf="selectedProfileId"> · {{ profileLabel(selectedProfileId) }}</span>
                </span>
            </div>

            <!-- Top actions -->
            <div class="top-actions" *ngIf="!loading && filteredAudits.length > 0">
                <a [href]="excelUrl" class="btn btn-primary" target="_blank">
                    📊 Télécharger Excel ({{ filteredAudits.length }} éval.)
                </a>
                <a [href]="companyPdfUrl" class="btn btn-secondary" target="_blank">
                    📥 PDF complet — toute l'équipe
                </a>
            </div>

            <div class="export-grid">
                <!-- PDF par utilisateur -->
                <div class="export-card glass-card">
                    <div class="export-icon">👤</div>
                    <h2>PDF par utilisateur</h2>
                    <p>Un PDF regroupant toutes les évaluations de chaque membre.</p>

                    <div *ngIf="loading" class="loading">Chargement...</div>
                    <div *ngIf="!loading && userGroups.length === 0" class="empty-state">Aucun utilisateur.</div>

                    <div *ngIf="!loading && userGroups.length > 0" class="audit-list">
                        <div *ngFor="let u of userGroups" class="audit-row">
                            <div class="audit-info">
                                <span class="audit-name">{{ u.name }}</span>
                                <span class="audit-meta">{{ u.email }} · {{ u.count }} éval.</span>
                            </div>
                            <a [href]="getUserPdfUrl(u.userId)" class="btn btn-secondary btn-sm" target="_blank">
                                📥 PDF
                            </a>
                        </div>
                    </div>
                </div>

                <!-- PDF par évaluation individuelle -->
                <div class="export-card glass-card">
                    <div class="export-icon">📄</div>
                    <h2>PDF par évaluation</h2>
                    <p>Un PDF détaillé pour chaque évaluation individuelle.</p>

                    <div *ngIf="loading" class="loading">Chargement...</div>
                    <div *ngIf="!loading && filteredAudits.length === 0" class="empty-state">Aucune évaluation.</div>

                    <div *ngIf="!loading && filteredAudits.length > 0" class="audit-list">
                        <div *ngFor="let audit of filteredAudits" class="audit-row">
                            <div class="audit-info">
                                <span class="audit-name">{{ audit.user_name || 'Anonyme' }}</span>
                                <span class="audit-meta">
                                    {{ profileLabel(audit.profile_id) }} · {{ audit.scores?.overall || 0 }}% · {{ audit.created_at | date:'dd/MM/yyyy' }}
                                </span>
                            </div>
                            <a [href]="getPdfUrl(audit.id)" class="btn btn-secondary btn-sm" target="_blank">
                                📄 PDF
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .page-header { margin-bottom: 32px; }
        .back-link { display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px; }
        .back-link:hover { color: var(--text-primary); }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }

        .filter-bar { display: flex; align-items: center; gap: 12px; padding: 14px 20px; margin-bottom: 24px; flex-wrap: wrap; }
        .filter-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
        .filter-select { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 8px; color: var(--text-primary); padding: 6px 12px; font-size: 0.875rem; cursor: pointer; }
        .filter-count { font-size: 0.8rem; color: var(--text-secondary); margin-left: auto; }
        .top-actions { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .export-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        @media (max-width: 768px) { .export-grid { grid-template-columns: 1fr; } }

        .export-card { padding: 32px; display: flex; flex-direction: column; gap: 16px; }
        .export-icon { font-size: 3rem; }
        h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
        p { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin: 0; }

        .features { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
        .features li { font-size: 0.875rem; color: var(--text-secondary); padding-left: 20px; position: relative; }
        .features li::before { content: '✓'; position: absolute; left: 0; color: #4ade80; }

        .loading, .empty-state { text-align: center; padding: 24px; color: var(--text-secondary); font-size: 0.875rem; }

        .audit-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
        .audit-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .audit-row:last-child { border-bottom: none; }
        .audit-info { display: flex; flex-direction: column; gap: 2px; }
        .audit-name { font-size: 0.9rem; font-weight: 600; }
        .audit-meta { font-size: 0.8rem; color: var(--text-secondary); }
        .btn-sm { padding: 6px 12px; font-size: 0.8rem; white-space: nowrap; }
        .btn.disabled { opacity: 0.5; pointer-events: none; }
    `]
})
export class ExportComponent implements OnInit {
    audits: any[] = [];
    filteredAudits: any[] = [];
    userGroups: { userId: string; name: string; email: string; count: number }[] = [];
    loading = true;
    selectedProfileId = '';
    profiles = PROFILES;

    private profileNames: Record<string, string> = {
        'developpeur': 'Développeur', 'business-analyst': 'Business Analyst',
        'manager': 'Manager', 'fonctionnel': 'Fonctionnel', 'expert-ia': 'Expert IA'
    };

    private get token(): string { return localStorage.getItem('auth_token') || ''; }
    private get companyId(): string { return this.auth.currentUser?.company_id || ''; }

    get excelUrl(): string {
        const profile = this.selectedProfileId ? `&profileId=${this.selectedProfileId}` : '';
        return `http://localhost:3000/api/export/excel?companyId=${this.companyId}${profile}&token=${this.token}`;
    }

    get companyPdfUrl(): string {
        const profile = this.selectedProfileId ? `&profileId=${this.selectedProfileId}` : '';
        return `http://localhost:3000/api/export/pdf/company?companyId=${this.companyId}${profile}&token=${this.token}`;
    }

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        if (!this.companyId) return;
        this.adminService.getCompanyAudits(this.companyId).subscribe({
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
        const map = new Map<string, { userId: string; name: string; email: string; count: number }>();
        audits.forEach(a => {
            if (!a.user_id) return;
            if (!map.has(a.user_id)) {
                map.set(a.user_id, { userId: a.user_id, name: a.user_name || 'Anonyme', email: a.user_email || '', count: 0 });
            }
            map.get(a.user_id)!.count++;
        });
        this.userGroups = Array.from(map.values());
    }

    profileLabel(id: string): string { return this.profileNames[id] || id; }

    getPdfUrl(auditId: string): string {
        return `http://localhost:3000/api/export/pdf?auditId=${auditId}&token=${this.token}`;
    }

    getUserPdfUrl(userId: string): string {
        return `http://localhost:3000/api/export/pdf/user?userId=${userId}&token=${this.token}`;
    }
}
