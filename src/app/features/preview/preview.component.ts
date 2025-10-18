import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Preview Component - En construcción
 */
@Component({
  selector: 'app-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">
          🚧 Preview - En Construcción
        </h1>
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <p class="text-gray-600 text-lg">
            Este componente se implementará próximamente para vista previa.
          </p>
        </div>
      </div>
    </div>
  `
})
export class PreviewComponent { }
