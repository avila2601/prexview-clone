import { Injectable } from '@angular/core';
import { VariableType } from '../models';

export interface TemplateVariable {
  name: string;
  type: VariableType;
  description?: string;
  defaultValue?: any;
  required: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class TemplateVariablesAnalyzerService {

  constructor() {}

  /**
   * Detecta variables en el contenido de template usando regex
   */
  detectVariables(content: string): TemplateVariable[] {
    const variableRegex = /\{\{\s*([^}]+)\s*\}\}/g;
    const variables: TemplateVariable[] = [];
    const seen = new Set<string>();
    let match;

    while ((match = variableRegex.exec(content)) !== null) {
      const variableName = match[1].trim();

      // Filtrar helpers y expresiones complejas
      if (!seen.has(variableName) && this.isValidVariableName(variableName)) {
        seen.add(variableName);
        variables.push({
          name: variableName,
          type: this.inferVariableType(variableName),
          required: true,
          description: this.generateVariableDescription(variableName)
        });
      }
    }

    return variables;
  }

  /**
   * Verifica si es un nombre de variable válido (no helper o expresión compleja)
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

    // Excluir expresiones con operadores
    if (/[+\-*/%=<>!&|]/.test(variableName)) {
      return false;
    }

    return true;
  }

  /**
   * Infiere el tipo de variable basado en el nombre
   */
  private inferVariableType(name: string): VariableType {
    const lowerName = name.toLowerCase();

    // Patrones para fechas
    if (this.matchesPattern(lowerName, ['date', 'time', 'created', 'updated', 'issued', 'due'])) {
      return VariableType.DATE;
    }

    // Patrones para números/moneda
    if (this.matchesPattern(lowerName, ['amount', 'price', 'total', 'cost', 'tax', 'subtotal', 'quantity', 'rate', 'number', 'id'])) {
      return VariableType.NUMBER;
    }

    // Patrones para emails
    if (this.matchesPattern(lowerName, ['email', 'mail'])) {
      return VariableType.EMAIL;
    }

    // Patrones para URLs
    if (this.matchesPattern(lowerName, ['url', 'link', 'website', 'domain'])) {
      return VariableType.URL;
    }

    // Patrones para teléfonos
    if (this.matchesPattern(lowerName, ['phone', 'tel', 'mobile', 'fax'])) {
      return VariableType.STRING; // Podríamos crear un tipo PHONE
    }

    // Patrones para booleanos
    if (this.matchesPattern(lowerName, ['is_', 'has_', 'can_', 'should_', 'active', 'enabled', 'visible'])) {
      return VariableType.STRING; // Podríamos crear un tipo BOOLEAN
    }

    // Por defecto, string
    return VariableType.STRING;
  }

  /**
   * Verifica si el nombre coincide con algún patrón
   */
  private matchesPattern(name: string, patterns: string[]): boolean {
    return patterns.some(pattern => name.includes(pattern));
  }

  /**
   * Genera descripción automática basada en el nombre de la variable
   */
  private generateVariableDescription(name: string): string {
    const descriptions: { [key: string]: string } = {
      // Información de cliente/usuario
      'name': 'Customer or user name',
      'customer_name': 'Customer full name',
      'company_name': 'Company or business name',
      'first_name': 'First name',
      'last_name': 'Last name',

      // Contacto
      'email': 'Email address',
      'phone': 'Phone number',
      'mobile': 'Mobile phone number',
      'fax': 'Fax number',

      // Dirección
      'address': 'Physical address',
      'street': 'Street address',
      'city': 'City name',
      'state': 'State or province',
      'zip': 'ZIP or postal code',
      'country': 'Country name',

      // Fechas
      'date': 'Date value',
      'date_issued': 'Date when issued',
      'due_date': 'Due date',
      'created_at': 'Creation date',
      'updated_at': 'Last update date',

      // Financiero
      'amount': 'Monetary amount',
      'total': 'Total amount',
      'subtotal': 'Subtotal before taxes',
      'tax': 'Tax amount',
      'tax_rate': 'Tax rate percentage',
      'price': 'Unit price',
      'cost': 'Cost value',

      // Documento
      'title': 'Document title',
      'description': 'Description text',
      'notes': 'Additional notes',
      'comments': 'Comments',

      // Identificadores
      'id': 'Unique identifier',
      'invoice_number': 'Invoice number',
      'order_number': 'Order number',
      'reference': 'Reference number',

      // Cantidades
      'quantity': 'Quantity amount',
      'count': 'Count or number of items',
      'weight': 'Weight value',
      'size': 'Size specification'
    };

    // Buscar coincidencia exacta
    const exactMatch = descriptions[name.toLowerCase()];
    if (exactMatch) {
      return exactMatch;
    }

    // Buscar coincidencia parcial
    for (const [key, desc] of Object.entries(descriptions)) {
      if (name.toLowerCase().includes(key)) {
        return desc;
      }
    }

    // Generar descripción genérica
    return this.generateGenericDescription(name);
  }

  /**
   * Genera descripción genérica basada en el patrón del nombre
   */
  private generateGenericDescription(name: string): string {
    const cleanName = name.replace(/_/g, ' ').toLowerCase();

    // Capitalizar primera letra
    const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);

    return `Dynamic value for ${capitalized}`;
  }

  /**
   * Valida si las variables requeridas están presentes en los datos
   */
  validateRequiredVariables(variables: TemplateVariable[], data: any): {valid: boolean, missing: string[]} {
    const missing: string[] = [];

    variables.forEach(variable => {
      if (variable.required && !this.hasNestedProperty(data, variable.name)) {
        missing.push(variable.name);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }

  /**
   * Verifica si existe una propiedad anidada en el objeto
   */
  private hasNestedProperty(obj: any, path: string): boolean {
    if (!obj) return false;

    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current[key] === undefined) {
        return false;
      }
      current = current[key];
    }

    return true;
  }

  /**
   * Extrae variables de múltiples secciones de template
   */
  analyzeTemplateSections(sections: Record<string, string>): {
    allVariables: TemplateVariable[],
    sectionVariables: Record<string, TemplateVariable[]>
  } {
    const allVariables: TemplateVariable[] = [];
    const sectionVariables: Record<string, TemplateVariable[]> = {};
    const seenVariables = new Set<string>();

    Object.entries(sections).forEach(([sectionName, content]) => {
      const variables = this.detectVariables(content);
      sectionVariables[sectionName] = variables;

      // Agregar a la lista global sin duplicados
      variables.forEach(variable => {
        if (!seenVariables.has(variable.name)) {
          seenVariables.add(variable.name);
          allVariables.push(variable);
        }
      });
    });

    return {
      allVariables,
      sectionVariables
    };
  }

  /**
   * Genera sugerencias de mejora para variables
   */
  generateVariableSuggestions(variables: TemplateVariable[]): Array<{variable: string, suggestion: string, reason: string}> {
    const suggestions: Array<{variable: string, suggestion: string, reason: string}> = [];

    variables.forEach(variable => {
      const name = variable.name;

      // Sugerir nombres más descriptivos
      if (name.length <= 2) {
        suggestions.push({
          variable: name,
          suggestion: `Consider using a more descriptive name than "${name}"`,
          reason: 'Short variable names are harder to understand'
        });
      }

      // Sugerir convenciones de nomenclatura
      if (name.includes(' ')) {
        suggestions.push({
          variable: name,
          suggestion: `Use underscore_case instead of spaces: "${name.replace(/\s+/g, '_')}"`,
          reason: 'Spaces in variable names can cause issues'
        });
      }

      // Sugerir consistencia en prefijos
      if (name.startsWith('_') && !name.startsWith('_id') && !name.startsWith('_date')) {
        suggestions.push({
          variable: name,
          suggestion: `Consider removing leading underscore from "${name}"`,
          reason: 'Leading underscores are typically reserved for system variables'
        });
      }
    });

    return suggestions;
  }
}
