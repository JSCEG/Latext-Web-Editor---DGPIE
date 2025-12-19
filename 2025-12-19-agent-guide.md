# Guia rapida del proyecto (2025-12-19)

## Stack y configuracion
- Frontend: React 19 + Vite + TypeScript; estilos con Tailwind (config basica).
- Alias `@` apunta al root del repo; importmap en `index.html` para carga via CDN en modo navegador.
- Auth Google: `GoogleOAuthProvider` usa `VITE_GOOGLE_CLIENT_ID`; scopes en `config.ts`.
- API base: `API_URL` (localhost:3003 en dev, render en prod); sockets via `socket.io-client` al mismo host.

## Flujos principales
- App (`App.tsx`):
  - Autenticacion por token (manual) o Google login; token se guarda en `localStorage` (`sheet_token`).
  - Seleccion de spreadsheet desde lista fija (`AVAILABLE_SPREADSHEETS`) o DEMO.
  - Vista `DASHBOARD`: lista documentos (hoja "Documentos"), abre Editor; permite crear documento (append row) y abrir ID externo.
  - Vista `EDITOR`: `SheetEditor` con tabs para Metadatos, Secciones, Tablas, Figuras, Bibliografia, Siglas, Glosario.
- Editor (`components/SheetEditor.tsx`):
  - CRUD sobre Google Sheets: update celdas/rangos, insertar filas/columnas, crear pestañas.
  - Validacion de etiquetas personalizadas `[[tag:...]]` via `tagEngine.ts` + panel `LintPanel`.
  - Widgets: wizard de tablas, previsualizacion de figuras/tablas, modal de ecuaciones y notas.
  - Colaboracion: reporta acciones y escucha `data_update` via sockets; `UserActivityTracker` muestra usuarios conectados.

## Servicios
- `services/sheetsService.ts`: cliente Google Sheets (fetch spreadsheet, append/update/delete, insert dimension, create tab, fetch/update values). Modo DEMO con datos mock.
- `services/geminiService.ts`: llamadas a Gemini (`@google/genai`) para generar datos de tabla o analizar seleccion (requiere `GEMINI_API_KEY`).
- `services/socketService.ts`: wrapper de Socket.IO; eventos `join_app`, `enter_document`, `leave_document`, `user_action`, `data_update`.

## Backend (carpeta server)
- `server/index.js`: Express + Socket.IO; endpoint POST `/generate-latext` llama a `latexGenerator.js` y expone presencia en tiempo real.
- `server/latexGenerator.js`: porta la logica de Apps Script para construir `.tex` y `.bib` a partir de las hojas (Documentos, Secciones, Tablas, Figuras, Bibliografia, Siglas, Glosario).

## Otros artefactos
- `tagEngine.ts`: aplica/inserta tags y lint (errores/avisos) para contenido.
- `utils/idUtils.ts`: genera IDs de figuras/tablas (`FIG-`, `TBL-`); test `npm run test:ids`.
- `scripts/generate_excel.js`: genera plantilla Excel base (Documentos Principales, Metadatos).
- `google_apps_script_FINAL.js`: version Apps Script original del generador.
- Plantilla LaTeX `sener2025.cls` y demo `DEMO_SENER_SASSO.tex`.

## Notas rapidas para agentes
- Tokens invalidos devuelven 401 y disparan logout automatico en `handleError`.
- Modo DEMO: token `DEMO` evita llamadas reales y usa datos mock.
- Importante mantener nombres de hojas esperados (Documentos, Secciones, Tablas, Figuras, Bibliografia, Siglas, Glosario) para que el editor detecte columnas y relaciones.
