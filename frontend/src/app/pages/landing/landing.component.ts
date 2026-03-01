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
        <div class="profiles-grid">
          <a
            *ngFor="let profile of profiles; let i = index"
            [routerLink]="['/audit', profile.id]"
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
              <span class="card-link" [style.color]="profile.color">
                Commencer l'audit
                <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </span>
            </div>
          </a>
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
      cursor: pointer;
      animation: fadeInUp 0.5s ease-out both;
      text-decoration: none;
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

    .card-footer { position: relative; }

    .card-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      transition: var(--transition);
    }

    .profile-card:hover .card-link { gap: 10px; }

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
