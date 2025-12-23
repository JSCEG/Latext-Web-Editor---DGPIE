
export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    stats: {
        sectionsCount: number;
        figuresCount: number;
        tablesCount: number;
        orphanedFigures: number;
        orphanedTables: number;
    };
}

export interface ValidationError {
    type: 'ORPHANED_ELEMENT' | 'DUPLICATE_ID' | 'MISSING_FIELD' | 'INVALID_HIERARCHY';
    message: string;
    itemId: string;
    sheet: 'Secciones' | 'Figuras' | 'Tablas';
    details?: string;
}

export interface ValidationWarning {
    type: 'FORMAT_ISSUE' | 'EMPTY_SECTION' | 'POSSIBLE_ERROR';
    message: string;
    itemId: string;
    sheet: 'Secciones' | 'Figuras' | 'Tablas';
}

const NORMALIZE = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, '');

const FIND_COL = (headers: string[], candidates: string[]) => {
    return headers.findIndex(h => {
        const normHeader = NORMALIZE(h);
        return candidates.some(c => NORMALIZE(c) === normHeader);
    });
};

const SECCION_ID_VARIANTS = ['ID_Seccion', 'Seccion', 'SeccionOrden', 'ID Seccion', 'Sección', 'Seccion Orden', 'IDSeccion'];
const ORDEN_VARIANTS = ['Orden', 'OrdenTabla', 'Numero', 'Fig.', 'Figura', 'Fig', 'Número', 'OrdenFigura', 'Orden Figura', 'Orden_Figura'];
const TITLE_VARIANTS = ['Titulo', 'Título', 'Nombre', 'Caption', 'Descripcion'];
const DOC_ID_VARIANTS = ['DocumentoID', 'ID Documento', 'ID', 'DocID'];

export const validateStructure = (
    docId: string,
    secciones: { headers: string[], data: string[][] },
    figuras: { headers: string[], data: string[][] },
    tablas: { headers: string[], data: string[][] }
): ValidationResult => {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validSectionIds = new Set<string>();
    
    // 1. Process Sections
    const secIdIdx = FIND_COL(secciones.headers, SECCION_ID_VARIANTS); // usually 'Orden' for sections acting as ID
    const secOrdenIdx = FIND_COL(secciones.headers, ['Orden']); 
    const secDocIdx = FIND_COL(secciones.headers, DOC_ID_VARIANTS);
    const secNivelIdx = FIND_COL(secciones.headers, ['Nivel', 'Level']);
    const secContenidoIdx = FIND_COL(secciones.headers, ['Contenido', 'content', 'texto', 'cuerpo']);
    
    // Use 'Orden' as the ID for sections if SeccionOrden not present, or vice versa depending on schema
    // In latexGenerator.js, it uses 'Orden' to sort.
    // Usually SeccionOrden in figures refers to the 'Orden' of the section.
    
    let sectionsCount = 0;
    const referencedFigures = new Set<string>();
    const referencedTables = new Set<string>();
    
    secciones.data.forEach((row, idx) => {
        if (idx === 0) return; // Skip header
        
        // Filter by Doc ID if present
        if (secDocIdx !== -1 && row[secDocIdx] !== docId) return;
        
        const id = secOrdenIdx !== -1 ? row[secOrdenIdx] : '';
        const content = secContenidoIdx !== -1 ? (row[secContenidoIdx] || '') : '';

        // Scan content for references
        const figMatches = content.matchAll(/\[\[figura:(.+?)\]\]/g);
        for (const match of figMatches) {
            referencedFigures.add(match[1].trim());
        }

        const tabMatches = content.matchAll(/\[\[tabla:(.+?)\]\]/g);
        for (const match of tabMatches) {
            referencedTables.add(match[1].trim());
        }

        if (id) {
            if (validSectionIds.has(id)) {
                errors.push({
                    type: 'DUPLICATE_ID',
                    message: `ID de Sección duplicado: ${id}`,
                    itemId: id,
                    sheet: 'Secciones'
                });
            }
            validSectionIds.add(id);
            sectionsCount++;
        } else {
            warnings.push({
                type: 'POSSIBLE_ERROR',
                message: `Fila ${idx + 1} en Secciones no tiene Orden/ID definido.`,
                itemId: `Row ${idx + 1}`,
                sheet: 'Secciones'
            });
        }
    });

    // 2. Validate Figures
    const figSecIdx = FIND_COL(figuras.headers, SECCION_ID_VARIANTS);
    const figDocIdx = FIND_COL(figuras.headers, DOC_ID_VARIANTS);
    const figIdIdx = FIND_COL(figuras.headers, ['ID', 'Codigo', 'OrdenFigura']);
    const figTitleIdx = FIND_COL(figuras.headers, TITLE_VARIANTS);
    const figOrdenIdx = FIND_COL(figuras.headers, ORDEN_VARIANTS);
    
    let figuresCount = 0;
    let orphanedFigures = 0;

    figuras.data.forEach((row, idx) => {
        if (idx === 0) return;
        if (figDocIdx !== -1 && row[figDocIdx] !== docId) return;
        
        figuresCount++;
        // ID construction matches latexGenerator logic: "SEC_ORDEN-FIG_ORDEN" or just "FIG_ORDEN" ?
        // Actually the user references them by what? Usually the 'Orden' column in Figuras tab? 
        // Or is it [[figura:Title]]? 
        // Let's assume the user references them by the value in the 'Orden' or 'ID' column.
        // Based on previous code: `generarLabel(caption)` or explicit ID? 
        // In latexGenerator.js: `match = lineaTrim.match(/\[\[figura:(.+?)\]\]/)`. 
        // It seems the user puts whatever ID they want. 
        // Let's assume the ID column in Figuras is the key.
        
        const figOrden = figOrdenIdx !== -1 ? row[figOrdenIdx] : '';
        // If the user uses [[figura:1]] and the figure has Orden '1', that's the link.
        
        const figTitle = figTitleIdx !== -1 ? row[figTitleIdx] : 'Sin título';
        const linkedSecId = figSecIdx !== -1 ? row[figSecIdx] : '';
        const figIdDisplay = `Fig ${figOrden}`;

        if (!linkedSecId) {
             errors.push({
                type: 'ORPHANED_ELEMENT',
                message: `Figura "${figTitle}" no está asignada a ninguna sección.`,
                itemId: figIdDisplay,
                sheet: 'Figuras'
            });
            orphanedFigures++;
        } else if (!validSectionIds.has(linkedSecId)) {
            errors.push({
                type: 'ORPHANED_ELEMENT',
                message: `Figura "${figTitle}" apunta a una sección inexistente: ${linkedSecId}`,
                itemId: figIdDisplay,
                sheet: 'Figuras'
            });
            orphanedFigures++;
        } else {
             // Check if referenced
             // We try to match the "Orden" against the reference
             if (figOrden && !referencedFigures.has(figOrden)) {
                 warnings.push({
                     type: 'POSSIBLE_ERROR',
                     message: `Figura "${figTitle}" (Orden ${figOrden}) está asignada a la sección ${linkedSecId} pero NO está referenciada en su contenido (use [[figura:${figOrden}]]). No aparecerá en el PDF.`,
                     itemId: figIdDisplay,
                     sheet: 'Figuras'
                 });
             }
        }
    });

    // 3. Validate Tables
    const tabSecIdx = FIND_COL(tablas.headers, SECCION_ID_VARIANTS);
    const tabDocIdx = FIND_COL(tablas.headers, DOC_ID_VARIANTS);
    const tabIdIdx = FIND_COL(tablas.headers, ['ID', 'Codigo', 'OrdenTabla']);
    const tabTitleIdx = FIND_COL(tablas.headers, TITLE_VARIANTS);
    const tabOrdenIdx = FIND_COL(tablas.headers, ORDEN_VARIANTS);
    
    let tablesCount = 0;
    let orphanedTables = 0;

    tablas.data.forEach((row, idx) => {
        if (idx === 0) return;
        if (tabDocIdx !== -1 && row[tabDocIdx] !== docId) return;
        
        tablesCount++;
        const tabOrden = tabOrdenIdx !== -1 ? row[tabOrdenIdx] : '';
        const tabTitle = tabTitleIdx !== -1 ? row[tabTitleIdx] : 'Sin título';
        const linkedSecId = tabSecIdx !== -1 ? row[tabSecIdx] : '';
        const tabIdDisplay = `Tab ${tabOrden}`;

        if (!linkedSecId) {
             errors.push({
                type: 'ORPHANED_ELEMENT',
                message: `Tabla "${tabTitle}" no está asignada a ninguna sección.`,
                itemId: tabIdDisplay,
                sheet: 'Tablas'
            });
            orphanedTables++;
        } else if (!validSectionIds.has(linkedSecId)) {
            errors.push({
                type: 'ORPHANED_ELEMENT',
                message: `Tabla "${tabTitle}" apunta a una sección inexistente: ${linkedSecId}`,
                itemId: tabIdDisplay,
                sheet: 'Tablas'
            });
            orphanedTables++;
        } else {
             if (tabOrden && !referencedTables.has(tabOrden)) {
                 warnings.push({
                     type: 'POSSIBLE_ERROR',
                     message: `Tabla "${tabTitle}" (Orden ${tabOrden}) está asignada a la sección ${linkedSecId} pero NO está referenciada en su contenido (use [[tabla:${tabOrden}]]). No aparecerá en el PDF.`,
                     itemId: tabIdDisplay,
                     sheet: 'Tablas'
                 });
             }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        stats: {
            sectionsCount,
            figuresCount,
            tablesCount,
            orphanedFigures,
            orphanedTables
        }
    };
};
