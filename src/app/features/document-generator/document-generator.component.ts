import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';
import { XmlParserService } from '../../core/services/xml-parser.service';
import { PdfGeneratorService } from '../../core/services/pdf-generator.service';
import { StorageService } from '../../core/services/storage.service';
import { Template, DocumentData, GeneratedDocument } from '../../core/models';

interface ProcessingStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

/**
 * Document Generator Component - Funcionalidad core
 * Combina plantillas con datos XML para generar PDFs
 */
@Component({
  selector: 'app-document-generator',
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
    MatStepperModule,
    MatTabsModule,
    MatProgressBarModule,
    MatChipsModule,
    MatToolbarModule,
    MatDividerModule
  ],
  template: `
    <div class="document-generator min-h-screen bg-gray-50">

      <!-- Header -->
      <mat-toolbar class="bg-white shadow-sm border-b">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center space-x-4">
            <button mat-icon-button (click)="goBack()">
              <mat-icon>arrow_back</mat-icon>
            </button>
            <div>
              <h1 class="text-xl font-semibold">Document Generator</h1>
              <p class="text-sm text-gray-600">Generate PDFs from templates and XML data</p>
            </div>
          </div>

          <div class="flex items-center space-x-2">
            <button
              mat-button
              color="accent"
              (click)="resetProcess()"
              [disabled]="isProcessing()">
              <mat-icon>refresh</mat-icon>
              Reset
            </button>
          </div>
        </div>
      </mat-toolbar>

      <div class="container mx-auto p-6 max-w-7xl">

        <!-- Main Stepper -->
        <mat-horizontal-stepper
          #stepper
          class="bg-white rounded-lg shadow-sm mb-6"
          [linear]="true">

          <!-- Step 1: Select Template -->
          <mat-step
            [stepControl]="stepOneForm"
            label="Select Template"
            [completed]="selectedTemplate() !== null">

            <div class="p-6">
              <h3 class="text-lg font-medium mb-4">Choose a Template</h3>

              <form [formGroup]="stepOneForm">
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  <mat-card
                    *ngFor="let template of availableTemplates$ | async"
                    class="template-card cursor-pointer hover:shadow-lg transition-shadow"
                    [class.selected]="selectedTemplate()?.id === template.id"
                    (click)="selectTemplate(template)">

                    <mat-card-header>
                      <mat-card-title class="text-base">{{ template.name }}</mat-card-title>
                      <mat-card-subtitle>{{ template.description }}</mat-card-subtitle>
                    </mat-card-header>

                    <mat-card-content>
                      <div class="flex flex-wrap gap-1 mb-3">
                        <mat-chip *ngFor="let tag of template.metadata?.tags?.slice(0, 3)" class="text-xs">
                          {{ tag }}
                        </mat-chip>
                      </div>
                      <p class="text-sm text-gray-600">
                        {{ template.variables.length }} variables •
                        {{ template.status }}
                      </p>
                    </mat-card-content>

                    <mat-card-actions>
                      <button
                        mat-button
                        color="primary"
                        [disabled]="selectedTemplate()?.id === template.id">
                        {{ selectedTemplate()?.id === template.id ? 'Selected' : 'Select' }}
                      </button>
                    </mat-card-actions>
                  </mat-card>
                </div>

                <div class="flex justify-end">
                  <button
                    mat-raised-button
                    color="primary"
                    matStepperNext
                    [disabled]="!selectedTemplate()">
                    Next: Provide Data
                  </button>
                </div>
              </form>
            </div>
          </mat-step>

          <!-- Step 2: Provide XML Data -->
          <mat-step
            [stepControl]="stepTwoForm"
            label="Provide Data"
            [completed]="xmlData() !== ''">

            <div class="p-6">
              <h3 class="text-lg font-medium mb-4">Provide XML Data</h3>

              <form [formGroup]="stepTwoForm">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  <!-- XML Input -->
                  <div>
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>XML Data</mat-label>
                      <textarea
                        matInput
                        formControlName="xmlData"
                        placeholder="Paste your XML data here..."
                        rows="20"
                        class="font-mono text-sm">
                      </textarea>
                      <mat-hint>Provide XML data that matches your template variables</mat-hint>
                    </mat-form-field>

                    <div class="mt-4 space-y-2">
                      <button
                        mat-button
                        color="accent"
                        (click)="validateXml()"
                        [disabled]="!stepTwoForm.get('xmlData')?.value">
                        <mat-icon>check_circle</mat-icon>
                        Validate XML
                      </button>

                      <button
                        mat-button
                        (click)="loadSampleXml()">
                        <mat-icon>code</mat-icon>
                        Load Sample XML
                      </button>
                    </div>
                  </div>

                  <!-- Template Variables -->
                  <div>
                    <h4 class="font-medium mb-3">Required Variables</h4>
                    <div class="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                      <div
                        *ngFor="let variable of selectedTemplate()?.variables || []"
                        class="mb-3 p-3 bg-white rounded border">
                        <div class="flex items-center justify-between mb-1">
                          <code class="text-sm font-mono text-blue-600">{{ '{{' }}{{ variable.name }}{{ '}}' }}</code>
                          <mat-chip class="text-xs">{{ variable.type }}</mat-chip>
                        </div>
                        <p class="text-xs text-gray-600" *ngIf="variable.description">
                          {{ variable.description }}
                        </p>
                        <div class="mt-2">
                          <span class="text-xs px-2 py-1 rounded"
                                [class]="variable.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'">
                            {{ variable.required ? 'Required' : 'Optional' }}
                          </span>
                        </div>
                      </div>

                      <div *ngIf="!selectedTemplate()?.variables?.length" class="text-center py-8 text-gray-500">
                        <mat-icon class="text-4xl mb-2">code_off</mat-icon>
                        <p>No variables detected in template</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Validation Results -->
                <div *ngIf="validationResult()" class="mt-6">
                  <mat-card [class]="validationResult()?.isValid ? 'border-green-200' : 'border-red-200'">
                    <mat-card-header>
                      <mat-card-title class="flex items-center">
                        <mat-icon [class]="validationResult()?.isValid ? 'text-green-600' : 'text-red-600'">
                          {{ validationResult()?.isValid ? 'check_circle' : 'error' }}
                        </mat-icon>
                        <span class="ml-2">
                          {{ validationResult()?.isValid ? 'XML Valid' : 'XML Invalid' }}
                        </span>
                      </mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div *ngIf="!validationResult()?.isValid" class="text-red-600">
                        <p><strong>Errors:</strong></p>
                        <ul class="list-disc list-inside">
                          <li *ngFor="let error of validationResult()?.errors">{{ error.message }}</li>
                        </ul>
                      </div>
                      <div *ngIf="validationResult()?.isValid" class="text-green-600">
                        <p>XML is well-formed and ready for processing</p>
                      </div>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="flex justify-between mt-6">
                  <button mat-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button
                    mat-raised-button
                    color="primary"
                    matStepperNext
                    [disabled]="!xmlData() || !validationResult()?.isValid">
                    Next: Generate PDF
                  </button>
                </div>
              </form>
            </div>
          </mat-step>

          <!-- Step 3: Generate PDF -->
          <mat-step label="Generate PDF">
            <div class="p-6">
              <h3 class="text-lg font-medium mb-4">Generate Document</h3>

              <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

                <!-- Preview -->
                <div>
                  <h4 class="font-medium mb-3">Preview</h4>
                  <div class="border rounded-lg p-4 bg-white min-h-96 max-h-96 overflow-auto">
                    <div [innerHTML]="previewHtml()"></div>

                    <div *ngIf="!previewHtml()" class="text-center py-16 text-gray-500">
                      <mat-icon class="text-4xl mb-2">preview</mat-icon>
                      <p>Preview will appear here</p>
                      <button
                        mat-button
                        color="primary"
                        (click)="generatePreview()"
                        [disabled]="isProcessing()">
                        Generate Preview
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Process Status -->
                <div>
                  <h4 class="font-medium mb-3">Generation Process</h4>
                  <div class="space-y-3">
                    <div
                      *ngFor="let step of processingSteps()"
                      class="flex items-center p-3 rounded-lg border"
                      [class]="getStepClass(step.status)">

                      <mat-icon class="mr-3" [class]="getStepIconClass(step.status)">
                        {{ getStepIcon(step.status) }}
                      </mat-icon>

                      <div class="flex-1">
                        <p class="font-medium">{{ step.title }}</p>
                        <p class="text-sm text-gray-600">{{ step.description }}</p>
                        <p *ngIf="step.error" class="text-sm text-red-600 mt-1">{{ step.error }}</p>
                      </div>

                      <mat-progress-bar
                        *ngIf="step.status === 'processing'"
                        mode="indeterminate"
                        class="w-16">
                      </mat-progress-bar>
                    </div>
                  </div>

                  <div class="mt-6 space-y-3">
                    <button
                      mat-raised-button
                      color="primary"
                      (click)="generateDocument()"
                      [disabled]="isProcessing() || !previewHtml()"
                      class="w-full">
                      <mat-icon>picture_as_pdf</mat-icon>
                      {{ isProcessing() ? 'Generating...' : 'Generate PDF' }}
                    </button>

                    <button
                      *ngIf="generatedDocument()"
                      mat-raised-button
                      color="accent"
                      (click)="downloadPdf()"
                      class="w-full">
                      <mat-icon>download</mat-icon>
                      Download PDF
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex justify-between mt-6">
                <button mat-button matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button
                  mat-button
                  color="primary"
                  (click)="resetProcess()">
                  <mat-icon>refresh</mat-icon>
                  Generate Another
                </button>
              </div>
            </div>
          </mat-step>
        </mat-horizontal-stepper>
      </div>
    </div>
  `,
  styles: [`
    .document-generator {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }

    .template-card {
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .template-card:hover {
      box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .template-card.selected {
      border-color: #3f51b5;
      background: linear-gradient(135deg, #e8eaf6 0%, #f3e5f5 100%);
    }

    .step-pending {
      background: #f9f9f9;
      border-color: #e0e0e0;
    }

    .step-processing {
      background: #fff3e0;
      border-color: #ffb74d;
    }

    .step-completed {
      background: #e8f5e8;
      border-color: #4caf50;
    }

    .step-error {
      background: #ffebee;
      border-color: #f44336;
    }

    ::ng-deep .mat-horizontal-stepper-header {
      pointer-events: none;
    }

    ::ng-deep .mat-horizontal-stepper-header.cdk-keyboard-focused,
    ::ng-deep .mat-horizontal-stepper-header.cdk-program-focused,
    ::ng-deep .mat-horizontal-stepper-header:hover {
      background: transparent;
    }

    .container {
      animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class DocumentGeneratorComponent implements OnInit, OnDestroy {

  // Signals para estado reactivo
  selectedTemplate = signal<Template | null>(null);
  xmlData = signal<string>('');
  validationResult = signal<any>(null);
  previewHtml = signal<SafeHtml>('');
  generatedDocument = signal<GeneratedDocument | null>(null);
  isProcessing = signal<boolean>(false);
  processingSteps = signal<ProcessingStep[]>([]);

  // Forms
  stepOneForm: FormGroup;
  stepTwoForm: FormGroup;

  // Observables
  availableTemplates$: any;

  // Lifecycle
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private xmlParserService: XmlParserService,
    private pdfGeneratorService: PdfGeneratorService,
    private storageService: StorageService,
    private sanitizer: DomSanitizer
  ) {
    this.stepOneForm = this.fb.group({
      templateId: ['', Validators.required]
    });

    this.stepTwoForm = this.fb.group({
      xmlData: ['', [Validators.required, Validators.minLength(10)]]
    });

    // Inicializar observables
    this.availableTemplates$ = this.templateService.templates$;

    this.initializeProcessingSteps();
  }

  ngOnInit(): void {
    this.checkQueryParams();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa los pasos de procesamiento
   */
  private initializeProcessingSteps(): void {
    this.processingSteps.set([
      {
        id: 1,
        title: 'Parse XML Data',
        description: 'Converting XML to structured data',
        status: 'pending'
      },
      {
        id: 2,
        title: 'Compile Template',
        description: 'Merging template with data',
        status: 'pending'
      },
      {
        id: 3,
        title: 'Generate HTML',
        description: 'Creating formatted HTML document',
        status: 'pending'
      },
      {
        id: 4,
        title: 'Convert to PDF',
        description: 'Generating PDF from HTML',
        status: 'pending'
      }
    ]);
  }

  /**
   * Verifica parámetros de consulta
   */
  private checkQueryParams(): void {
    const templateId = this.route.snapshot.queryParamMap.get('templateId');
    if (templateId) {
      this.availableTemplates$.pipe(takeUntil(this.destroy$)).subscribe((templates: any) => {
        const template = templates.find((t: any) => t.id === templateId);
        if (template) {
          this.selectTemplate(template);
        }
      });
    }
  }

  /**
   * Configura subscripciones de formularios
   */
  private setupFormSubscriptions(): void {
    this.stepTwoForm.get('xmlData')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.xmlData.set(value || '');
        this.validationResult.set(null); // Reset validation
      });
  }

  /**
   * Selecciona una plantilla
   */
  selectTemplate(template: Template): void {
    this.selectedTemplate.set(template);
    this.stepOneForm.patchValue({ templateId: template.id });
  }

  /**
   * Valida XML
   */
  validateXml(): void {
    const xmlContent = this.xmlData();
    if (!xmlContent) return;

    // Usar parseXml para validar - si parsea correctamente, es válido
    this.xmlParserService.parseXml(xmlContent).subscribe({
      next: (result: any) => {
        this.validationResult.set({
          isValid: true,
          errors: [],
          data: result
        });
      },
      error: (error: any) => {
        this.validationResult.set({
          isValid: false,
          errors: [{ message: error.message || 'Invalid XML format', severity: 'error' }]
        });
      }
    });
  }

  /**
   * Carga XML de ejemplo
   */
  loadSampleXml(): void {
    const template = this.selectedTemplate();
    if (!template) return;

    // Generar XML de ejemplo basado en las variables de la plantilla
    let sampleXml = '<?xml version="1.0" encoding="UTF-8"?>\n<data>\n';

    template.variables.forEach(variable => {
      const sampleValue = this.getSampleValue(variable.type, variable.name);
      sampleXml += `  <${variable.name}>${sampleValue}</${variable.name}>\n`;
    });

    sampleXml += '</data>';

    this.stepTwoForm.patchValue({ xmlData: sampleXml });
    this.xmlData.set(sampleXml);
  }

  /**
   * Obtiene valor de ejemplo para un tipo de variable
   */
  private getSampleValue(type: string, name: string): string {
    const lowerName = name.toLowerCase();

    switch (type) {
      case 'number':
        return lowerName.includes('amount') || lowerName.includes('price') ? '1500.00' : '42';
      case 'date':
        return '2025-10-18';
      case 'email':
        return 'john.doe@example.com';
      case 'url':
        return 'https://example.com';
      case 'boolean':
        return 'true';
      default:
        if (lowerName.includes('name')) return 'John Doe';
        if (lowerName.includes('company')) return 'ACME Corp';
        if (lowerName.includes('title')) return 'Sample Document';
        return 'Sample Value';
    }
  }

  /**
   * Genera vista previa
   */
  generatePreview(): void {
    const template = this.selectedTemplate();
    const xml = this.xmlData();

    if (!template || !xml) return;

    this.updateProcessingStep(1, 'processing');

    // Parsear XML
    this.xmlParserService.parseXml(xml).subscribe({
      next: (parsedData) => {
        this.updateProcessingStep(1, 'completed');
        this.updateProcessingStep(2, 'processing');

        // Compilar plantilla
        this.templateService.compileTemplate(template.htmlContent, parsedData).subscribe({
          next: (compiled) => {
            this.updateProcessingStep(2, 'completed');
            this.updateProcessingStep(3, 'processing');

            // Generar HTML
            setTimeout(() => {
              this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(compiled));
              this.updateProcessingStep(3, 'completed');
            }, 500);
          },
          error: (error) => {
            this.updateProcessingStep(2, 'error', error.message);
          }
        });
      },
      error: (error) => {
        this.updateProcessingStep(1, 'error', error.message);
      }
    });
  }

  /**
   * Genera documento PDF
   */
  generateDocument(): void {
    if (!this.previewHtml()) return;

    this.isProcessing.set(true);
    this.updateProcessingStep(4, 'processing');

    // Primero parsear XML para obtener DocumentData
    this.xmlParserService.parseXml(this.xmlData()).subscribe({
      next: (documentData: any) => {
        // Usar el servicio correcto con los parámetros correctos
        this.pdfGeneratorService.generateDocument(this.selectedTemplate()!, documentData)
          .subscribe({
            next: (generatedDoc: any) => {
              this.updateProcessingStep(4, 'completed');
              this.generatedDocument.set(generatedDoc);
              this.isProcessing.set(false);

              // Guardar en storage usando el método correcto
              this.storageService.saveGeneratedDocuments([generatedDoc]);
            },
            error: (error: any) => {
              this.updateProcessingStep(4, 'error', error.message);
              this.isProcessing.set(false);
            }
          });
      },
      error: (error: any) => {
        this.updateProcessingStep(1, 'error', 'Failed to parse XML data');
        this.isProcessing.set(false);
      }
    });
  }

  /**
   * Descarga PDF
   */
  downloadPdf(): void {
    const doc = this.generatedDocument();
    if (!doc?.pdfBlob) return;

    const url = URL.createObjectURL(doc.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.templateName || 'document'}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Actualiza estado de paso de procesamiento
   */
  private updateProcessingStep(stepId: number, status: ProcessingStep['status'], error?: string): void {
    const steps = [...this.processingSteps()];
    const step = steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (error) step.error = error;
      this.processingSteps.set(steps);
    }
  }

  /**
   * Obtiene clase CSS para paso
   */
  getStepClass(status: string): string {
    return `step-${status}`;
  }

  /**
   * Obtiene ícono para paso
   */
  getStepIcon(status: string): string {
    switch (status) {
      case 'completed': return 'check_circle';
      case 'processing': return 'sync';
      case 'error': return 'error';
      default: return 'radio_button_unchecked';
    }
  }

  /**
   * Obtiene clase de ícono para paso
   */
  getStepIconClass(status: string): string {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'processing': return 'text-orange-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-400';
    }
  }

  /**
   * Reinicia el proceso
   */
  resetProcess(): void {
    this.selectedTemplate.set(null);
    this.xmlData.set('');
    this.validationResult.set(null);
    this.previewHtml.set('');
    this.generatedDocument.set(null);
    this.isProcessing.set(false);
    this.initializeProcessingSteps();

    this.stepOneForm.reset();
    this.stepTwoForm.reset();
  }

  /**
   * Volver al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
