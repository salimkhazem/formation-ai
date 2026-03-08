import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { AdminService } from '../../../services/admin.service';

@Component({
    selector: 'app-export',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <a routerLink="/admin/dashboard" class="back-link">← Dashboard</a>
                    <h1>Export des données</h1>
                    <p class="subtitle">{{ auth.currentUser?.company_name }}</p>
                </div>
            </div>

            <div class="export-grid">
                <!-- Excel Export -->
                <div class="export-card glass-card">
                    <div class="export-icon">📊</div>
                    <h2>Export Excel</h2>
                    <p>Téléchargez toutes les évaluations de votre entreprise dans un fichier Excel multi-onglets :</p>
                    <ul class="features">
                        <li>Onglet Résumé — tous les scores globaux</li>
                        <li>Onglet Dimensions — scores par dimension</li>
                        <li>Onglet Analyses IA — synthèses Claude</li>
                    </ul>
                    <a [href]="excelUrl" class="btn btn-primary" [class.disabled]="!audits.length" target="_blank">
                        ⬇️ Télécharger Excel ({{ audits.length }} évaluation{{ audits.length !== 1 ? 's' : '' }})
                    </a>
                </div>

                <!-- PDF per audit -->
                <div class="export-card glass-card">
                    <div class="export-icon">📄</div>
                    <h2>Rapports PDF individuels</h2>
                    <p>Téléchargez un rapport PDF détaillé pour chaque évaluation incluant l'analyse Claude.</p>

                    <div *ngIf="loading" class="loading">Chargement...</div>

                    <div *ngIf="!loading && audits.length === 0" class="empty-state">
                        Aucune évaluation disponible.
                    </div>

                    <div *ngIf="!loading && audits.length > 0" class="audit-list">
                        <div *ngFor="let audit of audits" class="audit-row">
                            <div class="audit-info">
                                <span class="audit-name">{{ audit.user_name || 'Anonyme' }}</span>
                                <span class="audit-meta">{{ profileLabel(audit.profile_id) }} — {{ audit.scores?.overall || 0 }}% — {{ audit.created_at | date:'dd/MM/yyyy' }}</span>
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
    loading = true;

    private profileNames: Record<string, string> = {
        'developpeur': 'Développeur', 'business-analyst': 'Business Analyst',
        'manager': 'Manager', 'fonctionnel': 'Fonctionnel', 'expert-ia': 'Expert IA'
    };

    get excelUrl(): string {
        const token = localStorage.getItem('auth_token') || '';
        return `http://localhost:3000/api/export/excel?companyId=${this.auth.currentUser?.company_id}&token=${token}`;
    }

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        const companyId = this.auth.currentUser?.company_id;
        if (!companyId) return;
        this.adminService.getCompanyAudits(companyId).subscribe({
            next: audits => { this.audits = audits; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    profileLabel(id: string): string {
        return this.profileNames[id] || id;
    }

    getPdfUrl(auditId: string): string {
        return `http://localhost:3000/api/export/pdf?auditId=${auditId}`;
    }
}
