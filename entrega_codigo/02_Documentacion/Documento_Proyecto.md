# Documentación del Proyecto
## Automatización de Plantillas de Instrumentos de Planeación

---

### Marco Normativo Aplicable

El desarrollo de este sistema se rige por los siguientes instrumentos normativos:

#### Normatividad Federal

1. **Ley General de Transparencia y Acceso a la Información Pública**
   - Garantiza el acceso a la información gubernamental
   - Establece principios de máxima publicidad

2. **Ley Federal de Protección de Datos Personales en Posesión de los Particulares**
   - Regula el tratamiento de datos personales
   - Establece principios de seguridad y confidencialidad

3. **Acuerdo por el que se establecen los Lineamientos de la Identidad Visual del Gobierno Federal**
   - Define estándares de identidad institucional
   - Establece uso de colores, tipografías y elementos gráficos oficiales

#### Normatividad Técnica

1. **Norma Oficial Mexicana NOM-151-SCFI-2016**
   - Requisitos de accesibilidad para sitios web
   - Cumplimiento de estándares WCAG 2.0

2. **Estándar PDF/UA (ISO 14289)**
   - Accesibilidad universal en documentos PDF
   - Implementado en la versión PDF/UA-2

3. **Lineamientos Técnicos para Publicación de Datos Abiertos**
   - Formatos estructurados y reutilizables
   - Interoperabilidad de sistemas

#### Normatividad Institucional SENER

1. **Manual de Identidad Institucional SENER 2024-2030**
   - Plantillas oficiales de documentos
   - Uso de tipografía Patria y colores institucionales

2. **Lineamientos de Seguridad de la Información**
   - Protección de datos sensibles
   - Control de acceso basado en roles

### Metodología Utilizada

#### Enfoque de Desarrollo

**Metodología Ágil - Scrum Adaptado**

El proyecto se desarrolló siguiendo principios ágiles con sprints de 2 semanas:

1. **Sprint 0 (Semana 1-2):** Análisis de requisitos y diseño de arquitectura
2. **Sprint 1 (Semana 3-4):** Desarrollo del editor web básico
3. **Sprint 2 (Semana 5-6):** Integración con Google Sheets API
4. **Sprint 3 (Semana 7-8):** Motor de generación LaTeX
5. **Sprint 4 (Semana 9-10):** Sistema de colaboración en tiempo real
6. **Sprint 5 (Semana 11-12):** Pruebas, optimización y documentación

#### Principios de Diseño

1. **Diseño Centrado en el Usuario (UCD)**
   - Entrevistas con usuarios finales (analistas y técnicos)
   - Prototipos iterativos con retroalimentación continua
   - Pruebas de usabilidad en cada sprint

2. **Arquitectura Orientada a Servicios (SOA)**
   - Separación de responsabilidades por capas
   - Servicios independientes y reutilizables
   - Integración mediante APIs REST

3. **Desarrollo Basado en Componentes**
   - Componentes React reutilizables
   - Separación de lógica y presentación
   - Mantenibilidad y escalabilidad

### Flujo Funcional

#### 1. Autenticación y Acceso

```
Usuario → Pantalla de Login → OAuth2 Google → Validación → Dashboard
                            ↓
                    Usuarios Registrados → Acceso Directo
```

**Descripción:**
- El usuario accede al sistema mediante autenticación OAuth2 de Google
- Usuarios registrados pueden usar credenciales institucionales
- Modo demo disponible para pruebas sin autenticación

#### 2. Gestión de Documentos

```
Dashboard → Seleccionar Libro → Ver Documentos → Crear/Editar
                              ↓
                    Crear Nuevo Libro desde Plantilla
```

**Descripción:**
- El usuario selecciona un libro de trabajo (Google Sheet)
- Visualiza lista de documentos existentes
- Puede crear nuevos documentos o editar existentes

#### 3. Edición de Contenido

```
Editor → Metadatos → Secciones → Figuras/Tablas → Bibliografía
         ↓           ↓           ↓                 ↓
    Autoguardado ← Sincronización en Tiempo Real → Google Sheets
```

**Descripción:**
- Editor estructurado por pestañas (Documentos, Secciones, Figuras, Tablas, etc.)
- Autoguardado cada 2 segundos con debouncing
- Sincronización automática con Google Sheets
- Notificaciones en tiempo real de cambios de otros usuarios

#### 4. Generación de LaTeX

```
Editor → Botón "Generar LaTeX" → Apps Script → Procesamiento
                                               ↓
                                    Archivo .tex + .bib
                                               ↓
                                    Google Drive (Carpeta Salida)
```

**Descripción:**
- El usuario solicita generación del documento LaTeX
- Google Apps Script procesa los datos estructurados
- Genera archivos .tex (documento) y .bib (bibliografía)
- Almacena en carpeta específica de Google Drive

#### 5. Colaboración en Tiempo Real

```
Usuario A → Edita Celda → Socket.IO Server → Notificación → Usuario B
                                           ↓
                              Actualización Automática en Pantalla
```

**Descripción:**
- Múltiples usuarios pueden editar simultáneamente
- Sistema de notificaciones en tiempo real
- Indicadores visuales de usuarios activos
- Prevención de conflictos de edición

### Diagrama Lógico

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPA DE USUARIO                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │    Editor    │  │  Generador   │         │
│  │  Documentos  │→ │  Contenido   │→ │    LaTeX     │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                      CAPA DE SERVICIOS                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Sheets     │  │   Socket.IO  │  │    OAuth2    │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA DE PROCESAMIENTO                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │         Google Apps Script (Motor LaTeX)         │          │
│  │  • Parseo de datos estructurados                 │          │
│  │  • Generación de comandos LaTeX                  │          │
│  │  • Procesamiento de figuras y tablas             │          │
│  │  • Gestión de bibliografía                       │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────────┐
│                   CAPA DE ALMACENAMIENTO                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Google       │  │ Google       │  │  LocalStorage│         │
│  │ Sheets       │  │ Drive        │  │  (Sesiones)  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Modelo Conceptual

#### Entidades Principales

**1. Documento**
- Representa un documento institucional completo
- Atributos: ID, Título, Subtítulo, Autor, Fecha, Institución, Versión
- Relaciones: 1:N con Secciones, Figuras, Tablas, Referencias

**2. Sección**
- Unidad de contenido dentro de un documento
- Atributos: Orden, Nivel (Sección/Subsección), Título, Contenido
- Relaciones: N:1 con Documento, 1:N con Figuras/Tablas

**3. Figura**
- Elemento gráfico (imagen, diagrama, gráfico)
- Atributos: ID, Ruta, Caption, Fuente, Texto Alternativo, Ancho
- Relaciones: N:1 con Documento

**4. Tabla**
- Datos tabulares estructurados
- Atributos: ID, Título, Datos CSV, Fuente
- Relaciones: N:1 con Documento

**5. Referencia Bibliográfica**
- Cita bibliográfica en formato BibTeX
- Atributos: Clave, Tipo, Autor, Título, Año, Editorial, URL
- Relaciones: N:1 con Documento

#### Diagrama Entidad-Relación

```
┌──────────────┐
│  DOCUMENTO   │
│──────────────│
│ ID (PK)      │
│ Titulo       │
│ Subtitulo    │
│ Autor        │
│ Fecha        │
│ Version      │
└──────┬───────┘
       │ 1
       │
       │ N
┌──────┴───────┐     ┌──────────────┐     ┌──────────────┐
│   SECCION    │     │    FIGURA    │     │    TABLA     │
│──────────────│     │──────────────│     │──────────────│
│ DocumentoID  │     │ DocumentoID  │     │ DocumentoID  │
│ Orden        │     │ ID           │     │ ID           │
│ Nivel        │     │ RutaArchivo  │     │ Titulo       │
│ Titulo       │     │ Caption      │     │ DatosCSV     │
│ Contenido    │     │ Fuente       │     │ Fuente       │
└──────────────┘     └──────────────┘     └──────────────┘

       │ N                                        │ N
       │                                          │
       │ 1                                        │ 1
┌──────┴───────────────────────────────────────┴─────┐
│              REFERENCIA BIBLIOGRAFICA               │
│─────────────────────────────────────────────────────│
│ DocumentoID                                         │
│ Clave                                               │
│ Tipo (article, book, inproceedings, etc.)          │
│ Autor                                               │
│ Titulo                                              │
│ Año                                                 │
│ Editorial                                           │
│ URL                                                 │
└─────────────────────────────────────────────────────┘
```

### Tecnologías Clave

| Componente | Tecnología | Justificación |
|------------|------------|---------------|
| Frontend | React 18 + TypeScript | Framework moderno, tipado estático, ecosistema robusto |
| Estilos | TailwindCSS | Desarrollo rápido, consistencia visual, responsive |
| Build Tool | Vite | Velocidad de desarrollo, HMR instantáneo |
| Backend | Google Apps Script | Integración nativa con Google Workspace |
| Base de Datos | Google Sheets | Familiaridad de usuarios, colaboración nativa |
| Almacenamiento | Google Drive | Integración con ecosistema Google, control de acceso |
| Autenticación | OAuth2 (Google) | Estándar de seguridad, SSO institucional |
| Tiempo Real | Socket.IO | Comunicación bidireccional, escalable |

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 1.0
