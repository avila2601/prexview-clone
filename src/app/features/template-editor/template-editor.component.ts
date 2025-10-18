import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
// MatSnackBar no disponible en esta versión de Angular Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';
import { StorageService } from '../../core/services/storage.service';
import { Template, TemplateStatus, VariableType } from '../../core/models';

declare var monaco: any;

interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required: boolean;
}

interface PreviewData {
  [key: string]: any;
}

/**
 * Template Editor Component - Editor profesional con Monaco Editor
 * Funcionalidades: Edición HTML, Handlebars, Preview, Variables
 */
@Component({
  selector: 'app-template-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    // MatSnackBarModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatExpansionModule,
    MatTabsModule,
    MatProgressBarModule,
    MatDialogModule
  ],
  template: `
    <div class="template-editor-container h-screen flex flex-col bg-gray-50">

      <!-- Toolbar -->
      <mat-toolbar class="editor-toolbar bg-white shadow-sm border-b">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-4">
            <button mat-icon-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="text-lg font-semibold text-gray-900">
                {{ isEditMode() ? 'Edit Template' : 'Create Template' }}
              </h1>
              <p class="text-sm text-gray-500" *ngIf="currentTemplate()">
                {{ currentTemplate()?.name }}
              </p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <mat-progress-bar
              *ngIf="isSaving()"
              mode="indeterminate"
              class="w-24">
            </mat-progress-bar>

            <button
              mat-button
              color="accent"
              (click)="previewTemplate()"
              [disabled]="!templateForm.valid">
              <mat-icon>preview</mat-icon>
              Preview
            </button>

            <button
              mat-raised-button
              color="primary"
              (click)="saveTemplate()"
              [disabled]="!templateForm.valid || isSaving()">
              <mat-icon>save</mat-icon>
              {{ isSaving() ? 'Saving...' : 'Save' }}
            </button>
          </div>
        </div>
      </mat-toolbar>

      <!-- Main Content -->
      <div class="flex-1 flex overflow-hidden">

        <!-- Sidebar -->
        <mat-sidenav-container class="flex-1">
          <mat-sidenav
            #sidenav
            mode="side"
            opened="true"
            class="w-80 bg-white border-r">

            <div class="p-4 space-y-6">

              <!-- Template Info -->
              <mat-card class="template-info">
                <mat-card-header>
                  <mat-card-title class="text-lg">Template Info</mat-card-title>
                </mat-card-header>
                <mat-card-content class="space-y-4">
                  <form [formGroup]="templateForm" class="space-y-4">

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Template Name</mat-label>
                      <input
                        matInput
                        formControlName="name"
                        placeholder="Enter template name"
                        required>
                      <mat-error *ngIf="templateForm.get('name')?.hasError('required')">
                        Name is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Description</mat-label>
                      <textarea
                        matInput
                        formControlName="description"
                        placeholder="Template description"
                        rows="3">
                      </textarea>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Category</mat-label>
                      <mat-select formControlName="category">
                        <mat-option value="invoice">Invoice</mat-option>
                        <mat-option value="report">Report</mat-option>
                        <mat-option value="letter">Letter</mat-option>
                        <mat-option value="certificate">Certificate</mat-option>
                        <mat-option value="other">Other</mat-option>
                      </mat-select>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Status</mat-label>
                      <mat-select formControlName="status">
                        <mat-option [value]="TemplateStatus.DRAFT">Draft</mat-option>
                        <mat-option [value]="TemplateStatus.ACTIVE">Active</mat-option>
                        <mat-option [value]="TemplateStatus.INACTIVE">Inactive</mat-option>
                      </mat-select>
                    </mat-form-field>

                  </form>
                </mat-card-content>
              </mat-card>

              <!-- Variables Panel -->
              <mat-expansion-panel class="variables-panel" expanded>
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon>code</mat-icon>
                    Variables ({{ detectedVariables().length }})
                  </mat-panel-title>
                </mat-expansion-panel-header>

                <div class="variables-content space-y-3">
                  <div
                    *ngFor="let variable of detectedVariables()"
                    class="variable-item p-3 bg-gray-50 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <code class="text-sm font-mono text-blue-600">
                        {{ '{{' }}{{ variable.name }}{{ '}}' }}
                      </code>
                      <mat-chip class="text-xs">{{ variable.type }}</mat-chip>
                    </div>
                    <p class="text-xs text-gray-600" *ngIf="variable.description">
                      {{ variable.description }}
                    </p>
                  </div>

                  <div *ngIf="detectedVariables().length === 0" class="text-center py-4">
                    <mat-icon class="text-gray-400 text-3xl mb-2">code_off</mat-icon>
                    <p class="text-sm text-gray-500">No variables detected</p>
                    <p class="text-xs text-gray-400">Use {{ '{{' }}variableName{{ '}}' }} syntax</p>
                  </div>
                </div>
              </mat-expansion-panel>

              <!-- Sample Data -->
              <mat-expansion-panel class="sample-data-panel">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <mat-icon>data_object</mat-icon>
                    Sample Data
                  </mat-panel-title>
                </mat-expansion-panel-header>

                <div class="sample-data-content">
                  <mat-form-field appearance="outline" class="w-full">
                    <mat-label>JSON Sample Data</mat-label>
                    <textarea
                      matInput
                      [(ngModel)]="sampleDataJson"
                      placeholder='{"name": "John Doe", "amount": 1000}'
                      rows="6"
                      class="font-mono text-sm">
                    </textarea>
                  </mat-form-field>

                  <button
                    mat-button
                    color="primary"
                    (click)="updatePreview()"
                    class="w-full">
                    <mat-icon>refresh</mat-icon>
                    Update Preview
                  </button>
                </div>
              </mat-expansion-panel>

            </div>
          </mat-sidenav>

          <!-- Main Editor Area -->
          <mat-sidenav-content class="flex flex-col">

            <mat-tab-group class="flex-1 flex flex-col" (selectedTabChange)="onTabChange($event)">

              <!-- HTML Editor Tab -->
              <mat-tab label="HTML Editor">
                <div class="editor-container flex-1 relative">
                  <div
                    #monacoEditor
                    class="w-full h-full">
                  </div>
                </div>
              </mat-tab>

              <!-- Live Preview Tab -->
              <mat-tab label="Live Preview">
                <div class="preview-container flex-1 p-6 bg-white overflow-auto">
                  <div class="preview-header mb-4 pb-4 border-b">
                    <div class="flex items-center justify-between">
                      <h3 class="text-lg font-semibold text-gray-900">Preview</h3>
                      <div class="flex items-center space-x-2">
                        <mat-icon class="text-green-500" *ngIf="previewHtml()">check_circle</mat-icon>
                        <mat-icon class="text-red-500" *ngIf="!previewHtml()">error</mat-icon>
                        <span class="text-sm text-gray-500">
                          {{ previewHtml() ? 'Rendered successfully' : 'Compilation error' }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    class="preview-content border rounded-lg p-4 bg-white shadow-sm"
                    [innerHTML]="previewHtml()">
                  </div>

                  <div *ngIf="!previewHtml()" class="text-center py-8">
                    <mat-icon class="text-gray-400 text-4xl mb-4">preview</mat-icon>
                    <p class="text-gray-500">Preview will appear here</p>
                    <p class="text-sm text-gray-400">Start typing in the HTML editor</p>
                  </div>
                </div>
              </mat-tab>

              <!-- Split View Tab -->
              <mat-tab label="Split View">
                <div class="split-view-container flex-1 flex">
                  <div class="editor-half w-1/2 border-r">
                    <div
                      #monacoEditorSplit
                      class="w-full h-full">
                    </div>
                  </div>
                  <div class="preview-half w-1/2 p-4 bg-white overflow-auto">
                    <div
                      class="preview-content"
                      [innerHTML]="previewHtml()">
                    </div>
                  </div>
                </div>
              </mat-tab>

            </mat-tab-group>

          </mat-sidenav-content>
        </mat-sidenav-container>

      </div>
    </div>
  `,
  styles: [`
    .template-editor-container {
      background: #f8fafc;
    }

    .editor-toolbar {
      border-bottom: 1px solid #e2e8f0;
      min-height: 64px;
    }

    .editor-container,
    .editor-half {
      background: #1e1e1e;
    }

    .preview-container,
    .preview-half {
      background: #ffffff;
    }

    .variable-item {
      transition: all 0.2s ease-in-out;
    }

    .variable-item:hover {
      background: #e5e7eb !important;
      transform: translateX(4px);
    }

    .variables-panel,
    .sample-data-panel {
      box-shadow: none !important;
      border: 1px solid #e5e7eb;
    }

    .template-info {
      box-shadow: none !important;
      border: 1px solid #e5e7eb;
    }

    .preview-content {
      min-height: 400px;
    }

    ::ng-deep .mat-mdc-tab-group {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      flex: 1;
      display: flex;
    }

    ::ng-deep .mat-mdc-tab-body {
      flex: 1;
      display: flex;
    }

    ::ng-deep .mat-mdc-tab-body-content {
      flex: 1;
      display: flex;
      overflow: hidden;
    }

    ::ng-deep .monaco-editor {
      font-family: 'Fira Code', 'Consolas', 'Monaco', monospace !important;
    }

    .split-view-container {
      height: 100%;
    }

    .editor-half,
    .preview-half {
      height: 100%;
    }
  `]
})
export class TemplateEditorComponent implements OnInit, OnDestroy {

  @ViewChild('monacoEditor', { static: false }) monacoEditorElement!: ElementRef;
  @ViewChild('monacoEditorSplit', { static: false }) monacoEditorSplitElement!: ElementRef;

  // Signals para estado reactivo
  currentTemplate = signal<Template | null>(null);
  isSaving = signal(false);
  detectedVariables = signal<TemplateVariable[]>([]);
  previewHtml = signal<SafeHtml>('');

  // Form y estado
  templateForm: FormGroup;
  monacoEditor: any;
  monacoEditorSplit: any;
  sampleDataJson = '{\n  "name": "John Doe",\n  "company": "ACME Corp",\n  "amount": 1500.00,\n  "date": "2025-10-18"\n}';

  // Lifecycle
  private destroy$ = new Subject<void>();

  // Computed properties
  isEditMode = computed(() => !!this.currentTemplate());

  // Enum reference for template
  TemplateStatus = TemplateStatus;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private storageService: StorageService,
    // private snackBar: MatSnackBar,
    private sanitizer: DomSanitizer
  ) {
    this.templateForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeEditor();
    this.setupFormSubscriptions();
    this.loadTemplate();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.monacoEditor) {
      this.monacoEditor.dispose();
    }
    if (this.monacoEditorSplit) {
      this.monacoEditorSplit.dispose();
    }
  }

  /**
   * Crea el formulario reactivo
   */
  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['other'],
      status: [TemplateStatus.DRAFT],
      content: ['<!DOCTYPE html>\n<html>\n<head>\n  <title>{{title}}</title>\n</head>\n<body>\n  <h1>Hello {{name}}!</h1>\n  <p>Welcome to your template.</p>\n</body>\n</html>']
    });
  }

  /**
   * Inicializa Monaco Editor
   */
  private async initializeEditor(): Promise<void> {
    try {
      // Cargar Monaco Editor
      if (typeof monaco === 'undefined') {
        await this.loadMonacoEditor();
      }

      // Configurar tema y lenguaje
      monaco.editor.defineTheme('custom-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'delimiter.handlebars', foreground: '#ff6b6b' },
          { token: 'keyword.handlebars', foreground: '#4ecdc4' },
        ],
        colors: {
          'editor.background': '#1e1e1e',
          'editor.foreground': '#d4d4d4'
        }
      });

      setTimeout(() => {
        this.createMainEditor();
      }, 100);

    } catch (error) {
      console.error('Error initializing Monaco Editor:', error);
      console.log('Error loading editor');
    }
  }

  /**
   * Carga Monaco Editor dinámicamente
   */
  private loadMonacoEditor(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof monaco !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';
      script.onload = () => {
        (window as any).require.config({
          paths: {
            'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'
          }
        });
        (window as any).require(['vs/editor/editor.main'], () => {
          resolve();
        });
      };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Crea el editor principal
   */
  private createMainEditor(): void {
    if (this.monacoEditorElement) {
      this.monacoEditor = monaco.editor.create(this.monacoEditorElement.nativeElement, {
        value: this.templateForm.get('content')?.value || '',
        language: 'html',
        theme: 'custom-dark',
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'on',
        roundedSelection: false,
        scrollBeyondLastLine: false,
        minimap: { enabled: true },
        folding: true,
        wordWrap: 'on',
        suggestions: {
          enabled: true
        }
      });

      // Listener para cambios
      this.monacoEditor.onDidChangeModelContent(() => {
        const value = this.monacoEditor.getValue();
        this.templateForm.patchValue({ content: value }, { emitEvent: false });
        this.detectVariables(value);
        this.updatePreview();
      });
    }
  }

  /**
   * Configura subscripciones del formulario
   */
  private setupFormSubscriptions(): void {
    // Auto-save con debounce
    this.templateForm.valueChanges
      .pipe(
        debounceTime(2000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.templateForm.valid && this.isEditMode()) {
          this.autoSave();
        }
      });
  }

  /**
   * Carga plantilla para edición
   */
  private loadTemplate(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.templateService.templates$.subscribe({
        next: (templates) => {
          const template = templates.find(t => t.id === templateId);
          if (template) {
            this.currentTemplate.set(template);
            this.templateForm.patchValue({
              name: template.name,
              description: template.description,
              category: template.metadata?.category || 'other',
              status: template.status,
              content: template.htmlContent
            });

            if (this.monacoEditor) {
              this.monacoEditor.setValue(template.htmlContent);
            }
            this.detectVariables(template.htmlContent);
          }
        },
        error: (error: any) => {
          console.error('Error loading template:', error);
          console.log('Error loading template');
        }
      });
    }
  }

  /**
   * Detecta variables en el contenido
   */
  private detectVariables(content: string): void {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: TemplateVariable[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();
      if (!seen.has(variableName) && !variableName.includes(' ')) {
        seen.add(variableName);
        variables.push({
          name: variableName,
          type: this.inferVariableType(variableName),
          required: true,
          description: this.generateVariableDescription(variableName)
        });
      }
    }

    this.detectedVariables.set(variables);
  }

  /**
   * Infiere el tipo de variable
   */
  private inferVariableType(name: string): VariableType {
    const lowerName = name.toLowerCase();

    if (lowerName.includes('date') || lowerName.includes('time')) {
      return VariableType.DATE;
    }
    if (lowerName.includes('amount') || lowerName.includes('price') || lowerName.includes('total')) {
      return VariableType.NUMBER;
    }
    if (lowerName.includes('email')) {
      return VariableType.EMAIL;
    }
    if (lowerName.includes('url') || lowerName.includes('link')) {
      return VariableType.URL;
    }

    return VariableType.STRING;
  }

  /**
   * Genera descripción automática para variables
   */
  private generateVariableDescription(name: string): string {
    const descriptions: { [key: string]: string } = {
      'name': 'Customer or user name',
      'company': 'Company name',
      'email': 'Email address',
      'phone': 'Phone number',
      'address': 'Physical address',
      'date': 'Date value',
      'amount': 'Monetary amount',
      'total': 'Total amount',
      'title': 'Document title'
    };

    return descriptions[name.toLowerCase()] || `Dynamic value for ${name}`;
  }

  /**
   * Actualiza la vista previa
   */
  updatePreview(): void {
    console.log('🔍 Starting updatePreview...');
    try {
      const content = this.templateForm.get('content')?.value || '';
      const sampleData = JSON.parse(this.sampleDataJson);

      console.log('📝 HTML Content:', content);
      console.log('📊 Sample Data:', sampleData);

      this.templateService.compileTemplate(content, sampleData).subscribe({
        next: (rendered: string) => {
          console.log('✅ Compilation successful:', rendered);
          this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(rendered));
        },
        error: (error: any) => {
          console.error('❌ Preview error:', error);
          // Mostrar error detallado en el preview
          const errorMessage = `
            <div style="color: red; padding: 20px; border: 2px solid red; border-radius: 8px; background: #ffeaea;">
              <h3>🚨 Compilation Error</h3>
              <p><strong>Error:</strong> ${error.message || 'Unknown compilation error'}</p>
              <hr style="margin: 15px 0;">
              <h4>Troubleshooting:</h4>
              <ul>
                <li>Check your Handlebars syntax: <code>{{'{{'}}variable{{'}}'}}</code></li>
                <li>Verify JSON data format in Sample Data panel</li>
                <li>Make sure variable names match between HTML and JSON</li>
              </ul>
              <hr style="margin: 15px 0;">
              <h4>Current Template:</h4>
              <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto;">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
            </div>
          `;
          this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(errorMessage));
        }
      });
    } catch (jsonError: any) {
      console.error('❌ JSON parse error:', jsonError);
      const jsonErrorMessage = `
        <div style="color: orange; padding: 20px; border: 2px solid orange; border-radius: 8px; background: #fff4e6;">
          <h3>⚠️ JSON Parse Error</h3>
          <p><strong>Error:</strong> Invalid JSON in Sample Data</p>
          <p><strong>Details:</strong> ${jsonError.message}</p>
          <hr style="margin: 15px 0;">
          <h4>Fix your JSON format:</h4>
          <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">{
  "title": "Your Title",
  "name": "Your Name",
  "variable": "value"
}</pre>
        </div>
      `;
      this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(jsonErrorMessage));
    }
  }

  /**
   * Guarda la plantilla
   */
  async saveTemplate(): Promise<void> {
    if (!this.templateForm.valid) return;

    this.isSaving.set(true);

    try {
      const formValue = this.templateForm.value;
      const templateData: Partial<Template> = {
        name: formValue.name,
        description: formValue.description,
        htmlContent: formValue.content,
        status: formValue.status,
        variables: this.detectedVariables(),
        metadata: {
          category: formValue.category,
          tags: [],
          version: '1.0.0'
        }
      };

      if (this.isEditMode()) {
        const updated = await this.templateService.saveTemplate({
          ...templateData,
          id: this.currentTemplate()!.id
        }).toPromise();
        this.currentTemplate.set(updated!);
      } else {
        const created = await this.templateService.saveTemplate(templateData).toPromise();
        this.currentTemplate.set(created!);
        this.router.navigate(['/template-editor', created!.id], { replaceUrl: true });
      }

      console.log('Template saved successfully');
    } catch (error) {
      console.error('Save error:', error);
      console.log('Error saving template');
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Auto-guardado
   */
  private async autoSave(): Promise<void> {
    if (this.isEditMode() && this.templateForm.valid) {
      try {
        const formValue = this.templateForm.value;
        await this.templateService.saveTemplate({
          id: this.currentTemplate()!.id,
          htmlContent: formValue.content,
          variables: this.detectedVariables()
        }).toPromise();
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }
  }

  /**
   * Maneja cambio de pestañas
   */
  onTabChange(event: any): void {
    if (event.index === 2) { // Split view
      setTimeout(() => {
        if (this.monacoEditorSplitElement && !this.monacoEditorSplit) {
          this.monacoEditorSplit = monaco.editor.create(this.monacoEditorSplitElement.nativeElement, {
            value: this.templateForm.get('content')?.value || '',
            language: 'html',
            theme: 'custom-dark',
            automaticLayout: true,
            fontSize: 14
          });

          this.monacoEditorSplit.onDidChangeModelContent(() => {
            const value = this.monacoEditorSplit.getValue();
            this.templateForm.patchValue({ content: value }, { emitEvent: false });
            if (this.monacoEditor) {
              this.monacoEditor.setValue(value);
            }
            this.detectVariables(value);
            this.updatePreview();
          });
        }
      }, 100);
    }
  }

  /**
   * Vista previa en ventana nueva
   */
  previewTemplate(): void {
    this.updatePreview();
    // Aquí podrías abrir modal o ventana nueva para preview
  }

  /**
   * Volver al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
