import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Profile, QuestionsResponse, Audit } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuditService {
    private apiUrl = 'http://localhost:3000/api';

    constructor(private http: HttpClient) { }

    getProfiles(): Observable<Profile[]> {
        return this.http.get<Profile[]>(`${this.apiUrl}/profiles`);
    }

    getProfile(id: string): Observable<Profile> {
        return this.http.get<Profile>(`${this.apiUrl}/profiles/${id}`);
    }

    getQuestions(profileId: string): Observable<QuestionsResponse> {
        return this.http.get<QuestionsResponse>(`${this.apiUrl}/questions/${profileId}`);
    }

    submitAudit(data: {
        profileId: string;
        respondentName: string;
        respondentEmail: string;
        answers: Record<string, any>;
    }): Observable<Audit> {
        return this.http.post<Audit>(`${this.apiUrl}/audits`, data);
    }

    getAudits(): Observable<Audit[]> {
        return this.http.get<Audit[]>(`${this.apiUrl}/audits`);
    }

    getAudit(id: string): Observable<Audit> {
        return this.http.get<Audit>(`${this.apiUrl}/audits/${id}`);
    }

    deleteAudit(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/audits/${id}`);
    }
}
