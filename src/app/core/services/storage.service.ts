import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { Template, GeneratedDocument, DocumentData } from '../models';

/**
 * Servicio para gestión de persistencia local usando localStorage
 * Maneja el almacenamiento de plantillas, documentos generados y configuraciones
 */
@Injectable({
  providedIn: 'root'
})
export class StorageService {

  private readonly KEYS = {
    TEMPLATES: 'prexview_templates',
    DOCUMENTS: 'prexview_documents',
    SETTINGS: 'prexview_settings',
    RECENT_XML_DATA: 'prexview_recent_xml',
    APP_STATE: 'prexview_app_state'
  } as const;

  // Subjects para cambios reactivos
  private storageChangeSubject = new BehaviorSubject<{ key: string; data: any }>({ key: '', data: null });
  public storageChange$ = this.storageChangeSubject.asObservable();

  constructor() {
    // Escuchar cambios en localStorage de otras pestañas
    window.addEventListener('storage', (event) => {
      if (event.key && event.key.startsWith('prexview_')) {
        this.storageChangeSubject.next({
          key: event.key,
          data: event.newValue ? JSON.parse(event.newValue) : null
        });
      }
    });
  }

  /**
   * Guarda plantillas en localStorage
   */
  saveTemplates(templates: Template[]): Observable<boolean> {
    return new Observable(observer => {
      try {
        const serializedTemplates = JSON.stringify(templates);
        localStorage.setItem(this.KEYS.TEMPLATES, serializedTemplates);

        this.storageChangeSubject.next({
          key: this.KEYS.TEMPLATES,
          data: templates
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error saving templates:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Carga plantillas desde localStorage
   */
  loadTemplates(): Observable<Template[]> {
    return new Observable(observer => {
      try {
        const stored = localStorage.getItem(this.KEYS.TEMPLATES);
        if (stored) {
          const templates = JSON.parse(stored).map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt)
          }));
          observer.next(templates);
        } else {
          observer.next([]);
        }
        observer.complete();
      } catch (error) {
        console.error('Error loading templates:', error);
        observer.next([]);
        observer.complete();
      }
    });
  }

  /**
   * Guarda documentos generados (solo metadatos, no el blob)
   */
  saveGeneratedDocuments(documents: Omit<GeneratedDocument, 'pdfBlob'>[]): Observable<boolean> {
    return new Observable(observer => {
      try {
        // Guardamos solo los metadatos, no el blob del PDF
        const documentsToStore = documents.map(doc => ({
          ...doc,
          pdfBlob: null, // No guardamos el blob en localStorage
          downloadUrl: `stored_document_${doc.id}` // URL temporal para referencia
        }));

        const serializedDocuments = JSON.stringify(documentsToStore);
        localStorage.setItem(this.KEYS.DOCUMENTS, serializedDocuments);

        this.storageChangeSubject.next({
          key: this.KEYS.DOCUMENTS,
          data: documentsToStore
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error saving documents:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Carga historial de documentos generados
   */
  loadGeneratedDocuments(): Observable<Omit<GeneratedDocument, 'pdfBlob'>[]> {
    return new Observable(observer => {
      try {
        const stored = localStorage.getItem(this.KEYS.DOCUMENTS);
        if (stored) {
          const documents = JSON.parse(stored).map((d: any) => ({
            ...d,
            generatedAt: new Date(d.generatedAt)
          }));
          observer.next(documents);
        } else {
          observer.next([]);
        }
        observer.complete();
      } catch (error) {
        console.error('Error loading documents:', error);
        observer.next([]);
        observer.complete();
      }
    });
  }

  /**
   * Guarda datos XML recientes para facilitar el desarrollo
   */
  saveRecentXmlData(xmlData: DocumentData[]): Observable<boolean> {
    return new Observable(observer => {
      try {
        // Guardamos solo los últimos 10 XMLs
        const recentData = xmlData.slice(-10).map(data => ({
          ...data,
          processedAt: data.processedAt.toISOString()
        }));

        localStorage.setItem(this.KEYS.RECENT_XML_DATA, JSON.stringify(recentData));

        this.storageChangeSubject.next({
          key: this.KEYS.RECENT_XML_DATA,
          data: recentData
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error saving recent XML data:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Carga datos XML recientes
   */
  loadRecentXmlData(): Observable<DocumentData[]> {
    return new Observable(observer => {
      try {
        const stored = localStorage.getItem(this.KEYS.RECENT_XML_DATA);
        if (stored) {
          const xmlData = JSON.parse(stored).map((d: any) => ({
            ...d,
            processedAt: new Date(d.processedAt)
          }));
          observer.next(xmlData);
        } else {
          observer.next([]);
        }
        observer.complete();
      } catch (error) {
        console.error('Error loading recent XML data:', error);
        observer.next([]);
        observer.complete();
      }
    });
  }

  /**
   * Guarda configuraciones de la aplicación
   */
  saveSettings(settings: { [key: string]: any }): Observable<boolean> {
    return new Observable(observer => {
      try {
        const currentSettings = this.getStoredData(this.KEYS.SETTINGS) || {};
        const updatedSettings = { ...currentSettings, ...settings };

        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updatedSettings));

        this.storageChangeSubject.next({
          key: this.KEYS.SETTINGS,
          data: updatedSettings
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error saving settings:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Carga configuraciones de la aplicación
   */
  loadSettings(): Observable<{ [key: string]: any }> {
    return new Observable(observer => {
      try {
        const settings = this.getStoredData(this.KEYS.SETTINGS) || {};
        observer.next(settings);
        observer.complete();
      } catch (error) {
        console.error('Error loading settings:', error);
        observer.next({});
        observer.complete();
      }
    });
  }

  /**
   * Guarda estado de la aplicación
   */
  saveAppState(state: { [key: string]: any }): Observable<boolean> {
    return new Observable(observer => {
      try {
        localStorage.setItem(this.KEYS.APP_STATE, JSON.stringify(state));

        this.storageChangeSubject.next({
          key: this.KEYS.APP_STATE,
          data: state
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error saving app state:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Carga estado de la aplicación
   */
  loadAppState(): Observable<{ [key: string]: any }> {
    return new Observable(observer => {
      try {
        const state = this.getStoredData(this.KEYS.APP_STATE) || {};
        observer.next(state);
        observer.complete();
      } catch (error) {
        console.error('Error loading app state:', error);
        observer.next({});
        observer.complete();
      }
    });
  }

  /**
   * Elimina una clave específica del almacenamiento
   */
  removeItem(key: string): Observable<boolean> {
    return new Observable(observer => {
      try {
        localStorage.removeItem(key);

        this.storageChangeSubject.next({
          key,
          data: null
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error removing item:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Limpia todo el almacenamiento de la aplicación
   */
  clearAllData(): Observable<boolean> {
    return new Observable(observer => {
      try {
        Object.values(this.KEYS).forEach(key => {
          localStorage.removeItem(key);
        });

        this.storageChangeSubject.next({
          key: 'all',
          data: null
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error clearing all data:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Obtiene información de uso del almacenamiento
   */
  getStorageInfo(): Observable<{
    used: number;
    available: number;
    percentage: number;
    items: { [key: string]: number };
  }> {
    return new Observable(observer => {
      try {
        let totalUsed = 0;
        const items: { [key: string]: number } = {};

        // Calcular uso por item
        Object.values(this.KEYS).forEach(key => {
          const item = localStorage.getItem(key);
          if (item) {
            const size = new Blob([item]).size;
            items[key] = size;
            totalUsed += size;
          } else {
            items[key] = 0;
          }
        });

        // Estimar almacenamiento disponible (típicamente 5-10MB)
        const estimatedTotal = 5 * 1024 * 1024; // 5MB
        const available = estimatedTotal - totalUsed;
        const percentage = (totalUsed / estimatedTotal) * 100;

        observer.next({
          used: totalUsed,
          available: Math.max(0, available),
          percentage: Math.min(100, percentage),
          items
        });
        observer.complete();
      } catch (error) {
        console.error('Error getting storage info:', error);
        observer.next({
          used: 0,
          available: 0,
          percentage: 0,
          items: {}
        });
        observer.complete();
      }
    });
  }

  /**
   * Exporta todos los datos a un archivo JSON
   */
  exportAllData(): Observable<string> {
    return new Observable(observer => {
      try {
        const exportData: { [key: string]: any } = {};

        Object.values(this.KEYS).forEach(key => {
          const data = this.getStoredData(key);
          if (data) {
            exportData[key] = data;
          }
        });

        exportData['exportDate'] = new Date().toISOString();
        exportData['version'] = '1.0';

        const jsonString = JSON.stringify(exportData, null, 2);
        observer.next(jsonString);
        observer.complete();
      } catch (error) {
        observer.error(error);
      }
    });
  }

  /**
   * Importa datos desde un archivo JSON
   */
  importData(jsonData: string): Observable<boolean> {
    return new Observable(observer => {
      try {
        const importData = JSON.parse(jsonData);

        // Validar estructura básica
        if (!importData.version || !importData.exportDate) {
          throw new Error('Invalid export file format');
        }

        // Importar cada tipo de dato
        Object.entries(this.KEYS).forEach(([keyName, keyValue]) => {
          if (importData[keyValue]) {
            localStorage.setItem(keyValue, JSON.stringify(importData[keyValue]));
          }
        });

        this.storageChangeSubject.next({
          key: 'import',
          data: importData
        });

        observer.next(true);
        observer.complete();
      } catch (error) {
        console.error('Error importing data:', error);
        observer.next(false);
        observer.complete();
      }
    });
  }

  /**
   * Verifica si el almacenamiento está disponible
   */
  isStorageAvailable(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene datos almacenados de forma segura
   */
  private getStoredData(key: string): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  /**
   * Comprime datos antes de guardar (para datos grandes)
   */
  private compressData(data: any): string {
    // Implementación básica de compresión (se puede mejorar con librerías como LZ-string)
    const jsonString = JSON.stringify(data);
    return jsonString;
  }

  /**
   * Descomprime datos después de cargar
   */
  private decompressData(compressedData: string): any {
    // Implementación básica de descompresión
    return JSON.parse(compressedData);
  }

  /**
   * Limpia datos antiguos automáticamente
   */
  cleanupOldData(daysToKeep: number = 30): Observable<number> {
    return new Observable(observer => {
      try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        let itemsRemoved = 0;

        // Limpiar documentos antiguos
        this.loadGeneratedDocuments().subscribe(documents => {
          const filteredDocs = documents.filter(doc =>
            doc.generatedAt > cutoffDate
          );

          if (filteredDocs.length < documents.length) {
            itemsRemoved += documents.length - filteredDocs.length;
            this.saveGeneratedDocuments(filteredDocs);
          }
        });

        // Limpiar datos XML antiguos
        this.loadRecentXmlData().subscribe(xmlData => {
          const filteredXml = xmlData.filter(data =>
            data.processedAt > cutoffDate
          );

          if (filteredXml.length < xmlData.length) {
            itemsRemoved += xmlData.length - filteredXml.length;
            this.saveRecentXmlData(filteredXml);
          }
        });

        observer.next(itemsRemoved);
        observer.complete();
      } catch (error) {
        console.error('Error cleaning up old data:', error);
        observer.next(0);
        observer.complete();
      }
    });
  }
}
