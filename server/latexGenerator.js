
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args)).catch(() => global.fetch(...args));

// ============================================================================
// CORE LATEX GENERATION LOGIC (Ported from GAS)
// ============================================================================

/**
 * Main function to generate the LaTeX string
 */
function generarLatexString(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades) {
    // 1. Sort sections hierarchically
    secciones.sort((a, b) => {
        const oa = (a.Orden || '').toString().trim();
        const ob = (b.Orden || '').toString().trim();
        const partsA = oa.split('.');
        const partsB = ob.split('.');
        const len = Math.max(partsA.length, partsB.length);
        for (let i = 0; i < len; i++) {
            const numA = parseInt(partsA[i]) || 0;
            const numB = parseInt(partsB[i]) || 0;
            if (numA !== numB) return numA - numB;
        }
        return 0;
    });

    // 2. Build Content
    const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades);

    return tex;
}

/**
 * Builds the complete LaTeX document
 */
function construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades) {
    let tex = '';

    // Helpers to match Frontend ID generation
    const computeFigureId = (sec, ord) => {
        const s = (sec || '').toString().trim();
        const o = (ord || '').toString().trim();
        if (s && o) return `FIG-${s}-${o}`;
        if (o) return `FIG-${o}`;
        return '';
    };

    const computeTableId = (sec, ord) => {
        const s = (sec || '').toString().trim();
        const o = (ord || '').toString().trim();
        if (s && o) return `TBL-${s}-${o}`;
        if (o) return `TBL-${o}`;
        return '';
    };

    const figurasById = {};
    figuras.forEach(f => {
        // Try explicit ID first, then computed
        let id = f['ID'] || '';
        if (!id) {
            const sec = f['SeccionOrden'] || f['Seccion'] || f['ID_Seccion'] || '';
            const ord = f['OrdenFigura'] || f['Orden'] || '';
            id = computeFigureId(sec, ord);
        }
        if (id) figurasById[id.toString().trim()] = f;
    });

    const tablasById = {};
    tablas.forEach(t => {
        let id = t['ID'] || '';
        if (!id) {
            const sec = t['SeccionOrden'] || t['Seccion'] || t['ID_Seccion'] || '';
            const ord = t['OrdenTabla'] || t['Orden'] || '';
            id = computeTableId(sec, ord);
        }
        if (id) tablasById[id.toString().trim()] = t;
    });

    // We still pass the maps for potential fallback, but primarily we use the ID maps in procesarSecciones
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
    const agradecimientosRaw = datosDoc['Agradecimientos'] || datosDoc['Agradecimiento'] || datosDoc['Acknowledgements'];
    if (agradecimientosRaw && agradecimientosRaw.toString().trim()) {
        console.log('Procesando Agradecimientos...');
        // HOTFIX: Unir líneas rotas específicas de (CONADESUCA) que rompen la indentación
        const agradecimientosClean = agradecimientosRaw.toString()
            .replace(/Azúcar\s*\n\s*\(CONADESUCA\)/gi, 'Azúcar (CONADESUCA)');

        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Agradecimientos}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarContenido(agradecimientosClean, figurasById, tablasById)}\n\n`;
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
        tex += `${procesarContenido(presentacionRaw, figurasById, tablasById)}\n\n`;
    }

    // --- Executive Summary ---
    if (datosDoc['ResumenEjecutivo'] && datosDoc['ResumenEjecutivo'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Resumen Ejecutivo}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarContenido(datosDoc['ResumenEjecutivo'], figurasById, tablasById)}\n\n`;
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
    const resultado = procesarSecciones(secciones, figurasMap, tablasMap, figurasById, tablasById);
    tex += resultado.contenido;

    // --- Glossary ---
    if (glosario.length > 0) {
        tex += generarGlosario(glosario);
    }

    // --- Acronyms ---
    if (siglas.length > 0) {
        tex += generarSiglas(siglas);
    }

    // --- Units ---
    if (unidades && unidades.length > 0) {
        tex += generarUnidades(unidades);
    }

    // --- Bibliography ---
    if (bibliografia.length > 0) {
        tex += `\\printbibliography\n\n`;
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

function procesarSecciones(secciones, figurasMap, tablasMap, figurasById, tablasById) {
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

        // --- LÓGICA DE TÍTULOS HORIZONTALES INTELIGENTES ---
        let esInicioHorizontal = false;
        const lineas = contenidoRaw.split('\n').map(l => l.trim()).filter(l => l !== '');

        if (lineas.length > 0) {
            const primeraLinea = lineas[0];
            const matchFig = primeraLinea.match(/^\[\[figura:(.+?)\]\]$/i);
            const matchTab = primeraLinea.match(/^\[\[tabla:(.+?)\]\]$/i);

            if (matchFig) {
                const fig = figurasById[matchFig[1]];
                if (fig) {
                    const opts = (fig['Opciones'] || fig['Estilo'] || '').toString().toLowerCase();
                    const horiz = (fig['Horizontal'] || '').toString().toLowerCase().includes('si');
                    if (opts.includes('horizontal') || horiz) esInicioHorizontal = true;
                }
            } else if (matchTab) {
                const tab = tablasById[matchTab[1]];
                if (tab) {
                    const opts = (tab['Opciones'] || tab['Estilo'] || '').toString().toLowerCase();
                    const horiz = (tab['Horizontal'] || '').toString().toLowerCase().includes('si');
                    if (opts.includes('horizontal') || horiz) esInicioHorizontal = true;
                }
            }
        }

        if (esInicioHorizontal) {
            // Pasamos el título para ser incrustado
            contenido += procesarContenido(contenidoRaw, figurasById, tablasById, { nivel, titulo });
        } else {
            // Comportamiento estándar
            contenido += generarComandoSeccion(nivel, titulo, anexosIniciados);
            contenido += procesarContenido(contenidoRaw, figurasById, tablasById);
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

function procesarContenido(contenidoRaw, figurasById = {}, tablasById = {}, seccionPendiente = null) {
    const lineas = contenidoRaw.split('\n');
    let resultado = '';
    let enLista = false;
    let enBloque = false;
    let tipoBloque = '';
    let tituloBloque = '';
    let contenidoBloque = '';
    let seccionIncrustada = false;

    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        const lineaTrim = linea.trim();

        if (seccionPendiente && !seccionIncrustada && lineaTrim !== '') {
            const esFig = lineaTrim.startsWith('[[figura:');
            const esTab = lineaTrim.startsWith('[[tabla:');

            if (!esFig && !esTab) {
                // If it is NOT a figure or table, we missed the opportunity to embed.
            }
        }

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

        const esItemLista = lineaTrim.match(/^[-*•]\s*(.*)/);

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
                    if (match) {
                        const id = match[1].trim();
                        const tabla = tablasById[id];
                        if (tabla) {
                            if (seccionPendiente && !seccionIncrustada) {
                                resultado += generarTabla(tabla, seccionPendiente);
                                seccionIncrustada = true;
                            } else {
                                resultado += generarTabla(tabla);
                            }
                        } else {
                            resultado += `% ERROR: Tabla ${id} no encontrada\n\\textbf{\\textcolor{red}{[Error: Tabla ${escaparLatex(id)} no encontrada]}}\n`;
                        }
                    }
                } else if (lineaTrim.startsWith('[[figura:')) {
                    const match = lineaTrim.match(/\[\[figura:(.+?)\]\]/);
                    if (match) {
                        const id = match[1].trim();
                        const figura = figurasById[id];
                        if (figura) {
                            if (seccionPendiente && !seccionIncrustada) {
                                resultado += generarFigura(figura, seccionPendiente);
                                seccionIncrustada = true;
                            } else {
                                resultado += generarFigura(figura);
                            }
                        } else {
                            resultado += `% ERROR: Figura ${id} no encontrada\n\\textbf{\\textcolor{red}{[Error: Figura ${escaparLatex(id)} no encontrada]}}\n`;
                        }
                    }
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

function generarFigura(figura, seccionInfo = null) {
    const rutaArchivo = figura['RutaArchivo'] || figura['Ruta de Imagen'] || figura['RutaImagen'] || '';
    const caption = figura['Caption'] || figura['Título/Descripción'] || figura['Titulo'] || figura['Descripción'] || figura['Descripcion'] || '';
    const fuente = figura['Fuente'] || '';
    const textoAlt = figura['TextoAlternativo'] || caption;
    const ancho = figura['Ancho'] || '1.0';
    const forcedId = (figura['ID'] || '').toString();
    const sec = (figura['SeccionOrden'] || '').toString();
    const ord = (figura['Fig.'] || figura['OrdenFigura'] || figura['Orden'] || '').toString();
    const id = forcedId || ((sec && ord) ? `FIG-${sec}-${ord}` : (ord ? `FIG-${ord}` : ''));

    const rawOpciones = figura['Opciones'] || figura['Estilo'] || figura['Style'] || figura['Options'] || figura['Configuracion'] || figura['Configuración'] || '';
    const opciones = rawOpciones.toString().toLowerCase();

    const rawHorizontal = figura['Horizontal'] || figura['Apaisado'] || figura['Landscape'] || '';
    const flagHorizontal = rawHorizontal.toString().toLowerCase().includes('si') || rawHorizontal.toString().toLowerCase() === 'true';

    const rawHojaCompleta = figura['HojaCompleta'] || figura['Hoja Completa'] || figura['FullPage'] || figura['PaginaCompleta'] || figura['PáginaCompleta'] || '';
    const flagHojaCompleta = rawHojaCompleta.toString().toLowerCase().includes('si') || rawHojaCompleta.toString().toLowerCase() === 'true';

    const esHorizontal = opciones.includes('horizontal') || flagHorizontal;
    const esHojaCompleta = opciones.includes('hoja_completa') || opciones.includes('hoja completa') || flagHojaCompleta;

    console.log(`Procesando Figura ${id || caption}: Opciones="${opciones}", Horizontal=${esHorizontal}, HojaCompleta=${esHojaCompleta}`);

    let tex = '';

    if (esHorizontal) {
        tex += `\\begin{figuraespecial}\n`;

        if (seccionInfo) {
            const nivel = seccionInfo.nivel.toLowerCase();
            const tituloSafe = escaparLatex(seccionInfo.titulo);

            if (nivel === 'subseccion' || nivel === 'subanexo') {
                tex += `  \\subseccionHorizontal{${tituloSafe}}\n`;
            } else if (nivel === 'seccion' || nivel === 'anexo') {
                tex += `  \\seccionHorizontal{${tituloSafe}}\n`;
            } else {
                tex += `  \\tituloHorizontal{${tituloSafe}}\n`;
            }
        }

        if (caption) {
            tex += `  \\captionHorizontal{${escaparLatex(caption)}}\n`;
        }

        if (rutaArchivo) {
            tex += `  \\imagenHorizontal{${rutaArchivo}}{fig:${id || generarLabel(caption)}}\n`;
        }

        if (fuente) {
            tex += formatearNotasYFuente(procesarTextoFuente(fuente), true);
        }

        tex += `\\end{figuraespecial}\n`;

    } else {
        tex += `\\Needspace{18\\baselineskip}\n`;
        tex += `\\begin{figure}[H]\n`;
        tex += `  {\\centering\n`;

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

        if (caption) {
            const capTxt = escaparLatex(caption);
            tex += `  \\caption{${capTxt}}\n`;
            tex += `  \\label{fig:${id || generarLabel(caption)}}\n`;
        }

        tex += `\\end{figure}\n`;

        if (fuente) {
            tex += formatearNotasYFuente(procesarTextoFuente(fuente), false);
        }
    }

    tex += `\n`;
    return tex;
}

function generarTabla(tabla, seccionInfo = null) {
    const titulo = tabla['Titulo'] || tabla['Título'] || '';
    const fuente = tabla['Fuente'] || '';
    // Handle both old array format and new object format
    const parsedData = tabla['ParsedData'] || {};
    const datos = Array.isArray(parsedData) ? parsedData : (parsedData.data || []);
    const merges = Array.isArray(parsedData) ? [] : (parsedData.merges || []);
    const frozenRows = Array.isArray(parsedData) ? 0 : (parsedData.frozenRows || 0);

    // Determine number of header rows (priority: Manual Metadata > Frozen Rows > Default 1)
    const filasEncabezadoManual = tabla['Filas Encabezado'] || tabla['FilasEncabezado'] || tabla['HeaderRows'];
    const numHeaderRows = filasEncabezadoManual ? parseInt(filasEncabezadoManual) : (frozenRows > 0 ? frozenRows : 1);

    const forcedId = (tabla['ID'] || '').toString();
    const sec = (tabla['SeccionOrden'] || tabla['ID_Seccion'] || '').toString();
    const ord = (tabla['Orden'] || tabla['OrdenTabla'] || '').toString();
    const id = forcedId || ((sec && ord) ? `TBL-${sec}-${ord}` : (ord ? `TBL-${ord}` : ''));

    const opciones = (tabla['Opciones'] || tabla['Estilo'] || '').toString().toLowerCase();
    const esHorizontal = opciones.includes('horizontal') || (tabla['Horizontal'] || '').toString().toLowerCase().includes('si');

    if (datos.length === 0) {
        const capTxt = escaparLatex(titulo);
        if (esHorizontal) {
            let tex = `\\begin{tablaespecial}\n`;
            if (seccionInfo) {
                const nivel = seccionInfo.nivel.toLowerCase();
                const tituloSafe = escaparLatex(seccionInfo.titulo);
                if (nivel === 'subseccion' || nivel === 'subanexo') tex += `  \\subseccionHorizontal{${tituloSafe}}\n`;
                else if (nivel === 'seccion' || nivel === 'anexo') tex += `  \\seccionHorizontal{${tituloSafe}}\n`;
                else tex += `  \\tituloHorizontal{${tituloSafe}}\n`;
            }
            tex += `  \\caption{${capTxt}}\n  \\label{tab:${id || generarLabel(titulo)}}\n  % Sin datos cargados\n\\end{tablaespecial}\n\n`;
            return tex;
        } else {
            return `\\begin{tabladoradoCorto}\n  \\caption{${capTxt}}\n  \\label{tab:${id || generarLabel(titulo)}}\n  % Sin datos cargados\n\\end{tabladoradoCorto}\n\n`;
        }
    }

    let texInicio = '';
    let texFin = '';
    let tex = '';
    let esLarga = false;

    const resultado = procesarDatosArray(datos, titulo, false, esHorizontal, merges, numHeaderRows);
    esLarga = resultado.tipo === 'longtable';

    if (esHorizontal) {
        texInicio = `\\begin{tablaespecial}\n`;
        if (seccionInfo) {
            const nivel = seccionInfo.nivel.toLowerCase();
            const tituloSafe = escaparLatex(seccionInfo.titulo);
            if (nivel === 'subseccion' || nivel === 'subanexo') texInicio += `  \\subseccionHorizontal{${tituloSafe}}\n`;
            else if (nivel === 'seccion' || nivel === 'anexo') texInicio += `  \\seccionHorizontal{${tituloSafe}}\n`;
            else texInicio += `  \\tituloHorizontal{${tituloSafe}}\n`;
        }

        const capTxt = escaparLatex(titulo);
        texInicio += `  \\captionHorizontal{${capTxt}}\n`;
        texInicio += `  \\label{tab:${id || generarLabel(titulo)}}\n`;

        if (esLarga) {
            texInicio += `\\begin{tabladoradoLargo}\n`;
            texFin = `\\end{tabladoradoLargo}\n`;
        } else {
            texInicio += `\\begin{tabladoradoCorto}\n`;
            texFin = `\\end{tabladoradoCorto}\n`;
        }
        texInicio += resultado.contenido;
        texFin += `\\end{tablaespecial}\n`;

    } else if (esLarga) {
        texInicio = `\\begin{tabladoradoLargo}\n`;
        texFin = `\\end{tabladoradoLargo}\n`;
        texInicio += resultado.contenido;
    } else {
        texInicio = `\\begin{tabladoradoCorto}\n`;
        texInicio += `  \\caption{${escaparLatex(titulo)}}\n`;
        texInicio += `  \\label{tab:${id || generarLabel(titulo)}}\n`;
        texFin = `\\end{tabladoradoCorto}\n`;
        texInicio += resultado.contenido;
    }

    tex = texInicio + texFin;

    if (fuente) {
        if (esHorizontal) {
            tex = tex.replace(/\\end{tablaespecial}/, `${formatearNotasYFuente(procesarTextoFuente(fuente), true)}\n\\end{tablaespecial}`);
        } else {
            tex += formatearNotasYFuente(procesarTextoFuente(fuente), false);
        }
    }
    tex += `\n`;
    return tex;
}

function procesarDatosArray(datos, tituloTabla, forzarLongtable = false, esHorizontal = false, merges = [], frozenRows = 0) {
    if (!datos || datos.length === 0) {
        return { tipo: 'tabular', contenido: `  \\begin{tabular}{lc}\n    % Sin datos\n  \\end{tabular}\n` };
    }

    // Calcular número real de columnas considerando todas las filas y merges
    const numCols = calcularMaxColumnas(datos, merges);
    const numHeaderRows = frozenRows > 0 ? frozenRows : 1;
    const rotarEncabezados = calcularRotacionEncabezados(merges, numHeaderRows, numCols);

    const MAX_COLS_POR_TABLA = 20;
    const MAX_FILAS_COMPACTA = 15;
    const MAX_FILAS_POR_PARTE = 35;

    const datosNormalizados = normalizarColumnasDatos(datos, numCols);

    if (numCols <= MAX_COLS_POR_TABLA) {
        const numFilas = Math.max(0, datosNormalizados.length - numHeaderRows);
        if (numFilas <= MAX_FILAS_COMPACTA && !forzarLongtable) {
            return { tipo: 'tabular', contenido: generarTablaCompacta(datosNormalizados, esHorizontal, merges, numHeaderRows, rotarEncabezados) };
        }
        if (numFilas > MAX_FILAS_POR_PARTE) {
            return { tipo: 'longtable', contenido: dividirTablaPorFilas(datosNormalizados, MAX_FILAS_POR_PARTE, tituloTabla, esHorizontal, merges, numHeaderRows, rotarEncabezados) };
        }
        return { tipo: 'longtable', contenido: generarTablaSimple(datosNormalizados, tituloTabla, esHorizontal, merges, numHeaderRows, rotarEncabezados) };
    }
    return { tipo: 'longtable', contenido: dividirTabla(datosNormalizados, MAX_COLS_POR_TABLA, tituloTabla, esHorizontal, merges, numHeaderRows, rotarEncabezados) };
}

function calcularRotacionEncabezados(merges, numHeaderRows, numCols = 0) {
    const MIN_COLS_PARA_ROTAR = 6;

    // En tablas con pocas columnas, los encabezados deben mantenerse horizontales.
    if (numCols > 0 && numCols < MIN_COLS_PARA_ROTAR) return false;

    if (!merges || merges.length === 0) return true;
    for (const m of merges) {
        if (m.startRowIndex < numHeaderRows && m.startColumnIndex > 0) {
            return false;
        }
    }
    return true;
}

function calcularMaxColumnas(datos, merges) {
    let maxCols = 0;
    if (datos && datos.length > 0) {
        datos.forEach(fila => {
            if (fila && fila.length > maxCols) maxCols = fila.length;
        });
    }
    if (merges) {
        merges.forEach(m => {
            if (m.endColumnIndex > maxCols) maxCols = m.endColumnIndex;
        });
    }
    return maxCols > 0 ? maxCols : 1;
}

function normalizarColumnasDatos(datos, numColsEsperado) {
    return datos.map(fila => {
        if (fila.length === numColsEsperado) return fila;
        if (fila.length > numColsEsperado) return fila.slice(0, numColsEsperado);
        return [...fila, ...Array(numColsEsperado - fila.length).fill('')];
    });
}

const SENER_LONGTABLE_FIRSTCOL_WIDTH = '0.34\\textwidth';

function senerLongtablePreamble(numCols) {
    let tex = '';
    if (numCols > 15) {
        tex += `  \\setlength{\\tabcolsep}{2pt}\n`;
        tex += `  \\setlength{\\SENERLongTableFirstColWidth}{0.15\\textwidth}\n`;
        tex += `  \\renewcommand{\\SENERLongTableFont}{\\notosanspico\\sffamily\\color{black}}\n`;
    } else {
        tex += `  \\setlength{\\SENERLongTableFirstColWidth}{${SENER_LONGTABLE_FIRSTCOL_WIDTH}}\n`;
    }
    return tex;
}

function senerLongtableSpec(numCols) {
    return 'Q' + 'Z'.repeat(Math.max(0, numCols - 1));
}

function generarFilasConMerges(datos, merges, startRow, endRow, esEncabezadoBase, isFirstColHeader, rotarEncabezados = true) {
    let tex = '';
    const numCols = datos[0].length;

    // Change border color for headers to "light gold" (gobmxAmbarClaro)
    if (esEncabezadoBase) {
        tex += `\\arrayrulecolor{gobmxAmbarClaro}\n`;
    }

    for (let r = startRow; r < endRow; r++) {
        const rowData = datos[r];
        let rowTex = [];

        // Determinar si esta fila es parte del encabezado
        const esEncabezado = (r < startRow + (endRow - startRow)) && esEncabezadoBase;
        // Logic fix: esEncabezadoBase is true if this BLOCK is header.
        // And we are iterating ONLY header rows if esEncabezadoBase is true (usually).
        // Let's check callers. 
        // generarTablaSimple calls (..., 0, 1, true, true). 
        // So yes, esEncabezado is just esEncabezadoBase. 
        // But wait, if I pass (0, numHeaderRows), all of them are header. Correct.

        for (let c = 0; c < numCols; c++) {
            const merge = merges.find(m =>
                r >= m.startRowIndex && r < m.endRowIndex &&
                c >= m.startColumnIndex && c < m.endColumnIndex
            );

            if (merge) {
                if (r === merge.startRowIndex && c === merge.startColumnIndex) {
                    // Celda superior-izquierda del merge
                    const rowSpan = merge.endRowIndex - merge.startRowIndex;
                    const colSpan = merge.endColumnIndex - merge.startColumnIndex;

                    // Procesar contenido
                    let rawContent = procesarCeldaUnica(rowData[c], esEncabezado, true, (c === 0));

                    if (esEncabezado) {
                        if (c === 0) {
                            rawContent = `\\encabezadodorado{${rawContent}}`;
                        } else {
                            if (rotarEncabezados) {
                                rawContent = `\\encabezadodorado{\\SENERVHeader{${rawContent}}}`;
                            } else {
                                rawContent = `\\encabezadodorado{${rawContent}}`;
                            }
                        }
                    }

                    let cellContent = rawContent;

                    // Multirow
                    if (rowSpan > 1) {
                        cellContent = `\\multirow{${rowSpan}}{*}{${cellContent}}`;
                    }

                    // Multicolumn
                    if (colSpan > 1) {
                        // Force borders for headers to prevent missing vertical lines
                        const align = esEncabezado ? '|c|' : 'c';
                        cellContent = `\\multicolumn{${colSpan}}{${align}}{${cellContent}}`;
                    }

                    rowTex.push(cellContent);
                } else {
                    // Celda oculta/cubierta
                    if (c === merge.startColumnIndex) {
                        const colSpan = merge.endColumnIndex - merge.startColumnIndex;
                        if (colSpan > 1) {
                            rowTex.push(`\\multicolumn{${colSpan}}{c}{}`);
                        } else {
                            rowTex.push(``);
                        }
                    }
                }
            } else {
                // Celda normal
                let content = procesarCeldaUnica(rowData[c], esEncabezado, true, (c === 0));
                if (esEncabezado) {
                    if (c === 0) {
                        content = `\\encabezadodorado{${content}}`;
                    } else {
                        if (rotarEncabezados) {
                            content = `\\encabezadodorado{\\SENERVHeader{${content}}}`;
                        } else {
                            content = `\\encabezadodorado{${content}}`;
                        }
                    }
                }
                rowTex.push(content);
            }
        }

        if (esEncabezado) {
            tex += `    \\rowcolor{gobmxDorado} ${rowTex.join(' & ')} \\\\\n`;
            // Add horizontal line between header rows to visualize boundaries
            if (r < endRow - 1) {
                tex += `    \\hline\n`;
            }
        } else {
            tex += `    ${rowTex.join(' & ')} \\\\\n`;
        }
    }

    // Reset border color to black after header
    if (esEncabezadoBase) {
        tex += `\\arrayrulecolor{black}\n`;
    }

    return tex;
}


function generarTablaSimple(datos, tituloTabla, esHorizontal = false, merges = [], numHeaderRows = 1, rotarEncabezados = true) {
    const numCols = datos[0].length;
    const especCols = senerLongtableSpec(numCols);
    const anchoTabla = esHorizontal ? '\\linewidth' : '\\textwidth';

    let tex = senerLongtablePreamble(numCols);
    tex += `  \\begin{xltabular}{${anchoTabla}}{${especCols}}\n`;

    if (tituloTabla && !esHorizontal) {
        tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
    }

    tex += `    \\toprule\n`;

    // Generar encabezado usando la nueva función
    const encabezados = generarFilasConMerges(datos, merges, 0, numHeaderRows, true, true, rotarEncabezados);

    tex += encabezados;
    tex += `    \\midrule\n`;
    tex += `    \\endfirsthead\n\n`;

    tex += `    \\multicolumn{${numCols}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
    tex += `    \\toprule\n`;
    tex += encabezados; // Repetir encabezado
    tex += `    \\midrule\n`;
    tex += `    \\endhead\n\n`;

    tex += `    \\midrule\n`;
    tex += `    \\multicolumn{${numCols}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
    tex += `    \\endfoot\n\n`;

    tex += `    \\bottomrule\n`;
    tex += `    \\endlastfoot\n\n`;

    // Cuerpo de la tabla
    tex += generarFilasConMerges(datos, merges, numHeaderRows, datos.length, false, true);

    tex += `  \\end{xltabular}\n`;
    return tex;
}

function generarTablaCompacta(datos, esHorizontal = false, merges = [], numHeaderRows = 1, rotarEncabezados = true) {
    const numCols = datos[0] ? datos[0].length : 0;
    if (numCols === 0) return '';
    const especCols = 'V' + ('v'.repeat(Math.max(0, numCols - 1)));
    const anchoTabla = esHorizontal ? '\\linewidth' : '\\textwidth';
    let tex = `  \\begin{tabularx}{${anchoTabla}}{${especCols}}\n`;
    tex += `    \\toprule\n`;

    // Encabezado
    tex += generarFilasConMerges(datos, merges, 0, numHeaderRows, true, false, rotarEncabezados);

    tex += `    \\midrule\n`;

    // Cuerpo
    tex += generarFilasConMerges(datos, merges, numHeaderRows, datos.length, false, false);

    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabularx}\n`;
    return tex;
}

function dividirTabla(datos, maxCols, tituloTabla, esHorizontal = false, merges = [], numHeaderRows = 1, rotarEncabezados = true) {
    const numCols = datos[0].length;
    let tex = '';
    let parte = 1;
    const colsPorParte = maxCols - 1;
    let colInicio = 1;
    const anchoTabla = esHorizontal ? '\\linewidth' : '\\textwidth';

    // ADVERTENCIA: Esta función rompe merges si cruzan el límite de división.
    // Para simplificar, asumimos que no se debe usar merges complejos con dividirTabla.
    // Si se usa, se renderizarán como celdas separadas en los límites.

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

        tex += senerLongtablePreamble(numColsTabla);
        tex += `  \\begin{xltabular}{${anchoTabla}}{${especCols}}\n`;

        if (tituloTabla && parte === 1 && !esHorizontal) {
            tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
        }

        // Preparamos datos parciales
        // PERO necesitamos recalcular los merges para estos datos parciales.
        // Es muy complejo remapear merges dinámicamente.
        // Fallback: Ignorar merges en tablas divididas por columnas.

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

        for (let i = numHeaderRows; i < datos.length; i++) {
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

function dividirTablaPorFilas(datos, maxFilasParte, tituloTabla, esHorizontal = false, merges = [], numHeaderRows = 1, rotarEncabezados = true) {
    // Dividir por filas es seguro para merges verticales SI no cortamos un merge.
    // Pero si lo cortamos, se rompe.
    // Usamos generarFilasConMerges, que maneja merges.
    // Pero xltabular ya divide por páginas. ¿Por qué dividir manualmente?
    // Esta función se llama si la tabla es compacta pero larga? No, si es muy larga.
    // xltabular maneja la longitud.
    // La función original usa xltabular en bucle.

    // Vamos a usar generarFilasConMerges por trozos.

    const numCols = datos[0].length;
    const especCols = senerLongtableSpec(numCols);
    const anchoTabla = esHorizontal ? '\\linewidth' : '\\textwidth';
    let tex = '';
    let inicio = numHeaderRows;
    let parte = 1;
    while (inicio < datos.length) {
        const fin = Math.min(inicio + maxFilasParte, datos.length);

        tex += senerLongtablePreamble(numCols);
        tex += `  \\begin{xltabular}{${anchoTabla}}{${especCols}}\n`;

        if (tituloTabla && parte === 1 && !esHorizontal) {
            tex += `    \\caption{${escaparLatex(tituloTabla)}}\\label{tab:${generarLabel(tituloTabla)}}\\\\\n`;
        }

        tex += `    \\toprule\n`;
        const encabezados = generarFilasConMerges(datos, merges, 0, numHeaderRows, true, true, rotarEncabezados);
        tex += encabezados;
        tex += `    \\midrule\n`;
        tex += `    \\endfirsthead\n\n`;

        tex += `    \\multicolumn{${numCols}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
        tex += `    \\toprule\n`;
        tex += encabezados;
        tex += `    \\midrule\n`;
        tex += `    \\endhead\n\n`;

        tex += `    \\midrule\n`;
        tex += `    \\multicolumn{${numCols}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
        tex += `    \\endfoot\n\n`;

        tex += `    \\bottomrule\n`;
        tex += `    \\endlastfoot\n\n`;

        tex += generarFilasConMerges(datos, merges, inicio, fin, false, true);

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
    let tex = `\\clearpage\n\\section*{Glosario}\n\\phantomsection\n\\addcontentsline{toc}{section}{Glosario}\n\n`;
    glosario.sort((a, b) => (a['Termino'] || '').toString().toLowerCase().localeCompare((b['Termino'] || '').toString().toLowerCase()));
    glosario.forEach(entrada => {
        const termino = entrada['Termino'] || '';
        const definicion = entrada['Definicion'] || '';
        if (termino && definicion) tex += `\\entradaGlosario{${escaparLatex(termino)}}{${escaparLatex(definicion)}}\n`;
    });
    tex += `\n`;
    return tex;
}

function generarUnidades(unidades) {
    let tex = `\\clearpage\n\\section*{Unidades}\n\\phantomsection\n\\addcontentsline{toc}{section}{Unidades}\n\n`;
    unidades.sort((a, b) => (a['Unidad'] || '').toString().toLowerCase().localeCompare((b['Unidad'] || '').toString().toLowerCase()));
    unidades.forEach(entrada => {
        const unidad = entrada['Unidad'] || '';
        const descripcion = entrada['Descripción'] || entrada['Descripcion'] || '';
        if (unidad && descripcion) tex += `\\entradaGlosario{${escaparLatex(unidad)}}{${escaparLatex(descripcion)}}\n`;
    });
    tex += `\n`;
    return tex;
}

function generarSiglas(siglas) {
    let tex = `\\clearpage\n\\section*{Siglas y Acrónimos}\n\\phantomsection\n\\addcontentsline{toc}{section}{Siglas y Acrónimos}\n\n`;
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
    str = str.replace(/\[\[cita:([\s\S]*?)\]\]/g, (m, c) => { citas.push(`\\parencite{${c.trim()}}`); return `ZCITEPOLDER${citas.length - 1}Z`; });

    const recuadros = [];
    str = str.replace(/\[\[recuadro:([^\]]*)\]\]([\s\S]*?)\[\[\/recuadro\]\]/g, (m, t, c) => {
        const tituloArg = t.trim() ? `{${escaparLatex(t.trim())}}` : '';
        const contenidoProcesado = procesarConEtiquetas(c);
        recuadros.push(`\\begin{recuadro}${tituloArg}\n${contenidoProcesado}\n\\end{recuadro}`);
        return `ZRECUADROPLACEHOLDER${recuadros.length - 1}Z`;
    });

    const etiquetas = [];
    str = str.replace(/\[\[nota:([\s\S]*?)\]\]/g, (m, c) => { etiquetas.push(`\\footnote{${escaparFootnote(c)}}`); return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`; });

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
    if (!texto) return { fuente: '', notas: [] };

    const textoNormalizado = normalizarSaltosLatex(texto);
    const textoProtegido = textoNormalizado.replace(/\n/g, ' ZNEWLINEZ ');
    const lineas = textoProtegido.split(/\s+/).filter(l => l.trim() !== '');
    const textoCompleto = lineas.join(' ');

    const partesTexto = textoCompleto.split(/(\b[0-9]+\/|\b[a-zA-Z]+\/|(?<=^|\s)\*{1,3}(?=\s|$))/);

    let textoFuente = '';
    const lineasNotas = [];

    for (let i = 0; i < partesTexto.length; i++) {
        const parte = partesTexto[i];
        if (!parte) continue;

        const parteTrim = parte.trim();

        if (parteTrim.match(/^([0-9]+\/|[a-zA-Z]+\/|\*{1,3})$/)) {
            const contenidoNota = partesTexto[i + 1] || '';
            lineasNotas.push({
                nota: parteTrim,
                texto: contenidoNota.trim()
            });
            i++;
        } else if (parte.trim()) {
            textoFuente += parte + ' ';
        }
    }

    lineasNotas.sort((a, b) => {
        const getRank = (n) => {
            if (n === '*') return 1;
            if (n === '**') return 2;
            if (n === '***') return 3;
            return 100;
        };
        const rankA = getRank(a.nota);
        const rankB = getRank(b.nota);
        return rankA - rankB;
    });

    let resultado = '';
    textoFuente = textoFuente.replace(/^\s*(?:ZNEWLINEZ\s*)+|(?:ZNEWLINEZ\s*)+$/g, '').trim();

    if (textoFuente) {
        let fuenteProcesada = procesarConEtiquetas(textoFuente);
        fuenteProcesada = fuenteProcesada.replace(/ZNEWLINEZ/g, ' ');
        resultado += fuenteProcesada;
    }

    const notasProcesadas = lineasNotas.map(item => {
        let rawText = item.texto.replace(/^\s*(?:ZNEWLINEZ\s*)+|(?:ZNEWLINEZ\s*)+$/g, '').trim();
        let texto = procesarConEtiquetas(rawText);
        texto = texto.replace(/ZNEWLINEZ/g, ' \\\\ ');
        return { nota: item.nota, texto: texto };
    });

    return {
        fuente: resultado,
        notas: notasProcesadas
    };
}

function formatearNotasYFuente(processed, esHorizontal = false) {
    let tex = '';
    const hayNotas = processed.notas && processed.notas.length > 0;
    const hayFuente = !!processed.fuente;

    if (!hayNotas && !hayFuente) return '';

    if (!hayNotas && hayFuente) {
        if (esHorizontal) {
            tex += `  \\fuenteHorizontal{${processed.fuente}}\n`;
        } else {
            tex += `\\vspace{-4pt}\n`;
            tex += `\\fuente{${processed.fuente}}\n`;
        }
        return tex;
    }

    if (esHorizontal) {
        tex += `  \\vspace{-0.2cm}\n`;
        tex += `  \\begin{center}\n`;
        tex += `  \\parbox{\\anchoHorizontal}{\n`;
        tex += `    \\raggedright\\notosanslight\\fontsize{7pt}{9pt}\\selectfont\\setlength{\\parskip}{0pt}\n`;

        if (hayNotas) {
            processed.notas.forEach(n => {
                tex += `    ${escaparLatex(n.nota)} ${n.texto} \\par\n`;
            });
        }

        if (hayFuente) {
            if (hayNotas) tex += `    \\vspace{1pt}\n`;
            tex += `    {\\color{gobmxGris}FUENTE:~${processed.fuente}}\n`;
        }

        tex += `  }\n`;
        tex += `  \\end{center}\n`;
    } else {
        tex += `\\vspace{-4pt}\n`;
        tex += `{\\raggedright\\notosanslight\\fontsize{7pt}{9pt}\\selectfont\\setlength{\\parskip}{0pt}\n`;

        if (hayNotas) {
            processed.notas.forEach(n => {
                tex += `${escaparLatex(n.nota)} ${n.texto} \\par\n`;
            });
        }

        if (hayFuente) {
            if (hayNotas) tex += `\\vspace{1pt}\n`;
            tex += `{\\color{gobmxGris} FUENTE:~${processed.fuente}}\\hfill\n`;
        }

        tex += `\\par}\n`;
        tex += `\\vspace{6pt}\n`;
    }

    return tex;
}

function generarIdNota(nota) {
    if (nota.match(/^\*+$/)) {
        return 'notaast' + nota.length;
    }
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
        return procesarCeldaUnica(c, esEncabezado, esTablaLarga, (idx === 0));
    });
}

function procesarCeldaUnica(c, esEncabezado, esTablaLarga, isFirstColOfRow) {
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

    if (esTablaLarga && isFirstColOfRow && !esEncabezado) {
        const matchEspacios = textoOriginal.match(/^(\s+)/);
        if (matchEspacios) {
            const numEspacios = matchEspacios[1].length;
            const sangria = (numEspacios === 1) ? '\\quad ' : '\\hspace{' + (numEspacios * 0.45) + 'em} ';
            textoFinal = sangria + textoFinal.trimStart();
        }
    }
    return textoFinal;
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

// Special fetcher for table content (ranges) with merges
async function fetchTableContent(spreadsheetId, rangeRef, token) {
    if (!rangeRef) return { data: [], merges: [], frozenRows: 0 };
    try {
        let cleanRange = rangeRef.trim();

        if (cleanRange.includes('!')) {
            const parts = cleanRange.split('!');
            let sheet = parts[0];
            const cells = parts.slice(1).join('!');

            if (sheet.endsWith("'") && !sheet.startsWith("'")) {
                sheet = "'" + sheet;
            } else if (!sheet.startsWith("'") && sheet.includes(' ')) {
                sheet = "'" + sheet + "'";
            }

            cleanRange = `${sheet}!${cells}`;
        }

        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?ranges=${encodeURIComponent(cleanRange)}&fields=sheets(properties(gridProperties(frozenRowCount)),data(rowData(values(formattedValue,userEnteredValue)),startRow,startColumn),merges)&includeGridData=true`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error(`Error fetching table content ${cleanRange}: ${response.statusText}`);
        }

        const json = await response.json();
        const sheet = json.sheets?.[0];

        if (!sheet) return { data: [], merges: [], frozenRows: 0 };

        const rowData = sheet.data?.[0]?.rowData || [];
        const merges = sheet.merges || [];
        const startRow = sheet.data?.[0]?.startRow || 0;
        const startCol = sheet.data?.[0]?.startColumn || 0;
        const frozenRows = sheet.properties?.gridProperties?.frozenRowCount || 0;

        const data = rowData.map(r => r.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || (c.userEnteredValue?.numberValue !== undefined ? String(c.userEnteredValue.numberValue) : '') || '') || []);

        const normalizedMerges = merges.map(m => ({
            startRowIndex: m.startRowIndex - startRow,
            endRowIndex: m.endRowIndex - startRow,
            startColumnIndex: m.startColumnIndex - startCol,
            endColumnIndex: m.endColumnIndex - startCol
        })).filter(m =>
            m.startRowIndex >= 0 &&
            m.startColumnIndex >= 0
        );

        return { data, merges: normalizedMerges, frozenRows };

    } catch (e) {
        console.warn(`Error fetching table content for range ${rangeRef} (cleaned: ${cleanRange || rangeRef}):`, e.message);
        return { data: [], merges: [], frozenRows: 0 }; // Return structure on error
    }
}

async function generateLatex(spreadsheetId, docId, token) {
    // 1. Fetch all necessary sheets
    const [docs, secciones, figuras, tablas, bibliografia, siglas, glosario, unidades] = await Promise.all([
        fetchAndParseSheet(spreadsheetId, 'Documentos', token),
        fetchAndParseSheet(spreadsheetId, 'Secciones', token),
        fetchAndParseSheet(spreadsheetId, 'Figuras', token),
        fetchAndParseSheet(spreadsheetId, 'Tablas', token),
        fetchAndParseSheet(spreadsheetId, 'Bibliografia', token),
        fetchAndParseSheet(spreadsheetId, 'Siglas', token),
        fetchAndParseSheet(spreadsheetId, 'Glosario', token),
        fetchAndParseSheet(spreadsheetId, 'Unidades', token)
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
    const docUnidades = filterByDoc(unidades);

    // 3. Fetch inner data for tables (Data CSV ranges)
    await Promise.all(docTablas.map(async (tabla) => {
        const range = tabla['Datos CSV'] || tabla['DatosCSV'];
        if (range) {
            try {
                tabla['ParsedData'] = await fetchTableContent(spreadsheetId, range, token);
                if (!tabla['ParsedData'] || !tabla['ParsedData'].data || tabla['ParsedData'].data.length === 0) {
                    console.warn(`Warning: Table ${tabla['Titulo'] || 'Unknown'} has empty data for range ${range}`);
                }
            } catch (err) {
                console.error(`Error fetching table data for ${range}:`, err);
                tabla['ParsedData'] = { data: [], merges: [] };
            }
        }
    }));

    // 4. Generate LaTeX
    const tex = generarLatexString(datosDoc, docSecciones, docBibliografia, docFiguras, docTablas, docSiglas, docGlosario, docUnidades);

    // 5. Generate References (BibTeX) content if needed
    let bib = '';
    if (docBibliografia.length > 0) {
        docBibliografia.forEach(ref => {
            const tipo = ref['Tipo'] ? ref['Tipo'].toLowerCase() : 'misc';
            let entry = `@${tipo}{${ref['Clave']},\n`;
            if (ref['Autor']) entry += `  author = {${escaparLatex(ref['Autor'])}},\n`;
            if (ref['Titulo']) entry += `  title = {${escaparLatex(ref['Titulo'])}},\n`;
            if (ref['Anio']) entry += `  year = {${ref['Anio']}},\n`;
            if (ref['Editorial']) entry += `  publisher = {${escaparLatex(ref['Editorial'])}},\n`;
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

function senerLongtableHeaderRow(celdas) {
    if (!celdas || celdas.length === 0) return '';
    return celdas.map((c, i) => {
        if (i === 0) return `\\encabezadodorado{${c}}`;
        return `\\encabezadodorado{\\SENERVHeader{${c}}}`;
    }).join(' & ');
}

module.exports = { generateLatex, generarTabla, procesarTextoFuente, formatearNotasYFuente };
