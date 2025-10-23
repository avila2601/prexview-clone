import { Injectable, ElementRef, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var monaco: any;

export interface EditorConfig {
  language: 'html' | 'xml' | 'css' | 'javascript' | 'typescript';
  theme?: 'vs-dark' | 'vs-light';
  fontSize?: number;
  lineNumbers?: 'on' | 'off';
  minimap?: boolean;
  wordWrap?: 'on' | 'off';
  folding?: boolean;
  readOnly?: boolean;
}

export interface EditorInstance {
  id: string;
  editor: any;
  element: ElementRef;
  config: EditorConfig;
}

@Injectable({
  providedIn: 'root'
})
export class MonacoEditorManagerService {
  private isMonacoLoaded = false;
  private loadingPromise: Promise<void> | null = null;
  private editors = new Map<string, EditorInstance>();

  // Signals para estado reactivo
  private _isLoading = signal<boolean>(false);
  private _currentLine = signal<number>(1);

  // Observables para eventos
  private contentChanges$ = new BehaviorSubject<{editorId: string, content: string}>({editorId: '', content: ''});
  private cursorPositionChanges$ = new BehaviorSubject<{editorId: string, line: number, column: number}>({editorId: '', line: 1, column: 1});

  // Getters para signals
  get isLoading() { return this._isLoading.asReadonly(); }
  get currentLine() { return this._currentLine.asReadonly(); }

  // Getters para observables
  get contentChanges(): Observable<{editorId: string, content: string}> {
    return this.contentChanges$.asObservable();
  }

  get cursorPositionChanges(): Observable<{editorId: string, line: number, column: number}> {
    return this.cursorPositionChanges$.asObservable();
  }

  constructor() {}

  /**
   * Carga Monaco Editor dinámicamente si no está ya cargado
   */
  async loadMonacoEditor(): Promise<void> {
    if (this.isMonacoLoaded) {
      return Promise.resolve();
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this._isLoading.set(true);

    this.loadingPromise = new Promise((resolve, reject) => {
      if (typeof monaco !== 'undefined') {
        this.isMonacoLoaded = true;
        this._isLoading.set(false);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.js';

      script.onload = () => {
        (window as any).require.config({
          paths: {
            'vs': 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs'
          }
        });

        (window as any).require(['vs/editor/editor.main'], () => {
          this.isMonacoLoaded = true;
          this._isLoading.set(false);
          resolve();
        });
      };

      script.onerror = () => {
        this._isLoading.set(false);
        reject(new Error('Failed to load Monaco Editor'));
      };

      document.head.appendChild(script);
    });

    return this.loadingPromise;
  }

  /**
   * Crea un nuevo editor Monaco
   */
  async createEditor(
    editorId: string,
    element: ElementRef,
    config: EditorConfig,
    initialValue: string = ''
  ): Promise<any> {

    // Asegurarse de que Monaco esté cargado
    await this.loadMonacoEditor();

    if (!element?.nativeElement) {
      throw new Error(`Element not found for editor ${editorId}`);
    }

    // Disponer editor existente si existe
    this.disposeEditor(editorId);

    // Configuración por defecto
    const defaultConfig: EditorConfig = {
      theme: 'vs-dark',
      fontSize: 14,
      lineNumbers: 'on',
      minimap: true,
      wordWrap: 'on',
      folding: true,
      readOnly: false,
      ...config
    };

    // Crear editor
    const editor = monaco.editor.create(element.nativeElement, {
      value: initialValue,
      language: defaultConfig.language,
      theme: defaultConfig.theme,
      automaticLayout: true,
      fontSize: defaultConfig.fontSize,
      lineNumbers: defaultConfig.lineNumbers,
      minimap: { enabled: defaultConfig.minimap },
      wordWrap: defaultConfig.wordWrap,
      folding: defaultConfig.folding,
      readOnly: defaultConfig.readOnly,
      bracketMatching: 'always',
      matchBrackets: 'always'
    });

    // Configurar eventos
    this.setupEditorEvents(editorId, editor);

    // Guardar instancia
    const editorInstance: EditorInstance = {
      id: editorId,
      editor,
      element,
      config: defaultConfig
    };

    this.editors.set(editorId, editorInstance);

    return editor;
  }

  /**
   * Configura eventos del editor
   */
  private setupEditorEvents(editorId: string, editor: any): void {
    // Evento de cambio de contenido
    editor.onDidChangeModelContent(() => {
      const content = editor.getValue();
      this.contentChanges$.next({ editorId, content });
    });

    // Evento de cambio de posición del cursor
    editor.onDidChangeCursorPosition((e: any) => {
      this._currentLine.set(e.position.lineNumber);
      this.cursorPositionChanges$.next({
        editorId,
        line: e.position.lineNumber,
        column: e.position.column
      });
    });

    // Eventos de foco
    editor.onDidFocusEditorText(() => {
      console.log(`Editor ${editorId} focused`);
    });

    editor.onDidBlurEditorText(() => {
      console.log(`Editor ${editorId} blurred`);
    });
  }

  /**
   * Obtiene un editor por ID
   */
  getEditor(editorId: string): any | null {
    const editorInstance = this.editors.get(editorId);
    return editorInstance ? editorInstance.editor : null;
  }

  /**
   * Obtiene el contenido de un editor
   */
  getEditorContent(editorId: string): string {
    const editor = this.getEditor(editorId);
    return editor ? editor.getValue() : '';
  }

  /**
   * Establece el contenido de un editor
   */
  setEditorContent(editorId: string, content: string): void {
    const editor = this.getEditor(editorId);
    if (editor) {
      editor.setValue(content);
    }
  }

  /**
   * Cambia el lenguaje de un editor
   */
  setEditorLanguage(editorId: string, language: string): void {
    const editor = this.getEditor(editorId);
    if (editor) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }

  /**
   * Cambia el tema de un editor
   */
  setEditorTheme(editorId: string, theme: 'vs-dark' | 'vs-light'): void {
    const editor = this.getEditor(editorId);
    if (editor) {
      editor.updateOptions({ theme });
    }
  }

  /**
   * Redimensiona un editor (útil cuando cambia el contenedor)
   */
  resizeEditor(editorId: string): void {
    const editor = this.getEditor(editorId);
    if (editor) {
      editor.layout();
    }
  }

  /**
   * Redimensiona todos los editores
   */
  resizeAllEditors(): void {
    this.editors.forEach((editorInstance) => {
      editorInstance.editor.layout();
    });
  }

  /**
   * Dispone un editor específico
   */
  disposeEditor(editorId: string): void {
    const editorInstance = this.editors.get(editorId);
    if (editorInstance) {
      editorInstance.editor.dispose();
      this.editors.delete(editorId);
    }
  }

  /**
   * Dispone todos los editores
   */
  disposeAllEditors(): void {
    this.editors.forEach((editorInstance) => {
      editorInstance.editor.dispose();
    });
    this.editors.clear();
  }

  /**
   * Obtiene información de todos los editores
   */
  getEditorsInfo(): Array<{id: string, language: string, lineCount: number, characterCount: number}> {
    const info: Array<{id: string, language: string, lineCount: number, characterCount: number}> = [];

    this.editors.forEach((editorInstance, id) => {
      const editor = editorInstance.editor;
      const model = editor.getModel();

      info.push({
        id,
        language: editorInstance.config.language,
        lineCount: model ? model.getLineCount() : 0,
        characterCount: editor.getValue().length
      });
    });

    return info;
  }

  /**
   * Ejecuta una acción en un editor específico
   */
  executeEditorAction(editorId: string, actionId: string): void {
    const editor = this.getEditor(editorId);
    if (editor) {
      editor.trigger('keyboard', actionId, null);
    }
  }

  /**
   * Acciones comunes de editor
   */
  undo(editorId: string): void {
    this.executeEditorAction(editorId, 'undo');
  }

  redo(editorId: string): void {
    this.executeEditorAction(editorId, 'redo');
  }

  find(editorId: string): void {
    this.executeEditorAction(editorId, 'actions.find');
  }

  replace(editorId: string): void {
    this.executeEditorAction(editorId, 'editor.action.startFindReplaceAction');
  }

  formatDocument(editorId: string): void {
    this.executeEditorAction(editorId, 'editor.action.formatDocument');
  }

  /**
   * Verifica si Monaco está disponible
   */
  isMonacoAvailable(): boolean {
    return this.isMonacoLoaded && typeof monaco !== 'undefined';
  }

  /**
   * Cleanup al destruir el servicio
   */
  ngOnDestroy(): void {
    this.disposeAllEditors();
    this.contentChanges$.complete();
    this.cursorPositionChanges$.complete();
  }
}
