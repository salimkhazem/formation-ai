import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
export interface AiChatProfile {
    id: string;
    name: string;
    icon: string;
    color: string;
}

export interface StartAiSessionResponse {
    sessionId: string;
    profile: AiChatProfile;
    message: string;
    completed: false;
}

export interface SendMessageResponse {
    message: string;
    completed: boolean;
    auditId?: string;
    scores?: {
        overall: number;
        axisScores: Record<string, { score: number; label: string; icon: string; color: string; hasData: boolean }>;
        suggestedModules: Array<{ axis: string; axisLabel: string; axisIcon: string; score: number; module: { name: string; duration: string; level: string } }>;
        levelLabel: string;
        levelEmoji: string;
        levelColor: string;
    };
    profile?: AiChatProfile;
}

@Injectable({ providedIn: 'root' })
export class AiChatService {
    private api = 'http://localhost:3000/api/ai-chat';

    constructor(private http: HttpClient) {}

    getProfiles(): Observable<AiChatProfile[]> {
        return this.http.get<AiChatProfile[]>(`${this.api}/profiles`);
    }

    startSession(profileId: string): Observable<StartAiSessionResponse> {
        return this.http.post<StartAiSessionResponse>(`${this.api}/start`, { profileId });
    }

    sendMessage(sessionId: string, message: string): Observable<SendMessageResponse> {
        return this.http.post<SendMessageResponse>(`${this.api}/message`, { sessionId, message });
    }
}
