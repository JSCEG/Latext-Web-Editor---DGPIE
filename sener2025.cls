%!TEX TS-program = xelatex
\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{sener2025}[2025/11/21 Plantilla institucional SENER - Versión completa]

% Basado en article tamaño carta, 12pt
\LoadClass[12pt,letterpaper,twoside]{article}

% ============================================================================
% PAQUETES BÁSICOS
% ============================================================================
% babel se carga una sola vez con opciones completas
\RequirePackage[spanish,mexico,es-tabla]{babel}
\RequirePackage[left=2.5cm,right=2.5cm,top=3.5cm,bottom=3.5cm,headheight=15pt,headsep=1cm,footskip=1.5cm]{geometry}
\RequirePackage[final]{graphicx}
% Configuración PDF por motor
\ifPDFTeX
  \pdfminorversion=7
  \pdfobjcompresslevel=0
\else
  \ifdefined\XeTeXversion
    \special{pdf:minorversion 7}
    \special{pdf:objcompresslevel 0}
  \fi
\fi
\RequirePackage{float} % Para usar [H] en figuras y tablas
\RequirePackage[table]{xcolor}
\RequirePackage{titlesec}
\RequirePackage{fontawesome5}
\RequirePackage{fancyhdr}
\setlength{\headheight}{45pt}

% ============================================================================
% COLORES INSTITUCIONALES
% ============================================================================
\definecolor{gobmxGuinda}{RGB}{156,35,72}
\definecolor{gobmxVerde}{RGB}{30,91,79}
\definecolor{gobmxDorado}{RGB}{166,128,45}
\definecolor{gobmxGris}{RGB}{152,152,154}
\definecolor{gobmxGrisClaro}{HTML}{F5F5F5}
\definecolor{gobmxAmbarClaro}{RGB}{231,210,149}

% ============================================================================
% TIPOGRAFÍAS INSTITUCIONALES
% ============================================================================
% Carga de fuentes por motor LaTeX (no por existencia de fontspec)

\RequirePackage{iftex}

\ifPDFTeX
  % pdfLaTeX: usar inputenc + fontenc + fuentes tradicionales
  \RequirePackage[utf8]{inputenc}
  \RequirePackage[T1]{fontenc}
  \RequirePackage{lmodern}
  \newcommand{\patriafont}{\sffamily\bfseries}
  \newcommand{\notosansfont}{\sffamily}
\else
  % XeLaTeX/LuaLaTeX: usar fontspec
  \RequirePackage{fontspec}
  \defaultfontfeatures{Ligatures=TeX,Scale=MatchLowercase}
  
  % Tipografía principal: Patria (para títulos y encabezados)
  \IfFileExists{tipografias/Patria_Regular.otf}{
    \newfontfamily\patriafont[
      Path = tipografias/,
      Extension = .otf,
      UprightFont = *_Regular,
      BoldFont = *_Bold,
      ItalicFont = *_Light
    ]{Patria}
  }{
    % Fallback para Patria
    \newfontfamily\patriafont{Latin Modern Sans}
  }
  
  % Tipografía secundaria: Noto Sans (para cuerpo de texto)
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
    % Fallback si no están las fuentes personalizadas
    \setmainfont{Latin Modern Roman}
    \setsansfont{Latin Modern Sans}
  }
  
  \newcommand{\notosansfont}{\sffamily}
\fi


% Fallback commands ya definidos arriba según el motor

% ============================================================================
% PAQUETES DE ACCESIBILIDAD PDF/UA
% ============================================================================
% Hyperref se carga más adelante con configuración específica

% Estructura semántica básica con accsupp
\RequirePackage{accsupp}

% Fallback: algunos documentos generados usan \pdftooltip para anotaciones/alt.
% Si no hay paquete que lo defina, evitamos que falle la compilación.
\providecommand{\pdftooltip}[2]{#1}

% ============================================================================
% Packages for functionality and bibliography
% ============================================================================
\RequirePackage{enumitem}
\RequirePackage{tcolorbox}
\tcbuselibrary{skins,breakable}
\RequirePackage{caption}
\RequirePackage{subcaption}
\RequirePackage{csquotes}
\RequirePackage{booktabs}
\RequirePackage{array}
\RequirePackage{longtable}
\RequirePackage{multirow}
% NOTA: No usamos tocloft.
% Con documentos que usan \DocumentMetadata (LaTeX 2025+), el kernel carga
% latex-lab-testphase-toc y redefine \@starttoc; tocloft detecta esto y "bails out",
% pudiendo dejar el TOC/LOF/LOT en un estado inconsistente.
% Preferimos mantener el mecanismo nativo (y compatibilidad con hyperref).

% Compatibilidad: si un .toc viejo trae ajustes de tocloft (\cft...),
% evitamos errores aunque ya no usemos ese paquete.
% Importante: preservamos el catcode original de '@' para no romper la clase.
\chardef\SENER@AtCatcode=\catcode`\@\relax
\catcode`\@=11\relax
\@ifundefined{cftsecnumwidth}{\newlength\cftsecnumwidth}{}
\@ifundefined{cftsubsecnumwidth}{\newlength\cftsubsecnumwidth}{}
\@ifundefined{cftsecindent}{\newlength\cftsecindent}{}
\@ifundefined{cftsubsecindent}{\newlength\cftsubsecindent}{}
\catcode`\@=\SENER@AtCatcode\relax
\let\SENER@AtCatcode\relax

% Ajuste local para el TOC en anexos:
% - Evita empalme de "Anexo A" con el título
% - Pero sin dejar un hueco exagerado; buscamos que el espaciado se parezca al
%   de secciones normales ("2", "2.1", "2.1.1").
\newdimen\SENER@appendixsecnumwidth
\newcommand{\SENERAppendixTOCSetup}{%
  \makeatletter
  % Calcula un ancho "justo" para el número ("Anexo A") + un pequeño colchón.
  \begingroup
    \settowidth{\@tempdima}{Anexo\ A\hspace{0.4em}}%
    \global\SENER@appendixsecnumwidth=\@tempdima
  \endgroup
  % Sección de anexo: mantiene el indent estándar de \section (1.5em), pero con
  % numwidth calculado (en vez de 6em fijo).
  \renewcommand*\l@section{\@dottedtocline{1}{1.5em}{\SENER@appendixsecnumwidth}}%
  % Sub-secciones de anexo: parecido a article, pero con un numwidth apenas menor
  % para reducir el hueco entre "A.1" y el título.
  \renewcommand*\l@subsection{\@dottedtocline{2}{3.8em}{3.0em}}%
  \makeatother
}

% Configuración de puntos en TOC con más espaciado
\renewcommand{\@dotsep}{1.5}

% Configuración de espaciado en TOC usando comandos nativos
% Más espacio entre puntos y números de página
\renewcommand{\@tocrmarg}{5em}
\renewcommand{\@pnumwidth}{3em}
\RequirePackage{colortbl}
\RequirePackage{tabularx}
\RequirePackage{pdfpages}
\RequirePackage{eso-pic}
\RequirePackage{tikz}
\RequirePackage{multicol}
\RequirePackage{microtype}
\RequirePackage{lettrine}
\RequirePackage{qrcode}
\RequirePackage{marginnote}
\RequirePackage[flushmargin]{footmisc}
% babel ya cargado arriba, solo aplicamos decimalpoint
\decimalpoint

% Definición de tamaño de fuente 10.5pt para tablas y glosario
\newcommand{\notosanssmall}{\fontsize{10.5pt}{12.6pt}\selectfont}
\newcommand{\notosanscompact}{\fontsize{9.5pt}{11.2pt}\selectfont}

% ============================================================================
% CONFIGURACIÓN DE CAPTIONS
% ============================================================================
% Configuración unificada para todos los captions
\captionsetup{
  format=plain,                        % Evita heredar centrado del float
  font={small,color=gobmxGris},        % Texto en gris y pequeño
  labelfont={footnotesize,color=gobmxGris},    % Etiqueta en gris y más pequeña
  textfont={small,color=gobmxGris},    % Texto en gris
  labelsep=period,                      % Separador punto: "Figura 1. Descripción"
  justification=raggedright,           % Alineación a la izquierda
  singlelinecheck=false,               % No centrar títulos cortos
  margin=0pt,
  parskip=0pt
}

% IMPORTANTE: con placement [H], el paquete `float` NO usa la rutina estándar
% de captions; usa su propio formateador (`\@fs@capt`), cuyo estilo `plain`
% centra captions cortos. Para figuras institucionales lo forzamos a izquierda.
\makeatletter
\newcommand\floatc@SENERfigure[2]{%
  {\footnotesize\color{gobmxGris}\raggedright #1.\ #2\par}%
}
\newcommand\fs@SENERfigure{%
  \let\@fs@capt\floatc@SENERfigure
  \def\@fs@pre{}\def\@fs@post{}%
  \def\@fs@mid{\vspace\abovecaptionskip\relax}%
  \let\@fs@iftopcapt\iffalse
}
\makeatother
\floatstyle{SENERfigure}
\restylefloat{figure}

% FIX: Configuración específica para tablas (espaciado reducido)
\captionsetup[table]{
  position=top,
  skip=3pt,                    % FIX: Reducido de 8pt
  format=plain,
  justification=raggedright,
  singlelinecheck=false,
  labelfont={footnotesize,color=gobmxGris},
  textfont={small,color=gobmxGris},
  font={small,color=gobmxGris}
}

% FIX: Configuración específica para figuras (espaciado reducido)
\captionsetup[figure]{
  position=bottom,
  skip=3pt,                    % FIX: Reducido de 8pt
  format=plain,
  width=\textwidth,
  justification=raggedright,
  singlelinecheck=false,
  margin=0pt,
  parskip=0pt,
  labelfont={footnotesize,color=gobmxGris},
  textfont={footnotesize,color=gobmxGris},
  font={footnotesize,color=gobmxGris}
}

% Cambiar "Cuadro" a "Tabla" para tablas en español
\AtBeginDocument{
  \renewcommand{\tablename}{Tabla}

  % Refuerzo tardío: con latex-lab/testphase algunos defaults de caption/floats
  % pueden activarse en \AtBeginDocument; volvemos a fijar SOLO figuras aquí.
  \captionsetup[figure]{
    format=plain,
    width=\textwidth,
    justification=raggedright,
    singlelinecheck=false,
    margin=0pt,
    parskip=0pt,
    labelfont={footnotesize,color=gobmxGris},
    textfont={footnotesize,color=gobmxGris},
    font={footnotesize,color=gobmxGris}
  }
}

% FIX: Para longtable, usar espaciado reducido
\captionsetup[longtable]{
  position=top,
  skip=3pt,                    % FIX: Reducido de 8pt
  format=plain,
  justification=raggedright,
  singlelinecheck=false,
  labelfont={footnotesize,color=gobmxGris},
  textfont={small,color=gobmxGris},
  font={small,color=gobmxGris}
}
% Bibliography (APA style)
\RequirePackage[
  backend=biber,
  style=verbose-ibid,
  sorting=nyt,
  citestyle=verbose-ibid
]{biblatex}
\addbibresource{referencias.bib}
\setlength{\bibhang}{0pt}
\setlength{\bibitemsep}{1em}
% Hyperref (load after biblatex)
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
% DATOS DEL DOCUMENTO
% ============================================================================
\makeatletter
\newcommand{\@subtitle}{}
\newcommand{\subtitle}[1]{\gdef\@subtitle{#1}}

\newcommand{\@institucion}{Secretaría de Energía}
\newcommand{\institucion}[1]{\gdef\@institucion{#1}}

\newcommand{\@unidad}{Unidad de Planeación Energética}
\newcommand{\unidad}[1]{\gdef\@unidad{#1}}

\newcommand{\DocumentoCorto}{}
\newcommand{\setDocumentoCorto}[1]{\renewcommand{\DocumentoCorto}{#1}}

% Metadatos PDF para publicación oficial
\newcommand{\@palabrasclave}{}
\newcommand{\palabrasclave}[1]{\gdef\@palabrasclave{#1}}

\newcommand{\@version}{1.0}
\newcommand{\version}[1]{\gdef\@version{#1}}

\AtBeginDocument{
  \hypersetup{
    pdftitle={\@title},
    pdfauthor={\@institucion},
    pdfsubject={\@subtitle},
    pdfkeywords={\@palabrasclave},
    pdfproducer={Secretaría de Energía - Gobierno de México},
    pdfcreator={LaTeX con clase sener2025},
    pdflang={es-MX}
  }
}
\makeatother

% ============================================================================
% COMANDO PARA VALORES DESTACADOS (Recuadros naranjas)
% ============================================================================
\definecolor{highlightOrange}{RGB}{166,128,45}
\newcommand{\highlight}[1]{%
  \colorbox{highlightOrange}{%
    \strut\textbf{\textcolor{white}{#1}}%
  }%
}

% ============================================================================
% ENCABEZADOS Y PIES DE PÁGINA
% ============================================================================
\fancypagestyle{plain}{
  \fancyhf{}
  \fancyhead[L]{} % Sin texto a la izquierda
  \fancyhead[R]{} % Sin texto a la derecha
  
  % Pie de página alternado (Par/Impar)
  \fancyfoot[LE]{\makebox[\headwidth][l]{\scriptsize\bfseries\thepage\quad\textcolor{gobmxGuinda}{\DocumentoCorto}\ \textcolor{gobmxDorado}{\hrulefill}}}
  \fancyfoot[RO]{\makebox[\headwidth][r]{\scriptsize\textcolor{gobmxDorado}{\hrulefill}\ \textcolor{gobmxGuinda}{\DocumentoCorto}\quad\bfseries\thepage}}
  
  \renewcommand{\headrulewidth}{1pt}
  \renewcommand{\headrule}{\vspace{-35pt}{\color{gobmxDorado}\hrule width\headwidth height\headrulewidth}}
  \renewcommand{\footrulewidth}{0pt}
}

\fancypagestyle{fancy}{
  \fancyhf{}
  \fancyhead[L]{} % Sin texto a la izquierda
  \fancyhead[R]{} % Sin texto a la derecha
  
  % Pie de página alternado (Par/Impar)
  \fancyfoot[LE]{\makebox[\headwidth][l]{\scriptsize\bfseries\thepage\quad\textcolor{gobmxGuinda}{\DocumentoCorto}\ \textcolor{gobmxDorado}{\hrulefill}}}
  \fancyfoot[RO]{\makebox[\headwidth][r]{\scriptsize\textcolor{gobmxDorado}{\hrulefill}\ \textcolor{gobmxGuinda}{\DocumentoCorto}\quad\bfseries\thepage}}
  
  \renewcommand{\headrulewidth}{1pt}
  \renewcommand{\headrule}{\vspace{10pt}{\color{gobmxDorado}\hrule width\headwidth height\headrulewidth}}
  \renewcommand{\footrulewidth}{0pt}
}

\fancypagestyle{portada}{
  \fancyhf{}
  \renewcommand{\headrulewidth}{0pt}
  \renewcommand{\footrulewidth}{0pt}
}

\pagestyle{fancy}

% Agregar fondo a todas las páginas con estilo plain
\AddToShipoutPictureBG{%
  \IfFileExists{img/foja_blanca.jpg}{%
    \AtPageLowerLeft{%
      \BeginAccSupp{method=escape,Alt={Membrete institucional de fondo}}%
      \includegraphics[width=\paperwidth,height=\paperheight]{img/foja_blanca.jpg}%
      \EndAccSupp{}%
    }%
  }{}%
}

% Configuración de párrafo y espaciado moderno
\setlength{\parindent}{0pt}
\setlength{\parskip}{0.5em}
\linespread{1.15}

% FIX: Evitar justificación vertical que estira contenido cuando floats saltan
\AtBeginDocument{\raggedbottom}

% ============================================================================
% FIX: ESPACIADO DE FIGURAS, TABLAS Y FUENTES (más reducido)
% ============================================================================

% FIX: Definir constantes para espaciado consistente
\newcommand{\SenerFloatSep}{6pt}
\newcommand{\SenerCaptionSkip}{2pt}
\newcommand{\SenerTableSep}{4pt}

% Espacios alrededor de floats (figuras/tablas) - más compactos
\setlength{\textfloatsep}{\SenerFloatSep plus 1pt minus 1pt}    % FIX: Más reducido
\setlength{\intextsep}{\SenerFloatSep plus 1pt minus 1pt}       % FIX: Más reducido  
\setlength{\floatsep}{\SenerFloatSep plus 1pt minus 1pt}        % FIX: Más reducido

% Espacios de captions - mínimos
\setlength{\abovecaptionskip}{\SenerCaptionSkip}                 % FIX: Mínimo
\setlength{\belowcaptionskip}{\SenerCaptionSkip}                 % FIX: Mínimo

% Espacios de longtable (antes/después) - compactos
\setlength\LTpre{\SenerTableSep}                                 % FIX: Más compacto
\setlength\LTpost{\SenerTableSep}                                % FIX: Más compacto

% ============================================================================
% ESTILOS DE TÍTULOS Y SECCIONES  (A–E de la plantilla Word)
% ============================================================================

% Título A  -> \section  (Patria 17 pt, negritas)
\titleformat{\section}
  {\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{gobmxGuinda}}
  {\thesection}{0.3em}{}

% Título B  -> \subsection  (Patria 14 pt, negritas)
\titleformat{\subsection}
  {\patriafont\bfseries\fontsize{14pt}{17pt}\selectfont\color{gobmxGuinda}}
  {\thesubsection}{0.3em}{}

% Título C  -> \subsubsection  (Noto Sans 12 pt, negritas)
\titleformat{\subsubsection}
  {\sffamily\bfseries\fontsize{12pt}{14pt}\selectfont\color{gobmxGuinda}}
  {\thesubsubsection}{0.3em}{}

% Título D  -> \paragraph  (Noto Sans 12 pt, normal)
\titleformat{\paragraph}
  {\sffamily\fontsize{12pt}{14pt}\selectfont\color{gobmxGris}}
  {\theparagraph}{0.3em}{}
\titlespacing*{\paragraph}{0pt}{0.8em}{0.5em}

% Título E  -> \subparagraph  (Noto Sans 10 pt, negritas)
\titleformat{\subparagraph}
  {\sffamily\bfseries\fontsize{10pt}{12pt}\selectfont\color{gobmxGris}}
  {\thesubparagraph}{0.3em}{}
\titlespacing*{\subparagraph}{0pt}{0.6em}{0.4em}

% Espaciados que ya tenías (ajusta si quieres)
\titlespacing*{\section}{0pt}{2em}{1em}
\titlespacing*{\subsection}{0pt}{1.5em}{0.8em}
\titlespacing*{\subsubsection}{0pt}{1em}{0.5em}

% ============================================================================
% COMANDO PARA ANEXOS
% ============================================================================

% FIX: Flag para detectar si estamos en modo anexos
\makeatletter
\newif\ifsener@appendix
\sener@appendixfalse
\makeatother

% FIX: Comando para iniciar la sección de anexos SIN duplicación en TOC
\makeatletter
\newcommand{\anexos}{%
  \clearpage
  \appendix
  \sener@appendixtrue
  
  % FIX: Numeración interna SOLO alfabética (sin "Anexo" en \thesection)
  % Esto evita duplicación en TOC: será "A" no "Anexo A Anexo A"
  \setcounter{section}{0}%
  \renewcommand{\thesection}{\Alph{section}}%
  % Sub-secciones como "A.1", "A.2"
  \renewcommand{\thesubsection}{\Alph{section}.\arabic{subsection}}%

  % FIX: Cambiar titleformat SOLO para anexos (mostrar "Anexo A" visualmente)
  \titleformat{\section}
    {\patriafont\bfseries\fontsize{17pt}{20pt}\selectfont\color{gobmxGuinda}}
    {Anexo~\thesection}{0.3em}{}

  % Ajuste del índice (TOC): el ancho por defecto no alcanza para "Anexo A"
  % 1) Aplicar en esta corrida (por si el TOC se imprime después de anexos)
  \SENERAppendixTOCSetup%
  % 2) Persistir en el .toc para que el \tableofcontents al inicio aplique
  %    este formato justo antes de listar los anexos.
  \addtocontents{toc}{\protect\SENERAppendixTOCSetup}%
}
\makeatother

% ============================================================================
% LISTAS PERSONALIZADAS (alineado a la plantilla Word)
% FIX: Compactadas para reducir espacio vertical excesivo
% ============================================================================

% Configuración global de listas más compacta
\setlist{
  noitemsep,           % Sin espacio entre items
  topsep=0.15em,       % FIX: Espacio reducido arriba/abajo de la lista
  parsep=0pt,          % Sin espacio entre párrafos dentro de items
  partopsep=0pt,       % Sin espacio extra cuando la lista inicia párrafo
  leftmargin=*         % Margen automático según la etiqueta
}

% 1er nivel: viñeta
\setlist[itemize,1]{%
  label=\textbullet,
  leftmargin=*,
  itemsep=0pt,         % FIX: Sin espacio entre items
  topsep=0.15em,       % FIX: Más reducido para evitar estiramiento
  parsep=0pt
}

% 2do nivel: guión
\setlist[itemize,2]{%
  label=--,
  leftmargin=2em,
  itemsep=0pt,         % FIX: Sin espacio entre items
  topsep=0.1em,        % FIX: Reducido
  parsep=0pt
}

% 3er nivel: viñeta
\setlist[itemize,3]{%
  label=\textbullet,
  leftmargin=3em,
  itemsep=0pt,         % FIX: Sin espacio entre items
  topsep=0.1em,        % FIX: Reducido
  parsep=0pt
}

% 4to nivel: guión
\setlist[itemize,4]{%
  label=--,
  leftmargin=4em,
  itemsep=0pt,         % FIX: Sin espacio entre items
  topsep=0.1em,        % FIX: Reducido
  parsep=0pt
}

% ============================================================================
% ESTILOS DE TABLAS PROFESIONALES
% ============================================================================

% FIX: Definir tipos de columna después de cargar array y definir colores
% Tipos de columnas personalizadas
\newcolumntype{L}[1]{>{\raggedright\arraybackslash}p{#1}}
\newcolumntype{C}[1]{>{\centering\arraybackslash}p{#1}}
\newcolumntype{R}[1]{>{\raggedleft\arraybackslash}p{#1}}

% Tipos de columnas con negritas (para primera columna de conceptos)
\newcolumntype{B}[1]{>{\raggedright\arraybackslash\bfseries}p{#1}}
\newcolumntype{M}[1]{>{\centering\arraybackslash\bfseries}p{#1}}
\newcolumntype{N}[1]{>{\raggedleft\arraybackslash\bfseries}p{#1}}

% FIX: Nuevos tipos de columna para tablas con texto gris y alineación izquierda
\newcolumntype{G}[1]{>{\raggedright\arraybackslash\color{gobmxGris}}p{#1}}
\newcolumntype{H}[1]{>{\raggedright\arraybackslash\bfseries\color{gobmxGris}}p{#1}}

% ============================================================================
% ESTILOS DE ENCABEZADOS DE TABLA
% ============================================================================
% NOTA: Los comandos de encabezado ahora solo dan formato al texto.
% Para colorear la fila, use \rowcolor{<color>} al inicio de la fila.
% Ejemplo: \rowcolor{gobmxGuinda} \encabezadoguinda{Celda 1} & ...

% Encabezado guinda (predeterminado)
\newcommand{\encabezadoguinda}[1]{%
  \textcolor{white}{\textbf{#1}}%
}

% Encabezado verde
\newcommand{\encabezadoverde}[1]{%
  \textcolor{white}{\textbf{#1}}%
}

% Encabezado dorado
\newcommand{\encabezadodorado}[1]{%
  \textcolor{white}{\textbf{#1}}%
}

% Encabezado gris
\newcommand{\encabezadogris}[1]{%
  \textcolor{white}{\textbf{#1}}%
}

% Alias para compatibilidad
\newcommand{\encabezadotabla}[1]{\encabezadoguinda{#1}}

% ============================================================================
% TABLAS CON ESTILOS PREDEFINIDOS
% ============================================================================

% FIX: Estilo de caption para tablas cortas (igual que longtable)
\makeatletter
\newcommand\floatc@SENERtable[2]{%
  {\footnotesize\color{gobmxGris}\raggedright #1.\ #2\par}%
}
\newcommand\fs@SENERtable{%
  \let\@fs@capt\floatc@SENERtable
  \def\@fs@pre{}\def\@fs@post{}%
  \def\@fs@mid{\vspace\abovecaptionskip\relax}%
  \let\@fs@iftopcapt\iftrue
}
\makeatother

% FIX: Tabla estilo dorado corto (mismo look que longtable)
\newenvironment{tabladoradoCorto}[1][]{
  \rowcolors{2}{gobmxDorado!12}{white}
  \floatstyle{SENERtable}
  \restylefloat{table}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2}
  \sffamily\notosanssmall
  \color{gobmxGris} % FIX: Texto gris en cuerpo como longtable
  #1
}{
  \end{table}
  \floatstyle{plain}
  \restylefloat{table}
}

% Tabla estilo guinda (predeterminada) - mantenida para compatibilidad
\newenvironment{tablaguinda}[1][]{
  \rowcolors{2}{gobmxGuinda!10}{white}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2} % Más aire
  \sffamily\notosanssmall % Fuente sans-serif 10.5pt
  #1
}{
  \end{table}
}

% Tabla estilo verde
\newenvironment{tablaverde}[1][]{
  \rowcolors{2}{gobmxVerde!15}{white}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2}
  \sffamily\notosanssmall
  #1
}{
  \end{table}
}

% Tabla estilo dorado (ahora sin entorno table, para usar con longtable)
\newenvironment{tabladorado}[1][]{
  \rowcolors{2}{gobmxDorado!12}{white}
  \sffamily\notosanssmall
  \renewcommand{\arraystretch}{1.2}
  #1
}{
}

% Tabla dorada para tablas largas (sin entorno table)
\newenvironment{tabladoradoLargo}[1][]{
  \rowcolors{2}{gobmxDorado!12}{white}
  \sffamily\notosanscompact
  \renewcommand{\arraystretch}{1.15}
  #1
}{
}

% Tabla estilo gris (neutral)
\newenvironment{tablagris}[1][]{
  \rowcolors{2}{gobmxGrisClaro}{white}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2}
  \sffamily\notosanssmall
  #1
}{
  \end{table}
}

% Tabla sin stripes (solo encabezado con color)
\newenvironment{tablalimpia}[1][]{
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2}
  \sffamily\notosanssmall
  #1
}{
  \end{table}
}

% Alias para compatibilidad con código existente
\newenvironment{tablainstitucional}[1][]{
  \rowcolors{2}{gobmxGrisClaro}{white}
  \begin{table}[H]
  \renewcommand{\arraystretch}{1.2}
  \sffamily\notosanssmall
  #1
}{
  \end{table}
}

% ============================================================================
% RECUADROS Y CAJAS DESTACADAS
% ============================================================================

% Recuadro informativo general
\newtcolorbox{recuadro}[1][]{
  colback=gobmxGrisClaro,
  colframe=gobmxGuinda,
  boxrule=1.5pt,
  arc=3mm,
  left=10pt,
  right=10pt,
  top=10pt,
  bottom=10pt,
  breakable,
  #1
}

% Recuadro de nota importante
\newtcolorbox{notaimportante}[1][]{
  colback=gobmxGuinda!5,
  colframe=gobmxGuinda,
  boxrule=2pt,
  arc=2mm,
  left=10pt,
  right=10pt,
  top=10pt,
  bottom=10pt,
  bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de advertencia}}\faExclamationTriangle\EndAccSupp{}\ \ \textbf{Nota importante}},
  fonttitle=\bfseries\color{white},
  coltitle=white,
  colbacktitle=gobmxGuinda,
  breakable,
  #1
}

% Recuadro de definición
\newtcolorbox{definicion}[1][]{
  colback=gobmxVerde!5,
  colframe=gobmxVerde,
  boxrule=1.5pt,
  arc=2mm,
  left=10pt,
  right=10pt,
  top=10pt,
  bottom=10pt,
  bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de libro}}\faBook\EndAccSupp{}\ \ \textbf{Definición}},
  fonttitle=\bfseries\color{white},
  coltitle=white,
  colbacktitle=gobmxVerde,
  breakable,
  #1
}

% Recuadro de ejemplo
\newtcolorbox{ejemplo}[1][]{
  colback=gobmxAmbarClaro!10,
  colframe=gobmxDorado,
  boxrule=1.5pt,
  arc=2mm,
  left=10pt,
  right=10pt,
  top=10pt,
  bottom=10pt,
  bottom=10pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de bombilla}}\faLightbulb\EndAccSupp{}\ \ \textbf{Ejemplo}},
  fonttitle=\bfseries\color{white},
  coltitle=white,
  colbacktitle=gobmxDorado,
  breakable,
  #1
}

% Recuadro de resumen ejecutivo
\newtcolorbox{resumenejecutivo}[1][]{
  enhanced,
  colback=gobmxGuinda!3,
  colframe=gobmxGuinda,
  boxrule=2pt,
  arc=0mm,
  left=15pt,
  right=15pt,
  top=15pt,
  bottom=15pt,
  title={\Large\textbf{Resumen Ejecutivo}},
  fonttitle=\bfseries\color{white},
  coltitle=white,
  colbacktitle=gobmxGuinda,
  attach boxed title to top left={yshift=-3mm,xshift=5mm},
  boxed title style={sharp corners},
  breakable,
  #1
}

% Recuadro de datos clave
\newtcolorbox{datosclave}[1][]{
  enhanced,
  colback=gobmxAmbarClaro!10,
  colframe=gobmxDorado,
  boxrule=2pt,
  arc=1mm,
  left=12pt,
  right=12pt,
  top=12pt,
  bottom=12pt,
  title={\BeginAccSupp{method=escape,ActualText={Icono de llave}}\faKey\EndAccSupp{}\ \ \textbf{Datos Clave}},
  fonttitle=\bfseries\color{white},
  coltitle=white,
  colbacktitle=gobmxDorado,
  breakable,
  #1
}

% ============================================================================
% NUEVOS ENTORNOS PREMIUM
% ============================================================================

% Cita destacada (Pull Quote)
\newenvironment{destacado}[1][]{
  \begin{center}
  \begin{tikzpicture}
    \node[
      text width=0.85\textwidth,
      align=center,
      font=\Large\itshape\color{gobmxGuinda},
      inner sep=20pt
    ] (quote) {``#1''};
    \node[opacity=0.2, scale=4, color=gobmxDorado] at (quote.north west) {``};
    \node[opacity=0.2, scale=4, color=gobmxDorado] at (quote.south east) {''};
  \end{tikzpicture}
  \end{center}
}{}

% Línea de tiempo / Pasos
\newenvironment{pasos}{
  \begin{center}
  \begin{tikzpicture}[
    node distance=3cm,
    every node/.style={
      rectangle,
      rounded corners,
      draw=gobmxGuinda,
      very thick,
      fill=gobmxGrisClaro,
      text width=2.5cm,
      align=center,
      minimum height=1.5cm
    },
    arrow/.style={
      ->,
      >=stealth,
      very thick,
      color=gobmxDorado
    }
  ]
}{
  \end{tikzpicture}
  \end{center}
}

% Comando auxiliar para pasos
\newcommand{\paso}[3]{
  \node (#1) [#2] {#3};
}
\newcommand{\conectar}[2]{
  \draw[arrow] (#1) -- (#2);
}

% ============================================================================
% COMANDOS AVANZADOS (PRO)
% ============================================================================

% Letra Capital (Drop Cap)
\newcommand{\letraCapital}[2]{%
  \lettrine[lines=3, lhang=0.33, nindent=0em, findent=3pt, realheight=true]{\color{gobmxGuinda}#1}{#2}%
}

% Código QR
\newcommand{\qrlink}[1]{%
  \qrcode[height=2.5cm]{#1}%
}

% Nota al Margen
\newcommand{\notaMargen}[1]{%
  \marginnote{%
    \footnotesize\color{gobmxGuinda}\sffamily%
    \raggedright%
    \BeginAccSupp{method=escape,ActualText={Icono de información}}\faInfoCircle\EndAccSupp{}\ #1%
  }%
}

% ============================================================================
% ELEMENTOS VISUALES MODERNOS
% ============================================================================

% Badges/Etiquetas (Pills)
\newcommand{\badge}[2][gobmxGuinda]{%
  \tikz[baseline=(badge.base)]{%
    \node[%
      inner sep=3pt,%
      outer sep=0pt,%
      rounded corners=3pt,%
      fill=#1,%
      text=white,%
      font=\tiny\sffamily\bfseries,%
      minimum height=1.2em%
    ] (badge) {#2};%
  }%
}

% Callouts Mejorados (GitHub-style)
\newtcolorbox{calloutTip}[1][Consejo]{%
  colback=gobmxVerde!5,%
  colframe=gobmxVerde,%
  boxrule=0pt,%
  leftrule=4pt,%
  arc=0mm,%
  left=8pt,%
  right=8pt,%
  top=8pt,%
  bottom=8pt,%
  title={\BeginAccSupp{method=escape,ActualText={Icono de bombilla}}\faLightbulb\EndAccSupp{}\ \ \textbf{#1}},%
  fonttitle=\bfseries\color{gobmxVerde},%
  coltitle=gobmxVerde,%
  colbacktitle=gobmxVerde!5,%
  breakable%
}

\newtcolorbox{calloutWarning}[1][Advertencia]{%
  colback=gobmxAmbarClaro,%
  colframe=gobmxDorado,%
  boxrule=0pt,%
  leftrule=4pt,%
  arc=0mm,%
  left=8pt,%
  right=8pt,%
  top=8pt,%
  bottom=8pt,%
  title={\BeginAccSupp{method=escape,ActualText={Icono de advertencia}}\faExclamationTriangle\EndAccSupp{}\ \ \textbf{#1}},%
  fonttitle=\bfseries\color{gobmxDorado},%
  coltitle=gobmxDorado,%
  colbacktitle=gobmxDorado!5,%
  breakable%
}

\newtcolorbox{calloutImportant}[1][Importante]{%
  colback=gobmxGuinda!5,%
  colframe=gobmxGuinda,%
  boxrule=0pt,%
  leftrule=4pt,%
  arc=0mm,%
  left=8pt,%
  right=8pt,%
  top=8pt,%
  bottom=8pt,%
  title={\BeginAccSupp{method=escape,ActualText={Icono de exclamación}}\faExclamationCircle\EndAccSupp{}\ \ \textbf{#1}},%
  fonttitle=\bfseries\color{gobmxGuinda},%
  coltitle=gobmxGuinda,%
  colbacktitle=gobmxGuinda!5,%
  breakable%
}

% Barra de Progreso
\newcommand{\progressbar}[3][gobmxVerde]{%
  % #1 = color (opcional, default verde)
  % #2 = porcentaje (0-100)
  % #3 = etiqueta
  \begin{tikzpicture}[baseline=-0.5ex]
    % Fondo
    \fill[gobmxGrisClaro] (0,0) rectangle (4,0.3);
    % Barra de progreso
    \fill[#1] (0,0) rectangle ({4*#2/100},0.3);
    % Borde
    \draw[gobmxGris,line width=0.5pt] (0,0) rectangle (4,0.3);
    % Texto
    \node[right,font=\small\sffamily] at (4.1,0.15) {#3};
  \end{tikzpicture}%
}

% Timeline (Línea de Tiempo)
\newenvironment{timeline}{%
  \begin{center}
  \begin{tikzpicture}[
    timeline/.style={%
      draw=gobmxGuinda,%
      line width=2pt%
    },%
    event/.style={%
      circle,%
      fill=gobmxDorado,%
      inner sep=3pt,%
      minimum size=8pt%
    },%
    eventlabel/.style={%
      font=\small\sffamily,%
      text width=3cm,%
      align=center%
    }
  ]
}{%
  \end{tikzpicture}
  \end{center}
}

% Comando auxiliar para eventos en timeline
\newcommand{\evento}[3]{%
  % #1 = posición x
  % #2 = año/fecha
  % #3 = descripción
  \node[event] at (#1,0) {};
  \node[eventlabel,above] at (#1,0.3) {\textbf{#2}};
  \node[eventlabel,below] at (#1,-0.3) {#3};
}

% ============================================================================
% AMBIENTE PARA ANEXOS
% ============================================================================
% (Definición de \anexos unificada arriba; evitar redefinirla aquí.)

% ============================================================================
% PORTADA INSTITUCIONAL
% ============================================================================

% Portada estándar (sin fondo)
\renewcommand{\maketitle}{%
  \begin{titlepage}
    \thispagestyle{portada}
    \IfFileExists{img/portada.png}{%
      \AddToShipoutPictureBG*{%
        \AtPageLowerLeft{%
          \BeginAccSupp{method=escape,Alt={Portada institucional - Imagen decorativa de fondo}}%
          \includegraphics[width=\paperwidth,height=\paperheight]{img/portada.png}%
          \EndAccSupp{}%
        }%
      }%
    }{}
    \begin{center}
      \vspace*{1.5cm}

      \vspace*{2cm}

      % "PLAN DE" o texto superior
      {\Large\bfseries\color{gobmxGris} PLAN DE}\\[1cm]

      % Título principal
      {\Huge\bfseries\color{gobmxDorado}\@title}\\[0.8cm]

      % Subtítulo (si existe)
      \ifx\@subtitle\empty
      \else
        {\LARGE\color{gobmxGuinda}\@subtitle}\\[3cm]
      \fi

      \vfill

      % Unidad responsable
      % {\large\textbf{\@unidad}}\\[0.5cm]
      
      % Institución
      % {\large\@institucion}\\[1cm]

      % Fecha
      % {\large\@date}\\[1cm]

      \IfFileExists{img/logo_gob.png}{%
        \BeginAccSupp{method=escape,Alt={Logo del Gobierno de México}}%
        \includegraphics[height=1.5cm]{img/logo_gob.png}%
        \EndAccSupp{}%
      }{}

    \end{center}
  \end{titlepage}
  \clearpage
}

% Portada con fondo guinda
\newcommand{\portadafondo}[1][img/portada.png]{%
  \begin{titlepage}
    \thispagestyle{portada}
    \IfFileExists{#1}{%
      \AddToShipoutPictureBG*{%
        \AtPageLowerLeft{%
          \BeginAccSupp{method=escape,Alt={Portada institucional - Imagen decorativa de fondo}}%
          \includegraphics[width=\paperwidth,height=\paperheight]{#1}%
          \EndAccSupp{}%
        }%
      }%
    }{%
      % Si no existe la imagen, mostrar un fondo de color
      \AddToShipoutPictureBG*{%
        \AtPageLowerLeft{%
          \color{gobmxGuinda}\rule{\paperwidth}{\paperheight}%
        }%
      }%
    }
    
    \begin{center}
      \vspace*{2cm}

      % Logo SENER eliminado por solicitud
      \vspace*{5cm}

      % Título principal eliminado por solicitud
      % {\Huge\bfseries\patriafont\color{gobmxAmbarClaro}\@title}\\[1cm]

      % Subtítulo eliminado por solicitud
      % \ifx\@subtitle\empty
      % \else
      %   {\LARGE\color{white}\@subtitle}\\[2cm]
      % \fi

      \vfill

      % Unidad responsable en blanco (ELIMINADO)
      % {\large\color{white}\textbf{\@unidad}}\\[0.5cm]
      
      % Institución en blanco (ELIMINADO)
      % {\large\color{white}\@institucion}\\[1cm]

      % Fecha en blanco (ELIMINADO)
      % {\large\color{white}\@date}\\[1.5cm]

      % Logo Gobierno transparente eliminado
      % Espacio para subir el texto
      \vspace{3cm}

    \end{center}
  \end{titlepage}
  \clearpage
}

% ============================================================================
% ÍNDICES PERSONALIZADOS (Tablas y Figuras)
% ============================================================================
\makeatletter
\newcommand{\listatablas}{
  \clearpage
  \begin{center}
    % Línea decorativa eliminada
    
    % Título del índice
    {\Large\patriafont\bfseries\color{gobmxGuinda}Índice de Tablas}\\[1cm]
  \end{center}
  
  % Contenido del índice (generado automáticamente)
  {%
    % Forzar Patria también en las entradas (\@dottedtocline usa \normalfont)
    \begingroup
      \let\SENERorigNormalfont\normalfont
      \def\normalfont{\SENERorigNormalfont\patriafont}%
      \@starttoc{lot}%
    \endgroup
  }%
}

\newcommand{\listafiguras}{
  \clearpage
  \begin{center}
    % Línea decorativa eliminada
    
    % Título del índice
    {\Large\patriafont\bfseries\color{gobmxGuinda}Índice de Figuras}\\[1cm]
  \end{center}
  
  % Contenido del índice (generado automáticamente)
  {%
    % Forzar Patria también en las entradas (\@dottedtocline usa \normalfont)
    \begingroup
      \let\SENERorigNormalfont\normalfont
      \def\normalfont{\SENERorigNormalfont\patriafont}%
      \@starttoc{lof}%
    \endgroup
  }%
}
\makeatother

% ============================================================================
% CONTRAPORTADA INSTITUCIONAL
% ============================================================================
\makeatletter
\newcommand{\contraportada}[2][img/contraportada.png]{
  \clearpage
  \thispagestyle{plain}
  % \hypersetup{urlcolor=gobmxAmbarClaro} % Ya no es necesario forzar color claro en fondo blanco
  
  % Penúltima página: Fondo blanco (por defecto), texto oscuro
  \vspace*{1cm}
  
  \begin{center}
    \color{gobmxGris}
    {\large\textbf{\textcolor{gobmxGuinda}{\@title}}}\\[0.3cm]
    \ifx\@subtitle\empty
    \else
      \textcolor{gobmxGris}{\@subtitle}\\[1cm]
    \fi
    
    {\small
    \textbf{\textcolor{gobmxDorado}{\@institucion}}\\
    \@unidad\\[0.5cm]
    
    #2
    }
  \end{center}

  \vfill
  
  \begin{center}
    \color{gobmxGris}
    {\small
    \vspace{0.5cm}
    
    \textcolor{gobmxGris}{\@date}
    }
  \end{center}
  
  \vspace*{-1.5cm}
  \clearpage
  
  % Última página: Solo fondo, sin texto
  \thispagestyle{empty}
  \IfFileExists{#1}{%
    \AddToShipoutPictureBG*{%
      \AtPageLowerLeft{%
        \BeginAccSupp{method=escape,Alt={Contraportada institucional - Imagen decorativa de fondo}}%
        \includegraphics[width=\paperwidth,height=\paperheight]{#1}%
        \EndAccSupp{}%
      }%
    }%
  }{}
  \null
  \clearpage
}
\makeatother

% ============================================================================
% PORTADA DE SECCIÓN
% ============================================================================
\newcommand{\portadaseccion}[3]{
  \clearpage
  \thispagestyle{empty}
  \begingroup
    \color{white}
    \IfFileExists{img/fondo_guinda.png}{%
      \AddToShipoutPictureBG*{%
        \AtPageLowerLeft{%
          \BeginAccSupp{method=escape,Alt={Fondo decorativo de sección - Color guinda institucional}}%
          \includegraphics[width=\paperwidth,height=\paperheight]{img/fondo_guinda.png}%
          \EndAccSupp{}%
        }%
      }%
    }{}
    \vspace*{\fill}
    \begin{center}
      % Número de sección grande en blanco
      {\fontsize{80}{80}\selectfont\bfseries\color{white} #1}\\[0.5cm]
      
      % Título en Ambar Claro y fuente Patria
      {\Huge\bfseries\patriafont\color{gobmxAmbarClaro} #2}\\[1cm]
      
      % Subtítulo en blanco
      {\Large #3}
    \end{center}
    \vspace*{\fill}
  \endgroup
  \clearpage
}

% ============================================================================
% PÁGINA DE CRÉDITOS/DIRECTORIO
% ============================================================================
\newcommand{\paginacreditos}[1]{
  \clearpage
  \thispagestyle{plain}
  % Fondo blanco limpio eliminado para permitir el fondo institucional
  % \AddToShipoutPictureBG*{\AtPageLowerLeft{\color{white}\rule{\paperwidth}{\paperheight}}}
  
  \begin{center}
    {\Large\bfseries\color{gobmxGuinda} Directorio}\\[1cm]
  \end{center}
  
  \vspace*{2cm}
  
  #1
  
  \vspace*{\fill}
  
  \clearpage
}

% ============================================================================
% MACROS ADICIONALES (PLADERSE)
% ============================================================================

% Si tienes Noto Sans Light instalada puedes definirla;
% si no, simplemente hereda la sans estándar.
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

% FIX: Macro de fuente de gráfico/tabla (pegado a figura/tabla)
% - Elimina espacio vertical excesivo
% - Se pega directamente debajo de figura/tabla
% - Imprime el contenido EXACTAMENTE una vez (evita duplicados)
\newcommand{\SENERfuenteAutopunctuate}[1]{#1}

\newcommand{\fuente}[1]{%
  \vspace{-6pt}% FIX: Espacio negativo fijo para pegar más
  \par\noindent% FIX: Sin indentación
  {\raggedright\notosanslight\fontsize{9pt}{11pt}\selectfont%
    {\bfseries FUENTE:}~\SENERfuenteAutopunctuate{#1}%
  }%
  \par\vspace{\SenerCaptionSkip}% FIX: Espacio mínimo consistente después
}

% Entrada de glosario
\newcommand{\entradaGlosario}[2]{%
  \par\begingroup
  \setlength{\parindent}{0pt}%
  \setlength{\hangindent}{0pt}%
  \noindent{\notosanssmall\textbf{#1} -- #2}\par
  \endgroup
}

% Entrada de sigla / acrónimo
\newcommand{\entradaSigla}[2]{%
  \par\begingroup
  \setlength{\parindent}{0pt}%
  \setlength{\hangindent}{0pt}%
  \noindent{\notosanssmall\textbf{#1} -- #2}\par
  \endgroup
}
