import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatQuestion {
    id: string;
    text: string;
    type: 'single' | 'multiple' | 'scale' | 'boolean';
    options: string[];
    dimension: string;
    section: string;
    index: number;
    total: number;
    progress: number;
}

export interface StartSessionResponse {
    sessionId: string;
    profile: { id: string; name: string; icon: string; color: string; dimensions: string[] };
    question: ChatQuestion;
    totalQuestions: number;
}

export interface AnswerResponse {
    completed: boolean;
    question?: ChatQuestion;
    progress?: number;
    answeredCount?: number;
    totalQuestions?: number;
    sessionId?: string;
}

export interface AuditResult {
    auditId: string;
    scores: {
        overall: number;
        level: string;
        levelLabel: string;
        levelColor: string;
        levelEmoji: string;
        dimensions: Record<string, number>;
        recommendations: string[];
    };
    profile: { name: string; icon: string; color: string };
}

@Injectable({ providedIn: 'root' })
export class ChatbotService {
    private apiUrl = 'http://localhost:3000/api/chatbot';

    constructor(private http: HttpClient) {}

    startSession(profileId: string): Observable<StartSessionResponse> {
        return this.http.post<StartSessionResponse>(`${this.apiUrl}/start`, { profileId });
    }

    submitAnswer(sessionId: string, answer: any): Observable<AnswerResponse> {
        return this.http.post<AnswerResponse>(`${this.apiUrl}/answer`, { sessionId, answer });
    }

    completeSession(sessionId: string): Observable<AuditResult> {
        return this.http.post<AuditResult>(`${this.apiUrl}/complete`, { sessionId });
    }

    getSession(sessionId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/session/${sessionId}`);
    }

    getAudit(auditId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/audits/${auditId}`);
    }
}
