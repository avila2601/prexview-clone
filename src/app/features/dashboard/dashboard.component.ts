import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

import { TemplateService } from '../../core/services/template.service';
import { StorageService } from '../../core/services/storage.service';
import { Template, TemplateStatus } from '../../core/models';

interface DashboardStats {
  totalTemplates: number;
  activeTemplates: number;
  draftTemplates: number;
  recentDocuments: number;
  storageUsed: number;
  storagePercentage: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  disabled?: boolean;
}

/**
 * Dashboard Component - Panel principal de la aplicación
 * Muestra estadísticas, acciones rápidas y plantillas recientes
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ],
  template: `
    <div class="dashboard-container min-h-screen bg-gray-50 p-6">

      <!-- Header Section -->
      <div class="dashboard-header mb-8">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-4xl font-bold text-gray-900 mb-2">
              Welcome to PrexView Clone
            </h1>
            <p class="text-xl text-gray-600">
              Transform your data into beautiful documents
            </p>
          </div>
          <div class="hidden md:flex items-center space-x-4">
            <div class="text-right">
              <p class="text-sm text-gray-500">Storage Used</p>
              <p class="text-lg font-semibold text-gray-900">
                {{ (stats().storageUsed / 1024 / 1024).toFixed(2) }}MB
              </p>
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="stats().storagePercentage"
              class="w-24">
            </mat-progress-bar>
          </div>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <mat-card class="stat-card p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Total Templates
              </p>
              <p class="text-3xl font-bold text-blue-600 mt-2">
                {{ stats().totalTemplates }}
              </p>
            </div>
            <mat-icon class="text-blue-500 text-4xl">description</mat-icon>
          </div>
        </mat-card>

        <mat-card class="stat-card p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Active Templates
              </p>
              <p class="text-3xl font-bold text-green-600 mt-2">
                {{ stats().activeTemplates }}
              </p>
            </div>
            <mat-icon class="text-green-500 text-4xl">check_circle</mat-icon>
          </div>
        </mat-card>

        <mat-card class="stat-card p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Draft Templates
              </p>
              <p class="text-3xl font-bold text-orange-600 mt-2">
                {{ stats().draftTemplates }}
              </p>
            </div>
            <mat-icon class="text-orange-500 text-4xl">edit</mat-icon>
          </div>
        </mat-card>

        <mat-card class="stat-card p-6 hover:shadow-lg transition-shadow">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Documents Generated
              </p>
              <p class="text-3xl font-bold text-purple-600 mt-2">
                {{ stats().recentDocuments }}
              </p>
            </div>
            <mat-icon class="text-purple-500 text-4xl">assignment</mat-icon>
          </div>
        </mat-card>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions mb-8">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <mat-card
            *ngFor="let action of quickActions"
            class="action-card p-6 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            [class]="'border-l-4 border-' + action.color + '-500'"
            (click)="navigateTo(action.route)"
            [class.opacity-50]="action.disabled"
            [class.cursor-not-allowed]="action.disabled">

            <div class="flex items-start space-x-4">
              <div [class]="'p-3 rounded-lg bg-' + action.color + '-100'">
                <mat-icon [class]="'text-' + action.color + '-600 text-2xl'">
                  {{ action.icon }}
                </mat-icon>
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-semibold text-gray-900 mb-2">
                  {{ action.title }}
                </h3>
                <p class="text-gray-600 text-sm leading-relaxed">
                  {{ action.description }}
                </p>
                <div class="mt-4">
                  <button
                    mat-button
                    [color]="action.color === 'blue' ? 'primary' : action.color === 'green' ? 'accent' : 'warn'"
                    [disabled]="action.disabled">
                    <mat-icon>arrow_forward</mat-icon>
                    Get Started
                  </button>
                </div>
              </div>
            </div>
          </mat-card>
        </div>
      </div>

      <!-- Recent Templates -->
      <div class="recent-templates">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-2xl font-bold text-gray-900">Recent Templates</h2>
          <button
            mat-button
            color="primary"
            routerLink="/template-editor">
            <mat-icon>add</mat-icon>
            Create New Template
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <mat-card
            *ngFor="let template of recentTemplates$ | async"
            class="template-card p-6 hover:shadow-lg transition-shadow">

            <div class="flex items-start justify-between mb-4">
              <h3 class="text-lg font-semibold text-gray-900 truncate">
                {{ template.name }}
              </h3>
              <mat-chip
                [class]="getStatusChipClass(template.status)"
                class="ml-2">
                {{ template.status }}
              </mat-chip>
            </div>

            <p class="text-gray-600 text-sm mb-4 line-clamp-2">
              {{ template.description }}
            </p>

            <div class="flex flex-wrap gap-2 mb-4">
              <mat-chip
                *ngFor="let tag of template.metadata?.tags?.slice(0, 3)"
                class="text-xs">
                {{ tag }}
              </mat-chip>
            </div>

            <div class="flex items-center justify-between text-sm text-gray-500 mb-4">
              <span>{{ template.variables.length }} variables</span>
              <span>{{ template.updatedAt | date:'short' }}</span>
            </div>

            <div class="flex space-x-2">
              <button
                mat-button
                color="primary"
                [routerLink]="['/template-editor', template.id]"
                class="flex-1">
                <mat-icon>edit</mat-icon>
                Edit
              </button>
              <button
                mat-button
                color="accent"
                [routerLink]="['/document-generator']"
                [queryParams]="{templateId: template.id}"
                class="flex-1">
                <mat-icon>play_arrow</mat-icon>
                Use
              </button>
            </div>
          </mat-card>

          <!-- Empty State -->
          <mat-card
            *ngIf="(recentTemplates$ | async)?.length === 0"
            class="empty-state p-8 text-center border-2 border-dashed border-gray-300">
            <mat-icon class="text-gray-400 text-6xl mb-4">description</mat-icon>
            <h3 class="text-lg font-medium text-gray-900 mb-2">No templates yet</h3>
            <p class="text-gray-600 mb-4">Create your first template to get started</p>
            <button
              mat-raised-button
              color="primary"
              routerLink="/template-editor">
              <mat-icon>add</mat-icon>
              Create Template
            </button>
          </mat-card>
        </div>
      </div>

      <!-- Recent Activity Feed -->
      <div class="recent-activity mt-12">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
        <mat-card class="activity-feed p-6">
          <div class="space-y-4">
            <div class="activity-item flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <mat-icon class="text-blue-500">description</mat-icon>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  Template "Invoice Template" was updated
                </p>
                <p class="text-xs text-gray-500">2 hours ago</p>
              </div>
            </div>

            <div class="activity-item flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <mat-icon class="text-green-500">assignment</mat-icon>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  Document generated successfully
                </p>
                <p class="text-xs text-gray-500">1 day ago</p>
              </div>
            </div>

            <div class="activity-item flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              <mat-icon class="text-purple-500">add</mat-icon>
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900">
                  New template "Report Template" created
                </p>
                <p class="text-xs text-gray-500">2 days ago</p>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .stat-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
      border: 1px solid #e2e8f0;
    }

    .action-card:hover {
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }

    .template-card {
      background: linear-gradient(135deg, #ffffff 0%, #f9fafb 100%);
      border: 1px solid #e5e7eb;
    }

    .line-clamp-2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .empty-state {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    }

    .activity-feed {
      background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    }

    .activity-item {
      transition: all 0.2s ease-in-out;
    }

    .activity-item:hover {
      background: #e5e7eb !important;
      transform: translateX(4px);
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .dashboard-header h1 {
        font-size: 2rem;
      }

      .dashboard-header p {
        font-size: 1rem;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {

  // Signals para estado reactivo
  stats = signal<DashboardStats>({
    totalTemplates: 0,
    activeTemplates: 0,
    draftTemplates: 0,
    recentDocuments: 0,
    storageUsed: 0,
    storagePercentage: 0
  });

  // Observables
  recentTemplates$: Observable<Template[]>;

  // Acciones rápidas
  quickActions: QuickAction[] = [
    {
      title: 'Generate Document',
      description: 'Create PDF documents from your templates and XML data instantly',
      icon: 'description',
      route: '/document-generator',
      color: 'blue'
    },
    {
      title: 'Create Template',
      description: 'Design new HTML templates with Handlebars support',
      icon: 'edit',
      route: '/template-editor',
      color: 'green'
    },
    {
      title: 'Preview Documents',
      description: 'View and test your templates with sample data',
      icon: 'preview',
      route: '/preview',
      color: 'purple'
    }
  ];

  constructor(
    private templateService: TemplateService,
    private storageService: StorageService,
    private router: Router
  ) {
    this.recentTemplates$ = this.templateService.getTemplates().pipe(
      map(templates => templates.slice(0, 6)) // Mostrar solo las 6 más recientes
    );
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  /**
   * Carga los datos del dashboard
   */
  private loadDashboardData(): void {
    // Combinar múltiples observables para obtener estadísticas
    combineLatest([
      this.templateService.getTemplateStats(),
      this.storageService.getStorageInfo(),
      this.storageService.loadGeneratedDocuments()
    ]).subscribe(([templateStats, storageInfo, documents]) => {
      this.stats.set({
        totalTemplates: templateStats.total,
        activeTemplates: templateStats.active,
        draftTemplates: templateStats.draft,
        recentDocuments: documents.length,
        storageUsed: storageInfo.used,
        storagePercentage: storageInfo.percentage
      });
    });
  }

  /**
   * Navega a una ruta específica
   */
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  /**
   * Obtiene la clase CSS para el chip de estado
   */
  getStatusChipClass(status: TemplateStatus): string {
    switch (status) {
      case TemplateStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case TemplateStatus.DRAFT:
        return 'bg-orange-100 text-orange-800';
      case TemplateStatus.INACTIVE:
        return 'bg-gray-100 text-gray-800';
      case TemplateStatus.ARCHIVED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Actualiza las estadísticas manualmente
   */
  refreshStats(): void {
    this.loadDashboardData();
  }
}
