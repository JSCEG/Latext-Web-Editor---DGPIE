# Stack Tecnológico
## Automatización de Plantillas de Instrumentos de Planeación

---

## 1. Backend

### 1.1 Plataforma

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Google Apps Script** | V8 Runtime | Motor de procesamiento y generación LaTeX |
| **Node.js** | 18.x LTS | Entorno de desarrollo (opcional para servidor Socket.IO) |

### 1.2 APIs y Servicios

| Servicio | Versión | Propósito |
|----------|---------|-----------|
| **Google Sheets API** | v4 | Almacenamiento y gestión de datos estructurados |
| **Google Drive API** | v3 | Almacenamiento de archivos generados (.tex, .bib, imágenes) |
| **Google OAuth2** | 2.0 | Autenticación y autorización de usuarios |

### 1.3 Justificación Técnica

**Google Apps Script:**
- Integración nativa con Google Workspace (Sheets, Drive)
- Sin necesidad de infraestructura de servidor adicional
- Ejecución serverless con escalabilidad automática
- Familiaridad del equipo técnico con JavaScript
- Costos operativos mínimos (incluido en Google Workspace)

**Google Sheets como Base de Datos:**
- Interfaz familiar para usuarios no técnicos
- Colaboración en tiempo real nativa
- Historial de versiones automático
- Exportación sencilla a Excel/CSV
- Sin necesidad de administración de base de datos tradicional

---

## 2. Frontend

### 2.1 Framework y Librerías Core

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.2.0 | Framework UI para construcción de interfaces |
| **TypeScript** | 5.2.2 | Tipado estático para mayor robustez |
| **Vite** | 5.1.0 | Build tool y servidor de desarrollo |

### 2.2 Librerías de UI y Estilos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **TailwindCSS** | 3.4.1 | Framework CSS utility-first |
| **Lucide React** | 0.344.0 | Biblioteca de iconos |
| **PostCSS** | 8.4.35 | Procesador de CSS |
| **Autoprefixer** | 10.4.17 | Prefijos CSS automáticos para compatibilidad |

### 2.3 Gestión de Estado y Datos

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React Hooks** | Built-in | Gestión de estado local (useState, useEffect, useRef) |
| **Context API** | Built-in | Estado global ligero |

### 2.4 Autenticación

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **@react-oauth/google** | 0.12.1 | Integración OAuth2 con Google |

### 2.5 Comunicación en Tiempo Real

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Socket.IO Client** | 4.7.2 | WebSockets para colaboración en tiempo real |

### 2.6 Justificación Técnica

**React + TypeScript:**
- Ecosistema maduro con amplia comunidad
- Componentes reutilizables y mantenibles
- TypeScript previene errores en tiempo de desarrollo
- Excelente rendimiento con Virtual DOM
- Facilita testing y debugging

**Vite:**
- Hot Module Replacement (HMR) instantáneo
- Build optimizado con tree-shaking
- Configuración mínima
- Soporte nativo para TypeScript
- Tiempos de compilación 10x más rápidos que Webpack

**TailwindCSS:**
- Desarrollo rápido con clases utilitarias
- Consistencia visual garantizada
- Tamaño final optimizado (purge de CSS no usado)
- Responsive design simplificado
- Personalización sencilla para identidad institucional

---

## 3. Base de Datos

### 3.1 Almacenamiento Principal

| Tecnología | Tipo | Propósito |
|------------|------|-----------|
| **Google Sheets** | NoSQL (Tabular) | Almacenamiento de datos estructurados |

### 3.2 Estructura de Datos

**Hojas implementadas:**
- `Documentos`: Metadatos de documentos
- `Secciones`: Contenido estructurado por secciones
- `Figuras`: Referencias a imágenes y gráficos
- `Tablas`: Datos tabulares
- `Bibliografia`: Referencias bibliográficas
- `Siglas`: Acrónimos y abreviaturas
- `Glosario`: Definiciones de términos
- `Unidades`: Unidades de medida

### 3.3 Almacenamiento de Archivos

| Tecnología | Propósito |
|------------|-----------|
| **Google Drive** | Almacenamiento de imágenes, archivos .tex y .bib generados |

### 3.4 Almacenamiento Local

| Tecnología | Propósito |
|------------|-----------|
| **LocalStorage** | Tokens de sesión, preferencias de usuario, caché de metadatos |

### 3.5 Justificación Técnica

**Google Sheets:**
- Curva de aprendizaje mínima para usuarios finales
- Colaboración nativa sin desarrollo adicional
- Backup automático por Google
- Exportación a formatos estándar (Excel, CSV)
- API robusta y bien documentada
- Sin costos de licenciamiento de DBMS

**Google Drive:**
- Integración perfecta con Sheets
- Control de acceso granular
- Versionado de archivos
- Capacidad de almacenamiento escalable
- Acceso desde cualquier dispositivo

---

## 4. Infraestructura

### 4.1 Hosting y Despliegue

| Componente | Tecnología | Propósito |
|------------|------------|-----------|
| **Frontend** | Servidor Web (Nginx/Apache) | Servir aplicación React compilada |
| **Backend** | Google Apps Script | Ejecución serverless |
| **WebSockets** | Socket.IO Server (Node.js) | Colaboración en tiempo real |

### 4.2 Servidor Web Recomendado

**Opción 1: Nginx**
```nginx
server {
    listen 80;
    server_name latex-editor.sener.gob.mx;
    
    root /var/www/latex-editor/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Caché de assets estáticos
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**Opción 2: Apache**
```apache
<VirtualHost *:80>
    ServerName latex-editor.sener.gob.mx
    DocumentRoot /var/www/latex-editor/dist
    
    <Directory /var/www/latex-editor/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

### 4.3 Requisitos de Servidor

**Servidor de Producción:**
- **CPU**: 2 vCPUs (mínimo)
- **RAM**: 4 GB
- **Almacenamiento**: 20 GB SSD
- **Sistema Operativo**: Ubuntu 22.04 LTS / CentOS 8 / Windows Server 2019
- **Ancho de banda**: 100 Mbps

**Servidor de Desarrollo:**
- **CPU**: 2 núcleos
- **RAM**: 4 GB
- **Almacenamiento**: 10 GB
- **Sistema Operativo**: Windows 10+, macOS 11+, Linux

### 4.4 Dominio y SSL

| Componente | Tecnología |
|------------|------------|
| **DNS** | Cloudflare / Google Cloud DNS |
| **Certificado SSL** | Let's Encrypt (gratuito) / DigiCert (institucional) |
| **CDN** | Cloudflare (opcional, para mejor rendimiento) |

### 4.5 Justificación Técnica

**Arquitectura Híbrida:**
- Frontend estático: Fácil de desplegar, cacheable, rápido
- Backend serverless: Sin mantenimiento de servidores, escalabilidad automática
- Separación de responsabilidades: Cada capa optimizada para su función

**Google Apps Script como Backend:**
- Elimina necesidad de servidor backend tradicional
- Costos operativos mínimos
- Escalabilidad automática
- Alta disponibilidad (SLA de Google)

---

## 5. Librerías y Dependencias

### 5.1 Dependencias de Producción

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "@react-oauth/google": "^0.12.1",
  "socket.io-client": "^4.7.2",
  "lucide-react": "^0.344.0"
}
```

**Justificación:**
- `react` y `react-dom`: Core del framework UI
- `@react-oauth/google`: Autenticación OAuth2 simplificada
- `socket.io-client`: Comunicación en tiempo real
- `lucide-react`: Iconografía moderna y ligera

### 5.2 Dependencias de Desarrollo

```json
{
  "typescript": "^5.2.2",
  "vite": "^5.1.0",
  "@vitejs/plugin-react": "^4.2.1",
  "tailwindcss": "^3.4.1",
  "postcss": "^8.4.35",
  "autoprefixer": "^10.4.17",
  "eslint": "^8.57.0",
  "@typescript-eslint/eslint-plugin": "^6.21.0",
  "@typescript-eslint/parser": "^6.21.0",
  "prettier": "^3.2.5"
}
```

**Justificación:**
- `typescript`: Tipado estático
- `vite` y plugins: Build tool optimizado
- `tailwindcss`, `postcss`, `autoprefixer`: Stack de estilos
- `eslint` y plugins: Linting de código
- `prettier`: Formateo consistente

### 5.3 Tamaño del Bundle

**Build de producción optimizado:**
- **JavaScript**: ~180 KB (gzipped)
- **CSS**: ~15 KB (gzipped)
- **Total inicial**: ~195 KB
- **Tiempo de carga**: < 2 segundos en conexión 4G

**Optimizaciones aplicadas:**
- Tree-shaking de código no usado
- Code splitting por rutas
- Lazy loading de componentes pesados
- Minificación y compresión gzip
- Caché de assets estáticos

---

## 6. Versiones Utilizadas

### 6.1 Tabla Resumen

| Categoría | Tecnología | Versión | Fecha de Adopción |
|-----------|------------|---------|-------------------|
| **Runtime** | Node.js | 18.19.0 LTS | Enero 2024 |
| **Framework** | React | 18.2.0 | Enero 2024 |
| **Lenguaje** | TypeScript | 5.2.2 | Enero 2024 |
| **Build Tool** | Vite | 5.1.0 | Enero 2024 |
| **Estilos** | TailwindCSS | 3.4.1 | Enero 2024 |
| **Backend** | Google Apps Script | V8 Runtime | Enero 2024 |
| **API** | Google Sheets API | v4 | Enero 2024 |
| **API** | Google Drive API | v3 | Enero 2024 |
| **Auth** | OAuth2 | 2.0 | Enero 2024 |
| **WebSockets** | Socket.IO | 4.7.2 | Febrero 2024 |

### 6.2 Política de Actualizaciones

**Actualizaciones de seguridad:**
- Revisión semanal de vulnerabilidades (`npm audit`)
- Aplicación inmediata de parches críticos
- Testing en ambiente de staging antes de producción

**Actualizaciones de versiones menores:**
- Revisión mensual de nuevas versiones
- Actualización si hay mejoras de rendimiento o correcciones importantes
- Testing completo antes de despliegue

**Actualizaciones de versiones mayores:**
- Evaluación trimestral
- Análisis de breaking changes
- Plan de migración documentado
- Testing exhaustivo en staging
- Despliegue gradual con rollback preparado

---

## 7. Justificación Técnica General

### 7.1 Criterios de Selección

Las tecnologías fueron seleccionadas considerando:

1. **Madurez y Estabilidad:**
   - Todas las tecnologías tienen versiones estables y LTS
   - Comunidades activas y soporte a largo plazo

2. **Curva de Aprendizaje:**
   - React y TypeScript: Ampliamente conocidos en la industria
   - Google Sheets: Familiar para usuarios finales
   - Documentación extensa y recursos de aprendizaje

3. **Costos:**
   - Google Workspace: Ya disponible institucionalmente
   - Librerías open-source: Sin costos de licenciamiento
   - Infraestructura mínima: Reducción de costos operativos

4. **Escalabilidad:**
   - Google Apps Script: Escalabilidad automática
   - React: Rendimiento optimizado para aplicaciones grandes
   - Google Sheets: Soporta hasta 10 millones de celdas por hoja

5. **Seguridad:**
   - OAuth2: Estándar de autenticación seguro
   - HTTPS obligatorio
   - Permisos granulares de Google Drive

6. **Mantenibilidad:**
   - Código TypeScript: Menos errores en producción
   - Componentes React: Reutilizables y testables
   - Separación de responsabilidades clara

### 7.2 Alternativas Consideradas

| Alternativa | Razón de Descarte |
|-------------|-------------------|
| **Angular** | Mayor complejidad, curva de aprendizaje más pronunciada |
| **Vue.js** | Menor adopción institucional, menos recursos internos |
| **PostgreSQL** | Requiere administración de BD, mayor complejidad operativa |
| **MongoDB** | Curva de aprendizaje para usuarios finales, costos adicionales |
| **AWS Lambda** | Costos variables, dependencia de proveedor cloud externo |
| **Firebase** | Menor control institucional, costos escalables |

### 7.3 Ventajas del Stack Seleccionado

1. **Integración Perfecta:**
   - Todo el ecosistema Google Workspace integrado
   - Autenticación SSO institucional
   - Sin necesidad de sincronización entre sistemas

2. **Costos Operativos Mínimos:**
   - Sin servidores backend tradicionales
   - Sin licencias de base de datos
   - Infraestructura mínima (solo frontend estático)

3. **Familiaridad Institucional:**
   - Google Sheets ya usado en la organización
   - Capacitación mínima requerida
   - Adopción rápida por usuarios finales

4. **Mantenimiento Simplificado:**
   - Actualizaciones de dependencias sencillas
   - Sin administración de servidores complejos
   - Backup automático por Google

5. **Escalabilidad Garantizada:**
   - Google maneja la infraestructura
   - Escalado automático según demanda
   - Alta disponibilidad (99.9% SLA)

---

**Documento elaborado por:**  
Dirección General de Planeación y Transición Energética  
Secretaría de Energía

**Fecha de elaboración:** Febrero 2025  
**Versión:** 1.0
