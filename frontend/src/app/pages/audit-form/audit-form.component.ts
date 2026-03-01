import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuditService } from '../../services/audit.service';
import { Profile, Question, QuestionsResponse } from '../../models/models';

@Component({
    selector: 'app-audit-form',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="container" *ngIf="profile">
      <!-- Progress Bar -->
      <div class="progress-bar-container animate-fadeIn">
        <div class="progress-bar">
          <div class="progress-fill" [style.width]="progressPercent + '%'" [style.background]="'linear-gradient(90deg, ' + profile.color + ', ' + profile.color + 'cc)'"></div>
        </div>
        <div class="progress-info">
          <span>{{ currentStepLabel }}</span>
          <span>{{ answeredCount }}/{{ totalQuestions }} questions</span>
        </div>
      </div>

      <!-- Step 0: Info -->
      <div *ngIf="step === 0" class="step-panel glass-card animate-fadeInUp">
        <div class="step-header">
          <span class="profile-icon" [style.background]="profile.color + '20'" [style.color]="profile.color">{{ profile.icon }}</span>
          <div>
            <h1 class="step-title">Audit · {{ profile.name }}</h1>
            <p class="step-subtitle">{{ profile.description }}</p>
          </div>
        </div>

        <div class="info-form">
          <div class="form-group">
            <label for="name">Votre nom (optionnel)</label>
            <input id="name" class="form-control" [(ngModel)]="respondentName" placeholder="Jean Dupont" />
          </div>
          <div class="form-group">
            <label for="email">Votre email (optionnel)</label>
            <input id="email" class="form-control" [(ngModel)]="respondentEmail" placeholder="jean.dupont&#64;entreprise.com" />
          </div>
        </div>

        <div class="step-actions">
          <a routerLink="/" class="btn btn-secondary">← Retour</a>
          <button class="btn btn-primary" (click)="nextStep()">
            Commencer l'audit →
          </button>
        </div>
      </div>

      <!-- Step 1: General Questions -->
      <div *ngIf="step === 1" class="step-panel animate-fadeInUp">
        <div class="step-header-bar">
          <h2 class="step-section-title">📋 Questions générales</h2>
          <span class="step-badge">Partie 1/2</span>
        </div>

        <div *ngFor="let q of generalQuestions; let i = index" class="question-card glass-card" [style.animation-delay]="(i * 0.04) + 's'">
          <div class="q-number" [style.background]="profile.color + '15'" [style.color]="profile.color">{{ i + 1 }}</div>
          <div class="q-body">
            <p class="q-text">{{ q.text }}</p>

            <!-- Single choice -->
            <div *ngIf="q.type === 'single'" class="q-options">
              <label *ngFor="let opt of q.options; let j = index" class="radio-option" [class.selected]="answers[q.id] === opt">
                <input type="radio" [name]="q.id" [value]="opt" [(ngModel)]="answers[q.id]" />
                <span class="radio-dot" [style.--accent]="profile.color"></span>
                <span>{{ opt }}</span>
              </label>
            </div>

            <!-- Multiple choice -->
            <div *ngIf="q.type === 'multiple'" class="q-options">
              <label *ngFor="let opt of q.options" class="checkbox-option" [class.selected]="isChecked(q.id, opt)">
                <input type="checkbox" [checked]="isChecked(q.id, opt)" (change)="toggleMultiple(q.id, opt)" />
                <span class="check-box" [style.--accent]="profile.color"></span>
                <span>{{ opt }}</span>
              </label>
            </div>

            <!-- Scale -->
            <div *ngIf="q.type === 'scale'" class="q-scale">
              <div class="scale-row">
                <button *ngFor="let n of scaleNumbers"
                  class="scale-btn"
                  [class.active]="answers[q.id] === n"
                  [style.--accent]="profile.color"
                  (click)="answers[q.id] = n">
                  {{ n }}
                </button>
              </div>
              <div class="scale-labels">
                <span>Débutant</span>
                <span>Expert</span>
              </div>
            </div>

            <!-- Boolean -->
            <div *ngIf="q.type === 'boolean'" class="q-boolean">
              <button class="bool-btn" [class.active]="answers[q.id] === 'oui'" [style.--accent]="profile.color" (click)="answers[q.id] = 'oui'">✅ Oui</button>
              <button class="bool-btn" [class.active]="answers[q.id] === 'non'" [style.--accent]="profile.color" (click)="answers[q.id] = 'non'">❌ Non</button>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-secondary" (click)="prevStep()">← Retour</button>
          <button class="btn btn-primary" (click)="nextStep()">
            Questions spécifiques →
          </button>
        </div>
      </div>

      <!-- Step 2: Profile-specific Questions -->
      <div *ngIf="step === 2" class="step-panel animate-fadeInUp">
        <div class="step-header-bar">
          <h2 class="step-section-title">{{ profile.icon }} Questions · {{ profile.name }}</h2>
          <span class="step-badge">Partie 2/2</span>
        </div>

        <div *ngFor="let q of specificQuestions; let i = index" class="question-card glass-card" [style.animation-delay]="(i * 0.04) + 's'">
          <div class="q-number" [style.background]="profile.color + '15'" [style.color]="profile.color">{{ generalQuestions.length + i + 1 }}</div>
          <div class="q-body">
            <p class="q-text">{{ q.text }}</p>
            <span class="q-dimension" [style.background]="profile.color + '12'" [style.color]="profile.color">{{ q.dimension }}</span>

            <!-- Single choice -->
            <div *ngIf="q.type === 'single'" class="q-options">
              <label *ngFor="let opt of q.options; let j = index" class="radio-option" [class.selected]="answers[q.id] === opt">
                <input type="radio" [name]="q.id" [value]="opt" [(ngModel)]="answers[q.id]" />
                <span class="radio-dot" [style.--accent]="profile.color"></span>
                <span>{{ opt }}</span>
              </label>
            </div>

            <!-- Scale -->
            <div *ngIf="q.type === 'scale'" class="q-scale">
              <div class="scale-row">
                <button *ngFor="let n of scaleNumbers"
                  class="scale-btn"
                  [class.active]="answers[q.id] === n"
                  [style.--accent]="profile.color"
                  (click)="answers[q.id] = n">
                  {{ n }}
                </button>
              </div>
              <div class="scale-labels">
                <span>Débutant</span>
                <span>Expert</span>
              </div>
            </div>

            <!-- Boolean -->
            <div *ngIf="q.type === 'boolean'" class="q-boolean">
              <button class="bool-btn" [class.active]="answers[q.id] === 'oui'" [style.--accent]="profile.color" (click)="answers[q.id] = 'oui'">✅ Oui</button>
              <button class="bool-btn" [class.active]="answers[q.id] === 'non'" [style.--accent]="profile.color" (click)="answers[q.id] = 'non'">❌ Non</button>
            </div>
          </div>
        </div>

        <div class="step-actions">
          <button class="btn btn-secondary" (click)="prevStep()">← Retour</button>
          <button class="btn btn-primary btn-submit" (click)="submitAudit()" [disabled]="submitting">
            {{ submitting ? '⏳ Calcul en cours...' : '🚀 Voir mes résultats' }}
          </button>
        </div>
      </div>
    </div>
  `,
    styles: [`
    /* Progress Bar */
    .progress-bar-container {
      margin-bottom: 28px;
    }

    .progress-bar {
      height: 6px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      color: var(--text-muted);
    }

    /* Step Panel */
    .step-panel { max-width: 800px; margin: 0 auto; }

    .step-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 32px;
      border-bottom: 1px solid var(--border-glass);
    }

    .profile-icon {
      width: 56px;
      height: 56px;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      flex-shrink: 0;
    }

    .step-title {
      font-size: 1.4rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }

    .step-subtitle {
      color: var(--text-secondary);
      font-size: 0.9rem;
      margin-top: 4px;
    }

    .info-form { padding: 28px 32px; }

    .step-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .step-section-title {
      font-size: 1.15rem;
      font-weight: 700;
    }

    .step-badge {
      font-size: 0.72rem;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      background: rgba(99, 102, 241, 0.12);
      color: #818cf8;
    }

    /* Question Card */
    .question-card {
      display: flex;
      gap: 16px;
      padding: 24px;
      margin-bottom: 12px;
      animation: fadeInUp 0.3s ease-out both;
    }

    .q-number {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .q-body { flex: 1; }

    .q-text {
      font-size: 0.95rem;
      font-weight: 600;
      margin-bottom: 14px;
      line-height: 1.5;
    }

    .q-dimension {
      display: inline-block;
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 10px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Radio / Checkbox Options */
    .q-options {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .radio-option, .checkbox-option {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 10px;
      font-size: 0.88rem;
      cursor: pointer;
      transition: var(--transition);
      border: 1px solid transparent;
    }

    .radio-option:hover, .checkbox-option:hover {
      background: rgba(255, 255, 255, 0.04);
    }

    .radio-option.selected, .checkbox-option.selected {
      background: rgba(99, 102, 241, 0.08);
      border-color: rgba(99, 102, 241, 0.2);
    }

    .radio-option input, .checkbox-option input {
      display: none;
    }

    .radio-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      transition: var(--transition);
      position: relative;
    }

    .radio-option.selected .radio-dot {
      border-color: var(--accent, #6366f1);
    }

    .radio-option.selected .radio-dot::after {
      content: '';
      position: absolute;
      inset: 3px;
      border-radius: 50%;
      background: var(--accent, #6366f1);
    }

    .check-box {
      width: 18px;
      height: 18px;
      border-radius: 4px;
      border: 2px solid rgba(255, 255, 255, 0.2);
      flex-shrink: 0;
      transition: var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
    }

    .checkbox-option.selected .check-box {
      border-color: var(--accent, #6366f1);
      background: var(--accent, #6366f1);
    }

    .checkbox-option.selected .check-box::after {
      content: '✓';
      color: white;
      font-weight: 800;
    }

    /* Scale */
    .q-scale { margin-top: 4px; }

    .scale-row {
      display: flex;
      gap: 6px;
    }

    .scale-btn {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition);
    }

    .scale-btn:hover {
      background: rgba(99, 102, 241, 0.12);
      border-color: rgba(99, 102, 241, 0.3);
      color: var(--text-primary);
    }

    .scale-btn.active {
      background: var(--accent, #6366f1);
      border-color: var(--accent, #6366f1);
      color: white;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }

    .scale-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: var(--text-muted);
      margin-top: 6px;
      padding: 0 4px;
    }

    /* Boolean */
    .q-boolean {
      display: flex;
      gap: 12px;
    }

    .bool-btn {
      flex: 1;
      padding: 14px;
      border-radius: 10px;
      background: var(--bg-glass);
      border: 1px solid var(--border-glass);
      font-family: 'Inter', sans-serif;
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      transition: var(--transition);
    }

    .bool-btn:hover {
      background: rgba(99, 102, 241, 0.08);
    }

    .bool-btn.active {
      background: rgba(99, 102, 241, 0.12);
      border-color: rgba(99, 102, 241, 0.3);
      color: var(--text-primary);
    }

    /* Actions */
    .step-actions {
      display: flex;
      justify-content: space-between;
      padding: 24px 0;
      margin-top: 12px;
    }

    .btn-submit {
      padding: 14px 32px;
      font-size: 1rem;
    }

    @media (max-width: 640px) {
      .step-header { flex-direction: column; padding: 20px; }
      .info-form { padding: 20px; }
      .question-card { flex-direction: column; gap: 8px; }
      .scale-btn { width: 32px; height: 32px; font-size: 0.75rem; }
    }
  `]
})
export class AuditFormComponent implements OnInit {
    profile: Profile | null = null;
    generalQuestions: Question[] = [];
    specificQuestions: Question[] = [];
    answers: Record<string, any> = {};
    step = 0;
    respondentName = '';
    respondentEmail = '';
    submitting = false;
    scaleNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private auditService: AuditService
    ) { }

    ngOnInit() {
        const profileId = this.route.snapshot.paramMap.get('profileId')!;
        this.auditService.getProfile(profileId).subscribe(p => this.profile = p);
        this.auditService.getQuestions(profileId).subscribe(q => {
            this.generalQuestions = q.general;
            this.specificQuestions = q.specific;
        });
    }

    get totalQuestions(): number {
        return this.generalQuestions.length + this.specificQuestions.length;
    }

    get answeredCount(): number {
        return Object.keys(this.answers).filter(k => {
            const v = this.answers[k];
            return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
        }).length;
    }

    get progressPercent(): number {
        if (this.step === 0) return 0;
        return Math.round((this.answeredCount / this.totalQuestions) * 100);
    }

    get currentStepLabel(): string {
        if (this.step === 0) return 'Informations';
        if (this.step === 1) return 'Questions générales';
        return `Questions ${this.profile?.name || ''}`;
    }

    nextStep() {
        this.step++;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    prevStep() {
        this.step--;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    isChecked(questionId: string, option: string): boolean {
        const arr = this.answers[questionId] as string[] | undefined;
        return Array.isArray(arr) && arr.includes(option);
    }

    toggleMultiple(questionId: string, option: string) {
        if (!Array.isArray(this.answers[questionId])) {
            this.answers[questionId] = [];
        }
        const arr = this.answers[questionId] as string[];
        const idx = arr.indexOf(option);
        if (idx >= 0) arr.splice(idx, 1);
        else arr.push(option);
    }

    submitAudit() {
        if (!this.profile || this.submitting) return;
        this.submitting = true;

        this.auditService.submitAudit({
            profileId: this.profile.id,
            respondentName: this.respondentName,
            respondentEmail: this.respondentEmail,
            answers: this.answers
        }).subscribe({
            next: (audit) => {
                this.router.navigate(['/results', audit.id]);
            },
            error: () => {
                this.submitting = false;
                alert('Erreur lors de la soumission. Veuillez réessayer.');
            }
        });
    }
}
