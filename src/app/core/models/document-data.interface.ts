/**
 * Interfaz que representa los datos XML/JSON procesados
 * Contiene tanto el contenido original como los datos parseados
 */
export interface DocumentData {
  /** Contenido XML original como string */
  xmlContent: string;

  /** Datos parseados a objeto JavaScript */
  parsedData: any;

  /** Indica si el XML es válido y se parseó correctamente */
  isValid: boolean;

  /** Lista de errores encontrados durante el parsing */
  errors: ValidationError[];

  /** Advertencias no críticas */
  warnings: ValidationWarning[];

  /** Hash del contenido para detectar cambios */
  contentHash: string;

  /** Fecha cuando se procesaron los datos */
  processedAt: Date;

  /** Tamaño del archivo XML en bytes */
  fileSize: number;

  /** Metadatos del archivo original */
  fileMetadata?: FileMetadata;
}

/**
 * Información sobre errores de validación
 */
export interface ValidationError {
  /** Código único del error */
  code: string;

  /** Mensaje descriptivo del error */
  message: string;

  /** Línea donde ocurrió el error */
  line?: number;

  /** Columna donde ocurrió el error */
  column?: number;

  /** Ruta del elemento que causó el error */
  path?: string;

  /** Severidad del error */
  severity: ErrorSeverity;
}

/**
 * Información sobre advertencias de validación
 */
export interface ValidationWarning {
  /** Código único de la advertencia */
  code: string;

  /** Mensaje descriptivo de la advertencia */
  message: string;

  /** Ruta del elemento que generó la advertencia */
  path?: string;

  /** Sugerencia para resolver la advertencia */
  suggestion?: string;
}

/**
 * Metadatos del archivo original
 */
export interface FileMetadata {
  /** Nombre original del archivo */
  originalName: string;

  /** Tipo MIME del archivo */
  mimeType: string;

  /** Fecha de última modificación */
  lastModified: Date;

  /** Codificación del archivo */
  encoding?: string;
}

/**
 * Niveles de severidad para errores
 */
export enum ErrorSeverity {
  /** Error crítico que impide el procesamiento */
  CRITICAL = 'critical',

  /** Error que puede afectar el resultado */
  ERROR = 'error',

  /** Advertencia que no impide el procesamiento */
  WARNING = 'warning',

  /** Información adicional */
  INFO = 'info'
}
