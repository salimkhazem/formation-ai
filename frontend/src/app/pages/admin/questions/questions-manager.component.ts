import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';

const PROFILES = [
    { id: '', label: 'Général (tous profils)' },
    { id: 'developpeur', label: 'Développeur' },
    { id: 'business-analyst', label: 'Business Analyst' },
    { id: 'manager', label: 'Manager' },
    { id: 'fonctionnel', label: 'Fonctionnel' },
    { id: 'expert-ia', label: 'Expert IA' }
];

@Component({
    selector: 'app-questions-manager',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="container">
            <div class="page-header">
                <div>
                    <a routerLink="/admin/dashboard" class="back-link">← Dashboard</a>
                    <h1>Gestion des questions</h1>
                    <p class="subtitle">{{ questions.length }} question(s) au total</p>
                </div>
                <button class="btn btn-primary" (click)="openCreateModal()">+ Ajouter une question</button>
            </div>

            <!-- Filter -->
            <div class="filter-bar glass-card">
                <label class="form-label">Filtrer par profil :</label>
                <select class="form-control" [(ngModel)]="selectedProfile" (change)="loadQuestions()">
                    <option *ngFor="let p of profiles" [value]="p.id">{{ p.label }}</option>
                </select>
            </div>

            <!-- Questions List -->
            <div *ngIf="loading" class="loading">Chargement...</div>
            <div *ngIf="!loading && questions.length === 0" class="empty-state glass-card">
                <span class="empty-icon">❓</span>
                <p>Aucune question pour ce filtre.</p>
            </div>

            <div class="questions-list" *ngIf="!loading">
                <div *ngFor="let q of questions; let i = index" class="question-card glass-card"
                     [class.dragging]="dragIndex === i">
                    <div class="q-header">
                        <div class="q-meta">
                            <span class="q-index">#{{ i + 1 }}</span>
                            <span class="q-type-badge" [class]="'type-' + q.type">{{ q.type }}</span>
                            <span class="q-dimension">{{ q.dimension }}</span>
                            <span class="q-section">{{ q.profile_id ? profileLabel(q.profile_id) : 'Général' }}</span>
                        </div>
                        <div class="q-actions">
                            <button class="btn-icon" (click)="editQuestion(q)" title="Modifier">✏️</button>
                            <button class="btn-icon danger" (click)="deleteQuestion(q)" title="Supprimer">🗑️</button>
                        </div>
                    </div>
                    <p class="q-text">{{ q.text }}</p>
                    <div *ngIf="q.options?.length > 0" class="q-options">
                        <span *ngFor="let opt of q.options" class="q-option">{{ opt }}</span>
                    </div>
                </div>
            </div>

            <!-- Create/Edit Modal -->
            <div class="modal-overlay" *ngIf="showModal" (click)="closeModalOnOverlay($event)">
                <div class="modal glass-card">
                    <h2>{{ editing ? 'Modifier la question' : 'Nouvelle question' }}</h2>

                    <form (ngSubmit)="saveQuestion()" class="modal-form">
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">ID *</label>
                                <input class="form-control" [(ngModel)]="form.id" name="id" placeholder="ex: gen-9" [disabled]="editing" required />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Type *</label>
                                <select class="form-control" [(ngModel)]="form.type" name="type" required>
                                    <option value="single">Choix unique</option>
                                    <option value="multiple">Choix multiple</option>
                                    <option value="scale">Échelle (1-10)</option>
                                    <option value="boolean">Oui/Non</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Question *</label>
                            <textarea class="form-control" [(ngModel)]="form.text" name="text" rows="3" required></textarea>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Profil</label>
                                <select class="form-control" [(ngModel)]="form.profile_id" name="profile_id">
                                    <option value="">Général (tous profils)</option>
                                    <option *ngFor="let p of profiles.slice(1)" [value]="p.id">{{ p.label }}</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Dimension</label>
                                <input class="form-control" [(ngModel)]="form.dimension" name="dimension" placeholder="ex: Utilisation" />
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Poids (1-3)</label>
                                <input type="number" class="form-control" [(ngModel)]="form.weight" name="weight" min="1" max="3" />
                            </div>
                            <div class="form-group">
                                <label class="form-label">Ordre</label>
                                <input type="number" class="form-control" [(ngModel)]="form.order_index" name="order_index" min="0" />
                            </div>
                        </div>

                        <div class="form-group" *ngIf="form.type === 'single' || form.type === 'multiple'">
                            <label class="form-label">Options (une par ligne)</label>
                            <textarea class="form-control" [(ngModel)]="optionsText" name="options" rows="5" placeholder="Option 1&#10;Option 2&#10;Option 3"></textarea>
                        </div>

                        <div class="error-msg" *ngIf="formError">{{ formError }}</div>

                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" (click)="showModal = false">Annuler</button>
                            <button type="submit" class="btn btn-primary" [disabled]="formLoading">
                                {{ formLoading ? 'Enregistrement...' : (editing ? 'Mettre à jour' : 'Créer') }}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .container { max-width: 1000px; margin: 0 auto; padding: 0 24px; }
        .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
        .back-link { display: block; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 8px; }
        .back-link:hover { color: var(--text-primary); }
        h1 { font-size: 1.75rem; font-weight: 800; margin: 0; }
        .subtitle { color: var(--text-secondary); margin: 4px 0 0; }

        .filter-bar { padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
        .filter-bar .form-label { white-space: nowrap; font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .filter-bar .form-control { max-width: 280px; }

        .loading, .empty-state { text-align: center; padding: 48px; }
        .empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }

        .questions-list { display: flex; flex-direction: column; gap: 12px; }
        .question-card { padding: 20px; }
        .q-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .q-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .q-index { font-size: 0.75rem; color: var(--text-secondary); font-weight: 600; }
        .q-type-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
        .type-single { background: rgba(99,102,241,0.2); color: #818cf8; }
        .type-multiple { background: rgba(139,92,246,0.2); color: #a78bfa; }
        .type-scale { background: rgba(20,184,166,0.2); color: #2dd4bf; }
        .type-boolean { background: rgba(245,158,11,0.2); color: #fbbf24; }
        .q-dimension { font-size: 0.8rem; color: var(--text-secondary); }
        .q-section { font-size: 0.75rem; background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 10px; }
        .q-actions { display: flex; gap: 6px; }
        .btn-icon { background: none; border: none; font-size: 1rem; cursor: pointer; padding: 4px; border-radius: 6px; transition: background 0.2s; }
        .btn-icon:hover { background: rgba(255,255,255,0.08); }
        .btn-icon.danger:hover { background: rgba(239,68,68,0.15); }
        .q-text { margin: 0 0 10px; font-size: 0.9rem; line-height: 1.5; }
        .q-options { display: flex; flex-wrap: wrap; gap: 6px; }
        .q-option { font-size: 0.78rem; padding: 3px 10px; background: rgba(255,255,255,0.05); border-radius: 12px; color: var(--text-secondary); }

        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 24px; overflow-y: auto; }
        .modal { width: 100%; max-width: 600px; padding: 36px; max-height: 90vh; overflow-y: auto; }
        .modal h2 { margin: 0 0 24px; font-size: 1.25rem; }
        .modal-form { display: flex; flex-direction: column; gap: 16px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .form-group { display: flex; flex-direction: column; gap: 8px; }
        .form-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
        .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 8px; }
        .error-msg { background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3); color: #f87171; padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; }
    `]
})
export class QuestionsManagerComponent implements OnInit {
    questions: any[] = [];
    loading = true;
    selectedProfile = '';
    profiles = PROFILES;
    showModal = false;
    editing = false;
    form: any = this.emptyForm();
    optionsText = '';
    formLoading = false;
    formError = '';
    dragIndex = -1;

    constructor(private adminService: AdminService) {}

    ngOnInit(): void {
        this.loadQuestions();
    }

    loadQuestions(): void {
        this.loading = true;
        this.adminService.getQuestions(this.selectedProfile || undefined).subscribe({
            next: qs => { this.questions = qs; this.loading = false; },
            error: () => { this.loading = false; }
        });
    }

    openCreateModal(): void {
        this.editing = false;
        this.form = this.emptyForm();
        this.optionsText = '';
        this.formError = '';
        this.showModal = true;
    }

    editQuestion(q: any): void {
        this.editing = true;
        this.form = { ...q };
        this.optionsText = (q.options || []).join('\n');
        this.formError = '';
        this.showModal = true;
    }

    saveQuestion(): void {
        const options = (this.form.type === 'single' || this.form.type === 'multiple')
            ? this.optionsText.split('\n').map((s: string) => s.trim()).filter((s: string) => s)
            : [];

        const payload = { ...this.form, options, profile_id: this.form.profile_id || null };
        this.formLoading = true;
        this.formError = '';

        const obs = this.editing
            ? this.adminService.updateQuestion(this.form.id, payload)
            : this.adminService.createQuestion(payload);

        obs.subscribe({
            next: () => { this.formLoading = false; this.showModal = false; this.loadQuestions(); },
            error: (err) => { this.formLoading = false; this.formError = err.error?.error || 'Erreur lors de l\'enregistrement'; }
        });
    }

    deleteQuestion(q: any): void {
        if (!confirm(`Supprimer la question "${q.text.substring(0, 60)}..." ?`)) return;
        this.adminService.deleteQuestion(q.id).subscribe({
            next: () => this.loadQuestions(),
            error: (err) => alert(err.error?.error || 'Erreur')
        });
    }

    profileLabel(id: string): string {
        return PROFILES.find(p => p.id === id)?.label || id;
    }

    closeModalOnOverlay(event: Event): void {
        if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
            this.showModal = false;
        }
    }

    private emptyForm() {
        return { id: '', profile_id: '', text: '', type: 'single', dimension: '', weight: 1, order_index: 0, section: 'general' };
    }
}
