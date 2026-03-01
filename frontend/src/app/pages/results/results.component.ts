import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { Audit } from '../../models/models';

@Component({
    selector: 'app-results',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="container" *ngIf="audit">
      <!-- Header -->
      <div class="result-hero animate-fadeInUp">
        <div class="hero-emoji">{{ audit.scores.levelEmoji }}</div>
        <h1 class="hero-level" [style.color]="audit.scores.levelColor">{{ audit.scores.levelLabel }}</h1>
        <p class="hero-subtitle">Niveau de maturité IA · Profil {{ audit.profileName }}</p>
      </div>

      <!-- Score Circle -->
      <div class="score-section animate-fadeInUp" style="animation-delay: 0.1s">
        <div class="score-circle-container">
          <svg class="score-circle" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="85" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="12" />
            <circle cx="100" cy="100" r="85"
              fill="none"
              [attr.stroke]="audit.scores.levelColor"
              stroke-width="12"
              stroke-linecap="round"
              [attr.stroke-dasharray]="circumference"
              [attr.stroke-dashoffset]="dashOffset"
              transform="rotate(-90 100 100)"
              class="score-arc"
            />
          </svg>
          <div class="score-value">
            <span class="score-number">{{ audit.scores.overall }}</span>
            <span class="score-unit">%</span>
          </div>
        </div>
        <p class="score-label">Score global de maturité</p>
      </div>

      <div class="results-grid">
        <!-- Radar / Dimensions -->
        <div class="dimension-card glass-card animate-fadeInUp" style="animation-delay: 0.15s">
          <h3 class="card-title">📊 Scores par dimension</h3>
          <canvas #radarCanvas width="350" height="350" class="radar-canvas"></canvas>
          <div class="dimension-list">
            <div *ngFor="let dim of dimensionEntries" class="dim-row">
              <span class="dim-name">{{ dim.name }}</span>
              <div class="dim-bar-bg">
                <div class="dim-bar-fill"
                  [style.width]="dim.score + '%'"
                  [style.background]="getBarColor(dim.score)"
                ></div>
              </div>
              <span class="dim-score" [style.color]="getBarColor(dim.score)">{{ dim.score }}%</span>
            </div>
          </div>
        </div>

        <!-- Recommendations -->
        <div class="reco-card glass-card animate-fadeInUp" style="animation-delay: 0.2s">
          <h3 class="card-title">💡 Recommandations</h3>
          <div class="reco-list">
            <div *ngFor="let rec of audit.scores.recommendations; let i = index" class="reco-item">
              <span class="reco-number">{{ i + 1 }}</span>
              <p>{{ rec }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Maturity Scale -->
      <div class="maturity-scale-card glass-card animate-fadeInUp" style="animation-delay: 0.25s">
        <h3 class="card-title">🎯 Échelle de maturité</h3>
        <div class="maturity-scale">
          <div *ngFor="let level of maturityLevels" class="scale-segment"
            [class.active]="level.key === audit.scores.level"
            [style.--segment-color]="level.color"
          >
            <div class="segment-bar"></div>
            <span class="segment-emoji">{{ level.emoji }}</span>
            <span class="segment-label">{{ level.label }}</span>
            <span class="segment-range">{{ level.range }}</span>
          </div>
        </div>
      </div>

      <!-- Info -->
      <div class="info-card glass-card animate-fadeInUp" style="animation-delay: 0.3s">
        <div class="info-row">
          <span class="info-label">Profil</span>
          <span>{{ audit.profileIcon }} {{ audit.profileName }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Participant</span>
          <span>{{ audit.respondentName || 'Anonyme' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date</span>
          <span>{{ formatDate(audit.created_at) }}</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions-bar animate-fadeInUp" style="animation-delay: 0.35s">
        <a routerLink="/" class="btn btn-secondary">← Nouvel audit</a>
        <a routerLink="/history" class="btn btn-secondary">📋 Historique</a>
      </div>
    </div>
  `,
    styles: [`
    .result-hero {
      text-align: center;
      padding: 32px 0 16px;
    }

    .hero-emoji { font-size: 3.5rem; margin-bottom: 12px; }

    .hero-level {
      font-size: 2.2rem;
      font-weight: 800;
      letter-spacing: -0.03em;
    }

    .hero-subtitle {
      color: var(--text-secondary);
      font-size: 0.95rem;
      margin-top: 6px;
    }

    /* Score Circle */
    .score-section {
      text-align: center;
      padding: 16px 0 32px;
    }

    .score-circle-container {
      position: relative;
      width: 180px;
      height: 180px;
      margin: 0 auto;
    }

    .score-circle {
      width: 100%;
      height: 100%;
    }

    .score-arc {
      transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .score-value {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .score-number {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.04em;
    }

    .score-unit {
      font-size: 1.2rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-left: 2px;
      align-self: flex-start;
      margin-top: 14px;
    }

    .score-label {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin-top: 8px;
    }

    /* Grid */
    .results-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 1rem;
      font-weight: 700;
      margin-bottom: 20px;
    }

    .dimension-card, .reco-card {
      padding: 28px;
    }

    /* Radar Canvas */
    .radar-canvas {
      display: block;
      margin: 0 auto 20px;
      max-width: 100%;
    }

    /* Dimension Bars */
    .dimension-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .dim-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .dim-name {
      font-size: 0.8rem;
      font-weight: 600;
      min-width: 120px;
      color: var(--text-secondary);
    }

    .dim-bar-bg {
      flex: 1;
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
    }

    .dim-bar-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 1s ease-out;
    }

    .dim-score {
      font-size: 0.8rem;
      font-weight: 700;
      min-width: 40px;
      text-align: right;
    }

    /* Recommendations */
    .reco-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .reco-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .reco-number {
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: rgba(99, 102, 241, 0.12);
      color: #818cf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .reco-item p {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.5;
    }

    /* Maturity Scale */
    .maturity-scale-card {
      padding: 28px;
      margin-bottom: 20px;
    }

    .maturity-scale {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .scale-segment {
      text-align: center;
      padding: 16px 8px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      transition: var(--transition);
    }

    .scale-segment.active {
      background: rgba(255, 255, 255, 0.04);
      border-color: var(--segment-color);
      box-shadow: 0 0 20px color-mix(in srgb, var(--segment-color) 20%, transparent);
    }

    .segment-bar {
      height: 4px;
      border-radius: 2px;
      background: var(--segment-color);
      margin-bottom: 10px;
      opacity: 0.4;
    }

    .scale-segment.active .segment-bar { opacity: 1; }

    .segment-emoji { font-size: 1.4rem; display: block; margin-bottom: 4px; }

    .segment-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 2px;
    }

    .segment-range {
      font-size: 0.68rem;
      color: var(--text-muted);
    }

    /* Info Card */
    .info-card {
      padding: 24px 28px;
      margin-bottom: 20px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 0.88rem;
      border-bottom: 1px solid var(--border-glass);
    }

    .info-row:last-child { border-bottom: none; }

    .info-label {
      color: var(--text-muted);
      font-weight: 600;
    }

    /* Actions */
    .actions-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 0 32px;
    }

    @media (max-width: 768px) {
      .results-grid { grid-template-columns: 1fr; }
      .maturity-scale { grid-template-columns: 1fr 1fr; }
      .hero-level { font-size: 1.6rem; }
    }
  `]
})
export class ResultsComponent implements OnInit, AfterViewInit {
    @ViewChild('radarCanvas') radarCanvasRef!: ElementRef<HTMLCanvasElement>;

    audit: Audit | null = null;
    dimensionEntries: { name: string; score: number }[] = [];
    circumference = 2 * Math.PI * 85; // ~534
    dashOffset = this.circumference; // start fully hidden

    maturityLevels = [
        { key: 'discovery', emoji: '🔴', label: 'Découverte', range: '0-25%', color: '#ef4444' },
        { key: 'exploration', emoji: '🟠', label: 'Exploration', range: '26-50%', color: '#f97316' },
        { key: 'adoption', emoji: '🟡', label: 'Adoption', range: '51-75%', color: '#eab308' },
        { key: 'mastery', emoji: '🟢', label: 'Maîtrise', range: '76-100%', color: '#22c55e' }
    ];

    constructor(
        private route: ActivatedRoute,
        private auditService: AuditService
    ) { }

    ngOnInit() {
        const id = this.route.snapshot.paramMap.get('id')!;
        this.auditService.getAudit(id).subscribe(audit => {
            this.audit = audit;
            this.dimensionEntries = Object.entries(audit.scores.dimensions)
                .map(([name, score]) => ({ name, score }))
                .sort((a, b) => b.score - a.score);

            // Animate score circle
            setTimeout(() => {
                this.dashOffset = this.circumference * (1 - audit.scores.overall / 100);
            }, 200);
        });
    }

    ngAfterViewInit() {
        // Delay radar chart rendering to after data loads
        const check = setInterval(() => {
            if (this.audit && this.radarCanvasRef) {
                clearInterval(check);
                this.drawRadar();
            }
        }, 100);
    }

    drawRadar() {
        if (!this.audit || !this.radarCanvasRef) return;

        const canvas = this.radarCanvasRef.nativeElement;
        const ctx = canvas.getContext('2d')!;
        const dims = this.dimensionEntries;
        const n = dims.length;
        if (n < 3) return;

        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const maxR = Math.min(cx, cy) - 40;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw grid circles
        for (let i = 1; i <= 4; i++) {
            const r = (maxR / 4) * i;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw axes & labels
        const angleStep = (Math.PI * 2) / n;
        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + i * angleStep;
            const x = cx + Math.cos(angle) * maxR;
            const y = cy + Math.sin(angle) * maxR;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Label
            const labelR = maxR + 22;
            const lx = cx + Math.cos(angle) * labelR;
            const ly = cy + Math.sin(angle) * labelR;
            ctx.fillStyle = '#9ca3af';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(dims[i].name, lx, ly);
        }

        // Draw data polygon
        const color = this.audit.profileColor || '#6366f1';
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + i * angleStep;
            const r = (dims[i].score / 100) * maxR;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle = color + '25';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw data points
        for (let i = 0; i < n; i++) {
            const angle = -Math.PI / 2 + i * angleStep;
            const r = (dims[i].score / 100) * maxR;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#0f0f1a';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    getBarColor(score: number): string {
        if (score <= 25) return '#ef4444';
        if (score <= 50) return '#f97316';
        if (score <= 75) return '#eab308';
        return '#22c55e';
    }

    formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString('fr-FR', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }
}
