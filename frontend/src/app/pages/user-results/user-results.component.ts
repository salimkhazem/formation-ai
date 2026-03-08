import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';

const PROFILE_NAMES: Record<string, string> = {
    'developpeur': 'Développeur', 'business-analyst': 'Business Analyst',
    'manager': 'Manager', 'fonctionnel': 'Fonctionnel', 'expert-ia': 'Expert IA'
};

const PROFILE_ICONS: Record<string, string> = {
    'developpeur': '💻', 'business-analyst': '📊',
    'manager': '👥', 'fonctionnel': '⚙️', 'expert-ia': '🤖'
};

@Component({
    selector: 'app-user-results',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="container">
            <div class="page-header">
                <a routerLink="/" class="back-link">← Accueil</a>
                <h1>Mes évaluations</h1>
                <p class="subtitle">{{ auth.currentUser?.name || auth.currentUser?.email }}</p>
            </div>

            <div *ngIf="loading" class="loading">Chargement...</div>

            <div *ngIf="!loading && audits.length === 0" class="empty-state glass-card">
                <span class="empty-icon">📋</span>
                <h2>Aucune évaluation</h2>
                <p>Choisissez un profil et démarrez votre évaluation.</p>
                <a routerLink="/" class="btn btn-primary">Commencer</a>
            </div>

            <div class="audits-list" *ngIf="!loading && audits.length > 0">
                <div *ngFor="let audit of audits" class="audit-card glass-card">

                    <!-- Card header -->
                    <div class="card-top">
                        <div class="profile-tag">
                            <span class="profile-icon">{{ profileIcon(audit.profile_id) }}</span>
                            <span>{{ profileName(audit.profile_id) }}</span>
                        </div>
                        <div class="global-score" [style.border-color]="levelColor(audit.scores?.overall)">
                            <span class="score-val">{{ audit.scores?.overall || 0 }}%</span>
                            <span class="score-emoji">{{ audit.scores?.levelEmoji }}</span>
                        </div>
                    </div>

                    <div class="level-row">
                        <span class="level-badge" [style.color]="levelColor(audit.scores?.overall)">
                            {{ audit.scores?.levelLabel }}
                        </span>
                        <span class="audit-date">{{ audit.created_at | date:'dd/MM/yyyy' }}</span>
                    </div>

                    <!-- 7 Axes -->
                    <div class="axes-section" *ngIf="audit.scores?.axisScores">
                        <h4>Scores par axe</h4>
                        <div class="axes-rows">
                            <div *ngFor="let axis of getAxes(audit.scores.axisScores)"
                                 class="axis-row"
                                 [class.no-data]="!axis.hasData">
                                <span class="axis-icon-sm">{{ axis.icon }}</span>
                                <span class="axis-name-sm">{{ axis.label }}</span>
                                <div class="axis-bar-bg">
                                    <div *ngIf="axis.hasData"
                                         class="axis-bar-fill"
                                         [style.width.%]="axis.score"
                                         [style.background]="levelColor(axis.score)">
                                    </div>
                                </div>
                                <span class="axis-score-sm" [style.color]="axis.hasData ? levelColor(axis.score) : '#64748b'">
                                    {{ axis.hasData ? axis.score + '%' : '—' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Modules suggérés -->
                    <div class="modules-mini" *ngIf="audit.scores?.suggestedModules?.length">
                        <h4>📚 Modules recommandés</h4>
                        <div class="modules-pills">
                            <div *ngFor="let item of audit.scores.suggestedModules" class="module-pill">
                                {{ item.axisIcon }} {{ item.module.name }}
                                <span class="pill-score">{{ item.score }}%</span>
                            </div>
                        </div>
                    </div>

                    <!-- AI Analysis -->
                    <div class="ai-block" *ngIf="audit.ai_analysis">
                        <div class="ai-label">✨ Analyse IA personnalisée</div>
                        <p class="ai-text">{{ audit.ai_analysis }}</p>
                    </div>
                    <div class="ai-pending" *ngIf="!audit.ai_analysis">
                        ⏳ Analyse IA en cours de génération…
                    </div>

                    <div class="card-actions">
                        <a [href]="pdfUrl(audit.id)" class="btn btn-secondary btn-sm" target="_blank">📄 PDF</a>
                        <a routerLink="/" class="btn btn-primary btn-sm">Nouvelle évaluation</a>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 860px; margin: 0 auto; padding: 0 24px; }
        .page-header { margin-bottom: 28px; }
        .back-link { display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px; }
        .back-link:hover { color: var(--text-primary); }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }

        .loading { text-align: center; padding: 60px; color: var(--text-secondary); }
        .empty-state { padding: 60px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .empty-icon { font-size: 4rem; }

        .audits-list { display: flex; flex-direction: column; gap: 24px; }
        .audit-card { padding: 24px; display: flex; flex-direction: column; gap: 16px; }

        .card-top { display: flex; align-items: center; justify-content: space-between; }
        .profile-tag { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 1rem; }
        .profile-icon { font-size: 1.4rem; }

        .global-score {
            width: 72px; height: 72px; border-radius: 50%; border: 3px solid;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
        }
        .score-val { font-size: 1.3rem; font-weight: 800; line-height: 1; }
        .score-emoji { font-size: 1rem; }

        .level-row { display: flex; align-items: center; justify-content: space-between; }
        .level-badge { font-size: 0.95rem; font-weight: 700; }
        .audit-date { color: var(--text-secondary); font-size: 0.85rem; }

        /* Axes */
        .axes-section h4 { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
        .axes-rows { display: flex; flex-direction: column; gap: 7px; }
        .axis-row { display: grid; grid-template-columns: 20px 140px 1fr 44px; align-items: center; gap: 10px; }
        .axis-row.no-data { opacity: 0.4; }
        .axis-icon-sm { font-size: 0.9rem; }
        .axis-name-sm { font-size: 0.8rem; color: var(--text-secondary); }
        .axis-bar-bg { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .axis-bar-fill { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        .axis-score-sm { font-size: 0.8rem; font-weight: 700; text-align: right; }

        /* Modules */
        .modules-mini h4 { font-size: 0.85rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 10px; }
        .modules-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .module-pill {
            display: flex; align-items: center; gap: 6px;
            padding: 6px 12px; border-radius: 20px;
            background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.2);
            font-size: 0.8rem; font-weight: 500;
        }
        .pill-score { color: #f97316; font-weight: 700; font-size: 0.75rem; }

        /* AI */
        .ai-block { background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.18); border-radius: 12px; padding: 14px 16px; }
        .ai-label { font-size: 0.78rem; font-weight: 700; color: #818cf8; margin-bottom: 8px; }
        .ai-text { font-size: 0.875rem; line-height: 1.7; color: var(--text-secondary); margin: 0; white-space: pre-wrap; }
        .ai-pending { font-size: 0.85rem; color: var(--text-secondary); text-align: center; padding: 8px; }

        .card-actions { display: flex; gap: 10px; justify-content: flex-end; }
        .btn-sm { padding: 8px 14px; font-size: 0.8rem; }
    `]
})
export class UserResultsComponent implements OnInit {
    audits: any[] = [];
    loading = true;

    constructor(public auth: AuthService, private adminService: AdminService) {}

    ngOnInit(): void {
        const userId = this.auth.currentUser?.id;
        if (!userId) return;
        this.adminService.getUserAudits(userId).subscribe({
            next: audits => { this.audits = audits; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    profileName(id: string): string { return PROFILE_NAMES[id] || id; }
    profileIcon(id: string): string { return PROFILE_ICONS[id] || '🤖'; }

    levelColor(score: number = 0): string {
        if (score <= 25) return '#ef4444';
        if (score <= 50) return '#f97316';
        if (score <= 75) return '#eab308';
        return '#22c55e';
    }

    getAxes(axisScores: any): any[] {
        if (!axisScores) return [];
        return Object.values(axisScores);
    }

    pdfUrl(auditId: string): string {
        return `http://localhost:3000/api/export/pdf?auditId=${auditId}`;
    }
}
