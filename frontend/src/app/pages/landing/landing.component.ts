import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { Profile } from '../../models/models';

@Component({
    selector: 'app-landing',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="container">
      <!-- Hero Section -->
      <section class="hero animate-fadeInUp">
        <div class="hero-badge">🤖 Évaluation de la maturité IA</div>
        <h1 class="hero-title">
          Mesurez votre niveau d'utilisation<br/>
          de l'<span class="gradient-text">Intelligence Artificielle</span>
        </h1>
        <p class="hero-subtitle">
          Évaluez la maturité de vos pratiques IA selon votre profil métier.<br/>
          ChatGPT, Claude, Gemini, Copilot… Où en êtes-vous ?
        </p>
      </section>

      <!-- How it works -->
      <section class="steps-section animate-fadeInUp" style="animation-delay: 0.1s">
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3>Choisissez votre profil</h3>
            <p>Sélectionnez le profil qui correspond le mieux à votre rôle</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3>Répondez aux questions</h3>
            <p>Questions générales puis spécifiques à votre domaine</p>
          </div>
          <div class="step-arrow">→</div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3>Découvrez votre score</h3>
            <p>Score de maturité, radar par dimension et recommandations</p>
          </div>
        </div>
      </section>

      <!-- Profile Selection -->
      <section class="profiles-section">
        <h2 class="section-title animate-fadeInUp">Sélectionnez votre profil</h2>

        <!-- Mode selector -->
        <div class="mode-tabs animate-fadeInUp">
          <button class="mode-tab" [class.active]="selectedMode === 'scripted'" (click)="selectedMode = 'scripted'">
            📋 Questionnaire guidé
            <span class="mode-desc">4 choix par question</span>
          </button>
          <button class="mode-tab" [class.active]="selectedMode === 'ai'" (click)="selectedMode = 'ai'">
            🤖 Entretien IA
            <span class="mode-desc">Conversation libre · Azure OpenAI</span>
          </button>
        </div>

        <div class="profiles-grid">
          <div
            *ngFor="let profile of profiles; let i = index"
            class="profile-card glass-card"
            [style.animation-delay]="(i * 0.08) + 's'"
          >
            <div class="card-glow" [style.background]="'radial-gradient(circle at 30% 30%, ' + profile.color + '22, transparent 70%)'"></div>
            <div class="card-header">
              <span class="card-icon" [style.background]="profile.color + '20'" [style.color]="profile.color">{{ profile.icon }}</span>
              <span *ngIf="profile.auditCount" class="card-count" [style.background]="profile.color + '18'" [style.color]="profile.color">
                {{ profile.auditCount }} audit{{ profile.auditCount! > 1 ? 's' : '' }}
              </span>
            </div>
            <h3 class="card-title">{{ profile.name }}</h3>
            <p class="card-description">{{ profile.description }}</p>
            <div class="card-dimensions">
              <span *ngFor="let dim of profile.dimensions" class="dim-tag" [style.border-color]="profile.color + '30'">{{ dim }}</span>
            </div>
            <div class="card-footer">
              <!-- Scripted chatbot -->
              <a *ngIf="selectedMode === 'scripted'"
                 [routerLink]="['/chat', profile.id]"
                 class="start-btn"
                 [style.background]="profile.color + '18'"
                 [style.border-color]="profile.color + '40'"
                 [style.color]="profile.color">
                📋 Démarrer le questionnaire
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <!-- AI conversational chatbot -->
              <a *ngIf="selectedMode === 'ai'"
                 [routerLink]="['/ai-chat', profile.id]"
                 class="start-btn ai-start"
                 [style.border-color]="profile.color + '40'">
                🤖 Démarrer l'entretien IA
                <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <!-- Maturity Levels -->
      <section class="levels-section animate-fadeInUp">
        <h2 class="section-title">Les 4 niveaux de maturité</h2>
        <div class="levels-grid">
          <div class="level-card" *ngFor="let level of maturityLevels">
            <span class="level-emoji">{{ level.emoji }}</span>
            <div>
              <h4 [style.color]="level.color">{{ level.label }}</h4>
              <p>{{ level.range }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
    styles: [`
    .hero {
      text-align: center;
      padding: 40px 0 48px;
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: 30px;
      background: rgba(99, 102, 241, 0.1);
      border: 1px solid rgba(99, 102, 241, 0.2);
      font-size: 0.8rem;
      font-weight: 600;
      color: #818cf8;
      margin-bottom: 24px;
    }

    .hero-title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      line-height: 1.2;
      margin-bottom: 16px;
    }

    .gradient-text {
      background: linear-gradient(135deg, #6366f1, #ec4899, #f59e0b);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      color: var(--text-secondary);
      font-size: 1.05rem;
      line-height: 1.7;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Steps */
    .steps-section { margin-bottom: 56px; }

    .steps-grid {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
    }

    .step-card {
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-sm);
      padding: 20px 24px;
      text-align: center;
      flex: 1;
      max-width: 240px;
    }

    .step-number {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.85rem;
      margin-bottom: 10px;
    }

    .step-card h3 {
      font-size: 0.9rem;
      font-weight: 700;
      margin-bottom: 6px;
    }

    .step-card p {
      font-size: 0.78rem;
      color: var(--text-muted);
      line-height: 1.4;
    }

    .step-arrow {
      font-size: 1.2rem;
      color: var(--text-muted);
      flex-shrink: 0;
    }

    /* Mode tabs */
    .mode-tabs {
      display: flex;
      gap: 12px;
      justify-content: center;
      margin-bottom: 28px;
      flex-wrap: wrap;
    }
    .mode-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      padding: 14px 28px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.03);
      color: var(--text-secondary);
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .mode-tab:hover {
      border-color: rgba(99,102,241,0.4);
      background: rgba(99,102,241,0.06);
      color: var(--text-primary);
    }
    .mode-tab.active {
      border-color: rgba(99,102,241,0.6);
      background: rgba(99,102,241,0.12);
      color: #818cf8;
    }
    .mode-desc {
      font-size: 0.72rem;
      font-weight: 400;
      color: var(--text-secondary);
    }

    /* Start button inside card */
    .start-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 10px;
      border: 1px solid;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
      width: 100%;
      justify-content: center;
    }
    .start-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .ai-start {
      background: rgba(99,102,241,0.12);
      color: #818cf8;
    }

    /* Profiles */
    .section-title {
      font-size: 1.4rem;
      font-weight: 800;
      text-align: center;
      margin-bottom: 28px;
      letter-spacing: -0.02em;
    }

    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 56px;
    }

    .profile-card {
      position: relative;
      padding: 28px;
      overflow: hidden;
      animation: fadeInUp 0.5s ease-out both;
    }

    .profile-card:hover {
      transform: translateY(-4px);
    }

    .card-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.4s;
    }

    .profile-card:hover .card-glow { opacity: 1; }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      position: relative;
    }

    .card-icon {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .card-count {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 20px;
    }

    .card-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin-bottom: 8px;
      position: relative;
    }

    .card-description {
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.5;
      margin-bottom: 14px;
      position: relative;
    }

    .card-dimensions {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 16px;
      position: relative;
    }

    .dim-tag {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 12px;
      border: 1px solid;
      color: var(--text-secondary);
    }

    .card-footer { position: relative; margin-top: 4px; }

    /* Maturity Levels */
    .levels-section { margin-bottom: 40px; }

    .levels-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .level-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-sm);
    }

    .level-emoji { font-size: 1.3rem; }

    .level-card h4 {
      font-size: 0.85rem;
      font-weight: 700;
      margin-bottom: 2px;
    }

    .level-card p {
      font-size: 0.72rem;
      color: var(--text-muted);
    }

    @media (max-width: 768px) {
      .hero-title { font-size: 1.8rem; }
      .steps-grid { flex-direction: column; }
      .step-arrow { transform: rotate(90deg); }
      .profiles-grid { grid-template-columns: 1fr; }
      .levels-grid { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class LandingComponent implements OnInit {
    profiles: Profile[] = [];
    selectedMode: 'scripted' | 'ai' = 'scripted';

    maturityLevels = [
        { emoji: '🔴', label: 'Découverte', range: '0 – 25%', color: '#ef4444' },
        { emoji: '🟠', label: 'Exploration', range: '26 – 50%', color: '#f97316' },
        { emoji: '🟡', label: 'Adoption', range: '51 – 75%', color: '#eab308' },
        { emoji: '🟢', label: 'Maîtrise', range: '76 – 100%', color: '#22c55e' }
    ];

    constructor(private auditService: AuditService) { }

    ngOnInit() {
        this.auditService.getProfiles().subscribe(profiles => {
            this.profiles = profiles;
        });
    }
}
