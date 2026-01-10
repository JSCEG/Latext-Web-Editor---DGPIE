%!TEX TS-program = xelatex uiltimo cmabio 09/01/2026
% ============================================================================
% CLASE: sener2025.cls
% PROPÓSITO: Plantilla institucional SENER - Versión completa 2025
% AUTOR: Antigravity (Google Deepmind) / SENER Team
% ÚLTIMA MODIFICACIÓN: 2025-12-23
% ============================================================================

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{sener2025}[2025/11/21 Plantilla institucional SENER - Versión completa]

% --- Carga de clase base ---
% Basado en article tamaño carta (letterpaper).
\LoadClass[letterpaper,twoside]{article}

% ============================================================================
% 1. PAQUETES BÁSICOS Y CONFIGURACIÓN DE PÁGINA
% ============================================================================

% Idioma y localización (Español de México)
\RequirePackage[spanish,mexico,es-tabla,noconfigs]{babel}
\decimalpoint

% Dimensiones de la página y márgenes
\RequirePackage[
  left=2.5cm,
  right=2.5cm,
  top=3.5cm,
  bottom=3.5cm,
  headheight=2.2cm, % Ajustado para encabezados con logo grande
  headsep=1cm,
  footskip=2.3cm
]{geometry}

% Soporte para gráficos
\RequirePackage[final]{graphicx}

% Configuración de versión de PDF según el motor (XeLaTeX preferido)
\ifPDFTeX
  \pdfminorversion=7
  \pdfobjcompresslevel=0
\else
  \ifdefined\XeTeXversion
    \special{pdf:minorversion 7}
    \special{pdf:objcompresslevel 0}
  \fi
\fi

% Paquetes de utilidad general
\RequirePackage{float}       % Control de posición de figuras [H]
\RequirePackage[table]{xcolor} % Colores y filas coloreadas en tablas
\RequirePackage{titlesec}    % Formateo de títulos de sección
\RequirePackage{fontawesome5} % Iconos
\RequirePackage{fancyhdr}    % Encabezados y pies de página
\RequirePackage{enumitem}    % Listas personalizadas
\RequirePackage{csquotes}    % Comillas inteligentes
\RequirePackage{anyfontsize} % Permitir cualquier tamaño de fuente
\RequirePackage{microtype}   % Mejoras micro-tipográficas
\RequirePackage{etoolbox}    % Ganchos (hooks) y condicionales
\RequirePackage{pdfpages}    % Inserción de páginas PDF
\RequirePackage{eso-pic}     % Imágenes de fondo
\RequirePackage{tikz}        % Dibujos y elementos gráficos
\usetikzlibrary{calc}        % Habilitar cálculos de coordenadas ($(A)+(B)$)
\RequirePackage{multicol}    % Varias columnas
\RequirePackage{lettrine}    % Letras capitales
\RequirePackage{qrcode}      % Códigos QR
\RequirePackage{marginnote}  % Notas al margen
\RequirePackage[flushmargin]{footmisc} % Notas al pie al ras del margen (sin opción bottom para evitar excesivo espacio blanco)
\RequirePackage{rotating}    % Para figuras y tablas rotadas (sideways)
\RequirePackage{pdflscape}   % Para páginas en formato horizontal (landscape)
\RequirePackage{needspace}   % Para evitar cortes de página indeseados (\Needspace)

% ============================================================================
% 2. COLORES INSTITUCIONALES (Identidad Corporativa)
% ============================================================================

\definecolor{gobmxGuinda}{RGB}{156,35,72}       % Guinda estándar (Pantone 7420 C)
\definecolor{senerRojoClaro}{RGB}{156,35,72}    % Alias para coherencia
\definecolor{senerGuindaOscuro}{RGB}{98,19,51}  % Guinda oscuro (Pantone 7421 C)
\definecolor{gobmxVerde}{RGB}{30,91,79}         % Verde institucional
\definecolor{gobmxDorado}{RGB}{166,128,45}      % Dorado institucional (Pantone 1255 C)
\definecolor{gobmxGris}{RGB}{152,152,154}       % Gris para textos secundarios
\definecolor{gobmxGrisClaro}{HTML}{F5F5F5}       % Fondo para recuadros
\definecolor{gobmxAmbarClaro}{RGB}{231,210,149} % Ámbar para acentos
\definecolor{highlightOrange}{RGB}{166,128,45}  % Para resaltados (usando el dorado)

% ============================================================================
% 3. TIPOGRAFÍAS INSTITUCIONALES (Patria y Noto Sans)
% ============================================================================

\RequirePackage{iftex}

\ifPDFTeX
  % Configuración para pdfLaTeX (Fallback)
  \RequirePackage[utf8]{inputenc}
  \RequirePackage[T1]{fontenc}
  \RequirePackage{lmodern}
  \newcommand{\patriafont}{\sffamily\bfseries}
  \newcommand{\notosansfont}{\sffamily}
\else
  % Configuración para XeLaTeX (Recomendado)
  \RequirePackage{fontspec}
  \defaultfontfeatures{Ligatures=TeX,Scale=MatchLowercase}
  
  % Tipografía principal: Patria (Títulos y encabezados)
  \IfFileExists{tipografias/Patria_Regular.otf}{
    \newfontfamily\patriafont[
      Path = tipografias/,
      Extension = .otf,
      UprightFont = *_Regular,
      BoldFont = *_Bold,
      ItalicFont = *_Light
    ]{Patria}
  }{
    \newfontfamily\patriafont{Latin Modern Sans} % Fallback
  }
  
  % Tipografía secundaria: Noto Sans (Cuerpo de texto)
  \IfFileExists{tipografias/NotoSans-Regular.ttf}{
    \setmainfont{NotoSans}[
      Path = tipografias/,
      Extension = .ttf,
      UprightFont = *-Regular,
      BoldFont = *-Bold,
      ItalicFont = *-Italic,
      BoldItalicFont = *-BoldItalic,
      Scale = 1.0
    ]
    \setsansfont{NotoSans}[
      Path = tipografias/,
      Extension = .ttf,
      UprightFont = *-Regular,
      BoldFont = *-Bold,
      ItalicFont = *-Italic,
      BoldItalicFont = *-BoldItalic,
      Scale = 1.0
    ]
  }{
    \setmainfont{Latin Modern Roman}
    \setsansfont{Latin Modern Sans}
  }
  
  % Noto Sans Light para fuentes de figuras y detalles
  \IfFileExists{tipografias/NotoSans-Light.ttf}{
    \newfontfamily\notosanslight[
      Path = tipografias/,
      Extension = .ttf,
      UprightFont = *-Light,
      ItalicFont  = *-LightItalic
    ]{NotoSans}
  }{
    \newcommand{\notosanslight}{\sffamily}
  }

  % Definir tamaño de fuente base a 10.5pt (especificación institucional)
  \renewcommand{\normalsize}{\fontsize{10.5pt}{12.6pt}\selectfont}
  \normalsize
\fi

% Comandos de tamaño rápido para Noto Sans
\newcommand{\notosanssmall}{\fontsize{10.5pt}{12.6pt}\selectfont}
\newcommand{\notosanscompact}{\fontsize{9.5pt}{11.2pt}\selectfont}
\newcommand{\notosanstiny}{\fontsize{9.5pt}{11.5pt}\selectfont}
\newcommand{\notosansmicro}{\fontsize{6.5pt}{7.8pt}\selectfont}
\newcommand{\notosansnano}{\fontsize{6.0pt}{7.2pt}\selectfont}
\newcommand{\notosanspico}{\fontsize{6.5pt}{8.0pt}\selectfont}
\newcommand{\notosansfemto}{\fontsize{5.0pt}{6.0pt}\selectfont}

% ============================================================================
% 4. ACCESIBILIDAD Y METADATOS PDF
% ============================================================================

\RequirePackage{accsupp} % Soporte para texto alternativo (Alt text)
\providecommand{\pdftooltip}[2]{#1} % Fallback para tooltips


% Comandos para almacenar metadatos del documento
\newcommand{\@subtitle}{}
\newcommand{\subtitle}[1]{\gdef\@subtitle{#1}}

\newcommand{\@institucion}{Secretaría de Energía}
\newcommand{\institucion}[1]{\gdef\@institucion{#1}}

\newcommand{\@unidad}{Unidad de Planeación Energética}
\newcommand{\unidad}[1]{\gdef\@unidad{#1}}

\newcommand{\DocumentoCorto}{}
\newcommand{\setDocumentoCorto}[1]{\renewcommand{\DocumentoCorto}{#1}}

\newcommand{\@palabrasclave}{}
\newcommand{\palabrasclave}[1]{\gdef\@palabrasclave{#1}}

\newcommand{\@version}{1.0}
\newcommand{\version}[1]{\gdef\@version{#1}}

% Inyección de metadatos al inicio del documento
\AtBeginDocument{
  \@ifpackageloaded{hyperref}{
    \hypersetup{
      pdftitle={\@title},
      pdfauthor={\@institucion},
      pdfsubject={\@subtitle},
      pdfkeywords={\@palabrasclave},
      pdfproducer={Secretaría de Energía - Gobierno de México},
      pdfcreator={LaTeX con clase sener2025},
      pdflang={es-MX}
    }
  }{}
}


% ============================================================================
% 5. CONFIGURACIÓN DE PÁGINA (ENCABEZADOS, PIES Y FONDO)
% ============================================================================

\newdimen\sener@verticalfooterraise
\sener@verticalfooterraise=-1.5mm

% Estilo de página estandarizado (fancy)
\newcommand{\senerhrulefill}{\leavevmode\leaders\hrule height 3.7pt depth -2.7pt \hfill\kern0pt}

\fancypagestyle{fancy}{
  \fancyhf{}
  \fancyhead[L]{}
  \fancyhead[C]{\includegraphics[height=2.0cm]{img/logo_gob.png}}
  \fancyhead[R]{}
  
  % Pie de página alternado (Par a la izquierda, Impar a la derecha)
  % Pie de página alternado (Par a la izquierda, Impar a la derecha)
  \fancyfoot[LE]{\raisebox{\sener@verticalfooterraise}{\makebox[\textwidth][l]{\scriptsize\bfseries\thepage\quad\textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\ \textcolor{gobmxDorado}{\senerhrulefill}}}}
  \fancyfoot[RO]{\raisebox{\sener@verticalfooterraise}{\makebox[\textwidth][r]{\scriptsize\textcolor{gobmxDorado}{\senerhrulefill}\ \textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\quad\bfseries\thepage}}}
  
  \renewcommand{\headrulewidth}{1pt}
  \renewcommand{\headrule}{\vspace{10pt}{\color{gobmxDorado}\hrule width\headwidth height\headrulewidth}}
  \renewcommand{\footrulewidth}{0pt}
  \renewcommand{\footrule}{\vspace{-10pt}{\color{gobmxDorado}\hrule width\headwidth height 0pt}} % Asegurar 0pt
}

% Estilo de página para secciones simples (plain)
\fancypagestyle{plain}{
  \fancyhf{}
  \fancyhead[L]{}
  \fancyhead[R]{}
  \fancyfoot[LE]{\raisebox{\sener@verticalfooterraise}{\makebox[\headwidth][l]{\scriptsize\bfseries\thepage\quad\textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\ \textcolor{gobmxDorado}{\senerhrulefill}}}}
  \fancyfoot[RO]{\raisebox{\sener@verticalfooterraise}{\makebox[\headwidth][r]{\scriptsize\textcolor{gobmxDorado}{\senerhrulefill}\ \textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\quad\bfseries\thepage}}}
  \renewcommand{\headrulewidth}{1pt}
  \renewcommand{\headrule}{\vspace{-35pt}{\color{gobmxDorado}\hrule width\headwidth height\headrulewidth}}
  \renewcommand{\footrulewidth}{0pt}
  \renewcommand{\footrule}{\vspace{-10pt}{\color{gobmxDorado}\hrule width\headwidth height 0pt}} % Asegurar 0pt
}

% Estilo vacío para portadas
\fancypagestyle{portada}{
  \fancyhf{}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
}

\pagestyle{fancy}

% Aplicar fondo institucional "foja blanca" a todas las páginas
% Se define un booleano para desactivarlo en páginas especiales (horizontales)
\newif\ifsener@standardbg
\sener@standardbgtrue

% Booleano global para modo horizontal (multipage support)
\newif\ifsener@horizontalmode
\sener@horizontalmodefalse

% Booleano para forzar el pie de página en primer plano (fix para transición H->V)
\newif\ifsener@forcefooter
\sener@forcefooterfalse

% Booleano para dibujar la línea dorada solo en la primera página horizontal
\newif\ifsener@hfirstpage
\sener@hfirstpagefalse

% Declaración anticipada de comandos de renderizado horizontal
\newcommand{\sener@RenderHorizontalBackground}{}
\newcommand{\sener@RenderHorizontalForeground}{}

\newdimen\sener@bgbleed
\sener@bgbleed=1.5mm
\newcommand{\sener@FullPageGraphic}[1]{%
  \hspace*{-\sener@bgbleed}%
  \raisebox{-\sener@bgbleed}{%
    \includegraphics[width=\dimexpr\paperwidth+2\sener@bgbleed\relax,height=\dimexpr\paperheight+2\sener@bgbleed\relax]{#1}%
  }%
}

\AddToShipoutPictureBG{%
  \ifsener@horizontalmode
    \sener@RenderHorizontalBackground
  \else
    \ifsener@standardbg
      % Fondo vertical desactivado
    \fi
  \fi
}

\AddToShipoutPictureFG{%
  \ifsener@horizontalmode
    \sener@RenderHorizontalForeground
  \else
    \ifsener@forcefooter
      \begin{tikzpicture}[remember picture, overlay]
        % Definir ancho efectivo (Carta 21.59cm - 2.5cm izq - 2.5cm der = 16.59cm)
        \pgfmathsetmacro{\miAncho}{\paperwidth-5cm} 
        
        \ifodd\value{page}
          % IMPAR: Alineado a la derecha
          % Ajuste vertical: 1.1cm desde el borde inferior para bajarlo un poco más (antes 1.2cm)
          \node[anchor=south east, inner sep=0pt, text width=\miAncho pt] 
            at ($(current page.south east) + (-2.5cm, \dimexpr1.1cm+\sener@verticalfooterraise\relax)$) {
              \makebox[\linewidth][r]{\scriptsize\textcolor{gobmxDorado}{\senerhrulefill}\ \textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\quad\bfseries\thepage}
            };
        \else
          % PAR: Alineado a la izquierda
          \node[anchor=south west, inner sep=0pt, text width=\miAncho pt] 
            at ($(current page.south west) + (2.5cm, \dimexpr1.1cm+\sener@verticalfooterraise\relax)$) {
              \makebox[\linewidth][l]{\scriptsize\bfseries\thepage\quad\textcolor{senerGuindaOscuro}{\footnotesize\patriafont\DocumentoCorto}\ \textcolor{gobmxDorado}{\senerhrulefill}}
            };
        \fi
      \end{tikzpicture}
      \global\sener@forcefooterfalse
    \fi
  \fi
}

% ============================================================================
% 6. FORMATO DE TÍTULOS Y PÁRRAFOS
% ============================================================================

% Configuración de párrafo moderno
\setlength{\parindent}{0pt}    % Sin sangría
\setlength{\parskip}{0.5em}    % Espaciado entre párrafos
\linespread{1.15}              % Interlineado ligero
\AtBeginDocument{\raggedbottom} % Evita estiramiento vertical innecesario

% Estilos de Secciones (A–E de la guía institucional)
% A -> \section (Patria 17pt)
\titleformat{\section}
  {\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{senerGuindaOscuro}}
  {\thesection}{0.3em}{}
\titlespacing*{\section}{0pt}{2em}{1em}

% B -> \subsection (Patria 14pt)
\titleformat{\subsection}
  {\patriafont\bfseries\fontsize{14pt}{17pt}\selectfont\color{senerRojoClaro}}
  {\thesubsection}{0.3em}{}
\titlespacing*{\subsection}{0pt}{1.5em}{0.8em}

% C -> \subsubsection (Noto Sans 10.5pt Bold)
\titleformat{\subsubsection}
  {\sffamily\bfseries\fontsize{10.5pt}{12.6pt}\selectfont\color{senerRojoClaro}}
  {\thesubsubsection}{0.3em}{}
\titlespacing*{\subsubsection}{0pt}{1em}{0.5em}

% D -> \paragraph (Noto Sans 10pt Dorado Bold)
\titleformat{\paragraph}
  {\sffamily\bfseries\fontsize{10pt}{12pt}\selectfont\color{gobmxDorado}}
  {\theparagraph}{0.3em}{}
\titlespacing*{\paragraph}{0pt}{0.8em}{0.5em}

% E -> \subparagraph (Noto Sans 10pt Gris Bold)
\titleformat{\subparagraph}
  {\sffamily\bfseries\fontsize{10pt}{12pt}\selectfont\color{gobmxGris}}
  {\thesubparagraph}{0.3em}{}
\titlespacing*{\subparagraph}{0pt}{0.6em}{0.4em}

% ============================================================================
% 7. FIGURAS, TABLAS Y CAPTIONS
% ============================================================================

\RequirePackage{caption}
\RequirePackage{subcaption}

% Estilos de fuente para captions
\DeclareCaptionFont{senerTableFont}{\patriafont\bfseries\fontsize{13pt}{16pt}\selectfont}
\DeclareCaptionFont{senerDescFont}{\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{gobmxGuinda}}

% Formato de lista vacío para suprimir números en LOF y LOT
\DeclareCaptionListFormat{senerEmpty}{}
\DeclareCaptionLabelSeparator{empty}{}

% Configuración base de captions (Global)
\captionsetup{
  format=plain,
  font={normalsize,color=gobmxGuinda},
  labelfont={normalsize,color=gobmxGuinda},
  textfont={normalsize,color=gobmxGuinda},
  labelsep=empty,
  justification=raggedright,
  singlelinecheck=false,
  parskip=0pt,
  labelformat=empty,
  listformat=senerEmpty
}

% Redefinición del estilo de float para figuras institucionales (Forzar izquierda en [H])

\newcommand\floatc@SENERfigure[2]{%
  {\raggedright{\senerDescFont#2}\par}%
}
\newcommand\fs@SENERfigure{%
  \let\@fs@capt\floatc@SENERfigure
  \def\@fs@pre{}\def\@fs@post{}%
  \def\@fs@mid{\vspace\abovecaptionskip\relax}%
  \let\@fs@iftopcapt\iftrue
}
\floatstyle{SENERfigure}
\restylefloat{figure}
\restylefloat{table}


% Ajustes específicos para Tablas
\captionsetup[table]{
  position=top,
  skip=0pt,
  labelsep=empty,
  labelformat=empty,
  listformat=senerEmpty,
  font={senerDescFont},
  labelfont={senerTableFont,color=gobmxGuinda}
}

% Ajustes específicos para Figuras
\captionsetup[figure]{
  position=top,
  skip=3pt,
  width=\textwidth,
  labelsep=empty,
  labelformat=empty,
  listformat=senerEmpty,
  font={senerDescFont},
  labelfont={senerTableFont,color=gobmxGuinda}
}

% Espaciado consistente para floats
\newcommand{\SenerFloatSep}{6pt}
\newcommand{\SenerCaptionSkip}{0pt}
\newcommand{\SenerTableSep}{6pt}

\setlength{\textfloatsep}{\SenerFloatSep plus 1pt minus 1pt}
\setlength{\intextsep}{\SenerFloatSep plus 1pt minus 1pt}  
\setlength{\floatsep}{\SenerFloatSep plus 1pt minus 1pt}
\setlength{\abovecaptionskip}{\SenerCaptionSkip}
\setlength{\belowcaptionskip}{\SenerCaptionSkip}



% ============================================================================
% 8. DISEÑO DE TABLAS (TABULARX, LONGTABLE, XLTABULAR)
% ============================================================================

\RequirePackage{booktabs}
\RequirePackage{array}
\RequirePackage{longtable}
\RequirePackage{multirow}
\RequirePackage{colortbl}
\RequirePackage{tabularx}
\RequirePackage{xltabular}

% Centrado vertical en celdas X
\renewcommand{\tabularxcolumn}[1]{m{#1}}

% Tipos de columnas personalizadas
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcolumntype{C}[1]{>{\centering\arraybackslash}p{#1}}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}
\newcolumntype{B}[1]{>{\raggedright\arraybackslash\bfseries}p{#1}} % Bold
\newcolumntype{M}[1]{>{\centering\arraybackslash\bfseries}p{#1}} % Bold Center
\newcolumntype{N}[1]{>{\raggedleft\arraybackslash\bfseries}p{#1}} % Bold Right
\newcolumntype{G}[1]{>{\raggedright\arraybackslash\color{gobmxGris}}p{#1}} % Gris
\newcolumntype{H}[1]{>{\raggedright\arraybackslash\bfseries\color{gobmxGris}}p{#1}} % Gris Bold

% Tipos de columna flexibles (estilo X)
\newcolumntype{v}{>{\centering\arraybackslash}X}
\newcolumntype{V}{>{\raggedright\arraybackslash\bfseries}X}
\newcolumntype{Y}{>{\raggedright\arraybackslash\bfseries}X}
\newcolumntype{Z}{>{\raggedright\arraybackslash}X} % Left (Alias de v, usado en tablas legacy)
\newcolumntype{E}{>{\centering\arraybackslash}X}
\newcolumntype{F}{>{\raggedleft\arraybackslash}X}

% Configuración de Tablas Largas (SENER)
\newcommand{\SENERLongTableFont}{\notosanspico\sffamily\color{black}}
\newcommand{\SENERLongTableNumFont}{\notosansfemto}
\newcommand{\SENERNum}[1]{{\SENERLongTableNumFont #1}}

% Ancho de primera columna para tablas complejas
\newlength{\SENERLongTableFirstColWidth}
\setlength{\SENERLongTableFirstColWidth}{0.18\textwidth}
\newcolumntype{S}{>{\raggedright\arraybackslash}p{\SENERLongTableFirstColWidth}}
\newcolumntype{Q}{>{\raggedright\arraybackslash\bfseries}p{\SENERLongTableFirstColWidth}}

% Encabezado vertical
\newcommand{\SENERVHeader}[2][2.2cm]{\rotatebox{90}{\parbox{#1}{\centering #2}}}

% Autocarga de estilo en tablas largas
\AtBeginEnvironment{longtable}{\SENERLongTableFont}
\AtBeginEnvironment{xltabular}{\SENERLongTableFont}

% Comandos de formato para encabezados de tabla
\newcommand{\encabezadoguinda}[1]{\cellcolor{gobmxGuinda}\textcolor{white}{\centering\arraybackslash\bfseries #1}}
\newcommand{\encabezadoverde}[1]{\cellcolor{gobmxVerde}\textcolor{white}{\centering\arraybackslash\bfseries #1}}
\newcommand{\encabezadodorado}[1]{\cellcolor{gobmxDorado}\textcolor{white}{\centering\arraybackslash\bfseries #1}}
\newcommand{\encabezadogris}[1]{\cellcolor{gobmxGris}\textcolor{white}{\centering\arraybackslash\bfseries #1}}
\newcommand{\encabezadotabla}[1]{\encabezadoguinda{#1}} % Alias

% --- Entornos de Tablas ---



% Tabla Institucional (Gris)
\newenvironment{tablainstitucional}[1][]{
  \rowcolors{2}{gobmxGrisClaro}{white}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.25}
  \sffamily\notosanstiny
  #1
}{
  \end{table}
}

\newenvironment{tablaguinda}[1][]{
  \rowcolors{2}{gobmxGuinda!10}{white}
  \begin{table}[H]\renewcommand{\arraystretch}{1.25}\sffamily\notosanstiny #1
}{ \end{table} }

\newenvironment{tabladoradoLargo}[1][]{
  \rowcolors{3}{gobmxDorado!12}{white}
  \SENERLongTableFont\renewcommand{\arraystretch}{1.25}\color{black} #1
}{ }

\newenvironment{tabladoradoCorto}[1][]{
  \rowcolors{3}{gobmxDorado!12}{white}
  \begin{table}[H]\centering\SENERLongTableFont\renewcommand{\arraystretch}{1.25}\color{black} #1
}{ \end{table} }

\newenvironment{tablalimpia}[1][]{
  \begin{table}[H]\renewcommand{\arraystretch}{1.25}\sffamily\notosanstiny #1
}{ \end{table} }

% --- Entornos Especiales (Horizontales / Hoja Completa) ---

% Definición global de longitudes para modo horizontal
\newlength{\anchoHorizontal}
\newlength{\alturaDisponible}

% Variable global para acumular notas horizontales
\gdef\sener@notasHorizontales{}

% Comando interno para capturar notas en modo horizontal
\newcommand{\sener@capturarNotaHorizontal}[1]{%
  \footnotemark% Marca normal (incrementa contador)
  \g@addto@macro\sener@notasHorizontales{%
    \textsuperscript{\thefootnote}#1\quad%
  }%
}

  % COMANDOS EXCLUSIVOS PARA MODO HORIZONTAL
  % Comando interno para renderizar el título horizontal con estilo personalizado
  \newcommand{\sener@renderTituloHorizontal}[2]{% #1=Estilo, #2=Texto
    \vspace*{0.8cm} % Bajar el título para evitar encabezado
    \noindent\parbox{\linewidth}{%
      \raggedright#1#2%
    }\par%
    \vspace{0.5cm}% Espacio después
    % Reservar espacio fijo para la imagen
    \gdef\sener@offsetTitulo{3.0cm}%
  }

  % 1. Título Horizontal Simple (Solo visual, estilo Sección)
  \newcommand{\tituloHorizontal}[1]{%
    \sener@renderTituloHorizontal{\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{senerGuindaOscuro}}{#1}%
  }

  % 2. Sección Horizontal (Numerada, TOC, estilo Sección)
  \newcommand{\seccionHorizontal}[1]{%
    \refstepcounter{section}%
    \addcontentsline{toc}{section}{\thesection\hspace{1em}#1}%
    \sener@renderTituloHorizontal{\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{senerGuindaOscuro}}{\thesection\hspace{0.5em}#1}%
  }

  % 3. Subsección Horizontal (Numerada, TOC, estilo Subsección)
  \newcommand{\subseccionHorizontal}[1]{%
    \refstepcounter{subsection}%
    \addcontentsline{toc}{subsection}{\thesubsection\hspace{1em}#1}%
    \sener@renderTituloHorizontal{\patriafont\bfseries\fontsize{14pt}{17pt}\selectfont\color{senerRojoClaro}}{\thesubsection\hspace{0.5em}#1}%
  }

  % Caption personalizado para modo horizontal - alineado a la izquierda
  \newcommand{\captionHorizontal}[1]{%
    \vspace{0.05cm}% espacio ultra pequeño antes del caption
    \begin{center}%
    \parbox{\anchoHorizontal}{%
      \raggedright%
      {\patriafont\fontsize{14pt}{17pt}\selectfont\color{gobmxGuinda}#1}%
    }%
    \end{center}%
    \vspace{0.05cm}% espacio ultra pequeño después del caption
  }
  
  % Fuente personalizada para modo horizontal - subida más para evitar cinta amarilla
  \newcommand{\fuenteHorizontal}[1]{%
    \vspace{-0.5cm}% Ajuste fino: Subir ligeramente para acercar a la imagen sin empalmar
    \begin{center}%
    \parbox{\anchoHorizontal}{%
      \raggedright\notosanslight\fontsize{8pt}{10pt}\selectfont\color{gobmxGris}FUENTE:~#1%
    }%
    \end{center}%
  }
  
  % Comando auxiliar para ajustar altura extra dinámicamente
  % Por defecto es 0cm (altura estándar con margen seguro de 4.5cm).
  % Si se usa \sinNotas, agregamos altura extra SIN mover márgenes de página.
  \gdef\sener@alturaExtra{0cm}
  
  \newcommand{\sinNotas}{%
    \gdef\sener@alturaExtra{2.5cm}% Agregamos 2.5cm extra para maximizar altura al límite
  }

  % Imagen específica para modo horizontal - reservando espacio dinámico
  \newcommand{\imagenHorizontal}[2]{%
    % 1. Definir reserva base para Caption y Fuente (2.2cm)
    \def\sener@reserveBottom{2.2cm}
    
    % 2. Si hay notas al pie capturadas, aumentar la reserva (+1.2cm)
    \ifx\sener@notasHorizontales\empty\else
      \edef\sener@reserveBottom{\the\dimexpr\sener@reserveBottom+1.2cm\relax}
    \fi

    % 3. Calcular altura máxima disponible para la imagen
    % Altura = textheight - ReservaInferior - OffsetTitulo
    % (sener@offsetTitulo es 0pt si no hay título, o 3.0cm si lo hay)
    \setlength{\alturaDisponible}{\dimexpr\textheight-\sener@reserveBottom-\sener@offsetTitulo\relax}%

    % 4. Renderizar imagen
    % Usamos width=\linewidth para ocupar todo el ancho.
    % Eliminamos 'keepaspectratio' para FORZAR que se estire al ancho completo, aunque se deforme un poco.
    % Esto asegura que la imagen llene el espacio horizontal reservado.
    \noindent\includegraphics[width=\linewidth,height=\alturaDisponible]{#1}%
    
    % 5. Etiquetas y contadores
    \phantomsection%
    \addtocounter{figure}{1}%
    \def\@currentlabelname{Figura Horizontal}%
    \label{#2}%
  }

  % ============================================================================
  % IMPLEMENTACIÓN DE RENDERIZADO HORIZONTAL GLOBAL (MULTIPAGE)
  % ============================================================================
  
  \renewcommand{\sener@RenderHorizontalBackground}{%
    % Fondo horizontal desactivado
  }

  \renewcommand{\sener@RenderHorizontalForeground}{%
    \begin{tikzpicture}[remember picture, overlay]
        % Línea Dorada (Encabezado) - Visual Top
        % Solo se dibuja en la PRIMERA página de la secuencia horizontal
        \ifsener@hfirstpage
          \draw[gobmxDorado, line width=1pt] 
            ($(current page.south west) + (2.5cm, 2cm)$) -- ($(current page.north west) + (2.5cm, -2.5cm)$);
          \node[anchor=center, rotate=90, inner sep=0pt] 
            at ($(current page.west) + (1.25cm, 0)$) {
              \includegraphics[height=2.0cm]{img/logo_gob.png}
            };
         % \global\sener@hfirstpagefalse % Apagar para las siguientes páginas
        \fi
  
        % Lógica alternada para página Par/Impar en modo horizontal
        \ifodd\value{page}
          % --- PÁGINA IMPAR (ODD) --- Visual Bottom Right ---
          % Número de página
          \node[anchor=center, rotate=90, font=\bfseries\sffamily\scriptsize, color=black] 
            at ($(current page.north east) + (-1.3cm, -2.5cm)$) {\thepage};
             
          % Nombre Corto del Documento (A la izquierda del número)
          \node[anchor=east, rotate=90, font=\footnotesize\patriafont, color=senerGuindaOscuro, inner sep=0pt] (tituloH)
            at ($(current page.north east) + (-1.3cm, -3.2cm)$) {\DocumentoCorto};
  
          % Línea de Pie de Página (Hacia la izquierda)
          \draw[gobmxDorado, line width=1pt] 
            ($(tituloH.west) + (0, -0.2cm)$) -- ($(current page.south east) + (-1.3cm, 2cm)$);
            
        \else
          % --- PÁGINA PAR (EVEN) --- Visual Bottom Left ---
          % Número de página (Esquina inferior izquierda visual)
          \node[anchor=center, rotate=90, font=\bfseries\sffamily\scriptsize, color=black] 
            at ($(current page.south east) + (-1.3cm, 2.5cm)$) {\thepage};
            
          % Nombre Corto del Documento (A la derecha del número visualmente)
          \node[anchor=west, rotate=90, font=\footnotesize\patriafont, color=senerGuindaOscuro, inner sep=0pt] (tituloH)
            at ($(current page.south east) + (-1.3cm, 3.2cm)$) {\DocumentoCorto};
            
          % Línea de Pie de Página (Hacia la derecha)
          % Desde el final del título (Visual Right end -> east anchor rotated) hasta margen derecho visual
          \draw[gobmxDorado, line width=1pt] 
            ($(tituloH.east) + (0, 0.2cm)$) -- ($(current page.north east) + (-1.3cm, -2.5cm)$);
        \fi

        % Renderizar notas al pie acumuladas (Siempre alineadas a la izquierda visual)
        \ifx\sener@notasHorizontales\empty\else
          \node[anchor=south west, rotate=90, font=\sffamily\fontsize{8pt}{10pt}\selectfont\color{black}, align=justify, text width=22cm, inner sep=0pt] 
            at ($(current page.south east) + (-2.0cm, 2.5cm)$) {\sener@notasHorizontales};
        \fi

    \end{tikzpicture}%
  }

% Entorno para Figura Horizontal (Página completa, solo hoja horizontal limpia)
\newenvironment{figuraespecial}{%
  \clearpage
  \sener@standardbgfalse % Desactivar fondo vertical global
  % Inicializar variables
  \gdef\sener@offsetTitulo{0pt}%
  \gdef\sener@alturaExtra{0cm}%
  \gdef\sener@notasHorizontales{}% Limpiar notas previas
  
  % Redefinir footnote para capturar en lugar de imprimir
  \let\oldfootnote\footnote
  \renewcommand{\footnote}[1]{\sener@capturarNotaHorizontal{##1}}
  
  \global\sener@hfirstpagetrue % Activar dibujo de línea dorada en la primera página

  % Márgenes optimizados para modo horizontal:
  % landscape geometry mapping:
  %   left   -> Visual Bottom (Espacio para pie de página)
  %   right  -> Visual Top    (Espacio para encabezado)
  %   top    -> Visual Right  (Margen derecho visual)
  %   bottom -> Visual Left   (Margen izquierdo visual)
  %
  % Configuración solicitada en GUIA_MODO_HORIZONTAL.md:
  %   Visual Top (right en guía, left en código) = 3cm (Espacio seguro para encabezado)
  %   Visual Bottom (left en guía, right en código) = 2.5cm (Espacio para pie de página)
  %   Visual Right (top)   = 2.5cm (Alineado con fin de línea dorada superior)
  %   Visual Left (bottom) = 2.0cm (Alineado con inicio de líneas doradas)
  \newgeometry{left=3cm,right=2.5cm,top=2.5cm,bottom=2cm} 
  \begin{landscape}
  \thispagestyle{empty} % Sin headers/footers estándar
  \pagestyle{empty}
  \sener@horizontalmodetrue % MODO HORIZONTAL GLOBAL
  
  % ANCHO EXCLUSIVO PARA MODO HORIZONTAL (Maximizado)
  \setlength{\anchoHorizontal}{1.0\linewidth}
  
  % Configurar captions para usar el ancho horizontal exclusivo - alineado a la izquierda
  \captionsetup{width=\anchoHorizontal,justification=raggedright}
  
}{%
  \vfill
  \end{landscape}
  \restoregeometry
  \setlength{\headwidth}{\textwidth} % Re-sincronizar ancho de encabezado
  \fancyhfoffset[LE,RO]{0pt}
  \sener@horizontalmodefalse % DESACTIVAR MODO HORIZONTAL
  \sener@standardbgtrue % Reactivar fondo vertical global
  \clearpage % PRIMERO limpiamos la página horizontal saliente
  \thispagestyle{fancy} % FORZAR estilo en la página actual (la nueva vertical)
  \pagestyle{fancy} % LUEGO restauramos el estilo vertical permanente
  \renewcommand{\footrulewidth}{0pt} % Asegurar que no haya línea extraña
  \renewcommand{\headrulewidth}{1pt} % Restaurar ancho de línea de encabezado
  \global\sener@forcefootertrue % ACTIVAR PARCHE VISUAL PARA ESTA PÁGINA
}

% Entorno para Tabla Horizontal (Página completa, márgenes ajustados)
\newenvironment{tablaespecial}{%
  \clearpage
  \sener@standardbgfalse % Desactivar fondo vertical global
  % Inicializar variables
  \gdef\sener@notasHorizontales{}% Limpiar notas previas
  
  % Redefinir footnote para capturar en lugar de imprimir
  \let\oldfootnote\footnote
  \renewcommand{\footnote}[1]{\sener@capturarNotaHorizontal{##1}}

  \global\sener@hfirstpagetrue % Activar dibujo de línea dorada en la primera página

  % Configuración solicitada en GUIA_MODO_HORIZONTAL.md:
  %   Visual Top (right en guía, left en código) = 3cm (Espacio seguro para encabezado)
  %   Visual Bottom (left en guía, right en código) = 2.5cm (Espacio para pie de página)
  %   Visual Right (top)   = 2.5cm (Alineado con fin de línea dorada superior)
  %   Visual Left (bottom) = 2.0cm (Alineado con inicio de líneas doradas)
  \newgeometry{left=3cm,right=2.5cm,top=2.5cm,bottom=2cm} 
  \begin{landscape}
  \thispagestyle{empty} % Sin headers/footers estándar
  \pagestyle{empty}
  \sener@horizontalmodetrue % MODO HORIZONTAL GLOBAL
  
  % ANCHO EXCLUSIVO PARA MODO HORIZONTAL (Maximizado)
  \setlength{\anchoHorizontal}{1.0\linewidth}
  
  % Configurar captions para usar el ancho horizontal exclusivo - alineado a la izquierda
  \captionsetup{width=\anchoHorizontal,justification=raggedright}
  
}{%
  \vfill
  \end{landscape}
  \restoregeometry
  \setlength{\headwidth}{\textwidth} % Re-sincronizar ancho de encabezado
  \fancyhfoffset[LE,RO]{0pt}
  \sener@horizontalmodefalse % DESACTIVAR MODO HORIZONTAL
  \sener@standardbgtrue % Reactivar fondo vertical global
  \clearpage % Asegurar que la siguiente página empiece limpia
  \thispagestyle{fancy} % FORZAR estilo en la página actual (la nueva vertical)
  \pagestyle{fancy} % Forzar la restauración del estilo de página vertical (encabezado/pie)
  \renewcommand{\footrulewidth}{0pt}
  \renewcommand{\headrulewidth}{1pt} % Restaurar ancho de línea de encabezado
  \global\sener@forcefootertrue % ACTIVAR PARCHE VISUAL PARA ESTA PÁGINA
}

% ============================================================================
% 9. BIBLIOGRAFÍA Y ENLACES
% ============================================================================

\RequirePackage[
  backend=biber,
  style=verbose-ibid,
  sorting=nyt,
  citestyle=verbose-ibid
]{biblatex}

% Corrección de idioma para biblatex
\DeclareLanguageMapping{mexican}{spanish}
\addbibresource{referencias.bib}
\setlength{\bibhang}{0pt}
\setlength{\bibitemsep}{1em}

\RequirePackage{hyperref}
\hypersetup{
  colorlinks=true,
  linkcolor=gobmxGris,
  filecolor=gobmxDorado,
  urlcolor=gobmxGuinda,
  citecolor=gobmxVerde,
  bookmarksnumbered=true,
  pdfborder={0 0 0}
}

% ============================================================================
% 10. RECUADROS Y CAJAS DESTACADAS (TCOLORBOX)
% ============================================================================

\RequirePackage{tcolorbox}
\tcbuselibrary{skins,breakable}

% Estilo base para recuadros informativos
\newtcolorbox{recuadro}[1][]{
  colback=gobmxGrisClaro, colframe=gobmxGuinda, boxrule=1.5pt,
  arc=3mm, left=10pt, right=10pt, top=10pt, bottom=10pt, breakable, #1
}

% Cajas con título e iconos
\newtcolorbox{notaimportante}[1][]{
  colback=gobmxGuinda!5, colframe=gobmxGuinda, boxrule=2pt, arc=2mm,
  left=10pt, right=10pt, top=10pt, bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de advertencia}}\faExclamationTriangle\EndAccSupp{}\ \ \textbf{Nota importante}},
  fonttitle=\bfseries\color{white}, colbacktitle=gobmxGuinda, breakable, #1
}

\newtcolorbox{definicion}[1][]{
  colback=gobmxVerde!5, colframe=gobmxVerde, boxrule=1.5pt, arc=2mm,
  left=10pt, right=10pt, top=10pt, bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de libro}}\faBook\EndAccSupp{}\ \ \textbf{Definición}},
  fonttitle=\bfseries\color{white}, colbacktitle=gobmxVerde, breakable, #1
}

\newtcolorbox{ejemplo}[1][]{
  colback=gobmxAmbarClaro!10, colframe=gobmxDorado, boxrule=1.5pt, arc=2mm,
  left=10pt, right=10pt, top=10pt, bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de bombilla}}\faLightbulb\EndAccSupp{}\ \ \textbf{Ejemplo}},
  fonttitle=\bfseries\color{white}, colbacktitle=gobmxDorado, breakable, #1
}

\newtcolorbox{resumenejecutivo}[1][]{
  enhanced, colback=gobmxGuinda!3, colframe=gobmxGuinda, boxrule=2pt,
  arc=0mm, left=15pt, right=15pt, top=15pt, bottom=15pt,
  title={\Large\textbf{Resumen Ejecutivo}}, fonttitle=\bfseries\color{white},
  colbacktitle=gobmxGuinda, attach boxed title to top left={yshift=-3mm,xshift=5mm},
  boxed title style={sharp corners}, breakable, #1
}

% ============================================================================
% 11. ELEMENTOS VISUALES MODERNOS Y AVANZADOS
% ============================================================================

% Resaltado de texto (Caja naranja)
\newcommand{\highlight}[1]{\colorbox{highlightOrange}{\strut\textbf{\textcolor{white}{#1}}}}

% Cita destacada (Pull Quote) con diseño TikZ
\newenvironment{destacado}[1][]{
  \begin{center}\begin{tikzpicture}
    \node[text width=0.85\textwidth, align=center, font=\Large\itshape\color{gobmxGuinda}, inner sep=20pt] (quote) {``#1''};
    \node[opacity=0.2, scale=4, color=gobmxDorado] at (quote.north west) {``};
    \node[opacity=0.2, scale=4, color=gobmxDorado] at (quote.south east) {''};
  \end{tikzpicture}\end{center}
}{}

% Letra Capital (Lettrine)
\newcommand{\letraCapital}[2]{%
  \lettrine[lines=3, lhang=0.33, nindent=0em, findent=3pt, realheight=true]{\color{gobmxGuinda}#1}{#2}%
}

% Código QR
\newcommand{\qrlink}[1]{\qrcode[height=2.5cm]{#1}}

% Notas al margen con icono
\newcommand{\notaMargen}[1]{%
  \marginnote{\footnotesize\color{gobmxGuinda}\sffamily\raggedright%
    \BeginAccSupp{method=escape,ActualText={Icono de información}}\faInfoCircle\EndAccSupp{}\ #1}%
}

% Etiquetas tipo "Badge/Pill"
\newcommand{\badge}[2][gobmxGuinda]{%
  \tikz[baseline=(badge.base)]{\node[inner sep=3pt, rounded corners=3pt, fill=#1, text=white, font=\tiny\sffamily\bfseries, minimum height=1.2em] (badge) {#2};}%
}

% Barra de progreso
\newcommand{\progressbar}[3][gobmxVerde]{%
  \begin{tikzpicture}[baseline=-0.5ex]
    \fill[gobmxGrisClaro] (0,0) rectangle (4,0.3);
    \fill[#1] (0,0) rectangle ({4*#2/100},0.3);
    \draw[gobmxGris,line width=0.5pt] (0,0) rectangle (4,0.3);
    \node[right,font=\small\sffamily] at (4.1,0.15) {#3};
  \end{tikzpicture}%
}

% Callouts estilo GitHub
\newtcolorbox{calloutTip}[1][Consejo]{
  colback=gobmxVerde!5, colframe=gobmxVerde, boxrule=0pt, leftrule=4pt, arc=0mm,
  left=8pt, right=8pt, top=8pt, bottom=8pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de bombilla}}\faLightbulb\EndAccSupp{}\ \ \textbf{#1}},
  fonttitle=\bfseries\color{gobmxVerde}, colbacktitle=gobmxVerde!5, breakable
}

\newtcolorbox{calloutWarning}[1][Advertencia]{
  colback=gobmxAmbarClaro, colframe=gobmxDorado, boxrule=0pt, leftrule=4pt, arc=0mm,
  left=8pt, right=8pt, top=8pt, bottom=8pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de advertencia}}\faExclamationTriangle\EndAccSupp{}\ \ \textbf{#1}},
  fonttitle=\bfseries\color{gobmxDorado}, colbacktitle=gobmxDorado!5, breakable
}

% Timeline (Línea de tiempo)
\newenvironment{timeline}{
  \begin{center}\begin{tikzpicture}[
    timeline/.style={draw=gobmxGuinda, line width=2pt},
    event/.style={circle, fill=gobmxDorado, inner sep=3pt, minimum size=8pt},
    eventlabel/.style={font=\small\sffamily, text width=3cm, align=center}
  ]
}{ \end{tikzpicture}\end{center} }

\newcommand{\evento}[3]{
  \node[event] at (#1,0) {};
  \node[eventlabel,above] at (#1,0.3) {\textbf{#2}};
  \node[eventlabel,below] at (#1,-0.3) {#3};
}

% ============================================================================
% 12. COMANDOS DE PORTADA Y SECCIÓN
% ============================================================================



% Portada Institucional Estándar
\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{portada}
    \IfFileExists{img/portada.png}{%
      \AddToShipoutPictureBG*{ \AtPageLowerLeft{ \sener@FullPageGraphic{img/portada.png} } }%
    }{}
    \begin{center}
      \vspace*{3.5cm}
      {\Large\bfseries\color{gobmxGris} PLAN DE}\\[1cm]
      {\Huge\bfseries\color{gobmxDorado}\@title}\\[0.8cm]
      \ifx\@subtitle\empty\else {\LARGE\color{gobmxGuinda}\@subtitle}\\[3cm] \fi
      \vfill
      \IfFileExists{img/logo_gob.png}{ \includegraphics[height=1.5cm]{img/logo_gob.png} }{}
    \end{center}
  \end{titlepage}
  \clearpage
}

% Portada con fondo personalizado
\newcommand{\portadafondo}[1][img/portada.png]{%
  \begin{titlepage}
    \thispagestyle{portada}
    \IfFileExists{#1}{%
      \AddToShipoutPictureBG*{ \AtPageLowerLeft{ \sener@FullPageGraphic{#1} } }%
    }{ \AddToShipoutPictureBG*{ \AtPageLowerLeft{ \color{gobmxGuinda}\rule{\paperwidth}{\paperheight} } } }
    \vfill\null
  \end{titlepage}
  \clearpage
}

% Portada de Sección Destacada
\newcommand{\portadaseccion}[3]{
  \clearpage\thispagestyle{empty}
  \begingroup\color{white}
    \IfFileExists{img/fondo_guinda.png}{%
      \AddToShipoutPictureBG*{ \AtPageLowerLeft{ \sener@FullPageGraphic{img/fondo_guinda.png} } }%
    }{}
    \vspace*{\fill}
    \begin{center}
      \if\relax\detokenize{#1}\relax\else {\fontsize{80}{80}\selectfont\bfseries #1}\par\vspace{0.5cm} \fi
      \if\relax\detokenize{#2}\relax\else {\Huge\bfseries\patriafont\color{gobmxAmbarClaro} #2}\par\vspace{1cm} \fi
      \if\relax\detokenize{#3}\relax\else {\Large #3}\par \fi
    \end{center}
    \vspace*{\fill}
  \endgroup\clearpage
}

% Contraportada
\newcommand{\contraportada}[2][img/contraportada.png]{
  \clearpage\thispagestyle{plain}
  \vspace*{1cm}
  \begin{center}
    \color{gobmxGris}
    {\large\textbf{\textcolor{gobmxGuinda}{\@title}}}\\[0.3cm]
    \ifx\@subtitle\empty\else \@subtitle\\[1cm] \fi
    {\small \textbf{\textcolor{gobmxDorado}{\@institucion}}\\ \@unidad\\[0.5cm] #2 }
  \end{center}
  \vfill
  \begin{center} \color{gobmxGris} {\small \textcolor{gobmxGris}{\@date} } \end{center}
  \vspace*{-1.5cm}\clearpage
  \thispagestyle{empty}
  \IfFileExists{#1}{ \AddToShipoutPictureBG*{ \AtPageLowerLeft{ \sener@FullPageGraphic{#1} } } }{}
  \null\clearpage
}

% Directorio
\newcommand{\paginacreditos}[1]{
  \clearpage\thispagestyle{plain}
  \begin{center} {\Large\bfseries\color{gobmxGuinda} Directorio}\\[1cm] \end{center}
  \vspace*{2cm} #1 \vspace*{\fill}\clearpage
}



% ============================================================================
% 13. ÍNDICES Y TABLAS DE CONTENIDO
% ============================================================================



% Centrado de títulos de índices
\renewcommand\tableofcontents{%
  \clearpage \begin{center} {\Large\patriafont\bfseries\color{gobmxGuinda}\contentsname}\\[1cm] \end{center}
  \@starttoc{toc}
}

\newcommand{\listatablas}{
  \clearpage \begin{center} {\Large\patriafont\bfseries\color{gobmxGuinda}Índice de Tablas}\\[1cm] \end{center}
  \@starttoc{lot}
}

\newcommand{\listafiguras}{
  \clearpage \begin{center} {\Large\patriafont\bfseries\color{gobmxGuinda}Índice de Figuras}\\[1cm] \end{center}
  \@starttoc{lof}
}

% Redefinición de entradas en listas (sin número, margen cero)
\renewcommand*\l@figure{\@dottedtocline{1}{0em}{0em}}
\renewcommand*\l@table{\@dottedtocline{1}{0em}{0em}}

% Configuración de los puntos en el TOC
\renewcommand{\@dotsep}{1.5}
\renewcommand{\@tocrmarg}{5em}
\renewcommand{\@pnumwidth}{3em}



% ============================================================================
% 14. ANEXOS Y AJUSTES DE TOC
% ============================================================================



\newif\ifsener@appendix
\sener@appendixfalse

% Ajuste para el TOC en anexos (evitar empalme de texto largo "Anexo A")
\newdimen\SENER@appendixsecnumwidth
\newcommand{\SENERAppendixTOCSetup}{%
  \begingroup \settowidth{\@tempdima}{Anexo\ A\hspace{0.4em}} \global\SENER@appendixsecnumwidth=\@tempdima \endgroup
  \renewcommand*\l@section{\@dottedtocline{1}{1.5em}{\SENER@appendixsecnumwidth}}
  \renewcommand*\l@subsection{\@dottedtocline{2}{3.8em}{3.0em}}
}

\newcommand{\anexos}{%
  \clearpage\appendix\sener@appendixtrue
  \setcounter{section}{0}
  \renewcommand{\thesection}{\Alph{section}}
  \renewcommand{\thesubsection}{\Alph{section}.\arabic{subsection}}
  \titleformat{\section}
    {\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{gobmxGuinda}}
    {Anexo~\thesection}{0.3em}{}
  \SENERAppendixTOCSetup
  \addtocontents{toc}{\protect\SENERAppendixTOCSetup}
}



% ============================================================================
% 15. COMPONENTES DE TEXTO Y GLOSARIOS
% ============================================================================

% Fuente de gráfico/tabla (貼 debajo de la figura)
\newcommand{\fuente}[1]{%
  \vspace*{-12pt}
  \par\noindent
  {\raggedright\notosanslight\fontsize{8pt}{10pt}\selectfont\color{gobmxGris} FUENTE:~#1\hfill}
  \par\vspace{6pt}
}

% Entradas de Glosario y Siglas
\newcommand{\entradaGlosario}[2]{\par\noindent{\notosanssmall\textbf{#1} -- #2}\par}
\newcommand{\entradaSigla}[2]{\par\noindent{\notosanssmall\textbf{#1} -- #2}\par}

% --- Listas personalizadas (Compactas) ---
% --- Listas personalizadas (Compactas) ---
\setlist{noitemsep, topsep=0.15em, parsep=0pt, partopsep=0pt}
\setlist[itemize,1]{label=\textbullet, leftmargin=2.5em, labelsep=0.5em}
\setlist[itemize,2]{label=--, leftmargin=2em, labelsep=0.5em}

% Final de la clase
\endinput
