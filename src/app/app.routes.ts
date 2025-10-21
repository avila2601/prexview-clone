import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent),
    title: 'Dashboard - PrexView Clone'
  },
  {
    path: 'template-editor',
    loadComponent: () => import('./features/template-editor/template-editor-prexview.component')
      .then(m => m.TemplateEditorPrexviewComponent),
    title: 'Template Editor - PrexView Clone'
  },
  {
    path: 'template-editor/:id',
    loadComponent: () => import('./features/template-editor/template-editor-prexview.component')
      .then(m => m.TemplateEditorPrexviewComponent),
    title: 'Edit Template - PrexView Clone'
  },
  {
    path: 'document-generator',
    loadComponent: () => import('./features/document-generator/document-generator.component')
      .then(m => m.DocumentGeneratorComponent),
    title: 'Document Generator - PrexView Clone'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
