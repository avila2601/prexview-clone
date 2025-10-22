import { Injectable } from '@angular/core';

/**
 * SCSS Compiler Service
 * Compila SCSS a CSS en tiempo real usando reemplazo de variables
 */
@Injectable({
  providedIn: 'root'
})
export class ScssCompilerService {
  // Definir las variables SCSS y sus valores
  private scssVariables: { [key: string]: string } = {
    '$primary': '#6A77D8',
    '$darken': '#444',
    '$secondary': '#139ACE',
    '$grey': '#444'
  };

  constructor() {}

  /**
   * Compila SCSS a CSS reemplazando variables
   * @param scssContent - Contenido SCSS a compilar
   * @returns CSS compilado
   */
  compileScss(scssContent: string): Promise<string> {
    return new Promise((resolve) => {
      try {
        let compiledCSS = scssContent;

        // Remover declaraciones de variables SCSS
        compiledCSS = compiledCSS.replace(/\$[\w-]+:\s*[^;]+;/g, '');

        // Reemplazar todas las variables SCSS por sus valores
        Object.keys(this.scssVariables).forEach(variable => {
          const value = this.scssVariables[variable];
          const regex = new RegExp(`\\${variable.replace('$', '\\$')}\\b`, 'g');
          compiledCSS = compiledCSS.replace(regex, value);
        });

        // Limpiar líneas vacías múltiples
        compiledCSS = compiledCSS.replace(/\n\s*\n\s*\n/g, '\n\n');

        resolve(compiledCSS.trim());
      } catch (error) {
        console.error('Error compilando SCSS:', error);
        resolve(scssContent); // Devolver original si hay error
      }
    });
  }

  /**
   * Compila SCSS de forma síncrona
   * @param scssContent - Contenido SCSS a compilar
   * @returns CSS compilado
   */
  compileScssSync(scssContent: string): string {
    try {
      let compiledCSS = scssContent;

      // Remover declaraciones de variables SCSS
      compiledCSS = compiledCSS.replace(/\$[\w-]+:\s*[^;]+;/g, '');

      // Reemplazar todas las variables SCSS por sus valores
      Object.keys(this.scssVariables).forEach(variable => {
        const value = this.scssVariables[variable];
        const regex = new RegExp(`\\${variable.replace('$', '\\$')}\\b`, 'g');
        compiledCSS = compiledCSS.replace(regex, value);
      });

      // Limpiar líneas vacías múltiples
      compiledCSS = compiledCSS.replace(/\n\s*\n\s*\n/g, '\n\n');

      return compiledCSS.trim();
    } catch (error) {
      console.error('Error compilando SCSS:', error);
      return scssContent;
    }
  }

  /**
   * Actualiza el valor de una variable SCSS
   * @param variable - Nombre de la variable (con $)
   * @param value - Nuevo valor
   */
  updateVariable(variable: string, value: string): void {
    this.scssVariables[variable] = value;
  }

  /**
   * Obtiene el valor de una variable SCSS
   * @param variable - Nombre de la variable (con $)
   * @returns Valor de la variable
   */
  getVariable(variable: string): string {
    return this.scssVariables[variable] || '';
  }

  /**
   * Obtiene todas las variables SCSS
   * @returns Objeto con todas las variables
   */
  getAllVariables(): { [key: string]: string } {
    return { ...this.scssVariables };
  }

  /**
   * Verifica si el compilador está disponible
   */
  isReady(): boolean {
    return true; // Siempre está listo ya que usa reemplazo simple
  }
}
