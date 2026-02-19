# Código Fuente
## Automatización de Plantillas de Instrumentos de Planeación

---

### Arquitectura General

El sistema implementa una arquitectura cliente-servidor moderna con las siguientes capas:

```
┌─────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                  │
│  React 18 + TypeScript + TailwindCSS + Vite            │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   CAPA DE SERVICIOS                      │
│  Google Sheets API + Socket.IO + OAuth2                │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  CAPA DE PROCESAMIENTO                   │
│  Google Apps Script (Motor LaTeX Generator)            │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   CAPA DE ALMACENAMIENTO                 │
│  Google Drive + Google Sheets (Base de Datos)          │
└─────────────────────────────────────────────────────────┘
```

### Estructura del Repositorio

```
proyecto/
├── components/              # Componentes React reutilizables
│   ├── Dashboard.tsx       # Panel principal de documentos
│   ├── SheetEditor.tsx     # Editor principal de contenido
│   ├── WorkbookDashboard.tsx  # Selector de libros de trabajo
│   ├── GraphicsEditor.tsx  # Editor de figuras y gráficos
│   ├── TableStyleEditor.tsx   # Editor de tablas
│   ├── Button.tsx          # Componente de botón reutilizable
│   ├── Modal.tsx           # Componente de modal
│   └── UserActivityTracker.tsx  # Rastreador de actividad
│
├── services/               # Servicios de integración
│   ├── sheetsService.ts    # API de Google Sheets
│   └── socketService.ts    # WebSockets para colaboración
│
├── utils/                  # Utilidades y helpers
│   └── authUtils.ts        # Gestión de autenticación
│
├── fonts/                  # Tipografías institucionales
│   ├── Patria_Regular.otf
│   ├── Patria_Bold.otf
│   └── NotoSans-*.ttf
│
├── img/                    # Recursos gráficos
│
├── google_apps_script_FINAL.js  # Motor de generación LaTeX
├── App.tsx                 # Componente raíz de la aplicación
├── auth.ts                 # Configuración de autenticación
├── config.ts               # Configuración global
├── index.html              # Punto de entrada HTML
├── index.css               # Estilos globales
├── package.json            # Dependencias del proyecto
├── tsconfig.json           # Configuración TypeScript
├── vite.config.ts          # Configuración del bundler
└── .env.example            # Variables de entorno (plantilla)
```

### Cómo Ejecutar el Proyecto

#### Requisitos Previos

- **Node.js**: v18.0.0 o superior
- **npm**: v9.0.0 o superior
- **Cuenta de Google**: Con acceso a Google Cloud Console
- **Navegador**: Chrome, Firefox o Edge (última versión)

#### Instalación

1. **Clonar el repositorio:**
```bash
git clone <url-del-repositorio>
cd proyecto
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env.local
```

Editar `.env.local` con las credenciales de Google OAuth2:
```env
VITE_GOOGLE_CLIENT_ID=tu_client_id_aqui
VITE_GOOGLE_API_KEY=tu_api_key_aqui
```

4. **Iniciar servidor de desarrollo:**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

#### Compilación para Producción

```bash
npm run build
```

Los archivos optimizados se generarán en el directorio `dist/`

#### Despliegue

```bash
npm run preview  # Vista previa de la build de producción
```

### Dependencias Técnicas

#### Dependencias de Producción

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `react` | ^18.2.0 | Framework UI |
| `react-dom` | ^18.2.0 | Renderizado DOM |
| `@react-oauth/google` | ^0.12.1 | Autenticación OAuth2 |
| `socket.io-client` | ^4.7.2 | Comunicación en tiempo real |
| `lucide-react` | ^0.344.0 | Iconografía |
| `tailwindcss` | ^3.4.1 | Framework CSS |

#### Dependencias de Desarrollo

| Paquete | Versión | Propósito |
|---------|---------|-----------|
| `typescript` | ^5.2.2 | Tipado estático |
| `vite` | ^5.1.0 | Build tool y dev server |
| `@vitejs/plugin-react` | ^4.2.1 | Plugin React para Vite |
| `eslint` | ^8.57.0 | Linter de código |
| `prettier` | ^3.2.5 | Formateador de código |

### Requisitos Mínimos

#### Servidor de Desarrollo

- **CPU**: 2 núcleos
- **RAM**: 4 GB
- **Almacenamiento**: 500 MB
- **Sistema Operativo**: Windows 10+, macOS 11+, Linux (Ubuntu 20.04+)

#### Servidor de Producción

- **CPU**: 2 núcleos
- **RAM**: 2 GB
- **Almacenamiento**: 200 MB
- **Ancho de banda**: 10 Mbps
- **Servidor web**: Nginx 1.20+ o Apache 2.4+

#### Cliente (Navegador)

- **Navegadores soportados**:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
- **Resolución mínima**: 1280x720
- **Conexión**: 5 Mbps recomendado

### Control de Versiones

**Sistema:** Git  
**Repositorio:** GitHub (privado)  
**Estrategia de branching:** GitFlow

#### Ramas Principales

- `main`: Código en producción
- `develop`: Código en desarrollo
- `feature/*`: Nuevas funcionalidades
- `hotfix/*`: Correcciones urgentes

#### Convención de Commits

```
tipo(alcance): descripción breve

[cuerpo opcional]

[footer opcional]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (sin afectar lógica)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplo:**
```
feat(editor): agregar autoguardado en tablas

Implementa debouncing de 2 segundos para guardar
automáticamente cambios en el editor de tablas.

Closes #123
```

### Scripts Disponibles

```bash
npm run dev          # Inicia servidor de desarrollo
npm run build        # Compila para producción
npm run preview      # Vista previa de build
npm run lint         # Ejecuta linter
npm run format       # Formatea código con Prettier
npm run type-check   # Verifica tipos TypeScript
```

### Configuración de Google Apps Script

El motor de generación LaTeX (`google_apps_script_FINAL.js`) debe desplegarse en Google Apps Script:

1. Abrir Google Sheets con los datos
2. Ir a **Extensiones > Apps Script**
3. Copiar el contenido de `google_apps_script_FINAL.js`
4. Configurar la variable `CARPETA_SALIDA_ID` con el ID de la carpeta de Drive destino
5. Guardar y autorizar permisos

### Notas de Seguridad

- Las credenciales OAuth2 deben mantenerse en `.env.local` (nunca en el repositorio)
- El archivo `.env.local` está incluido en `.gitignore`
- Los tokens de acceso se almacenan en `localStorage` con expiración
- La autenticación se valida en cada petición a la API

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 1.0
