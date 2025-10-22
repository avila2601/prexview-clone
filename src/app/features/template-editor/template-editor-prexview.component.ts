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
import { Template, TemplateStatus, VariableType } from '../../core/models';

declare var monaco: any;

interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required: boolean;
}

type DocumentSection = 'header' | 'body' | 'footer' | 'pagination';
type DataTab = 'xml' | 'css';

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

  // Signals para estado reactivo
  templateName = signal<string>('new-template');
  currentSection = signal<DocumentSection>('body');
  currentDataTab = signal<DataTab>('xml');
  currentLine = signal<number>(1);
  zoomLevel = signal<number>(100);
  isSaving = signal<boolean>(false);
  detectedVariables = signal<TemplateVariable[]>([]);
  previewHtml = signal<SafeHtml>('');
  currentTemplate = signal<Template | null>(null);

  // Monaco editors
  monacoEditor: any;
  dataEditor: any;
  cssEditor: any;

  // Document sections content
  documentSections: DocumentSection[] = ['header', 'body', 'footer', 'pagination'];
  sectionContent = signal<Record<DocumentSection, string>>({
    header: '',
    body: '',
    footer: '',
    pagination: ''
  });

  // Data content (will be loaded from external file)
  xmlData = signal<string>('');

  // CSS Data (will be loaded from external file)
  cssData = signal<string>('');

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
    private scssCompiler: ScssCompilerService
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

    if (this.monacoEditor) this.monacoEditor.dispose();
    if (this.dataEditor) this.dataEditor.dispose();
    if (this.cssEditor) this.cssEditor.dispose();
  }

  /**
   * Inicializa Monaco Editor
   */
  private async initializeEditor(): Promise<void> {
    try {
      if (typeof monaco === 'undefined') {
        await this.loadMonacoEditor();
      }

      setTimeout(() => {
        this.createEditors();
        this.updatePreview();
      }, 100);

    } catch (error) {
      console.error('Error initializing Monaco Editor:', error);
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
   * Crea los editores Monaco
   */
  private createEditors(): void {
    // Main HTML Editor
    if (this.monacoEditorElement) {
      this.monacoEditor = monaco.editor.create(this.monacoEditorElement.nativeElement, {
        value: this.getCurrentSectionContent(),
        language: 'html',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 14,
        lineNumbers: 'on',
        minimap: { enabled: true },
        wordWrap: 'on',
        folding: true,
        bracketMatching: 'always',
        matchBrackets: 'always'
      });

      this.monacoEditor.onDidChangeModelContent(() => {
        const value = this.monacoEditor.getValue();
        this.updateSectionContent(value);
        this.detectVariables(value);
        this.updatePreview();
      });

      this.monacoEditor.onDidChangeCursorPosition((e: any) => {
        this.currentLine.set(e.position.lineNumber);
      });
    }

    // Crear editores de datos inicial
    this.createDataEditors();
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
          this.currentTemplate.set(template);
          this.templateName.set(template.name);

          // Parse content into sections if needed
          this.sectionContent.set({
            header: '',
            body: template.htmlContent || '',
            footer: '',
            pagination: ''
          });

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
    this.templateName.set(event.target.value);
  }

  /**
   * Cambia sección actual
   */
  setCurrentSection(section: DocumentSection): void {
    this.currentSection.set(section);
    if (this.monacoEditor) {
      this.monacoEditor.setValue(this.getCurrentSectionContent());
    }
  }

  /**
   * Cambia pestaña de datos
   */
  setCurrentDataTab(tab: DataTab): void {
    this.currentDataTab.set(tab);

    // Recrear editores después del cambio de DOM
    setTimeout(() => {
      this.createDataEditors();
    }, 100);
  }

  /**
   * Crea los editores de datos (XML y CSS)
   */
  private createDataEditors(): void {
    if (typeof monaco === 'undefined') return;

    // XML Data Editor
    if (this.currentDataTab() === 'xml' && this.dataEditorElement) {
      if (this.dataEditor) {
        this.dataEditor.dispose();
      }

      this.dataEditor = monaco.editor.create(this.dataEditorElement.nativeElement, {
        value: this.xmlData(),
        language: 'xml',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        lineNumbers: 'on',
        minimap: { enabled: false },
        wordWrap: 'on'
      });

      this.dataEditor.onDidChangeModelContent(() => {
        this.xmlData.set(this.dataEditor.getValue());
        this.updatePreview();
      });
    }

    // CSS Editor
    if (this.currentDataTab() === 'css' && this.cssEditorElement) {
      if (this.cssEditor) {
        this.cssEditor.dispose();
      }

      this.cssEditor = monaco.editor.create(this.cssEditorElement.nativeElement, {
        value: this.cssData(),
        language: 'css',
        theme: 'vs-dark',
        automaticLayout: true,
        fontSize: 13,
        lineNumbers: 'on',
        minimap: { enabled: false },
        wordWrap: 'on'
      });

      this.cssEditor.onDidChangeModelContent(() => {
        this.cssData.set(this.cssEditor.getValue());
        this.updatePreview();
      });
    }
  }

  /**
   * Obtiene contenido de sección actual
   */
  getCurrentSectionContent(): string {
    return this.sectionContent()[this.currentSection()];
  }

  /**
   * Actualiza contenido de sección
   */
  private updateSectionContent(content: string): void {
    const sections = { ...this.sectionContent() };
    sections[this.currentSection()] = content;
    this.sectionContent.set(sections);
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
   * Infiere tipo de variable
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
   * Genera descripción automática
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
   * Parsea XML a JSON manteniendo estructura anidada
   */
  private parseXmlToJson(xmlString: string): any {
    try {
      // Handle both <data> and <invoice> root elements
      const invoiceMatch = xmlString.match(/<invoice([^>]*)>([\s\S]*)<\/invoice>/);
      if (invoiceMatch) {
        const result: any = {};

        // Parse attributes from the invoice tag
        const attributesString = invoiceMatch[1];
        const attributeRegex = /(\w+)="([^"]*)"/g;
        let attrMatch;

        while ((attrMatch = attributeRegex.exec(attributesString)) !== null) {
          // Add both original and prefixed versions for PrexView compatibility
          result[attrMatch[1]] = attrMatch[2];
          result[`_${attrMatch[1]}`] = attrMatch[2];
        }

        const innerXml = invoiceMatch[2];

        // Parse bill_to
        const billToMatch = innerXml.match(/<bill_to([^>]*)>/);
        if (billToMatch) {
          result.bill_to = {};
          const billToAttrRegex = /(\w+)="([^"]*)"/g;
          let billToAttrMatch;

          while ((billToAttrMatch = billToAttrRegex.exec(billToMatch[1])) !== null) {
            // Add both original and prefixed versions for PrexView compatibility
            result.bill_to[billToAttrMatch[1]] = billToAttrMatch[2];
            result.bill_to[`_${billToAttrMatch[1]}`] = billToAttrMatch[2];
          }
        }

        // Parse order and products
        const orderMatch = innerXml.match(/<order>([\s\S]*?)<\/order>/);
        if (orderMatch) {
          result.order = { product: [] };
          const productRegex = /<product([^>]*)>/g;
          let productMatch;

          while ((productMatch = productRegex.exec(orderMatch[1])) !== null) {
            const product: any = {};
            const productAttrRegex = /(\w+)="([^"]*)"/g;
            let productAttrMatch;

            while ((productAttrMatch = productAttrRegex.exec(productMatch[1])) !== null) {
              // Add both original and prefixed versions for PrexView compatibility
              product[productAttrMatch[1]] = productAttrMatch[2];
              product[`_${productAttrMatch[1]}`] = productAttrMatch[2];
            }

            result.order.product.push(product);
          }
        }

        // Return the structure that allows {{#with invoice}} to work
        return { invoice: result };
      }

      // Fallback for old <data> format
      const dataMatch = xmlString.match(/<data>([\s\S]*)<\/data>/);
      if (dataMatch) {
        const result: any = {};
        const innerXml = dataMatch[1];

        // Parse elementos de primer nivel
        const topLevelRegex = /<(\w+)>([^<]+)<\/\1>/g;
        let match;

        while ((match = topLevelRegex.exec(innerXml)) !== null) {
          const tagName = match[1];
          const value = match[2].trim();
          if (!result[tagName]) {
            result[tagName] = value;
          }
        }

        return result;
      }

      return {};
    } catch (error) {
      console.error('XML parsing error:', error);
      return {};
    }
  }

  /**
   * Aplica scope CSS para que solo afecte al preview document
   */
  private scopeCSSToPreview(css: string): string {
    if (!css) return '';

    // Reemplazar selectores CSS para que solo afecten al preview
    const scopedCSS = css
      // Agregar prefijo .document-preview-content a selectores que no lo tengan
      .replace(/([^{}]*){/g, (match, selector) => {
        // Evitar afectar @import, @media, @keyframes, etc.
        if (selector.trim().startsWith('@')) {
          return match;
        }

        // Limpiar selector y agregar scope
        const cleanSelector = selector.trim();
        if (!cleanSelector.includes('.document-preview-content')) {
          // Si el selector es 'body', reemplazarlo por nuestro contenedor
          if (cleanSelector === 'body') {
            return '.document-preview-content {';
          }
          // Para otros selectores, agregar el prefijo
          return `.document-preview-content ${cleanSelector} {`;
        }
        return match;
      });

    return scopedCSS;
  }

  /**
   * Actualiza vista previa
   */
  async updatePreview(): Promise<void> {
    try {
      // Combine all sections to create the full document
      const sections = this.sectionContent();
      console.log('Header content:', sections.header);
      console.log('Body content:', sections.body.substring(0, 100));
      const fullContent = `
        ${sections.header}
        ${sections.body}
        ${sections.footer}
        ${sections.pagination}
      `.trim();
      console.log('Full content preview:', fullContent.substring(0, 300));

      let xmlDataParsed: any = {};

      // Parse XML data to JSON with better structure handling
      if (this.xmlData()) {
        xmlDataParsed = this.parseXmlToJson(this.xmlData());
      }

      this.templateService.compileTemplate(fullContent, xmlDataParsed).subscribe({
        next: async (rendered: string) => {
          console.log('Rendered HTML preview:', rendered.substring(0, 500));
          // Manual SCSS compilation - replace variables directly
          let compiledCSS = this.cssData();

          // Remove SCSS variable declarations
          compiledCSS = compiledCSS.replace(/\$[\w-]+:\s*[^;]+;/g, '');

          // Replace SCSS variables with actual values
          compiledCSS = compiledCSS.replace(/\$primary/g, '#6A77D8');
          compiledCSS = compiledCSS.replace(/\$grey/g, '#444');
          compiledCSS = compiledCSS.replace(/\$secondary/g, '#139ACE');
          compiledCSS = compiledCSS.replace(/\$darken/g, '#444');

          // Clean up multiple empty lines
          compiledCSS = compiledCSS.replace(/\n\s*\n\s*\n/g, '\n\n');

          const directCSS = compiledCSS;
          const styledContent = `
            <style>${directCSS}</style>
            <div class="document-preview-content">
              ${rendered}
            </div>
          `;
          this.previewHtml.set(this.sanitizer.bypassSecurityTrustHtml(styledContent));
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
    const current = this.zoomLevel();
    if (current < 200) {
      this.zoomLevel.set(Math.min(200, current + 25));
    }
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    const current = this.zoomLevel();
    if (current > 50) {
      this.zoomLevel.set(Math.max(50, current - 25));
    }
  }

  /**
   * Ver JSON
   */
  viewJson(): void {
    // Convert XML to JSON for display
    try {
      const xmlContent = this.xmlData();
      let jsonData: any = {};

      const dataMatch = xmlContent.match(/<data>([\s\S]*)<\/data>/);
      if (dataMatch) {
        const innerXml = dataMatch[1];
        const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
        let match;
        while ((match = tagRegex.exec(innerXml)) !== null) {
          jsonData[match[1]] = match[2].trim();
        }
      }

      alert(JSON.stringify(jsonData, null, 2));
    } catch (error) {
      alert('Error parsing XML data');
    }
  }

  /**
   * Auto-guardado
   */
  async autoSave(): Promise<void> {
    if (this.templateName() && this.templateName() !== 'new-template') {
      try {
        const templateData = {
          name: this.templateName(),
          description: 'Template created with PrexView Studio',
          htmlContent: Object.values(this.sectionContent()).join('\n\n'),
          status: TemplateStatus.DRAFT,
          variables: this.detectedVariables(),
          metadata: {
            category: 'other',
            tags: [],
            version: '1.0.0'
          }
        };

        if (this.isEditMode()) {
          await this.templateService.saveTemplate({
            ...templateData,
            id: this.currentTemplate()!.id
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
    this.isSaving.set(true);

    try {
      const templateData = {
        name: this.templateName(),
        description: 'Template created with PrexView Studio',
        htmlContent: Object.values(this.sectionContent()).join('\n\n'),
        status: TemplateStatus.ACTIVE,
        variables: this.detectedVariables(),
        metadata: {
          category: 'other',
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
    } finally {
      this.isSaving.set(false);
    }
  }

  /**
   * Volver al dashboard
   */
  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
