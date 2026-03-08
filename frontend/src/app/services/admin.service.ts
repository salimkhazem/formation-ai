import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminService {
    private apiUrl = 'http://localhost:3000/api';

    constructor(private http: HttpClient) {}

    // Companies
    getCompanies(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/companies`);
    }

    getCompany(id: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/companies/${id}`);
    }

    createCompany(data: { name: string; email: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/companies`, data);
    }

    getCompanyUsers(companyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/companies/${companyId}/users`);
    }

    getCompanyAudits(companyId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/companies/${companyId}/audits`);
    }

    // Users
    getUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/users`);
    }

    updateUser(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/users/${id}`, data);
    }

    deleteUser(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/users/${id}`);
    }

    getUserAudits(userId: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/users/${userId}/audits`);
    }

    // Questions
    getQuestions(profileId?: string): Observable<any[]> {
        const params = profileId ? `?profile_id=${profileId}` : '';
        return this.http.get<any[]>(`${this.apiUrl}/questions${params}`);
    }

    createQuestion(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/questions`, data);
    }

    updateQuestion(id: string, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/questions/${id}`, data);
    }

    deleteQuestion(id: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/questions/${id}`);
    }

    reorderQuestions(orders: { id: string; order_index: number }[]): Observable<any> {
        return this.http.put(`${this.apiUrl}/questions/reorder/batch`, { orders });
    }

    // Export
    getExcelExportUrl(companyId: string): string {
        return `${this.apiUrl}/export/excel?companyId=${companyId}`;
    }

    getPdfExportUrl(auditId: string): string {
        return `${this.apiUrl}/export/pdf?auditId=${auditId}`;
    }
}
