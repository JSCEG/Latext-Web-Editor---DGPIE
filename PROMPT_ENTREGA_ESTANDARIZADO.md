# 📋 PROMPT ESTANDARIZADO PARA ENTREGAS INSTITUCIONALES
## Dirección General de Planeación y Transición Energética - SENER

---

## 🎯 INSTRUCCIONES DE USO

1. **Copia el prompt completo** de la sección "PROMPT PARA KIRO" (abajo)
2. **Modifica solo la sección "INFORMACIÓN DEL PROYECTO"** con los datos de tu proyecto específico
3. **Pega el prompt en Kiro** y ejecuta
4. **Revisa la documentación generada** antes de entregarla
5. **Ajusta detalles específicos** si es necesario

---

## 📝 PROMPT PARA KIRO

```
Genera una estructura de carpetas profesional para entrega formal de proyecto institucional de la Dirección General, lista para subida a Google Drive.

INFORMACIÓN DEL PROYECTO:
- Nombre: [NOMBRE DEL PROYECTO]
- Descripción breve: [DESCRIPCIÓN EN 1-2 LÍNEAS]
- Tecnologías principales: [LISTA DE TECNOLOGÍAS]
- Estado actual: [Desarrollo/Staging/Producción]
- Fecha de entrega: [FECHA]

ESTRUCTURA REQUERIDA:
📁 entrega_codigo/
  ├── 00_Resumen_Ejecutivo/
  ├── 01_Codigo_Fuente/
  ├── 02_Documentacion/
  ├── 03_Manual_Usuario/
  ├── 04_Manual_Tecnico/
  ├── 05_Stack_Tecnologico/
  ├── 06_Evidencias/
  ├── 07_Cierre_Proyecto/
  └── README.md

CONTENIDO DE CADA CARPETA:

00_Resumen_Ejecutivo/Resumen_Ejecutivo.md:
- Contexto institucional
- Objetivo del proyecto
- Problema que resuelve
- Alcance
- Impacto institucional
- Estatus actual y % de avance
- Próximos pasos

01_Codigo_Fuente/README_Codigo.md:
- Arquitectura general del sistema
- Estructura del repositorio
- Cómo ejecutar el proyecto (instalación paso a paso)
- Dependencias técnicas (tabla con versiones)
- Requisitos mínimos (servidor y cliente)
- Control de versiones (Git, estrategia de branching)
- Scripts disponibles

02_Documentacion/Documento_Proyecto.md:
- Marco normativo aplicable (leyes, normas, lineamientos)
- Metodología utilizada (Ágil, Scrum, etc.)
- Flujo funcional (diagramas de flujo)
- Diagrama lógico (arquitectura en capas)
- Modelo conceptual (entidades y relaciones)

03_Manual_Usuario/Manual_Usuario.md:
- Acceso al sistema (login, requisitos)
- Funcionalidades principales (paso a paso con capturas sugeridas)
- Cómo interpretar resultados
- Exportaciones disponibles
- Preguntas frecuentes (FAQ)

04_Manual_Tecnico/Manual_Tecnico.md:
- Arquitectura técnica detallada
- Modelo de datos (tablas, campos, relaciones)
- Scripts SQL o equivalentes
- Integraciones externas (APIs, servicios)
- Seguridad y control de accesos
- Recomendaciones de mantenimiento

05_Stack_Tecnologico/Stack_Tecnologico.md:
- Backend (tecnologías, versiones)
- Frontend (framework, librerías)
- Base de datos (tipo, versión)
- Infraestructura (hosting, servidor)
- Librerías principales
- Versiones utilizadas (tabla completa)
- Justificación técnica de cada elección

06_Evidencias/Evidencias.md:
- Capturas de pantalla sugeridas (lista de 15-20 escenarios)
- URL funcional (desarrollo, staging, producción)
- Fecha de despliegue
- Ambiente (Desarrollo/Staging/Producción)
- Métricas de uso
- Pruebas realizadas

07_Cierre_Proyecto/Acta_Cierre.md:
- Resultados obtenidos
- Indicadores logrados (tablas con metas vs logrado)
- Lecciones aprendidas (positivas y desafíos)
- Riesgos identificados
- Recomendaciones futuras (corto, mediano, largo plazo)
- Estado final del proyecto
- Sección de firmas y aprobaciones

README.md (raíz):
- Índice de contenido
- Descripción de cada carpeta
- Información general del proyecto
- Indicadores clave
- Stack tecnológico resumido
- Contacto y soporte
- Notas importantes

REQUISITOS DE FORMATO:
✅ Todos los documentos en formato Markdown (.md)
✅ Tono institucional formal para Secretaría
✅ Redacción en español con terminología técnica apropiada
✅ Incluir tablas, diagramas y listas donde sea apropiado
✅ Usar emojis institucionales (📁📄✅🔄⚠️) para mejor legibilidad
✅ Incluir secciones de "Elaborado por" y "Fecha" al final de cada documento
✅ Numeración y estructura consistente en todos los documentos

INSTRUCCIONES ADICIONALES:
1. Analiza el código del proyecto antes de generar la documentación
2. Extrae información real del proyecto (tecnologías, arquitectura, funcionalidades)
3. Genera contenido específico, no genérico
4. Incluye diagramas en formato texto (ASCII art o Markdown)
5. Crea tablas comparativas donde sea relevante
6. Sugiere mejoras y próximos pasos realistas

SALIDA ESPERADA:
- Crear toda la estructura de carpetas
- Generar todos los archivos .md con contenido completo
- Contenido mínimo de 30-50 líneas por documento
- Documentos listos para revisión y entrega formal
```

---

## 📚 EJEMPLOS DE USO

### Ejemplo 1: Sistema de Gestión de Indicadores

```
INFORMACIÓN DEL PROYECTO:
- Nombre: Sistema de Gestión de Indicadores Energéticos
- Descripción breve: Dashboard interactivo para visualización y análisis de indicadores del sector energético nacional
- Tecnologías principales: Python, Django, PostgreSQL, React, D3.js
- Estado actual: Staging (80% completado)
- Fecha de entrega: Marzo 2025
```

### Ejemplo 2: Portal de Transparencia

```
INFORMACIÓN DEL PROYECTO:
- Nombre: Portal de Transparencia y Datos Abiertos SENER
- Descripción breve: Plataforma web para publicación de datos abiertos y cumplimiento de obligaciones de transparencia
- Tecnologías principales: Node.js, Express, MongoDB, Vue.js, CKAN
- Estado actual: Producción (100% completado)
- Fecha de entrega: Febrero 2025
```

### Ejemplo 3: API de Integración

```
INFORMACIÓN DEL PROYECTO:
- Nombre: API REST de Integración Interinstitucional
- Descripción breve: API para intercambio de información entre sistemas de SENER y otras dependencias
- Tecnologías principales: FastAPI, Python, Redis, Docker, Kubernetes
- Estado actual: Desarrollo (60% completado)
- Fecha de entrega: Abril 2025
```

---

## 🔧 VARIACIONES Y PERSONALIZACIONES

### Agregar Sección de Capacitación

Si tu proyecto requiere documentación de capacitación:

```
ESTRUCTURA REQUERIDA:
📁 entrega_codigo/
  ├── 00_Resumen_Ejecutivo/
  ├── 01_Codigo_Fuente/
  ├── 02_Documentacion/
  ├── 03_Manual_Usuario/
  ├── 04_Manual_Tecnico/
  ├── 05_Stack_Tecnologico/
  ├── 06_Evidencias/
  ├── 07_Cierre_Proyecto/
  ├── 08_Capacitacion/          # ← NUEVA SECCIÓN
  │   └── Plan_Capacitacion.md
  └── README.md

08_Capacitacion/Plan_Capacitacion.md:
- Objetivos de capacitación
- Público objetivo
- Temario y contenidos
- Duración y modalidad
- Materiales de apoyo
- Evaluación y certificación
```

### Agregar Sección de Pruebas

Si necesitas documentar pruebas exhaustivas:

```
ESTRUCTURA REQUERIDA:
📁 entrega_codigo/
  ├── 00_Resumen_Ejecutivo/
  ├── 01_Codigo_Fuente/
  ├── 02_Documentacion/
  ├── 03_Manual_Usuario/
  ├── 04_Manual_Tecnico/
  ├── 05_Stack_Tecnologico/
  ├── 06_Evidencias/
  ├── 07_Pruebas/               # ← NUEVA SECCIÓN
  │   └── Plan_Pruebas.md
  ├── 08_Cierre_Proyecto/
  └── README.md

07_Pruebas/Plan_Pruebas.md:
- Estrategia de pruebas
- Casos de prueba (funcionales, integración, rendimiento)
- Resultados de pruebas
- Bugs identificados y resueltos
- Cobertura de código
- Pruebas de seguridad
```

### Agregar Sección de Migración

Para proyectos que reemplazan sistemas existentes:

```
ESTRUCTURA REQUERIDA:
📁 entrega_codigo/
  ├── 00_Resumen_Ejecutivo/
  ├── 01_Codigo_Fuente/
  ├── 02_Documentacion/
  ├── 03_Manual_Usuario/
  ├── 04_Manual_Tecnico/
  ├── 05_Stack_Tecnologico/
  ├── 06_Evidencias/
  ├── 07_Plan_Migracion/        # ← NUEVA SECCIÓN
  │   └── Plan_Migracion.md
  ├── 08_Cierre_Proyecto/
  └── README.md

07_Plan_Migracion/Plan_Migracion.md:
- Análisis del sistema actual
- Estrategia de migración
- Plan de migración de datos
- Cronograma de migración
- Riesgos y mitigaciones
- Plan de rollback
- Validación post-migración
```

---

## 📊 CHECKLIST DE CALIDAD

Antes de entregar, verifica:

- [ ] Todos los archivos .md están creados
- [ ] No hay información genérica o placeholder sin completar
- [ ] Las tablas tienen datos reales del proyecto
- [ ] Los diagramas son claros y legibles
- [ ] El tono es institucional y formal
- [ ] No hay errores ortográficos o gramaticales
- [ ] Las URLs y rutas son correctas
- [ ] Los nombres de tecnologías y versiones son precisos
- [ ] Las capturas de pantalla están sugeridas con descripción
- [ ] El README.md principal es claro y completo
- [ ] Todos los documentos tienen pie de página institucional
- [ ] Las fechas son correctas
- [ ] Los indicadores y métricas son realistas

---

## 🎨 PLANTILLA DE INFORMACIÓN DEL PROYECTO

Copia y completa esta plantilla antes de usar el prompt:

```
INFORMACIÓN DEL PROYECTO:
- Nombre: _________________________________
- Descripción breve: _________________________________
  _________________________________
- Tecnologías principales: _________________________________
- Estado actual: [ ] Desarrollo [ ] Staging [ ] Producción
- % de avance: _____% 
- Fecha de entrega: _________________________________

DATOS ADICIONALES (opcional):
- Usuarios objetivo: _________________________________
- Presupuesto: $_________________________________
- Equipo: _____ personas
- Duración: _____ meses
- URL (si aplica): _________________________________
```

---

## 💡 TIPS Y MEJORES PRÁCTICAS

1. **Revisa el código primero**: Antes de ejecutar el prompt, asegúrate de que Kiro tenga acceso al código del proyecto para análisis preciso.

2. **Sé específico**: Mientras más detalles proporciones en "INFORMACIÓN DEL PROYECTO", mejor será la documentación generada.

3. **Revisa y ajusta**: La documentación generada es una base sólida, pero siempre revisa y ajusta detalles específicos de tu proyecto.

4. **Actualiza versiones**: Verifica que las versiones de tecnologías sean las correctas y actuales.

5. **Agrega capturas reales**: Las capturas de pantalla sugeridas deben ser tomadas del sistema real y agregadas a la carpeta de evidencias.

6. **Valida URLs**: Asegúrate de que todas las URLs (staging, producción) sean correctas y accesibles.

7. **Personaliza firmas**: Completa la sección de firmas en el Acta de Cierre con nombres reales.

8. **Guarda el prompt**: Mantén este archivo en tu repositorio para futuras entregas.

---

## 📞 SOPORTE

Si tienes dudas sobre el uso de este prompt:

**Contacto:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Email:** [tu-email]@sener.gob.mx  
**Extensión:** [tu-extensión]

---

## 📅 HISTORIAL DE VERSIONES

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | 12 Feb 2025 | Versión inicial del prompt estandarizado |

---

**Elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de creación:** Febrero 2025  
**Última actualización:** 12 de Febrero de 2025
