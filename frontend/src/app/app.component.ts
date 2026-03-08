import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, CommonModule],
  template: `
    <nav class="navbar">
      <div class="container nav-inner">
        <a routerLink="/" class="nav-brand">
          <span class="brand-icon">🤖</span>
          <span class="brand-text">AI Maturity</span>
          <span class="brand-badge">PLATFORM</span>
        </a>

        <div class="nav-links">
          <a routerLink="/" class="nav-link">Accueil</a>
          <a routerLink="/history" class="nav-link">Historique</a>

          <!-- Authenticated links -->
          <ng-container *ngIf="auth.isLoggedIn">
            <a routerLink="/user/results" class="nav-link">Mes résultats</a>
            <a *ngIf="auth.isAdmin" routerLink="/admin/dashboard" class="nav-link admin-link">
              👑 Admin
            </a>
          </ng-container>

          <!-- Auth buttons -->
          <ng-container *ngIf="!auth.isLoggedIn">
            <a routerLink="/login" class="btn btn-secondary nav-btn">Se connecter</a>
          </ng-container>

          <ng-container *ngIf="auth.isLoggedIn">
            <div class="user-menu">
              <div class="user-avatar" (click)="toggleUserMenu()">
                {{ userInitial }}
              </div>
              <div class="user-dropdown" *ngIf="showUserMenu">
                <div class="user-info">
                  <span class="user-name">{{ auth.currentUser?.name || auth.currentUser?.email }}</span>
                  <span class="user-role">{{ auth.currentUser?.company_name }}</span>
                </div>
                <hr class="dropdown-divider">
                <a routerLink="/user/results" class="dropdown-item" (click)="showUserMenu = false">📋 Mes résultats</a>
                <a *ngIf="auth.isAdmin" routerLink="/admin/dashboard" class="dropdown-item" (click)="showUserMenu = false">👑 Administration</a>
                <button class="dropdown-item danger" (click)="logout()">🚪 Se déconnecter</button>
              </div>
            </div>
          </ng-container>
        </div>
      </div>
    </nav>

    <!-- Click outside to close -->
    <div *ngIf="showUserMenu" class="overlay" (click)="showUserMenu = false"></div>

    <main class="main-content">
      <router-outlet />
    </main>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(15, 15, 26, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .nav-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
    }

    .brand-icon { font-size: 1.5rem; }

    .brand-text {
      font-size: 1.25rem;
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      letter-spacing: -0.02em;
    }

    .brand-badge {
      font-size: 0.6rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      letter-spacing: 0.08em;
    }

    .nav-links {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-link {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      transition: var(--transition);
    }

    .nav-link:hover {
      color: var(--text-primary);
      background: rgba(255, 255, 255, 0.06);
    }

    .admin-link {
      color: #fbbf24;
    }

    .nav-btn {
      padding: 8px 16px;
      font-size: 0.875rem;
    }

    /* User menu */
    .user-menu { position: relative; }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      color: white;
      transition: opacity 0.2s;
      user-select: none;
    }

    .user-avatar:hover { opacity: 0.85; }

    .user-dropdown {
      position: absolute;
      right: 0;
      top: calc(100% + 8px);
      background: rgba(20, 20, 40, 0.98);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 12px;
      padding: 8px;
      min-width: 220px;
      box-shadow: 0 16px 40px rgba(0,0,0,0.4);
      z-index: 200;
    }

    .user-info {
      padding: 8px 12px 10px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name { font-size: 0.875rem; font-weight: 600; }
    .user-role { font-size: 0.75rem; color: var(--text-secondary); }

    .dropdown-divider {
      border: none;
      border-top: 1px solid rgba(255,255,255,0.06);
      margin: 4px 0;
    }

    .dropdown-item {
      display: block;
      width: 100%;
      padding: 9px 12px;
      border-radius: 8px;
      font-size: 0.875rem;
      color: var(--text-secondary);
      cursor: pointer;
      background: none;
      border: none;
      text-align: left;
      transition: background 0.2s, color 0.2s;
      text-decoration: none;
    }

    .dropdown-item:hover {
      background: rgba(255,255,255,0.06);
      color: var(--text-primary);
    }

    .dropdown-item.danger:hover {
      background: rgba(239,68,68,0.1);
      color: #f87171;
    }

    .overlay {
      position: fixed;
      inset: 0;
      z-index: 99;
    }

    .main-content {
      padding: 32px 0;
      min-height: calc(100vh - 64px);
    }

    @media (max-width: 640px) {
      .nav-link:not(.admin-link) { display: none; }
    }
  `]
})
export class AppComponent {
    showUserMenu = false;

    get userInitial(): string {
        const user = this.auth.currentUser;
        return ((user?.name || user?.email || 'U')[0]).toUpperCase();
    }

    constructor(public auth: AuthService, private router: Router) {}

    toggleUserMenu(): void {
        this.showUserMenu = !this.showUserMenu;
    }

    logout(): void {
        this.showUserMenu = false;
        this.auth.logout();
    }
}
