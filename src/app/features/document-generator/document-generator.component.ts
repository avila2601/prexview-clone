import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Document Generator Component - En construcción
 */
@Component({
  selector: 'app-document-generator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gray-50 p-6">
      <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold text-gray-900 mb-6">
          🚧 Document Generator - En Construcción
        </h1>
        <div class="bg-white rounded-lg shadow p-8 text-center">
          <p class="text-gray-600 text-lg">
            Este componente se implementará próximamente para generar PDFs.
          </p>
        </div>
      </div>
    </div>
  `
})
export class DocumentGeneratorComponent { }
