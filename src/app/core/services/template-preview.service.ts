import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { TemplateService } from './template.service';
import { XmlParserService } from './xml-parser.service';

export interface PreviewOptions {
  includeCss?: boolean;
  cssContent?: string;
  xmlContent?: string;
  scaleToFit?: boolean;
  sanitize?: boolean;
}

export interface PreviewResult {
  html: SafeHtml | string;
  success: boolean;
  error?: string;
  compiledCss?: string;
  variables?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class TemplatePreviewService {

  constructor(
    private templateService: TemplateService,
    private xmlParser: XmlParserService,
    private sanitizer: DomSanitizer
  ) {}

  /**
   * Genera preview completo del template con datos y estilos
   */
  generatePreview(
    templateContent: string,
    options: PreviewOptions = {}
  ): Observable<PreviewResult> {

    const defaultOptions: PreviewOptions = {
      includeCss: true,
      cssContent: '',
      xmlContent: '',
      scaleToFit: false,
      sanitize: true,
      ...options
    };

    try {
      // Parse XML data to JSON
      let xmlDataParsed: any = {};
      if (defaultOptions.xmlContent) {
        xmlDataParsed = this.parseXmlToJson(defaultOptions.xmlContent);
      }

      // Compile template with data
      return this.templateService.compileTemplate(templateContent, xmlDataParsed).pipe(
        map((rendered: string) => {
          let finalHtml = rendered;

          // Add CSS if included
          if (defaultOptions.includeCss && defaultOptions.cssContent) {
            const compiledCss = this.compileCssContent(defaultOptions.cssContent);
            finalHtml = this.wrapWithStyles(rendered, compiledCss);
          }

          // Sanitize if requested
          const safeHtml = defaultOptions.sanitize
            ? this.sanitizer.bypassSecurityTrustHtml(finalHtml)
            : finalHtml;

          return {
            html: safeHtml,
            success: true,
            compiledCss: defaultOptions.includeCss ? this.compileCssContent(defaultOptions.cssContent || '') : undefined,
            variables: this.extractVariablesFromTemplate(templateContent)
          };
        }),
        catchError((error) => {
          console.error('Preview generation error:', error);
          return of({
            html: '',
            success: false,
            error: error.message || 'Unknown error occurred during preview generation'
          });
        })
      );

    } catch (error: any) {
      console.error('Preview setup error:', error);
      return of({
        html: '',
        success: false,
        error: error.message || 'Error setting up preview'
      });
    }
  }

  /**
   * Parsea XML a JSON manteniendo estructura anidada
   */
  public parseXmlToJson(xmlString: string): any {
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
   * Compila contenido SCSS/CSS reemplazando variables
   */
  private compileCssContent(cssContent: string): string {
    if (!cssContent) return '';

    let compiledCSS = cssContent;

    // Remove SCSS variable declarations
    compiledCSS = compiledCSS.replace(/\$[\w-]+:\s*[^;]+;/g, '');

    // Replace SCSS variables with actual values
    const scssVariables: { [key: string]: string } = {
      '$primary': '#6A77D8',
      '$grey': '#444',
      '$secondary': '#139ACE',
      '$darken': '#444'
    };

    Object.entries(scssVariables).forEach(([variable, value]) => {
      const regex = new RegExp(`\\${variable.replace('$', '\\$')}`, 'g');
      compiledCSS = compiledCSS.replace(regex, value);
    });

    // Clean up multiple empty lines
    compiledCSS = compiledCSS.replace(/\n\s*\n\s*\n/g, '\n\n');

    return compiledCSS;
  }

  /**
   * Envuelve el HTML renderizado con estilos CSS
   */
  private wrapWithStyles(htmlContent: string, cssContent: string): string {
    return `
      <style>${cssContent}</style>
      <div class="document-preview-content">
        ${htmlContent}
      </div>
    `;
  }

  /**
   * Extrae variables del template para análisis
   */
  private extractVariablesFromTemplate(template: string): string[] {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: string[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      const variableName = match[1].trim();
      if (!seen.has(variableName) && this.isValidVariableName(variableName)) {
        seen.add(variableName);
        variables.push(variableName);
      }
    }

    return variables;
  }

  /**
   * Verifica si es un nombre de variable válido
   */
  private isValidVariableName(variableName: string): boolean {
    // Excluir helpers (empiezan con $)
    if (variableName.startsWith('$')) {
      return false;
    }

    // Excluir expresiones con espacios (helpers o lógica)
    if (variableName.includes(' ')) {
      return false;
    }

    // Excluir bloques (#each, #if, #with, etc.)
    if (variableName.startsWith('#') || variableName.startsWith('/')) {
      return false;
    }

    return true;
  }

  /**
   * Convierte XML a JSON para vista (método de utilidad)
   */
  convertXmlToJsonForDisplay(xmlContent: string): any {
    try {
      const dataMatch = xmlContent.match(/<data>([\s\S]*)<\/data>/);
      if (dataMatch) {
        const innerXml = dataMatch[1];
        const result: any = {};
        const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
        let match;

        while ((match = tagRegex.exec(innerXml)) !== null) {
          result[match[1]] = match[2].trim();
        }

        return result;
      }
      return {};
    } catch (error) {
      console.error('XML to JSON conversion error:', error);
      return {};
    }
  }

  /**
   * Aplica scope CSS para que solo afecte al preview document
   */
  scopeCSSToPreview(css: string): string {
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
   * Combina múltiples secciones de template en un documento completo
   */
  combineTemplateSections(sections: Record<string, string>): string {
    const orderedSections = ['header', 'body', 'footer', 'pagination'];

    return orderedSections
      .map(section => sections[section] || '')
      .filter(content => content.trim().length > 0)
      .join('\n\n');
  }

  /**
   * Valida el contenido del template
   */
  validateTemplate(templateContent: string): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    // Verificar balance de llaves Handlebars
    const openBraces = (templateContent.match(/\{\{/g) || []).length;
    const closeBraces = (templateContent.match(/\}\}/g) || []).length;

    if (openBraces !== closeBraces) {
      errors.push(`Unbalanced Handlebars braces: ${openBraces} opening, ${closeBraces} closing`);
    }

    // Verificar balance de bloques Handlebars
    const openBlocks = (templateContent.match(/\{\{#\w+/g) || []).length;
    const closeBlocks = (templateContent.match(/\{\{\/\w+/g) || []).length;

    if (openBlocks !== closeBlocks) {
      errors.push(`Unbalanced Handlebars blocks: ${openBlocks} opening, ${closeBlocks} closing`);
    }

    // Verificar estructura HTML básica
    const htmlTags = ['<div>', '<span>', '<p>', '<table>', '<tr>', '<td>', '<th>'];
    const unclosedTags: string[] = [];

    htmlTags.forEach(tag => {
      const openTag = tag;
      const closeTag = tag.replace('<', '</');
      const openCount = (templateContent.match(new RegExp(openTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const closeCount = (templateContent.match(new RegExp(closeTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

      if (openCount !== closeCount) {
        unclosedTags.push(tag.replace('<', '').replace('>', ''));
      }
    });

    if (unclosedTags.length > 0) {
      errors.push(`Potentially unclosed HTML tags: ${unclosedTags.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
