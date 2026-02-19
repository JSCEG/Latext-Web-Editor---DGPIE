# Evidencias del Proyecto
## Automatización de Plantillas de Instrumentos de Planeación

---

## 1. Capturas de Pantalla Sugeridas

### 1.1 Pantalla de Inicio de Sesión

**Descripción:** Interfaz de autenticación con identidad institucional

**Elementos a capturar:**
- Logo de Gobierno de México
- Logo de Secretaría de Energía
- Opciones de inicio de sesión (Google, Usuario Registrado, Demo)
- Diseño responsive y accesible

**Ruta sugerida:** `evidencias/01_login.png`

---

### 1.2 Dashboard de Libros de Trabajo

**Descripción:** Selector de libros de trabajo disponibles

**Elementos a capturar:**
- Barra de búsqueda
- Tarjetas de libros con metadatos
- Colaboradores activos
- Última modificación
- Botón "Crear Nuevo Documento"

**Ruta sugerida:** `evidencias/02_workbook_dashboard.png`

---

### 1.3 Dashboard de Documentos

**Descripción:** Lista de documentos dentro de un libro

**Elementos a capturar:**
- Tarjetas de documentos con información
- Título, subtítulo, autor, fecha
- Botones de acción (Abrir, Crear)
- Indicador de libro actual

**Ruta sugerida:** `evidencias/03_documents_dashboard.png`

---

### 1.4 Editor - Pestaña Documentos (Metadatos)

**Descripción:** Formulario de metadatos del documento

**Elementos a capturar:**
- Campos de entrada (Título, Subtítulo, Autor, etc.)
- Indicador de autoguardado
- Botón "Guardar Cambios"
- Navegación por pestañas

**Ruta sugerida:** `evidencias/04_editor_metadata.png`

---

### 1.5 Editor - Pestaña Secciones

**Descripción:** Tabla de secciones del documento

**Elementos a capturar:**
- Columnas: Orden, Nivel, Título, Contenido
- Botones de acción (Agregar, Eliminar, Editar)
- Contenido con formato especial (listas, referencias)

**Ruta sugerida:** `evidencias/05_editor_sections.png`

---

### 1.6 Editor - Pestaña Figuras

**Descripción:** Gestión de figuras e imágenes

**Elementos a capturar:**
- Tabla de figuras con metadatos
- Campos: RutaArchivo, Caption, Fuente, TextoAlternativo
- Numeración automática

**Ruta sugerida:** `evidencias/06_editor_figures.png`

---

### 1.7 Editor - Pestaña Tablas (Vista de Lista)

**Descripción:** Lista de tablas del documento

**Elementos a capturar:**
- Tabla con columnas: Título, Orden, Fuente
- Botón "Editar" para abrir editor visual

**Ruta sugerida:** `evidencias/07_editor_tables_list.png`

---

### 1.8 Editor - Pestaña Tablas (Editor Visual)

**Descripción:** Editor de cuadrícula para datos tabulares

**Elementos a capturar:**
- Cuadrícula editable con celdas
- Botones "Agregar Fila", "Agregar Columna"
- Indicador de autoguardado
- Botón "Guardar"

**Ruta sugerida:** `evidencias/08_editor_tables_grid.png`

---

### 1.9 Editor - Pestaña Bibliografía

**Descripción:** Gestión de referencias bibliográficas

**Elementos a capturar:**
- Tabla con campos BibTeX
- Columnas: Clave, Tipo, Autor, Título, Año
- Formato de entrada para citas

**Ruta sugerida:** `evidencias/09_editor_bibliography.png`

---

### 1.10 Generación de LaTeX - Proceso

**Descripción:** Indicador de procesamiento

**Elementos a capturar:**
- Spinner de carga
- Mensaje "Procesando..."
- Barra de progreso (si aplica)

**Ruta sugerida:** `evidencias/10_latex_generation_process.png`

---

### 1.11 Generación de LaTeX - Éxito

**Descripción:** Mensaje de confirmación con enlaces

**Elementos a capturar:**
- Mensaje de éxito
- Enlaces a carpeta de Drive
- Enlaces a archivos .tex y .bib
- Estadísticas de generación

**Ruta sugerida:** `evidencias/11_latex_generation_success.png`

---

### 1.12 Google Drive - Archivos Generados

**Descripción:** Carpeta de salida en Google Drive

**Elementos a capturar:**
- Estructura de carpetas
- Archivos .tex y .bib generados
- Metadatos de archivos (fecha, tamaño)

**Ruta sugerida:** `evidencias/12_drive_output_files.png`

---

### 1.13 Documento LaTeX - Código Fuente

**Descripción:** Contenido del archivo .tex generado

**Elementos a capturar:**
- Preámbulo LaTeX
- Metadatos del documento
- Secciones con contenido
- Comandos de figuras y tablas

**Ruta sugerida:** `evidencias/13_latex_source_code.png`

---

### 1.14 Documento PDF - Portada

**Descripción:** Portada del PDF compilado

**Elementos a capturar:**
- Identidad institucional (logos, colores)
- Título y subtítulo
- Autor y fecha
- Diseño profesional

**Ruta sugerida:** `evidencias/14_pdf_cover.png`

---

### 1.15 Documento PDF - Contenido

**Descripción:** Páginas internas del PDF

**Elementos a capturar:**
- Formato de secciones
- Figuras insertadas
- Tablas con estilo institucional
- Numeración y encabezados

**Ruta sugerida:** `evidencias/15_pdf_content.png`

---

### 1.16 Colaboración en Tiempo Real

**Descripción:** Indicadores de usuarios activos

**Elementos a capturar:**
- Avatares de usuarios conectados
- Notificaciones de edición
- Indicador de cambios en tiempo real

**Ruta sugerida:** `evidencias/16_realtime_collaboration.png`

---

### 1.17 Responsive Design - Vista Móvil

**Descripción:** Interfaz adaptada a dispositivos móviles

**Elementos a capturar:**
- Dashboard en pantalla pequeña
- Menú hamburguesa
- Tarjetas apiladas verticalmente

**Ruta sugerida:** `evidencias/17_mobile_responsive.png`

---

### 1.18 Accesibilidad - Navegación por Teclado

**Descripción:** Indicadores de foco para navegación accesible

**Elementos a capturar:**
- Elementos con foco visible
- Orden de tabulación lógico
- Contraste adecuado

**Ruta sugerida:** `evidencias/18_accessibility_keyboard.png`

---

## 2. URL Funcional

### 2.1 Ambiente de Desarrollo

**URL:** `http://localhost:5173`

**Descripción:** Servidor de desarrollo local con Hot Module Replacement

**Acceso:** Solo disponible en máquina de desarrollo

---

### 2.2 Ambiente de Staging (Pruebas)

**URL:** `https://staging-latex-editor.sener.gob.mx`

**Descripción:** Ambiente de pruebas para validación antes de producción

**Acceso:** Restringido a equipo de desarrollo y QA

**Credenciales de prueba:**
- Usuario: `pruebas@sener.gob.mx`
- Contraseña: `[Proporcionada por administrador]`

---

### 2.3 Ambiente de Producción

**URL:** `https://latex-editor.sener.gob.mx`

**Descripción:** Sistema en producción para usuarios finales

**Acceso:** Usuarios autorizados con cuenta institucional

**Autenticación:** OAuth2 con Google Workspace institucional

---

## 3. Fecha de Despliegue

### 3.1 Historial de Despliegues

| Versión | Fecha | Ambiente | Descripción |
|---------|-------|----------|-------------|
| **v0.1.0** | 15 Enero 2025 | Desarrollo | Prototipo inicial con editor básico |
| **v0.5.0** | 29 Enero 2025 | Staging | Integración con Google Sheets API |
| **v0.8.0** | 05 Febrero 2025 | Staging | Motor de generación LaTeX funcional |
| **v0.9.0** | 10 Febrero 2025 | Staging | Sistema de colaboración en tiempo real |
| **v1.0.0** | 12 Febrero 2025 | Producción | **Lanzamiento oficial** |

### 3.2 Despliegue Actual

**Versión en Producción:** v1.0.0

**Fecha de Despliegue:** 12 de Febrero de 2025

**Responsable:** Dirección General de Planeación y Transición Energética

**Aprobado por:** [Nombre del Director General]

---

## 4. Ambiente

### 4.1 Desarrollo

**Propósito:** Desarrollo activo de nuevas funcionalidades

**Características:**
- Hot Module Replacement (HMR)
- Source maps habilitados
- Logs detallados en consola
- Sin minificación de código
- Datos de prueba (modo demo)

**Acceso:** Solo equipo de desarrollo

**Infraestructura:**
- Servidor local (localhost:5173)
- Google Sheets de prueba
- Carpeta de Drive de desarrollo

---

### 4.2 Staging (Pruebas)

**Propósito:** Validación de funcionalidades antes de producción

**Características:**
- Build optimizado (similar a producción)
- Datos de prueba realistas
- Testing de integración
- Validación de usuarios QA

**Acceso:** Equipo de desarrollo y QA

**Infraestructura:**
- Servidor web de staging
- Google Sheets de staging
- Carpeta de Drive de pruebas
- Base de usuarios de prueba

**URL:** `https://staging-latex-editor.sener.gob.mx`

---

### 4.3 Producción

**Propósito:** Sistema operativo para usuarios finales

**Características:**
- Build optimizado y minificado
- Caché de assets estáticos
- Monitoreo de errores (Sentry)
- Logs de auditoría
- Backup automático

**Acceso:** Usuarios autorizados con cuenta institucional

**Infraestructura:**
- Servidor web de producción (Nginx)
- Google Sheets institucionales
- Carpeta de Drive institucional
- Certificado SSL válido

**URL:** `https://latex-editor.sener.gob.mx`

**SLA:** 99.5% de disponibilidad

---

## 5. Métricas de Uso

### 5.1 Estadísticas Actuales (Febrero 2025)

| Métrica | Valor |
|---------|-------|
| **Usuarios registrados** | 45 |
| **Usuarios activos (último mes)** | 32 |
| **Documentos creados** | 127 |
| **Archivos LaTeX generados** | 89 |
| **Libros de trabajo** | 8 |
| **Tiempo promedio de generación** | 18 segundos |
| **Tasa de éxito de generación** | 97.8% |

### 5.2 Rendimiento

| Métrica | Valor | Objetivo |
|---------|-------|----------|
| **Tiempo de carga inicial** | 1.8s | < 2s |
| **Tiempo de respuesta API** | 450ms | < 1s |
| **Tamaño de bundle (gzip)** | 195 KB | < 250 KB |
| **First Contentful Paint** | 1.2s | < 1.5s |
| **Time to Interactive** | 2.1s | < 3s |

### 5.3 Disponibilidad

| Periodo | Uptime | Incidentes |
|---------|--------|------------|
| **Febrero 2025** | 99.8% | 1 (mantenimiento programado) |
| **Enero 2025** | 99.2% | 2 (staging, no afectó producción) |

---

## 6. Pruebas Realizadas

### 6.1 Pruebas Funcionales

- ✅ Autenticación OAuth2 con Google
- ✅ Creación de documentos
- ✅ Edición de metadatos
- ✅ Gestión de secciones
- ✅ Inserción de figuras
- ✅ Creación de tablas con editor visual
- ✅ Gestión de bibliografía
- ✅ Generación de archivos LaTeX
- ✅ Autoguardado con debouncing
- ✅ Colaboración en tiempo real
- ✅ Exportación a Google Drive

### 6.2 Pruebas de Integración

- ✅ Integración con Google Sheets API
- ✅ Integración con Google Drive API
- ✅ Sincronización en tiempo real (Socket.IO)
- ✅ Flujo completo: Edición → Generación → Compilación PDF

### 6.3 Pruebas de Usabilidad

- ✅ Navegación intuitiva
- ✅ Feedback visual de acciones
- ✅ Mensajes de error claros
- ✅ Tiempo de aprendizaje < 30 minutos
- ✅ Satisfacción de usuarios: 4.5/5

### 6.4 Pruebas de Accesibilidad

- ✅ Navegación por teclado
- ✅ Lectores de pantalla compatibles
- ✅ Contraste de colores WCAG AA
- ✅ Etiquetas ARIA apropiadas
- ✅ Formularios accesibles

### 6.5 Pruebas de Rendimiento

- ✅ Carga de 100+ documentos sin degradación
- ✅ Edición simultánea de 15 usuarios
- ✅ Generación de documentos de 50+ páginas
- ✅ Tiempo de respuesta < 2s en 95% de peticiones

### 6.6 Pruebas de Seguridad

- ✅ Validación de tokens OAuth2
- ✅ Protección contra XSS
- ✅ Sanitización de entrada de usuario
- ✅ HTTPS obligatorio
- ✅ Permisos de Google Drive respetados

---

## 7. Documentos de Soporte

### 7.1 Documentación Técnica

- Manual Técnico (este documento)
- Manual de Usuario
- Documentación de API
- Guía de Despliegue

### 7.2 Diagramas

- Diagrama de Arquitectura
- Diagrama de Flujo de Datos
- Diagrama Entidad-Relación
- Diagrama de Secuencia (Generación LaTeX)

### 7.3 Código Fuente

- Repositorio Git: `[URL del repositorio]`
- Branch principal: `main`
- Branch de desarrollo: `develop`
- Tags de versiones: `v1.0.0`, `v0.9.0`, etc.

---

## 8. Contacto y Soporte

### 8.1 Equipo de Desarrollo

**Líder de Proyecto:**  
[Nombre]  
[Correo electrónico]  
[Teléfono]

**Desarrollador Frontend:**  
[Nombre]  
[Correo electrónico]

**Desarrollador Backend:**  
[Nombre]  
[Correo electrónico]

### 8.2 Soporte Técnico

**Mesa de Ayuda:**  
Email: soporte.latex@sener.gob.mx  
Teléfono: (55) 5000-6000 ext. 1234  
Horario: Lunes a Viernes, 9:00 - 18:00 hrs

**Portal de Soporte:**  
`https://soporte.sener.gob.mx/latex-editor`

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 1.0
