import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ChatbotService, ChatQuestion, StartSessionResponse } from '../../services/chatbot.service';
import { AuthService } from '../../services/auth.service';

interface ChatMessage {
    from: 'bot' | 'user';
    text: string;
    question?: ChatQuestion;
    answered?: boolean;
    userChoice?: string;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="chat-page">

            <!-- ── Header ─────────────────────────────────────── -->
            <div class="chat-header">
                <a routerLink="/" class="back-btn">←</a>
                <div class="profile-avatar" [style.background]="profileColor">{{ profileIcon }}</div>
                <div class="header-info">
                    <span class="profile-name">{{ profileName }}</span>
                    <span class="progress-label">{{ answeredCount }}/{{ totalQuestions }} questions</span>
                </div>
                <div class="progress-bar-wrap">
                    <div class="progress-fill" [style.width.%]="progress"></div>
                </div>
            </div>

            <!-- ── Messages ───────────────────────────────────── -->
            <div class="messages-area" #msgArea>

                <ng-container *ngFor="let msg of messages">

                    <!-- Bot bubble -->
                    <div class="bot-row" *ngIf="msg.from === 'bot'">
                        <div class="bot-dot" [style.background]="profileColor">{{ profileIcon }}</div>
                        <div class="bot-bubble">
                            <p class="question-text">{{ msg.text }}</p>

                            <!-- 4 choices — only shown on the active question -->
                            <div class="choices" *ngIf="msg.question && !msg.answered">
                                <button
                                    *ngFor="let opt of msg.question.options; let i = index"
                                    class="choice-btn"
                                    [class.selected]="pendingAnswer === opt"
                                    (click)="selectAnswer(opt)">
                                    <span class="choice-letter">{{ letters[i] }}</span>
                                    <span class="choice-text">{{ opt }}</span>
                                </button>
                            </div>

                            <!-- Dimension badge -->
                            <div class="axis-badge" *ngIf="msg.question">
                                {{ axisIcon(msg.question.dimension) }} {{ axisLabel(msg.question.dimension) }}
                            </div>
                        </div>
                    </div>

                    <!-- User bubble -->
                    <div class="user-row" *ngIf="msg.from === 'user'">
                        <div class="user-bubble">{{ msg.text }}</div>
                    </div>

                </ng-container>

                <!-- Typing indicator -->
                <div class="bot-row" *ngIf="typing">
                    <div class="bot-dot" [style.background]="profileColor">{{ profileIcon }}</div>
                    <div class="typing-bubble">
                        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
                    </div>
                </div>

                <!-- Error -->
                <div class="error-msg" *ngIf="errorMsg">
                    ⚠️ {{ errorMsg }}
                    <button class="retry-btn" (click)="startChat()">Réessayer</button>
                </div>
            </div>

            <!-- ── Confirm button (shown only when an answer is selected) ── -->
            <div class="confirm-bar" *ngIf="pendingAnswer && !typing && !completed">
                <button class="confirm-btn" (click)="confirmAnswer()">
                    Valider → {{ pendingAnswer }}
                </button>
            </div>

            <!-- ── Results panel ──────────────────────────────── -->
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

                <!-- 7 Axes -->
                <div class="axes-grid">
                    <div *ngFor="let axis of getAxes(result.scores.axisScores)"
                         class="axis-card"
                         [class.no-data]="!axis.hasData">
                        <div class="axis-header">
                            <span class="axis-icon">{{ axis.icon }}</span>
                            <span class="axis-name">{{ axis.label }}</span>
                            <span class="axis-score" [style.color]="scoreToBadgeColor(axis.score)">
                                {{ axis.hasData ? axis.score + '%' : '—' }}
                            </span>
                        </div>
                        <div class="axis-bar-wrap" *ngIf="axis.hasData">
                            <div class="axis-bar"
                                 [style.width.%]="axis.score"
                                 [style.background]="scoreToBadgeColor(axis.score)">
                            </div>
                        </div>
                        <div class="axis-level" *ngIf="axis.hasData">{{ scoreToLevel(axis.score) }}</div>
                    </div>
                </div>

                <!-- Modules suggérés -->
                <div class="modules-section" *ngIf="result.scores.suggestedModules?.length">
                    <h3>📚 Modules recommandés pour vous</h3>
                    <div class="modules-list">
                        <div *ngFor="let item of result.scores.suggestedModules" class="module-card">
                            <div class="module-icon">{{ item.axisIcon }}</div>
                            <div class="module-info">
                                <div class="module-name">{{ item.module.name }}</div>
                                <div class="module-meta">
                                    <span class="module-duration">⏱ {{ item.module.duration }}</span>
                                    <span class="module-level">{{ item.module.level }}</span>
                                </div>
                                <div class="module-reason">
                                    Axe {{ item.axisLabel }} : {{ item.score }}% — prioritaire
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recommandations -->
                <div class="reco-section" *ngIf="result.scores.recommendations?.length">
                    <h3>💡 Recommandations</h3>
                    <ul class="reco-list">
                        <li *ngFor="let r of result.scores.recommendations">{{ r }}</li>
                    </ul>
                </div>

                <div class="result-actions">
                    <a routerLink="/user/results" class="btn btn-primary">Voir mes résultats complets</a>
                    <a routerLink="/" class="btn btn-secondary">Retour à l'accueil</a>
                </div>
            </div>

        </div>
    `,
    styles: [`
        /* ── Layout ─────────────────────────────────────────────── */
        .chat-page {
            max-width: 720px;
            margin: 0 auto;
            padding: 0 16px 120px;
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
            padding: 12px 0 10px;
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
        .profile-avatar {
            width: 36px; height: 36px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.1rem; flex-shrink: 0;
        }
        .header-info { flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .profile-name { font-size: 0.9rem; font-weight: 700; }
        .progress-label { font-size: 0.75rem; color: var(--text-secondary); }
        .progress-bar-wrap {
            width: 80px; height: 5px;
            background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; flex-shrink: 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #6366f1, #ec4899);
            border-radius: 3px; transition: width 0.4s ease;
        }

        /* ── Messages ─────────────────────────────────────────── */
        .messages-area {
            flex: 1;
            padding-top: 20px;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .bot-row { display: flex; gap: 10px; align-items: flex-start; }
        .bot-dot {
            width: 30px; height: 30px; border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.9rem; flex-shrink: 0; margin-top: 2px;
        }
        .bot-bubble {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 4px 16px 16px 16px;
            padding: 16px 18px;
            max-width: calc(100% - 44px);
        }
        .question-text {
            font-size: 0.95rem;
            line-height: 1.6;
            margin: 0 0 14px;
            font-weight: 500;
        }

        /* ── 4 Choices ─────────────────────────────────────────── */
        .choices {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 12px;
        }
        .choice-btn {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            border: 1px solid rgba(99,102,241,0.25);
            border-radius: 10px;
            background: rgba(99,102,241,0.04);
            color: var(--text-primary);
            font-size: 0.875rem;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s ease;
        }
        .choice-btn:hover {
            border-color: rgba(99,102,241,0.5);
            background: rgba(99,102,241,0.1);
        }
        .choice-btn.selected {
            border-color: #6366f1;
            background: rgba(99,102,241,0.18);
        }
        .choice-letter {
            width: 24px; height: 24px;
            border-radius: 6px;
            background: rgba(99,102,241,0.2);
            color: #818cf8;
            font-size: 0.75rem;
            font-weight: 700;
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
        }
        .choice-btn.selected .choice-letter {
            background: #6366f1;
            color: white;
        }
        .choice-text { line-height: 1.4; }

        .axis-badge {
            font-size: 0.72rem;
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* ── User bubble ────────────────────────────────────────── */
        .user-row { display: flex; justify-content: flex-end; }
        .user-bubble {
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            padding: 11px 16px;
            border-radius: 16px 4px 16px 16px;
            font-size: 0.875rem;
            max-width: 75%;
            line-height: 1.5;
        }

        /* ── Typing ─────────────────────────────────────────────── */
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

        /* ── Confirm bar ─────────────────────────────────────────── */
        .confirm-bar {
            position: fixed;
            bottom: 0; left: 0; right: 0;
            padding: 14px 20px;
            background: rgba(15,15,26,0.96);
            backdrop-filter: blur(16px);
            border-top: 1px solid rgba(255,255,255,0.08);
            display: flex;
            justify-content: center;
            z-index: 100;
        }
        .confirm-btn {
            padding: 13px 32px;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            max-width: 720px;
            width: 100%;
            transition: opacity 0.2s;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .confirm-btn:hover { opacity: 0.9; }

        /* ── Error ─────────────────────────────────────────────── */
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

        /* ── Results ────────────────────────────────────────────── */
        .results-panel {
            margin-top: 24px;
            display: flex;
            flex-direction: column;
            gap: 24px;
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

        /* 7 axes grid */
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
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .axis-card.no-data { opacity: 0.4; }
        .axis-header { display: flex; align-items: center; gap: 8px; }
        .axis-icon { font-size: 1.1rem; }
        .axis-name { flex: 1; font-size: 0.85rem; font-weight: 600; }
        .axis-score { font-size: 1rem; font-weight: 800; }
        .axis-bar-wrap { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
        .axis-bar { height: 100%; border-radius: 3px; transition: width 0.8s ease; }
        .axis-level { font-size: 0.75rem; color: var(--text-secondary); }

        /* Modules */
        .modules-section h3, .reco-section h3 {
            font-size: 1rem; font-weight: 700; margin: 0 0 12px;
        }
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

        /* Recommendations */
        .reco-list {
            list-style: none; padding: 0; margin: 0;
            display: flex; flex-direction: column; gap: 8px;
        }
        .reco-list li {
            padding: 10px 14px;
            background: rgba(255,255,255,0.04);
            border-radius: 10px;
            font-size: 0.875rem;
            color: var(--text-secondary);
            border-left: 3px solid #6366f1;
            padding-left: 14px;
        }

        .result-actions {
            display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
            padding-bottom: 40px;
        }
    `]
})
export class ChatbotComponent implements OnInit, AfterViewChecked {
    @ViewChild('msgArea') private msgArea!: ElementRef;

    profileId = '';
    profileName = '';
    profileIcon = '🤖';
    profileColor = 'linear-gradient(135deg, #6366f1, #8b5cf6)';

    sessionId = '';
    messages: ChatMessage[] = [];
    pendingAnswer: string | null = null;
    currentQuestion: ChatQuestion | null = null;
    answeredCount = 0;
    totalQuestions = 0;
    progress = 0;
    typing = false;
    completed = false;
    result: any = null;
    errorMsg = '';
    private shouldScroll = false;

    readonly letters = ['A', 'B', 'C', 'D'];

    private axesMeta: Record<string, { label: string; icon: string }> = {
        utilisation:    { label: 'Utilisation',       icon: '🛠️'  },
        prompting:      { label: 'Prompting',          icon: '✍️'  },
        ethique:        { label: 'Éthique & Sécurité', icon: '⚖️'  },
        formation:      { label: 'Formation',          icon: '🎓'  },
        automatisation: { label: 'Automatisation',     icon: '⚙️'  },
        gouvernance:    { label: 'Gouvernance',        icon: '🏛️'  },
        impact:         { label: 'Impact & ROI',       icon: '📈'  }
    };

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private chatbotService: ChatbotService,
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

    ngAfterViewChecked(): void {
        if (this.shouldScroll) {
            this.scrollToBottom();
            this.shouldScroll = false;
        }
    }

    startChat(): void {
        this.messages = [];
        this.errorMsg = '';
        this.completed = false;
        this.pendingAnswer = null;
        this.answeredCount = 0;
        this.result = null;

        this.chatbotService.startSession(this.profileId).subscribe({
            next: (resp: StartSessionResponse) => {
                this.sessionId = resp.sessionId;
                this.profileName = resp.profile.name;
                this.profileIcon = resp.profile.icon;
                this.profileColor = resp.profile.color;
                this.totalQuestions = resp.totalQuestions;
                this.progress = 0;
                // Show first question immediately — no welcome screen
                this.pushBotQuestion(resp.question);
            },
            error: (err) => {
                this.errorMsg = err.error?.error || 'Impossible de démarrer la session.';
            }
        });
    }

    selectAnswer(opt: string): void {
        this.pendingAnswer = opt;
    }

    confirmAnswer(): void {
        if (!this.pendingAnswer || !this.currentQuestion) return;
        const answer = this.pendingAnswer;

        // Mark current bot message as answered
        const lastBot = [...this.messages].reverse().find(m => m.from === 'bot' && m.question);
        if (lastBot) lastBot.answered = true;

        // Add user bubble
        this.messages.push({ from: 'user', text: answer });
        this.pendingAnswer = null;
        this.answeredCount++;
        this.shouldScroll = true;

        this.chatbotService.submitAnswer(this.sessionId, answer).subscribe({
            next: (resp) => {
                if (resp.completed) {
                    this.finalize();
                } else if (resp.question) {
                    this.progress = resp.progress || this.progress;
                    this.showTyping(600, () => this.pushBotQuestion(resp.question!));
                }
            },
            error: (err) => {
                this.errorMsg = err.error?.error || 'Erreur lors de la soumission.';
            }
        });
    }

    private finalize(): void {
        this.showTyping(800, () => {
            this.messages.push({ from: 'bot', text: '✅ Évaluation terminée ! Je calcule vos résultats...' });
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
        this.pendingAnswer = null;
        this.progress = question.progress;
        this.messages.push({ from: 'bot', text: question.text, question, answered: false });
        this.shouldScroll = true;
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

    // ── Template helpers ──────────────────────────────────────────────

    axisLabel(axis: string): string {
        return this.axesMeta[axis]?.label || axis;
    }

    axisIcon(axis: string): string {
        return this.axesMeta[axis]?.icon || '';
    }

    getAxes(axisScores: any): any[] {
        if (!axisScores) return [];
        return Object.values(axisScores);
    }

    scoreToLevel(score: number | null): string {
        if (score === null) return '—';
        if (score <= 25) return 'Découverte';
        if (score <= 50) return 'Exploration';
        if (score <= 75) return 'Adoption';
        return 'Maîtrise';
    }

    scoreToBadgeColor(score: number | null): string {
        if (score === null) return '#64748b';
        if (score <= 25) return '#ef4444';
        if (score <= 50) return '#f97316';
        if (score <= 75) return '#eab308';
        return '#22c55e';
    }
}
