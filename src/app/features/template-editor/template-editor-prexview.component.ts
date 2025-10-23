import { Component, OnInit, OnDestroy, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, debounceTime, takeUntil } from 'rxjs';

import { TemplateService } from '../../core/services/template.service';
import { StorageService } from '../../core/services/storage.service';
import { ScssCompilerService } from '../../core/services/scss-compiler.service';
import { MonacoEditorManagerService } from '../../core/services/monaco-editor-manager.service';
import { TemplateVariablesAnalyzerService, TemplateVariable } from '../../core/services/template-variables-analyzer.service';
import { TemplatePreviewService } from '../../core/services/template-preview.service';
import { TemplateEditorStateService, DocumentSection, DataTab } from '../../core/services/template-editor-state.service';
import { Template, TemplateStatus, VariableType } from '../../core/models';

declare var monaco: any;

/**
 * Template Editor Component - PrexView Studio Style
 * Replica exacta de la interfaz de PrexView
 */
@Component({
  selector: 'app-template-editor-prexview',
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
    MatToolbarModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  templateUrl: './template-editor-prexview.component.html',
  styleUrls: ['./template-editor-prexview.component.scss']
})
export class TemplateEditorPrexviewComponent implements OnInit, OnDestroy {

  @ViewChild('monacoEditor', { static: false }) monacoEditorElement!: ElementRef;
  @ViewChild('dataEditor', { static: false }) dataEditorElement!: ElementRef;
  @ViewChild('cssEditor', { static: false }) cssEditorElement!: ElementRef;

  // State management delegated to service - accessed via getters
  get templateName() { return this.editorState.templateName; }
  get currentSection() { return this.editorState.currentSection; }
  get currentDataTab() { return this.editorState.currentDataTab; }
  get currentLine() { return this.editorState.currentLine; }
  get zoomLevel() { return this.editorState.zoomLevel; }
  get isSaving() { return this.editorState.isSaving; }
  get detectedVariables() { return this.editorState.detectedVariables; }
  get currentTemplate() { return this.editorState.currentTemplate; }
  get sectionContent() { return this.editorState.sectionContent; }
  get xmlData() { return this.editorState.xmlData; }
  get cssData() { return this.editorState.cssData; }
  get documentSections() { return this.editorState.documentSections; }

  // Preview state (managed locally)
  previewHtml = signal<SafeHtml>('');

  // Monaco editors
  monacoEditor: any;
  dataEditor: any;
  cssEditor: any;

  // Lifecycle
  private destroy$ = new Subject<void>();

  // Computed properties
  isEditMode = computed(() => !!this.currentTemplate());

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private templateService: TemplateService,
    private storageService: StorageService,
    private sanitizer: DomSanitizer,
    private scssCompiler: ScssCompilerService,
    private monacoEditorManager: MonacoEditorManagerService,
    private variablesAnalyzer: TemplateVariablesAnalyzerService,
    private previewService: TemplatePreviewService,
    private editorState: TemplateEditorStateService
  ) {}

  ngOnInit(): void {
    this.initializeEditor();
    this.loadTemplate();
    this.setupAutoSave();
    // Initialize preview
    setTimeout(() => this.updatePreview(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Usar el servicio para disponer todos los editores
    this.monacoEditorManager.disposeAllEditors();
  }

  /**
   * Inicializa Monaco Editor usando el servicio
   */
  private async initializeEditor(): Promise<void> {
    try {
      await this.monacoEditorManager.loadMonacoEditor();

      setTimeout(() => {
        this.createEditors();
        this.setupEditorEventListeners();
        this.updatePreview();
      }, 100);

    } catch (error) {
      console.error('Error initializing Monaco Editor:', error);
    }
  }



  /**
   * Crea los editores Monaco usando el servicio
   */
  private async createEditors(): Promise<void> {
    // Main HTML Editor
    if (this.monacoEditorElement) {
      this.monacoEditor = await this.monacoEditorManager.createEditor(
        'main-html-editor',
        this.monacoEditorElement,
        {
          language: 'html',
          theme: 'vs-dark',
          fontSize: 14,
          lineNumbers: 'on',
          minimap: true,
          wordWrap: 'on',
          folding: true
        },
        this.getCurrentSectionContent()
      );
    }

    // Crear editores de datos inicial
    this.createDataEditors();
  }

  /**
   * Configura los listeners de eventos de los editores
   */
  private setupEditorEventListeners(): void {
    // Suscribirse a cambios de contenido
    this.monacoEditorManager.contentChanges.subscribe(({editorId, content}) => {
      if (editorId === 'main-html-editor') {
        this.updateSectionContent(content);
        this.detectVariables(content);
        this.updatePreview();
      } else if (editorId === 'xml-data-editor') {
        this.editorState.setXmlData(content);
        this.updatePreview();
      } else if (editorId === 'css-editor') {
        this.editorState.setCssData(content);
        this.updatePreview();
      }
    });

    // Suscribirse a cambios de posición del cursor
    this.monacoEditorManager.cursorPositionChanges.subscribe(({editorId, line}) => {
      if (editorId === 'main-html-editor') {
        this.editorState.setCurrentLine(line);
      }
    });
  }

  /**
   * Carga plantilla para edición
   */
  private loadTemplate(): void {
    const templateId = this.route.snapshot.paramMap.get('id');
    if (templateId) {
      this.templateService.templates$.pipe(takeUntil(this.destroy$)).subscribe((templates: any) => {
        const template = templates.find((t: any) => t.id === templateId);
        if (template) {
          this.editorState.loadFromTemplate(template);

          if (this.monacoEditor) {
            this.monacoEditor.setValue(template.htmlContent || '');
          }
          this.detectVariables(template.htmlContent || '');
        }
      });
    }
  }

  /**
   * Configura auto-guardado
   */
  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.templateName() !== 'new-template') {
        this.autoSave();
      }
    }, 30000);
  }

  /**
   * Actualiza nombre de plantilla
   */
  updateTemplateName(event: any): void {
    this.editorState.setTemplateName(event.target.value);
  }

  /**
   * Cambia sección actual
   */
  setCurrentSection(section: DocumentSection): void {
    this.editorState.setCurrentSection(section);
    this.monacoEditorManager.setEditorContent('main-html-editor', this.getCurrentSectionContent());
  }

  /**
   * Cambia pestaña de datos
   */
  setCurrentDataTab(tab: DataTab): void {
    this.editorState.setCurrentDataTab(tab);

    // Recrear editores después del cambio de DOM
    setTimeout(() => {
      this.createDataEditors();
    }, 100);
  }

  /**
   * Crea los editores de datos (XML y CSS) usando el servicio
   */
  private async createDataEditors(): Promise<void> {
    if (!this.monacoEditorManager.isMonacoAvailable()) return;

    // XML Data Editor
    if (this.currentDataTab() === 'xml' && this.dataEditorElement) {
      this.monacoEditorManager.disposeEditor('xml-data-editor');

      this.dataEditor = await this.monacoEditorManager.createEditor(
        'xml-data-editor',
        this.dataEditorElement,
        {
          language: 'xml',
          theme: 'vs-dark',
          fontSize: 13,
          lineNumbers: 'on',
          minimap: false,
          wordWrap: 'on'
        },
        this.xmlData()
      );
    }

    // CSS Editor
    if (this.currentDataTab() === 'css' && this.cssEditorElement) {
      this.monacoEditorManager.disposeEditor('css-editor');

      this.cssEditor = await this.monacoEditorManager.createEditor(
        'css-editor',
        this.cssEditorElement,
        {
          language: 'css',
          theme: 'vs-dark',
          fontSize: 13,
          lineNumbers: 'on',
          minimap: false,
          wordWrap: 'on'
        },
        this.cssData()
      );
    }
  }

  /**
   * Obtiene contenido de sección actual
   */
  getCurrentSectionContent(): string {
    return this.editorState.getCurrentSectionContent();
  }

  /**
   * Actualiza contenido de sección
   */
  private updateSectionContent(content: string): void {
    this.editorState.updateSectionContent(this.currentSection(), content);
  }

  /**
   * Detecta variables en el contenido usando el servicio
   */
  private detectVariables(content: string): void {
    const variables = this.variablesAnalyzer.detectVariables(content);
    this.editorState.setDetectedVariables(variables);
  }

  async updatePreview(): Promise<void> {
    try {
      const sections = this.editorState.getSectionContentForPreview();
      const xmlData = this.editorState.xmlData();
      const cssData = this.editorState.cssData();

      // Combine all sections to create the full document
      const fullContent = `
        ${sections.pagination}
        ${sections.header}
        ${sections.body}
        ${sections.footer}
      `.trim();

      const options = {
        includeCss: true,
        cssContent: cssData,
        xmlContent: xmlData,
        scaleToFit: false,
        sanitize: true
      };

      this.previewService.generatePreview(fullContent, options).subscribe({
        next: (result: any) => {
          this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(result.html));
        },
        error: (error: any) => {
          console.error('Preview error:', error);
          this.previewHtml.set('');
        }
      });
    } catch (error) {
      console.error('Preview error:', error);
      this.previewHtml.set('');
    }
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.editorState.zoomIn();
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.editorState.zoomOut();
  }

  /**
   * Ver JSON
   */
  viewJson(): void {
    try {
      const xmlContent = this.editorState.xmlData();
      const jsonData = this.previewService.parseXmlToJson(xmlContent);
      alert(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      alert('Error parsing XML data');
    }
  }

  /**
   * Auto-guardado
   */
  async autoSave(): Promise<void> {
    if (this.editorState.templateName() && this.editorState.templateName() !== 'new-template') {
      try {
        const templateData = this.editorState.exportForSave();

        if (this.editorState.isEditMode()) {
          await this.templateService.saveTemplate({
            ...templateData,
            id: this.editorState.currentTemplate()!.id
          }).toPromise();
        }
      } catch (error) {
        console.error('Auto-save error:', error);
      }
    }
  }

  /**
   * Guarda plantilla
   */
  async saveTemplate(): Promise<void> {
    this.editorState.setIsSaving(true);

    try {
      const templateData = this.editorState.exportForSave();

      if (this.editorState.isEditMode()) {
        const updated = await this.templateService.saveTemplate({
          ...templateData,
          id: this.currentTemplate()!.id
        }).toPromise();
        this.editorState.setCurrentTemplate(updated!);
      } else {
        const created = await this.templateService.saveTemplate(templateData).toPromise();
        this.editorState.setCurrentTemplate(created!);
        this.router.navigate(['/template-editor', created!.id], { replaceUrl: true });
      }

      this.editorState.markAsSaved();
      console.log('Template saved successfully');
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      this.editorState.setIsSaving(false);
    }
  }

  /**
   * Volver al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
