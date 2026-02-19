# Manual Técnico
## Automatización de Plantillas de Instrumentos de Planeación

---

## 1. Arquitectura Técnica

### 1.1 Visión General

El sistema implementa una arquitectura de tres capas con separación clara de responsabilidades:

```
┌─────────────────────────────────────────────────────────┐
│  CAPA DE PRESENTACIÓN (Frontend)                        │
│  • React 18 + TypeScript                                │
│  • TailwindCSS para estilos                             │
│  • Vite como build tool                                 │
└─────────────────────────────────────────────────────────┘
                         ↕ HTTPS/WSS
┌─────────────────────────────────────────────────────────┐
│  CAPA DE SERVICIOS (APIs)                               │
│  • Google Sheets API v4                                 │
│  • Google Drive API v3                                  │
│  • Socket.IO Server (Colaboración)                      │
│  • OAuth2 (Autenticación)                               │
└─────────────────────────────────────────────────────────┘
                         ↕ API REST
┌─────────────────────────────────────────────────────────┐
│  CAPA DE PROCESAMIENTO (Backend)                        │
│  • Google Apps Script (Motor LaTeX)                     │
│  • Procesamiento de datos estructurados                 │
│  • Generación de archivos .tex y .bib                   │
└─────────────────────────────────────────────────────────┘
                         ↕
┌─────────────────────────────────────────────────────────┐
│  CAPA DE ALMACENAMIENTO                                 │
│  • Google Sheets (Base de datos)                        │
│  • Google Drive (Archivos)                              │
│  • LocalStorage (Sesiones)                              │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Componentes Principales

#### Frontend (React)

**Componentes clave:**
- `App.tsx`: Componente raíz, gestión de autenticación y rutas
- `Dashboard.tsx`: Lista de documentos disponibles
- `WorkbookDashboard.tsx`: Selector de libros de trabajo
- `SheetEditor.tsx`: Editor principal con pestañas
- `GraphicsEditor.tsx`: Editor de figuras
- `TableStyleEditor.tsx`: Editor de tablas con cuadrícula
- `UserActivityTracker.tsx`: Rastreador de actividad en tiempo real

**Servicios:**
- `sheetsService.ts`: Comunicación con Google Sheets API
- `socketService.ts`: WebSockets para colaboración
- `authUtils.ts`: Gestión de sesiones y tokens

#### Backend (Google Apps Script)

**Archivo principal:** `google_apps_script_FINAL.js`

**Funciones principales:**
- `generarLatex()`: Función principal de generación
- `construirLatex()`: Construcción del documento LaTeX
- `procesarSecciones()`: Procesamiento de secciones
- `generarFigura()`: Generación de código para figuras
- `generarTabla()`: Generación de código para tablas
- `guardarArchivos()`: Almacenamiento en Google Drive


## 2. Modelo de Datos

### 2.1 Estructura de Google Sheets

Cada libro de trabajo contiene las siguientes hojas:

#### Hoja: Documentos

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| ID | String | Identificador único | Sí |
| Titulo | String | Título del documento | Sí |
| Subtitulo | String | Subtítulo | No |
| Autor | String | Autor(es) | Sí |
| Fecha | Date | Fecha de publicación | Sí |
| Institucion | String | Institución emisora | Sí |
| Unidad | String | Unidad responsable | No |
| DocumentoCorto | String | Nombre abreviado | No |
| PalabrasClave | String | Keywords separadas por comas | No |
| Version | String | Número de versión | Sí |
| Agradecimientos | Text | Texto de agradecimientos | No |
| Presentacion | Text | Presentación institucional | No |
| ResumenEjecutivo | Text | Resumen ejecutivo | No |
| DatosClave | Text | Datos destacados | No |
| PortadaRuta | String | Ruta imagen portada | No |
| ContraportadaRuta | String | Ruta imagen contraportada | No |

#### Hoja: Secciones

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| DocumentoID | String | ID del documento padre | Sí |
| Orden | Number | Orden de aparición | Sí |
| Nivel | Enum | Tipo de sección | Sí |
| Titulo | String | Título de la sección | Sí |
| Contenido | Text | Contenido en formato especial | Sí |

**Valores válidos para Nivel:**
- `Seccion`, `Subseccion`, `Subsubseccion`
- `Anexo`, `Subanexo`
- `Portada`, `Directorio`, `Contraportada`

#### Hoja: Figuras

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| DocumentoID | String | ID del documento | Sí |
| SeccionOrden | Number | Sección donde aparece | Sí |
| Fig. | Number | Número de figura | Sí |
| RutaArchivo | String | Ruta en Drive | Sí |
| Caption | String | Descripción | Sí |
| Fuente | String | Fuente de la imagen | No |
| TextoAlternativo | String | Alt text (accesibilidad) | Sí |
| Ancho | Number | Ancho relativo (0.1-1.0) | Sí |

#### Hoja: Tablas

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| DocumentoID | String | ID del documento | Sí |
| SeccionOrden | Number | Sección donde aparece | Sí |
| Orden | Number | Número de tabla | Sí |
| Titulo | String | Título de la tabla | Sí |
| DatosCSV | Text | Datos CSV o rango | Sí |
| Fuente | String | Fuente de datos | No |

#### Hoja: Bibliografia

| Campo | Tipo | Descripción | Obligatorio |
|-------|------|-------------|-------------|
| DocumentoID | String | ID del documento | Sí |
| Clave | String | Clave BibTeX | Sí |
| Tipo | Enum | Tipo de publicación | Sí |
| Autor | String | Autor(es) | Sí |
| Titulo | String | Título | Sí |
| Anio | Number | Año de publicación | Sí |
| Editorial | String | Editorial/Revista | No |
| URL | String | Enlace web | No |

**Tipos válidos:** `article`, `book`, `inproceedings`, `techreport`, `misc`

### 2.2 Diagrama de Relaciones

```
DOCUMENTOS (1) ──┬── (N) SECCIONES
                 ├── (N) FIGURAS
                 ├── (N) TABLAS
                 ├── (N) BIBLIOGRAFIA
                 ├── (N) SIGLAS
                 ├── (N) GLOSARIO
                 └── (N) UNIDADES
```

## 3. Scripts SQL

### 3.1 Nota Importante

El sistema utiliza Google Sheets como base de datos, por lo que no hay scripts SQL tradicionales. Sin embargo, se documentan las operaciones equivalentes:

### 3.2 Operaciones CRUD

#### Crear Documento (INSERT)

```javascript
// JavaScript (Google Sheets API)
await appendRow(spreadsheetId, 'Documentos', [
  id, titulo, subtitulo, autor, fecha, institucion,
  unidad, documentoCorto, palabrasClave, version
], token);
```

#### Leer Documentos (SELECT)

```javascript
// JavaScript
const data = await fetchSpreadsheet(spreadsheetId, token);
const documentos = extractDocuments(data);
```

#### Actualizar Documento (UPDATE)

```javascript
// JavaScript
await updateCell(spreadsheetId, 'Documentos', 
  `A${rowIndex}`, nuevoValor, token);
```

#### Eliminar Documento (DELETE)

```javascript
// JavaScript
await deleteRow(spreadsheetId, 'Documentos', rowIndex, token);
```

### 3.3 Consultas Complejas

#### Obtener documento con todas sus secciones

```javascript
const documento = await fetchSpreadsheet(spreadsheetId, token);
const secciones = obtenerRegistros(
  documento, 'Secciones', documentoId, 'DocumentoID'
);
```

#### Filtrar documentos por autor

```javascript
const documentos = extractDocuments(data);
const filtrados = documentos.filter(d => d.author === 'Autor Específico');
```

## 4. Integraciones Externas

### 4.1 Google Sheets API v4

**Endpoint base:** `https://sheets.googleapis.com/v4/spreadsheets`

**Operaciones implementadas:**

#### Leer datos de hoja

```http
GET /v4/spreadsheets/{spreadsheetId}?includeGridData=true
Authorization: Bearer {access_token}
```

#### Actualizar celda

```http
PUT /v4/spreadsheets/{spreadsheetId}/values/{range}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "values": [["nuevo valor"]]
}
```

#### Agregar fila

```http
POST /v4/spreadsheets/{spreadsheetId}/values/{range}:append
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "values": [["valor1", "valor2", "valor3"]]
}
```

### 4.2 Google Drive API v3

**Endpoint base:** `https://www.googleapis.com/drive/v3`

**Operaciones implementadas:**

#### Crear carpeta

```http
POST /drive/v3/files
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Nueva Carpeta",
  "mimeType": "application/vnd.google-apps.folder"
}
```

#### Subir archivo

```http
POST /upload/drive/v3/files?uploadType=multipart
Authorization: Bearer {access_token}
Content-Type: multipart/related

--boundary
Content-Type: application/json

{"name": "documento.tex"}
--boundary
Content-Type: text/plain

[contenido del archivo]
--boundary--
```

#### Obtener metadatos

```http
GET /drive/v3/files/{fileId}?fields=name,modifiedTime,owners
Authorization: Bearer {access_token}
```

### 4.3 OAuth2 (Google)

**Flujo de autenticación:**

1. **Solicitud de autorización:**
```http
GET https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  response_type=token&
  scope=https://www.googleapis.com/auth/spreadsheets
        https://www.googleapis.com/auth/drive
```

2. **Recepción de token:**
```javascript
// El token se recibe en el callback
const token = response.access_token;
setSession(token, response.expires_in);
```

3. **Uso del token:**
```javascript
fetch(apiUrl, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 4.4 Socket.IO (Colaboración en Tiempo Real)

**Servidor:** `wss://[socket-server-url]`

**Eventos implementados:**

#### Cliente → Servidor

```javascript
// Unirse a sala de documento
socket.emit('join-document', { documentId, user });

// Notificar edición
socket.emit('cell-edited', { 
  documentId, 
  sheet, 
  cell, 
  value, 
  user 
});
```

#### Servidor → Cliente

```javascript
// Notificación de usuario conectado
socket.on('user-joined', (data) => {
  console.log(`${data.user.name} se unió al documento`);
});

// Notificación de edición
socket.on('cell-updated', (data) => {
  updateLocalCell(data.cell, data.value);
});
```

## 5. Seguridad y Control de Accesos

### 5.1 Autenticación

**Método:** OAuth2 con Google

**Flujo:**
1. Usuario inicia sesión con cuenta Google
2. Sistema solicita permisos (Sheets, Drive)
3. Google emite access token (válido 1 hora)
4. Token se almacena en `localStorage` con timestamp
5. Sistema valida token en cada petición
6. Refresh automático antes de expiración

**Implementación:**

```typescript
// authUtils.ts
export const setSession = (token: string, expiresIn: number) => {
  const expiryTime = Date.now() + (expiresIn * 1000);
  localStorage.setItem('access_token', token);
  localStorage.setItem('token_expiry', expiryTime.toString());
};

export const getSession = (): string | null => {
  const token = localStorage.getItem('access_token');
  const expiry = localStorage.getItem('token_expiry');
  
  if (!token || !expiry) return null;
  
  if (Date.now() > parseInt(expiry)) {
    clearSession();
    return null;
  }
  
  return token;
};
```

### 5.2 Autorización

**Niveles de acceso:**

1. **Administrador:**
   - Crear/eliminar libros de trabajo
   - Gestionar permisos de usuarios
   - Acceso a todos los documentos

2. **Editor:**
   - Crear/editar documentos
   - Generar archivos LaTeX
   - Colaborar en tiempo real

3. **Lector:**
   - Ver documentos
   - Exportar datos
   - Sin permisos de edición

**Implementación:**

```typescript
// auth.ts
export const authorizedUsers = [
  'usuario1@sener.gob.mx',
  'usuario2@sener.gob.mx',
  // ... lista de usuarios autorizados
];

// Validación en componentes
if (!authorizedUsers.includes(currentUser.email)) {
  return <AccessDenied />;
}
```

### 5.3 Protección de Datos

**Medidas implementadas:**

1. **Encriptación en tránsito:**
   - HTTPS obligatorio para todas las comunicaciones
   - TLS 1.3 mínimo

2. **Tokens de sesión:**
   - Almacenamiento en `localStorage` (no en cookies)
   - Expiración automática después de 1 hora
   - Limpieza al cerrar sesión

3. **Validación de entrada:**
   - Escapado de caracteres especiales en LaTeX
   - Sanitización de URLs y rutas de archivos
   - Validación de tipos de datos

4. **Control de acceso a archivos:**
   - Permisos de Google Drive heredados
   - Solo usuarios con acceso al Sheet pueden generar LaTeX
   - Archivos generados en carpeta con permisos restringidos

### 5.4 Auditoría

**Logs del sistema:**

```javascript
// Registro de acciones críticas
function log(mensaje) {
  console.log(`[${new Date().toISOString()}] ${mensaje}`);
  // En producción, enviar a sistema de logging centralizado
}

// Ejemplos de logs
log(`✅ Usuario ${email} inició sesión`);
log(`📄 Documento ${docId} generado por ${user}`);
log(`⚠️ Intento de acceso no autorizado: ${email}`);
```

**Historial de versiones:**
- Google Sheets mantiene historial automático
- Acceso vía: Archivo > Historial de versiones
- Restauración de versiones anteriores disponible

## 6. Recomendaciones de Mantenimiento

### 6.1 Mantenimiento Preventivo

**Frecuencia: Mensual**

- [ ] Revisar logs de errores en Google Apps Script
- [ ] Verificar espacio disponible en Google Drive
- [ ] Actualizar dependencias de npm (revisar vulnerabilidades)
- [ ] Revisar tokens de acceso expirados
- [ ] Limpiar archivos temporales en Drive

**Comandos útiles:**

```bash
# Verificar vulnerabilidades
npm audit

# Actualizar dependencias
npm update

# Limpiar caché
npm cache clean --force
```

### 6.2 Mantenimiento Correctivo

**Problemas comunes y soluciones:**

#### Error: "Token expirado"

**Causa:** Access token de OAuth2 caducó  
**Solución:**
```javascript
// Forzar re-autenticación
clearSession();
window.location.reload();
```

#### Error: "Quota exceeded"

**Causa:** Límite de API de Google alcanzado  
**Solución:**
- Revisar cuota en Google Cloud Console
- Implementar rate limiting
- Solicitar aumento de cuota si es necesario

#### Error: "Archivo no encontrado"

**Causa:** Ruta de imagen incorrecta  
**Solución:**
- Verificar que la imagen existe en Drive
- Corregir ruta en hoja "Figuras"
- Usar rutas relativas (ej: `img/figura.png`)

### 6.3 Respaldos

**Estrategia de backup:**

1. **Google Sheets (automático):**
   - Google mantiene respaldos automáticos
   - Historial de versiones disponible 30 días

2. **Código fuente:**
   - Repositorio Git con commits diarios
   - Branches de respaldo semanales
   - Tags en cada release

3. **Archivos generados:**
   - Carpeta de salida en Drive respaldada semanalmente
   - Exportación a almacenamiento local mensual

**Script de respaldo manual:**

```bash
# Exportar Google Sheet a Excel
# (Ejecutar desde Google Sheets)
# Archivo > Descargar > Microsoft Excel

# Respaldar código
git tag -a v1.0-backup-$(date +%Y%m%d) -m "Backup mensual"
git push origin --tags
```

### 6.4 Monitoreo

**Métricas clave:**

- Tiempo de respuesta de API (< 2 segundos)
- Tasa de errores (< 1%)
- Usuarios activos simultáneos
- Documentos generados por día
- Espacio utilizado en Drive

**Herramientas recomendadas:**

- Google Cloud Monitoring (para APIs)
- Sentry (para errores de frontend)
- Google Analytics (para uso de aplicación)

### 6.5 Actualizaciones

**Proceso de actualización:**

1. **Desarrollo:**
   - Crear branch `feature/nueva-funcionalidad`
   - Desarrollar y probar localmente
   - Crear Pull Request

2. **Testing:**
   - Revisar código (code review)
   - Ejecutar tests automatizados
   - Probar en ambiente de staging

3. **Despliegue:**
   - Merge a branch `main`
   - Build de producción: `npm run build`
   - Desplegar a servidor web
   - Verificar funcionamiento

4. **Rollback (si es necesario):**
   ```bash
   git revert HEAD
   npm run build
   # Redesplegar versión anterior
   ```

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 1.0
