import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as xml2js from 'xml2js';
import {
  DocumentData,
  ValidationError,
  ValidationWarning,
  ErrorSeverity,
  FileMetadata
} from '../models';

/**
 * Servicio para parsear y validar archivos XML
 * Convierte XML a objetos JavaScript y valida la estructura
 */
@Injectable({
  providedIn: 'root'
})
export class XmlParserService {

  private readonly parser: xml2js.Parser;

  constructor() {
    // Configurar parser XML con opciones optimizadas
    this.parser = new xml2js.Parser({
      explicitArray: false,      // No crear arrays para elementos únicos
      ignoreAttrs: false,        // Incluir atributos
      mergeAttrs: true,          // Fusionar atributos con contenido
      normalize: true,           // Normalizar espacios en blanco
      normalizeTags: false,      // Mantener case de tags
      trim: true,                // Quitar espacios al inicio/final
      explicitRoot: false,       // No crear nodo raíz extra
      emptyTag: '',              // Representar tags vacíos como string vacío
      explicitChildren: false,   // No crear estructura de children
      preserveChildrenOrder: false,
      charsAsChildren: false,
      includeWhiteChars: false,
      async: false
    });
  }

  /**
   * Parsea contenido XML a objeto JavaScript
   */
  parseXml(xmlContent: string, filename?: string): Observable<DocumentData> {
    return new Observable(observer => {
      try {
        // Validaciones previas
        const preValidationErrors = this.preValidateXml(xmlContent);
        if (preValidationErrors.length > 0) {
          const documentData: DocumentData = {
            xmlContent,
            parsedData: null,
            isValid: false,
            errors: preValidationErrors,
            warnings: [],
            contentHash: this.generateHash(xmlContent),
            processedAt: new Date(),
            fileSize: new Blob([xmlContent]).size,
            fileMetadata: filename ? this.createFileMetadata(filename) : undefined
          };
          observer.next(documentData);
          observer.complete();
          return;
        }

        // Parsear XML
        this.parser.parseString(xmlContent, (err: any, result: any) => {
          const errors: ValidationError[] = [];
          const warnings: ValidationWarning[] = [];

          if (err) {
            errors.push({
              code: 'XML_PARSE_ERROR',
              message: `XML parsing failed: ${err.message}`,
              line: this.extractLineNumber(err.message),
              column: this.extractColumnNumber(err.message),
              severity: ErrorSeverity.CRITICAL
            });
          }

          // Validaciones posteriores al parseo
          if (result && !err) {
            this.postParseValidation(result, warnings, errors);
          }

          const documentData: DocumentData = {
            xmlContent,
            parsedData: result || null,
            isValid: errors.length === 0,
            errors,
            warnings,
            contentHash: this.generateHash(xmlContent),
            processedAt: new Date(),
            fileSize: new Blob([xmlContent]).size,
            fileMetadata: filename ? this.createFileMetadata(filename) : undefined
          };

          observer.next(documentData);
          observer.complete();
        });
      } catch (error: any) {
        observer.error(error);
      }
    });
  }

  /**
   * Parsea archivo XML subido
   */
  parseXmlFile(file: File): Observable<DocumentData> {
    return new Observable(observer => {
      const reader = new FileReader();

      reader.onload = (event) => {
        const xmlContent = event.target?.result as string;
        this.parseXml(xmlContent, file.name).subscribe({
          next: (result) => observer.next(result),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      };

      reader.onerror = () => {
        observer.error(new Error('Failed to read file'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Valida estructura XML antes del parseo
   */
  private preValidateXml(xmlContent: string): ValidationError[] {
    const errors: ValidationError[] = [];

    // Verificar que no esté vacío
    if (!xmlContent.trim()) {
      errors.push({
        code: 'EMPTY_XML',
        message: 'XML content is empty',
        severity: ErrorSeverity.CRITICAL
      });
      return errors;
    }

    // Verificar que tenga estructura XML básica
    if (!xmlContent.trim().startsWith('<')) {
      errors.push({
        code: 'INVALID_XML_START',
        message: 'XML content must start with a tag',
        severity: ErrorSeverity.CRITICAL
      });
    }

    // Verificar balance básico de tags
    const openTags = (xmlContent.match(/<[^\/][^>]*[^\/]>/g) || []).length;
    const closeTags = (xmlContent.match(/<\/[^>]+>/g) || []).length;
    const selfClosingTags = (xmlContent.match(/<[^>]*\/>/g) || []).length;

    if (openTags !== closeTags + selfClosingTags) {
      errors.push({
        code: 'UNBALANCED_TAGS',
        message: 'XML tags appear to be unbalanced',
        severity: ErrorSeverity.ERROR
      });
    }

    // Verificar caracteres válidos
    const invalidChars = xmlContent.match(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g);
    if (invalidChars && invalidChars.length > 0) {
      errors.push({
        code: 'INVALID_CHARACTERS',
        message: 'XML contains invalid control characters',
        severity: ErrorSeverity.ERROR
      });
    }

    // Verificar tamaño razonable
    if (xmlContent.length > 10 * 1024 * 1024) { // 10MB
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: 'XML file is too large (>10MB)',
        severity: ErrorSeverity.ERROR
      });
    }

    return errors;
  }

  /**
   * Validaciones posteriores al parseo
   */
  private postParseValidation(
    parsedData: any,
    warnings: ValidationWarning[],
    errors: ValidationError[]
  ): void {

    // Verificar que hay datos
    if (!parsedData || Object.keys(parsedData).length === 0) {
      warnings.push({
        code: 'EMPTY_DATA',
        message: 'Parsed XML contains no data',
        suggestion: 'Verify that the XML file contains valid data elements'
      });
    }

    // Verificar profundidad del objeto
    const depth = this.getObjectDepth(parsedData);
    if (depth > 10) {
      warnings.push({
        code: 'DEEP_NESTING',
        message: `XML has very deep nesting (${depth} levels)`,
        suggestion: 'Consider flattening the XML structure for better performance'
      });
    }

    // Verificar tipos de datos
    this.validateDataTypes(parsedData, '', warnings);

    // Verificar nombres de campos
    this.validateFieldNames(parsedData, '', warnings);
  }

  /**
   * Valida tipos de datos en el objeto parseado
   */
  private validateDataTypes(obj: any, path: string, warnings: ValidationWarning[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Verificar valores que parecen números pero son strings
      if (typeof value === 'string' && /^\d+\.?\d*$/.test(value)) {
        warnings.push({
          code: 'NUMERIC_STRING',
          message: `Field '${currentPath}' contains a numeric value as string`,
          path: currentPath,
          suggestion: 'Consider using numeric data type'
        });
      }

      // Verificar fechas que parecen strings
      if (typeof value === 'string' && this.looksLikeDate(value)) {
        warnings.push({
          code: 'DATE_STRING',
          message: `Field '${currentPath}' appears to contain a date as string`,
          path: currentPath,
          suggestion: 'Consider using ISO date format'
        });
      }

      // Recursión para objetos anidados
      if (typeof value === 'object' && value !== null) {
        this.validateDataTypes(value, currentPath, warnings);
      }
    }
  }

  /**
   * Valida nombres de campos
   */
  private validateFieldNames(obj: any, path: string, warnings: ValidationWarning[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      // Verificar nombres con espacios
      if (key.includes(' ')) {
        warnings.push({
          code: 'FIELD_WITH_SPACES',
          message: `Field name '${key}' contains spaces`,
          path: currentPath,
          suggestion: 'Use camelCase or snake_case for field names'
        });
      }

      // Verificar nombres muy largos
      if (key.length > 50) {
        warnings.push({
          code: 'LONG_FIELD_NAME',
          message: `Field name '${key}' is very long (${key.length} characters)`,
          path: currentPath,
          suggestion: 'Consider using shorter, more descriptive names'
        });
      }

      // Recursión
      if (typeof value === 'object' && value !== null) {
        this.validateFieldNames(value, currentPath, warnings);
      }
    }
  }

  /**
   * Verifica si una cadena parece una fecha
   */
  private looksLikeDate(value: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,           // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/,         // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/,           // DD-MM-YYYY
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/ // ISO datetime
    ];

    return datePatterns.some(pattern => pattern.test(value));
  }

  /**
   * Calcula la profundidad de un objeto
   */
  private getObjectDepth(obj: any): number {
    if (typeof obj !== 'object' || obj === null) return 0;

    let maxDepth = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        maxDepth = Math.max(maxDepth, this.getObjectDepth(value) + 1);
      }
    }
    return maxDepth;
  }

  /**
   * Extrae número de línea del mensaje de error
   */
  private extractLineNumber(errorMessage: string): number | undefined {
    const match = errorMessage.match(/line (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Extrae número de columna del mensaje de error
   */
  private extractColumnNumber(errorMessage: string): number | undefined {
    const match = errorMessage.match(/column (\d+)/i);
    return match ? parseInt(match[1], 10) : undefined;
  }

  /**
   * Genera hash del contenido para detectar cambios
   */
  private generateHash(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Crea metadatos del archivo
   */
  private createFileMetadata(filename: string): FileMetadata {
    return {
      originalName: filename,
      mimeType: 'application/xml',
      lastModified: new Date(),
      encoding: 'UTF-8'
    };
  }

  /**
   * Valida XML contra estructura de plantilla
   */
  validateAgainstTemplate(
    documentData: DocumentData,
    templateVariables: any[]
  ): Observable<ValidationError[]> {
    return of([]).pipe(
      map(() => {
        const errors: ValidationError[] = [];

        if (!documentData.isValid || !documentData.parsedData) {
          return errors;
        }

        // Verificar que existan las variables requeridas
        templateVariables.forEach(variable => {
          if (variable.required) {
            const hasValue = this.hasNestedProperty(documentData.parsedData, variable.name);
            if (!hasValue) {
              errors.push({
                code: 'MISSING_REQUIRED_FIELD',
                message: `Required field '${variable.name}' is missing`,
                path: variable.name,
                severity: ErrorSeverity.ERROR
              });
            }
          }
        });

        return errors;
      })
    );
  }

  /**
   * Verifica si existe una propiedad anidada en un objeto
   */
  private hasNestedProperty(obj: any, path: string): boolean {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined;
    }, obj) !== undefined;
  }

  /**
   * Convierte objeto JavaScript de vuelta a XML
   */
  objectToXml(obj: any, rootElement: string = 'root'): Observable<string> {
    return new Observable(observer => {
      try {
        const builder = new xml2js.Builder({
          rootName: rootElement,
          xmldec: { version: '1.0', encoding: 'UTF-8' },
          renderOpts: { pretty: true, indent: '  ' }
        });

        const xml = builder.buildObject(obj);
        observer.next(xml);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Obtiene muestra de datos XML para pruebas
   */
  getSampleXmlData(): { [key: string]: string } {
    return {
      invoice: `<?xml version="1.0" encoding="UTF-8"?>
<invoice>
  <number>INV-2024-001</number>
  <date>2024-10-18</date>
  <subtotal>1600.00</subtotal>
  <tax>160.00</tax>
  <taxRate>10</taxRate>
  <total>1760.00</total>
  <notes>Thank you for your business!</notes>
  <company>
    <name>TechCorp Solutions</name>
    <address>123 Business St</address>
    <city>Madrid</city>
    <country>Spain</country>
    <taxId>ESB12345678</taxId>
  </company>
  <customer>
    <name>Juan Pérez</name>
    <company>Pérez Consulting</company>
    <address>456 Client Ave</address>
    <city>Barcelona</city>
    <country>Spain</country>
    <email>juan.perez@email.com</email>
  </customer>
  <items>
    <item>
      <description>Web Development Services</description>
      <quantity>40</quantity>
      <price>35.00</price>
    </item>
    <item>
      <description>Technical Consultation</description>
      <quantity>8</quantity>
      <price>50.00</price>
    </item>
  </items>
</invoice>`,

      report: `<?xml version="1.0" encoding="UTF-8"?>
<report>
  <title>Monthly Sales Report</title>
  <generatedAt>2024-10-18T10:30:00Z</generatedAt>
  <period>October 2024</period>
  <summary>
    <item>
      <label>Total Sales</label>
      <value>€125,430</value>
    </item>
    <item>
      <label>New Customers</label>
      <value>23</value>
    </item>
    <item>
      <label>Growth Rate</label>
      <value>+15.2%</value>
    </item>
  </summary>
  <dataHeaders>
    <header>Product</header>
    <header>Units Sold</header>
    <header>Revenue</header>
  </dataHeaders>
  <data>
    <row>
      <cell>Web Development</cell>
      <cell>45</cell>
      <cell>€67,500</cell>
    </row>
    <row>
      <cell>Consulting</cell>
      <cell>28</cell>
      <cell>€42,000</cell>
    </row>
    <row>
      <cell>Support</cell>
      <cell>156</cell>
      <cell>€15,930</cell>
    </row>
  </data>
</report>`
    };
  }
}
