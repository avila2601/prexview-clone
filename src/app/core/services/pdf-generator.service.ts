import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as Handlebars from 'handlebars';
import {
  GeneratedDocument,
  Template,
  DocumentData,
  OutputFormat,
  ProcessingStatus,
  ProcessingError,
  ProcessingPhase,
  DocumentMetadata,
  PageSetup,
  PageSize,
  PageOrientation
} from '../models';

/**
 * Servicio para generar documentos PDF a partir de plantillas HTML y datos XML
 * Utiliza jsPDF y html2canvas para la conversión
 */
@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  constructor() {}

  /**
   * Genera vista previa HTML sin convertir a PDF
   */
  generatePreview(template: Template, data: DocumentData): Observable<string> {
    return new Observable(observer => {
      try {
        if (!data.isValid || !data.parsedData) {
          throw new Error('Invalid XML data provided');
        }

        // Compilar plantilla con Handlebars
        const compiledTemplate = Handlebars.compile(template.htmlContent);
        const html = compiledTemplate(data.parsedData);

        observer.next(html);
        observer.complete();
      } catch (error: any) {
        observer.error(new Error(`Preview generation failed: ${error.message}`));
      }
    });
  }

  /**
   * Genera documento PDF completo
   */
  generateDocument(
    template: Template,
    data: DocumentData,
    options?: Partial<PageSetup>
  ): Observable<GeneratedDocument> {
    return new Observable(observer => {
      const startTime = Date.now();
      const errors: ProcessingError[] = [];

      try {
        // Validar datos de entrada
        if (!data.isValid || !data.parsedData) {
          throw new Error('Invalid XML data provided');
        }

        // Fase 1: Compilación de plantilla
        let html: string;
        try {
          const compiledTemplate = Handlebars.compile(template.htmlContent);
          html = compiledTemplate(data.parsedData);
        } catch (error: any) {
          errors.push(this.createProcessingError(
            'TEMPLATE_COMPILATION_ERROR',
            `Template compilation failed: ${error.message}`,
            ProcessingPhase.TEMPLATE_COMPILATION
          ));
          throw error;
        }

        // Fase 2: Renderizado HTML
        this.renderHtmlToPdf(html, options).then(pdfBlob => {
          const processingTime = Date.now() - startTime;

          const generatedDocument: GeneratedDocument = {
            id: this.generateDocumentId(),
            templateId: template.id,
            templateName: template.name,
            pdfBlob,
            previewHtml: html,
            outputFormat: OutputFormat.PDF,
            status: ProcessingStatus.COMPLETED,
            generatedAt: new Date(),
            processingTime,
            fileSize: pdfBlob.size,
            dataHash: data.contentHash,
            metadata: this.createDocumentMetadata(template, options),
            errors
          };

          observer.next(generatedDocument);
          observer.complete();
        }).catch(error => {
          errors.push(this.createProcessingError(
            'PDF_GENERATION_ERROR',
            `PDF generation failed: ${error.message}`,
            ProcessingPhase.PDF_CONVERSION
          ));

          const failedDocument: GeneratedDocument = {
            id: this.generateDocumentId(),
            templateId: template.id,
            templateName: template.name,
            pdfBlob: new Blob([''], { type: 'application/pdf' }),
            previewHtml: html,
            outputFormat: OutputFormat.PDF,
            status: ProcessingStatus.FAILED,
            generatedAt: new Date(),
            processingTime: Date.now() - startTime,
            fileSize: 0,
            dataHash: data.contentHash,
            metadata: this.createDocumentMetadata(template, options),
            errors
          };

          observer.next(failedDocument);
          observer.complete();
        });

      } catch (error: any) {
        const failedDocument: GeneratedDocument = {
          id: this.generateDocumentId(),
          templateId: template.id,
          templateName: template.name,
          pdfBlob: new Blob([''], { type: 'application/pdf' }),
          previewHtml: '',
          outputFormat: OutputFormat.PDF,
          status: ProcessingStatus.FAILED,
          generatedAt: new Date(),
          processingTime: Date.now() - startTime,
          fileSize: 0,
          dataHash: data.contentHash,
          metadata: this.createDocumentMetadata(template, options),
          errors
        };

        observer.next(failedDocument);
        observer.complete();
      }
    });
  }

  /**
   * Renderiza HTML a PDF usando html2canvas y jsPDF
   */
  private async renderHtmlToPdf(
    html: string,
    options?: Partial<PageSetup>
  ): Promise<Blob> {

    // Configuración por defecto
    const config = {
      pageSize: options?.pageSize || PageSize.A4,
      orientation: options?.orientation || PageOrientation.PORTRAIT,
      margins: options?.margins || { top: 20, right: 20, bottom: 20, left: 20 },
      dpi: options?.dpi || 300
    };

    // Crear elemento temporal para renderizar HTML
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = html;
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '800px';
    tempContainer.style.backgroundColor = 'white';
    tempContainer.style.padding = '20px';
    tempContainer.style.fontFamily = 'Arial, sans-serif';

    document.body.appendChild(tempContainer);

    try {
      // Configurar html2canvas
      const canvas = await html2canvas(tempContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: 800,
        height: tempContainer.scrollHeight,
        scrollX: 0,
        scrollY: 0,
        windowWidth: 800,
        windowHeight: tempContainer.scrollHeight
      });

      // Configurar jsPDF
      const pdf = new jsPDF({
        orientation: config.orientation === PageOrientation.PORTRAIT ? 'portrait' : 'landscape',
        unit: 'mm',
        format: config.pageSize.toLowerCase() as any
      });

      // Dimensiones de la página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Dimensiones de la imagen
      const imgWidth = pageWidth - config.margins.left - config.margins.right;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Convertir canvas a imagen
      const imgData = canvas.toDataURL('image/png', 1.0);

      let heightLeft = imgHeight;
      let position = config.margins.top;
      let pageNumber = 1;

      // Agregar primera página
      pdf.addImage(
        imgData,
        'PNG',
        config.margins.left,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= (pageHeight - config.margins.top - config.margins.bottom);

      // Agregar páginas adicionales si es necesario
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + config.margins.top;
        pdf.addPage();
        pageNumber++;

        pdf.addImage(
          imgData,
          'PNG',
          config.margins.left,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= (pageHeight - config.margins.top - config.margins.bottom);
      }

      // Agregar metadatos al PDF
      pdf.setProperties({
        title: 'Generated Document',
        subject: 'Document generated by PrexView Clone',
        author: 'PrexView Clone',
        creator: 'PrexView Clone v1.0'
      });

      // Convertir a Blob
      const pdfBlob = new Blob([pdf.output('arraybuffer')], {
        type: 'application/pdf'
      });

      return pdfBlob;

    } finally {
      // Limpiar elemento temporal
      document.body.removeChild(tempContainer);
    }
  }

  /**
   * Genera documento en formato HTML
   */
  generateHtmlDocument(template: Template, data: DocumentData): Observable<GeneratedDocument> {
    return new Observable(observer => {
      const startTime = Date.now();

      try {
        if (!data.isValid || !data.parsedData) {
          throw new Error('Invalid XML data provided');
        }

        // Compilar plantilla
        const compiledTemplate = Handlebars.compile(template.htmlContent);
        const html = compiledTemplate(data.parsedData);

        // Crear HTML completo con DOCTYPE y meta tags
        const fullHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.name}</title>
    <style>
        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
        .document-container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="document-container">
        ${html}
    </div>
</body>
</html>`;

        const htmlBlob = new Blob([fullHtml], { type: 'text/html; charset=utf-8' });
        const processingTime = Date.now() - startTime;

        const generatedDocument: GeneratedDocument = {
          id: this.generateDocumentId(),
          templateId: template.id,
          templateName: template.name,
          pdfBlob: htmlBlob,
          previewHtml: html,
          outputFormat: OutputFormat.HTML,
          status: ProcessingStatus.COMPLETED,
          generatedAt: new Date(),
          processingTime,
          fileSize: htmlBlob.size,
          dataHash: data.contentHash,
          metadata: this.createDocumentMetadata(template),
          errors: []
        };

        observer.next(generatedDocument);
        observer.complete();
      } catch (error: any) {
        observer.error(error);
      }
    });
  }

  /**
   * Descarga un documento generado
   */
  downloadDocument(generatedDoc: GeneratedDocument, filename?: string): void {
    const defaultFilename = filename || `${generatedDoc.templateName}-${generatedDoc.id}`;
    const extension = generatedDoc.outputFormat === OutputFormat.PDF ? 'pdf' : 'html';
    const finalFilename = `${defaultFilename}.${extension}`;

    // Crear URL temporal para descarga
    const url = URL.createObjectURL(generatedDoc.pdfBlob);

    // Crear elemento de descarga
    const downloadLink = window.document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = finalFilename;
    downloadLink.style.display = 'none';

    // Agregar al DOM y hacer clic
    window.document.body.appendChild(downloadLink);
    downloadLink.click();

    // Limpiar
    window.document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  /**
   * Crea metadatos del documento
   */
  private createDocumentMetadata(
    template: Template,
    pageSetup?: Partial<PageSetup>
  ): DocumentMetadata {
    return {
      title: template.name,
      author: template.createdBy || 'Unknown',
      subject: template.description,
      keywords: template.metadata?.tags || [],
      creator: 'PrexView Clone v1.0',
      pageSetup: {
        pageSize: pageSetup?.pageSize || PageSize.A4,
        orientation: pageSetup?.orientation || PageOrientation.PORTRAIT,
        margins: pageSetup?.margins || { top: 20, right: 20, bottom: 20, left: 20 },
        dpi: pageSetup?.dpi || 300
      }
    };
  }

  /**
   * Crea un error de procesamiento
   */
  private createProcessingError(
    code: string,
    message: string,
    phase: ProcessingPhase,
    details?: any
  ): ProcessingError {
    return {
      code,
      message,
      phase,
      details,
      timestamp: new Date()
    };
  }

  /**
   * Genera ID único para el documento
   */
  private generateDocumentId(): string {
    return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estima el tiempo de procesamiento basado en el contenido
   */
  estimateProcessingTime(htmlContent: string): number {
    // Estimación básica basada en el tamaño del contenido
    const baseTime = 2000; // 2 segundos base
    const contentFactor = Math.ceil(htmlContent.length / 1000) * 500; // 500ms por KB
    const complexityFactor = (htmlContent.match(/<table|<img|<svg/g) || []).length * 1000; // 1s por elemento complejo

    return baseTime + contentFactor + complexityFactor;
  }

  /**
   * Valida opciones de configuración de página
   */
  validatePageSetup(pageSetup: Partial<PageSetup>): string[] {
    const errors: string[] = [];

    if (pageSetup.margins) {
      const { top, right, bottom, left } = pageSetup.margins;
      if (top < 0 || right < 0 || bottom < 0 || left < 0) {
        errors.push('Margins cannot be negative');
      }
      if (top + bottom > 250 || left + right > 180) {
        errors.push('Margins are too large for the page size');
      }
    }

    if (pageSetup.dpi && (pageSetup.dpi < 72 || pageSetup.dpi > 600)) {
      errors.push('DPI must be between 72 and 600');
    }

    return errors;
  }

  /**
   * Obtiene formatos de salida soportados
   */
  getSupportedFormats(): OutputFormat[] {
    return [OutputFormat.PDF, OutputFormat.HTML];
  }

  /**
   * Obtiene configuraciones de página predefinidas
   */
  getPresetPageSetups(): { [key: string]: PageSetup } {
    return {
      'A4 Portrait': {
        pageSize: PageSize.A4,
        orientation: PageOrientation.PORTRAIT,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        dpi: 300
      },
      'A4 Landscape': {
        pageSize: PageSize.A4,
        orientation: PageOrientation.LANDSCAPE,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        dpi: 300
      },
      'Letter Portrait': {
        pageSize: PageSize.LETTER,
        orientation: PageOrientation.PORTRAIT,
        margins: { top: 25, right: 25, bottom: 25, left: 25 },
        dpi: 300
      },
      'A3 Portrait': {
        pageSize: PageSize.A3,
        orientation: PageOrientation.PORTRAIT,
        margins: { top: 30, right: 30, bottom: 30, left: 30 },
        dpi: 300
      }
    };
  }
}
