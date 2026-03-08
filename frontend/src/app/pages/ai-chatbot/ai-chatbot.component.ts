import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AiChatService, AiChatProfile } from '../../services/ai-chat.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
    from: 'bot' | 'user';
    text: string;
    time: Date;
}

@Component({
    selector: 'app-ai-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="chat-page">

            <!-- ── Header ─────────────────────────────────────── -->
            <div class="chat-header">
                <a routerLink="/" class="back-btn">←</a>
                <div class="ai-badge">🤖</div>
                <div class="header-info">
                    <span class="profile-name">
                        {{ profile?.icon }} {{ profile?.name || 'Chatbot IA' }}
                        <span class="ai-tag">Azure OpenAI</span>
                    </span>
                    <span class="status-dot-wrap">
                        <span class="status-dot" [class.typing]="typing"></span>
                        {{ typing ? 'En train de répondre…' : 'En ligne' }}
                    </span>
                </div>
            </div>

            <!-- ── Messages area ──────────────────────────────── -->
            <div class="messages-area" #msgArea>

                <!-- Loading overlay -->
                <div class="loading-overlay" *ngIf="loading && messages.length === 0">
                    <div class="loading-spinner"></div>
                    <p>Connexion à Azure OpenAI…</p>
                </div>

                <ng-container *ngFor="let msg of messages">

                    <!-- Bot bubble -->
                    <div class="bot-row" *ngIf="msg.from === 'bot'">
                        <div class="bot-avatar" [style.background]="profile?.color || '#6366f1'">
                            {{ profile?.icon || '🤖' }}
                        </div>
                        <div class="bot-bubble">
                            <p class="msg-text" [innerHTML]="formatText(msg.text)"></p>
                            <span class="msg-time">{{ msg.time | date:'HH:mm' }}</span>
                        </div>
                    </div>

                    <!-- User bubble -->
                    <div class="user-row" *ngIf="msg.from === 'user'">
                        <div class="user-bubble">
                            <p class="msg-text">{{ msg.text }}</p>
                            <span class="msg-time">{{ msg.time | date:'HH:mm' }}</span>
                        </div>
                    </div>

                </ng-container>

                <!-- Typing indicator -->
                <div class="bot-row" *ngIf="typing">
                    <div class="bot-avatar" [style.background]="profile?.color || '#6366f1'">
                        {{ profile?.icon || '🤖' }}
                    </div>
                    <div class="typing-bubble">
                        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                    </div>
                </div>

                <!-- Error -->
                <div class="error-msg" *ngIf="errorMsg">
                    ⚠️ {{ errorMsg }}
                    <button class="retry-btn" (click)="init()">Réessayer</button>
                </div>

            </div>

            <!-- ── Results panel ──────────────────────────────── -->
            <div class="results-panel" *ngIf="completed && scores">
                <div class="results-header">
                    <div class="global-score" [style.border-color]="scores.levelColor">
                        <span class="score-num">{{ scores.overall }}%</span>
                        <span class="score-emoji">{{ scores.levelEmoji }}</span>
                    </div>
                    <div>
                        <h2>{{ scores.levelLabel }}</h2>
                        <p class="score-sub">Score IA moyen — 7 axes évalués</p>
                    </div>
                </div>

                <!-- 7 Axes -->
                <div class="axes-grid">
                    <div *ngFor="let axis of getAxes(scores.axisScores)" class="axis-card">
                        <div class="axis-header">
                            <span class="axis-icon">{{ axis.icon }}</span>
                            <span class="axis-name">{{ axis.label }}</span>
                            <span class="axis-score" [style.color]="toColor(axis.score)">{{ axis.score }}%</span>
                        </div>
                        <div class="axis-bar-wrap">
                            <div class="axis-bar"
                                 [style.width.%]="axis.score"
                                 [style.background]="toColor(axis.score)">
                            </div>
                        </div>
                        <div class="axis-level">{{ toLevel(axis.score) }}</div>
                    </div>
                </div>

                <!-- Modules recommandés -->
                <div class="modules-section" *ngIf="scores.suggestedModules?.length">
                    <h3>📚 Modules recommandés</h3>
                    <div class="modules-list">
                        <div *ngFor="let item of scores.suggestedModules" class="module-card">
                            <div class="module-icon">{{ item.axisIcon }}</div>
                            <div class="module-info">
                                <div class="module-name">{{ item.module.name }}</div>
                                <div class="module-meta">
                                    <span class="module-duration">⏱ {{ item.module.duration }}</span>
                                    <span class="module-level">{{ item.module.level }}</span>
                                </div>
                                <div class="module-reason">
                                    {{ item.axisLabel }} : {{ item.score }}% — prioritaire
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="result-actions">
                    <a routerLink="/user/results" class="btn btn-primary">Voir mes résultats</a>
                    <a routerLink="/" class="btn btn-secondary">Retour à l'accueil</a>
                </div>
            </div>

            <!-- ── Input bar ───────────────────────────────────── -->
            <div class="input-bar" *ngIf="!completed && sessionId">
                <textarea
                    #textInput
                    class="chat-input"
                    [(ngModel)]="userInput"
                    [disabled]="typing || loading"
                    placeholder="Répondez à la question…"
                    rows="1"
                    (keydown.enter)="onEnter($event)"
                    (input)="autoResize($event)">
                </textarea>
                <button
                    class="send-btn"
                    [disabled]="!userInput.trim() || typing || loading"
                    (click)="send()">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
                    </svg>
                </button>
            </div>

        </div>
    `,
    styles: [`
        /* ── Layout ─────────────────────────────────────────────── */
        .chat-page {
            max-width: 720px;
            margin: 0 auto;
            padding: 0 16px 100px;
            display: flex;
            flex-direction: column;
            min-height: calc(100vh - 64px);
        }

        /* ── Header ─────────────────────────────────────────────── */
        .chat-header {
            position: sticky;
            top: 64px;
            z-index: 50;
            background: rgba(15,15,26,0.92);
            backdrop-filter: blur(16px);
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding: 12px 0;
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 0 -16px;
            padding-left: 16px;
            padding-right: 16px;
        }
        .back-btn {
            color: var(--text-secondary);
            font-size: 1.1rem;
            text-decoration: none;
            padding: 4px 8px;
            border-radius: 6px;
            flex-shrink: 0;
        }
        .back-btn:hover { background: rgba(255,255,255,0.08); }
        .ai-badge {
            width: 36px; height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #6366f1, #ec4899);
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .header-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
        .profile-name { font-size: 0.9rem; font-weight: 700; display: flex; align-items: center; gap: 8px; }
        .ai-tag {
            font-size: 0.68rem; padding: 2px 8px; border-radius: 10px;
            background: rgba(99,102,241,0.2); color: #818cf8; font-weight: 600;
        }
        .status-dot-wrap {
            font-size: 0.75rem; color: var(--text-secondary);
            display: flex; align-items: center; gap: 5px;
        }
        .status-dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: #22c55e; flex-shrink: 0;
        }
        .status-dot.typing {
            background: #f59e0b;
            animation: pulse 1s infinite;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* ── Messages ─────────────────────────────────────────────── */
        .messages-area {
            flex: 1;
            padding-top: 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            min-height: 200px;
        }

        .loading-overlay {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 16px; padding: 60px 0; color: var(--text-secondary); font-size: 0.9rem;
        }
        .loading-spinner {
            width: 32px; height: 32px; border-radius: 50%;
            border: 3px solid rgba(99,102,241,0.3);
            border-top-color: #6366f1;
            animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .bot-row { display: flex; gap: 10px; align-items: flex-start; }
        .bot-avatar {
            width: 34px; height: 34px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1rem; flex-shrink: 0; margin-top: 2px;
        }
        .bot-bubble {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 4px 16px 16px 16px;
            padding: 14px 16px;
            max-width: calc(100% - 48px);
            display: flex; flex-direction: column; gap: 6px;
        }

        .user-row { display: flex; justify-content: flex-end; }
        .user-bubble {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 12px 16px;
            border-radius: 16px 4px 16px 16px;
            max-width: 78%;
            display: flex; flex-direction: column; gap: 4px;
        }

        .msg-text {
            font-size: 0.9rem;
            line-height: 1.6;
            margin: 0;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .msg-time { font-size: 0.68rem; color: rgba(255,255,255,0.35); align-self: flex-end; }
        .bot-bubble .msg-time { color: var(--text-secondary); }

        /* Typing */
        .typing-bubble {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 4px 16px 16px 16px;
            padding: 14px 18px;
            display: flex; gap: 4px; align-items: center;
        }
        .dot {
            width: 7px; height: 7px; border-radius: 50%;
            background: var(--text-secondary);
            animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-5px); }
        }

        /* Error */
        .error-msg {
            background: rgba(239,68,68,0.1);
            border: 1px solid rgba(239,68,68,0.3);
            color: #f87171;
            padding: 16px;
            border-radius: 12px;
            font-size: 0.875rem;
            display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
        }
        .retry-btn {
            background: rgba(239,68,68,0.2); border: none; color: #f87171;
            padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 0.85rem;
        }

        /* ── Input bar ─────────────────────────────────────────── */
        .input-bar {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            padding: 12px 16px;
            background: rgba(15,15,26,0.96);
            backdrop-filter: blur(16px);
            border-top: 1px solid rgba(255,255,255,0.07);
            display: flex;
            gap: 10px;
            align-items: flex-end;
            z-index: 100;
            max-width: 720px;
            margin: 0 auto;
        }
        .chat-input {
            flex: 1;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 14px;
            color: var(--text-primary);
            font-size: 0.9rem;
            line-height: 1.5;
            padding: 12px 16px;
            resize: none;
            min-height: 46px;
            max-height: 140px;
            overflow-y: auto;
            transition: border-color 0.2s;
        }
        .chat-input:focus {
            outline: none;
            border-color: rgba(99,102,241,0.5);
        }
        .chat-input:disabled { opacity: 0.5; }
        .send-btn {
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            border: none; color: white;
            display: flex; align-items: center; justify-content: center;
            cursor: pointer; flex-shrink: 0;
            transition: opacity 0.2s, transform 0.1s;
        }
        .send-btn:hover:not(:disabled) { opacity: 0.9; transform: scale(1.05); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── Results ────────────────────────────────────────────── */
        .results-panel {
            margin-top: 28px;
            display: flex;
            flex-direction: column;
            gap: 24px;
            padding-bottom: 40px;
        }
        .results-header {
            display: flex; align-items: center; gap: 20px;
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            padding: 24px;
        }
        .global-score {
            width: 90px; height: 90px; border-radius: 50%; border: 3px solid;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .score-num { font-size: 1.6rem; font-weight: 800; line-height: 1; }
        .score-emoji { font-size: 1.2rem; }
        .results-header h2 { margin: 0 0 4px; font-size: 1.3rem; font-weight: 800; }
        .score-sub { color: var(--text-secondary); font-size: 0.875rem; margin: 0; }

        .axes-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
        }
        .axis-card {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 12px;
            padding: 14px 16px;
            display: flex; flex-direction: column; gap: 8px;
        }
        .axis-header { display: flex; align-items: center; gap: 8px; }
        .axis-icon { font-size: 1.1rem; }
        .axis-name { flex: 1; font-size: 0.85rem; font-weight: 600; }
        .axis-score { font-size: 1rem; font-weight: 800; }
        .axis-bar-wrap { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .axis-bar { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        .axis-level { font-size: 0.75rem; color: var(--text-secondary); }

        .modules-section h3 { font-size: 1rem; font-weight: 700; margin: 0 0 12px; }
        .modules-list { display: flex; flex-direction: column; gap: 10px; }
        .module-card {
            display: flex; align-items: flex-start; gap: 14px;
            background: rgba(99,102,241,0.07);
            border: 1px solid rgba(99,102,241,0.2);
            border-radius: 12px;
            padding: 14px 16px;
        }
        .module-icon { font-size: 1.5rem; flex-shrink: 0; }
        .module-info { display: flex; flex-direction: column; gap: 4px; }
        .module-name { font-size: 0.9rem; font-weight: 700; }
        .module-meta { display: flex; gap: 10px; }
        .module-duration { font-size: 0.78rem; color: var(--text-secondary); }
        .module-level {
            font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;
            background: rgba(99,102,241,0.2); color: #818cf8; font-weight: 600;
        }
        .module-reason { font-size: 0.78rem; color: #f97316; margin-top: 2px; }

        .result-actions {
            display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
        }
    `]
})
export class AiChatbotComponent implements OnInit, AfterViewChecked {
    @ViewChild('msgArea') private msgArea!: ElementRef;
    @ViewChild('textInput') private textInput!: ElementRef;

    profileId = '';
    profile: AiChatProfile | null = null;
    sessionId = '';

    messages: ChatMessage[] = [];
    userInput = '';
    typing = false;
    loading = false;
    completed = false;
    scores: any = null;
    errorMsg = '';

    private shouldScroll = false;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private aiChat: AiChatService,
        public auth: AuthService
    ) {}

    ngOnInit(): void {
        this.profileId = this.route.snapshot.params['profileId'];
        if (!this.auth.isLoggedIn) {
            this.router.navigate(['/login'], { queryParams: { returnUrl: `/ai-chat/${this.profileId}` } });
            return;
        }
        this.init();
    }

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    init(): void {
        this.messages = [];
        this.errorMsg = '';
        this.completed = false;
        this.scores = null;
        this.userInput = '';
        this.loading = true;

        this.aiChat.startSession(this.profileId).subscribe({
            next: (resp) => {
                this.loading = false;
                this.sessionId = resp.sessionId;
                this.profile = resp.profile;
                this.pushBot(resp.message);
            },
            error: (err) => {
                this.loading = false;
                this.errorMsg = err.error?.error || 'Impossible de démarrer la session.';
            }
        });
    }

    onEnter(event: Event): void {
        const ke = event as KeyboardEvent;
        if (!ke.shiftKey) {
            ke.preventDefault();
            this.send();
        }
    }

    send(): void {
        const text = this.userInput.trim();
        if (!text || this.typing || this.loading) return;

        this.messages.push({ from: 'user', text, time: new Date() });
        this.userInput = '';
        this.typing = true;
        this.shouldScroll = true;

        // Reset textarea height
        if (this.textInput) {
            this.textInput.nativeElement.style.height = 'auto';
        }

        this.aiChat.sendMessage(this.sessionId, text).subscribe({
            next: (resp) => {
                this.typing = false;
                if (resp.completed && resp.scores) {
                    this.pushBot(resp.message);
                    setTimeout(() => {
                        this.completed = true;
                        this.scores = resp.scores;
                        this.shouldScroll = true;
                    }, 300);
                } else {
                    this.pushBot(resp.message);
                }
            },
            error: (err) => {
                this.typing = false;
                this.errorMsg = err.error?.error || 'Erreur lors de l\'envoi.';
            }
        });
    }

    autoResize(event: Event): void {
        const ta = event.target as HTMLTextAreaElement;
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
    }

    private pushBot(text: string): void {
        this.messages.push({ from: 'bot', text, time: new Date() });
        this.shouldScroll = true;
    }

    private scrollToBottom(): void {
        if (this.msgArea) {
            const el = this.msgArea.nativeElement;
            el.scrollTop = el.scrollHeight;
        }
    }

    // Template helpers
    formatText(text: string): string {
        // Basic markdown-like formatting: bold **text**, newlines
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    getAxes(axisScores: any): any[] {
        if (!axisScores) return [];
        return Object.values(axisScores);
    }

    toLevel(score: number): string {
        if (score <= 25) return 'Découverte';
        if (score <= 50) return 'Exploration';
        if (score <= 75) return 'Adoption';
        return 'Maîtrise';
    }

    toColor(score: number): string {
        if (score <= 25) return '#ef4444';
        if (score <= 50) return '#f97316';
        if (score <= 75) return '#eab308';
        return '#22c55e';
    }
}
