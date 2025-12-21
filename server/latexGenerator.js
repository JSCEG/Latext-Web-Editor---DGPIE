
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)).catch(() => global.fetch(...args));

// ============================================================================
// CORE LATEX GENERATION LOGIC (Ported from GAS)
// ============================================================================

/**
 * Main function to generate the LaTeX string
 */
function generarLatexString(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario) {
    // 1. Sort sections
    secciones.sort((a, b) => {
        const oa = parseFloat(a.Orden) || 0;
        const ob = parseFloat(b.Orden) || 0;
        return oa - ob;
    });

    // 2. Build Content
    const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario);

    return tex;
}

/**
 * Builds the complete LaTeX document
 */
function construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario) {
    let tex = '';

    // Create maps for quick access
    const figurasMap = crearMapaPorSeccion(figuras);
    const tablasMap = crearMapaPorSeccion(tablas);

    // --- Document Metadata (PDF/UA) ---
    tex += `\\DocumentMetadata{\n`;
    tex += `  pdfversion=2.0,\n`;
    tex += `  lang=es-MX,\n`;
    tex += `  pdfstandard=ua-2\n`;
    tex += `}\n\n`;

    // --- Preamble ---
    tex += `\\documentclass{sener2025}\n\n`;

    if (bibliografia.length > 0) {
        tex += `\\addbibresource{referencias.bib}\n\n`;
    }

    // --- PDF/UA Metadata ---
    tex += `% --- Metadatos PDF/UA (Accesibilidad Universal) ---\n`;
    tex += `\\hypersetup{\n`;
    tex += `  pdftitle={${escaparLatex(datosDoc['Titulo'] || 'Documento SENER')}},\n`;
    tex += `  pdfauthor={${escaparLatex(datosDoc['Autor'] || 'Secretaría de Energía')}},\n`;
    tex += `  pdfsubject={${escaparLatex(datosDoc['Subtitulo'] || datosDoc['Titulo'] || 'Documento Institucional')}},\n`;
    tex += `  pdfkeywords={${escaparLatex(datosDoc['PalabrasClave'] || 'SENER, Energía, México')}},\n`;
    tex += `  pdfcreationdate={D:${generarFechaPDF()}},\n`;
    tex += `  pdfversion={${escaparLatex(datosDoc['Version'] || '1.0')}}\n`;
    tex += `}\n\n`;

    // --- Document Metadata ---
    tex += `% --- Metadatos del Documento ---\n`;
    tex += `\\title{${escaparLatex(datosDoc['Titulo'] || '')}}\n`;
    if (datosDoc['Subtitulo']) {
        tex += `\\subtitle{${escaparLatex(datosDoc['Subtitulo'])}}\n`;
    }
    tex += `\\author{${escaparLatex(datosDoc['Autor'] || 'SENER')}}\n`;

    // Format date
    const fechaFormateada = formatearFecha(datosDoc['Fecha']);
    tex += `\\date{${escaparLatex(fechaFormateada)}}\n`;

    tex += `\\institucion{${escaparLatex(datosDoc['Institucion'] || 'Secretaría de Energía')}}\n`;
    tex += `\\unidad{${escaparLatex(datosDoc['Unidad'] || '')}}\n`;
    tex += `\\setDocumentoCorto{${escaparLatex((datosDoc['DocumentoCorto'] || '').toString().trim())}}\n`;
    tex += `\\palabrasclave{${escaparLatex((datosDoc['PalabrasClave'] || '').toString().trim())}}\n`;
    tex += `\\version{${escaparLatex((datosDoc['Version'] || '1.0').toString().trim())}}\n`;

    tex += `\n\\begin{document}\n\n`;

    // --- Cover ---
    if (datosDoc['PortadaRuta']) {
        tex += `\\portadafondo[${escaparLatex(datosDoc['PortadaRuta'])}]\n\n`;
    } else {
        tex += `\\portadafondo\n\n`;
    }

    // --- TOC ---
    tex += `\\tableofcontents\n\\newpage\n\n`;

    // --- Lists of Figures/Tables ---
    if (figuras.length > 0) {
        tex += `\\listafiguras\n\\newpage\n\n`;
    }
    if (tablas.length > 0) {
        tex += `\\listatablas\n\\newpage\n\n`;
    }

    // --- Acknowledgments ---
    if (datosDoc['Agradecimientos'] && datosDoc['Agradecimientos'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Agradecimientos}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarConEtiquetas(datosDoc['Agradecimientos'])}\n\n`;
    }

    // --- Presentation ---
    const presentacionRaw = (datosDoc['Presentación'] !== undefined && datosDoc['Presentación'] !== null)
        ? datosDoc['Presentación']
        : datosDoc['Presentacion'];
    if (presentacionRaw && presentacionRaw.toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Presentación}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarConEtiquetas(presentacionRaw)}\n\n`;
    }

    // --- Executive Summary ---
    if (datosDoc['ResumenEjecutivo'] && datosDoc['ResumenEjecutivo'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Resumen Ejecutivo}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarConEtiquetas(datosDoc['ResumenEjecutivo'])}\n\n`;
    }

    // --- Key Data ---
    if (datosDoc['DatosClave'] && datosDoc['DatosClave'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Datos Clave}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        const textoDatos = datosDoc['DatosClave'].toString();
        const items = textoDatos.split(/[;\n]/);
        tex += `\\begin{itemize}\n`;
        items.forEach(item => {
            if (item.trim()) {
                tex += `  \\item ${escaparLatex(item.trim())}\n`;
            }
        });
        tex += `\\end{itemize}\n\n`;
    }

    // --- Sections ---
    const resultado = procesarSecciones(secciones, figurasMap, tablasMap);
    tex += resultado.contenido;

    // --- Glossary ---
    if (glosario.length > 0) {
        tex += generarGlosario(glosario);
    }

    // --- Bibliography ---
    if (bibliografia.length > 0) {
        tex += `\\printbibliography\n\n`;
    }

    // --- Acronyms ---
    if (siglas.length > 0) {
        tex += generarSiglas(siglas);
    }

    // --- Credits Page ---
    if (resultado.directorio) {
        tex += `\\paginacreditos{\n${resultado.directorio}\n}\n`;
    }

    // --- Back Cover ---
    if (resultado.contraportada) {
        if (datosDoc['ContraportadaRuta']) {
            tex += `\\contraportada[${escaparLatex(datosDoc['ContraportadaRuta'])}]{\n${resultado.contraportada}\n}\n`;
        } else {
            tex += `\\contraportada{\n${resultado.contraportada}\n}\n`;
        }
    }

    tex += `\n\\end{document}\n`;

    return tex;
}

function procesarSecciones(secciones, figurasMap, tablasMap) {
    let contenido = '';
    let directorio = '';
    let contraportada = '';
    let anexosIniciados = false;
    let contadorPortadas = 0;

    secciones.forEach((seccion, index) => {
        const nivel = (seccion['Nivel'] || 'Seccion').toString().toLowerCase();
        const titulo = seccion['Titulo'] || '';
        const contenidoRaw = (seccion['Contenido'] || '').toString();
        const ordenSeccion = seccion['Orden'];

        if (nivel.includes('anexo') && !anexosIniciados) {
            contenido += `\\anexos\n\n`;
            anexosIniciados = true;
        }

        if (nivel === 'portada') {
            contadorPortadas++;
            contenido += `\\portadaseccion{${contadorPortadas}}{${escaparLatex(titulo)}}{${escaparLatex(contenidoRaw)}}\n\n`;
            return;
        }

        if (nivel === 'directorio') {
            directorio = procesarDirectorio(contenidoRaw);
            return;
        }

        if (nivel.includes('datos finales') || nivel.includes('datosfinales') || nivel === 'contraportada') {
            contraportada = procesarContraportada(contenidoRaw);
            return;
        }

        contenido += generarComandoSeccion(nivel, titulo, anexosIniciados);
        contenido += procesarContenido(contenidoRaw);

        if (figurasMap[ordenSeccion]) {
            figurasMap[ordenSeccion].forEach(fig => {
                contenido += generarFigura(fig);
            });
        }

        if (tablasMap[ordenSeccion]) {
            tablasMap[ordenSeccion].forEach(tabla => {
                contenido += generarTabla(tabla);
            });
        }

        contenido += '\n\n';
    });

    return {
        contenido: contenido,
        directorio: directorio,
        contraportada: contraportada
    };
}

function generarComandoSeccion(nivel, titulo, anexosIniciados = false) {
    let tituloFinal = titulo;

    if (anexosIniciados && (nivel === 'anexo' || nivel === 'subanexo')) {
        tituloFinal = limpiarPrefijoAnexoEnTitulo(titulo);
    }

    const tituloEscapado = escaparLatex(tituloFinal);

    nivel = nivel.toLowerCase()
        .replace(/ó/g, 'o').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ú/g, 'u');

    if (nivel === 'subseccion' || nivel === 'subanexo') {
        return `\\subsection{${tituloEscapado}}\n\n`;
    } else if (nivel === 'subsubseccion' || nivel.includes('subsub')) {
        return `\\subsubsection{${tituloEscapado}}\n\n`;
    } else if (nivel.includes('parrafo') || nivel.includes('titulo pequeño')) {
        return `\\paragraph{${tituloEscapado}}\n\n`;
    } else {
        return `\\section{${tituloEscapado}}\n\n`;
    }
}

function limpiarPrefijoAnexoEnTitulo(titulo) {
    if (!titulo) return '';
    let tituloLimpio = titulo.toString().trim();
    const patronesAnexo = [
        /^Anexo\s+[A-Z][\.\s\-–]*\s*/i,
        /^ANEXO\s+[A-Z][\.\s\-–]*\s*/i,
        /^[A-Z]\.?\d*[\.\s\-–]+\s*/,
        /^[A-Z]\d*[\.\s\-–]+\s*/
    ];
    for (const patron of patronesAnexo) {
        tituloLimpio = tituloLimpio.replace(patron, '');
    }
    return tituloLimpio.trim();
}

function procesarContenido(contenidoRaw) {
    const lineas = contenidoRaw.split('\n');
    let resultado = '';
    let enLista = false;
    let enBloque = false;
    let tipoBloque = '';
    let tituloBloque = '';
    let contenidoBloque = '';

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const lineaTrim = linea.trim();

        const inicioBloqueMatch = lineaTrim.match(/^\[\[(ejemplo|caja|alerta|info|destacado|recuadro)(?::\s*(.*))?\]\]$/i);
        if (inicioBloqueMatch) {
            if (enLista) {
                resultado += '\\end{itemize}\n';
                enLista = false;
            }
            enBloque = true;
            tipoBloque = inicioBloqueMatch[1].toLowerCase();
            tituloBloque = inicioBloqueMatch[2] || '';
            contenidoBloque = '';
            continue;
        }

        const finBloqueMatch = lineaTrim.match(/^\[\[\/(ejemplo|caja|alerta|info|destacado|recuadro)\]\]$/i);
        if (finBloqueMatch) {
            resultado += generarBloque(tipoBloque, tituloBloque, contenidoBloque);
            enBloque = false;
            contenidoBloque = '';
            continue;
        }

        if (enBloque) {
            contenidoBloque += linea + '\n';
            continue;
        }

        const esItemLista = lineaTrim.match(/^[-*•]\s+(.*)/);

        if (esItemLista) {
            if (!enLista) {
                resultado += '\\begin{itemize}\n';
                enLista = true;
            }
            resultado += `  \\item ${procesarConEtiquetas(esItemLista[1])}\n`;
        } else {
            if (enLista && lineaTrim === '') {
                continue;
            }

            if (enLista && lineaTrim !== '') {
                let hayMasItems = false;
                for (let j = i + 1; j < lineas.length; j++) {
                    const siguienteLinea = lineas[j].trim();
                    if (siguienteLinea === '') continue;
                    if (siguienteLinea.match(/^[-*•]\s+/)) {
                        hayMasItems = true;
                        break;
                    } else {
                        break;
                    }
                }
                if (!hayMasItems) {
                    resultado += '\\end{itemize}\n';
                    enLista = false;
                }
            }

            if (!enLista) {
                if (lineaTrim.startsWith('[[tabla:')) {
                    const match = lineaTrim.match(/\[\[tabla:(.+?)\]\]/);
                    if (match) resultado += `% Referencia a tabla: ${match[1]}\n`;
                } else if (lineaTrim.startsWith('[[figura:')) {
                    const match = lineaTrim.match(/\[\[figura:(.+?)\]\]/);
                    if (match) resultado += `% Referencia a figura: ${match[1]}\n`;
                } else if (lineaTrim !== '') {
                    resultado += `${procesarConEtiquetas(linea)}\n`;
                } else {
                    resultado += '\n';
                }
            }
        }
    }

    if (enLista) {
        resultado += '\\end{itemize}\n';
    }

    return resultado;
}

function generarBloque(tipo, titulo, contenido) {
    const contenidoProcesado = procesarContenido(contenido);
    const tituloSafe = escaparLatex(titulo);
    const opts = tituloSafe ? `[title={${tituloSafe}}]` : '';

    if (tipo === 'ejemplo') return `\\begin{ejemplo}${opts}\n${contenidoProcesado}\\end{ejemplo}\n`;
    if (tipo === 'caja' || tipo === 'recuadro') return `\\begin{recuadro}${opts}\n${contenidoProcesado}\\end{recuadro}\n`;
    if (tipo === 'alerta') return `\\begin{calloutWarning}${opts}\n${contenidoProcesado}\\end{calloutWarning}\n`;
    if (tipo === 'info') return `\\begin{calloutTip}${opts}\n${contenidoProcesado}\\end{calloutTip}\n`;
    if (tipo === 'destacado') return `\\begin{destacado}\n${contenidoProcesado}\\end{destacado}\n`;
    return contenidoProcesado;
}

function procesarDirectorio(contenidoRaw) {
    const lines = contenidoRaw.split('\n').map(l => l.trim()).filter(l => l);
    let dirTex = '\\begin{center}\n';
    for (let i = 0; i < lines.length; i += 2) {
        const nombre = lines[i];
        const cargo = lines[i + 1] || '';
        // FIX: Evitar saltos de línea con \\\\ si no hay contenido después, que causa "There's no line here to end"
        // y usar \par en su lugar si es necesario o simplemente saltar línea
        dirTex += `{\\patriafont\\fontsize{12}{14}\\selectfont\\color{gobmxGuinda} ${escaparLatex(nombre)}}\\par\n`;
        if (cargo) {
            dirTex += `{\\patriafont\\fontsize{9}{11}\\selectfont ${escaparLatex(cargo)}}\\\\[0.5cm]\n`;
        } else {
            dirTex += `\\\\[0.5cm]\n`;
        }
    }
    dirTex += '\\end{center}';
    return dirTex;
}

function procesarContraportada(contenidoRaw) {
    const lines = contenidoRaw.split('\n');
    let contraTex = '';
    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        const esUltima = (i === lines.length - 1);
        const siguienteEsVacia = (i < lines.length - 1) && (lines[i + 1].trim() === '');
        if (l === '') {
            if (!esUltima) contraTex += `\\\\[0.5cm]\n`;
        } else {
            contraTex += procesarConEtiquetas(l);
            if (!esUltima && !siguienteEsVacia) contraTex += `\\\\\n`;
        }
    }
    return contraTex;
}

function crearMapaPorSeccion(elementos) {
    const mapa = {};
    elementos.forEach(elem => {
        const seccion = elem['SeccionOrden'] || elem['ID_Seccion']; // Support both variants
        if (seccion) {
            if (!mapa[seccion]) mapa[seccion] = [];
            mapa[seccion].push(elem);
        }
    });
    Object.keys(mapa).forEach(key => {
        mapa[key].sort((a, b) => {
            const ordenA = parseFloat(a['OrdenFigura'] || a['OrdenTabla'] || a['Orden'] || 0);
            const ordenB = parseFloat(b['OrdenFigura'] || b['OrdenTabla'] || b['Orden'] || 0);
            return ordenA - ordenB;
        });
    });
    return mapa;
}

function generarFigura(figura) {
    const rutaArchivo = figura['RutaArchivo'] || figura['Ruta de Imagen'] || '';
    const caption = figura['Caption'] || figura['Título/Descripción'] || '';
    const fuente = figura['Fuente'] || '';
    const textoAlt = figura['TextoAlternativo'] || caption;
    const ancho = figura['Ancho'] || '0.8';

    let tex = `\\begin{figure}[H]\n`;
    tex += `  {\\centering\n`;
    
    // 1. Caption (Título) arriba
    if (caption) {
        tex += `  \\caption{${escaparLatex(caption)}}\n`;
        tex += `  \\label{fig:${generarLabel(caption)}}\n`;
    }

    // 2. Imagen
    if (rutaArchivo) {
        if (textoAlt) {
            tex += `  % Texto alternativo para accesibilidad\n`;
            tex += `  \\pdftooltip{\\includegraphics[width=${ancho}\\textwidth]{${rutaArchivo}}}{${escaparLatex(textoAlt)}}\n`;
        } else {
            tex += `  \\includegraphics[width=${ancho}\\textwidth]{${rutaArchivo}}\n`;
        }
    }
    tex += `  \\par}\n`;
    tex += `  \\raggedright\n`;

    tex += `\\end{figure}\n`;
    
    // 3. Fuente abajo
    if (fuente) {
        tex += `\\vspace{-4pt}\n`;
        tex += `\\fuente{${procesarTextoFuente(fuente)}}\n`;
    }
    tex += `\n`;
    return tex;
}

function generarTabla(tabla) {
    const titulo = tabla['Titulo'] || tabla['Título'] || '';
    const fuente = tabla['Fuente'] || '';
    // Use the parsed data directly passed from backend fetcher
    const datos = tabla['ParsedData'] || [];

    // Fallback if data not parsed but reference exists
    if (datos.length === 0) {
        return `\\begin{tabladoradoCorto}\n  \\caption{${escaparLatex(titulo)}}\n  \\label{tab:${generarLabel(titulo)}}\n  % Sin datos cargados\n\\end{tabladoradoCorto}\n\n`;
    }

    let texInicio = '';
    let texFin = '';
    let tex = '';
    let esLarga = false;

    const resultado = procesarDatosArray(datos, titulo);
    esLarga = resultado.tipo === 'longtable';

    if (esLarga) {
        // Para tablas largas: usar tabladoradoLargo (sin caption, va en longtable)
        texInicio = `\\begin{tabladoradoLargo}\n`;
        texFin = `\\end{tabladoradoLargo}\n`;
    } else {
        // FIX: Para tablas cortas: usar tabladoradoCorto (mismo estilo que longtable)
        texInicio = `\\begin{tabladoradoCorto}\n`;
        texInicio += `  \\caption{${escaparLatex(titulo)}}\n`;
        texInicio += `  \\label{tab:${generarLabel(titulo)}}\n`;
        texFin = `\\end{tabladoradoCorto}\n`;
    }
    texInicio += resultado.contenido;

    tex = texInicio + texFin;

    if (fuente) {
        tex += `\\vspace{-4pt}\n`;
        tex += `\\fuente{${procesarTextoFuente(fuente)}}\n`;
    }
    tex += `\n`;
    return tex;
}

function procesarDatosArray(datos, tituloTabla, forzarLongtable = false) {
    if (!datos || datos.length === 0) {
        return { tipo: 'tabular', contenido: `  \\begin{tabular}{lc}\n    % Sin datos\n  \\end{tabular}\n` };
    }
    const numCols = datos[0].length;
    // Máximo de columnas por tabla (incluyendo la primera).
    // Requisito: permitir hasta 14 columnas además de la primera (total 15) antes de dividir por columnas.
    const MAX_COLS_POR_TABLA = 15;
    const MAX_FILAS_COMPACTA = 15;
    const MAX_FILAS_POR_PARTE = 35;

    // FIX: Si hay caracteres extraños en los datos que parecen & o \\, ya deberían estar escapados.
    // Pero si el número de columnas varía en los datos respecto al header, tabularx explota.
    // Vamos a normalizar los datos para asegurar que todas las filas tengan el mismo número de columnas.
    const datosNormalizados = normalizarColumnasDatos(datos, numCols);

    if (numCols <= MAX_COLS_POR_TABLA) {
        const numFilas = Math.max(0, datosNormalizados.length - 1);
        if (numFilas <= MAX_FILAS_COMPACTA && !forzarLongtable) {
            return { tipo: 'tabular', contenido: generarTablaCompacta(datosNormalizados) };
        }
        if (numFilas > MAX_FILAS_POR_PARTE) {
            return { tipo: 'longtable', contenido: dividirTablaPorFilas(datosNormalizados, MAX_FILAS_POR_PARTE, tituloTabla) };
        }
        return { tipo: 'longtable', contenido: generarTablaSimple(datosNormalizados, tituloTabla) };
    }
    return { tipo: 'longtable', contenido: dividirTabla(datosNormalizados, MAX_COLS_POR_TABLA, tituloTabla) };
}

// Helper para asegurar consistencia en columnas
function normalizarColumnasDatos(datos, numColsEsperado) {
    return datos.map(fila => {
        if (fila.length === numColsEsperado) return fila;
        if (fila.length > numColsEsperado) return fila.slice(0, numColsEsperado);
        // Rellenar con vacíos si faltan
        return [...fila, ...Array(numColsEsperado - fila.length).fill('')];
    });
}

// ================================
// SENER: Tablas largas (xltabular)
// ================================

// Ajusta el ancho de la primera columna (definido en sener2025.cls)
const SENER_LONGTABLE_FIRSTCOL_WIDTH = '0.34\\textwidth';

function senerLongtablePreamble() {
    return `  \\setlength{\\SENERLongTableFirstColWidth}{${SENER_LONGTABLE_FIRSTCOL_WIDTH}}\n`;
}

function senerLongtableSpec(numCols) {
    // Primera columna: Q (ancha + bold), resto: Z (X) para auto-fit
    return 'Q' + 'Z'.repeat(Math.max(0, numCols - 1));
}

function senerLongtableHeaderRow(celdasEncabezadoProcesadas) {
    // Primera columna normal; resto con encabezado vertical
    return celdasEncabezadoProcesadas
        .map((c, idx) => idx === 0
            ? `\\encabezadodorado{${c}}`
            : `\\encabezadodorado{\\SENERVHeader{${c}}}`)
        .join(' & ');
}

function generarTablaSimple(datos, tituloTabla) {
    const numCols = datos[0].length;
    const especCols = senerLongtableSpec(numCols);
    
    let tex = senerLongtablePreamble();
    tex += `  \\begin{xltabular}{\\textwidth}{${especCols}}\n`;
    if (tituloTabla) tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
    
    // Encabezado para la primera página
    tex += `    \\toprule\n`;
    const encabezados = senerLongtableHeaderRow(procesarCeldasFila(datos[0], true, true));
    tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\endfirsthead\n\n`;
    
    // Encabezado para páginas siguientes
    tex += `    \\multicolumn{${numCols}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
    tex += `    \\toprule\n`;
    tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\endhead\n\n`;
    
    // Pie de tabla en páginas intermedias
    tex += `    \\midrule\n`;
    tex += `    \\multicolumn{${numCols}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
    tex += `    \\endfoot\n\n`;
    
    // Pie de tabla en la última página
    tex += `    \\bottomrule\n`;
    tex += `    \\endlastfoot\n\n`;
    
    for (let i = 1; i < datos.length; i++) {
        const celdas = procesarCeldasFila(datos[i], false, true);
        tex += `    ${celdas.join(' & ')} \\\\\n`;
    }
    tex += `  \\end{xltabular}\n`;
    return tex;
}

function generarTablaCompacta(datos) {
    const numCols = datos[0].length;
    const especCols = 'V' + ('v'.repeat(numCols - 1));
    let tex = `  \\begin{tabularx}{\\textwidth}{${especCols}}\n`;
    tex += `    \\toprule\n`;
    const encabezados = procesarCeldasFila(datos[0], true, false).map(c => `\\encabezadodorado{${c}}`).join(' & ');
    tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
    tex += `    \\midrule\n`;
    for (let i = 1; i < datos.length; i++) {
        const celdas = procesarCeldasFila(datos[i], false, false);
        tex += `    ${celdas.join(' & ')} \\\\\n`;
    }
    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    return tex;
}

function dividirTabla(datos, maxCols, tituloTabla) {
    const numCols = datos[0].length;
    let tex = '';
    let parte = 1;
    const colsPorParte = maxCols - 1;
    let colInicio = 1;

    while (colInicio < numCols) {
        const colFin = Math.min(colInicio + colsPorParte, numCols);
        
        if (parte > 1) {
            tex += `\n  \\clearpage\n`;
            tex += `  {\\small\\textit{Continuación Tabla. ${escaparLatex(tituloTabla || '')}}}\n`;
            tex += `  \\vspace{0.15em}\n\n`;
        }
        
        const colsEnEstaParte = [0].concat(Array.from({ length: colFin - colInicio }, (_, i) => colInicio + i));
        const numColsTabla = colsEnEstaParte.length;
        const especCols = senerLongtableSpec(numColsTabla);
        
        tex += senerLongtablePreamble();
        tex += `  \\begin{xltabular}{\\textwidth}{${especCols}}\n`;
        if (tituloTabla && parte === 1) tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
        
        const celdasEncabezado = colsEnEstaParte.map(colIdx => datos[0][colIdx]);
        const encabezados = senerLongtableHeaderRow(procesarCeldasFila(celdasEncabezado, true, true));
        
        tex += `    \\toprule\n`;
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endfirsthead\n\n`;
        
        tex += `    \\multicolumn{${numColsTabla}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
        tex += `    \\toprule\n`;
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endhead\n\n`;
        
        tex += `    \\midrule\n`;
        tex += `    \\multicolumn{${numColsTabla}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
        tex += `    \\endfoot\n\n`;
        
        tex += `    \\bottomrule\n`;
        tex += `    \\endlastfoot\n\n`;
        
        for (let i = 1; i < datos.length; i++) {
            const celdasParte = colsEnEstaParte.map(colIdx => datos[i][colIdx]);
            const celdas = procesarCeldasFila(celdasParte, false, true);
            tex += `    ${celdas.join(' & ')} \\\\\n`;
        }
        tex += `  \\end{xltabular}\n`;
        colInicio = colFin;
        parte++;
    }
    return tex;
}

function dividirTablaPorFilas(datos, maxFilasParte, tituloTabla) {
    const numCols = datos[0].length;
    const especCols = senerLongtableSpec(numCols);
    let tex = '';
    let inicio = 1;
    let parte = 1;
    while (inicio < datos.length) {
        const fin = Math.min(inicio + maxFilasParte, datos.length);
        
        tex += senerLongtablePreamble();
        tex += `  \\begin{xltabular}{\\textwidth}{${especCols}}\n`;
        if (tituloTabla && parte === 1) tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
        
        tex += `    \\toprule\n`;
        const encabezados = senerLongtableHeaderRow(procesarCeldasFila(datos[0], true, true));
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endfirsthead\n\n`;
        
        tex += `    \\multicolumn{${numCols}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
        tex += `    \\toprule\n`;
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endhead\n\n`;
        
        tex += `    \\midrule\n`;
        tex += `    \\multicolumn{${numCols}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
        tex += `    \\endfoot\n\n`;
        
        tex += `    \\bottomrule\n`;
        tex += `    \\endlastfoot\n\n`;
        
        for (let i = inicio; i < fin; i++) {
            const celdas = procesarCeldasFila(datos[i], false, true);
            tex += `    ${celdas.join(' & ')} \\\\\n`;
        }
        tex += `  \\end{xltabular}\n`;
        
        if (fin < datos.length) {
            tex += `\n  \\clearpage\n  {\\small\\textit{Continuación Tabla. ${escaparLatex(tituloTabla || '')}}}\n\n`;
        }
        inicio = fin;
        parte++;
    }
    return tex;
}

function generarGlosario(glosario) {
    let tex = `\\section*{Glosario}\n\\phantomsection\n\\addcontentsline{toc}{section}{Glosario}\n\n`;
    glosario.sort((a, b) => (a['Termino'] || '').toString().toLowerCase().localeCompare((b['Termino'] || '').toString().toLowerCase()));
    glosario.forEach(entrada => {
        const termino = entrada['Termino'] || '';
        const definicion = entrada['Definicion'] || '';
        if (termino && definicion) tex += `\\entradaGlosario{${escaparLatex(termino)}}{${escaparLatex(definicion)}}\n`;
    });
    tex += `\n`;
    return tex;
}

function generarSiglas(siglas) {
    let tex = `\\section*{Siglas y Acrónimos}\n\\phantomsection\n\\addcontentsline{toc}{section}{Siglas y Acrónimos}\n\n`;
    siglas.sort((a, b) => (a['Sigla'] || '').toString().toLowerCase().localeCompare((b['Sigla'] || '').toString().toLowerCase()));
    siglas.forEach(entrada => {
        const sigla = entrada['Sigla'] || '';
        const descripcion = entrada['Descripcion'] || entrada['Definición/Significado'] || '';
        if (sigla && descripcion) tex += `\\entradaSigla{${escaparLatex(sigla)}}{${escaparLatex(descripcion)}}\n`;
    });
    tex += `\n`;
    return tex;
}

function generarLabel(texto) {
    return (texto || '').toString().toLowerCase()
        .replace(/[áàäâ]/g, 'a').replace(/[éèëê]/g, 'e').replace(/[íìïî]/g, 'i').replace(/[óòöô]/g, 'o').replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n').replace(/[^a-z0-9]/g, '_').substring(0, 30);
}

// --- Helpers for Text Processing ---

function formatearFecha(fechaRaw) {
    if (!fechaRaw) return '';
    // If it comes as "DD/MM/YYYY" string
    if (typeof fechaRaw === 'string' && fechaRaw.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [d, m, y] = fechaRaw.split('/');
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        return `${parseInt(d)} de ${meses[parseInt(m) - 1]} de ${y}`;
    }
    return fechaRaw.toString();
}

function generarFechaPDF() {
    const ahora = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${ahora.getFullYear()}${pad(ahora.getMonth() + 1)}${pad(ahora.getDate())}${pad(ahora.getHours())}${pad(ahora.getMinutes())}${pad(ahora.getSeconds())}`;
}

function escaparLatexBasico(texto) {
    if (!texto) return '';
    return texto.toString()
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([&%$#_{}])/g, '\\$1')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}');
}

function escaparFootnote(texto) {
    if (!texto) return '';
    const normalizado = normalizarSaltosLatex(texto);
    return escaparLatexBasico(normalizado);
}

function validarYCorregirLatex(str) {
    if (!str) return str;
    let corregido = str;
    if (corregido.includes('\\textbackslash{}par')) corregido = corregido.replace(/\\textbackslash\{\}par/g, '\n\n');
    if (corregido.match(/^\\\\[^\\]/gm)) corregido = corregido.replace(/^\\\\([^\\])/gm, '$1');
    if (corregido.match(/\\\\[A-Za-z]/)) corregido = corregido.replace(/\\\\([A-Za-z])/g, ' $1');
    if (corregido.includes('\\textbackslash{}begin')) corregido = corregido.replace(/\\textbackslash\{\}begin/g, '\\begin');
    if (corregido.includes('\\textbackslash{}end')) corregido = corregido.replace(/\\textbackslash\{\}end/g, '\\end');
    if (corregido.includes('\\textbackslash{}section')) corregido = corregido.replace(/\\textbackslash\{\}section/g, '\\section');
    if (corregido.includes('\\textbackslash{}item')) corregido = corregido.replace(/\\textbackslash\{\}item/g, '\\item');
    return corregido;
}

function escaparLatex(texto) {
    return escaparLatexBasico(texto);
}

function normalizarSaltosLatex(str) {
    if (!str) return '';
    str = str.replace(/\\n/g, '\n');
    str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    str = str.replace(/[ \t]+$/gm, '');
    str = str.replace(/\n{2,}/g, '\n\n');
    str = str.replace(/[ \t]+/g, ' ');
    str = str.trim();
    return str;
}

function procesarConEtiquetas(texto) {
    if (!texto) return '';
    let str = texto.toString();
    str = normalizarSaltosLatex(str);

    const ecuaciones = [];
    str = str.replace(/\$([^$]+)\$/g, (m, c) => { ecuaciones.push(`$${c}$`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });
    str = str.replace(/\$\$([\s\S]*?)\$\$/g, (m, c) => { ecuaciones.push(`$$${c}$$`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });
    str = str.replace(/\\\\?\(([\s\S]*?)\\\\?\)/g, (m, c) => { ecuaciones.push(`\\(${c}\\)`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });
    str = str.replace(/\\\\?\[([\s\S]*?)\\\\?\]/g, (m, c) => { ecuaciones.push(`\\[${c}\\]`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });
    str = str.replace(/\[\[ecuacion:([\s\S]*?)\]\]/g, (m, c) => { ecuaciones.push(`\\begin{equation}\n${c.trim()}\n\\end{equation}`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });
    str = str.replace(/\[\[math:([\s\S]*?)\]\]/g, (m, c) => { ecuaciones.push(`$${c.trim()}$`); return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`; });

    const citas = [];
    str = str.replace(/\[\[cita:([\s\S]*?)\]\]/g, (m, c) => { citas.push(`\\cite{${c.trim()}}`); return `ZCITEPOLDER${citas.length - 1}Z`; });

    const recuadros = [];
    str = str.replace(/\[\[recuadro:([^\]]*)\]\]([\s\S]*?)\[\[\/recuadro\]\]/g, (m, t, c) => {
        const tituloArg = t.trim() ? `{${escaparLatex(t.trim())}}` : '';
        // Procesar contenido interno recursivamente para permitir otras etiquetas (negritas, math, etc.)
        // pero evitar recuadros anidados (regex no lo captura bien de todos modos)
        const contenidoProcesado = procesarConEtiquetas(c);
        recuadros.push(`\\begin{recuadro}${tituloArg}\n${contenidoProcesado}\n\\end{recuadro}`);
        return `ZRECUADROPLACEHOLDER${recuadros.length - 1}Z`;
    });

    const etiquetas = [];
    str = str.replace(/\[\[nota:([\s\S]*?)\]\]/g, (m, c) => { etiquetas.push(`\\footnote{${escaparFootnote(c)}}`); return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`; });

    // Para destacado, dorado y guinda, ES FUNDAMENTAL escapar el contenido 'c'
    // ya que se inserta en un contexto LaTeX ya protegido.
    str = str.replace(/\[\[destacado:([\s\S]*?)\]\]/g, (m, c) => {
        etiquetas.push(`\\begin{destacado}\n${procesarConEtiquetas(c)}\n\\end{destacado}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    str = str.replace(/\[\[dorado:([\s\S]*?)\]\]/g, (m, c) => {
        etiquetas.push(`\\textbf{\\textcolor{gobmxDorado}{${escaparLatexBasico(c)}}}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    str = str.replace(/\[\[guinda:([\s\S]*?)\]\]/g, (m, c) => {
        etiquetas.push(`\\textbf{\\textcolor{gobmxGuinda}{${escaparLatexBasico(c)}}}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    str = escaparLatexBasico(str);
    str = str.replace(/[""]/g, '"').replace(/['']/g, "'");

    str = str.replace(/ZRECUADROPLACEHOLDER(\d+)Z/g, (m, i) => recuadros[parseInt(i)]);
    str = str.replace(/ZETIQUETAPLACEHOLDER(\d+)Z/g, (m, i) => etiquetas[parseInt(i)]);
    str = str.replace(/ZCITEPOLDER(\d+)Z/g, (m, i) => citas[parseInt(i)]);
    str = str.replace(/ZEQPLACEHOLDER(\d+)Z/g, (m, i) => ecuaciones[parseInt(i)]);

    str = validarYCorregirLatex(str);
    return str;
}

function procesarTextoFuente(texto) {
    if (!texto) return '';

    // Usar normalización segura de saltos
    const textoNormalizado = normalizarSaltosLatex(texto);

    // Separar en líneas para reconstruir con espacios simples
    const lineas = textoNormalizado.split(/\s+/).filter(l => l.trim() !== '');

    // Reconstruir texto en una sola línea para facilitar el regex
    const textoCompleto = lineas.join(' ');

    // Separar fuente principal de notas usando regex para marcadores "1/", "a/", etc.
    // El regex busca palabra boundary + digitos/letras + barra
    const partesTexto = textoCompleto.split(/(\b[0-9]+\/|\b[a-zA-Z]+\/)/);

    let textoFuente = '';
    const lineasNotas = [];

    for (let i = 0; i < partesTexto.length; i++) {
        const parte = partesTexto[i];
        // Verificar si es un marcador de nota
        if (parte.match(/^([0-9]+\/|[a-zA-Z]+\/)$/)) {
            // Es una nota, tomar el siguiente elemento como contenido
            const contenidoNota = partesTexto[i + 1] || '';
            lineasNotas.push({
                nota: parte,
                texto: contenidoNota.trim()
            });
            i++; // Saltar el contenido ya procesado
        } else if (parte.trim()) {
            // Es parte del texto de la fuente principal
            textoFuente += parte + ' ';
        }
    }

    // Construir resultado LaTeX
    let resultado = '';

    // Agregar fuente principal procesando etiquetas (permite negritas, etc.)
    if (textoFuente.trim()) {
        resultado += procesarConEtiquetas(textoFuente.trim());
    }

    // Agregar notas como lista si existen
    if (lineasNotas.length > 0) {
        resultado += '\n\n{\\fontsize{9pt}{11pt}\\selectfont\n';
        resultado += '\\begin{itemize}\n';

        lineasNotas.forEach(item => {
            const idNota = generarIdNota(item.nota);
            const notaEscapada = escaparLatex(item.nota);
            // Procesar etiquetas dentro del texto de la nota también
            const textoProcesado = procesarConEtiquetas(item.texto);

            resultado += `  \\item[\\hypertarget{${idNota}}{${notaEscapada}}] ${textoProcesado}\n`;
        });

        resultado += '\\end{itemize}\n}';
    }

    return resultado;
}

function generarIdNota(nota) {
    return 'nota' + nota.replace('/', '');
}

function estilizarNotas(texto) {
    const match = texto.match(/^(.*?)\s+([0-9]+\/(?:,[0-9]+\/)*|[a-zA-Z]+\/(?:,[a-zA-Z]+\/)*)\s*$/);
    if (match) {
        return { textoBase: match[1], notas: match[2].split(','), tieneNotas: true };
    }
    return { textoBase: texto, notas: [], tieneNotas: false };
}

function procesarCeldasFila(fila, esEncabezado = false, esTablaLarga = false) {
    return fila.map((c, idx) => {
        if (c === null || c === undefined || c === '') return '';
        if (typeof c === 'number') {
            const nf = Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: true });
            return escaparLatex(nf.format(c));
        }
        const num = parseFloat(c);
        if (!isNaN(num) && c.toString().includes('.')) {
            const decimales = c.toString().split('.')[1];
            if (decimales && decimales.length > 4) {
                const nf = Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: true });
                return escaparLatex(nf.format(num));
            }
        }

        const textoOriginal = c.toString();
        const resultado = estilizarNotas(textoOriginal);
        let textoFinal;
        if (resultado.tieneNotas) {
            const textoBaseEscapado = escaparLatex(resultado.textoBase);
            const colorNota = esEncabezado ? 'white' : 'black';
            const notasLatex = resultado.notas.map(nota => {
                return `\\hyperlink{${generarIdNota(nota)}}{\\textcolor{${colorNota}}{${escaparLatex(nota)}}}`;
            }).join(',');
            textoFinal = `${textoBaseEscapado} \\textsuperscript{${notasLatex}}`;
        } else {
            textoFinal = escaparLatex(textoOriginal);
        }

        if (esTablaLarga && idx === 0 && !esEncabezado) {
            const matchEspacios = textoOriginal.match(/^(\s+)/);
            if (matchEspacios) {
                const numEspacios = matchEspacios[1].length;
                const sangria = (numEspacios === 1) ? '\\quad ' : '\\hspace{' + (numEspacios * 0.45) + 'em} ';
                textoFinal = sangria + textoFinal.trimStart();
            }
        }
        return textoFinal;
    });
}

// ============================================================================
// DATA FETCHING (Node.js version)
// ============================================================================

async function fetchSheetData(spreadsheetId, range, token) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
    const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
        throw new Error(`Error fetching ${range}: ${response.statusText}`);
    }
    const json = await response.json();
    return json.values || [];
}

async function fetchAndParseSheet(spreadsheetId, sheetName, token) {
    try {
        const rows = await fetchSheetData(spreadsheetId, sheetName, token);
        if (!rows || rows.length < 2) return [];
        const headers = rows[0];
        return rows.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = row[i];
            });
            return obj;
        });
    } catch (e) {
        console.warn(`Could not fetch sheet ${sheetName}:`, e.message);
        return [];
    }
}

// Special fetcher for table content (ranges)
async function fetchTableContent(spreadsheetId, rangeRef, token) {
    if (!rangeRef) return [];
    try {
        let cleanRange = rangeRef.trim();

        // Fix for when the range is like "Datos Tablas'!A3:D6" (missing opening quote)
        // or "Datos Tablas!A3:D6" (no quotes but space in name)

        // 1. If it contains '!', check the sheet part
        if (cleanRange.includes('!')) {
            const parts = cleanRange.split('!');
            let sheet = parts[0];
            const cells = parts.slice(1).join('!');

            // If sheet name has spaces and is NOT quoted, we must quote it.
            // If it is partially quoted (e.g. Datos Tablas'), fix it.

            // Check for unbalanced quotes or missing start quote
            if (sheet.endsWith("'") && !sheet.startsWith("'")) {
                sheet = "'" + sheet;
            } else if (!sheet.startsWith("'") && sheet.includes(' ')) {
                sheet = "'" + sheet + "'";
            }

            cleanRange = `${sheet}!${cells}`;
        }

        return await fetchSheetData(spreadsheetId, cleanRange, token);
    } catch (e) {
        console.warn(`Error fetching table content for range ${rangeRef} (cleaned: ${cleanRange}):`, e.message);
        throw e; // Rethrow to let caller handle it
    }
}

async function generateLatex(spreadsheetId, docId, token) {
    // 1. Fetch all necessary sheets
    const [docs, secciones, figuras, tablas, bibliografia, siglas, glosario] = await Promise.all([
        fetchAndParseSheet(spreadsheetId, 'Documentos', token),
        fetchAndParseSheet(spreadsheetId, 'Secciones', token),
        fetchAndParseSheet(spreadsheetId, 'Figuras', token),
        fetchAndParseSheet(spreadsheetId, 'Tablas', token),
        fetchAndParseSheet(spreadsheetId, 'Bibliografia', token),
        fetchAndParseSheet(spreadsheetId, 'Siglas', token),
        fetchAndParseSheet(spreadsheetId, 'Glosario', token)
    ]);

    // 2. Filter for docId
    const datosDoc = docs.find(d => d.ID === docId);
    if (!datosDoc) throw new Error(`Documento con ID ${docId} no encontrado.`);

    const filterByDoc = (list) => list.filter(item => item.DocumentoID === docId);

    const docSecciones = filterByDoc(secciones);
    const docFiguras = filterByDoc(figuras);
    const docTablas = filterByDoc(tablas);
    const docBibliografia = filterByDoc(bibliografia);
    const docSiglas = filterByDoc(siglas);
    const docGlosario = filterByDoc(glosario);

    // 3. Fetch inner data for tables (Data CSV ranges)
    // This is the heavy part: we need to fetch the content for each table
    await Promise.all(docTablas.map(async (tabla) => {
        const range = tabla['Datos CSV'] || tabla['DatosCSV'];
        if (range) {
            try {
                tabla['ParsedData'] = await fetchTableContent(spreadsheetId, range, token);
                if (!tabla['ParsedData'] || tabla['ParsedData'].length === 0) {
                    console.warn(`Warning: Table ${tabla['Titulo'] || 'Unknown'} has empty data for range ${range}`);
                }
            } catch (err) {
                console.error(`Error fetching table data for ${range}:`, err);
                tabla['ParsedData'] = [];
            }
        } else {
            // Try to construct range from legacy fields if needed, or log warning
            // console.warn('Table without range:', tabla);
        }
    }));

    // 4. Generate LaTeX
    const tex = generarLatexString(datosDoc, docSecciones, docBibliografia, docFiguras, docTablas, docSiglas, docGlosario);

    // 5. Generate References (BibTeX) content if needed
    let bib = '';
    if (docBibliografia.length > 0) {
        docBibliografia.forEach(ref => {
            const tipo = ref['Tipo'] ? ref['Tipo'].toLowerCase() : 'misc';
            let entry = `@${tipo}{${ref['Clave']},\n`;
            if (ref['Autor']) entry += `  author = {${ref['Autor']}},\n`;
            if (ref['Titulo']) entry += `  title = {${ref['Titulo']}},\n`;
            if (ref['Anio']) entry += `  year = {${ref['Anio']}},\n`;
            if (ref['Editorial']) entry += `  publisher = {${ref['Editorial']}},\n`;
            if (ref['Url']) entry += `  url = {${ref['Url']}},\n`;
            entry += '}\n';
            bib += entry;
        });
    }

    return {
        tex,
        bib,
        filename: datosDoc['DocumentoCorto'] || 'documento'
    };
}

module.exports = { generateLatex };
