# Manual de Usuario
## Automatización de Plantillas de Instrumentos de Planeación

**Versión:** 2.0  
**Fecha:** Febrero 2025  
**Dirección General de Planeación y Transición Energética**

---

## Tabla de Contenidos

1. [Acceso al Sistema](#1-acceso-al-sistema)
2. [Navegación General](#2-navegación-general)
3. [Funcionalidades Principales](#3-funcionalidades-principales)
4. [Editor de Documentos](#4-editor-de-documentos)
5. [Validación y Verificación](#5-validación-y-verificación)
6. [Generación y Descarga de LaTeX](#6-generación-y-descarga-de-latex)
7. [Compilación Local](#7-compilación-local)
8. [Cómo Interpretar Resultados](#8-cómo-interpretar-resultados)
9. [Exportaciones](#9-exportaciones)
10. [Preguntas Frecuentes](#10-preguntas-frecuentes)

---

## 1. Acceso al Sistema

### 1.1 Requisitos Previos

- Navegador web actualizado (Chrome, Firefox, Safari o Edge)
- Conexión a internet estable (mínimo 5 Mbps)
- Cuenta de Google institucional (para acceso completo)

### 1.2 Inicio de Sesión

#### Opción A: Autenticación con Google (Recomendada)

1. Acceder a la URL del sistema: `https://[url-del-sistema]`
2. Hacer clic en el botón **"Iniciar sesión con Google"**
3. Seleccionar cuenta institucional de Google
4. Autorizar permisos solicitados (acceso a Google Sheets y Drive)
5. El sistema redirigirá automáticamente al Dashboard

#### Opción B: Usuario Registrado

1. Ingresar correo electrónico institucional
2. Ingresar contraseña
3. Hacer clic en **"Iniciar Sesión"**

#### Opción C: Modo Demo

1. Hacer clic en **"Probar Demo"**
2. Acceso inmediato con datos de ejemplo (sin persistencia)

### 1.3 Recuperación de Contraseña

Si olvidó su contraseña:
1. Hacer clic en **"¿Olvidé mi contraseña?"**
2. Ingresar correo electrónico institucional
3. Revisar bandeja de entrada para enlace de recuperación
4. Seguir instrucciones del correo electrónico

---

## 2. Navegación General

### 2.1 Estructura de la Interfaz

El sistema está organizado en tres niveles de navegación:

#### Nivel 1: Selección de Libro de Trabajo (Workbook Dashboard)

Al iniciar sesión, verá la pantalla principal con:

**Elementos visuales:**
- **Barra superior**: Saludo personalizado y avatar de usuario
- **Barra de búsqueda**: Filtro en tiempo real por nombre o descripción
- **Tarjetas de libros**: Vista en cuadrícula con:
  - Icono representativo del tipo de documento
  - Estado visual (Activo/Revisión/Archivado/Pendiente)
  - Nombre del libro
  - Avatares de colaboradores activos
  - Botón de eliminación (solo para libros creados por usted)

**Navegación:**
- **Tap/Click en tarjeta**: Abre el libro y muestra sus documentos
- **Botón flotante "+"**: Crea nuevo libro desde plantilla
- **Barra inferior**: Navegación entre Dashboard, Archivos, Equipo y Ajustes

#### Nivel 2: Dashboard de Documentos

Después de seleccionar un libro:

**Elementos visuales:**
- **Breadcrumb superior**: Muestra el libro actual con opción "Cambiar Libro"
- **Barra de búsqueda**: Filtra documentos por título, ID, autor o institución
- **Lista de documentos**: Tarjetas expandidas con:
  - Icono de documento con ID visible
  - Título y subtítulo
  - Metadatos (autor, fecha, institución, unidad)
  - Botón "Abrir" para editar

**Navegación:**
- **Botón "Nuevo"**: Crea documento nuevo en el libro actual
- **Botón "Cambiar Libro"**: Regresa al Workbook Dashboard
- **Click en "Abrir"**: Accede al editor del documento

#### Nivel 3: Editor de Documentos

La interfaz de edición tiene:

**Barra superior:**
- **Botón "← Volver"**: Regresa al Dashboard de Documentos
- **Selector de documento**: Dropdown para cambiar entre documentos del mismo libro
- **Botón "Generar LaTeX"**: Descarga archivos .tex y .bib
- **Indicador de guardado**: Punto amarillo pulsante cuando hay cambios sin guardar

**Pestañas de navegación:**
- Metadatos (Documentos)
- Secciones
- Figuras
- Tablas
- Gráficos
- Bibliografía
- Siglas
- Glosario
- Unidades
- Vista Previa

**Área de trabajo:**
- Modo Lista: Tabla editable con todas las filas
- Modo Formulario: Editor detallado de un elemento individual

### 2.2 Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl/Cmd + S` | Guardar cambios manualmente |
| `Ctrl/Cmd + B` | Aplicar negrita en editor de texto |
| `Ctrl/Cmd + I` | Aplicar cursiva en editor de texto |
| `[[` | Activar autocompletado de etiquetas |
| `Esc` | Cerrar modal o autocompletado |
| `↑/↓` | Navegar sugerencias de autocompletado |
| `Enter/Tab` | Seleccionar sugerencia de autocompletado |

### 2.3 Indicadores Visuales

**Estados de guardado:**
- 🟡 Punto amarillo pulsante: Cambios sin guardar
- ✅ Checkmark verde: Guardado exitoso
- ❌ X roja: Error al guardar

**Estados de validación:**
- 🔴 Badge rojo: Errores críticos que impiden generación
- 🟠 Badge naranja: Advertencias que deben revisarse
- 🔵 Badge azul: Sugerencias de mejora

**Colaboración en tiempo real:**
- Avatares en esquina superior derecha: Usuarios activos en el documento
- Indicador verde en avatar: Usuario conectado

---

## 3. Funcionalidades Principales

### 2.1 Selección de Libro de Trabajo

Al iniciar sesión, verá el **Dashboard de Libros de Trabajo**:

**Elementos de la pantalla:**
- **Barra de búsqueda**: Filtrar libros por nombre o descripción
- **Tarjetas de libros**: Cada libro muestra:
  - Nombre del libro
  - Descripción
  - Última modificación
  - Colaboradores activos
  - Estado (Activo/Inactivo)

**Acciones disponibles:**
- **Abrir libro**: Clic en la tarjeta para acceder a los documentos
- **Crear nuevo libro**: Botón **"+ Crear Nuevo Documento"**
- **Eliminar libro**: Icono de papelera (solo libros creados por usted)

### 2.2 Dashboard de Documentos

Una vez seleccionado un libro, verá la lista de documentos:

**Información mostrada:**
- Título del documento
- Subtítulo
- Autor
- Fecha de creación
- Institución
- Unidad responsable

**Acciones disponibles:**
- **Abrir documento**: Clic en **"Abrir"** para editar
- **Crear documento**: Botón **"+ Crear Nuevo Documento"**
- **Cambiar libro**: Botón **"Cambiar Libro"** en la barra superior

### 3.3 Editor de Documentos - Vista General

El editor está organizado en **pestañas** para facilitar la navegación:

**Modos de visualización:**
- **Modo Lista** (icono de tabla): Vista tabular de todos los elementos
- **Modo Formulario** (icono de documento): Editor detallado de un elemento individual

**Funciones transversales:**
- **Autoguardado**: Cada 2 segundos después del último cambio
- **Guardado manual**: Botón "Guardar Cambios" o Ctrl/Cmd + S
- **Validación en vivo**: Panel de lint muestra errores en tiempo real
- **Colaboración**: Múltiples usuarios pueden editar simultáneamente

#### Pestaña: Documentos (Metadatos)

**Campos editables:**
- **ID**: Identificador único del documento (no modificar después de crear)
- **Título**: Título principal del documento
- **Subtítulo**: Subtítulo descriptivo
- **Autor**: Nombre del autor o autores
- **Fecha**: Fecha de publicación (formato: DD/MM/AAAA)
- **Institución**: Secretaría de Energía (predeterminado)
- **Unidad**: Unidad administrativa responsable
- **Documento Corto**: Nombre abreviado para referencias
- **Palabras Clave**: Términos separados por comas
- **Versión**: Número de versión (ej: 1.0, 2.1)
- **Agradecimientos**: Texto de agradecimientos (opcional)
- **Presentación**: Texto de presentación institucional
- **Resumen Ejecutivo**: Resumen del documento
- **Datos Clave**: Puntos destacados (separados por punto y coma)

**Cómo guardar:**
- Los cambios se guardan automáticamente cada 2 segundos
- Indicador visual: punto amarillo pulsante cuando hay cambios sin guardar
- También puede hacer clic en **"Guardar Cambios"** manualmente

#### Pestaña: Secciones

**Estructura de secciones:**
- **Orden**: Número que define la secuencia (1, 2, 3, etc.)
- **Nivel**: Tipo de sección
  - `Seccion`: Sección principal (ej: 1. Introducción)
  - `Subseccion`: Subsección (ej: 1.1 Antecedentes)
  - `Subsubseccion`: Sub-subsección (ej: 1.1.1 Contexto)
  - `Anexo`: Anexo principal
  - `Subanexo`: Subsección de anexo
  - `Portada`: Portada de sección especial
  - `Directorio`: Directorio de funcionarios
  - `Contraportada`: Datos finales del documento
- **Título**: Título de la sección
- **Contenido**: Texto del contenido (ver formato especial abajo)

**Formato especial en contenido:**

1. **Listas:**
   ```
   - Primer elemento
   - Segundo elemento
   - Tercer elemento
   ```

2. **Referencias a figuras:**
   ```
   [[figura:FIG-1-1]]
   ```

3. **Referencias a tablas:**
   ```
   [[tabla:TBL-1-1]]
   ```

4. **Bloques especiales:**
   ```
   [[ejemplo: Título del Ejemplo]]
   Contenido del ejemplo
   [[/ejemplo]]

   [[alerta: Advertencia Importante]]
   Texto de alerta
   [[/alerta]]

   [[info: Información Adicional]]
   Texto informativo
   [[/info]]
   ```

**Acciones:**
- **Agregar fila**: Botón **"+ Agregar Fila"**
- **Eliminar fila**: Botón **"Eliminar"** en cada fila
- **Editar**: Clic en cualquier celda para editar

#### Pestaña: Figuras

**Campos de cada figura:**
- **DocumentoID**: ID del documento (se llena automáticamente)
- **SeccionOrden**: Número de sección donde aparece
- **Fig.**: Número de figura (orden global)
- **RutaArchivo**: Ruta de la imagen en Google Drive (ej: `img/figura1.png`)
- **Caption**: Descripción de la figura
- **Fuente**: Fuente de la imagen (opcional)
- **TextoAlternativo**: Descripción para accesibilidad
- **Ancho**: Ancho relativo (0.5 = 50%, 0.8 = 80%, 1.0 = 100%)

**Cómo agregar una figura:**
1. Subir imagen a carpeta `img/` en Google Drive
2. Copiar ruta relativa (ej: `img/mi_grafico.png`)
3. Agregar nueva fila en la pestaña Figuras
4. Llenar campos requeridos
5. Referenciar en el contenido: `[[figura:FIG-1-1]]`

#### Pestaña: Tablas

**Campos de cada tabla:**
- **DocumentoID**: ID del documento
- **SeccionOrden**: Número de sección
- **Orden**: Número de tabla (orden global)
- **Título**: Título de la tabla
- **Datos CSV**: Datos en formato CSV o rango de celdas
- **Fuente**: Fuente de los datos (opcional)

**Cómo crear una tabla:**

**Opción 1: Datos CSV directos**
```
Columna1,Columna2,Columna3
Valor1,Valor2,Valor3
Valor4,Valor5,Valor6
```

**Opción 2: Referencia a rango de celdas**
```
Hoja1!A1:C10
```

**Opción 3: Editor visual de tablas**
1. Hacer clic en **"Editar"** en la fila de la tabla
2. Usar el editor de cuadrícula para ingresar datos
3. Agregar/eliminar filas y columnas según necesidad
4. Guardar cambios

#### Pestaña: Bibliografía

**Campos de cada referencia:**
- **DocumentoID**: ID del documento
- **Clave**: Identificador único (ej: `Smith2020`)
- **Tipo**: Tipo de publicación
  - `article`: Artículo de revista
  - `book`: Libro
  - `inproceedings`: Artículo de conferencia
  - `techreport`: Reporte técnico
  - `misc`: Otros
- **Autor**: Autor(es) en formato: `Apellido, Nombre`
- **Título**: Título de la publicación
- **Año**: Año de publicación
- **Editorial**: Editorial o revista
- **URL**: Enlace web (opcional)

**Cómo citar en el texto:**
```
Según estudios recientes \cite{Smith2020}, se observa que...
```

#### Pestaña: Siglas

**Campos:**
- **DocumentoID**: ID del documento
- **Sigla**: Acrónimo (ej: SENER)
- **Significado**: Significado completo (ej: Secretaría de Energía)

#### Pestaña: Glosario

**Campos:**
- **DocumentoID**: ID del documento
- **Término**: Palabra o concepto
- **Definición**: Explicación del término

#### Pestaña: Unidades

**Campos:**
- **DocumentoID**: ID del documento
- **Símbolo**: Símbolo de la unidad (ej: kWh)
- **Nombre**: Nombre completo (ej: Kilovatio-hora)
- **Descripción**: Explicación de uso

---

## 4. Editor de Documentos

### 4.1 Pestaña: Metadatos (Documentos)

**Modo Formulario (recomendado para edición):**

Campos organizados en secciones colapsables:

**Información Básica:**
- **ID**: Identificador único (no modificar después de crear)
- **Título**: Título principal del documento
- **Subtítulo**: Subtítulo descriptivo
- **Autor**: Nombre del autor o autores
- **Fecha**: Formato DD/MM/AAAA
- **Institución**: Secretaría de Energía (predeterminado)
- **Unidad**: Unidad administrativa responsable

**Identificación:**
- **Documento Corto**: Nombre abreviado para referencias internas
- **Palabras Clave**: Términos separados por comas
- **Versión**: Número de versión (ej: 1.0, 2.1)

**Contenido Preliminar:**
- **Agradecimientos**: Texto de agradecimientos (opcional)
  - Click en icono de expansión para editor de texto enriquecido
- **Presentación**: Texto de presentación institucional
  - Soporta múltiples párrafos y formato LaTeX
- **Resumen Ejecutivo**: Resumen del documento
  - Editor con contador de palabras
- **Datos Clave**: Puntos destacados separados por punto y coma
  - Se renderizarán como lista con viñetas

**Rutas de Recursos:**
- **Portada**: Ruta a imagen de portada (ej: `img/portada.png`)
- **Contraportada**: Ruta a imagen de contraportada

**Herramientas del editor de texto enriquecido:**

Cuando edita campos largos (Agradecimientos, Presentación, Resumen), tiene acceso a:

1. **Barra de herramientas flotante:**
   - Botones de formato: Nota, Dorado, Guinda, Math
   - Selectores: Cita, Figura, Tabla
   - Ejemplos predefinidos

2. **Autocompletado inteligente:**
   - Escriba `[[` para activar sugerencias
   - Navegue con flechas ↑/↓
   - Seleccione con Enter o Tab
   - Tipos de sugerencias:
     - `[[cita:clave]]` - Referencias bibliográficas
     - `[[figura:ID]]` - Figuras del documento
     - `[[tabla:ID]]` - Tablas del documento
     - `[[nota:texto]]` - Notas al pie
     - `[[math:ecuación]]` - Matemáticas inline
     - `[[ecuacion:fórmula]]` - Ecuaciones display

3. **Validación en vivo:**
   - Panel inferior muestra errores, advertencias y sugerencias
   - Click en un issue para ir directamente al problema
   - Contador de issues por tipo (error/warning/hint)

### 4.2 Pestaña: Secciones

**Estructura jerárquica del documento:**

**Columnas principales:**
- **Orden**: Número secuencial (1, 2, 3, etc.)
- **Nivel**: Tipo de sección (ver opciones abajo)
- **Título**: Título de la sección
- **Contenido**: Texto del contenido con formato especial

**Niveles de sección disponibles:**

| Nivel | Descripción | Uso en LaTeX |
|-------|-------------|--------------|
| **Sección** | Capítulo principal | `\section{...}` o Anexo A, B, C |
| **Subsección** | Nivel 2 | `\subsection{...}` |
| **Subsubsección** | Nivel 3 | `\subsubsection{...}` |
| **Párrafo** | Título corto | `\paragraph{...}` |
| **Anexo** | Inicia modo anexos | Cambia numeración a letras |
| **Subanexo** | Subsección de anexo | A.1, A.2, etc. |
| **Portada** | Portada de sección | `\portadaseccion{...}` |
| **Directorio** | Página de créditos | `\paginacreditos{...}` |
| **Contraportada** | Datos finales | `\contraportada{...}` |

**Formato especial en contenido:**

1. **Listas con viñetas:**
   ```
   - Primer elemento
   - Segundo elemento
   - Tercer elemento
   ```

2. **Listas numeradas:**
   ```
   1. Primer paso
   2. Segundo paso
   3. Tercer paso
   ```

3. **Referencias a figuras:**
   ```
   Como se observa en la [[figura:FIG-2-1]], el consumo...
   ```

4. **Referencias a tablas:**
   ```
   Los datos de la [[tabla:TBL-3-2]] muestran...
   ```

5. **Citas bibliográficas:**
   ```
   Según estudios recientes [[cita:Smith2020]], se observa...
   ```

6. **Bloques especiales:**
   ```
   [[caja:Título del Recuadro]]
   Contenido dentro del recuadro con formato especial.
   Puede incluir múltiples párrafos.
   [[/caja]]

   [[alerta:Advertencia Importante]]
   Texto de alerta que se destacará visualmente.
   [[/alerta]]

   [[info:Información Adicional]]
   Texto informativo con icono distintivo.
   [[/info]]

   [[destacado]]
   Texto que se resaltará en el documento.
   [[/destacado]]
   ```

7. **Formato de texto:**
   ```
   [[guinda:Texto en color guinda institucional]]
   [[dorado:Texto en color dorado institucional]]
   [[nota:Nota al pie o comentario explicativo]]
   ```

8. **Matemáticas:**
   ```
   Inline: La fórmula [[math:E = mc^2]] es conocida...
   
   Display (centrada):
   [[ecuacion:\int_0^\infty e^{-x} dx = 1]]
   ```

**Modo de edición avanzado:**

Al hacer click en "Editar" en una fila:
- Se abre editor de texto completo con:
  - Barra de herramientas de formato
  - Autocompletado de etiquetas
  - Vista previa en tiempo real
  - Validación de sintaxis
  - Contador de caracteres/palabras

### 4.3 Pestaña: Figuras

**Gestión de imágenes y gráficos:**

**Columnas:**
- **DocumentoID**: ID del documento (automático)
- **SeccionOrden**: Número de sección donde aparece
- **Fig.**: Número de figura (orden global: 1, 2, 3...)
- **RutaArchivo**: Ruta de la imagen en Google Drive
- **Caption**: Descripción de la figura
- **Fuente**: Fuente de la imagen (opcional)
- **TextoAlternativo**: Descripción para accesibilidad
- **Ancho**: Ancho relativo (0.5 = 50%, 0.8 = 80%, 1.0 = 100%)

**Cómo agregar una figura:**

1. **Preparar la imagen:**
   - Formatos soportados: PNG, JPG, JPEG, PDF
   - Resolución recomendada: 300 DPI para impresión
   - Tamaño máximo: 10 MB

2. **Subir a Google Drive:**
   - Carpeta: `img/` en la raíz del proyecto
   - Subcarpetas opcionales: `img/graficos/`, `img/figuras/`
   - Nombre descriptivo: `figura_2_1_consumo_energia.png`

3. **Registrar en el sistema:**
   - Click en "+ Agregar Fila"
   - Llenar campos:
     - **SeccionOrden**: Número de la sección (ej: 2 para Sección 2)
     - **Fig.**: Número consecutivo (ej: 1 para primera figura)
     - **RutaArchivo**: `img/graficos/figura_2_1_consumo_energia.png`
     - **Caption**: "Consumo nacional de energía 2020-2024"
     - **Fuente**: "Elaboración propia con datos de SENER"
     - **TextoAlternativo**: "Gráfico de barras mostrando consumo energético"
     - **Ancho**: 0.8 (80% del ancho de página)

4. **Referenciar en el texto:**
   ```
   En la [[figura:FIG-2-1]] se observa el incremento...
   ```

**Vista previa:**
- Click en icono de ojo para ver la imagen
- Verifica que la ruta sea correcta
- Ajusta el ancho si es necesario

### 4.4 Pestaña: Tablas

**Gestión de datos tabulares:**

**Columnas:**
- **DocumentoID**: ID del documento
- **SeccionOrden**: Número de sección
- **Orden**: Número de tabla (orden global)
- **Título**: Título de la tabla
- **Datos CSV**: Datos en formato CSV o rango de celdas
- **Fuente**: Fuente de los datos (opcional)
- **Opciones**: Configuración JSON (horizontal, hoja completa, etc.)
- **Filas Encabezado**: Número de filas de encabezado (default: 1)

**Tres formas de crear tablas:**

**Opción 1: Datos CSV directos**
```csv
Año,Producción (GWh),Consumo (GWh),Diferencia
2020,350000,340000,10000
2021,360000,355000,5000
2022,370000,365000,5000
2023,380000,375000,5000
```

**Opción 2: Referencia a rango de celdas**
```
'Datos Energía'!A1:D10
```
- El sistema leerá automáticamente el rango de otra hoja
- Útil para datos que se actualizan frecuentemente

**Opción 3: Editor visual de tablas**
1. Click en botón "Editar" en la fila
2. Se abre editor de cuadrícula interactivo
3. Agregar/eliminar filas y columnas con botones +/-
4. Editar celdas directamente
5. Guardar cambios

**Opciones avanzadas (JSON):**

```json
{
  "horizontal": true,
  "hojaCompleta": false,
  "filasEncabezado": 2
}
```

- **horizontal**: `true` para tabla en orientación apaisada
- **hojaCompleta**: `true` para tabla que ocupa página completa
- **filasEncabezado**: Número de filas que son encabezado (para formato especial)

**Editor de estilos de tabla:**

Click en "Diseño" para acceder al editor visual:

1. **Pestaña Header:**
   - Color de fondo del encabezado
   - Color de texto
   - Negrita activada/desactivada

2. **Pestaña Columns:**
   - Seleccionar columna
   - Color de fondo
   - Alineación (izquierda/centro/derecha)

3. **Pestaña Rows:**
   - Activar filas alternas (striping)
   - Color de filas alternas

4. **Pestaña Cells:**
   - Seleccionar celda específica en cuadrícula
   - Color de fondo personalizado
   - Color de texto personalizado

5. **Pestaña Preview:**
   - Vista previa en tiempo real
   - Exportar configuración JSON

**Referenciar tabla en texto:**
```
Los resultados de la [[tabla:TBL-3-1]] indican...
```

### 4.5 Pestaña: Gráficos

**Editor de gráficos estadísticos integrados:**

**Tipos de gráficos disponibles:**
- Barras (vertical/horizontal/apilado)
- Líneas
- Pastel (Pie)
- Dona (Doughnut)
- Radar
- Área Polar

**Crear un gráfico:**

1. **Click en "+ Nuevo Gráfico"**

2. **Configuración General:**
   - **ID Único**: Generado automáticamente
   - **Título**: Nombre del gráfico
   - **Tipo**: Seleccionar de la cuadrícula visual
   - **Sección de Anclaje**: Sección donde aparecerá
   - **Fuente de Datos**: Descripción textual

3. **Editor de Datos (Tabular):**
   - Vista de cuadrícula editable
   - Columnas = Etiquetas (Ene, Feb, Mar...)
   - Filas = Series de datos (Ventas, Costos...)
   - Botones "+ Columna" y "+ Serie"
   - Edición inline de valores

4. **Vista Previa en Tiempo Real:**
   - Panel derecho muestra el gráfico renderizado
   - Actualización automática al cambiar datos
   - Verifica colores y leyendas

5. **Opciones Especiales:**
   - **Gráfico Apilado** (solo para barras): Checkbox para apilar series
   - **JSON Crudo**: Editor avanzado para configuración manual

**Formato de datos JSON:**
```json
{
  "labels": ["Ene", "Feb", "Mar", "Abr"],
  "datasets": [
    {
      "label": "Producción",
      "data": [100, 120, 115, 130],
      "backgroundColor": "rgba(54, 162, 235, 0.5)"
    },
    {
      "label": "Consumo",
      "data": [95, 110, 120, 125],
      "backgroundColor": "rgba(255, 99, 132, 0.5)"
    }
  ]
}
```

**Referenciar gráfico en texto:**
```
El [[grafico:GRAF-1234567890]] muestra la tendencia...
```

### 4.6 Pestaña: Bibliografía

**Gestión de referencias bibliográficas:**

**Campos:**
- **DocumentoID**: ID del documento
- **Clave**: Identificador único (ej: `Smith2020`, `SENER2024`)
- **Tipo**: Tipo de publicación
- **Autor**: Formato: `Apellido, Nombre`
- **Título**: Título de la publicación
- **Año**: Año de publicación
- **Editorial**: Editorial o revista
- **URL**: Enlace web (opcional)

**Tipos de publicación:**

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `article` | Artículo de revista | Paper científico |
| `book` | Libro | Monografía completa |
| `inproceedings` | Artículo de conferencia | Paper en congreso |
| `techreport` | Reporte técnico | Informe institucional |
| `misc` | Otros | Sitio web, comunicado |

**Ejemplo de entrada:**
- **Clave**: `SENER2024`
- **Tipo**: `techreport`
- **Autor**: `Secretaría de Energía`
- **Título**: `Balance Nacional de Energía 2024`
- **Año**: `2024`
- **Editorial**: `Gobierno de México`
- **URL**: `https://www.gob.mx/sener`

**Citar en el texto:**
```
Según el informe oficial [[cita:SENER2024]], la producción...

Diversos estudios [[cita:Smith2020,Jones2021,SENER2024]] coinciden...
```

**Generación automática:**
- El sistema genera archivo `.bib` en formato BibTeX
- Compatible con LaTeX y gestores de referencias
- Ordenamiento alfabético automático

### 4.7 Pestaña: Siglas

**Glosario de acrónimos:**

**Campos:**
- **DocumentoID**: ID del documento
- **Sigla**: Acrónimo (ej: SENER, CFE, GWh)
- **Significado**: Significado completo

**Ejemplos:**
- **SENER**: Secretaría de Energía
- **CFE**: Comisión Federal de Electricidad
- **GWh**: Gigavatio-hora
- **PJ**: Petajoule

**Uso en el documento:**
- Primera mención: "Secretaría de Energía (SENER)"
- Menciones posteriores: "SENER"
- Lista automática al final del documento

### 4.8 Pestaña: Glosario

**Definiciones de términos técnicos:**

**Campos:**
- **DocumentoID**: ID del documento
- **Término**: Palabra o concepto
- **Definición**: Explicación del término

**Ejemplos:**
- **Término**: Transición energética
- **Definición**: Proceso de cambio del sistema energético actual basado en combustibles fósiles hacia fuentes de energía renovables y sostenibles.

**Renderizado:**
- Lista alfabética automática
- Formato de glosario profesional
- Hipervínculos desde el texto (opcional)

### 4.9 Pestaña: Unidades

**Catálogo de unidades de medida:**

**Campos:**
- **DocumentoID**: ID del documento
- **Símbolo**: Símbolo de la unidad (ej: kWh, MW, m³)
- **Nombre**: Nombre completo
- **Descripción**: Explicación de uso y equivalencias

**Ejemplos:**
- **Símbolo**: kWh
- **Nombre**: Kilovatio-hora
- **Descripción**: Unidad de energía equivalente a 1000 vatios durante una hora. 1 kWh = 3.6 MJ

**Uso:**
- Referencia rápida para autores
- Consistencia en todo el documento
- Tabla de conversiones automática (opcional)

### 4.10 Pestaña: Vista Previa

**Visualización de estructura del documento:**

**Elementos mostrados:**
1. **Árbol de secciones**: Jerarquía completa con numeración
2. **Lista de figuras**: Todas las figuras con miniaturas
3. **Lista de tablas**: Todas las tablas con preview de datos
4. **Gráficos**: Renderizado de gráficos estadísticos
5. **Bibliografía**: Referencias formateadas

**Funcionalidades:**
- **Navegación rápida**: Click en elemento para ir a su edición
- **Verificación visual**: Detecta elementos faltantes o mal referenciados
- **Exportar estructura**: Genera índice en formato texto

**Indicadores de estado:**
- ✅ Verde: Elemento completo y válido
- ⚠️ Amarillo: Advertencias (ej: figura sin caption)
- ❌ Rojo: Errores (ej: referencia rota)

---

## 5. Validación y Verificación

Una vez completada la edición:

1. Hacer clic en el botón **"Generar LaTeX"** (ubicado en la barra superior)
2. El sistema procesará los datos (puede tardar 10-30 segundos)
3. Aparecerá un mensaje de éxito con:
   - Enlace a la carpeta de salida en Google Drive
   - Enlace al archivo `.tex` generado
   - Enlace al archivo `.bib` (si hay bibliografía)

**Archivos generados:**
- `[NombreDocumento].tex`: Documento LaTeX completo
- `referencias.bib`: Bibliografía en formato BibTeX (si aplica)

**Siguiente paso:**
- Descargar archivos `.tex` y `.bib`
- Compilar con LaTeX (Overleaf, TeXShop, MiKTeX, etc.)
- Obtener PDF final con formato institucional

---

## 5. Validación y Verificación

### 5.1 Sistema de Validación en Vivo

El editor incluye un **motor de validación en tiempo real** que analiza el contenido mientras escribe.

**Panel de Lint (Validación):**

Ubicado en la parte inferior del editor de texto, muestra:

**Tipos de issues:**

1. **Errores (🔴 Rojo):**
   - Etiquetas mal cerradas: `[[caja:Título` sin `[[/caja]]`
   - Referencias rotas: `[[figura:FIG-99-99]]` que no existe
   - Sintaxis inválida: `[[cita:]]` sin clave
   - **Impiden la generación de LaTeX**

2. **Advertencias (🟠 Naranja):**
   - Figuras sin caption
   - Tablas sin fuente
   - Secciones sin contenido
   - **No impiden generación pero deben revisarse**

3. **Sugerencias (🔵 Azul):**
   - Mejoras de formato
   - Optimizaciones de estructura
   - Recomendaciones de estilo
   - **Opcionales pero recomendadas**

**Interacción con el panel:**
- Click en un issue para ir directamente al problema
- El texto problemático se resalta automáticamente
- Contador de issues por tipo en la parte superior

**Ejemplo de validación:**

```
❌ Error: Etiqueta 'caja' no cerrada en línea 45
⚠️ Advertencia: Figura FIG-2-3 referenciada pero sin caption definido
💡 Sugerencia: Considera agregar una nota explicativa para el término técnico
```

### 5.2 Verificación Pre-Generación

Antes de generar el LaTeX, el sistema ejecuta una **verificación completa**:

**Checklist automático:**

✅ **Metadatos completos:**
- Título, autor, fecha presentes
- Institución y unidad definidas
- Versión especificada

✅ **Estructura válida:**
- Al menos una sección definida
- Orden de secciones secuencial (1, 2, 3...)
- Niveles jerárquicos correctos

✅ **Referencias resueltas:**
- Todas las `[[figura:...]]` tienen entrada en pestaña Figuras
- Todas las `[[tabla:...]]` tienen entrada en pestaña Tablas
- Todas las `[[cita:...]]` tienen entrada en Bibliografía

✅ **Recursos accesibles:**
- Rutas de imágenes válidas
- Archivos existen en Google Drive
- Permisos de lectura correctos

✅ **Sintaxis LaTeX:**
- Caracteres especiales escapados correctamente
- Comandos LaTeX válidos
- Bloques balanceados

**Si hay errores críticos:**
- Se muestra modal con lista de problemas
- Botón "Generar LaTeX" deshabilitado
- Indicación de qué corregir primero

### 5.3 Validación de Tablas

**Verificaciones específicas para tablas:**

1. **Formato CSV:**
   - Número consistente de columnas en todas las filas
   - Sin comas extra o faltantes
   - Encoding UTF-8 correcto

2. **Rangos de celdas:**
   - Sintaxis válida: `'NombreHoja'!A1:D10`
   - Hoja existe en el libro
   - Rango contiene datos

3. **Estilos:**
   - Colores en formato hexadecimal válido
   - Índices de filas/columnas dentro de rango
   - JSON de opciones bien formado

**Herramienta de diagnóstico:**
- Click en "Validar Tabla" para análisis detallado
- Preview de cómo se renderizará
- Sugerencias de corrección automática

### 5.4 Validación de Figuras

**Verificaciones específicas para figuras:**

1. **Ruta de archivo:**
   - Formato: `img/carpeta/archivo.ext`
   - Extensión válida: .png, .jpg, .jpeg, .pdf
   - Archivo existe y es accesible

2. **Metadatos:**
   - Caption no vacío
   - Texto alternativo para accesibilidad
   - Ancho entre 0.1 y 1.0

3. **Calidad de imagen:**
   - Resolución mínima: 150 DPI
   - Tamaño máximo: 10 MB
   - Formato optimizado para impresión

**Vista previa de figura:**
- Click en icono de ojo
- Muestra imagen a tamaño real
- Indica si hay problemas de carga

### 5.5 Validación de Bibliografía

**Verificaciones específicas para referencias:**

1. **Campos obligatorios:**
   - Clave única y no vacía
   - Autor presente
   - Título presente
   - Año válido (formato YYYY)

2. **Formato BibTeX:**
   - Tipo de entrada válido
   - Caracteres especiales escapados
   - Sintaxis correcta para LaTeX

3. **Uso en documento:**
   - Advertencia si referencia no citada
   - Error si cita sin entrada bibliográfica

**Exportación BibTeX:**
- Validación automática al generar
- Corrección de encoding
- Ordenamiento alfabético

---

## 6. Generación y Descarga de LaTeX

### 6.1 Proceso de Generación

**Ubicación del botón:**
- Barra superior del editor
- Botón "Generar LaTeX" con icono de documento
- Solo visible en pestaña "Metadatos"

**Pasos del proceso:**

1. **Preparación:**
   - Sistema valida todos los datos
   - Verifica permisos de acceso
   - Prepara estructura de archivos

2. **Generación:**
   - Convierte datos a formato LaTeX
   - Procesa etiquetas especiales
   - Genera archivo .bib si hay bibliografía
   - Aplica estilos de tabla
   - Optimiza imágenes

3. **Empaquetado:**
   - Crea archivo .tex principal
   - Incluye archivo .bib (si aplica)
   - Genera archivo README con instrucciones
   - Comprime en .zip (opcional)

4. **Descarga:**
   - Descarga automática al navegador
   - Archivos guardados en carpeta de Descargas
   - Notificación de éxito con detalles

**Tiempo estimado:**
- Documentos pequeños (< 20 páginas): 10-15 segundos
- Documentos medianos (20-50 páginas): 20-30 segundos
- Documentos grandes (> 50 páginas): 30-60 segundos

### 6.2 Archivos Generados

**Estructura de archivos descargados:**

```
Balance_Nacional_Energia_2024/
├── Balance_Nacional_Energia_2024.tex    # Documento principal
├── referencias.bib                       # Bibliografía (si aplica)
├── README.txt                            # Instrucciones de compilación
└── img/                                  # Carpeta de imágenes (si se incluyen)
    ├── figura_2_1.png
    ├── figura_2_2.png
    └── ...
```

**Contenido del archivo .tex:**

1. **Preámbulo:**
   ```latex
   \documentclass[12pt,letterpaper]{sener2025}
   \usepackage[utf8]{inputenc}
   \usepackage[spanish]{babel}
   \usepackage{graphicx}
   \usepackage{hyperref}
   % ... más paquetes
   ```

2. **Metadatos:**
   ```latex
   \title{Balance Nacional de Energía 2024}
   \author{Secretaría de Energía}
   \date{Febrero 2025}
   \institucion{Secretaría de Energía (SENER)}
   \unidad{Dirección General de Planeación}
   ```

3. **Documento:**
   ```latex
   \begin{document}
   \maketitle
   \tableofcontents
   \listoffigures
   \listoftables
   
   % Contenido generado automáticamente
   \section{Introducción}
   ...
   
   \end{document}
   ```

**Contenido del archivo .bib:**

```bibtex
@techreport{SENER2024,
  author = {Secretaría de Energía},
  title = {Balance Nacional de Energía 2024},
  year = {2024},
  institution = {Gobierno de México},
  url = {https://www.gob.mx/sener}
}

@article{Smith2020,
  author = {Smith, John},
  title = {Energy Transition in Latin America},
  journal = {Energy Policy},
  year = {2020},
  volume = {145},
  pages = {111-125}
}
```

### 6.3 Ubicación de Archivos Descargados

**En su computadora:**

**Windows:**
- Ruta típica: `C:\Users\[TuUsuario]\Downloads\`
- Buscar archivo: `Balance_Nacional_Energia_2024.tex`

**macOS:**
- Ruta típica: `/Users/[TuUsuario]/Downloads/`
- Acceso rápido: Finder > Descargas

**Linux:**
- Ruta típica: `/home/[TuUsuario]/Downloads/`
- Comando terminal: `cd ~/Downloads`

**Verificar descarga:**
1. Abrir carpeta de Descargas
2. Buscar archivo con nombre del documento
3. Verificar fecha de modificación (debe ser reciente)
4. Tamaño del archivo (típicamente 50-500 KB para .tex)

### 6.4 Qué Hacer Después de Descargar

**Pasos inmediatos:**

1. **Crear carpeta de proyecto:**
   ```
   Documentos/
   └── Proyectos_LaTeX/
       └── Balance_Energia_2024/
           ├── Balance_Nacional_Energia_2024.tex
           ├── referencias.bib
           └── img/
   ```

2. **Copiar imágenes:**
   - Descargar carpeta `img/` de Google Drive
   - Colocar en la misma carpeta que el .tex
   - Mantener estructura de subcarpetas

3. **Verificar archivos:**
   - Abrir .tex en editor de texto
   - Verificar que no hay caracteres extraños
   - Confirmar encoding UTF-8

4. **Preparar para compilación:**
   - Instalar distribución LaTeX (ver sección 7)
   - Descargar clase `sener2025.cls`
   - Instalar fuentes institucionales

### 6.5 Solución de Problemas en Generación

**Problema: "Error al generar LaTeX"**

**Causas comunes:**
- Datos incompletos en Metadatos
- Referencias rotas a figuras/tablas
- Caracteres especiales sin escapar
- Permisos insuficientes en Google Drive

**Solución:**
1. Revisar panel de validación
2. Corregir errores marcados en rojo
3. Guardar cambios
4. Intentar generar nuevamente

**Problema: "Descarga no inicia"**

**Causas comunes:**
- Bloqueador de pop-ups activo
- Navegador bloqueando descarga
- Conexión a internet interrumpida

**Solución:**
1. Permitir pop-ups para el sitio
2. Verificar configuración de descargas del navegador
3. Intentar en modo incógnito
4. Usar navegador alternativo (Chrome/Firefox)

**Problema: "Archivo .tex corrupto o ilegible"**

**Causas comunes:**
- Encoding incorrecto
- Descarga interrumpida
- Antivirus bloqueando archivo

**Solución:**
1. Descargar nuevamente
2. Abrir con editor que soporte UTF-8 (VS Code, Sublime Text)
3. Verificar tamaño del archivo (no debe ser 0 KB)
4. Desactivar temporalmente antivirus

---

## 7. Compilación Local

### 7.1 Requisitos del Sistema

**Software necesario:**

1. **Distribución LaTeX:**
   - **Windows**: MiKTeX (https://miktex.org/)
   - **macOS**: MacTeX (https://www.tug.org/mactex/)
   - **Linux**: TeX Live (incluido en repositorios)

2. **Editor LaTeX (opcional pero recomendado):**
   - **TeXstudio** (multiplataforma, gratuito)
   - **Overleaf** (en línea, sin instalación)
   - **VS Code** con extensión LaTeX Workshop
   - **TeXShop** (macOS)
   - **TeXworks** (incluido con MiKTeX)

3. **Archivos institucionales:**
   - Clase `sener2025.cls`
   - Fuentes Patria (Regular, Bold, Light)
   - Fuentes Noto Sans (Regular, Bold, Italic)
   - Plantillas de portada/contraportada

**Espacio en disco:**
- Distribución LaTeX: 4-6 GB
- Proyecto individual: 50-200 MB (con imágenes)

**Tiempo de instalación:**
- Primera vez: 30-60 minutos
- Actualizaciones: 5-10 minutos

### 7.2 Instalación Paso a Paso

#### Windows (MiKTeX)

1. **Descargar instalador:**
   - Ir a https://miktex.org/download
   - Descargar "Basic MiKTeX Installer" (64-bit)
   - Tamaño: ~200 MB

2. **Ejecutar instalador:**
   - Doble click en archivo descargado
   - Aceptar términos de licencia
   - Seleccionar "Install for all users" (recomendado)
   - Ruta de instalación: `C:\Program Files\MiKTeX`

3. **Configuración inicial:**
   - Abrir "MiKTeX Console"
   - Ir a "Updates" > "Check for updates"
   - Instalar actualizaciones disponibles
   - Configurar "Install packages on-the-fly: Yes"

4. **Instalar paquetes adicionales:**
   ```
   MiKTeX Console > Packages > buscar e instalar:
   - babel-spanish
   - hyphen-spanish
   - biblatex
   - biber
   - xcolor
   - tcolorbox
   - fontspec (si usa XeLaTeX)
   ```

#### macOS (MacTeX)

1. **Descargar instalador:**
   - Ir a https://www.tug.org/mactex/
   - Descargar "MacTeX.pkg" (~4 GB)

2. **Ejecutar instalador:**
   - Doble click en archivo .pkg
   - Seguir asistente de instalación
   - Requiere contraseña de administrador
   - Tiempo: 15-20 minutos

3. **Verificar instalación:**
   - Abrir Terminal
   - Ejecutar: `pdflatex --version`
   - Debe mostrar versión instalada

4. **Instalar editor:**
   - TeXShop viene incluido
   - Ubicación: `/Applications/TeX/TeXShop.app`

#### Linux (TeX Live)

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install texlive-full
sudo apt install texlive-lang-spanish
sudo apt install texstudio
```

**Fedora/RHEL:**
```bash
sudo dnf install texlive-scheme-full
sudo dnf install texstudio
```

**Arch Linux:**
```bash
sudo pacman -S texlive-most
sudo pacman -S texstudio
```

### 7.3 Configuración de Archivos Institucionales

**Instalar clase sener2025.cls:**

1. **Ubicar carpeta de clases locales:**
   - **Windows**: `C:\Users\[Usuario]\texmf\tex\latex\local\`
   - **macOS**: `~/Library/texmf/tex/latex/local/`
   - **Linux**: `~/texmf/tex/latex/local/`

2. **Crear carpeta si no existe:**
   ```bash
   mkdir -p ~/texmf/tex/latex/local
   ```

3. **Copiar archivo:**
   - Colocar `sener2025.cls` en la carpeta
   - Ejecutar: `texhash` o `mktexlsr` (actualiza base de datos)

**Instalar fuentes institucionales:**

1. **Fuentes Patria:**
   - Copiar archivos .otf a carpeta de fuentes del sistema
   - **Windows**: `C:\Windows\Fonts\`
   - **macOS**: `/Library/Fonts/` o `~/Library/Fonts/`
   - **Linux**: `~/.fonts/` o `/usr/share/fonts/`

2. **Fuentes Noto Sans:**
   - Descargar de Google Fonts si no están incluidas
   - Instalar de la misma manera

3. **Verificar instalación:**
   - Abrir aplicación de fuentes del sistema
   - Buscar "Patria" y "Noto Sans"
   - Deben aparecer en la lista

### 7.4 Compilación del Documento

**Método 1: Línea de comandos (recomendado para automatización)**

1. **Abrir terminal en carpeta del proyecto:**
   ```bash
   cd ~/Documentos/Proyectos_LaTeX/Balance_Energia_2024/
   ```

2. **Compilar con pdflatex:**
   ```bash
   pdflatex Balance_Nacional_Energia_2024.tex
   ```

3. **Compilar bibliografía (si aplica):**
   ```bash
   biber Balance_Nacional_Energia_2024
   ```
   O si usa BibTeX tradicional:
   ```bash
   bibtex Balance_Nacional_Energia_2024
   ```

4. **Recompilar para resolver referencias:**
   ```bash
   pdflatex Balance_Nacional_Energia_2024.tex
   pdflatex Balance_Nacional_Energia_2024.tex
   ```

**Secuencia completa:**
```bash
pdflatex documento.tex
biber documento
pdflatex documento.tex
pdflatex documento.tex
```

**Método 2: Editor gráfico (TeXstudio)**

1. **Abrir archivo .tex:**
   - File > Open > seleccionar .tex

2. **Configurar compilador:**
   - Options > Configure TeXstudio
   - Build > Default Compiler: "PdfLaTeX"
   - Build > Default Bibliography Tool: "Biber"

3. **Compilar:**
   - Presionar F5 o click en botón "Build & View"
   - El PDF se genera automáticamente
   - Vista previa integrada

4. **Ver errores:**
   - Panel inferior muestra log de compilación
   - Click en error para ir a línea problemática

**Método 3: Overleaf (en línea)**

1. **Crear proyecto:**
   - Ir a https://www.overleaf.com/
   - New Project > Upload Project
   - Subir archivo .zip con .tex, .bib e imágenes

2. **Configurar compilador:**
   - Menu > Compiler: "pdfLaTeX"
   - Menu > TeX Live version: 2023 o superior

3. **Compilar:**
   - Automático al guardar cambios
   - O click en "Recompile"

4. **Descargar PDF:**
   - Click en icono de descarga
   - PDF > Download PDF

### 7.5 Solución de Errores de Compilación

**Error: "File `sener2025.cls' not found"**

**Solución:**
1. Verificar que `sener2025.cls` está en carpeta correcta
2. Ejecutar `texhash` o `mktexlsr`
3. O colocar .cls en la misma carpeta que el .tex

**Error: "Font 'Patria-Regular' not found"**

**Solución:**
1. Instalar fuentes Patria en el sistema
2. Si usa pdfLaTeX, cambiar a XeLaTeX o LuaLaTeX
3. O comentar líneas de fuentes personalizadas

**Error: "Undefined control sequence"**

**Solución:**
1. Buscar comando LaTeX no reconocido
2. Verificar que paquete necesario está cargado
3. Revisar sintaxis de comandos personalizados

**Error: "Missing $ inserted"**

**Solución:**
1. Caracteres especiales sin escapar: `_`, `^`, `%`, `&`
2. Modo matemático incorrecto
3. Agregar `\` antes del carácter: `\_`, `\^`, `\%`, `\&`

**Error: "File 'imagen.png' not found"**

**Solución:**
1. Verificar que carpeta `img/` está en lugar correcto
2. Revisar rutas en el .tex
3. Verificar nombres de archivo (case-sensitive en Linux/macOS)

**Error: "Package babel Error: Unknown option 'spanish'"**

**Solución:**
1. Instalar paquete `babel-spanish`
2. O cambiar a `\usepackage[spanish,es-tabla]{babel}`

### 7.6 Optimización de Compilación

**Compilación rápida durante edición:**
```bash
pdflatex -draftmode documento.tex
```
- No genera PDF final
- Solo verifica errores
- Mucho más rápido

**Compilación con caché:**
```bash
pdflatex -interaction=nonstopmode documento.tex
```
- No se detiene en errores menores
- Útil para automatización

**Compilación paralela (documentos grandes):**
- Usar `latexmk` con opción `-pvc`
- Recompila automáticamente al detectar cambios

**Script de compilación automatizada:**

```bash
#!/bin/bash
# compile.sh

echo "Compilando documento..."
pdflatex -interaction=nonstopmode $1.tex
biber $1
pdflatex -interaction=nonstopmode $1.tex
pdflatex -interaction=nonstopmode $1.tex
echo "Compilación completada. PDF generado: $1.pdf"
```

Uso:
```bash
chmod +x compile.sh
./compile.sh Balance_Nacional_Energia_2024
```

---

## 8. Cómo Interpretar Resultados

### 8.1 Estructura del Documento LaTeX Generado

El archivo `.tex` contiene:

1. **Preámbulo (líneas 1-50)**: 
   - Configuración de clase y paquetes
   - Definición de colores institucionales
   - Configuración de hipervínculos
   - Metadatos del PDF

2. **Metadatos del documento (líneas 51-70)**:
   - Título, autor, fecha
   - Institución y unidad
   - Palabras clave
   - Versión

3. **Inicio del documento (línea 71)**:
   - `\begin{document}`
   - Portada automática
   - Página de créditos/directorio

4. **Índices (generados automáticamente)**:
   - Tabla de contenidos (`\tableofcontents`)
   - Lista de figuras (`\listoffigures`)
   - Lista de tablas (`\listoftables`)

5. **Secciones preliminares**:
   - Agradecimientos
   - Presentación institucional
   - Resumen ejecutivo
   - Datos clave

6. **Cuerpo del documento**:
   - Secciones y subsecciones numeradas
   - Contenido con formato aplicado
   - Figuras y tablas insertadas
   - Referencias cruzadas activas

7. **Anexos** (si aplica):
   - Numeración con letras (A, B, C...)
   - Subsecciones de anexos (A.1, A.2...)

8. **Secciones finales**:
   - Lista de siglas y acrónimos
   - Glosario de términos
   - Tabla de unidades
   - Bibliografía (si hay referencias)

9. **Contraportada**:
   - Información institucional final
   - Datos de contacto

10. **Cierre del documento**:
    - `\end{document}`

### 8.2 Compilación del Documento

**Requisitos:**
- Distribución LaTeX instalada (TeX Live, MiKTeX, MacTeX)
- Plantilla de clase `sener2025.cls` (proporcionada por la institución)
- Tipografías institucionales (Patria, Noto Sans)
- Carpeta `img/` con todas las imágenes

**Comando de compilación estándar:**
```bash
pdflatex documento.tex
biber documento
pdflatex documento.tex
pdflatex documento.tex
```

**¿Por qué compilar 3 veces?**
1. **Primera compilación**: Genera estructura básica y archivos auxiliares (.aux, .toc)
2. **Biber/BibTeX**: Procesa bibliografía y genera .bbl
3. **Segunda compilación**: Resuelve referencias cruzadas (figuras, tablas, citas)
4. **Tercera compilación**: Finaliza numeración y tabla de contenidos

**Plataformas recomendadas:**

| Plataforma | Ventajas | Desventajas |
|------------|----------|-------------|
| **Overleaf** | Sin instalación, colaborativo, vista previa en tiempo real | Requiere internet, límites en plan gratuito |
| **TeXstudio** | Gratuito, multiplataforma, autocompletado | Requiere instalación de LaTeX |
| **VS Code + LaTeX Workshop** | Integrado con editor moderno, Git | Configuración inicial compleja |
| **TeXShop** (macOS) | Nativo, ligero, vista previa integrada | Solo macOS |

### 8.3 Verificación de Calidad

**Checklist de revisión post-compilación:**

✅ **Estructura general:**
- [ ] Portada con identidad institucional correcta
- [ ] Tabla de contenidos completa y numerada
- [ ] Lista de figuras con números y títulos
- [ ] Lista de tablas con números y títulos

✅ **Contenido:**
- [ ] Todas las secciones presentes
- [ ] Numeración secuencial correcta
- [ ] Texto sin errores de encoding (tildes, ñ)
- [ ] Párrafos con justificación adecuada

✅ **Figuras:**
- [ ] Todas las imágenes se muestran correctamente
- [ ] Tamaños apropiados (no pixeladas ni demasiado pequeñas)
- [ ] Captions completos y numerados
- [ ] Fuentes citadas cuando aplica

✅ **Tablas:**
- [ ] Formato adecuado (encabezados destacados)
- [ ] Datos legibles y alineados
- [ ] Fuentes citadas cuando aplica
- [ ] Tablas grandes no cortadas entre páginas (si es posible)

✅ **Referencias:**
- [ ] Bibliografía generada correctamente
- [ ] Citas en el texto funcionan (hipervínculos activos)
- [ ] Formato consistente en todas las referencias
- [ ] No hay referencias "?" o rotas

✅ **Índices y listas:**
- [ ] Glosario ordenado alfabéticamente
- [ ] Siglas con significados completos
- [ ] Unidades con descripciones claras

✅ **Formato institucional:**
- [ ] Colores institucionales aplicados (guinda, dorado)
- [ ] Tipografías correctas (Patria para títulos, Noto Sans para cuerpo)
- [ ] Márgenes según especificaciones
- [ ] Encabezados y pies de página correctos

✅ **Accesibilidad (PDF/UA-2):**
- [ ] Hipervínculos internos funcionan
- [ ] Marcadores (bookmarks) en el PDF
- [ ] Metadatos del PDF completos
- [ ] Texto alternativo en imágenes (si se configuró)

✅ **Contraportada:**
- [ ] Información institucional final
- [ ] Datos de contacto actualizados
- [ ] Logos y elementos gráficos correctos

**Herramientas de verificación:**

1. **Adobe Acrobat Reader:**
   - Ver > Mostrar/Ocultar > Paneles de navegación > Marcadores
   - Verificar estructura de navegación

2. **PDF-XChange Viewer:**
   - Herramientas de medición para verificar márgenes
   - Extracción de texto para verificar encoding

3. **Validador de accesibilidad:**
   - PAC 2024 (PDF Accessibility Checker)
   - Verifica cumplimiento de estándares

### 8.4 Solución de Problemas Comunes

**Problema: Imágenes no aparecen**

**Diagnóstico:**
- Revisar log de compilación: buscar "File 'imagen.png' not found"
- Verificar rutas en el .tex

**Solución:**
1. Confirmar que carpeta `img/` está en el mismo directorio que el .tex
2. Verificar nombres de archivo (case-sensitive en Linux/macOS)
3. Usar rutas relativas, no absolutas
4. Formatos soportados: PNG, JPG, PDF (no BMP ni GIF)

**Problema: Bibliografía no aparece**

**Diagnóstico:**
- Revisar si hay archivo .bib generado
- Verificar que hay citas en el texto (`\cite{...}`)

**Solución:**
1. Ejecutar `biber documento` (no `bibtex`)
2. Recompilar con pdflatex dos veces más
3. Verificar que hay al menos una `\cite{}` en el texto
4. Revisar log de biber: `documento.blg`

**Problema: Tabla de contenidos vacía**

**Diagnóstico:**
- Primera compilación siempre genera TOC vacío

**Solución:**
1. Compilar al menos dos veces
2. Verificar que hay secciones con `\section{}`
3. Eliminar archivos auxiliares y recompilar:
   ```bash
   rm *.aux *.toc *.lof *.lot
   pdflatex documento.tex
   pdflatex documento.tex
   ```

**Problema: Caracteres especiales mal renderizados**

**Diagnóstico:**
- Tildes aparecen como "Ã©" o símbolos extraños
- Problema de encoding

**Solución:**
1. Guardar .tex con encoding UTF-8 (no Latin-1 ni Windows-1252)
2. En editor: File > Save with Encoding > UTF-8
3. Verificar preámbulo: `\usepackage[utf8]{inputenc}`
4. Recompilar

**Problema: Fuentes institucionales no se aplican**

**Diagnóstico:**
- Documento usa fuentes genéricas (Computer Modern)

**Solución:**
1. Verificar que fuentes Patria y Noto Sans están instaladas en el sistema
2. Si usa pdfLaTeX, cambiar a XeLaTeX o LuaLaTeX:
   ```bash
   xelatex documento.tex
   ```
3. O comentar líneas de fuentes personalizadas en el preámbulo

**Problema: Compilación muy lenta**

**Diagnóstico:**
- Documento grande con muchas imágenes
- Imágenes de alta resolución

**Solución:**
1. Usar modo draft durante edición:
   ```latex
   \documentclass[draft]{sener2025}
   ```
2. Optimizar imágenes (reducir resolución a 300 DPI)
3. Usar formato PDF para imágenes vectoriales
4. Compilar con `-draftmode` para pruebas rápidas

---

## 9. Exportaciones

### 4.1 Exportar Datos a Excel

Desde Google Sheets:
1. Abrir el libro de trabajo en Google Sheets
2. Ir a **Archivo > Descargar > Microsoft Excel (.xlsx)**
3. El archivo se descargará con todos los datos

### 4.2 Exportar Documento LaTeX

Desde el editor:
1. Hacer clic en **"Generar LaTeX"**
2. Acceder a la carpeta de Google Drive indicada
3. Descargar archivos `.tex` y `.bib`

### 4.3 Exportar PDF Final

Después de compilar LaTeX:
1. El PDF se genera automáticamente en la carpeta de compilación
2. Verificar que cumple estándares institucionales
3. Distribuir según procedimientos internos

### 9.1 Exportar Datos a Excel

**Desde Google Sheets:**
1. Abrir el libro de trabajo en Google Sheets directamente
2. Ir a **Archivo > Descargar > Microsoft Excel (.xlsx)**
3. El archivo se descargará con todos los datos y formato

**Desde el Editor Web:**
- Los datos se sincronizan automáticamente con Google Sheets
- No hay opción de exportación directa desde el editor
- Acceder a Google Sheets para exportar

**Formato del archivo Excel:**
- Múltiples hojas (Documentos, Secciones, Figuras, Tablas, etc.)
- Formato preservado (colores, negritas)
- Fórmulas convertidas a valores

### 9.2 Exportar Documento LaTeX

**Desde el editor:**
1. Asegurarse de estar en pestaña "Metadatos"
2. Hacer clic en **"Generar LaTeX"** (barra superior)
3. Esperar confirmación (10-30 segundos)
4. Archivos se descargan automáticamente al navegador

**Archivos descargados:**
- `[NombreDocumento].tex`: Documento LaTeX completo
- `referencias.bib`: Bibliografía en formato BibTeX (si aplica)
- `README.txt`: Instrucciones de compilación

**Ubicación:**
- Carpeta de Descargas del navegador
- Típicamente: `C:\Users\[Usuario]\Downloads\` (Windows)
- O: `/Users/[Usuario]/Downloads/` (macOS)

### 9.3 Exportar PDF Final

**Después de compilar LaTeX:**

1. **Ubicación del PDF:**
   - Misma carpeta que el archivo .tex
   - Nombre: `[NombreDocumento].pdf`

2. **Verificar calidad:**
   - Abrir en Adobe Acrobat Reader
   - Verificar que cumple estándares institucionales
   - Revisar marcadores y navegación

3. **Distribuir:**
   - Subir a repositorio institucional
   - Enviar por correo electrónico
   - Publicar en sitio web oficial

**Optimización del PDF:**

Para reducir tamaño:
```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=documento_optimizado.pdf documento.pdf
```

Para PDF/A (archivo):
```bash
gs -dPDFA=2 -dBATCH -dNOPAUSE -sColorConversionStrategy=UseDeviceIndependentColor \
   -sDEVICE=pdfwrite -dPDFACompatibilityPolicy=1 \
   -sOutputFile=documento_pdfa.pdf documento.pdf
```

### 9.4 Exportar Estructura del Documento

**Vista Previa estructurada:**

1. Ir a pestaña "Vista Previa"
2. Click derecho en árbol de secciones
3. Seleccionar "Exportar estructura"
4. Formato disponible: TXT, JSON, Markdown

**Uso:**
- Revisión de estructura antes de generar
- Documentación del índice
- Planificación de contenido

---

## 10. Preguntas Frecuentes

### 10.1 Generales

**P: ¿Puedo trabajar sin conexión a internet?**  
R: No, el sistema requiere conexión constante para:
- Sincronización con Google Sheets en tiempo real
- Colaboración simultánea con otros usuarios
- Acceso a imágenes almacenadas en Google Drive
- Generación de archivos LaTeX en el servidor

**P: ¿Cuántos usuarios pueden editar simultáneamente?**  
R: Hasta 15 usuarios pueden colaborar en el mismo documento sin problemas de rendimiento. El sistema muestra avatares de usuarios activos en tiempo real.

**P: ¿Los cambios se guardan automáticamente?**  
R: Sí, el sistema tiene dos mecanismos de guardado:
- **Autoguardado**: Cada 2 segundos después del último cambio
- **Guardado manual**: Botón "Guardar Cambios" o Ctrl/Cmd + S
- Indicador visual: punto amarillo pulsante cuando hay cambios sin guardar

**P: ¿Qué navegadores son compatibles?**  
R: Navegadores modernos con soporte completo:
- Google Chrome 90+ (recomendado)
- Mozilla Firefox 88+
- Microsoft Edge 90+
- Safari 14+ (macOS)

No recomendado: Internet Explorer (descontinuado)

**P: ¿Puedo acceder desde dispositivos móviles?**  
R: Sí, la interfaz es responsive y funciona en:
- Tablets (iPad, Android tablets) - experiencia completa
- Smartphones - funcionalidad limitada, mejor para revisión que edición
- Recomendado: pantalla de al menos 10" para edición cómoda

**P: ¿Cómo recupero un documento eliminado?**  
R: Los documentos eliminados pueden recuperarse:
1. Acceder a Google Sheets directamente
2. Ir a **Archivo > Historial de versiones**
3. Restaurar versión anterior a la eliminación
4. O contactar al administrador del sistema

**P: ¿Hay límite de tamaño para documentos?**  
R: Límites técnicos:
- Secciones: Sin límite práctico
- Figuras: 100 por documento (recomendado)
- Tablas: 50 por documento (recomendado)
- Tamaño total de Google Sheet: 10 millones de celdas
- Imágenes individuales: 10 MB máximo

### 10.2 Navegación y Uso

**P: ¿Cómo cambio entre documentos sin volver al Dashboard?**  
R: En la barra superior del editor:
1. Click en el selector de documento (dropdown)
2. Seleccionar otro documento del mismo libro
3. El editor carga el nuevo documento automáticamente

**P: ¿Puedo copiar contenido entre documentos?**  
R: Sí, dos métodos:
- **Método 1**: Copiar/pegar texto directamente entre editores
- **Método 2**: Exportar sección completa y importar en otro documento
- Las referencias a figuras/tablas deben ajustarse manualmente

**P: ¿Cómo busco texto dentro de un documento?**  
R: Usar búsqueda del navegador:
- Windows/Linux: Ctrl + F
- macOS: Cmd + F
- Busca en la pestaña activa actual

**P: ¿Puedo deshacer cambios?**  
R: Sí, múltiples niveles de deshacer:
- **En editor de texto**: Ctrl/Cmd + Z (hasta 50 acciones)
- **En Google Sheets**: Historial de versiones completo
- **Restaurar versión anterior**: Archivo > Historial de versiones

**P: ¿Cómo veo quién está editando el documento?**  
R: Indicadores de colaboración:
- **Avatares en esquina superior derecha**: Usuarios activos ahora
- **Indicador verde**: Usuario conectado
- **Hover sobre avatar**: Muestra nombre y correo
- **Panel de actividad**: Click en icono de usuarios para ver historial

### 10.3 Edición y Formato

**P: ¿Cómo inserto saltos de línea en el contenido?**  
R: Depende del tipo de salto:
- **Nuevo párrafo**: Presionar Enter (genera `\n\n` en LaTeX)
- **Salto de línea simple**: Usar `\\` en el texto (genera `\\` en LaTeX)
- **Salto de página**: Insertar `\newpage` directamente

**P: ¿Puedo usar formato en negrita o cursiva?**  
R: Sí, usando comandos LaTeX inline:
- **Negrita**: `\textbf{texto en negrita}`
- **Cursiva**: `\textit{texto en cursiva}`
- **Ambos**: `\textbf{\textit{texto}}`
- **Alternativa**: Usar etiquetas del sistema: `[[guinda:texto]]` para color

**P: ¿Cómo agrego ecuaciones matemáticas?**  
R: Dos formas:
- **Inline** (en línea con el texto): `[[math:E = mc^2]]`
- **Display** (centrada, en su propia línea): `[[ecuacion:\int_0^\infty e^{-x} dx = 1]]`
- Sintaxis: LaTeX estándar dentro de las etiquetas

**P: ¿Puedo incluir código de programación?**  
R: Sí, usando bloques de código:
```
[[codigo:python]]
def calcular_energia(masa):
    c = 299792458  # velocidad de la luz
    return masa * c ** 2
[[/codigo]]
```
Lenguajes soportados: Python, R, MATLAB, JavaScript, SQL

**P: ¿Cómo creo listas con sub-elementos?**  
R: Usar indentación:
```
- Elemento principal 1
  - Sub-elemento 1.1
  - Sub-elemento 1.2
- Elemento principal 2
  - Sub-elemento 2.1
```

**P: ¿Puedo agregar notas al pie de página?**  
R: Sí, usando la etiqueta `[[nota:...]]`:
```
El consumo energético[[nota:Medido en GWh]] aumentó un 5%.
```
Se renderiza como superíndice con hipervínculo a la nota al pie.

### 10.4 Figuras y Tablas

**P: ¿Qué formatos de imagen son compatibles?**  
R: Formatos soportados:
- **PNG**: Recomendado para gráficos, diagramas, capturas de pantalla
- **JPG/JPEG**: Recomendado para fotografías
- **PDF**: Recomendado para gráficos vectoriales (escalables sin pérdida)
- **No soportados**: BMP, GIF, TIFF, SVG (convertir a PDF primero)

**P: ¿Cómo ajusto el tamaño de una figura?**  
R: Modificar el campo "Ancho" en la pestaña Figuras:
- **0.5** = 50% del ancho de página (media columna)
- **0.8** = 80% del ancho de página (recomendado para la mayoría)
- **1.0** = 100% del ancho de página (ancho completo)
- **1.2** = 120% (se extiende a los márgenes, usar con precaución)

**P: ¿Las tablas pueden tener celdas combinadas?**  
R: Sí, dos métodos:
- **Método 1 (visual)**: Usar editor de estilos de tabla, seleccionar celdas y combinar
- **Método 2 (avanzado)**: Usar comandos LaTeX en el campo "Datos CSV":
  ```
  \multicolumn{2}{c}{Título combinado}
  ```
- Consultar documentación de LaTeX para sintaxis completa

**P: ¿Puedo importar tabla desde Excel?**  
R: Sí, proceso:
1. Copiar tabla de Excel (Ctrl + C)
2. Pegar en editor de texto (Notepad, VS Code)
3. Guardar como CSV con encoding UTF-8
4. Copiar contenido CSV al campo "Datos CSV"
5. O usar referencia a rango de celdas si está en Google Sheets

**P: ¿Cómo hago que una tabla sea apaisada (horizontal)?**  
R: En el campo "Opciones" de la tabla, agregar JSON:
```json
{
  "horizontal": true
}
```
La tabla se renderizará en orientación landscape.

**P: ¿Puedo tener tablas de más de una página?**  
R: Sí, automático:
- Tablas largas se dividen automáticamente entre páginas
- Encabezado se repite en cada página
- Para forzar tabla en una sola página: `{"hojaCompleta": true}`

### 10.5 Generación LaTeX

**P: ¿Cuánto tarda en generarse el archivo LaTeX?**  
R: Tiempo estimado según tamaño:
- **Documentos pequeños** (< 20 páginas): 10-15 segundos
- **Documentos medianos** (20-50 páginas): 20-30 segundos
- **Documentos grandes** (> 50 páginas): 30-60 segundos
- Factores: número de figuras, tablas, complejidad de formato

**P: ¿Qué hago si la generación falla?**  
R: Pasos de diagnóstico:
1. **Revisar panel de validación**: Corregir errores marcados en rojo
2. **Verificar campos obligatorios**: Título, autor, fecha deben estar llenos
3. **Comprobar referencias**: Todas las `[[figura:...]]` y `[[tabla:...]]` deben existir
4. **Revisar caracteres especiales**: Escapar `%`, `&`, `_`, `$`, `#`
5. **Ver log de errores**: Menú > Ver log de errores (si disponible)
6. **Contactar soporte**: Si persiste, enviar captura de pantalla del error

**P: ¿Puedo personalizar la plantilla LaTeX?**  
R: Personalización limitada:
- **Colores institucionales**: Fijos (guinda, dorado)
- **Tipografías**: Fijas (Patria, Noto Sans)
- **Márgenes y espaciado**: Según especificaciones institucionales
- **Para personalizaciones avanzadas**: Contactar al administrador del sistema o editar el .tex manualmente después de generar

**P: ¿El sistema genera PDF directamente?**  
R: No, el sistema genera archivos .tex y .bib:
- **Razón**: LaTeX requiere compilación local con fuentes y recursos institucionales
- **Ventaja**: Control total sobre el proceso de compilación
- **Alternativa**: Usar Overleaf para compilación en línea sin instalación

**P: ¿Puedo regenerar el LaTeX después de hacer cambios?**  
R: Sí, sin límite:
- Hacer cambios en el editor
- Guardar cambios
- Click en "Generar LaTeX" nuevamente
- Se descarga versión actualizada
- Versiones anteriores no se sobrescriben automáticamente (renombrar manualmente)

### 10.6 Colaboración

**P: ¿Cómo sé quién está editando el documento?**  
R: Indicadores visuales:
- **Avatares en esquina superior derecha**: Usuarios activos en este momento
- **Indicador verde en avatar**: Usuario conectado
- **Hover sobre avatar**: Muestra nombre completo y correo electrónico
- **Panel de actividad**: Historial de cambios recientes

**P: ¿Qué pasa si dos usuarios editan la misma celda?**  
R: Sistema de resolución de conflictos:
- **Último cambio guardado prevalece** (last-write-wins)
- **Advertencia visual**: Si detecta edición simultánea
- **Recomendación**: Coordinar secciones entre usuarios para evitar conflictos
- **Historial de versiones**: Permite recuperar cambios sobrescritos

**P: ¿Puedo ver el historial de cambios?**  
R: Sí, dos niveles:
- **Historial de Google Sheets**: Archivo > Historial de versiones > Ver historial de versiones
  - Muestra todos los cambios con fecha, hora y usuario
  - Permite restaurar versiones anteriores
  - Comparación visual entre versiones
- **Historial del editor**: Panel de actividad muestra cambios recientes (últimas 24 horas)

**P: ¿Puedo restringir quién puede editar?**  
R: Permisos gestionados en Google Sheets:
1. Abrir libro en Google Sheets
2. Click en "Compartir" (esquina superior derecha)
3. Configurar permisos:
   - **Editor**: Puede modificar contenido
   - **Comentador**: Solo puede agregar comentarios
   - **Lector**: Solo puede ver
4. Cambios se reflejan automáticamente en el editor web

**P: ¿Puedo agregar comentarios sin modificar el texto?**  
R: Sí, en Google Sheets:
1. Seleccionar celda
2. Click derecho > Insertar comentario
3. Escribir comentario
4. Otros usuarios recibirán notificación
5. Comentarios no aparecen en el LaTeX generado

### 10.7 Soporte Técnico

**P: ¿A quién contacto si tengo problemas técnicos?**  
R: Canales de soporte:
- **Email**: soporte.latex@sener.gob.mx
- **Teléfono**: (55) 5000-6000 ext. 1234
- **Horario**: Lunes a Viernes, 9:00 - 18:00 hrs (hora de Ciudad de México)
- **Tiempo de respuesta**: 24-48 horas hábiles

**P: ¿Dónde encuentro tutoriales en video?**  
R: Recursos de capacitación:
- **Portal de capacitación**: `https://[url-capacitacion]/tutoriales`
- **YouTube institucional**: Canal oficial de SENER
- **Documentación**: Manual técnico y guías rápidas en el repositorio

**P: ¿Hay capacitación presencial disponible?**  
R: Sí, opciones:
- **Talleres mensuales**: Primer jueves de cada mes, 10:00-12:00 hrs
- **Capacitación personalizada**: Para equipos de 5+ personas
- **Webinars**: Segundo martes de cada mes, 15:00-16:00 hrs
- **Registro**: Enviar solicitud a capacitacion@sener.gob.mx

**P: ¿Cómo reporto un bug o sugiero una mejora?**  
R: Sistema de tickets:
1. Acceder a portal de soporte
2. Click en "Nuevo ticket"
3. Seleccionar tipo: Bug / Mejora / Pregunta
4. Describir detalladamente:
   - Pasos para reproducir (si es bug)
   - Comportamiento esperado vs. actual
   - Capturas de pantalla
   - Navegador y versión
5. Enviar ticket
6. Recibirá número de seguimiento por correo

**P: ¿El sistema tiene actualizaciones frecuentes?**  
R: Ciclo de actualizaciones:
- **Parches de seguridad**: Según necesidad (notificación por correo)
- **Actualizaciones menores**: Mensual (nuevas funcionalidades pequeñas)
- **Actualizaciones mayores**: Trimestral (cambios significativos)
- **Mantenimiento programado**: Domingos 2:00-6:00 AM (notificación previa)

**P: ¿Mis datos están respaldados?**  
R: Sí, múltiples niveles:
- **Google Sheets**: Respaldo automático continuo por Google
- **Historial de versiones**: 30 días de historial detallado
- **Respaldo institucional**: Semanal en servidores de SENER
- **Recuperación ante desastres**: Plan de continuidad operativa

---

## Apéndices

### Apéndice A: Glosario de Términos

**LaTeX**: Sistema de composición de textos orientado a la creación de documentos científicos y técnicos de alta calidad tipográfica.

**BibTeX/Biber**: Herramientas para gestión de bibliografías en documentos LaTeX.

**Google Sheets**: Aplicación de hojas de cálculo en línea de Google, base de datos del sistema.

**Encoding UTF-8**: Codificación de caracteres que soporta todos los idiomas, incluyendo español con tildes y ñ.

**PDF/UA**: Estándar de accesibilidad para documentos PDF (Universal Accessibility).

**Markdown**: Lenguaje de marcado ligero para formato de texto.

**Responsive**: Diseño que se adapta a diferentes tamaños de pantalla.

**API**: Interfaz de Programación de Aplicaciones, permite comunicación entre sistemas.

**Webhook**: Mecanismo de notificación automática entre aplicaciones.

### Apéndice B: Atajos de Teclado Completos

| Atajo | Acción | Contexto |
|-------|--------|----------|
| `Ctrl/Cmd + S` | Guardar cambios | Global |
| `Ctrl/Cmd + Z` | Deshacer | Editor de texto |
| `Ctrl/Cmd + Y` | Rehacer | Editor de texto |
| `Ctrl/Cmd + F` | Buscar | Navegador |
| `Ctrl/Cmd + B` | Negrita | Editor de texto |
| `Ctrl/Cmd + I` | Cursiva | Editor de texto |
| `[[` | Autocompletado | Editor de texto |
| `Esc` | Cerrar modal/autocompletado | Global |
| `↑/↓` | Navegar sugerencias | Autocompletado |
| `Enter/Tab` | Seleccionar sugerencia | Autocompletado |
| `Ctrl/Cmd + Enter` | Guardar y cerrar modal | Modales de edición |
| `Alt + ←` | Volver a vista anterior | Navegación |
| `Alt + →` | Avanzar a vista siguiente | Navegación |

### Apéndice C: Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| `ERR_AUTH_001` | Sesión expirada | Cerrar sesión y volver a iniciar |
| `ERR_SHEET_404` | Hoja no encontrada | Verificar ID de Google Sheet |
| `ERR_PERM_403` | Sin permisos de acceso | Solicitar acceso al propietario |
| `ERR_LATEX_001` | Error en generación LaTeX | Revisar validación, corregir errores |
| `ERR_IMG_404` | Imagen no encontrada | Verificar ruta en campo RutaArchivo |
| `ERR_REF_BROKEN` | Referencia rota | Verificar que figura/tabla existe |
| `ERR_NETWORK` | Error de conexión | Verificar internet, reintentar |
| `ERR_TIMEOUT` | Tiempo de espera agotado | Documento muy grande, reintentar |

### Apéndice D: Recursos Adicionales

**Documentación oficial:**
- Manual Técnico: Detalles de implementación y arquitectura
- Guía de Estilo: Normas de redacción y formato institucional
- API Reference: Para integraciones personalizadas

**Comunidad:**
- Foro de usuarios: Preguntas y respuestas entre usuarios
- Canal de Slack: Comunicación en tiempo real
- Lista de correo: Anuncios y actualizaciones

**Herramientas externas:**
- Overleaf: https://www.overleaf.com/
- TeXstudio: https://www.texstudio.org/
- MiKTeX: https://miktex.org/
- MacTeX: https://www.tug.org/mactex/

**Aprendizaje de LaTeX:**
- LaTeX Wikibook: https://en.wikibooks.org/wiki/LaTeX
- Overleaf Learn: https://www.overleaf.com/learn
- CTAN (Comprehensive TeX Archive Network): https://www.ctan.org/

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 2.0

**Historial de cambios:**
- v1.0 (Enero 2025): Versión inicial
- v2.0 (Febrero 2025): Expansión completa con navegación, validación, generación y compilación detalladas

**Contacto:**
- Email: soporte.latex@sener.gob.mx
- Teléfono: (55) 5000-6000 ext. 1234
- Sitio web: https://www.gob.mx/sener
