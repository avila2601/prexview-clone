# 🚨 ARCHIVOS PROTEGIDOS - NO MODIFICAR

## ⚠️ IMPORTANTE: Archivos de solo lectura

Los siguientes archivos están **PROTEGIDOS** y **NO DEBEN MODIFICARSE**:

### 📄 Archivos críticos del invoice:
- `invoice-styles.scss` - Estilos específicos del template de factura
- `invoice-template.ts` - Estructura HTML del template de factura  
- `sample-data.xml` - Datos de ejemplo para el preview

## 🔒 Protecciones aplicadas:

1. **Solo lectura**: Los archivos están marcados como read-only
2. **Git ignore**: Incluidos en .gitignore local
3. **Documentación**: Este README como recordatorio

## 🛠️ Si necesitas modificar:

1. **Remover protección temporal**:
   ```powershell
   Set-ItemProperty -Path "archivo.ext" -Name IsReadOnly -Value $false
   ```

2. **Hacer cambios necesarios**

3. **Restaurar protección**:
   ```powershell
   Set-ItemProperty -Path "archivo.ext" -Name IsReadOnly -Value $true
   ```

## 📝 Notas:
- Estos archivos son la **fuente de verdad** del invoice template
- Modificaciones accidentales pueden romper el sistema
- Para cambios en el footer, usa el servicio de estado del editor

## 🎯 Alternativas para cambios:
- **Footer**: Modificar en `template-editor-state.service.ts`
- **Estilos generales**: Usar `document-template-styles.scss`
- **Datos de prueba**: Crear nuevos archivos XML separados

---
*Creado para evitar modificaciones accidentales*
