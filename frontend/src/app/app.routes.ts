import { Routes } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
    // Public
    {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
    },
    {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'accept-invite',
        loadComponent: () => import('./pages/accept-invite/accept-invite.component').then(m => m.AcceptInviteComponent)
    },

    // Legacy audit form (existing flow)
    {
        path: 'audit/:profileId',
        loadComponent: () => import('./pages/audit-form/audit-form.component').then(m => m.AuditFormComponent)
    },
    {
        path: 'results/:id',
        loadComponent: () => import('./pages/results/results.component').then(m => m.ResultsComponent)
    },
    {
        path: 'history',
        loadComponent: () => import('./pages/history/history.component').then(m => m.HistoryComponent)
    },

    // Chatbot scripté 4-choix (authenticated)
    {
        path: 'chat/:profileId',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/chatbot/chatbot.component').then(m => m.ChatbotComponent)
    },

    // Chatbot conversationnel Azure OpenAI (authenticated)
    {
        path: 'ai-chat/:profileId',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/ai-chatbot/ai-chatbot.component').then(m => m.AiChatbotComponent)
    },

    // User area
    {
        path: 'user/results',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/user-results/user-results.component').then(m => m.UserResultsComponent)
    },

    // Admin area
    {
        path: 'admin/dashboard',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent)
    },
    {
        path: 'admin/team',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/team/team-management.component').then(m => m.TeamManagementComponent)
    },
    {
        path: 'admin/questions',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/questions/questions-manager.component').then(m => m.QuestionsManagerComponent)
    },
    {
        path: 'admin/export',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin/export/export.component').then(m => m.ExportComponent)
    },

    // Fallback
    { path: '**', redirectTo: '' }
];
