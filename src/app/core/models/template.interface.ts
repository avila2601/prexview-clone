/**
 * Interfaz que representa una plantilla HTML con soporte para Handlebars
 * Entidad principal del dominio para el manejo de plantillas
 */
export interface Template {
  /** Identificador único de la plantilla */
  id: string;

  /** Nombre descriptivo de la plantilla */
  name: string;

  /** Descripción detallada de la plantilla y su propósito */
  description: string;

  /** Contenido HTML de la plantilla con sintaxis Handlebars */
  htmlContent: string;

  /** Variables dinámicas que utiliza la plantilla */
  variables: TemplateVariable[];

  /** Estado actual de la plantilla */
  status: TemplateStatus;

  /** Fecha de creación */
  createdAt: Date;

  /** Fecha de última modificación */
  updatedAt: Date;

  /** Usuario que creó la plantilla (opcional) */
  createdBy?: string;

  /** Metadatos adicionales de la plantilla */
  metadata?: TemplateMetadata;
}

/**
 * Interfaz que define las variables dinámicas de una plantilla
 */
export interface TemplateVariable {
  /** Nombre de la variable (usado en Handlebars) */
  name: string;

  /** Tipo de dato esperado */
  type: VariableType;

  /** Indica si la variable es obligatoria */
  required: boolean;

  /** Descripción de la variable para documentación */
  description?: string;

  /** Valor por defecto si no se proporciona */
  defaultValue?: any;

  /** Ejemplo de valor para esta variable */
  exampleValue?: any;

  /** Ruta completa de la variable en el objeto XML/JSON */
  path?: string;
}

/**
 * Metadatos adicionales de la plantilla
 */
export interface TemplateMetadata {
  /** Categoría de la plantilla */
  category: string;

  /** Tags para búsqueda y clasificación */
  tags: string[];

  /** Versión de la plantilla */
  version: string;

  /** Autor de la plantilla */
  author?: string;

  /** Información de licencia */
  license?: string;

  /** Plantilla base de la que deriva (si aplica) */
  baseTemplate?: string;
}

/**
 * Estados posibles de una plantilla
 */
export enum TemplateStatus {
  /** Plantilla en desarrollo */
  DRAFT = 'draft',

  /** Plantilla lista para usar */
  ACTIVE = 'active',

  /** Plantilla desactivada temporalmente */
  INACTIVE = 'inactive',

  /** Plantilla archivada */
  ARCHIVED = 'archived'
}

/**
 * Tipos de variables soportados en las plantillas
 */
export enum VariableType {
  /** Cadena de texto */
  STRING = 'string',

  /** Número entero o decimal */
  NUMBER = 'number',

  /** Valor booleano */
  BOOLEAN = 'boolean',

  /** Fecha */
  DATE = 'date',

  /** Array de elementos */
  ARRAY = 'array',

  /** Objeto complejo */
  OBJECT = 'object',

  /** URL o enlace */
  URL = 'url',

  /** Correo electrónico */
  EMAIL = 'email'
}
