import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { Template, TemplateStatus } from '../models';
import { TemplateVariable } from './template-variables-analyzer.service';
import { InvoiceTemplate } from '../templates/invoice-template/invoice-template';

export type DocumentSection = 'header' | 'body' | 'footer' | 'pagination';
export type DataTab = 'xml' | 'css';

export interface EditorState {
  templateName: string;
  currentSection: DocumentSection;
  currentDataTab: DataTab;
  currentLine: number;
  zoomLevel: number;
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
}

export interface SectionContent {
  header: string;
  body: string;
  footer: string;
  pagination: string;
}

@Injectable({
  providedIn: 'root'
})
export class TemplateEditorStateService {

  // Signals para estado reactivo
  private _templateName = signal<string>('new-template');
  private _currentSection = signal<DocumentSection>('body');
  private _currentDataTab = signal<DataTab>('xml');
  private _currentLine = signal<number>(1);
  private _zoomLevel = signal<number>(100);
  private _isSaving = signal<boolean>(false);
  private _isDirty = signal<boolean>(false);
  private _detectedVariables = signal<TemplateVariable[]>([]);
  private _currentTemplate = signal<Template | null>(null);
  private _lastSaved = signal<Date | null>(null);

  private _sectionContent = signal<SectionContent>({
    header: InvoiceTemplate.header,
    body: InvoiceTemplate.body,
    footer: InvoiceTemplate.footer,
    pagination: InvoiceTemplate.pagination
  });

  private _xmlData = signal<string>(`<invoice
  number="ID-8387323"
  date_issued="1972-01-01 13:42:24"
  currency="USD"
  subtotal="52330"
  tax_rate="16"
  tax="8372.8"
  total="60702.8">
  <bill_to
    name="Daniel Osorio"
    email="hello@prexview.com">
  </bill_to>
  <order>
    <product
      id="3421"
      name="Apple"
      description="Lorem ipsum dolor si amen"
      price="150"
      quantity="75"
      total="11250">
    </product>
    <product
      id="8473"
      name="Banana"
      description="Lorem ipsum dolor si amen"
      price="80"
      quantity="38"
      total="3040">
    </product>
    <product
      id="7820"
      name="Blackberry"
      description="Lorem ipsum dolor si amen"
      price="130"
      quantity="32"
      total="4160">
    </product>
    <product
      id="8734"
      name="Grape"
      description="Lorem ipsum dolor si amen"
      price="180"
      quantity="49"
      total="8820">
    </product>
    <product
      id="8902"
      name="Mango"
      description="Lorem ipsum dolor si amen"
      price="110"
      quantity="28"
      total="3080">
    </product>
    <product
      id="3674"
      name="Pineapple"
      description="Lorem ipsum dolor si amen"
      price="120"
      quantity="13"
      total="1560">
    </product>
    <product
      id="8730"
      name="Watermelon"
      description="Lorem ipsum dolor si amen"
      price="150"
      quantity="120"
      total="18000">
    </product>
    <product
      id="1567"
      name="Lemon"
      description="Lorem ipsum dolor si amen"
      price="30"
      quantity="27"
      total="810">
    </product>
    <product
      id="4783"
      name="Orange"
      description="Lorem ipsum dolor si amen"
      price="70"
      quantity="23"
      total="1610">
    </product>
  </order>
</invoice>`);
  private _cssData = signal<string>(this.getDefaultInvoiceStyles());

  // Document sections configuration
  readonly documentSections: DocumentSection[] = ['header', 'body', 'footer', 'pagination'];

  // Auto-save configuration
  private autoSaveInterval = 30000; // 30 seconds
  private autoSaveSubscription: any;

  // BehaviorSubjects para eventos
  private sectionChanged$ = new BehaviorSubject<DocumentSection>('body');
  private contentChanged$ = new BehaviorSubject<{section: DocumentSection, content: string}>({section: 'body', content: ''});
  private stateChanged$ = new BehaviorSubject<EditorState>(this.getCurrentState());

  // Getters para signals (readonly)
  get templateName() { return this._templateName.asReadonly(); }
  get currentSection() { return this._currentSection.asReadonly(); }
  get currentDataTab() { return this._currentDataTab.asReadonly(); }
  get currentLine() { return this._currentLine.asReadonly(); }
  get zoomLevel() { return this._zoomLevel.asReadonly(); }
  get isSaving() { return this._isSaving.asReadonly(); }
  get isDirty() { return this._isDirty.asReadonly(); }
  get detectedVariables() { return this._detectedVariables.asReadonly(); }
  get currentTemplate() { return this._currentTemplate.asReadonly(); }
  get lastSaved() { return this._lastSaved.asReadonly(); }
  get sectionContent() { return this._sectionContent.asReadonly(); }
  get xmlData() { return this._xmlData.asReadonly(); }
  get cssData() { return this._cssData.asReadonly(); }

  // Computed properties
  readonly isEditMode = computed(() => !!this._currentTemplate());
  readonly hasUnsavedChanges = computed(() => this._isDirty() && !this._isSaving());
  readonly canSave = computed(() => this._isDirty() && !this._isSaving() && this._templateName() !== 'new-template');

  // Observables para eventos
  get sectionChanged(): Observable<DocumentSection> { return this.sectionChanged$.asObservable(); }
  get contentChanged(): Observable<{section: DocumentSection, content: string}> { return this.contentChanged$.asObservable(); }
  get stateChanged(): Observable<EditorState> { return this.stateChanged$.asObservable(); }

  constructor() {
    this.setupAutoSave();
  }

  /**
   * Obtiene el estado actual completo
   */
  getCurrentState(): EditorState {
    return {
      templateName: this._templateName(),
      currentSection: this._currentSection(),
      currentDataTab: this._currentDataTab(),
      currentLine: this._currentLine(),
      zoomLevel: this._zoomLevel(),
      isSaving: this._isSaving(),
      isDirty: this._isDirty(),
      lastSaved: this._lastSaved()
    };
  }

  /**
   * Actualiza el nombre de la plantilla
   */
  setTemplateName(name: string): void {
    this._templateName.set(name);
    this.markAsDirty();
    this.emitStateChange();
  }

  /**
   * Cambia la sección actual
   */
  setCurrentSection(section: DocumentSection): void {
    this._currentSection.set(section);
    this.sectionChanged$.next(section);
    this.emitStateChange();
  }

  /**
   * Cambia la pestaña de datos actual
   */
  setCurrentDataTab(tab: DataTab): void {
    this._currentDataTab.set(tab);
    this.emitStateChange();
  }

  /**
   * Actualiza la línea actual del cursor
   */
  setCurrentLine(line: number): void {
    this._currentLine.set(line);
  }

  /**
   * Establece el nivel de zoom
   */
  setZoomLevel(level: number): void {
    const clampedLevel = Math.max(50, Math.min(200, level));
    this._zoomLevel.set(clampedLevel);
    this.emitStateChange();
  }

  /**
   * Incrementa el zoom
   */
  zoomIn(): void {
    const current = this._zoomLevel();
    this.setZoomLevel(current + 25);
  }

  /**
   * Decrementa el zoom
   */
  zoomOut(): void {
    const current = this._zoomLevel();
    this.setZoomLevel(current - 25);
  }

  /**
   * Establece el estado de guardado
   */
  setIsSaving(saving: boolean): void {
    this._isSaving.set(saving);
    if (saving) {
      this._isDirty.set(false);
    }
    this.emitStateChange();
  }

  /**
   * Marca el estado como modificado
   */
  markAsDirty(): void {
    this._isDirty.set(true);
    this.emitStateChange();
  }

  /**
   * Marca el estado como guardado
   */
  markAsSaved(): void {
    this._isDirty.set(false);
    this._lastSaved.set(new Date());
    this.emitStateChange();
  }

  /**
   * Establece las variables detectadas
   */
  setDetectedVariables(variables: TemplateVariable[]): void {
    this._detectedVariables.set(variables);
  }

  /**
   * Establece la plantilla actual
   */
  setCurrentTemplate(template: Template | null): void {
    this._currentTemplate.set(template);
    if (template) {
      this._templateName.set(template.name);
      this._isDirty.set(false);
    }
    this.emitStateChange();
  }

  /**
   * Actualiza el contenido de una sección
   */
  updateSectionContent(section: DocumentSection, content: string): void {
    const sections = { ...this._sectionContent() };
    sections[section] = content;
    this._sectionContent.set(sections);
    this.markAsDirty();
    this.contentChanged$.next({ section, content });
  }

  /**
   * Obtiene el contenido de la sección actual
   */
  getCurrentSectionContent(): string {
    return this._sectionContent()[this._currentSection()];
  }

  /**
   * Establece todo el contenido de las secciones
   */
  setSectionContent(content: SectionContent): void {
    this._sectionContent.set(content);
    this.markAsDirty();
  }

  /**
   * Actualiza los datos XML
   */
  setXmlData(data: string): void {
    this._xmlData.set(data);
    this.markAsDirty();
  }

  /**
   * Actualiza los datos CSS
   */
  setCssData(data: string): void {
    this._cssData.set(data);
    this.markAsDirty();
  }

  /**
   * Restablece el estado a valores por defecto
   */
  resetState(): void {
    this._templateName.set('new-template');
    this._currentSection.set('body');
    this._currentDataTab.set('xml');
    this._currentLine.set(1);
    this._zoomLevel.set(100);
    this._isSaving.set(false);
    this._isDirty.set(false);
    this._detectedVariables.set([]);
    this._currentTemplate.set(null);
    this._lastSaved.set(null);
    this._sectionContent.set({
      header: '',
      body: '',
      footer: '',
      pagination: ''
    });
    this._xmlData.set('');
    this._cssData.set('');
    this.emitStateChange();
  }

  /**
   * Carga el estado desde una plantilla existente
   */
  loadFromTemplate(template: Template): void {
    this.setCurrentTemplate(template);

    // Parse content into sections if needed
    // This is a simplified version - you might need more sophisticated parsing
    const metadata = template.metadata as any; // Type assertion for extended metadata
    const sections: SectionContent = {
      header: metadata?.sections?.header || '',
      body: template.htmlContent || '',
      footer: metadata?.sections?.footer || '',
      pagination: metadata?.sections?.pagination || ''
    };

    this.setSectionContent(sections);
    this.markAsSaved();
  }

  /**
   * Exporta el estado actual para guardado
   */
  exportForSave(): Partial<Template> {
    const sections = this._sectionContent();

    return {
      name: this._templateName(),
      description: 'Template created with PrexView Studio',
      htmlContent: Object.values(sections).join('\n\n'),
      status: this.isEditMode() ? TemplateStatus.ACTIVE : TemplateStatus.DRAFT,
      variables: this._detectedVariables(),
      metadata: {
        category: 'other',
        tags: [],
        version: '1.0.0',
        // Extended metadata (will be stored as additional properties)
        ...{
          sections: sections,
          xmlData: this._xmlData(),
          cssData: this._cssData(),
          editorState: this.getCurrentState()
        }
      } as any
    };
  }

  /**
   * Configura auto-guardado
   */
  private setupAutoSave(): void {
    this.autoSaveSubscription = interval(this.autoSaveInterval).subscribe(() => {
      if (this.canSave()) {
        console.log('Auto-save triggered');
        // Emit event for auto-save
        this.stateChanged$.next({
          ...this.getCurrentState(),
          isSaving: true
        });
      }
    });
  }

  /**
   * Emite cambio de estado
   */
  private emitStateChange(): void {
    this.stateChanged$.next(this.getCurrentState());
  }

  /**
   * Configura intervalo de auto-guardado
   */
  setAutoSaveInterval(intervalMs: number): void {
    this.autoSaveInterval = intervalMs;
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
    this.setupAutoSave();
  }

  /**
   * Habilita/deshabilita auto-guardado
   */
  setAutoSaveEnabled(enabled: boolean): void {
    if (enabled && !this.autoSaveSubscription) {
      this.setupAutoSave();
    } else if (!enabled && this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
      this.autoSaveSubscription = null;
    }
  }

  /**
   * Obtiene los estilos por defecto del template de factura
   */
  private getDefaultInvoiceStyles(): string {
    return `$primary: #6A77D8;
$darken: #444;
$secondary: #139ACE;
$grey: #444;

/* Grid System - Required for layout */
* {
  box-sizing: border-box;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -15px;
  width: 100%;
  max-width: 100%;
}

.col-1, .col-2, .col-3, .col-4, .col-5, .col-6,
.col-7, .col-8, .col-9, .col-10, .col-11, .col-12 {
  padding: 0 15px;
  box-sizing: border-box;
  flex: 0 0 auto;
  max-width: 100%;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.col-1 { width: 8.333%; }
.col-2 { width: 16.666%; }
.col-3 { width: 25%; }
.col-4 { width: 33.333%; }
.col-5 { width: 41.666%; }
.col-6 { width: 50%; }
.col-7 { width: 58.333%; }
.col-8 { width: 66.666%; }
.col-9 { width: 75%; }
.col-10 { width: 83.333%; }
.col-11 { width: 91.666%; }
.col-12 { width: 100%; }

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.primary {
  background: $primary;
  color: #fff;
}

.header {
  position: relative;
  height: 160px;
  min-height: 160px;
  overflow: hidden;
  margin-bottom: 35px;
  display: flex;
  align-items: stretch;
}

.header .col-3,
.header .col-4,
.header .col-5{
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.footer {
  height: inherit;
  height: 100%;
}

.relative {
  position: relative;
}

.logo {
  border-top: 8px solid $grey;
  position: absolute;
  overflow: hidden;
  background: $primary;
  display: block;
  right: 0px;
  left: 0px;
  top: 0px;
  bottom: 0px;
  height: 100%;
}

.logo .box {
  display: table;
  width: 100%;
  height: 100%;
  vertical-align: middle;
}

.logo .box .box {
  display: table-cell;
  width: 100%;
  height: 100%;
  text-align: center;
  vertical-align: middle;
}

hr {
  border-color: $primary;
  border-width: 2px;
}

.details {
  position: absolute;
  bottom: 15px;
  right: 0;
  left: 0;
  width: 100%;
  padding: 0 15px;
  box-sizing: border-box;
}

.details h1 {
  font-size: 22pt;
  margin: 0px;
  padding: 0px;
  line-height: 1.1;
}

.details .block {
  margin: 0px;
  padding: 5px 0 5px 5px;
}

table th {
  background: #eee;
  border-bottom: 2px solid $primary;
  padding: 10px 10px;
  color: $primary;
}

table td:first-of-type {
  padding: 10px 10px !important;
}

table td:last-of-type {
  padding: 10px 10px !important;
}

table td {
  vertical-align: top;
  padding: 10px 5px;
}

.thanks {
  font-size: 30pt;
  color: $primary;
  display: inline-block;
  line-height: 80%;
}

.total {
  overflow: hidden;
}

.total .box {
  padding: 20px;
  color: #fff;
  min-height: 90px;
  overflow: hidden;
  position: relative;
}

.total .box-left {
  background: #f3f3f3;

	border-bottom: 8px solid $primary;
}

.total .box-left h1 {
  position: absolute;
  bottom: 14px;
  right: 20px;
  padding: 0px;
  margin: 0px;
}

.total .box-right h1 {
  position: absolute;
  bottom: 20px;
  right: 20px;
  padding: 0px;
  margin: 0px;
}

.total .box-right h2 {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 0px;
  margin: 0px;
  opacity: 0.5;
}

.total .box-right {
  background: $primary;
  color: #fff;
}

.footer {
  height: 100%;
  border-top: 2px solid $primary;
  padding-top: 15px;
  margin-top: 30px;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

.body{
  overflow:hidden;
}
.pagination {
  margin: 20px 0 0 0;
  font-size: 8pt;
}

/* Footer text styling - consolidated and enhanced */
.footer .block,
.preview-document .footer .block {
  font-size: 0.75rem !important;
  line-height: 1.3 !important;
  margin-bottom: 6px !important;
  padding: 2px 0 !important;
  color: #666666 !important;
  word-wrap: break-word;
  overflow-wrap: break-word;
  hyphens: auto;
}

/* Footer bold text (titles) */
.footer .block b,
.preview-document .footer .block b {
  color: #444444 !important;
  font-weight: 600 !important;
  font-size: 0.8rem !important;
}

/* Footer general styling */
.footer,
.preview-document .footer {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Footer spacing enhancement */
.preview-document .footer {
  margin-top: 40px !important;
  padding-top: 20px !important;
  border-top: 2px solid $primary !important;
}

/* Add space between body and footer, and separation from header */
.preview-document .body,
.body {
  margin-top: 15px !important;
  margin-bottom: 20px !important;
  padding-top: 5px !important;
  padding-bottom: 10px !important;
}

/* Header specific fixes for preview */
.preview-document .header {
  height: 160px !important;
  min-height: 160px !important;
  margin-bottom: 40px !important;
  display: flex !important;
  align-items: stretch !important;
}

.preview-document .header .col-3,
.preview-document .header .col-4,
.preview-document .header .col-5 {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.preview-document .logo {
  height: 100% !important;
}

.preview-document .details {
  position: absolute !important;
  bottom: 15px !important;
  right: 0 !important;
  left: 0 !important;
  padding: 0 15px !important;
}

.preview-document .details h1 {
  color: $primary !important;
  margin-bottom: 8px !important;
  font-size: 22pt !important;
  line-height: 1.1 !important;
}

/* Improve details content readability */
.preview-document .details .title,
.details .title {
  font-size: 0.7rem !important;
  line-height: 1.2 !important;
  margin-bottom: 3px !important;
}

.preview-document .details .block,
.details .block {
  font-size: 0.85rem !important;
  line-height: 1.2 !important;
  margin-bottom: 8px !important;
  padding: 2px 0 !important;
}

.preview-document .details hr,
.details hr {
  margin: 8px 0 !important;
  border-width: 1px !important;
}

/* A4 Document Size Configuration */
.document-preview-content,
.preview-container,
.template-preview {
  width: 210mm;
  max-width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: white;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
  padding: 10mm 10mm 5mm 5mm;
  box-sizing: border-box;
  font-size: 12pt;
  line-height: 1.4;
}

/* Preview container styling */
body, html {
  background: #f5f5f5;
}

/* Print media query for exact A4 sizing */
@media print {
  .document-preview-content,
  .preview-container,
  .template-preview {
    width: 210mm;
    height: 297mm;
    margin: 0;
    padding: 20mm;
    box-shadow: none;
  }

  body {
    background: white;
  }
}

/* Preview panel with horizontal scroll - RIGHT SIDE ONLY */
.preview-panel .preview-content,
.preview-content {
  width: 100%;
  height: 100%;
  overflow-x: auto !important;
  overflow-y: auto !important;
  padding: 20px;
  background: #f5f5f5;
  box-sizing: border-box;
}

/* Force scroll bars to be visible when content overflows */
.preview-panel .preview-content::-webkit-scrollbar,
.preview-content::-webkit-scrollbar {
  width: 14px !important;
  height: 14px !important;
  background: #f1f1f1;
}

.preview-panel .preview-content::-webkit-scrollbar-track,
.preview-content::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 7px;
  border: 1px solid #e0e0e0;
}

.preview-panel .preview-content::-webkit-scrollbar-thumb,
.preview-content::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 7px;
  border: 1px solid #b0b0b0;
}

.preview-panel .preview-content::-webkit-scrollbar-thumb:hover,
.preview-content::-webkit-scrollbar-thumb:hover {
  background: #a0a0a0;
}

.preview-panel .preview-content::-webkit-scrollbar-corner,
.preview-content::-webkit-scrollbar-corner {
  background: #f1f1f1;
}

/* A4 document should maintain its size and force horizontal scroll */
.preview-panel .preview-document,
.preview-document,
.document-preview-content,
.preview-container,
.template-preview {
  width: 210mm !important;
  max-width: none !important;
  min-width: 210mm !important;
  margin: 0 auto;
  flex-shrink: 0;
  box-sizing: border-box;
  display: block;
}

/* Ensure the preview content wrapper allows full width usage */
.preview-panel .preview-content .preview-document,
.preview-content .preview-document {
  margin: 0;
  width: 210mm !important;
}

/* Make sure all content inside uses full A4 width */
.preview-document * {
  max-width: 100% !important;
  box-sizing: border-box;
}

/* Specific fixes for layout elements */
.preview-document .row {
  width: 100% !important;
  margin: 0 -15px !important;
  display: flex !important;
  flex-wrap: wrap !important;
}

.preview-document .col-1,
.preview-document .col-2,
.preview-document .col-3,
.preview-document .col-4,
.preview-document .col-5,
.preview-document .col-6,
.preview-document .col-7,
.preview-document .col-8,
.preview-document .col-9,
.preview-document .col-10,
.preview-document .col-11,
.preview-document .col-12 {
  padding: 0 15px !important;
  box-sizing: border-box !important;
  flex: 0 0 auto !important;
}

/* Responsive adjustments for screen display */
@media screen and (max-width: 768px) {
  .preview-wrapper,
  .template-preview-container,
  .document-preview-wrapper {
    padding: 10px;
  }

  /* On mobile, keep A4 size but allow scrolling */
  .document-preview-content,
  .preview-container,
  .template-preview {
    width: 210mm !important;
    min-width: 210mm;
    padding: 15mm;
  }
}`;
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
    this.sectionChanged$.complete();
    this.contentChanged$.complete();
    this.stateChanged$.complete();
  }
}
