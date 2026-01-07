# 📐 Guía Completa: Modo Horizontal para Figuras y Tablas SENER

## 🎯 **Objetivo**
Implementar figuras y tablas en modo horizontal (landscape) que maximicen el uso del espacio disponible, manteniendo la identidad institucional SENER y garantizando que todo el contenido (caption + figura/tabla + fuente) quepa en una sola página.

## 🏗️ **Arquitectura del Sistema**

### **1. Entorno Principal: `figuraespecial` y `tablaespecial`**

Para figuras:
```latex
\begin{figuraespecial}
  % Contenido de figura horizontal optimizado
\end{figuraespecial}
```

Para tablas:
```latex
\begin{tablaespecial}
  % Contenido de tabla horizontal optimizado
\end{tablaespecial}
```

**Características Comunes:**
- Cambia a modo landscape automáticamente (`pdflscape`)
- **Márgenes Rotados (Geometry) - Configuración Final:**
    - `right=3.0cm` → **Visual Top** (Espacio para encabezado y línea dorada)
    - `left=2.5cm` → **Visual Bottom** (Espacio para pie de página y número)
    - `top=2.5cm` → **Visual Right** (Alineado con fin de línea dorada superior)
    - `bottom=2.0cm` → **Visual Left** (Alineado con inicio de líneas doradas)
- Fondo institucional: `img/hojahorizontal.jpg` rotado 90°
- Línea dorada institucional posicionada manualmente con TikZ
- Sin headers/footers (`\thispagestyle{empty}`)

### **2. Variable de Ancho Exclusiva**
```latex
\newlength{\anchoHorizontal}
\setlength{\anchoHorizontal}{1.0\linewidth}
```

**Propósito:**
- Controla el ancho de TODOS los elementos horizontales
- 100% del `\linewidth` (maximizado entre márgenes visuales Left/Right)

### **3. Comandos Específicos Horizontales**

#### **A. Títulos y Secciones (Evitar Huecos Verticales)**
Cuando una figura o tabla horizontal va precedida inmediatamente por un título de sección o subsección, **NO** debes colocar el título en la página vertical anterior, ya que esto generará un gran espacio en blanco (hueco) al final de esa página.

**Solución:** Mueve el comando de título **DENTRO** del entorno horizontal. El sistema se encargará de renderizarlo correctamente en la página apaisada, ajustando automáticamente el espacio disponible para la imagen.

**Ejemplo Incorrecto (Genera hueco):**
```latex
\section{Principales flujos...} % Se queda solo en la página vertical
\begin{figuraespecial}
  ...
\end{figuraespecial}
```

**Ejemplo Correcto (Optimizado):**
```latex
\begin{figuraespecial}
  % El título se renderiza dentro de la página horizontal
  \seccionHorizontal{Principales flujos...} 
  
  \captionHorizontal{Diagrama de flujo...}
  \imagenHorizontal{img/sankey.png}{fig:sankey}
  ...
\end{figuraespecial}
```

**Comandos Disponibles:**

1.  **Título Simple (Solo visual)**
    ```latex
    \tituloHorizontal{Texto del Título}
    ```
    *Estilo*: Sección (Patria 17pt, Guinda). No numera ni añade al índice.

2.  **Sección Numerada (Reemplaza a `\section`)**
    ```latex
    \seccionHorizontal{Nombre de la Sección}
    ```
    *Efecto*: Numera (ej. "6. Balance"), añade al índice y muestra el título estilo Sección.

3.  **Subsección Numerada (Reemplaza a `\subsection`)**
    ```latex
    \subseccionHorizontal{Nombre de la Subsección}
    ```
    *Efecto*: Numera (ej. "6.1 Cuentas..."), añade al índice y muestra el título estilo Subsección (Patria 14pt, Rojo Claro).

**Nota**: Todos estos comandos reducen automáticamente la altura disponible de la imagen para dar cabida al título sin saltar de página.

#### **B. Caption Horizontal**
```latex
\captionHorizontal{Texto del caption}
```
- Fuente: Patria 10pt (compacto)
- Color: gobmxGuinda
- Alineación: **Izquierda** (sin `center`)
- Sin numeración automática

#### **C. Imagen Horizontal**
```latex
\sinNotas % Opcional: Usar ANTES de \imagenHorizontal si la fuente NO tiene notas al pie.
\imagenHorizontal{ruta/imagen.png}{fig:etiqueta}
```
- **Ancho**: `\linewidth` (100% disponible)
- **Alto (Estándar)**: `\textheight - 4.5cm` (Uso normal con o sin notas al pie)
- **Alto (Con \sinNotas)**: `\textheight - 2.0cm` (Maximización extrema: gana 2.5cm extra de altura). **Nota**: Usar solo si la fuente es breve y NO tiene notas al pie.
- **Alineación**: Izquierda
- **Estiramiento**: Forzado (sin `keepaspectratio`)

#### **D. Tablas Horizontales (NUEVO)**

Para tablas que ocupan todo el ancho horizontal, se recomienda usar `tabularx` (una página) o `xltabular` (multipágina) con ancho `\linewidth`.

**Ejemplo de Tabla Corta (Una página):**
```latex
\begin{tablaespecial}
  \tituloHorizontal{Tabla Corta Horizontal}
  \begin{tabladoradoCorto}
    % Usar \linewidth para ocupar todo el ancho disponible
    \begin{tabularx}{\linewidth}{V Z C{4cm}}
      \toprule
      \encabezadodorado{Columna 1} & \encabezadodorado{Columna 2} & \encabezadodorado{Columna 3} \\
      \midrule
      Dato Largo... & Dato Largo... & Dato Corto \\
      \bottomrule
    \end{tabularx}
  \end{tabladoradoCorto}
  \fuenteHorizontal{Fuente: Elaboración propia.}
\end{tablaespecial}
```

**Ejemplo de Tabla Larga (Multipágina):**
```latex
\begin{tablaespecial}
  \tituloHorizontal{Tabla Larga Horizontal}
  \begin{tabladoradoLargo}
    % xltabular combina longtable + tabularx
    \begin{xltabular}{\linewidth}{V Z C{3cm}}
      \toprule
      \encabezadodorado{Columna 1} & \encabezadodorado{Columna 2} & \encabezadodorado{Columna 3} \\
      \midrule
      \endhead % Repite encabezados en cada página
      
      % Contenido de la tabla...
      
      \bottomrule
    \end{xltabular}
  \end{tabladoradoLargo}
  \fuenteHorizontal{Fuente: Elaboración propia.}
\end{tablaespecial}
```

**Tipos de Columna Disponibles (sener2025.cls):**
- `V`: Columna tipo `X` (ajustable), negrita, alineada a la izquierda.
- `Z`: Columna tipo `X` (ajustable), normal, alineada a la izquierda.
- `C{ancho}`: Columna centrada de ancho fijo.
- `L{ancho}`: Columna izquierda de ancho fijo.
- `R{ancho}`: Columna derecha de ancho fijo.

**Encabezados de Tabla (Fondo Coloreado Automático):**
Los comandos de encabezado ya incluyen automáticamente el color de fondo para asegurar la legibilidad del texto blanco.
- `\encabezadodorado{Texto}`: Fondo dorado, texto blanco.
- `\encabezadoguinda{Texto}`: Fondo guinda, texto blanco.
- `\encabezadoverde{Texto}`: Fondo verde, texto blanco.
- `\encabezadogris{Texto}`: Fondo gris, texto blanco.

#### **E. Fuente y Notas al Pie (Sistema Dual)**
El sistema maneja las notas al pie de manera independiente según la orientación de la página para garantizar que los números de página permanezcan fijos en su posición correcta.

**1. Notas en Modo Vertical (Estándar)**
- Se comportan normalmente (`\footnote{...}`).
- Se ubican al final del bloque de texto vertical.
- **Importante**: No afectan la posición del número de página ni de la cinta decorativa.

**2. Notas en Modo Horizontal (Capturadas)**
Dentro de `figuraespecial` o `tablaespecial`, el comando `\footnote` se redefine automáticamente para:
1.  **No imprimir** la nota al pie estándar (que rompería el diseño horizontal).
2.  **Capturar** el texto de la nota.
3.  **Renderizar** la nota manualmente usando TikZ en el margen lateral (visual inferior), justo encima de la línea dorada del pie de página.

**Sintaxis:**
```latex
\fuenteHorizontal{Texto de la fuente\footnote{Texto de la nota al pie horizontal.}}
```
*Ya no es necesario usar `\footnotemark` y `\footnotetext` por separado. El sistema lo maneja automáticamente.*

- **Posición**: Fija en la esquina inferior izquierda visual (South-East físico), alineada con la línea dorada.
- **Estilo**: Fuente `Noto Sans Light` 8pt/10pt, Color `gobmxGris` (Homologado con modo vertical).

---

## 🧭 **Mapeo de Coordenadas TikZ en Landscape**

Cuando se usa `pdflscape`, la página rota visualmente en el PDF, pero el sistema de coordenadas de TikZ (`current page`) sigue anclado a la página física original. Esto causa confusión entre "Arriba/Abajo" visual vs físico.

### **Referencias Comprobadas:**

| Punto Físico TikZ (`current page`) | Ubicación Visual en PDF (Landscape) | Uso en Plantilla |
|------------------------------------|-------------------------------------|------------------|
| `.south west` (0,0) | **Esquina Superior Izquierda** | Inicio de Línea Dorada |
| `.north west` | **Esquina Superior Derecha** | Fin de Línea Dorada |
| `.south east` | **Esquina Inferior Izquierda** | - |
| `.north east` | **Esquina Inferior Derecha** | **Número de Página** |

### **Configuración Final Implementada:**

1.  **Línea Dorada (Encabezado):**
    *   Dibuja de `south west` a `north west`.
    *   Visualmente: Línea horizontal superior de izquierda a derecha.
    *   Offset X: `2.5cm` (Borde Superior Visual).
    *   Inicio Visual Izquierdo: `2cm` (Igual que pie de página).
    *   Fin Visual Derecho: `-2.5cm` (**Configuración Ganadora**).
    *   **Ancho**: `1pt`.

2.  **Número de Página (Pie):**
    *   Ubicado en `north east` (Esquina Inferior Derecha Visual).
    *   Offset: `(-1.3cm, -2.5cm)` para quedar debajo de la cinta dorada del fondo.
    *   Rotación: `rotate=90` para que el texto se lea correctamente en horizontal.

3.  **Línea de Pie de Página (Complemento):**
    *   Dibuja paralela al borde `east` (Visual Bottom).
    *   Desde `north east` (Visual Bottom-Right) hacia `south east` (Visual Bottom-Left).
    *   Offset X: `-1.25cm` (Alineado con la base del número de página).
    *   Inicio Visual Izquierdo: `2cm` del borde `south east` (**Configuración Ganadora**).
    *   Fin Visual Derecho: `2.5cm` del borde `south west` (Margen izquierdo visual).
    *   **Ancho**: `0.4pt` (Homologado con modo vertical).

## 📋 **Orden de Elementos**
```latex
\begin{figuraespecial}
  \captionHorizontal{Descripción...}
  \imagenHorizontal{ruta...}{fig:...}
  \fuenteHorizontal{Fuente...}
\end{figuraespecial}
```

## 🔄 **Flujo de Trabajo**
1. **Google Sheets**: Columna "Opciones" → `horizontal`.
2. **Generación**: Detecta flag y usa entorno `figuraespecial` o `tablaespecial`.
3. **Compilación**: XeLaTeX aplica rotación y coordenadas TikZ corregidas.

---
**Actualizado**: Enero 2026 - Calibración final de coordenadas y soporte para tablas.
