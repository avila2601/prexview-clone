import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as Handlebars from 'handlebars';
import {
  Template,
  TemplateStatus,
  VariableType,
  ValidationError,
  ErrorSeverity
} from '../models';
import { HandlebarsHelpers } from '../utils/handlebars-helpers';

/**
 * Servicio para gestión de plantillas HTML con soporte Handlebars
 * Implementa CRUD completo y validación de plantillas
 */
@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private readonly STORAGE_KEY = 'prexview_templates';
  private templatesSubject = new BehaviorSubject<Template[]>([]);
  public templates$ = this.templatesSubject.asObservable();

  constructor() {
    // Registrar todos los helpers de Handlebars
    HandlebarsHelpers.registerAllHelpers();
    this.loadTemplates();
  }

  /**
   * Carga plantillas desde localStorage o inicializa con plantillas mock
   */
  private loadTemplates(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const templates = JSON.parse(stored).map((t: any) => ({
          ...t,
          createdAt: new Date(t.createdAt),
          updatedAt: new Date(t.updatedAt)
        }));
        this.templatesSubject.next(templates);
      } else {
        this.loadMockTemplates();
      }
    } catch (error) {
      console.warn('Error loading templates from storage, using mock data:', error);
      this.loadMockTemplates();
    }
  }

  /**
   * Carga plantillas de ejemplo
   */
  private loadMockTemplates(): void {
    const mockTemplates: Template[] = [
      {
        id: '1',
        name: 'Invoice Template',
        description: 'Professional invoice template with itemized billing and totals',
        htmlContent: `
          <div class="invoice-container">
            <div class="header">
              <h1 class="invoice-title">INVOICE</h1>
              <div class="invoice-number">Invoice #{{invoice.number}}</div>
              <div class="invoice-date">Date: {{formatDate invoice.date}}</div>
            </div>

            <div class="company-info">
              <h2>{{company.name}}</h2>
              <p>{{company.address}}</p>
              <p>{{company.city}}, {{company.country}}</p>
              <p>Tax ID: {{company.taxId}}</p>
            </div>

            <div class="customer-info">
              <h3>Bill To:</h3>
              <div class="customer-details">
                <strong>{{customer.name}}</strong><br>
                {{#if customer.company}}{{customer.company}}<br>{{/if}}
                {{customer.address}}<br>
                {{customer.city}}, {{customer.country}}<br>
                Email: {{customer.email}}
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {{#eachWithIndex items}}
                <tr class="{{#if isFirst}}first-row{{/if}} {{#if isLast}}last-row{{/if}}">
                  <td>{{description}}</td>
                  <td class="quantity">{{quantity}}</td>
                  <td class="price">{{currency price}}</td>
                  <td class="total">{{currency (multiply quantity price)}}</td>
                </tr>
                {{/eachWithIndex}}
              </tbody>
            </table>

            <div class="totals-section">
              <div class="totals-row">
                <span class="label">Subtotal:</span>
                <span class="amount">{{currency invoice.subtotal}}</span>
              </div>
              {{#if invoice.tax}}
              <div class="totals-row">
                <span class="label">Tax ({{invoice.taxRate}}%):</span>
                <span class="amount">{{currency invoice.tax}}</span>
              </div>
              {{/if}}
              <div class="totals-row total-final">
                <span class="label">TOTAL:</span>
                <span class="amount">{{currency invoice.total}}</span>
              </div>
            </div>

            {{#if invoice.notes}}
            <div class="notes-section">
              <h4>Notes:</h4>
              <p>{{invoice.notes}}</p>
            </div>
            {{/if}}
          </div>

          <style>
            .invoice-container {
              font-family: 'Arial', sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
              background: white;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #007bff;
              padding-bottom: 20px;
            }
            .invoice-title {
              font-size: 36px;
              color: #007bff;
              margin: 0;
              font-weight: bold;
            }
            .invoice-number, .invoice-date {
              font-size: 14px;
              color: #666;
              margin: 5px 0;
            }
            .company-info {
              margin-bottom: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .company-info h2 {
              color: #007bff;
              margin-top: 0;
            }
            .customer-info {
              margin-bottom: 30px;
            }
            .customer-info h3 {
              color: #007bff;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
            }
            .customer-details {
              margin-top: 10px;
              line-height: 1.6;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .items-table th {
              background: #007bff;
              color: white;
              padding: 15px 10px;
              text-align: left;
              font-weight: bold;
            }
            .items-table td {
              padding: 12px 10px;
              border-bottom: 1px solid #eee;
            }
            .items-table .quantity, .items-table .price, .items-table .total {
              text-align: right;
            }
            .items-table .first-row td {
              border-top: 2px solid #007bff;
            }
            .totals-section {
              text-align: right;
              margin-top: 30px;
              padding: 20px;
              background: #f8f9fa;
              border-radius: 8px;
            }
            .totals-row {
              display: flex;
              justify-content: space-between;
              margin: 10px 0;
              padding: 5px 0;
            }
            .total-final {
              font-size: 20px;
              font-weight: bold;
              color: #007bff;
              border-top: 2px solid #007bff;
              padding-top: 15px;
              margin-top: 15px;
            }
            .notes-section {
              margin-top: 40px;
              padding: 20px;
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              border-radius: 4px;
            }
            .notes-section h4 {
              color: #856404;
              margin-top: 0;
            }
          </style>
        `,
        variables: [
          { name: 'invoice.number', type: VariableType.STRING, required: true, description: 'Invoice number' },
          { name: 'invoice.date', type: VariableType.DATE, required: true, description: 'Invoice date' },
          { name: 'invoice.subtotal', type: VariableType.NUMBER, required: true, description: 'Subtotal amount' },
          { name: 'invoice.tax', type: VariableType.NUMBER, required: false, description: 'Tax amount' },
          { name: 'invoice.taxRate', type: VariableType.NUMBER, required: false, description: 'Tax rate percentage' },
          { name: 'invoice.total', type: VariableType.NUMBER, required: true, description: 'Total amount' },
          { name: 'invoice.notes', type: VariableType.STRING, required: false, description: 'Additional notes' },
          { name: 'company.name', type: VariableType.STRING, required: true, description: 'Company name' },
          { name: 'company.address', type: VariableType.STRING, required: true, description: 'Company address' },
          { name: 'company.city', type: VariableType.STRING, required: true, description: 'Company city' },
          { name: 'company.country', type: VariableType.STRING, required: true, description: 'Company country' },
          { name: 'company.taxId', type: VariableType.STRING, required: false, description: 'Company tax ID' },
          { name: 'customer.name', type: VariableType.STRING, required: true, description: 'Customer name' },
          { name: 'customer.company', type: VariableType.STRING, required: false, description: 'Customer company' },
          { name: 'customer.address', type: VariableType.STRING, required: true, description: 'Customer address' },
          { name: 'customer.city', type: VariableType.STRING, required: true, description: 'Customer city' },
          { name: 'customer.country', type: VariableType.STRING, required: true, description: 'Customer country' },
          { name: 'customer.email', type: VariableType.EMAIL, required: true, description: 'Customer email' },
          { name: 'items', type: VariableType.ARRAY, required: true, description: 'Invoice items array' }
        ],
        status: TemplateStatus.ACTIVE,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-02-01'),
        createdBy: 'admin',
        metadata: {
          category: 'Financial',
          tags: ['invoice', 'billing', 'finance', 'professional'],
          version: '2.0',
          author: 'PrexView Team',
          license: 'MIT'
        }
      },
      {
        id: '2',
        name: 'Simple Report Template',
        description: 'Basic report template for data visualization',
        htmlContent: `
          <div class="report-container">
            <div class="report-header">
              <h1>{{report.title}}</h1>
              <div class="report-meta">
                <span>Generated on: {{formatDate report.generatedAt}}</span>
                <span>Period: {{report.period}}</span>
              </div>
            </div>

            <div class="summary-section">
              <h2>Summary</h2>
              <div class="summary-grid">
                {{#each summary}}
                <div class="summary-card">
                  <div class="summary-value">{{value}}</div>
                  <div class="summary-label">{{label}}</div>
                </div>
                {{/each}}
              </div>
            </div>

            {{#if data}}
            <div class="data-section">
              <h2>Data</h2>
              <table class="data-table">
                <thead>
                  <tr>
                    {{#each dataHeaders}}
                    <th>{{this}}</th>
                    {{/each}}
                  </tr>
                </thead>
                <tbody>
                  {{#each data}}
                  <tr>
                    {{#each this}}
                    <td>{{this}}</td>
                    {{/each}}
                  </tr>
                  {{/each}}
                </tbody>
              </table>
            </div>
            {{/if}}
          </div>

          <style>
            .report-container {
              font-family: 'Arial', sans-serif;
              max-width: 900px;
              margin: 0 auto;
              padding: 30px;
            }
            .report-header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 2px solid #28a745;
              padding-bottom: 20px;
            }
            .report-header h1 {
              color: #28a745;
              margin: 0 0 10px 0;
            }
            .report-meta span {
              display: inline-block;
              margin: 0 15px;
              color: #666;
            }
            .summary-section {
              margin-bottom: 40px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 20px;
              margin-top: 20px;
            }
            .summary-card {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              text-align: center;
              border-left: 4px solid #28a745;
            }
            .summary-value {
              font-size: 24px;
              font-weight: bold;
              color: #28a745;
            }
            .summary-label {
              color: #666;
              margin-top: 5px;
            }
            .data-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .data-table th {
              background: #28a745;
              color: white;
              padding: 12px;
              text-align: left;
            }
            .data-table td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
            }
            .data-table tr:nth-child(even) {
              background: #f8f9fa;
            }
          </style>
        `,
        variables: [
          { name: 'report.title', type: VariableType.STRING, required: true, description: 'Report title' },
          { name: 'report.generatedAt', type: VariableType.DATE, required: true, description: 'Generation date' },
          { name: 'report.period', type: VariableType.STRING, required: true, description: 'Report period' },
          { name: 'summary', type: VariableType.ARRAY, required: true, description: 'Summary data array' },
          { name: 'dataHeaders', type: VariableType.ARRAY, required: false, description: 'Table headers' },
          { name: 'data', type: VariableType.ARRAY, required: false, description: 'Table data rows' }
        ],
        status: TemplateStatus.ACTIVE,
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-02-15'),
        createdBy: 'admin',
        metadata: {
          category: 'Reports',
          tags: ['report', 'data', 'simple'],
          version: '1.0',
          author: 'PrexView Team',
          license: 'MIT'
        }
      }
    ];

    this.templatesSubject.next(mockTemplates);
    this.saveToStorage(mockTemplates);
  }

  /**
   * Guarda plantillas en localStorage
   */
  private saveToStorage(templates: Template[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates));
    } catch (error) {
      console.error('Error saving templates to storage:', error);
    }
  }

  /**
   * Obtiene todas las plantillas
   */
  getTemplates(): Observable<Template[]> {
    return this.templates$;
  }

  /**
   * Obtiene una plantilla por ID
   */
  getTemplateById(id: string): Observable<Template | undefined> {
    return this.templates$.pipe(
      map(templates => templates.find(t => t.id === id))
    );
  }

  /**
   * Filtra plantillas por criterios
   */
  filterTemplates(
    category?: string,
    status?: TemplateStatus,
    search?: string
  ): Observable<Template[]> {
    return this.templates$.pipe(
      map(templates => {
        return templates.filter(template => {
          if (category && template.metadata?.category !== category) return false;
          if (status && template.status !== status) return false;
          if (search) {
            const searchLower = search.toLowerCase();
            return template.name.toLowerCase().includes(searchLower) ||
                   template.description.toLowerCase().includes(searchLower) ||
                   template.metadata?.tags.some(tag => tag.toLowerCase().includes(searchLower));
          }
          return true;
        });
      })
    );
  }

  /**
   * Guarda una plantilla (crear o actualizar)
   */
  saveTemplate(templateData: Partial<Template>): Observable<Template> {
    return new Observable(observer => {
      try {
        const templates = [...this.templatesSubject.value];
        let savedTemplate: Template;

        if (templateData.id) {
          // Actualizar existente
          const index = templates.findIndex(t => t.id === templateData.id);
          if (index >= 0) {
            savedTemplate = {
              ...templates[index],
              ...templateData,
              updatedAt: new Date()
            } as Template;
            templates[index] = savedTemplate;
          } else {
            observer.error(new Error('Template not found'));
            return;
          }
        } else {
          // Crear nuevo
          savedTemplate = {
            id: Date.now().toString(),
            name: templateData.name || 'New Template',
            description: templateData.description || '',
            htmlContent: templateData.htmlContent || '',
            variables: templateData.variables || [],
            status: templateData.status || TemplateStatus.DRAFT,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: templateData.createdBy || 'user',
            metadata: templateData.metadata || {
              category: 'General',
              tags: [],
              version: '1.0'
            }
          } as Template;
          templates.push(savedTemplate);
        }

        this.templatesSubject.next(templates);
        this.saveToStorage(templates);
        observer.next(savedTemplate);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Elimina una plantilla
   */
  deleteTemplate(id: string): Observable<boolean> {
    return new Observable(observer => {
      try {
        const templates = this.templatesSubject.value.filter(t => t.id !== id);
        this.templatesSubject.next(templates);
        this.saveToStorage(templates);
        observer.next(true);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Valida la sintaxis de una plantilla Handlebars
   */
  validateTemplate(htmlContent: string): Observable<ValidationError[]> {
    return new Observable(observer => {
      const errors: ValidationError[] = [];

      try {
        // Intentar compilar la plantilla
        Handlebars.compile(htmlContent);

        // Validaciones adicionales
        this.validateTemplateStructure(htmlContent, errors);

        observer.next(errors);
        observer.complete();
      } catch (error: any) {
        errors.push({
          code: 'HANDLEBARS_SYNTAX_ERROR',
          message: `Handlebars syntax error: ${error.message}`,
          severity: ErrorSeverity.CRITICAL
        });
        observer.next(errors);
        observer.complete();
      }
    });
  }

  /**
   * Valida la estructura de la plantilla
   */
  private validateTemplateStructure(htmlContent: string, errors: ValidationError[]): void {
    // Verificar que tenga contenido
    if (!htmlContent.trim()) {
      errors.push({
        code: 'EMPTY_TEMPLATE',
        message: 'Template content cannot be empty',
        severity: ErrorSeverity.ERROR
      });
    }

    // Verificar balance de etiquetas HTML básicas
    const openTags = (htmlContent.match(/<(?!\/)[^>]*>/g) || []).length;
    const closeTags = (htmlContent.match(/<\/[^>]*>/g) || []).length;

    if (Math.abs(openTags - closeTags) > 5) { // Tolerancia para self-closing tags
      errors.push({
        code: 'UNBALANCED_HTML',
        message: 'Possible unbalanced HTML tags detected',
        severity: ErrorSeverity.WARNING
      });
    }

    // Verificar uso de variables Handlebars
    const handlebarsVars = htmlContent.match(/\{\{[^}]+\}\}/g);
    if (!handlebarsVars || handlebarsVars.length === 0) {
      errors.push({
        code: 'NO_VARIABLES',
        message: 'Template does not contain any Handlebars variables',
        severity: ErrorSeverity.WARNING
      });
    }
  }

  /**
   * Compila una plantilla con datos de prueba
   */
  compileTemplate(templateId: string, data: any): Observable<string>;
  compileTemplate(htmlContent: string, data: any): Observable<string>;
  compileTemplate(templateIdOrHtml: string, data: any): Observable<string> {
    // Si parece ser HTML (contiene tags), compilar directamente
    if (templateIdOrHtml.includes('<') && templateIdOrHtml.includes('>')) {
      return new Observable(observer => {
        try {
          const compiledTemplate = Handlebars.compile(templateIdOrHtml);
          const result = compiledTemplate(data);
          observer.next(result);
          observer.complete();
        } catch (error: any) {
          observer.error(new Error(`Template compilation failed: ${error.message}`));
        }
      });
    } else {
      // Si no, buscar por ID
      return this.getTemplateById(templateIdOrHtml).pipe(
        map(template => {
          if (!template) {
            throw new Error('Template not found');
          }

          try {
            const compiledTemplate = Handlebars.compile(template.htmlContent);
            return compiledTemplate(data);
          } catch (error: any) {
            throw new Error(`Template compilation failed: ${error.message}`);
          }
        }),
        catchError(error => throwError(() => error))
      );
    }
  }

  /**
   * Obtiene categorías únicas de las plantillas
   */
  getCategories(): Observable<string[]> {
    return this.templates$.pipe(
      map(templates => {
        const categories = templates
          .map(t => t.metadata?.category)
          .filter((category): category is string => !!category);
        return [...new Set(categories)].sort();
      })
    );
  }

  /**
   * Obtiene estadísticas de las plantillas
   */
  getTemplateStats(): Observable<{
    total: number;
    active: number;
    draft: number;
    categories: { [key: string]: number };
  }> {
    return this.templates$.pipe(
      map(templates => {
        const stats = {
          total: templates.length,
          active: templates.filter(t => t.status === TemplateStatus.ACTIVE).length,
          draft: templates.filter(t => t.status === TemplateStatus.DRAFT).length,
          categories: {} as { [key: string]: number }
        };

        // Contar por categorías
        templates.forEach(template => {
          const category = template.metadata?.category || 'Other';
          stats.categories[category] = (stats.categories[category] || 0) + 1;
        });

        return stats;
      })
    );
  }
}
