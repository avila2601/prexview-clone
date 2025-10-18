// Imports necesarios de otros archivos de modelos
import {
  OutputFormat,
  ProcessingStatus,
  GeneratedDocument,
  DocumentMetadata,
  PageSetup
} from './generated-document.interface';

import {
  Template,
  TemplateStatus
} from './template.interface';

import {
  DocumentData,
  ValidationError
} from './document-data.interface';

/**
 * Modelos para las peticiones y respuestas de la API
 * Definen la estructura de comunicación con el backend
 */

/**
 * Request para transformar datos + plantilla en documento
 */
export interface TransformDocumentRequest {
  /** ID de la plantilla a utilizar */
  templateId: string;

  /** Contenido XML con los datos */
  xmlData: string;

  /** Formato de salida deseado */
  outputFormat: OutputFormat;

  /** Configuraciones opcionales */
  options?: TransformOptions;

  /** Metadatos adicionales para el documento */
  metadata?: Partial<DocumentMetadata>;
}

/**
 * Opciones para la transformación
 */
export interface TransformOptions {
  /** Configuración de página */
  pageSetup?: Partial<PageSetup>;

  /** Calidad de la imagen (para PNG/JPG) */
  imageQuality?: number;

  /** Escala para la renderización */
  scale?: number;

  /** Timeout para el procesamiento en segundos */
  timeout?: number;

  /** Incluir marcas de agua */
  watermark?: WatermarkOptions;

  /** Validar datos antes del procesamiento */
  validateData?: boolean;
}

/**
 * Opciones para marca de agua
 */
export interface WatermarkOptions {
  /** Texto de la marca de agua */
  text: string;

  /** Posición de la marca de agua */
  position: WatermarkPosition;

  /** Opacidad (0-1) */
  opacity: number;

  /** Color en formato hex */
  color?: string;

  /** Tamaño de fuente */
  fontSize?: number;
}

/**
 * Respuesta de la transformación de documento
 */
export interface TransformDocumentResponse {
  /** Indica si la operación fue exitosa */
  success: boolean;

  /** ID del documento generado */
  documentId: string;

  /** URL para descargar el documento */
  downloadUrl: string;

  /** URL para previsualizar el documento */
  previewUrl?: string;

  /** Información del documento generado */
  document: GeneratedDocument;

  /** Tiempo de procesamiento en ms */
  processingTime: number;

  /** Mensaje de éxito o información adicional */
  message?: string;
}

/**
 * Request para cargar un archivo XML
 */
export interface UploadXmlRequest {
  /** Archivo XML */
  file: File;

  /** Validar estructura del XML */
  validate?: boolean;

  /** Plantilla para validación (opcional) */
  templateId?: string;
}

/**
 * Respuesta de carga de archivo XML
 */
export interface UploadXmlResponse {
  /** Indica si la carga fue exitosa */
  success: boolean;

  /** Datos parseados del XML */
  documentData: DocumentData;

  /** Mensaje de resultado */
  message: string;

  /** Sugerencias de plantillas compatibles */
  suggestedTemplates?: Template[];
}

/**
 * Request para guardar una plantilla
 */
export interface SaveTemplateRequest {
  /** Datos de la plantilla */
  template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>;

  /** Validar la plantilla antes de guardar */
  validate?: boolean;
}

/**
 * Respuesta de guardado de plantilla
 */
export interface SaveTemplateResponse {
  /** Indica si el guardado fue exitoso */
  success: boolean;

  /** Plantilla guardada con IDs generados */
  template: Template;

  /** Errores de validación encontrados */
  validationErrors?: ValidationError[];

  /** Mensaje de resultado */
  message: string;
}

/**
 * Request para obtener plantillas
 */
export interface GetTemplatesRequest {
  /** Filtrar por categoría */
  category?: string;

  /** Filtrar por estado */
  status?: TemplateStatus;

  /** Búsqueda por texto */
  search?: string;

  /** Paginación: página actual */
  page?: number;

  /** Paginación: elementos por página */
  limit?: number;

  /** Campo para ordenar */
  sortBy?: string;

  /** Dirección de ordenamiento */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Respuesta de obtención de plantillas
 */
export interface GetTemplatesResponse {
  /** Lista de plantillas */
  templates: Template[];

  /** Información de paginación */
  pagination: PaginationInfo;

  /** Total de plantillas que coinciden con los filtros */
  totalCount: number;
}

/**
 * Información de paginación
 */
export interface PaginationInfo {
  /** Página actual */
  currentPage: number;

  /** Total de páginas */
  totalPages: number;

  /** Elementos por página */
  itemsPerPage: number;

  /** Total de elementos */
  totalItems: number;

  /** Hay página siguiente */
  hasNext: boolean;

  /** Hay página anterior */
  hasPrevious: boolean;
}

/**
 * Respuesta de error estándar de la API
 */
export interface ApiErrorResponse {
  /** Indica que hubo un error */
  success: false;

  /** Código de error */
  errorCode: string;

  /** Mensaje de error */
  message: string;

  /** Detalles adicionales del error */
  details?: any;

  /** Timestamp del error */
  timestamp: Date;

  /** ID de la petición para tracking */
  requestId?: string;
}

/**
 * Tipo union para todas las respuestas de la API
 */
export type ApiResponse<T = any> = T | ApiErrorResponse;

/**
 * Posiciones para marca de agua
 */
export enum WatermarkPosition {
  TOP_LEFT = 'top-left',
  TOP_CENTER = 'top-center',
  TOP_RIGHT = 'top-right',
  CENTER_LEFT = 'center-left',
  CENTER = 'center',
  CENTER_RIGHT = 'center-right',
  BOTTOM_LEFT = 'bottom-left',
  BOTTOM_CENTER = 'bottom-center',
  BOTTOM_RIGHT = 'bottom-right'
}
