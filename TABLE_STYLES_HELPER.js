// ============================================================================
// TABLE STYLING UTILITIES FOR LATEX GENERATION
// ============================================================================

/**
 * Convert hex color to LaTeX color name or xcolor spec
 * Supports custom SENER colors and hex values
 */
function hexToLatexColor(hexColor) {
    if (!hexColor) return 'white';
    
    const hex = hexColor.toLowerCase().replace('#', '');
    const colorMap = {
        'd4a574': 'gobmxDorado',        // SENER Gold
        '8b4513': 'brown',              // SENER Brown
        'ffffff': 'white',
        'f5f5dc': 'xcolor[HTML]{F5F5DC}',  // Beige
        'fffacd': 'xcolor[HTML]{FFFACD}',  // Light yellow
        'ffe4e1': 'xcolor[HTML]{FFE4E1}',  // Misty rose
        'e6f3ff': 'xcolor[HTML]{E6F3FF}',  // Light blue
        'f0fff0': 'xcolor[HTML]{F0FFF0}',  // Honeydew
        'f5f5f5': 'gray!10',
        '000000': 'black'
    };
    
    return colorMap[hex] || `xcolor[HTML]{${hex.toUpperCase()}}`;
}

/**
 * Apply cell background color command
 */
function applyCellColor(content, bgColor, textColor) {
    if (!bgColor && !textColor) return content;
    
    let result = content;
    
    if (bgColor) {
        const bg = hexToLatexColor(bgColor);
        result = `\\cellcolor{${bg}}{${result}}`;
    }
    
    if (textColor) {
        const fg = hexToLatexColor(textColor);
        result = `\\textcolor{${fg}}{${result}}`;
    }
    
    return result;
}

/**
 * Get row background color based on striping and row index
 */
function getRowBackgroundColor(rowIndex, headerRowCount, tableStyle) {
    if (rowIndex < headerRowCount) {
        // Header row
        if (tableStyle?.headerStyle?.backgroundColor) {
            return hexToLatexColor(tableStyle.headerStyle.backgroundColor);
        }
        return 'gobmxDorado';  // Default header color
    }
    
    // Data rows - apply striping if enabled
    if (tableStyle?.stripingEnabled && tableStyle?.alternateRowColor) {
        const dataRowIndex = rowIndex - headerRowCount;
        if (dataRowIndex % 2 === 1) {
            return hexToLatexColor(tableStyle.alternateRowColor);
        }
    }
    
    // Check if there's a column-specific color
    return null;
}

/**
 * Apply table styles to a cell's content
 */
function applyTableStyleToCell(cellContent, rowIndex, colIndex, headerRowCount, tableStyle) {
    if (!tableStyle) return cellContent;
    
    let result = cellContent;
    
    // Check for individual cell style
    const cellKey = `${rowIndex},${colIndex}`;
    const cellStyle = tableStyle.cellStyles?.[cellKey];
    
    if (cellStyle) {
        result = applyCellColor(result, cellStyle.backgroundColor, cellStyle.textColor);
        if (cellStyle.isBold) result = `\\textbf{${result}}`;
        if (cellStyle.isItalic) result = `\\textit{${result}}`;
    }
    
    return result;
}

/**
 * Get LaTeX rowcolor command for a specific row
 */
function getRowColorCommand(rowIndex, headerRowCount, colCount, tableStyle) {
    if (!tableStyle) return '';
    
    if (rowIndex < headerRowCount) {
        const headerBg = tableStyle.headerStyle?.backgroundColor;
        const color = hexToLatexColor(headerBg || '#D4A574');
        return `\\rowcolor{${color}}`;
    }
    
    if (tableStyle.stripingEnabled && tableStyle.alternateRowColor) {
        const dataRowIndex = rowIndex - headerRowCount;
        if (dataRowIndex % 2 === 1) {
            const altColor = hexToLatexColor(tableStyle.alternateRowColor);
            return `\\rowcolor{${altColor}}`;
        }
    }
    
    return '';
}

module.exports = {
    hexToLatexColor,
    applyCellColor,
    getRowBackgroundColor,
    applyTableStyleToCell,
    getRowColorCommand
};
