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
    loadComponent: () => import('./features/template-editor/template-editor.component')
      .then(m => m.TemplateEditorComponent),
    title: 'Template Editor - PrexView Clone'
  },
  {
    path: 'template-editor/:id',
    loadComponent: () => import('./features/template-editor/template-editor.component')
      .then(m => m.TemplateEditorComponent),
    title: 'Edit Template - PrexView Clone'
  },
  {
    path: '**',
    redirectTo: '/dashboard'
  }
];
