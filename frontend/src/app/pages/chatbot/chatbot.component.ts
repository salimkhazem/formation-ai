import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, NgZone, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatbotService, ChatQuestion, StartSessionResponse } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
    from: 'bot' | 'user';
    text: string;
    question?: ChatQuestion;
    answered?: boolean;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
    <div class="chat-page">

      <!-- ── Header ──────────────────────────────────────────────── -->
      <div class="chat-header">
        <a routerLink="/" class="back-btn">←</a>
        <div class="avatar" [style.background]="profileColor">{{ profileIcon }}</div>
        <div class="header-info">
          <span class="header-name">{{ profileName || 'Chargement…' }}</span>
          <span class="header-sub" *ngIf="totalQuestions">{{ answeredCount }}/{{ totalQuestions }} questions · {{ progress }}%</span>
        </div>
        <div class="progress-bar-wrap" *ngIf="totalQuestions">
          <div class="progress-fill" [style.width.%]="progress"></div>
        </div>
      </div>

      <!-- ── Messages ────────────────────────────────────────────── -->
      <div class="messages-area" #msgArea>

        <ng-container *ngFor="let msg of messages">

          <!-- Bot bubble -->
          <div class="row-bot" *ngIf="msg.from === 'bot'">
            <div class="avatar-sm" [style.background]="profileColor">{{ profileIcon }}</div>
            <div class="bubble-bot">
              <p class="bubble-text" [innerHTML]="renderText(msg.text)"></p>

              <!-- Option chips — only visible on the active unanswered question -->
              <div class="chips" *ngIf="msg.question && !msg.answered">
                <button
                  *ngFor="let opt of msg.question.options; let i = index"
                  class="chip"
                  [class.chip-active]="inputText === opt"
                  (click)="selectChip(opt)">
                  <span class="chip-letter">{{ letters[i] }}</span>{{ opt }}
                </button>
              </div>

              <!-- Dimension badge -->
              <span class="badge" *ngIf="msg.question">
                {{ axisIcon(msg.question.dimension) }} {{ axisLabel(msg.question.dimension) }}
              </span>
            </div>
          </div>

          <!-- User bubble -->
          <div class="row-user" *ngIf="msg.from === 'user'">
            <div class="bubble-user">{{ msg.text }}</div>
          </div>

        </ng-container>

        <!-- Typing indicator -->
        <div class="row-bot" *ngIf="typing">
          <div class="avatar-sm" [style.background]="profileColor">{{ profileIcon }}</div>
          <div class="bubble-bot typing-bubble">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>

        <!-- Error -->
        <div class="error-bar" *ngIf="errorMsg">
          ⚠️ {{ errorMsg }}
          <button class="retry-btn" (click)="startChat()">Réessayer</button>
        </div>
      </div>

      <!-- ── Results ──────────────────────────────────────────────── -->
      <div class="results-panel" *ngIf="completed && result">
        <div class="results-header">
          <div class="global-score" [style.border-color]="result.scores.levelColor">
            <span class="score-num">{{ result.scores.overall }}%</span>
            <span class="score-emoji">{{ result.scores.levelEmoji }}</span>
          </div>
          <div>
            <h2>{{ result.scores.levelLabel }}</h2>
            <p class="score-sub">Score moyen sur les 7 axes</p>
          </div>
        </div>

        <div class="axes-grid">
          <div *ngFor="let axis of getAxes(result.scores.axisScores)"
               class="axis-card" [class.no-data]="!axis.hasData">
            <div class="axis-header">
              <span>{{ axis.icon }}</span>
              <span class="axis-name">{{ axis.label }}</span>
              <span class="axis-score" [style.color]="scoreColor(axis.score)">
                {{ axis.hasData ? axis.score + '%' : '—' }}
              </span>
            </div>
            <div class="axis-bar-wrap" *ngIf="axis.hasData">
              <div class="axis-bar" [style.width.%]="axis.score" [style.background]="scoreColor(axis.score)"></div>
            </div>
            <div class="axis-level" *ngIf="axis.hasData">{{ scoreLevel(axis.score) }}</div>
          </div>
        </div>

        <div class="modules-section" *ngIf="result.scores.suggestedModules?.length">
          <h3>📚 Modules recommandés</h3>
          <div class="modules-list">
            <div *ngFor="let item of result.scores.suggestedModules" class="module-card">
              <div class="module-icon">{{ item.axisIcon }}</div>
              <div class="module-info">
                <div class="module-name">{{ item.module.name }}</div>
                <div class="module-meta">
                  <span>⏱ {{ item.module.duration }}</span>
                  <span class="module-level">{{ item.module.level }}</span>
                </div>
                <div class="module-reason">{{ item.axisLabel }} : {{ item.score }}%</div>
              </div>
            </div>
          </div>
        </div>

        <div class="reco-section" *ngIf="result.scores.recommendations?.length">
          <h3>💡 Recommandations</h3>
          <ul class="reco-list">
            <li *ngFor="let r of result.scores.recommendations">{{ r }}</li>
          </ul>
        </div>

        <div class="result-actions">
          <a routerLink="/user/results" class="btn-primary">Voir mes résultats complets</a>
          <a routerLink="/" class="btn-secondary">Retour à l'accueil</a>
        </div>
      </div>

      <!-- ── Input bar (hidden once completed) ───────────────────── -->
      <div class="input-bar" *ngIf="!completed">

        <!-- Recording indicator -->
        <div class="recording-indicator" *ngIf="isRecording">
          <span class="rec-dot"></span> Enregistrement… parlez puis cliquez ⏹ pour valider
        </div>

        <div class="mic-error" *ngIf="micError">
          🎤 {{ micError }}
        </div>

        <div class="input-row">
          <!-- Mic button -->
          <button class="icon-btn mic-btn"
                  [class.recording]="isRecording"
                  (click)="toggleRecording()"
                  [title]="isRecording ? 'Arrêter et transcrire' : 'Parler'">
            <svg *ngIf="!isRecording" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
            <svg *ngIf="isRecording" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          </button>

          <!-- Text input -->
          <input
            #inputRef
            class="text-input"
            type="text"
            [(ngModel)]="inputText"
            [placeholder]="isRecording ? 'Transcription en cours…' : 'Tapez ou parlez votre réponse…'"
            (keydown.enter)="submitAnswer()"
            [disabled]="typing || isRecording" />

          <!-- Send button -->
          <button class="icon-btn send-btn"
                  [disabled]="!inputText.trim() || typing"
                  (click)="submitAnswer()">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        <div class="input-hint" *ngIf="currentQuestion && !isRecording">
          Cliquez une option ci-dessus, tapez votre réponse ou utilisez le micro 🎤
        </div>
      </div>

    </div>
    `,
    styles: [`
      :host { display: block; }

      /* ── Layout ─────────────────────────────────────────────────── */
      .chat-page {
        max-width: 760px;
        margin: 0 auto;
        padding: 0 0 160px;
        display: flex;
        flex-direction: column;
        min-height: calc(100vh - 64px);
      }

      /* ── Header ─────────────────────────────────────────────────── */
      .chat-header {
        position: sticky; top: 64px; z-index: 50;
        background: rgba(15,15,26,0.93);
        backdrop-filter: blur(18px);
        border-bottom: 1px solid rgba(255,255,255,0.07);
        padding: 12px 20px;
        display: flex; align-items: center; gap: 12px;
      }
      .back-btn {
        color: var(--text-secondary); font-size: 1.1rem;
        text-decoration: none; padding: 4px 8px; border-radius: 6px;
      }
      .back-btn:hover { background: rgba(255,255,255,0.08); }
      .avatar {
        width: 38px; height: 38px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 1.1rem; flex-shrink: 0;
      }
      .header-info { flex: 1; }
      .header-name { display: block; font-size: 0.92rem; font-weight: 700; }
      .header-sub { font-size: 0.75rem; color: var(--text-secondary); }
      .progress-bar-wrap {
        width: 90px; height: 5px;
        background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;
      }
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg,#6366f1,#ec4899);
        border-radius: 3px; transition: width 0.5s ease;
      }

      /* ── Messages ───────────────────────────────────────────────── */
      .messages-area {
        flex: 1; padding: 24px 20px;
        display: flex; flex-direction: column; gap: 18px;
      }

      .row-bot { display: flex; gap: 10px; align-items: flex-start; }
      .avatar-sm {
        width: 32px; height: 32px; border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-size: 0.9rem; flex-shrink: 0; margin-top: 2px;
      }
      .bubble-bot {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 4px 18px 18px 18px;
        padding: 16px 20px;
        max-width: calc(100% - 46px);
      }
      .bubble-text {
        font-size: 0.95rem; line-height: 1.65; margin: 0 0 12px; font-weight: 500;
      }

      /* Option chips */
      .chips { display: flex; flex-direction: column; gap: 7px; margin-bottom: 10px; }
      .chip {
        display: flex; align-items: center; gap: 10px;
        padding: 9px 14px;
        border: 1px solid rgba(99,102,241,0.22);
        border-radius: 10px;
        background: rgba(99,102,241,0.04);
        color: var(--text-primary);
        font-size: 0.85rem;
        cursor: pointer; text-align: left;
        transition: all 0.15s;
      }
      .chip:hover { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.1); }
      .chip-active { border-color: #6366f1 !important; background: rgba(99,102,241,0.2) !important; }
      .chip-letter {
        width: 22px; height: 22px; border-radius: 6px;
        background: rgba(99,102,241,0.18); color: #818cf8;
        font-size: 0.72rem; font-weight: 700;
        display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .chip-active .chip-letter { background: #6366f1; color: white; }

      .badge {
        display: inline-block;
        font-size: 0.7rem; color: var(--text-secondary); margin-top: 6px;
      }

      /* User bubble */
      .row-user { display: flex; justify-content: flex-end; }
      .bubble-user {
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: white; padding: 12px 18px;
        border-radius: 18px 4px 18px 18px;
        font-size: 0.9rem; max-width: 72%; line-height: 1.5;
        white-space: pre-wrap; word-break: break-word;
      }

      /* Typing */
      .typing-bubble { padding: 16px 20px; display: flex; gap: 5px; align-items: center; }
      .dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--text-secondary); animation: bounce 1.2s infinite;
      }
      .dot:nth-child(2) { animation-delay: .2s; }
      .dot:nth-child(3) { animation-delay: .4s; }
      @keyframes bounce {
        0%,60%,100% { transform: translateY(0); }
        30% { transform: translateY(-5px); }
      }

      /* Error */
      .error-bar {
        background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
        color: #f87171; padding: 14px 18px; border-radius: 12px;
        font-size: 0.875rem; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
      }
      .retry-btn {
        background: rgba(239,68,68,0.2); border: none; color: #f87171;
        padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
      }

      /* ── Input bar ──────────────────────────────────────────────── */
      .input-bar {
        position: fixed; bottom: 0; left: 0; right: 0;
        background: rgba(13,13,23,0.97);
        backdrop-filter: blur(20px);
        border-top: 1px solid rgba(255,255,255,0.07);
        padding: 12px 20px 20px;
        z-index: 100;
      }

      .recording-indicator {
        display: flex; align-items: center; gap: 8px;
        font-size: 0.8rem; color: #f87171; margin-bottom: 8px;
        padding: 6px 14px;
        background: rgba(239,68,68,0.1); border-radius: 8px;
        max-width: 760px; margin-left: auto; margin-right: auto;
      }
      .rec-dot {
        width: 8px; height: 8px; border-radius: 50%; background: #ef4444;
        animation: blink 1s infinite;
      }
      @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }

      .input-row {
        display: flex; align-items: center; gap: 10px;
        max-width: 760px; margin: 0 auto;
      }

      .text-input {
        flex: 1;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        padding: 13px 18px;
        color: var(--text-primary);
        font-size: 0.95rem;
        outline: none;
        transition: border-color 0.2s;
      }
      .text-input:focus { border-color: rgba(99,102,241,0.6); }
      .text-input::placeholder { color: var(--text-secondary); }
      .text-input:disabled { opacity: 0.5; }

      .icon-btn {
        width: 46px; height: 46px; border-radius: 13px; border: none;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: all 0.2s; flex-shrink: 0;
      }

      .mic-btn {
        background: rgba(99,102,241,0.12);
        border: 1px solid rgba(99,102,241,0.3);
        color: #818cf8;
      }
      .mic-btn:hover { background: rgba(99,102,241,0.22); }
      .mic-btn.recording {
        background: rgba(239,68,68,0.2);
        border-color: #ef4444; color: #f87171;
        animation: pulse-red 1.2s infinite;
      }
      @keyframes pulse-red {
        0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.35); }
        50% { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
      }

      .send-btn {
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: white;
      }
      .send-btn:hover:not(:disabled) { opacity: 0.88; transform: scale(1.04); }
      .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

      .mic-error {
        font-size: 0.78rem; color: #f87171;
        background: rgba(239,68,68,0.1); border-radius: 8px;
        padding: 7px 14px; margin-bottom: 6px;
        max-width: 760px; margin-left: auto; margin-right: auto;
      }

      .input-hint {
        text-align: center; font-size: 0.72rem; color: var(--text-secondary);
        margin-top: 7px; max-width: 760px; margin-left: auto; margin-right: auto;
      }

      /* ── Results ────────────────────────────────────────────────── */
      .results-panel {
        margin: 24px 20px;
        display: flex; flex-direction: column; gap: 20px;
      }
      .results-header {
        display: flex; align-items: center; gap: 20px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 18px; padding: 24px;
      }
      .global-score {
        width: 88px; height: 88px; border-radius: 50%; border: 3px solid;
        display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0;
      }
      .score-num { font-size: 1.6rem; font-weight: 800; line-height: 1; }
      .score-emoji { font-size: 1.1rem; }
      .results-header h2 { margin: 0 0 4px; font-size: 1.25rem; font-weight: 800; }
      .score-sub { color: var(--text-secondary); font-size: 0.85rem; margin: 0; }

      .axes-grid {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(195px,1fr)); gap: 12px;
      }
      .axis-card {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px; padding: 14px 16px;
        display: flex; flex-direction: column; gap: 7px;
      }
      .axis-card.no-data { opacity: 0.35; }
      .axis-header { display: flex; align-items: center; gap: 8px; }
      .axis-name { flex: 1; font-size: 0.83rem; font-weight: 600; }
      .axis-score { font-size: 1rem; font-weight: 800; }
      .axis-bar-wrap { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
      .axis-bar { height: 100%; border-radius: 3px; transition: width 0.9s ease; }
      .axis-level { font-size: 0.73rem; color: var(--text-secondary); }

      .modules-section h3, .reco-section h3 { font-size: 1rem; font-weight: 700; margin: 0 0 12px; }
      .modules-list { display: flex; flex-direction: column; gap: 10px; }
      .module-card {
        display: flex; align-items: flex-start; gap: 14px;
        background: rgba(99,102,241,0.07);
        border: 1px solid rgba(99,102,241,0.2);
        border-radius: 12px; padding: 14px 16px;
      }
      .module-icon { font-size: 1.4rem; flex-shrink: 0; }
      .module-info { display: flex; flex-direction: column; gap: 4px; }
      .module-name { font-size: 0.9rem; font-weight: 700; }
      .module-meta { display: flex; gap: 10px; font-size: 0.78rem; color: var(--text-secondary); }
      .module-level {
        font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
        background: rgba(99,102,241,0.2); color: #818cf8; font-weight: 600;
      }
      .module-reason { font-size: 0.78rem; color: #f97316; }

      .reco-list {
        list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px;
      }
      .reco-list li {
        padding: 10px 14px;
        background: rgba(255,255,255,0.04);
        border-left: 3px solid #6366f1; border-radius: 10px;
        font-size: 0.875rem; color: var(--text-secondary);
      }

      .result-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; padding-bottom: 40px; }
      .btn-primary {
        padding: 12px 28px;
        background: linear-gradient(135deg,#6366f1,#8b5cf6);
        color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 0.9rem;
      }
      .btn-secondary {
        padding: 12px 28px;
        border: 1px solid rgba(255,255,255,0.15);
        color: var(--text-secondary); border-radius: 12px; text-decoration: none; font-size: 0.9rem;
      }
    `]
})
export class ChatbotComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('msgArea') private msgArea!: ElementRef;
    @ViewChild('inputRef') private inputRef!: ElementRef;

    profileId = '';
    profileName = '';
    profileIcon = '🤖';
    profileColor = '#6366f1';

    sessionId = '';
    messages: ChatMessage[] = [];
    currentQuestion: ChatQuestion | null = null;
    inputText = '';
    answeredCount = 0;
    totalQuestions = 0;
    progress = 0;
    typing = false;
    completed = false;
    result: any = null;
    errorMsg = '';
    private shouldScroll = false;

    isRecording = false;
    micError = '';
    private mediaRecorder: MediaRecorder | null = null;
    private audioChunks: Blob[] = [];

    readonly letters = ['A', 'B', 'C', 'D', 'E'];

    private readonly axesMeta: Record<string, { label: string; icon: string }> = {
        utilisation:    { label: 'Utilisation',       icon: '🛠️' },
        prompting:      { label: 'Prompting',          icon: '✍️' },
        ethique:        { label: 'Éthique & Sécurité', icon: '⚖️' },
        formation:      { label: 'Formation',          icon: '🎓' },
        automatisation: { label: 'Automatisation',     icon: '⚙️' },
        gouvernance:    { label: 'Gouvernance',        icon: '🏛️' },
        impact:         { label: 'Impact & ROI',       icon: '📈' }
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private chatbotService: ChatbotService,
        private zone: NgZone,
        private sanitizer: DomSanitizer,
        public auth: AuthService
    ) {}

    ngOnInit(): void {
        this.profileId = this.route.snapshot.params['profileId'];
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: `/chat/${this.profileId}` } });
            return;
        }
        this.startChat();
    }

    ngOnDestroy(): void {
        if (this.isRecording) this.stopRecording();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
    }

    // ── Speech ───────────────────────────────────────────────────────

    toggleRecording(): void {
        this.micError = '';
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    private startRecording(): void {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.audioChunks = [];
                const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                    ? 'audio/webm;codecs=opus'
                    : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';

                this.mediaRecorder = new MediaRecorder(stream, { mimeType });
                this.mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) this.audioChunks.push(e.data);
                };
                this.mediaRecorder.onstop = () => {
                    stream.getTracks().forEach(t => t.stop());
                    this.sendAudioForTranscription();
                };

                this.mediaRecorder.start();
                this.zone.run(() => {
                    this.isRecording = true;
                    this.inputText = '';
                });
            })
            .catch(() => {
                this.zone.run(() => {
                    this.micError = 'Microphone refusé — cliquez sur 🔒 dans la barre d\'adresse et autorisez le micro.';
                });
            });
    }

    private stopRecording(): void {
        this.isRecording = false;
        this.mediaRecorder?.stop();
    }

    private sendAudioForTranscription(): void {
        if (!this.audioChunks.length) return;

        const blob = new Blob(this.audioChunks, { type: this.mediaRecorder?.mimeType || 'audio/webm' });
        const ext = (this.mediaRecorder?.mimeType || '').includes('ogg') ? 'ogg' : 'webm';
        const formData = new FormData();
        formData.append('audio', blob, `recording.${ext}`);

        const token = localStorage.getItem('auth_token');
        this.zone.run(() => { this.inputText = '⏳ Transcription…'; });

        fetch('http://localhost:3000/api/transcribe', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        })
        .then(r => r.json())
        .then(data => {
            this.zone.run(() => {
                if (data.error) {
                    this.micError = `Transcription échouée : ${data.error}`;
                    this.inputText = '';
                } else {
                    this.inputText = data.text || '';
                    if (this.inputText && this.currentQuestion) {
                        setTimeout(() => this.submitAnswer(), 400);
                    }
                }
            });
        })
        .catch(() => {
            this.zone.run(() => {
                this.micError = 'Erreur de transcription. Vérifiez que le backend est démarré.';
                this.inputText = '';
            });
        });
    }

    // ── Chat flow ────────────────────────────────────────────────────

    private showWelcome(resp: StartSessionResponse): void {
        const userName = this.auth.currentUser?.name?.split(' ')[0] || 'vous';
        const welcomeSteps: Array<{ text: string; delay: number }> = [
            {
                delay: 400,
                text: `Bonjour ${userName} 👋 Je suis votre assistant d'évaluation de maturité IA pour le profil **${resp.profile.name}**.`
            },
            {
                delay: 900,
                text: `🎯 **Objectif** : Évaluer votre niveau d'usage de l'IA sur 7 dimensions — utilisation, prompting, éthique, formation, automatisation, gouvernance et impact — pour vous proposer un plan de progression personnalisé.`
            },
            {
                delay: 900,
                text: `📋 **${resp.totalQuestions} questions** vous seront posées une par une. Pour chaque question :\n• Cliquez directement sur une option (A, B, C…)\n• Ou tapez votre réponse librement dans le champ texte\n• Ou utilisez le 🎤 micro pour répondre à la voix`
            },
            {
                delay: 800,
                text: `✅ À la fin, vous recevrez un **score détaillé par axe** avec des recommandations de formation adaptées à votre profil. Prenez le temps de répondre honnêtement — il n'y a pas de mauvaise réponse !`
            },
            {
                delay: 700,
                text: `C'est parti ! Voici votre première question 👇`
            }
        ];

        let cumulative = 0;
        for (const step of welcomeSteps) {
            cumulative += step.delay;
            const text = step.text;
            setTimeout(() => {
                this.typing = true;
                this.shouldScroll = true;
                setTimeout(() => {
                    this.typing = false;
                    this.messages.push({ from: 'bot', text });
                    this.shouldScroll = true;
                }, 600);
            }, cumulative);
            cumulative += 600;
        }

        // Afficher la première question après tous les messages d'accueil
        setTimeout(() => {
            this.showTyping(600, () => this.pushBotQuestion(resp.question));
        }, cumulative + 300);
    }

    startChat(): void {
        this.messages = [];
        this.errorMsg = '';
        this.completed = false;
        this.inputText = '';
        this.answeredCount = 0;
        this.result = null;
        this.currentQuestion = null;

        this.chatbotService.startSession(this.profileId).subscribe({
            next: (resp: StartSessionResponse) => {
                this.sessionId = resp.sessionId;
                this.profileName = resp.profile.name;
                this.profileIcon = resp.profile.icon;
                this.profileColor = resp.profile.color;
                this.totalQuestions = resp.totalQuestions;
                this.showWelcome(resp);
            },
            error: (err) => {
                this.errorMsg = err.error?.error || 'Impossible de démarrer la session.';
            }
        });
    }

    selectChip(opt: string): void {
        this.inputText = opt;
        this.focusInput();
    }

    submitAnswer(): void {
        const raw = this.inputText.trim();
        if (!raw || !this.currentQuestion || this.typing) return;

        const matched = this.matchOption(raw, this.currentQuestion.options);
        const displayText = raw;

        // Mark last bot question as answered
        const lastBot = [...this.messages].reverse().find(m => m.from === 'bot' && m.question);
        if (lastBot) lastBot.answered = true;

        this.messages.push({ from: 'user', text: displayText });
        this.inputText = '';
        this.answeredCount++;
        this.shouldScroll = true;

        this.chatbotService.submitAnswer(this.sessionId, matched).subscribe({
            next: (resp) => {
                if (resp.completed) {
                    this.finalize();
                } else if (resp.question) {
                    this.progress = resp.progress || this.progress;
                    this.showTyping(700, () => this.pushBotQuestion(resp.question!));
                }
            },
            error: (err) => {
                this.errorMsg = err.error?.error || 'Erreur lors de la soumission.';
            }
        });
    }

    private matchOption(input: string, options: string[]): string {
        const low = input.toLowerCase();
        // Exact match
        const exact = options.find(o => o.toLowerCase() === low);
        if (exact) return exact;
        // Partial match — option contained in input or vice versa
        const partial = options.find(o =>
            low.includes(o.toLowerCase().slice(0, 14)) ||
            o.toLowerCase().includes(low.slice(0, 14))
        );
        if (partial) return partial;
        // Word overlap score
        const inputWords = new Set(low.split(/\s+/).filter(w => w.length > 3));
        let best = options[0], bestScore = -1;
        for (const opt of options) {
            const score = opt.toLowerCase().split(/\s+/).filter(w => inputWords.has(w)).length;
            if (score > bestScore) { bestScore = score; best = opt; }
        }
        return best;
    }

    private finalize(): void {
        this.showTyping(800, () => {
            this.messages.push({ from: 'bot', text: '✅ Évaluation terminée ! Calcul de vos résultats…' });
            this.shouldScroll = true;
            setTimeout(() => {
                this.chatbotService.completeSession(this.sessionId).subscribe({
                    next: (res) => {
                        this.result = res;
                        this.completed = true;
                        this.progress = 100;
                        this.shouldScroll = true;
                    },
                    error: (err) => {
                        this.errorMsg = err.error?.error || 'Erreur lors de la finalisation.';
                    }
                });
            }, 800);
        });
    }

    private pushBotQuestion(question: ChatQuestion): void {
        this.currentQuestion = question;
        this.progress = question.progress;
        this.messages.push({ from: 'bot', text: question.text, question, answered: false });
        this.shouldScroll = true;
        this.focusInput();
    }

    private showTyping(ms: number, cb: () => void): void {
        this.typing = true;
        this.shouldScroll = true;
        setTimeout(() => { this.typing = false; cb(); }, ms);
    }

    private scrollToBottom(): void {
        if (this.msgArea) {
            const el = this.msgArea.nativeElement;
            el.scrollTop = el.scrollHeight;
        }
    }

    private focusInput(): void {
        setTimeout(() => this.inputRef?.nativeElement?.focus(), 100);
    }

    // ── Template helpers ─────────────────────────────────────────────

    renderText(text: string): SafeHtml {
        const html = text
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n•/g, '<br>&nbsp;•')
            .replace(/\n/g, '<br>');
        return this.sanitizer.bypassSecurityTrustHtml(html);
    }

    axisLabel(axis: string): string { return this.axesMeta[axis]?.label || axis; }
    axisIcon(axis: string): string { return this.axesMeta[axis]?.icon || ''; }
    getAxes(axisScores: any): any[] { return axisScores ? Object.values(axisScores) : []; }

    scoreLevel(score: number | null): string {
        if (score === null) return '—';
        if (score <= 25) return 'Découverte';
        if (score <= 50) return 'Exploration';
        if (score <= 75) return 'Adoption';
        return 'Maîtrise';
    }

    scoreColor(score: number | null): string {
        if (score === null) return '#64748b';
        if (score <= 25) return '#ef4444';
        if (score <= 50) return '#f97316';
        if (score <= 75) return '#eab308';
        return '#22c55e';
    }
}
