/**
 * ACTUALIZACIÓN PARA GENERAR LATEX CON ESTILOS DE TABLA
 * 
 * Este archivo muestra los cambios necesarios para integrar los estilos de tabla
 * en el generador LaTeX. Copia estas funciones a server/latexGenerator.js
 */

// ============================================================================
// TABLE STYLING UTILITIES (Agregar después del import de fetch)
// ============================================================================

/**
 * Convert hex color to LaTeX color name or xcolor spec
 */
function hexToLatexColor(hexColor) {
    if (!hexColor) return 'white';
    
    const hex = hexColor.toLowerCase().replace('#', '');
    const colorMap = {
        'd4a574': 'gobmxDorado',        // SENER Gold
        '8b4513': 'brown',              // SENER Brown
        'ffffff': 'white',
        'f5f5dc': 'xcolor[HTML]{F5F5DC}',
        'fffacd': 'xcolor[HTML]{FFFACD}',
        'ffe4e1': 'xcolor[HTML]{FFE4E1}',
        'e6f3ff': 'xcolor[HTML]{E6F3FF}',
        'f0fff0': 'xcolor[HTML]{F0FFF0}',
        'f5f5f5': 'gray!10',
        '000000': 'black'
    };
    
    return colorMap[hex] || `xcolor[HTML]{${hex.toUpperCase()}}`;
}

/**
 * Apply table styles to cell content
 */
function applyTableStyleToCell(cellContent, rowIndex, colIndex, headerRowCount, tableStyle) {
    if (!tableStyle) return cellContent;
    
    let result = cellContent;
    
    // Check for individual cell style
    const cellKey = `${rowIndex},${colIndex}`;
    const cellStyle = tableStyle.cellStyles?.[cellKey];
    
    if (cellStyle) {
        if (cellStyle.backgroundColor) {
            const bg = hexToLatexColor(cellStyle.backgroundColor);
            result = `\\cellcolor{${bg}}{${result}}`;
        }
        if (cellStyle.textColor) {
            const fg = hexToLatexColor(cellStyle.textColor);
            result = `\\textcolor{${fg}}{${result}}`;
        }
        if (cellStyle.isBold) result = `\\textbf{${result}}`;
        if (cellStyle.isItalic) result = `\\textit{${result}}`;
    }
    
    return result;
}

/**
 * Get rowcolor command for a specific row
 */
function getRowColorCommand(rowIndex, headerRowCount, tableStyle) {
    if (!tableStyle) return '';
    
    if (rowIndex < headerRowCount) {
        const headerBg = tableStyle.headerStyle?.backgroundColor;
        const color = hexToLatexColor(headerBg || '#D4A574');
        return `\\rowcolor{${color}} `;
    }
    
    if (tableStyle.stripingEnabled && tableStyle.alternateRowColor) {
        const dataRowIndex = rowIndex - headerRowCount;
        if (dataRowIndex % 2 === 1) {
            const altColor = hexToLatexColor(tableStyle.alternateRowColor);
            return `\\rowcolor{${altColor}} `;
        }
    }
    
    return '';
}

// ============================================================================
// ACTUALIZAR: generarLatexString PARA ACEPTAR tableStyleMap
// ============================================================================

/**
 * REEMPLAZAR esta firma de función:
 * function generarLatexString(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades)
 * 
 * POR esta:
 */
function generarLatexString(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades, tableStyleMap = {}) {
    // Resto del código igual...
    // Solo agregar el parámetro tableStyleMap = {} al final
}

// ============================================================================
// ACTUALIZAR: construirLatex PARA PASAR tableStyleMap
// ============================================================================

/**
 * REEMPLAZAR esta línea en construirLatex:
 * const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades);
 * 
 * POR esta:
 */
// const tex = construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades, tableStyleMap);

/**
 * REEMPLAZAR la firma:
 * function construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades)
 * 
 * POR:
 */
// function construirLatex(datosDoc, secciones, bibliografia, figuras, tablas, siglas, glosario, unidades, tableStyleMap = {})

// Y PASAR tableStyleMap a procesarSecciones:
// const resultado = procesarSecciones(secciones, figurasMap, tablasMap, figurasById, tablasById, tableStyleMap);

// ============================================================================
// ACTUALIZAR: procesarSecciones PARA PASAR tableStyleMap
// ============================================================================

/**
 * REEMPLAZAR:
 * function procesarSecciones(secciones, figurasMap, tablasMap, figurasById, tablasById)
 * 
 * POR:
 */
// function procesarSecciones(secciones, figurasMap, tablasMap, figurasById, tablasById, tableStyleMap = {})

// Y PASAR tableStyleMap al llamar generarTabla:
// resultado += generarTabla(tabla, seccionPendiente, tableStyleMap[tabla.ID] || tableStyleMap[calculatedId]);

// ============================================================================
// ACTUALIZAR: generarTabla PARA USAR LOS ESTILOS
// ============================================================================

/**
 * REEMPLAZAR esta llamada:
 * function generarTabla(tabla, seccionInfo = null)
 * 
 * POR:
 */
// function generarTabla(tabla, seccionInfo = null, tableStyle = null)

// Y EN LA SECCIÓN DONDE SE GENERAN LAS FILAS, REEMPLAZAR:
/*
    // Antes (línea ~1030):
    encabezadosTex += `    \\rowcolor{gobmxDorado} ${celdas} \\\\${line}\n`;
    
    // Por:
    const headerRowColor = getRowColorCommand(rIndex, headerRowsCount, tableStyle);
    encabezadosTex += `    ${headerRowColor}${celdas} \\\\${line}\n`;
*/

// Y EN LA SECCIÓN DE CELDAS (línea ~1175), REEMPLAZAR:
/*
    // Antes:
    return `\\cellcolor{gobmxDorado!25}{\\textbf{${cell}}}`;
    
    // Por:
    return applyTableStyleToCell(`\\textbf{${cell}}`, rowIndex, colIndex, headerRowsCount, tableStyle);
*/

// ============================================================================
// ACTUALIZAR: generateLatex PARA RECIBIR tableStyleMap DEL FRONTEND
// ============================================================================

/**
 * EN server/index.js, CAMBIAR:
 * 
 * app.post('/generate-latext', async (req, res) => {
 *   try {
 *     const { spreadsheetId, docId, token } = req.body;
 *     ...
 *     const result = await generateLatex(spreadsheetId, docId, token);
 * 
 * POR:
 */
/*
app.post('/generate-latext', async (req, res) => {
  try {
    const { spreadsheetId, docId, token, tableStyleMap } = req.body;
    
    if (!spreadsheetId || !docId || !token) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Generating LaTeX for doc ${docId} with ${Object.keys(tableStyleMap || {}).length} table styles...`);
    const result = await generateLatex(spreadsheetId, docId, token, tableStyleMap || {});

    res.json({
      success: true,
      tex: result.tex,
      bib: result.bib,
      filename: result.filename
    });

  } catch (error) {
    console.error('Error generating LaTeX:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});
*/

// ============================================================================
// ACTUALIZAR: exports EN latexGenerator.js
// ============================================================================

/**
 * CAMBIAR:
 * module.exports = { generateLatex, generarTabla, procesarTextoFuente, formatearNotasYFuente };
 * 
 * POR:
 */
/*
module.exports = {
  generateLatex,
  generarTabla,
  procesarTextoFuente,
  formatearNotasYFuente,
  // Agregar las nuevas utilidades para que estén disponibles
  hexToLatexColor,
  applyTableStyleToCell,
  getRowColorCommand
};
*/

// ============================================================================
// DESDE EL FRONTEND (App.tsx)
// ============================================================================

/**
 * Cuando se genera el LaTeX, pasar los estilos de tabla:
 * 
 * const response = await fetch(`${API_URL}/generate-latext`, {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     spreadsheetId: spreadsheet.spreadsheetId,
 *     docId: selectedDocId,
 *     token: token,
 *     tableStyleMap: tableStyleMap  // <-- AGREGAR ESTO
 *   })
 * });
 */

console.log('✅ Ver guía de actualización arriba para integrar estilos de tabla');
