/**
 * Interfaz que representa un documento PDF generado
 * Contiene el resultado final del procesamiento
 */
export interface GeneratedDocument {
  /** Identificador único del documento generado */
  id: string;

  /** ID de la plantilla utilizada */
  templateId: string;

  /** Nombre de la plantilla utilizada */
  templateName: string;

  /** Blob del archivo PDF generado */
  pdfBlob: Blob;

  /** HTML renderizado (antes de convertir a PDF) */
  previewHtml: string;

  /** URL temporal para descargar el documento */
  downloadUrl?: string;

  /** Formato de salida del documento */
  outputFormat: OutputFormat;

  /** Estado del procesamiento */
  status: ProcessingStatus;

  /** Fecha y hora de generación */
  generatedAt: Date;

  /** Tiempo que tomó generar el documento (en ms) */
  processingTime: number;

  /** Tamaño del archivo generado en bytes */
  fileSize: number;

  /** Hash de los datos utilizados */
  dataHash: string;

  /** Metadatos adicionales del documento */
  metadata: DocumentMetadata;

  /** Errores ocurridos durante la generación */
  errors: ProcessingError[];
}

/**
 * Metadatos del documento generado
 */
export interface DocumentMetadata {
  /** Título del documento */
  title?: string;

  /** Autor del documento */
  author?: string;

  /** Descripción del documento */
  subject?: string;

  /** Palabras clave */
  keywords?: string[];

  /** Aplicación que generó el documento */
  creator: string;

  /** Número de páginas del documento */
  pageCount?: number;

  /** Configuración de página utilizada */
  pageSetup?: PageSetup;
}

/**
 * Configuración de página para el documento
 */
export interface PageSetup {
  /** Tamaño de página */
  pageSize: PageSize;

  /** Orientación de la página */
  orientation: PageOrientation;

  /** Márgenes de la página */
  margins: PageMargins;

  /** DPI para la generación */
  dpi?: number;
}

/**
 * Márgenes de página
 */
export interface PageMargins {
  /** Margen superior en mm */
  top: number;

  /** Margen derecho en mm */
  right: number;

  /** Margen inferior en mm */
  bottom: number;

  /** Margen izquierdo en mm */
  left: number;
}

/**
 * Errores de procesamiento
 */
export interface ProcessingError {
  /** Código del error */
  code: string;

  /** Mensaje del error */
  message: string;

  /** Fase donde ocurrió el error */
  phase: ProcessingPhase;

  /** Detalles técnicos del error */
  details?: any;

  /** Timestamp del error */
  timestamp: Date;
}

/**
 * Formatos de salida soportados
 */
export enum OutputFormat {
  /** Documento PDF */
  PDF = 'pdf',

  /** Página HTML */
  HTML = 'html',

  /** Imagen PNG */
  PNG = 'png',

  /** Imagen JPG */
  JPG = 'jpg',

  /** Imagen SVG */
  SVG = 'svg'
}

/**
 * Estados del procesamiento de documentos
 */
export enum ProcessingStatus {
  /** Procesamiento en cola */
  QUEUED = 'queued',

  /** Procesando actualmente */
  PROCESSING = 'processing',

  /** Completado exitosamente */
  COMPLETED = 'completed',

  /** Error durante el procesamiento */
  FAILED = 'failed',

  /** Cancelado por el usuario */
  CANCELLED = 'cancelled'
}

/**
 * Tamaños de página estándar
 */
export enum PageSize {
  /** Tamaño A4 (210 x 297 mm) */
  A4 = 'A4',

  /** Tamaño A3 (297 x 420 mm) */
  A3 = 'A3',

  /** Tamaño A5 (148 x 210 mm) */
  A5 = 'A5',

  /** Tamaño Letter (216 x 279 mm) */
  LETTER = 'Letter',

  /** Tamaño Legal (216 x 356 mm) */
  LEGAL = 'Legal',

  /** Tamaño personalizado */
  CUSTOM = 'Custom'
}

/**
 * Orientaciones de página
 */
export enum PageOrientation {
  /** Orientación vertical */
  PORTRAIT = 'portrait',

  /** Orientación horizontal */
  LANDSCAPE = 'landscape'
}

/**
 * Fases del procesamiento
 */
export enum ProcessingPhase {
  /** Validación de datos */
  VALIDATION = 'validation',

  /** Compilación de plantilla */
  TEMPLATE_COMPILATION = 'template_compilation',

  /** Renderizado HTML */
  HTML_RENDERING = 'html_rendering',

  /** Conversión a PDF */
  PDF_CONVERSION = 'pdf_conversion',

  /** Finalización */
  FINALIZATION = 'finalization'
}
