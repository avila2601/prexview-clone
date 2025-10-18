/**
 * Barrel exports para todos los modelos de dominio
 * Permite importar todos los tipos desde un solo lugar
 *
 * Uso:
 * import { Template, DocumentData, OutputFormat } from '@core/models';
 */

// Exportar todas las interfaces y enums de templates
export * from './template.interface';

// Exportar todas las interfaces y enums de document data
export * from './document-data.interface';

// Exportar todas las interfaces y enums de generated documents
export * from './generated-document.interface';

// Exportar todas las interfaces y enums de API
export * from './api.interface';

// Re-exportar tipos comunes con alias más descriptivos
import type { Template } from './template.interface';
import type { TemplateVariable } from './template.interface';
import type { DocumentData } from './document-data.interface';
import type { GeneratedDocument } from './generated-document.interface';

export type TemplateModel = Template;
export type TemplateVar = TemplateVariable;
export type XmlDocumentData = DocumentData;
export type PdfDocument = GeneratedDocument;

/**
 * Tipos auxiliares para el dominio
 */

// Union type para todos los formatos soportados
export type SupportedFormat = 'pdf' | 'html' | 'png' | 'jpg' | 'svg';

// Union type para estados de procesamiento
export type ProcessState = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Union type para estados de plantilla
export type TemplateState = 'draft' | 'active' | 'inactive' | 'archived';

// Union type para tipos de variable
export type VarType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object' | 'url' | 'email';

/**
 * Interfaces auxiliares para componentes
 */

// Interface para configuración de la aplicación
export interface AppConfig {
  apiUrl: string;
  maxFileSize: number;
  supportedFormats: SupportedFormat[];
  defaultTimeout: number;
  enableWatermark: boolean;
}

// Interface para estado global de la aplicación
export interface AppState {
  isLoading: boolean;
  currentTemplate?: TemplateModel;
  currentDocument?: XmlDocumentData;
  lastGeneratedDocument?: PdfDocument;
  errors: string[];
  warnings: string[];
}

// Interface para configuración de usuario
export interface UserPreferences {
  defaultOutputFormat: SupportedFormat;
  autoSave: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
}

/**
 * Constantes del dominio
 */
export const DOMAIN_CONSTANTS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_TEMPLATE_SIZE: 1024 * 1024, // 1MB
  DEFAULT_TIMEOUT: 30000, // 30 segundos
  SUPPORTED_XML_EXTENSIONS: ['.xml', '.xsd'],
  SUPPORTED_IMAGE_FORMATS: ['png', 'jpg', 'svg'],
  DEFAULT_PAGE_SIZE: 'A4',
  DEFAULT_DPI: 300,
  MIN_PASSWORD_LENGTH: 8
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  INVALID_XML: 'El archivo XML no es válido',
  TEMPLATE_NOT_FOUND: 'Plantilla no encontrada',
  PROCESSING_FAILED: 'Error al procesar el documento',
  FILE_TOO_LARGE: 'El archivo es demasiado grande',
  NETWORK_ERROR: 'Error de conexión',
  TIMEOUT_ERROR: 'Tiempo de espera agotado',
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso denegado',
  SERVER_ERROR: 'Error interno del servidor'
} as const;

/**
 * Mensajes de éxito comunes
 */
export const SUCCESS_MESSAGES = {
  TEMPLATE_SAVED: 'Plantilla guardada exitosamente',
  DOCUMENT_GENERATED: 'Documento generado exitosamente',
  FILE_UPLOADED: 'Archivo cargado exitosamente',
  DATA_VALIDATED: 'Datos validados correctamente',
  SETTINGS_UPDATED: 'Configuración actualizada'
} as const;
