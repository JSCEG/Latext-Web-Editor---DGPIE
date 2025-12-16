# Sistema de Referencias de Tablas y Figuras

## Metadatos requeridos

- Tablas: `DocumentoID`, `ID_Seccion` o `SeccionOrden`, `Orden` (número), `Título`, `Datos CSV` (rango), `Fuente`, `Version` (opcional).
- Figuras: `DocumentoID`, `SeccionOrden` o `ID_Seccion`, `Fig.` o `OrdenFigura`, `Título/Descripción`, `Ruta de Imagen`, `Fuente`, `Version` (opcional).

## Identificadores únicos

- Regla: `TBL-<SeccionOrden>-<Orden>` para tablas, `FIG-<SeccionOrden>-<Orden>` para figuras.
- Si no existe `SeccionOrden`, se usa `TBL-<Orden>` / `FIG-<Orden>`.
- Los IDs se usan en etiquetas LaTeX: `\label{tab:TBL-...}` y `\label{fig:FIG-...}`.

## Inserción en contenido

- En el editor, inserta `[[tabla:TBL-...]]` o `[[figura:FIG-...]]`.
- Apps Script genera `\hyperref[tab:TBL-...]` y `\hyperref[fig:FIG-...]` mostrando: `Tabla/ Figura <ID> — <Título>`.

## Validación

- Apps Script verifica referencias; muestra advertencias si el ID no existe.
- El editor valida en vivo y bloquea guardar si hay errores de formato.

## Índices dinámicos

- `\listafiguras` y `\listatablas` se generan a partir de labels; se incluyen IDs en captions.

## Versionado

- Campo `Version` opcional en Tablas/Figuras; no altera el `\label`.
- Se recomienda incluir `Version` en los metadatos y mostrarlo en el título/caption cuando aplique.

## API y sincronización

- Frontend filtra elementos por `DocumentoID` y por sección activa.
- Preview: Figuras muestran miniatura desde `Ruta de Imagen`; Tablas muestran primeras celdas del rango `Datos CSV`.

## Migración de contenido existente

- Si no existen columnas de ID, el sistema genera IDs en tiempo de ejecución basados en `SeccionOrden` y `Orden`.
- Para proyectos grandes, se recomienda crear columnas `ID` y `Version` y rellenarlas progresivamente.
