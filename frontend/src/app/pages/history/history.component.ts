import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { Audit } from '../../models/models';

@Component({
    selector: 'app-history',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="container">
      <header class="page-header animate-fadeInUp">
        <div>
          <h1 class="page-title">Historique des audits</h1>
          <p class="page-subtitle">Consultez les résultats de tous les audits effectués</p>
        </div>
        <a routerLink="/" class="btn btn-primary">+ Nouvel audit</a>
      </header>

      <!-- Audits List -->
      <div class="audit-list" *ngIf="audits.length > 0">
        <a
          *ngFor="let a of audits; let i = index"
          [routerLink]="['/results', a.id]"
          class="audit-row glass-card"
          [style.animation-delay]="(i * 0.05) + 's'"
        >
          <span class="audit-icon" [style.background]="a.profileColor + '20'">{{ a.profileIcon }}</span>
          <div class="audit-info">
            <h3>{{ a.respondentName || 'Anonyme' }}</h3>
            <span class="audit-meta">{{ a.profileName }} · {{ formatDate(a.created_at) }}</span>
          </div>
          <div class="audit-score">
            <span class="score-emoji">{{ a.scores.levelEmoji }}</span>
            <div>
              <span class="score-value" [style.color]="a.scores.levelColor">{{ a.scores.overall }}%</span>
              <span class="score-level">{{ a.scores.levelLabel }}</span>
            </div>
          </div>
          <button class="btn btn-danger btn-icon" (click)="deleteAudit($event, a)" title="Supprimer">🗑️</button>
        </a>
      </div>

      <!-- Empty State -->
      <div class="empty-state glass-card" *ngIf="audits.length === 0">
        <div class="empty-icon">📋</div>
        <p>Aucun audit n'a encore été effectué</p>
        <a routerLink="/" class="btn btn-primary">Commencer un audit</a>
      </div>
    </div>
  `,
    styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 32px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .page-title {
      font-size: 1.6rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .page-subtitle {
      color: var(--text-secondary);
      margin-top: 4px;
      font-size: 0.9rem;
    }

    .audit-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .audit-row {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      text-decoration: none;
      animation: fadeInUp 0.3s ease-out both;
    }

    .audit-row:hover {
      transform: translateX(4px);
    }

    .audit-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .audit-info {
      flex: 1;
    }

    .audit-info h3 {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 2px;
    }

    .audit-meta {
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    .audit-score {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .score-emoji { font-size: 1.3rem; }

    .score-value {
      font-size: 1.1rem;
      font-weight: 800;
      display: block;
    }

    .score-level {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    @media (max-width: 640px) {
      .page-header { flex-direction: column; }
      .audit-row { flex-wrap: wrap; }
    }
  `]
})
export class HistoryComponent implements OnInit {
    audits: Audit[] = [];

    constructor(private auditService: AuditService) { }

    ngOnInit() {
        this.loadAudits();
    }

    loadAudits() {
        this.auditService.getAudits().subscribe(audits => {
            this.audits = audits;
        });
    }

    deleteAudit(event: Event, audit: Audit) {
        event.preventDefault();
        event.stopPropagation();
        if (confirm(`Supprimer l'audit de "${audit.respondentName || 'Anonyme'}" ?`)) {
            this.auditService.deleteAudit(audit.id).subscribe(() => {
                this.audits = this.audits.filter(a => a.id !== audit.id);
            });
        }
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
}
