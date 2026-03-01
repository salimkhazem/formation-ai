import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav class="navbar">
      <div class="container nav-inner">
        <a routerLink="/" class="nav-brand">
          <span class="brand-icon">🤖</span>
          <span class="brand-text">AI Maturity</span>
          <span class="brand-badge">AUDIT</span>
        </a>
        <div class="nav-links">
          <a routerLink="/" class="nav-link">Accueil</a>
          <a routerLink="/history" class="nav-link">Historique</a>
        </div>
      </div>
    </nav>
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
      background: linear-gradient(135deg, #f59e0b, #ef4444);
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

    .main-content {
      padding: 32px 0;
      min-height: calc(100vh - 64px);
    }
  `]
})
export class AppComponent { }
