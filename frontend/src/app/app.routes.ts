import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingComponent)
    },
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
    {
        path: '**',
        redirectTo: ''
    }
];
