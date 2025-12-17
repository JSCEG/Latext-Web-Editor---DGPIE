/**
 * SENER LaTeX Generator - Google Apps Script
 * Genera archivos .tex desde Google Sheets para el template institucional
 * 
 * CONFIGURACIÓN:
 * 1. Cambia CARPETA_SALIDA_ID por tu ID de carpeta de Drive
 * 2. Estructura de hojas:
 *    - Documentos: ID, Titulo, Subtitulo, Autor, Fecha, Institucion, Unidad, DocumentoCorto, PalabrasClave, Version, ResumenEjecutivo, DatosClave
 *    - Secciones: DocumentoID, Orden, Nivel, Titulo, Contenido
 *    - Bibliografia: DocumentoID, Clave, Tipo, Autor, Titulo, Anio, Editorial, Url
 */

// Carpeta destino en Drive (preferida). Ejemplo de URL:
// https://drive.google.com/drive/folders/<ESTE_ES_EL_ID>
const CARPETA_SALIDA_ID = '1NnO4B8EJCx6VNrmDxWwwW3KsHCTID_c2';

// FIX: Flag de debug para optimizar logging en producción
const DEBUG = true;

// Mapas globales para referencias por ID
var G_FIG_MAP = {};
var G_TAB_MAP = {};
var G_ID_WARNINGS = [];
var G_REFERENCED_IDS = { figuras: {}, tablas: {} };

/**
 * Crea el menú en la interfaz de Google Sheets
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('📄 SENER LaTeX')
        .addItem('✨ Generar .tex de este documento', 'generarLatex')
        .addItem('🌐 Abrir Editor Web', 'abrirEditorWeb')
        .addItem('📋 Ver log de errores', 'mostrarLog')
        .addToUi();
}

/**
 * Servir la aplicación web
 */
function doGet(e) {
    const page = e.parameter.page || 'index';

    if (page === 'editor') {
        return HtmlService.createHtmlOutputFromFile('editor')
            .setTitle('SENER LaTeX Editor')
            .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    return HtmlService.createHtmlOutputFromFile('index')
        .setTitle('SENER LaTeX - Dashboard')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Abrir editor web desde el menú
 */
function abrirEditorWeb() {
    const url = ScriptApp.getService().getUrl();
    const html = `<script>window.open('${url}', '_blank'); google.script.host.close();</script>`;
    const ui = HtmlService.createHtmlOutput(html);
    SpreadsheetApp.getUi().showModalDialog(ui, 'Abriendo Editor Web...');
}

/**
 * Variable global para logging
 */
let logMensajes = [];

function log(mensaje) {
    console.log(mensaje);
    // Acumular logs útiles para el usuario.
    // Nota: Aunque DEBUG esté apagado, conviene mostrar ✅/⚠️/❌ para diagnóstico.
    const esImportante =
        mensaje &&
        (mensaje.startsWith('✅') || mensaje.startsWith('⚠️') || mensaje.startsWith('❌'));
    if (DEBUG || esImportante) {
        logMensajes.push(mensaje);
    }
}

function mostrarLog() {
    const ui = SpreadsheetApp.getUi();
    if (logMensajes.length === 0) {
        ui.alert('Log vacío', 'No hay mensajes de log.', ui.ButtonSet.OK);
    } else {
        ui.alert('Log de ejecución', logMensajes.join('\n'), ui.ButtonSet.OK);
    }
    logMensajes = [];
}

/**
 * Convierte cualquier valor a string y lo recorta para logs.
 * En Google Sheets, los valores pueden venir como número/fecha.
 */
function previewTexto(valor, maxLen = 50) {
    const s = (valor === null || valor === undefined) ? '' : valor.toString();
    return s.length > maxLen ? s.substring(0, maxLen) : s;
}

/**
 * Función principal para generar el archivo LaTeX
 */
function generarLatex() {
    logMensajes = [];
    G_REFERENCED_IDS = { figuras: {}, tablas: {} };
    G_ID_WARNINGS = [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();

    try {
        log('🚀 Iniciando generación de LaTeX...');

        // 1. Verificar que estamos en la hoja "Documentos"
        const hojaActiva = ss.getActiveSheet();
        if (hojaActiva.getName() !== 'Documentos') {
            ui.alert('⚠️ Por favor, selecciona una celda en la hoja "Documentos" antes de generar el archivo.');
            return;
        }

        // 2. Obtener datos de la hoja "Documentos"
        const hojaDocs = ss.getSheetByName('Documentos');
        if (!hojaDocs) {
            ui.alert('❌ Error: No se encuentra la hoja "Documentos".');
            return;
        }

        const filaActiva = hojaDocs.getActiveCell().getRow();
        if (filaActiva < 2) {
            ui.alert('⚠️ Por favor, selecciona una fila de documento válida en la hoja "Documentos".');
            return;
        }

        const datosDoc = obtenerDatosFila(hojaDocs, filaActiva);
        const docId = datosDoc['ID'];

        log(`🔍 Fila activa: ${filaActiva}`);
        log(`📋 Datos obtenidos: ${JSON.stringify(datosDoc)}`);
        log(`🆔 ID encontrado: "${docId}" (tipo: ${typeof docId})`);

        if (!docId || docId.toString().trim() === '') {
            ui.alert('❌ Error: La fila seleccionada no tiene un ID de documento válido.');
            log('❌ ID vacío o inválido');
            return;
        }

        log(`📄 Procesando documento ID: ${docId}`);
        log(`📝 Título: ${datosDoc['Titulo']}`);

        // 3. Leer todas las hojas relacionadas
        const secciones = obtenerRegistros(ss, 'Secciones', docId, 'DocumentoID');
        const bibliografia = obtenerRegistros(ss, 'Bibliografia', docId, 'DocumentoID');
        const figuras = obtenerRegistros(ss, 'Figuras', docId, 'DocumentoID');
        const tablas = obtenerRegistros(ss, 'Tablas', docId, 'DocumentoID');
        const siglas = obtenerRegistros(ss, 'Siglas', docId, 'DocumentoID');
        const glosario = obtenerRegistros(ss, 'Glosario', docId, 'DocumentoID');

        log(`📑 Secciones encontradas: ${secciones.length}`);
        log(`📚 Referencias bibliográficas: ${bibliografia.length}`);
        log(`🖼️ Figuras encontradas: ${figuras.length}`);
        log(`📊 Tablas encontradas: ${tablas.length}`);
        log(`🔤 Siglas encontradas: ${siglas.length}`);
        log(`📖 Términos de glosario: ${glosario.length}`);

        if (secciones.length === 0) {
            ui.alert('⚠️ Advertencia: No se encontraron secciones para este documento.');
        }

        // Ordenar secciones por orden
        secciones.sort((a, b) => {
            const oa = parseFloat(a.Orden) || 0;
            const ob = parseFloat(b.Orden) || 0;
            return oa - ob;
        });

        // 4. Construir el contenido LaTeX
        const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, ss);

        // 5. Guardar archivos en Drive
        const salida = guardarArchivos(datosDoc, tex, bibliografia);

        // Advertencias de referencias rotas
        if (G_ID_WARNINGS && G_ID_WARNINGS.length) {
            log(`⚠️ Referencias no resueltas: ${G_ID_WARNINGS.length}`);
            G_ID_WARNINGS.forEach(w => log(`⚠️ ${w}`));
        }

        // Reporte de elementos no insertados por falta de referencia
        const noReferenciadasFig = Object.keys(G_FIG_MAP || {}).filter(id => !G_REFERENCED_IDS.figuras[id]);
        const noReferenciadasTab = Object.keys(G_TAB_MAP || {}).filter(id => !G_REFERENCED_IDS.tablas[id]);
        log(`📊 Figuras insertadas: ${Object.keys(G_REFERENCED_IDS.figuras).length}`);
        log(`📊 Tablas insertadas: ${Object.keys(G_REFERENCED_IDS.tablas).length}`);
        if (noReferenciadasFig.length) log(`ℹ️ Figuras no insertadas (sin referencia): ${noReferenciadasFig.join(', ')}`);
        if (noReferenciadasTab.length) log(`ℹ️ Tablas no insertadas (sin referencia): ${noReferenciadasTab.join(', ')}`);

        const resumenSalida = salida
            ? `\n\n📁 Carpeta: ${salida.carpetaNombre}\n${salida.carpetaUrl}` +
            `\n\n📄 Archivo: ${salida.texNombre}\n${salida.texUrl}` +
            (salida.bibUrl ? `\n\n📚 Bibliografía:\n${salida.bibUrl}` : '')
            : '';

        ui.alert(
            '✅ ¡Éxito!',
            `Archivos generados correctamente.${resumenSalida}\n\n${logMensajes.join('\n')}`,
            ui.ButtonSet.OK
        );

    } catch (e) {
        ui.alert('❌ Error', `${e.toString()}\n\nStack: ${e.stack}`, ui.ButtonSet.OK);
        log(`ERROR: ${e.toString()}`);
        log(`Stack: ${e.stack}`);
    }
}

/**
 * Construye el documento LaTeX completo
 */
function construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, ss) {
    let tex = '';

    // Crear mapas para acceso rápido
    const figurasMap = crearMapaPorSeccion(figuras);
    const tablasMap = crearMapaPorSeccion(tablas);

    // Construir mapas ID->metadatos para hipervínculos y validación
    G_FIG_MAP = {};
    (figuras || []).forEach(f => {
        const sec = (f['SeccionOrden'] || '').toString();
        const ord = (f['Fig.'] || f['OrdenFigura'] || '').toString();
        const id = (sec && ord) ? `FIG-${sec}-${ord}` : (ord ? `FIG-${ord}` : '');
        if (id) {
            G_FIG_MAP[id] = {
                id: id,
                caption: (f['Caption'] || f['Título/Descripción'] || f['Titulo'] || '').toString(),
                ruta: (f['RutaArchivo'] || f['Ruta de Imagen'] || '').toString(),
                seccion: sec
            };
        }
    });

    G_TAB_MAP = {};
    (tablas || []).forEach(t => {
        const sec = (t['SeccionOrden'] || t['ID_Seccion'] || '').toString();
        const ord = (t['Orden'] || t['OrdenTabla'] || '').toString();
        const id = (sec && ord) ? `TBL-${sec}-${ord}` : (ord ? `TBL-${ord}` : '');
        if (id) {
            G_TAB_MAP[id] = {
                id: id,
                title: (t['Título'] || t['Titulo'] || '').toString(),
                rango: (t['Datos CSV'] || t['DatosCSV'] || '').toString(),
                seccion: sec
            };
        }
    });

    // Índices por número de orden (globales, ignorando SeccionOrden)
    const FIG_ORDER_MAP = {};
    (figuras || []).forEach(f => {
        const ord = (f['Fig.'] || f['OrdenFigura'] || f['Orden'] || '').toString().trim();
        if (ord) FIG_ORDER_MAP[ord] = f;
    });

    const TAB_ORDER_MAP = {};
    (tablas || []).forEach(t => {
        const ord = (t['Orden'] || t['OrdenTabla'] || '').toString().trim();
        if (ord) TAB_ORDER_MAP[ord] = t;
    });

    // --- Metadatos del documento (requerido para axessibility) ---
    tex += `\\DocumentMetadata{\n`;
    tex += `  pdfversion=2.0,\n`;
    tex += `  lang=es-MX,\n`;
    tex += `  pdfstandard=ua-2\n`;
    tex += `}\n\n`;

    // --- Preámbulo ---
    tex += `\\documentclass{sener2025}\n\n`;
    // Forzar notas al pie en el pie de página y páginas equilibradas
    tex += `\\usepackage[bottom]{footmisc}\n`;
    tex += `\\usepackage{needspace}\n`;
    tex += `\\flushbottom\n`;
    tex += `\\setlength{\\skip\\footins}{6pt plus 2pt minus 1pt}\n`;
    tex += `\\setlength{\\footnotesep}{8pt}\n\n`;

    if (bibliografia.length > 0) {
        tex += `\\addbibresource{referencias.bib}\n\n`;
    }

    // --- Metadatos PDF/UA para Accesibilidad ---
    tex += `% --- Metadatos PDF/UA (Accesibilidad Universal) ---\n`;
    tex += `\\hypersetup{\n`;
    tex += `  pdftitle={${escaparLatex(datosDoc['Titulo'] || 'Documento SENER')}},\n`;
    tex += `  pdfauthor={${escaparLatex(datosDoc['Autor'] || 'Secretaría de Energía')}},\n`;
    tex += `  pdfsubject={${escaparLatex(datosDoc['Subtitulo'] || datosDoc['Titulo'] || 'Documento Institucional')}},\n`;
    tex += `  pdfkeywords={${escaparLatex(datosDoc['PalabrasClave'] || 'SENER, Energía, México')}},\n`;
    tex += `  pdfcreationdate={D:${generarFechaPDF()}},\n`;
    tex += `  pdfversion={${escaparLatex(datosDoc['Version'] || '1.0')}}\n`;
    tex += `}\n\n`;

    // --- Metadatos del Documento ---
    tex += `% --- Metadatos del Documento ---\n`;
    tex += `\\title{${escaparLatex(datosDoc['Titulo'] || '')}}\n`;
    if (datosDoc['Subtitulo']) {
        tex += `\\subtitle{${escaparLatex(datosDoc['Subtitulo'])}}\n`;
    }
    tex += `\\author{${escaparLatex(datosDoc['Autor'] || 'SENER')}}\n`;

    // Formatear fecha
    const fechaFormateada = formatearFecha(datosDoc['Fecha']);
    tex += `\\date{${escaparLatex(fechaFormateada)}}\n`;

    tex += `\\institucion{${escaparLatex(datosDoc['Institucion'] || 'Secretaría de Energía')}}\n`;
    tex += `\\unidad{${escaparLatex(datosDoc['Unidad'] || '')}}\n`;
    tex += `\\setDocumentoCorto{${escaparLatex((datosDoc['DocumentoCorto'] || '').toString().trim())}}\n`;
    tex += `\\palabrasclave{${escaparLatex((datosDoc['PalabrasClave'] || '').toString().trim())}}\n`;
    tex += `\\version{${escaparLatex((datosDoc['Version'] || '1.0').toString().trim())}}\n`;

    tex += `\n\\begin{document}\n\n`;

    // --- Portada ---
    // Si hay ruta de portada personalizada, usarla
    if (datosDoc['PortadaRuta']) {
        tex += `\\portadafondo[${escaparLatex(datosDoc['PortadaRuta'])}]\n\n`;
    } else {
        tex += `\\portadafondo\n\n`;
    }

    // --- Tabla de Contenidos ---
    tex += `\\tableofcontents\n\\newpage\n\n`;

    // --- Índices de Figuras y Tablas (si existen) ---
    if (figuras.length > 0) {
        tex += `\\listafiguras\n\\newpage\n\n`;
    }
    if (tablas.length > 0) {
        tex += `\\listatablas\n\\newpage\n\n`;
    }

    // --- Agradecimientos ---
    if (datosDoc['Agradecimientos'] && datosDoc['Agradecimientos'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Agradecimientos}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarConEtiquetas(datosDoc['Agradecimientos'])}\n\n`;
    }

    // --- Presentación ---
    // Nota: en Sheets puede venir como "Presentación" (con acento) según el encabezado.
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

    // --- Resumen Ejecutivo ---
    if (datosDoc['ResumenEjecutivo'] && datosDoc['ResumenEjecutivo'].toString().trim()) {
        tex += `\\clearpage\n`;
        tex += `\\begin{center}\n`;
        tex += `{\\Large\\patriafont\\bfseries\\color{gobmxGuinda}Resumen Ejecutivo}\\\\[1cm]\n`;
        tex += `\\end{center}\n\n`;
        tex += `${procesarConEtiquetas(datosDoc['ResumenEjecutivo'])}\n\n`;
    }

    // --- Datos Clave ---
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

    // --- Secciones ---
    const resultado = procesarSecciones(secciones, FIG_ORDER_MAP, TAB_ORDER_MAP, ss);
    tex += resultado.contenido;

    // --- Glosario ---
    if (glosario.length > 0) {
        tex += generarGlosario(glosario);
    }

    // --- Directorio ---
    if (bibliografia.length > 0) {
        tex += `\\printbibliography\n\n`;
    }

    // --- Siglas y Acrónimos ---
    if (siglas.length > 0) {
        tex += generarSiglas(siglas);
    }

    // --- Página de Créditos (si existe) ---
    if (resultado.directorio) {
        tex += `\\paginacreditos{\n${resultado.directorio}\n}\n`;
    }

    // --- Contraportada ---
    if (resultado.contraportada) {
        // Si hay ruta de contraportada personalizada, usarla
        if (datosDoc['ContraportadaRuta']) {
            tex += `\\contraportada[${escaparLatex(datosDoc['ContraportadaRuta'])}]{\n${resultado.contraportada}\n}\n`;
        } else {
            tex += `\\contraportada{\n${resultado.contraportada}\n}\n`;
        }
    }

    tex += `\n\\end{document}\n`;

    return tex;
}

/**
 * Procesa todas las secciones del documento
 */
function procesarSecciones(secciones, figurasOrderMap, tablasOrderMap, ss) {
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

        log(`  📄 Sección ${index + 1}: [${nivel}] ${previewTexto(titulo, 50)}...`);

        // Detectar inicio de Anexos
        if (nivel.includes('anexo') && !anexosIniciados) {
            contenido += `\\anexos\n\n`;
            anexosIniciados = true;
        }

        // --- NIVELES ESPECIALES ---

        // A. Portada de Sección
        if (nivel === 'portada') {
            contadorPortadas++;
            contenido += `\\portadaseccion{${contadorPortadas}}{${escaparLatex(titulo)}}{${escaparLatex(contenidoRaw)}}\n\n`;
            return;
        }

        // B. Directorio
        if (nivel === 'directorio') {
            directorio = procesarDirectorio(contenidoRaw);
            return;
        }

        // C. Contraportada
        if (nivel.includes('datos finales') || nivel.includes('datosfinales') || nivel === 'contraportada') {
            contraportada = procesarContraportada(contenidoRaw);
            return;
        }

        // --- NIVELES NORMALES ---
        // FIX: Pasar estado de anexos para limpiar prefijos duplicados
        contenido += generarComandoSeccion(nivel, titulo, anexosIniciados);
        contenido += procesarContenido(contenidoRaw, ss);

        // Log de referencias (para diagnósticos), la inserción por [[...]] se hace inline
        const refs = extraerReferenciasDesdeContenido(contenidoRaw);
        if (refs.length) {
            log(`   ↳ Referencias detectadas: ${refs.map(r => `${r.tipo}:${r.id || r.orden}`).join(', ')}`);
        } else {
            log(`   ↳ Sin referencias explícitas en contenido`);
        }

        contenido += '\n\n';
    });

    return {
        contenido: contenido,
        directorio: directorio,
        contraportada: contraportada
    };
}

/**
 * FIX: Limpia prefijos de anexo del título cuando estamos en modo anexos
 * Evita duplicación como "Anexo A Anexo A ..." en el PDF
 */
function limpiarPrefijoAnexoEnTitulo(titulo) {
    if (!titulo) return '';

    let tituloLimpio = titulo.toString().trim();

    // Patrones a eliminar al inicio del título:
    // - "Anexo A", "ANEXO B.", "Anexo C –"
    // - "A.1", "A1", "B.12", con o sin punto/espacio/guión
    const patronesAnexo = [
        /^Anexo\s+[A-Z][\.\s\-–]*\s*/i,     // "Anexo A", "Anexo B.", "Anexo C –"
        /^ANEXO\s+[A-Z][\.\s\-–]*\s*/i,     // "ANEXO A", "ANEXO B."
        /^[A-Z]\.?\d*[\.\s\-–]+\s*/,        // "A.1", "A1", "B.12", "A."
        /^[A-Z]\d*[\.\s\-–]+\s*/            // "A1", "B2"
    ];

    for (const patron of patronesAnexo) {
        tituloLimpio = tituloLimpio.replace(patron, '');
    }

    return tituloLimpio.trim();
}

/**
 * FIX: Genera el comando LaTeX apropiado según el nivel
 * Ahora recibe anexosIniciados para limpiar prefijos duplicados
 */
function generarComandoSeccion(nivel, titulo, anexosIniciados = false) {
    let tituloFinal = titulo;

    // FIX: Si estamos en anexos y es nivel anexo/subanexo, limpiar prefijos
    if (anexosIniciados && (nivel === 'anexo' || nivel === 'subanexo')) {
        tituloFinal = limpiarPrefijoAnexoEnTitulo(titulo);
    }

    const tituloEscapado = escaparLatex(tituloFinal);

    // Normalizar nivel
    nivel = nivel.toLowerCase()
        .replace(/ó/g, 'o')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ú/g, 'u');

    if (nivel === 'subseccion' || nivel === 'subanexo') {
        return `\\subsection{${tituloEscapado}}\n\n`;
    } else if (nivel === 'subsubseccion' || nivel.includes('subsub')) {
        return `\\subsubsection{${tituloEscapado}}\n\n`;
    } else if (nivel.includes('parrafo') || nivel.includes('titulo pequeño')) {
        return `\\paragraph{${tituloEscapado}}\n\n`;
    } else {
        // Default: sección principal (incluyendo anexos)
        return `\\section{${tituloEscapado}}\n\n`;
    }
}

/**
 * FIX: Procesa el contenido de una sección (listas, bloques, etc.)
 * Corregido para no romper listas con líneas en blanco
 */
function procesarContenido(contenidoRaw, ss) {
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

        // 1. Detectar INICIO de bloque
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

        // 2. Detectar FIN de bloque
        const finBloqueMatch = lineaTrim.match(/^\[\[\/(ejemplo|caja|alerta|info|destacado|recuadro)\]\]$/i);
        if (finBloqueMatch) {
            resultado += generarBloque(tipoBloque, tituloBloque, contenidoBloque);
            enBloque = false;
            contenidoBloque = '';
            continue;
        }

        // 3. Si estamos DENTRO de un bloque, acumular contenido
        if (enBloque) {
            contenidoBloque += linea + '\n';
            continue;
        }

        // 4. Procesamiento normal (fuera de bloques)
        const esItemLista = lineaTrim.match(/^[-*•]\s+(.*)/);

        if (esItemLista) {
            if (!enLista) {
                resultado += '\\begin{itemize}\n';
                enLista = true;
            }
            resultado += `  \\item ${procesarConEtiquetas(esItemLista[1])}\n`;
        } else {
            // FIX: Si estamos en lista y encontramos línea vacía, NO cerrar la lista
            // Solo ignorar la línea vacía para mantener la lista abierta
            if (enLista && lineaTrim === '') {
                // FIX: Línea vacía dentro de lista - ignorar sin cerrar
                continue;
            }

            // FIX: Solo cerrar lista si encontramos contenido real (no vacío)
            if (enLista && lineaTrim !== '') {
                // Verificar si las siguientes líneas contienen más items
                let hayMasItems = false;
                for (let j = i + 1; j < lineas.length; j++) {
                    const siguienteLinea = lineas[j].trim();
                    if (siguienteLinea === '') continue; // Saltar líneas vacías
                    if (siguienteLinea.match(/^[-*•]\s+/)) {
                        hayMasItems = true;
                        break;
                    } else {
                        break; // Encontramos contenido no-item
                    }
                }

                // Solo cerrar si no hay más items
                if (!hayMasItems) {
                    resultado += '\\end{itemize}\n';
                    enLista = false;
                }
            }

            // Procesar línea normal solo si no estamos en lista
            if (!enLista) {
                if (lineaTrim.startsWith('[[tabla:')) {
                    const match = lineaTrim.match(/\[\[tabla:([^\]]+)\]\]/i);
                    const id = match ? match[1].trim() : '';
                    if (id) {
                        if (ss && G_TAB_MAP[id]) {
                            const meta = G_TAB_MAP[id];
                            const tbl = { Titulo: meta.title, Fuente: '', DatosCSV: meta.rango, Orden: '', ID: id };
                            resultado += generarTabla(tbl, ss);
                            G_REFERENCED_IDS.tablas[id] = true;
                        } else {
                            resultado += `% Referencia a tabla: ${id}\n`;
                        }
                    }
                } else if (lineaTrim.startsWith('[[figura:')) {
                    const match = lineaTrim.match(/\[\[figura:([^\]]+)\]\]/i);
                    const id = match ? match[1].trim() : '';
                    if (id) {
                        if (ss && G_FIG_MAP[id]) {
                            const meta = G_FIG_MAP[id];
                            const fig = { RutaArchivo: meta.ruta, Caption: meta.caption, Fuente: '', TextoAlternativo: meta.caption, Ancho: '0.8', ID: id };
                            resultado += generarFigura(fig);
                            G_REFERENCED_IDS.figuras[id] = true;
                        } else {
                            resultado += `% Referencia a figura: ${id}\n`;
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

    // Cerrar lista si quedó abierta
    if (enLista) {
        resultado += '\\end{itemize}\n';
    }

    return resultado;
}

/**
 * Genera un bloque LaTeX (ejemplo, caja, alerta, etc.)
 */
function generarBloque(tipo, titulo, contenido) {
    // Procesar el contenido del bloque (puede tener listas internas)
    const contenidoProcesado = procesarContenido(contenido);

    const tituloSafe = escaparLatex(titulo);
    const opts = tituloSafe ? `[title={${tituloSafe}}]` : '';

    if (tipo === 'ejemplo') {
        return `\\begin{ejemplo}${opts}\n${contenidoProcesado}\\end{ejemplo}\n`;
    } else if (tipo === 'caja' || tipo === 'recuadro') {
        return `\\begin{recuadro}${opts}\n${contenidoProcesado}\\end{recuadro}\n`;
    } else if (tipo === 'alerta') {
        return `\\begin{calloutWarning}${opts}\n${contenidoProcesado}\\end{calloutWarning}\n`;
    } else if (tipo === 'info') {
        return `\\begin{calloutTip}${opts}\n${contenidoProcesado}\\end{calloutTip}\n`;
    } else if (tipo === 'destacado') {
        return `\\begin{destacado}\n${contenidoProcesado}\\end{destacado}\n`;
    }

    return contenidoProcesado;
}

/**
 * Procesa el contenido del directorio
 */
function procesarDirectorio(contenidoRaw) {
    const lines = contenidoRaw.split('\n').map(l => l.trim()).filter(l => l);
    let dirTex = '\\begin{center}\n';

    for (let i = 0; i < lines.length; i += 2) {
        const nombre = lines[i];
        const cargo = lines[i + 1] || '';
        dirTex += `{\\patriafont\\fontsize{12}{14}\\selectfont\\color{gobmxGuinda} ${escaparLatex(nombre)}}\\\\\n`;
        if (cargo) {
            dirTex += `{\\patriafont\\fontsize{9}{11}\\selectfont ${escaparLatex(cargo)}}\\\\[0.5cm]\n`;
        } else {
            dirTex += `\\\\[0.5cm]\n`;
        }
    }

    dirTex += '\\end{center}';
    return dirTex;
}

/**
 * Procesa el contenido de la contraportada
 */
function procesarContraportada(contenidoRaw) {
    const lines = contenidoRaw.split('\n');
    let contraTex = '';

    for (let i = 0; i < lines.length; i++) {
        const l = lines[i].trim();
        const esUltima = (i === lines.length - 1);
        const siguienteEsVacia = (i < lines.length - 1) && (lines[i + 1].trim() === '');

        if (l === '') {
            if (!esUltima) {
                contraTex += `\\\\[0.5cm]\n`;
            }
        } else {
            contraTex += procesarConEtiquetas(l);
            if (!esUltima && !siguienteEsVacia) {
                contraTex += `\\\\\n`;
            }
        }
    }

    return contraTex;
}

/**
 * FIX: Guarda los archivos .tex y .bib en Drive (optimizado para evitar timeout)
 */
function obtenerCarpetaSalida_() {
    const userProps = PropertiesService.getUserProperties();

    // IMPORTANTE:
    // - Priorizamos el ID fijo (CARPETA_SALIDA_ID) para que siempre genere en la carpeta “en línea”.
    // - Para colaboradores, usamos UserProperties (por usuario) para recordar un fallback sin afectar a otros.
    const idFijo = (CARPETA_SALIDA_ID || '').toString().trim();
    const idUser = (userProps.getProperty('CARPETA_SALIDA_ID') || '').toString().trim();

    const candidatos = [];
    if (idFijo) candidatos.push({ id: idFijo, fuente: 'CARPETA_SALIDA_ID (const)' });
    if (idUser && idUser !== idFijo) candidatos.push({ id: idUser, fuente: 'UserProperties.CARPETA_SALIDA_ID' });

    for (let i = 0; i < candidatos.length; i++) {
        const c = candidatos[i];
        try {
            const carpeta = DriveApp.getFolderById(c.id);
            // Forzar lectura para validar acceso/permisos
            carpeta.getName();
            log(`✅ Carpeta de salida OK usando ${c.fuente}: ${carpeta.getName()} (ID: ${c.id})`);
            return carpeta;
        } catch (e) {
            log(`⚠️ No se pudo acceder a carpeta (fuente: ${c.fuente}, ID: ${c.id}). ` +
                `Asegura que la carpeta esté compartida con la cuenta que ejecuta el script. Detalle: ${e.toString()}`);
        }
    }

    return obtenerCarpetaFallback_();
}

function obtenerCarpetaFallback_() {
    const userProps = PropertiesService.getUserProperties();

    // Si ya existe un fallback por-usuario, reusarlo.
    const fallbackId = (userProps.getProperty('CARPETA_SALIDA_FALLBACK_ID') || '').toString().trim();
    if (fallbackId) {
        try {
            const carpeta = DriveApp.getFolderById(fallbackId);
            carpeta.getName();
            return carpeta;
        } catch (e) {
            // Si ya no existe/no hay acceso, se recrea abajo.
        }
    }

    // Fallback portable: carpeta dentro de "Mi unidad" del usuario que ejecuta el script
    const nombreFallback = 'SENER_LATEX_SALIDA';
    const root = DriveApp.getRootFolder();
    const existentes = root.getFoldersByName(nombreFallback);
    const carpetaFallback = existentes.hasNext() ? existentes.next() : root.createFolder(nombreFallback);

    // Guardar solo por-usuario: no afecta a otros colaboradores.
    userProps.setProperty('CARPETA_SALIDA_FALLBACK_ID', carpetaFallback.getId());
    log(`⚠️ Usando carpeta fallback en 'Mi unidad': ${carpetaFallback.getName()} (ID: ${carpetaFallback.getId()})`);
    return carpetaFallback;
}

function esAccesoDenegado_(e) {
    const msg = (e && e.toString) ? e.toString() : String(e);
    return /acceso denegado|access denied/i.test(msg);
}

function guardarArchivos(datosDoc, tex, bibliografia) {
    let carpeta = obtenerCarpetaSalida_();
    const nombreBase = datosDoc['DocumentoCorto'] || 'documento_generado';

    const carpetaId = carpeta.getId();
    const carpetaNombre = carpeta.getName();
    const carpetaUrl = `https://drive.google.com/drive/folders/${carpetaId}`;
    log(`📁 Guardando en carpeta: ${carpetaNombre} (ID: ${carpetaId})`);

    // FIX: Optimizar eliminación de archivos existentes
    const intentarGuardarEnCarpeta_ = (carpetaDestino) => {
        const carpetaIdLocal = carpetaDestino.getId();
        const carpetaNombreLocal = carpetaDestino.getName();
        const carpetaUrlLocal = `https://drive.google.com/drive/folders/${carpetaIdLocal}`;
        log(`📁 Guardando en carpeta: ${carpetaNombreLocal} (ID: ${carpetaIdLocal})`);

        // Guardar .tex (solo eliminar si existe)
        const texNombre = nombreBase + '.tex';
        const archivosTexExistentes = carpetaDestino.getFilesByName(texNombre);
        if (archivosTexExistentes.hasNext()) {
            archivosTexExistentes.next().setTrashed(true);
        }
        const fileTex = carpetaDestino.createFile(texNombre, tex, MimeType.PLAIN_TEXT);
        const texId = fileTex.getId();
        const texUrl = fileTex.getUrl();
        log(`✅ Archivo ${texNombre} creado (ID: ${texId})`);

        // Guardar .bib si hay referencias (optimizado)
        if (bibliografia.length > 0) {
            // FIX: Usar array.join() en lugar de concatenación masiva
            const bibEntries = [];
            bibliografia.forEach(ref => {
                const tipo = ref['Tipo'] ? ref['Tipo'].toLowerCase() : 'misc';
                const entry = [`@${tipo}{${ref['Clave']},`];
                if (ref['Autor']) entry.push(`  author = {${ref['Autor']}},`);
                if (ref['Titulo']) entry.push(`  title = {${ref['Titulo']}},`);
                if (ref['Anio']) entry.push(`  year = {${ref['Anio']}},`);
                if (ref['Editorial']) entry.push(`  publisher = {${ref['Editorial']}},`);
                if (ref['Url']) entry.push(`  url = {${ref['Url']}},`);
                entry.push('}\n');
                bibEntries.push(entry.join('\n'));
            });

            const bibContent = bibEntries.join('\n');

            const archivosBibExistentes = carpetaDestino.getFilesByName('referencias.bib');
            if (archivosBibExistentes.hasNext()) {
                archivosBibExistentes.next().setTrashed(true);
            }
            const fileBib = carpetaDestino.createFile('referencias.bib', bibContent, MimeType.PLAIN_TEXT);
            log(`✅ Archivo referencias.bib creado con ${bibliografia.length} referencias (ID: ${fileBib.getId()})`);

            return {
                carpetaId: carpetaIdLocal,
                carpetaNombre: carpetaNombreLocal,
                carpetaUrl: carpetaUrlLocal,
                texNombre,
                texId,
                texUrl,
                bibId: fileBib.getId(),
                bibUrl: fileBib.getUrl()
            };
        }

        return {
            carpetaId: carpetaIdLocal,
            carpetaNombre: carpetaNombreLocal,
            carpetaUrl: carpetaUrlLocal,
            texNombre,
            texId,
            texUrl,
            bibId: '',
            bibUrl: ''
        };
    };

    try {
        return intentarGuardarEnCarpeta_(carpeta);
    } catch (e) {
        if (esAccesoDenegado_(e)) {
            // Caso típico: el colaborador tiene acceso al Sheet pero NO permisos de edición en la carpeta.
            log(
                `⚠️ Acceso denegado al escribir en la carpeta de salida. ` +
                `Esto pasa si el usuario no tiene permiso de EDITOR en esa carpeta de Drive. ` +
                `Se guardará en una carpeta fallback en su 'Mi unidad'. Detalle: ${e.toString()}`
            );
            carpeta = obtenerCarpetaFallback_();
            // Recordar por-usuario (no global) para evitar errores repetidos.
            PropertiesService.getUserProperties().setProperty('CARPETA_SALIDA_ID', carpeta.getId());
            return intentarGuardarEnCarpeta_(carpeta);
        }

        log(`❌ Error al guardar archivos: ${e.toString()}`);
        throw e;
    }
}

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Obtiene todos los registros de una hoja que coincidan con docId
 * @param {Spreadsheet} ss - Spreadsheet activo
 * @param {string} nombreHoja - Nombre de la hoja
 * @param {string} docId - ID del documento a filtrar
 * @param {string} columnaId - Nombre de la columna que contiene el ID (default: 'ID')
 */
function obtenerRegistros(ss, nombreHoja, docId, columnaId = 'ID') {
    const hoja = ss.getSheetByName(nombreHoja);
    if (!hoja) {
        log(`⚠️ Advertencia: No se encuentra la hoja "${nombreHoja}"`);
        return [];
    }

    const datos = hoja.getDataRange().getValues();
    if (datos.length < 2) {
        log(`⚠️ Advertencia: La hoja "${nombreHoja}" está vacía`);
        return [];
    }

    const headers = datos[0];
    const indiceId = headers.indexOf(columnaId);

    if (indiceId === -1) {
        log(`⚠️ Advertencia: No se encuentra la columna "${columnaId}" en "${nombreHoja}"`);
        return [];
    }

    const registros = [];

    for (let i = 1; i < datos.length; i++) {
        const fila = datos[i];
        // Comparación flexible (== en lugar de ===)
        if (fila[indiceId] == docId) {
            const obj = {};
            for (let j = 0; j < headers.length; j++) {
                obj[headers[j]] = fila[j];
            }
            registros.push(obj);
        }
    }

    return registros;
}

/**
 * Obtiene los datos de una fila específica como objeto
 */
function obtenerDatosFila(hoja, numFila) {
    const headers = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const valores = hoja.getRange(numFila, 1, 1, hoja.getLastColumn()).getValues()[0];
    const obj = {};
    for (let i = 0; i < headers.length; i++) {
        obj[headers[i]] = valores[i];
    }
    return obj;
}

/**
 * Formatea una fecha al formato español
 */
function formatearFecha(fechaRaw) {
    if (!fechaRaw) return '';

    if (fechaRaw instanceof Date) {
        const meses = [
            'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
            'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
        ];
        return `${fechaRaw.getDate()} de ${meses[fechaRaw.getMonth()]} de ${fechaRaw.getFullYear()}`;
    }

    return fechaRaw.toString();
}

/**
 * Genera fecha en formato PDF (YYYYMMDDHHmmSS) para metadatos
 */
function generarFechaPDF() {
    const ahora = new Date();
    const año = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, '0');
    const dia = String(ahora.getDate()).padStart(2, '0');
    const hora = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    const seg = String(ahora.getSeconds()).padStart(2, '0');
    return `${año}${mes}${dia}${hora}${min}${seg}`;
}

/**
 * Escapa caracteres especiales de LaTeX (básico)
 */
function escaparLatexBasico(texto) {
    if (!texto) return '';
    return texto.toString()
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/([&%$#_{}])/g, '\\$1')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}');
}

/**
 * Escapa contenido específicamente para footnotes
 * Aplica normalización + escape completo
 */
function escaparFootnote(texto) {
    if (!texto) return '';
    // Primero normalizar saltos, luego escapar
    const normalizado = normalizarSaltosLatex(texto);
    return escaparLatexBasico(normalizado);
}

/**
 * FIX: Función de seguridad final - corrige patrones LaTeX inválidos
 * Detecta y corrige automáticamente comandos LaTeX mal escapados
 * Previene errores de compilación como "There's no line here to end"
 */
function validarYCorregirLatex(str) {
    if (!str) return str;

    let corregido = str;
    let cambios = [];

    // FIX: Detectar y corregir \textbackslash{}par
    if (corregido.includes('\\textbackslash{}par')) {
        corregido = corregido.replace(/\\textbackslash\{\}par/g, '\n\n');
        cambios.push('\\textbackslash{}par → líneas en blanco');
    }

    // FIX: Detectar líneas que empiezan con \\ (problemático)
    const lineasProblematicas = corregido.match(/^\\\\[^\\]/gm);
    if (lineasProblematicas) {
        corregido = corregido.replace(/^\\\\([^\\])/gm, '$1');
        cambios.push('líneas iniciando con \\\\ → texto normal');
    }

    // FIX: Detectar \\ inmediatamente antes de texto (\\Texto)
    if (corregido.match(/\\\\[A-Za-z]/)) {
        corregido = corregido.replace(/\\\\([A-Za-z])/g, ' $1');
        cambios.push('\\\\ antes de texto → espacio');
    }

    // FIX: Detectar otros comandos LaTeX mal escapados comunes
    if (corregido.includes('\\textbackslash{}begin')) {
        corregido = corregido.replace(/\\textbackslash\{\}begin/g, '\\begin');
        cambios.push('\\textbackslash{}begin → \\begin');
    }

    if (corregido.includes('\\textbackslash{}end')) {
        corregido = corregido.replace(/\\textbackslash\{\}end/g, '\\end');
        cambios.push('\\textbackslash{}end → \\end');
    }

    if (corregido.includes('\\textbackslash{}section')) {
        corregido = corregido.replace(/\\textbackslash\{\}section/g, '\\section');
        cambios.push('\\textbackslash{}section → \\section');
    }

    if (corregido.includes('\\textbackslash{}item')) {
        corregido = corregido.replace(/\\textbackslash\{\}item/g, '\\item');
        cambios.push('\\textbackslash{}item → \\item');
    }

    // FIX: Registrar correcciones con Logger.warn() si se corrige algo
    if (cambios.length > 0) {
        console.warn(`⚠️ PATRONES INVÁLIDOS CORREGIDOS: ${cambios.join(', ')}`);
        log(`⚠️ Comandos LaTeX mal escapados corregidos: ${cambios.join(', ')}`);
    }

    return corregido;
}

/**
 * Escapa LaTeX pero preserva comandos LaTeX válidos
 */
function escaparLatex(texto) {
    if (!texto) return '';
    return escaparLatexBasico(texto);
}

/**
 * FIX: Normaliza saltos de línea para LaTeX usando ÚNICAMENTE líneas en blanco
 * NUNCA inserta comandos LaTeX (\par, \\) que puedan ser escapados después
 * NUNCA genera \\ al inicio de párrafos
 */
function normalizarSaltosLatex(str) {
    if (!str) return '';

    // 1. Convertir \\n literales (de Google Sheets) a saltos reales
    str = str.replace(/\\n/g, '\n');

    // 2. Normalizar CRLF a LF
    str = str.replace(/\r\n/g, '\n');
    str = str.replace(/\r/g, '\n');

    // 3. Quitar espacios y tabs al final de cada línea
    str = str.replace(/[ \t]+$/gm, '');

    // 4. FIX: Convertir múltiples saltos (2+) a UNA línea en blanco (\n\n)
    // SOLO líneas en blanco, NO comandos \par que se escaparían
    str = str.replace(/\n{2,}/g, '\n\n');

    // 5. FIX: NO convertir saltos simples a \\ ni a espacios
    // LaTeX maneja saltos simples correctamente como espacios naturales

    // 6. Colapsar espacios múltiples dentro de líneas
    str = str.replace(/[ \t]+/g, ' ');

    // 7. FIX: Trim final para eliminar espacios/saltos iniciales/finales problemáticos
    // Esto previene \\ al inicio de párrafos
    str = str.trim();

    return str;
}

/**
 * Extrae referencias explícitas a tablas y figuras desde el texto crudo
 * Reconoce: [[tabla:ID]], [[figura:ID]], "Tabla 12", "Figura 3", "Tabla No. 4"
 * Devuelve en el orden de aparición
 */
function extraerReferenciasDesdeContenido(texto) {
    const refs = [];
    if (!texto) return refs;
    const str = texto.toString();

    // 1) [[tabla:ID]] y [[figura:ID]]
    const regexTagTabla = /\[\[tabla:([^\]]+)\]\]/gi;
    const regexTagFigura = /\[\[figura:([^\]]+)\]\]/gi;
    let m;
    while ((m = regexTagTabla.exec(str)) !== null) {
        refs.push({ tipo: 'tabla', id: m[1].trim(), orden: '' });
    }
    while ((m = regexTagFigura.exec(str)) !== null) {
        refs.push({ tipo: 'figura', id: m[1].trim(), orden: '' });
    }

    // 2) Referencias por texto natural con variaciones:
    //    "Tabla 12", "Tabla No. 12", "Tab. 3", "Figura 3", "Fig. 4", "Fig 5"
    const regexTablaNum = /(tabla|tab\.?)(?:\s*(?:n\.?\s*o\.?|n[uú]mero|numero))?\s*(\d+)/gi;
    const regexFiguraNum = /(figura|fig\.?)(?:\s*(?:n\.?\s*o\.?|n[uú]mero|numero))?\s*(\d+)/gi;
    let mt;
    while ((mt = regexTablaNum.exec(str)) !== null) {
        refs.push({ tipo: 'tabla', id: '', orden: mt[2].trim() });
    }
    let mf;
    while ((mf = regexFiguraNum.exec(str)) !== null) {
        refs.push({ tipo: 'figura', id: '', orden: mf[2].trim() });
    }

    return refs;
}

/**
 * FIX: Procesa texto con etiquetas completas - ORDEN LÓGICO CORREGIDO
 * Orden OBLIGATORIO: texto crudo → normalizar saltos → proteger → escapar → restaurar → validar
 * NUNCA escapa comandos LaTeX generados por el propio script
 */
function procesarConEtiquetas(texto) {
    if (!texto) return '';
    let str = texto.toString();

    // FIX: PASO 1 - NORMALIZAR SALTOS PRIMERO (antes de proteger)
    // Esto previene problemas con saltos dentro de etiquetas
    str = normalizarSaltosLatex(str);

    // FIX: PASO 2 - Extraer y proteger ECUACIONES (no escapar)
    const ecuaciones = [];

    // Ecuaciones en línea: $...$
    str = str.replace(/\$([^$]+)\$/g, function (match, contenido) {
        ecuaciones.push(`$${contenido}$`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // Ecuaciones display: $$...$$
    str = str.replace(/\$\$([\s\S]*?)\$\$/g, function (match, contenido) {
        ecuaciones.push(`$$${contenido}$$`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // Ecuaciones LaTeX: \(...\) y \[...\]
    str = str.replace(/\\\\?\(([\s\S]*?)\\\\?\)/g, function (match, contenido) {
        ecuaciones.push(`\\(${contenido}\\)`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    str = str.replace(/\\\\?\[([\s\S]*?)\\\\?\]/g, function (match, contenido) {
        ecuaciones.push(`\\[${contenido}\\]`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // [[ecuacion:...]] -> \begin{equation} ... \end{equation}
    str = str.replace(/\[\[ecuacion:([\s\S]*?)\]\]/g, function (match, contenido) {
        ecuaciones.push(`\\begin{equation}\n${contenido.trim()}\n\\end{equation}`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // [[math:...]] -> $ ... $
    str = str.replace(/\[\[math:([\s\S]*?)\]\]/g, function (match, contenido) {
        ecuaciones.push(`$${contenido.trim()}$`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // FIX: PASO 3 - Extraer y proteger CITAS
    const citas = [];
    str = str.replace(/\[\[cita:([\s\S]*?)\]\]/g, function (match, contenido) {
        const clave = contenido.toString().trim();
        citas.push(`\\cite{${clave}}`);
        return `ZCITEPOLDER${citas.length - 1}Z`;
    });

    // Referencias a FIGURAS por ID -> hyperref con título
    const figurasRefs = [];
    str = str.replace(/\[\[figura:([\s\S]*?)\]\]/g, function (match, contenido) {
        const raw = contenido.toString().trim();
        const meta = G_FIG_MAP && G_FIG_MAP[raw];
        if (meta) {
            const texto = `\\hyperref[fig:${raw}]{Figura ${raw} \\textemdash{} ${escaparLatex(meta.caption || '')}}`;
            figurasRefs.push(texto);
            return `ZFIGPLACEHOLDER${figurasRefs.length - 1}Z`;
        } else {
            G_ID_WARNINGS.push(`Referencia a figura no encontrada: ${raw}`);
            const texto = `\\textbf{Figura ${raw}}`;
            figurasRefs.push(texto);
            return `ZFIGPLACEHOLDER${figurasRefs.length - 1}Z`;
        }
    });

    // Referencias a TABLAS por ID -> hyperref con título
    const tablasRefs = [];
    str = str.replace(/\[\[tabla:([\s\S]*?)\]\]/g, function (match, contenido) {
        const raw = contenido.toString().trim();
        const meta = G_TAB_MAP && G_TAB_MAP[raw];
        if (meta) {
            const texto = `\\hyperref[tab:${raw}]{Tabla ${raw} \\textemdash{} ${escaparLatex(meta.title || '')}}`;
            tablasRefs.push(texto);
            return `ZTABPLACEHOLDER${tablasRefs.length - 1}Z`;
        } else {
            G_ID_WARNINGS.push(`Referencia a tabla no encontrada: ${raw}`);
            const texto = `\\textbf{Tabla ${raw}}`;
            tablasRefs.push(texto);
            return `ZTABPLACEHOLDER${tablasRefs.length - 1}Z`;
        }
    });

    // FIX: PASO 4 - Extraer y proteger RECUADROS MULTI-LÍNEA
    const recuadros = [];
    str = str.replace(/\[\[recuadro:([^\]]*)\]\]([\s\S]*?)\[\[\/recuadro\]\]/g, function (match, titulo, contenido) {
        const tituloLimpio = titulo.trim();
        // FIX: NO aplicar normalización aquí, ya se hizo al inicio
        const tituloArg = tituloLimpio ? `{${tituloLimpio}}` : '';
        recuadros.push(`\\begin{recuadro}${tituloArg}\n${contenido}\n\\end{recuadro}`);
        return `ZRECUADROPLACEHOLDER${recuadros.length - 1}Z`;
    });

    // FIX: PASO 5 - Proteger otras etiquetas simples
    const etiquetas = [];

    // [[nota:...]]
    str = str.replace(/\[\[nota:([\s\S]*?)\]\]/g, function (match, contenido) {
        etiquetas.push(`\\footnote{${escaparFootnote(contenido)}}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    // [[destacado:...]]
    str = str.replace(/\[\[destacado:([\s\S]*?)\]\]/g, function (match, contenido) {
        etiquetas.push(`\\begin{destacado}\n${contenido}\n\\end{destacado}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    // [[dorado:...]]
    str = str.replace(/\[\[dorado:([\s\S]*?)\]\]/g, function (match, contenido) {
        etiquetas.push(`\\textbf{\\textcolor{gobmxDorado}{${contenido}}}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    // [[guinda:...]]
    str = str.replace(/\[\[guinda:([\s\S]*?)\]\]/g, function (match, contenido) {
        etiquetas.push(`\\textbf{\\textcolor{gobmxGuinda}{${contenido}}}`);
        return `ZETIQUETAPLACEHOLDER${etiquetas.length - 1}Z`;
    });

    // FIX: PASO 6 - ESCAPAR LaTeX SOLO en texto plano (ya normalizado y protegido)
    str = escaparLatexBasico(str);

    // FIX: PASO 7 - NORMALIZAR comillas tipográficas
    str = str.replace(/[""]/g, '"');
    str = str.replace(/['']/g, "'");

    // FIX: PASO 8 - RESTAURAR contenido protegido (comandos LaTeX válidos)

    // Restaurar recuadros
    str = str.replace(/ZRECUADROPLACEHOLDER(\d+)Z/g, function (match, index) {
        return recuadros[parseInt(index)];
    });

    // Restaurar etiquetas
    str = str.replace(/ZETIQUETAPLACEHOLDER(\d+)Z/g, function (match, index) {
        return etiquetas[parseInt(index)];
    });

    // Restaurar referencias de figuras
    str = str.replace(/ZFIGPLACEHOLDER(\d+)Z/g, function (match, index) {
        return figurasRefs[parseInt(index)];
    });

    // Restaurar referencias de tablas
    str = str.replace(/ZTABPLACEHOLDER(\d+)Z/g, function (match, index) {
        return tablasRefs[parseInt(index)];
    });

    // Restaurar citas
    str = str.replace(/ZCITEPOLDER(\d+)Z/g, function (match, index) {
        return citas[parseInt(index)];
    });

    // Restaurar ecuaciones
    str = str.replace(/ZEQPLACEHOLDER(\d+)Z/g, function (match, index) {
        return ecuaciones[parseInt(index)];
    });

    // FIX: PASO 9 - VALIDACIÓN FINAL: corregir patrones inválidos
    str = validarYCorregirLatex(str);

    return str;
}

/**
 * Procesa texto de fuente/notas al pie
 * Convierte \n en saltos de línea reales, escapa LaTeX, agrega hypertargets
 * y formatea las notas como lista con viñetas
 */
function procesarTextoFuente(texto) {
    if (!texto) return '';

    // Usar normalización segura de saltos
    const textoNormalizado = normalizarSaltosLatex(texto);

    // Separar en líneas (después de normalización, los saltos ya son espacios)
    const lineas = textoNormalizado.split(/\s+/).filter(l => l.trim() !== '');

    // Separar fuente principal de notas
    const lineasFuente = [];
    const lineasNotas = [];

    // Reconstruir texto y buscar patrones de notas
    const textoCompleto = lineas.join(' ');
    const partesTexto = textoCompleto.split(/(\b[0-9]+\/|\b[a-zA-Z]+\/)/);

    let textoFuente = '';
    for (let i = 0; i < partesTexto.length; i++) {
        const parte = partesTexto[i];
        if (parte.match(/^([0-9]+\/|[a-zA-Z]+\/)$/)) {
            // Es una nota, tomar el siguiente elemento como contenido
            const contenidoNota = partesTexto[i + 1] || '';
            lineasNotas.push({
                nota: parte,
                texto: contenidoNota.trim()
            });
            i++; // Saltar el contenido ya procesado
        } else if (parte.trim()) {
            textoFuente += parte + ' ';
        }
    }

    // Construir resultado
    let resultado = '';

    // Agregar fuente principal
    if (textoFuente.trim()) {
        resultado += escaparLatex(textoFuente.trim());
    }

    // Agregar notas como lista si existen
    if (lineasNotas.length > 0) {
        resultado += '\n\n{\\fontsize{9pt}{11pt}\\selectfont\n';
        resultado += '\\begin{itemize}\n';

        lineasNotas.forEach(item => {
            const idNota = generarIdNota(item.nota);
            const notaEscapada = escaparLatex(item.nota);
            const textoEscapado = escaparLatex(item.texto);

            resultado += `  \\item[\\hypertarget{${idNota}}{${notaEscapada}}] ${textoEscapado}\n`;
        });

        resultado += '\\end{itemize}\n}';
    }

    return resultado;
}

/**
 * Crea un mapa de elementos agrupados por SeccionOrden
 */
function crearMapaPorSeccion(elementos) {
    const mapa = {};
    elementos.forEach(elem => {
        const seccion = elem['SeccionOrden'];
        if (seccion) {
            if (!mapa[seccion]) {
                mapa[seccion] = [];
            }
            mapa[seccion].push(elem);
        }
    });

    // Ordenar elementos dentro de cada sección
    Object.keys(mapa).forEach(key => {
        mapa[key].sort((a, b) => {
            const ordenA = parseFloat(a['OrdenFigura'] || a['OrdenTabla'] || 0);
            const ordenB = parseFloat(b['OrdenFigura'] || b['OrdenTabla'] || 0);
            return ordenA - ordenB;
        });
    });

    return mapa;
}

/**
 * Genera el código LaTeX para una figura
 */
function generarFigura(figura) {
    const rutaArchivo = figura['RutaArchivo'] || figura['Ruta de Imagen'] || figura['RutaImagen'] || '';
    const caption = figura['Caption'] || figura['Título/Descripción'] || figura['Titulo'] || figura['Descripción'] || figura['Descripcion'] || '';
    const fuente = figura['Fuente'] || '';
    const textoAlt = figura['TextoAlternativo'] || caption;
    const ancho = figura['Ancho'] || '0.8';
    const forcedId = (figura['ID'] || '').toString();
    const sec = (figura['SeccionOrden'] || '').toString();
    const ord = (figura['Fig.'] || figura['OrdenFigura'] || figura['Orden'] || '').toString();
    const id = forcedId || ((sec && ord) ? `FIG-${sec}-${ord}` : (ord ? `FIG-${ord}` : ''));

    log(`  🖼️  Figura detectada: ${previewTexto(caption, 40)}...`);

    let tex = `\\Needspace{18\\baselineskip}\n`;
    tex += `\\begin{figure}[H]\n`;
    // Agrupar \centering e imagen para que no afecte al caption
    tex += `  {\\centering\n`;

    if (rutaArchivo) {
        if (textoAlt) {
            // Con texto alternativo para accesibilidad
            tex += `  % Texto alternativo para accesibilidad\n`;
            tex += `  \\pdftooltip{\\includegraphics[width=${ancho}\\textwidth]{${rutaArchivo}}}{${escaparLatex(textoAlt)}}\n`;
        } else {
            // Sin texto alternativo
            tex += `  \\includegraphics[width=${ancho}\\textwidth]{${rutaArchivo}}\n`;
        }
    }

    // Cerrar el grupo con \par para finalizar el párrafo centrado
    tex += `  \\par}\n`;

    // Forzar alineación a la izquierda para el caption
    tex += `  \\raggedright\n`;

    // Caption va después de la imagen (abajo, alineado a la izquierda por configuración del cls)
    if (caption) {
        const capTxt = escaparLatex(caption);
        tex += `  \\caption{${capTxt}}\n`;
        tex += `  \\label{fig:${id || generarLabel(caption)}}\n`;
    }

    tex += `\\end{figure}\n`;

    if (fuente) {
        // FIX: Reducir espacio antes de fuente para pegarla más a la figura
        tex += `\\vspace{-4pt}\n`;
        tex += `\\fuente{${procesarTextoFuente(fuente)}}\n`;
    }

    tex += `\n`;
    return tex;
}

/**
 * Genera el código LaTeX para una tabla
 */
function generarTabla(tabla, ss) {
    const titulo = tabla['Titulo'] || '';
    const fuente = tabla['Fuente'] || '';
    const datosRef = tabla['DatosCSV'] || '';
    const forcedId = (tabla['ID'] || '').toString();
    const sec = (tabla['SeccionOrden'] || tabla['ID_Seccion'] || '').toString();
    const ord = (tabla['Orden'] || tabla['OrdenTabla'] || '').toString();
    const id = forcedId || ((sec && ord) ? `TBL-${sec}-${ord}` : (ord ? `TBL-${ord}` : ''));

    log(`  📊 Tabla detectada: ${previewTexto(titulo, 40)}...`);

    let esLarga = false;
    let texInicio = '';
    let texFin = '';
    let tex = '';

    // Procesar datos de la tabla
    if (datosRef.includes('!')) {
        // Referencia a rango en otra hoja (ej: Datos_Tablas!A1:E4 o Datos Tablas!A1:E4)
        const [nombreHojaRaw, rango] = datosRef.split('!');
        // En Google Sheets es común referenciar hojas con comillas simples cuando hay espacios:
        //   'Datos Tablas'!A1:E4
        // Normalizamos para poder resolver la hoja real.
        const nombreHoja = String(nombreHojaRaw || '')
            .trim()
            .replace(/^['"]+|['"]+$/g, '');
        log(`    📋 Leyendo datos de "${nombreHoja}" rango ${rango}`);

        try {
            // Intentar encontrar la hoja con el nombre exacto primero
            let hojaDatos = ss.getSheetByName(nombreHoja);

            // Si no se encuentra, intentar variaciones comunes
            if (!hojaDatos) {
                // Intentar con espacios en lugar de guiones bajos
                const nombreConEspacios = nombreHoja.replace(/_/g, ' ');
                hojaDatos = ss.getSheetByName(nombreConEspacios);
                if (hojaDatos) {
                    log(`    ✅ Hoja encontrada como: "${nombreConEspacios}"`);
                }
            }

            // Si aún no se encuentra, intentar con guiones bajos en lugar de espacios
            if (!hojaDatos) {
                const nombreConGuiones = nombreHoja.replace(/ /g, '_');
                hojaDatos = ss.getSheetByName(nombreConGuiones);
                if (hojaDatos) {
                    log(`    ✅ Hoja encontrada como: "${nombreConGuiones}"`);
                }
            }

            if (hojaDatos) {
                const datosTabla = hojaDatos.getRange(rango).getValues();
                log(`    ✅ Datos leídos: ${datosTabla.length} filas`);
                const resultado = procesarDatosArray(datosTabla, titulo, false, id);
                esLarga = resultado.tipo === 'longtable';
                if (esLarga) {
                    // Para tablas largas: usar tabladoradoLargo (sin caption, va en longtable)
                    texInicio = `\\begin{tabladoradoLargo}\n`;
                    texFin = `\\end{tabladoradoLargo}\n`;
                } else {
                    // FIX: Para tablas cortas: usar tabladoradoCorto (mismo estilo que longtable)
                    texInicio = `\\begin{tabladoradoCorto}\n`;
                    const capTxt = escaparLatex(titulo);
                    texInicio += `  \\caption{${capTxt}}\n`;
                    texInicio += `  \\label{tab:${id || generarLabel(titulo)}}\n`;
                    texFin = `\\end{tabladoradoCorto}\n`;
                }
                texInicio += resultado.contenido;
            } else {
                log(`    ⚠️ No se encontró la hoja: "${nombreHoja}"`);
                // FIX: Cachear lista de hojas para evitar llamadas repetidas
                if (!this._hojasDisponiblesCache) {
                    this._hojasDisponiblesCache = ss.getSheets().map(s => s.getName()).join(', ');
                }
                log(`    💡 Hojas disponibles: ${this._hojasDisponiblesCache}`);
                // No inyectamos una tabla de error al PDF; dejamos el diagnóstico en comentarios del .tex.
                tex += `  % ERROR: No se encontró la hoja "${nombreHoja}"\n`;
                tex += `  % Hojas disponibles: ${this._hojasDisponiblesCache}\n`;
            }
        } catch (e) {
            log(`    ❌ Error al leer rango: ${e.toString()}`);
            // Igual: evitamos meter “tablas de error” dentro del documento.
            tex += `  % ERROR: ${e.toString()}\n`;
        }
    } else {
        // Datos CSV directos
        texInicio += procesarDatosCSV(datosRef);
    }

    if (!texInicio) {
        // FIX: Fallback: usar tabladoradoCorto para tablas simples (estilo consistente)
        const capTxt = escaparLatex(titulo);
        texInicio = `\\begin{tabladoradoCorto}\n  \\caption{${capTxt}}\n  \\label{tab:${id || generarLabel(titulo)}}\n`;
        texFin = `\\end{tabladoradoCorto}\n`;
    }
    if (tex === '') {
        tex = texInicio + texFin;
    }

    if (fuente) {
        // FIX: Reducir espacio antes de fuente para pegarla más a la tabla
        tex += `\\vspace{-4pt}\n`;
        tex += `\\fuente{${procesarTextoFuente(fuente)}}\n`;
    }

    tex += `\n`;
    return tex;
}

/**
 * Procesa un array 2D de datos (desde Google Sheets) y genera tabla LaTeX
 * Si la tabla tiene muchas columnas, la divide automáticamente
 */
function procesarDatosArray(datos, tituloTabla, forzarLongtable = false, forcedId) {
    if (!datos || datos.length === 0) {
        return { tipo: 'tabular', contenido: `  \\begin{tabular}{lc}\n    % Sin datos\n  \\end{tabular}\n` };
    }

    const numCols = datos[0].length;
    const MAX_COLS_POR_TABLA = 6; // Máximo 6 columnas por tabla (incluyendo la primera)
    const MAX_FILAS_COMPACTA = 15; // Umbral para usar tabular en tablas cortas (reducido)
    const MAX_FILAS_POR_PARTE = 35; // Si hay demasiadas filas, dividir por partes

    // Si la tabla cabe en una sola parte
    if (numCols <= MAX_COLS_POR_TABLA) {
        const numFilas = Math.max(0, datos.length - 1);

        // Si es una tabla pequeña y no se fuerza longtable, usar tabular
        if (numFilas <= MAX_FILAS_COMPACTA && !forzarLongtable) {
            return { tipo: 'tabular', contenido: generarTablaCompacta(datos) };
        }

        // Para tablas medianas o si se fuerza longtable
        if (numFilas > MAX_FILAS_POR_PARTE) {
            return { tipo: 'longtable', contenido: dividirTablaPorFilas(datos, MAX_FILAS_POR_PARTE, tituloTabla, forcedId) };
        }
        return { tipo: 'longtable', contenido: generarTablaSimple(datos, tituloTabla, forcedId) };
    }

    // Dividir tabla en múltiples partes (siempre longtable)
    return { tipo: 'longtable', contenido: dividirTabla(datos, MAX_COLS_POR_TABLA, tituloTabla, forcedId) };
}

/**
 * Genera una tabla simple sin división
 */
function generarTablaSimple(datos, tituloTabla, forcedId) {
    const numCols = datos[0].length;

    // Calcular ancho de columnas para longtable
    // Primera columna: 3cm con negritas automáticas (B), resto: distribuido equitativamente
    const anchoRestante = `${(11 / (numCols - 1)).toFixed(2)}cm`; // ancho útil compacto
    const especCols = 'B{3cm}' + ('p{' + anchoRestante + '}').repeat(numCols - 1);

    // Usar longtable para permitir saltos de página automáticos
    let tex = `  \\begin{longtable}{${especCols}}\n`;
    if (tituloTabla) {
        const capTxt = escaparLatex(tituloTabla);
        const idTxt = forcedId ? ` \\textit{(${forcedId})}` : '';
        tex += `    \\caption{${capTxt}${idTxt}}\\label{tab:${forcedId || generarLabel(tituloTabla)}}\\\\\n`;
    }

    // Encabezado para la primera página con fondo dorado
    tex += `    \\toprule\n`;
    const encabezados = procesarCeldasFila(datos[0], true).map(c => `\\encabezadodorado{${c}}`).join(' & ');
    tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
    tex += `    \\midrule\n`;
    tex += `    \\endfirsthead\n\n`;

    // Encabezado para páginas siguientes (con "Continuación...")
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

    // Datos de la tabla (empezando desde la fila 1, ya que la 0 es el encabezado)
    for (let i = 1; i < datos.length; i++) {
        const celdas = procesarCeldasFila(datos[i]);
        tex += `    ${celdas.join(' & ')} \\\\\n`;
    }

    tex += `  \\end{longtable}\n`;
    return tex;
}

/**
 * FIX: Genera una tabla compacta usando tabular (para tabladoradoCorto)
 * Ahora con estilo dorado + texto gris + alineación izquierda
 */
function generarTablaCompacta(datos) {
    const numCols = datos[0].length;
    // FIX: Usar tipos de columna con texto gris y alineación izquierda
    const especCols = 'H{3cm}' + ('G{2cm}'.repeat(numCols - 1));
    let tex = `  \\begin{tabular}{${especCols}}\n`;
    tex += `    \\toprule\n`;
    // Encabezados con fondo dorado
    const encabezados = procesarCeldasFila(datos[0], true).map(c => `\\encabezadodorado{${c}}`).join(' & ');
    tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
    tex += `    \\midrule\n`;

    for (let i = 1; i < datos.length; i++) {
        const celdas = procesarCeldasFila(datos[i]);
        tex += `    ${celdas.join(' & ')} \\\\\n`;
    }

    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabular}\n`;
    return tex;
}



/**
 * Divide una tabla grande en múltiples partes (por columnas)
 * Cada parte usa longtable para permitir saltos de página automáticos
 */
function dividirTabla(datos, maxCols, tituloTabla, forcedId) {
    const numCols = datos[0].length;
    let tex = '';
    let parte = 1;

    // Calcular cuántas partes necesitamos
    // Primera columna siempre se repite, entonces: 1 + (maxCols - 1) columnas por parte
    const colsPorParte = maxCols - 1;
    let colInicio = 1; // Empezamos desde la columna 1 (la 0 es la primera que se repite)

    while (colInicio < numCols) {
        const colFin = Math.min(colInicio + colsPorParte, numCols);

        // FIX: Reducir espacios en continuaciones de tablas
        if (parte > 1) {
            tex += `\n  \\vspace{0.25em}\n`;
            tex += `  {\\small\\textit{Continuación Tabla. ${escaparLatex(tituloTabla || '')}}}\n`;
            tex += `  \\vspace{0.15em}\n\n`;
        }

        // Generar esta parte de la tabla
        const colsEnEstaParte = [0].concat(Array.from({ length: colFin - colInicio }, (_, i) => colInicio + i));
        const numColsTabla = colsEnEstaParte.length;

        // Calcular ancho de columnas para longtable
        const anchoRestante = `${(11 / (numColsTabla - 1)).toFixed(2)}cm`;
        const especCols = 'B{3cm}' + ('p{' + anchoRestante + '}').repeat(numColsTabla - 1);

        // Usar longtable para permitir saltos de página
        tex += `  \\begin{longtable}{${especCols}}\n`;
        if (tituloTabla && parte === 1) {
            const capTxt = escaparLatex(tituloTabla);
            const idTxt = forcedId ? ` \\textit{(${forcedId})}` : '';
            tex += `    \\caption{${capTxt}${idTxt}}\\label{tab:${forcedId || generarLabel(tituloTabla)}}\\\\\n`;
        }

        // Extraer encabezados de esta parte con fondo dorado
        const celdasEncabezado = colsEnEstaParte.map(colIdx => datos[0][colIdx]);
        const encabezados = procesarCeldasFila(celdasEncabezado, true).map(c => `\\encabezadodorado{${c}}`).join(' & ');

        // Encabezado para la primera página
        tex += `    \\toprule\n`;
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endfirsthead\n\n`;

        // Encabezado para páginas siguientes
        tex += `    \\multicolumn{${numColsTabla}}{l}{\\small\\textit{Continuación...}} \\\\\n`;
        tex += `    \\toprule\n`;
        tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
        tex += `    \\midrule\n`;
        tex += `    \\endhead\n\n`;

        // Pie en páginas intermedias
        tex += `    \\midrule\n`;
        tex += `    \\multicolumn{${numColsTabla}}{r}{\\small\\textit{Continúa en la siguiente página...}} \\\\\n`;
        tex += `    \\endfoot\n\n`;

        // Pie en la última página
        tex += `    \\bottomrule\n`;
        tex += `    \\endlastfoot\n\n`;

        // Datos de la tabla (empezando desde la fila 1)
        for (let i = 1; i < datos.length; i++) {
            const celdasParte = colsEnEstaParte.map(colIdx => datos[i][colIdx]);
            const celdas = procesarCeldasFila(celdasParte);
            tex += `    ${celdas.join(' & ')} \\\\\n`;
        }

        tex += `  \\end{longtable}\n`;

        colInicio = colFin;
        parte++;
    }

    return tex;
}

/**
 * Divide una tabla por filas en partes con longtable y nota de continuación
 */
function dividirTablaPorFilas(datos, maxFilasParte, tituloTabla, forcedId) {
    const numCols = datos[0].length;
    const anchoRestante = `${(11 / (numCols - 1)).toFixed(2)}cm`;
    const especCols = 'p{3cm}' + ('p{' + anchoRestante + '}').repeat(numCols - 1);
    let tex = '';
    let inicio = 1; // Saltar encabezado
    let parte = 1;
    while (inicio < datos.length) {
        const fin = Math.min(inicio + maxFilasParte, datos.length);
        tex += `  \\begin{longtable}{${especCols}}\n`;
        if (tituloTabla && parte === 1) {
            const capTxt = escaparLatex(tituloTabla);
            const idTxt = forcedId ? ` \\textit{(${forcedId})}` : '';
            tex += `    \\caption{${capTxt}${idTxt}}\\label{tab:${forcedId || generarLabel(tituloTabla)}}\\\\\n`;
        }
        tex += `    \\toprule\n`;
        const encabezados = procesarCeldasFila(datos[0], true).map(c => `\\encabezadodorado{${c}}`).join(' & ');
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
            const celdas = procesarCeldasFila(datos[i]);
            tex += `    ${celdas.join(' & ')} \\\\\n`;
        }
        tex += `  \\end{longtable}\n`;
        if (fin < datos.length) {
            // FIX: Reducir espacios en continuaciones de tablas por filas
            tex += `\n  \\vspace{0.25em}\n  {\\small\\textit{Continuación Tabla. ${escaparLatex(tituloTabla || '')}}}\n  \\vspace{0.15em}\n\n`;
        }
        inicio = fin;
        parte++;
    }
    return tex;
}

/**
 * Genera un ID único para una nota (para enlaces)
 * Ejemplos: "1/" -> "nota1", "6/" -> "nota6", "P/" -> "notaP"
 */
function generarIdNota(nota) {
    // Remover el "/" y agregar prefijo
    return 'nota' + nota.replace('/', '');
}

/**
 * Aplica estilo a las notas en el texto (superíndice clicable)
 * Detecta patrones como: 1/, 6/, P/, e/, 1/,7/, 1/,7/,11/, etc.
 * IMPORTANTE: Debe aplicarse ANTES de escapar LaTeX
 */
function estilizarNotas(texto) {
    // Detectar notas al final del texto
    // Patrón: espacio + una o más notas separadas por comas + opcional espacio final
    // Ejemplos: " 6/", " 1/,7/", " P/,e/", " 1/,7/,11/"

    // Buscar patrón de notas al final
    const match = texto.match(/^(.*?)\s+([0-9]+\/(?:,[0-9]+\/)*|[a-zA-Z]+\/(?:,[a-zA-Z]+\/)*)\s*$/);

    if (match) {
        const textoBase = match[1];
        const notasStr = match[2];

        // Separar notas múltiples (ej: "1/,7/" -> ["1/", "7/"])
        const notasArray = notasStr.split(',');

        return {
            textoBase: textoBase,
            notas: notasArray,
            tieneNotas: true
        };
    }

    return {
        textoBase: texto,
        notas: [],
        tieneNotas: false
    };
}

/**
 * Procesa las celdas de una fila (redondeo de números)
 * @param {boolean} esEncabezado - Si es fila de encabezado (para usar color blanco en notas)
 */
function procesarCeldasFila(fila, esEncabezado = false) {
    return fila.map((c, idx) => {
        if (c === null || c === undefined || c === '') return '';

        // Si es número, redondear a máximo 4 decimales
        if (typeof c === 'number') {
            const nf = Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: true });
            return escaparLatex(nf.format(c));
        }

        // Si es string que parece número, intentar redondear
        const num = parseFloat(c);
        if (!isNaN(num) && c.toString().includes('.')) {
            const decimales = c.toString().split('.')[1];
            if (decimales && decimales.length > 4) {
                const nf = Intl.NumberFormat('en-US', { maximumFractionDigits: 4, useGrouping: true });
                return escaparLatex(nf.format(num));
            }
        }

        // Detectar y separar notas ANTES de escapar
        const textoOriginal = c.toString();
        const resultado = estilizarNotas(textoOriginal);

        let textoFinal;
        if (resultado.tieneNotas) {
            // Escapar el texto base
            const textoBaseEscapado = escaparLatex(resultado.textoBase);

            // Color blanco para encabezados (fondo dorado), gris para cuerpo
            const colorNota = esEncabezado ? 'white' : 'gray';

            // Procesar cada nota por separado para crear enlaces individuales
            const notasLatex = resultado.notas.map(nota => {
                const notaEscapada = escaparLatex(nota);
                const idNota = generarIdNota(nota);
                // Crear enlace clicable a la explicación en la fuente
                return `\\hyperlink{${idNota}}{\\textcolor{${colorNota}}{${notaEscapada}}}`;
            }).join(',');

            textoFinal = `${textoBaseEscapado} \\textsuperscript{${notasLatex}}`;
        } else {
            textoFinal = escaparLatex(textoOriginal);
        }

        // Primera columna en negritas (sin color)
        if (idx === 0) {
            textoFinal = `\\textbf{${textoFinal}}`;
        }
        return textoFinal;
    });
}

/**
 * Procesa datos CSV y genera tabla LaTeX
 */
function procesarDatosCSV(csv) {
    if (!csv || csv.trim() === '') {
        return `  \\begin{tabular}{lc}\n    % Sin datos\n  \\end{tabular}\n`;
    }

    const lineas = csv.trim().split('\n');
    if (lineas.length === 0) return '';

    const numCols = lineas[0].split(',').length;
    let tex = `  \\begin{tabular}{${'l' + 'c'.repeat(numCols - 1)}}\n`;
    tex += `    \\toprule\n`;

    lineas.forEach((linea, index) => {
        const celdas = linea.split(',').map(c => escaparLatex(c.trim()));

        if (index === 0) {
            // Encabezado con fondo dorado
            const encabezados = celdas.map(c => `\\encabezadodorado{${c}}`).join(' & ');
            tex += `    \\rowcolor{gobmxDorado} ${encabezados} \\\\\n`;
            tex += `    \\midrule\n`;
        } else {
            // Datos - primera columna en negritas
            const celdasFormateadas = celdas.map((c, idx) => idx === 0 ? `\\textbf{${c}}` : c);
            tex += `    ${celdasFormateadas.join(' & ')} \\\\\n`;
        }
    });

    tex += `    \\bottomrule\n`;
    tex += `  \\end{tabular}\n`;
    return tex;
}

/**
 * Genera el glosario
 */
function generarGlosario(glosario) {
    let tex = `\\section*{Glosario}\n`;
    // Necesario para que el vínculo del índice apunte a la sección correcta
    // cuando usamos secciones sin numeración (\\section*).
    tex += `\\phantomsection\n`;
    tex += `\\addcontentsline{toc}{section}{Glosario}\n\n`;

    // Ordenar alfabéticamente
    glosario.sort((a, b) => {
        const termA = (a['Termino'] || '').toString().toLowerCase();
        const termB = (b['Termino'] || '').toString().toLowerCase();
        return termA.localeCompare(termB);
    });

    glosario.forEach(entrada => {
        const termino = entrada['Termino'] || '';
        const definicion = entrada['Definicion'] || '';
        if (termino && definicion) {
            tex += `\\entradaGlosario{${escaparLatex(termino)}}{${escaparLatex(definicion)}}\n`;
        }
    });

    tex += `\n`;
    return tex;
}

/**
 * Genera la sección de siglas y acrónimos
 */
function generarSiglas(siglas) {
    let tex = `\\section*{Siglas y Acrónimos}\n`;
    // Necesario para que el vínculo del índice apunte a la sección correcta
    // cuando usamos secciones sin numeración (\\section*).
    tex += `\\phantomsection\n`;
    tex += `\\addcontentsline{toc}{section}{Siglas y Acrónimos}\n\n`;

    // Ordenar alfabéticamente
    siglas.sort((a, b) => {
        const siglaA = (a['Sigla'] || '').toString().toLowerCase();
        const siglaB = (b['Sigla'] || '').toString().toLowerCase();
        return siglaA.localeCompare(siglaB);
    });

    siglas.forEach(entrada => {
        const sigla = entrada['Sigla'] || '';
        const descripcion = entrada['Descripcion'] || '';
        if (sigla && descripcion) {
            tex += `\\entradaSigla{${escaparLatex(sigla)}}{${escaparLatex(descripcion)}}\n`;
        }
    });

    tex += `\n`;
    return tex;
}

/**
 * Genera un label válido para LaTeX a partir de un texto
 */
function generarLabel(texto) {
    return texto.toString()
        .toLowerCase()
        .replace(/[áàäâ]/g, 'a')
        .replace(/[éèëê]/g, 'e')
        .replace(/[íìïî]/g, 'i')
        .replace(/[óòöô]/g, 'o')
        .replace(/[úùüû]/g, 'u')
        .replace(/ñ/g, 'n')
        .replace(/[^a-z0-9]/g, '_')
        .substring(0, 30);
}

// ============================================================================
// API WEB - FUNCIONES PARA LA INTERFAZ WEB
// ============================================================================

/**
 * API: Obtener lista de todos los documentos
 */
function getDocumentos() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Documentos');

    if (!hoja) {
        return [];
    }

    const datos = hoja.getDataRange().getValues();

    if (datos.length < 2) {
        return [];
    }

    const headers = datos[0];
    const documentos = [];

    for (let i = 1; i < datos.length; i++) {
        const fila = datos[i];
        const doc = {};

        headers.forEach((header, j) => {
            doc[header] = fila[j];
        });

        // Solo agregar si tiene ID
        if (doc['ID']) {
            documentos.push(doc);
        }
    }

    return documentos;
}

/**
 * API: Obtener documento completo por ID
 */
function getDocumento(docId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Obtener metadatos
    const hojaDocs = ss.getSheetByName('Documentos');
    if (!hojaDocs) {
        throw new Error('No se encuentra la hoja "Documentos"');
    }

    const datosDocs = hojaDocs.getDataRange().getValues();
    const headersDocs = datosDocs[0];
    let metadata = null;

    for (let i = 1; i < datosDocs.length; i++) {
        if (datosDocs[i][0] == docId) {
            metadata = {};
            headersDocs.forEach((header, j) => {
                metadata[header] = datosDocs[i][j];
            });
            break;
        }
    }

    if (!metadata) {
        throw new Error(`No se encontró el documento con ID: ${docId}`);
    }

    return {
        metadata: metadata,
        secciones: obtenerRegistros(ss, 'Secciones', docId, 'DocumentoID'),
        tablas: obtenerRegistros(ss, 'Tablas', docId, 'DocumentoID'),
        figuras: obtenerRegistros(ss, 'Figuras', docId, 'DocumentoID'),
        bibliografia: obtenerRegistros(ss, 'Bibliografia', docId, 'DocumentoID'),
        siglas: obtenerRegistros(ss, 'Siglas', docId, 'DocumentoID'),
        glosario: obtenerRegistros(ss, 'Glosario', docId, 'DocumentoID')
    };
}

/**
 * API: Guardar cambios en metadatos del documento
 */
function guardarDocumento(docId, datos) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const hoja = ss.getSheetByName('Documentos');

    if (!hoja) {
        return { success: false, message: 'No se encuentra la hoja "Documentos"' };
    }

    const datosFila = hoja.getDataRange().getValues();
    const headers = datosFila[0];

    // Buscar la fila del documento
    for (let i = 1; i < datosFila.length; i++) {
        if (datosFila[i][0] == docId) {
            // Actualizar cada campo
            if (datos.metadata) {
                Object.keys(datos.metadata).forEach(key => {
                    const colIndex = headers.indexOf(key);
                    if (colIndex !== -1) {
                        hoja.getRange(i + 1, colIndex + 1).setValue(datos.metadata[key]);
                    }
                });
            }

            return { success: true, message: 'Documento guardado correctamente' };
        }
    }

    return { success: false, message: 'No se encontró el documento' };
}

/**
 * API: Generar .tex desde la interfaz web
 */
function generarTexDesdeWeb(docId) {
    try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();

        // Obtener datos del documento
        const hojaDocs = ss.getSheetByName('Documentos');
        if (!hojaDocs) {
            throw new Error('No se encuentra la hoja "Documentos"');
        }

        const datosDocs = hojaDocs.getDataRange().getValues();
        const headersDocs = datosDocs[0];
        let datosDoc = null;
        let filaDoc = -1;

        for (let i = 1; i < datosDocs.length; i++) {
            if (datosDocs[i][0] == docId) {
                datosDoc = {};
                headersDocs.forEach((header, j) => {
                    datosDoc[header] = datosDocs[i][j];
                });
                filaDoc = i + 1;
                break;
            }
        }

        if (!datosDoc) {
            throw new Error(`No se encontró el documento con ID: ${docId}`);
        }

        // Obtener todas las hojas relacionadas
        const secciones = obtenerRegistros(ss, 'Secciones', docId, 'DocumentoID');
        const bibliografia = obtenerRegistros(ss, 'Bibliografia', docId, 'DocumentoID');
        const figuras = obtenerRegistros(ss, 'Figuras', docId, 'DocumentoID');
        const tablas = obtenerRegistros(ss, 'Tablas', docId, 'DocumentoID');
        const siglas = obtenerRegistros(ss, 'Siglas', docId, 'DocumentoID');
        const glosario = obtenerRegistros(ss, 'Glosario', docId, 'DocumentoID');

        // Ordenar secciones
        secciones.sort((a, b) => {
            const oa = parseFloat(a.Orden) || 0;
            const ob = parseFloat(b.Orden) || 0;
            return oa - ob;
        });

        // Construir el contenido LaTeX
        const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, ss);

        return {
            success: true,
            contenido: tex,
            nombreArchivo: `${datosDoc['DocumentoCorto'] || 'documento'}.tex`
        };

    } catch (error) {
        return {
            success: false,
            message: error.toString()
        };
    }
}

/**
 * Escapa texto LaTeX pero procesa etiquetas especiales [[...]]
 * Soporta: [[nota:]], [[cita:]], [[destacado:]], [[ecuacion:]], [[math:]], [[dorado:]], [[guinda:]]
 */
function escaparTextoConEtiquetas(texto) {
    if (!texto) return '';
    let str = texto.toString();

    // 1. Extraer Ecuaciones para NO escaparlas
    const ecuaciones = [];

    // [[ecuacion:...]] -> \begin{equation} ... \end{equation}
    str = str.replace(/\[\[ecuacion:([\s\S]*?)\]\]/g, function (_match, contenido) {
        ecuaciones.push(`\\begin{equation}\n${contenido}\n\\end{equation}`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // [[math:...]] -> $ ... $
    str = str.replace(/\[\[math:([\s\S]*?)\]\]/g, function (_match, contenido) {
        ecuaciones.push(`$${contenido}$`);
        return `ZEQPLACEHOLDER${ecuaciones.length - 1}Z`;
    });

    // 2. Extraer CITAS para NO escaparlas
    const citas = [];
    str = str.replace(/\[\[cita:([\s\S]*?)\]\]/g, function (_match, contenido) {
        const clave = contenido.toString().trim();
        citas.push(`\\cite{${clave}}`);
        return `ZCITEPOLDER${citas.length - 1}Z`;
    });

    // 3. Proteger etiquetas de texto
    str = str
        .replace(/\[\[nota:([\s\S]*?)\]\]/g, 'ZFOOTNOTESTARTZ$1ZFOOTNOTEENDZ')
        .replace(/\[\[destacado:([\s\S]*?)\]\]/g, 'ZDESTACADOSTARTZ$1ZDESTACADOENDZ')
        .replace(/\[\[dorado:([\s\S]*?)\]\]/g, 'ZGOLDSTARTZ$1ZGOLDENDZ')
        .replace(/\[\[guinda:([\s\S]*?)\]\]/g, 'ZGUINDASTARTZ$1ZGUINDAENDZ');

    // 4. Escapar LaTeX general
    str = escaparLatex(str);

    // 5. Restaurar etiquetas de texto
    str = str
        .replace(/ZFOOTNOTESTARTZ/g, '\\footnote{')
        .replace(/ZFOOTNOTEENDZ/g, '}')
        .replace(/ZDESTACADOSTARTZ/g, '\\begin{destacado}\n')
        .replace(/ZDESTACADOENDZ/g, '\n\\end{destacado}')
        .replace(/ZGOLDSTARTZ/g, '\\textbf{\\textcolor{gobmxDorado}{')
        .replace(/ZGOLDENDZ/g, '}}')
        .replace(/ZGUINDASTARTZ/g, '\\textbf{\\textcolor{gobmxGuinda}{')
        .replace(/ZGUINDAENDZ/g, '}}');

    // 6. Restaurar Citas
    str = str.replace(/ZCITEPOLDER(\d+)Z/g, function (_match, index) {
        return citas[parseInt(index)];
    });

    // 7. Restaurar Ecuaciones
    str = str.replace(/ZEQPLACEHOLDER(\d+)Z/g, function (_match, index) {
        return ecuaciones[parseInt(index)];
    });

    return str;
}


/**
 * Función de prueba para validar la normalización de saltos
 * Ejecutar desde el editor de Google Apps Script para verificar
 */
function probarNormalizacionSaltos() {
    console.log('=== PRUEBAS DE NORMALIZACIÓN DE SALTOS ===');

    // Caso 1: Salto al inicio (problemático)
    const caso1 = '\nObjetivo: detectar errores...';
    const resultado1 = normalizarSaltosLatex(caso1);
    console.log('Caso 1 (salto inicial):');
    console.log('Entrada:', JSON.stringify(caso1));
    console.log('Salida:', JSON.stringify(resultado1));
    console.log('✓ No inicia con \\\\:', !resultado1.startsWith('\\\\'));

    // Caso 2: Múltiples saltos
    const caso2 = 'Primera línea\\n\\nSegunda línea\\nTercera línea';
    const resultado2 = normalizarSaltosLatex(caso2);
    console.log('\nCaso 2 (múltiples saltos):');
    console.log('Entrada:', JSON.stringify(caso2));
    console.log('Salida:', JSON.stringify(resultado2));

    // Caso 3: Recuadro con contenido multilínea
    const caso3 = '[[recuadro:Título]]\\nPrimera línea\\nSegunda línea\\n\\nNuevo párrafo[[/recuadro]]';
    const resultado3 = procesarConEtiquetas(caso3);
    console.log('\nCaso 3 (recuadro multilínea):');
    console.log('Entrada:', JSON.stringify(caso3));
    console.log('Salida:', JSON.stringify(resultado3));
    console.log('✓ Contiene \\begin{recuadro}:', resultado3.includes('\\begin{recuadro}'));
    console.log('✓ No contiene [[recuadro:', !resultado3.includes('[[recuadro:'));

    // Caso 4: Ecuación con texto
    const caso4 = 'La fórmula es $E=mc^2$ donde\\nE es energía';
    const resultado4 = procesarConEtiquetas(caso4);
    console.log('\nCaso 4 (ecuación con salto):');
    console.log('Entrada:', JSON.stringify(caso4));
    console.log('Salida:', JSON.stringify(resultado4));
    console.log('✓ Preserva ecuación:', resultado4.includes('$E=mc^2$'));

    console.log('\n=== PRUEBAS COMPLETADAS ===');
    return 'Todas las pruebas ejecutadas. Revisa la consola para resultados.';
}
/**
 * Función de prueba para validar las correcciones del script
 * Ejecutar desde el editor de Google Apps Script para verificar
 */
function probarCorreccionesScript() {
    console.log('=== PRUEBAS DE CORRECCIONES DEL SCRIPT ===');

    // Prueba 1: Footnote con caracteres especiales
    console.log('\n1. Prueba de footnote con caracteres especiales:');
    const textoFootnote = 'Nota con símbolos como % y & que deben escaparse.';
    const footnoteCorregida = escaparFootnote(textoFootnote);
    console.log('Entrada:', JSON.stringify(textoFootnote));
    console.log('Salida:', JSON.stringify(footnoteCorregida));
    console.log('✓ Contiene \\%:', footnoteCorregida.includes('\\%'));
    console.log('✓ Contiene \\&:', footnoteCorregida.includes('\\&'));

    // Prueba 2: Procesamiento de etiqueta [[nota:...]]
    console.log('\n2. Prueba de etiqueta [[nota:...]] con caracteres especiales:');
    const textoConNota = 'Texto normal [[nota:Nota con % y & especiales]] más texto.';
    const notaProcesada = procesarConEtiquetas(textoConNota);
    console.log('Entrada:', JSON.stringify(textoConNota));
    console.log('Salida:', JSON.stringify(notaProcesada));
    console.log('✓ Contiene \\footnote:', notaProcesada.includes('\\footnote'));
    console.log('✓ No contiene [[nota:', !notaProcesada.includes('[[nota:'));
    console.log('✓ Caracteres escapados:', notaProcesada.includes('\\%') && notaProcesada.includes('\\&'));

    // Prueba 3: Normalización sin \par
    console.log('\n3. Prueba de normalización sin \\par:');
    const textoConSaltos = 'Primera línea\\n\\nSegunda línea\\nTercera línea';
    const normalizado = normalizarSaltosLatex(textoConSaltos);
    console.log('Entrada:', JSON.stringify(textoConSaltos));
    console.log('Salida:', JSON.stringify(normalizado));
    console.log('✓ NO contiene \\par:', !normalizado.includes('\\par'));
    console.log('✓ Contiene doble salto:', normalizado.includes('\n\n'));

    // Prueba 4: Validación de comandos mal escapados
    console.log('\n4. Prueba de validación de comandos mal escapados:');
    const textoConComandoMalEscapado = 'Texto con \\textbackslash{}par y \\textbackslash{}begin{test}';
    const validado = validarYCorregirLatex(textoConComandoMalEscapado);
    console.log('Entrada:', JSON.stringify(textoConComandoMalEscapado));
    console.log('Salida:', JSON.stringify(validado));
    console.log('✓ NO contiene \\textbackslash{}par:', !validado.includes('\\textbackslash{}par'));
    console.log('✓ Contiene líneas en blanco:', validado.includes('\n\n'));

    // Prueba 5: Procesamiento completo sin comandos mal escapados
    console.log('\n5. Prueba de procesamiento completo:');
    const textoCompleto = 'Objetivo: detectar errores\\n\\nEste texto tiene párrafos separados.';
    const procesadoCompleto = procesarConEtiquetas(textoCompleto);
    console.log('Entrada:', JSON.stringify(textoCompleto));
    console.log('Salida:', JSON.stringify(procesadoCompleto));
    console.log('✓ NO contiene \\textbackslash{}par:', !procesadoCompleto.includes('\\textbackslash{}par'));
    console.log('✓ NO contiene \\par literal:', !procesadoCompleto.includes('\\par'));

    console.log('\n=== PRUEBAS COMPLETADAS ===');
    console.log('Revisa los resultados arriba para verificar que todas las correcciones funcionan.');

    return 'Pruebas ejecutadas. Revisa la consola para resultados detallados.';
}
