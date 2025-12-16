import React, { useState, useEffect, useRef } from 'react';
import { Spreadsheet } from '../types';
import { updateCellValue, appendRow, deleteRow, deleteDimensionRange, fetchValues, updateValues, insertDimension, createNewTab } from '../services/sheetsService';
import { Button } from './Button';
import { Save, Info, List, Table, Image, Book, Type, FileText, ChevronLeft, Plus, Search, Trash2, Edit, X, Lightbulb, Menu, Copy, ChevronRight, Grid, RefreshCw, Check, Minus, AlertCircle, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { LintPanel } from './LintPanel';
import { applyInlineTag, insertBlockTag, lintTags, normalizeOnSave, TagIssue } from '../tagEngine';

interface SheetEditorProps {
    spreadsheet: Spreadsheet;
    token: string;
    initialDocId?: string;
    onRefresh: () => void;
    onBack: () => void;
}

// Helper to map UI tab IDs to probable Sheet Titles
const TAB_TO_SHEET_TITLE: Record<string, string> = {
    'metadatos': 'Documentos',
    'secciones': 'Secciones',
    'tablas': 'Tablas',
    'figuras': 'Figuras',
    'bibliografia': 'Bibliografía',
    'siglas': 'Siglas',
    'glosario': 'Glosario'
};

const TAB_DESCRIPTIONS: Record<string, string> = {
    'tablas': 'Gestión de Tablas: Agrega, edita o elimina tablas del documento. Puedes editar los valores de la tabla directamente aquí abajo.',
    'figuras': 'Gestión de Figuras: Agrega, edita o elimina figuras del documento. Las imágenes deben estar en: img/graficos/.',
    'bibliografia': 'Gestión de Referencias Bibliográficas: Claves únicas para citar en LaTeX.',
    'siglas': 'Siglas y Acrónimos: Lista de abreviaturas utilizadas en el texto.',
    'glosario': 'Glosario de Términos: Definiciones de conceptos técnicos.',
    'secciones': 'Estructura del Documento: Capítulos, Secciones y Subsecciones.'
};

type ViewMode = 'LIST' | 'FORM';

type DocumentOption = {
    id: string;
    title: string;
    rowIndex: number; // 0-based index in metaSheet.data[0].rowData (0 is header)
};

// Helper to find column index with loose matching
const findColumnIndex = (headers: string[], candidates: string[]) => {
    return headers.findIndex(h => {
        const normHeader = h.trim().toLowerCase().replace(/_/g, '');
        return candidates.some(c => c.trim().toLowerCase().replace(/_/g, '') === normHeader);
    });
};

const CSV_COL_VARIANTS = ['Datos CSV', 'DatosCSV', 'Datos_CSV', 'Rango', 'Datos'];
// Updated to include specific variants from screenshot
const SECCION_COL_VARIANTS = ['ID_Seccion', 'Seccion', 'SeccionOrden', 'ID Seccion', 'Sección', 'Seccion Orden', 'IDSeccion'];
const ORDEN_COL_VARIANTS = ['Orden', 'OrdenTabla', 'Numero', 'Fig.', 'Figura', 'Fig', 'Número', 'OrdenFigura', 'Orden Figura', 'Orden_Figura'];
const DOC_ID_VARIANTS = ['DocumentoID', 'ID Documento', 'ID', 'DocID'];
const TITLE_VARIANTS = ['Titulo', 'Título', 'Nombre'];
const NIVEL_VARIANTS = ['Nivel', 'level'];
const CONTENIDO_VARIANTS = ['Contenido', 'content', 'texto', 'cuerpo'];
const CLAVE_VARIANTS = ['Clave', 'Key', 'ID'];

type SectionLevelOption = {
    value: string;
    label: string;
    help: string;
};

const SECTION_LEVEL_OPTIONS: SectionLevelOption[] = [
    { value: 'seccion', label: 'Sección', help: 'Crea un título principal (LaTeX: \\section). En anexos se renderiza como “Anexo A…”.' },
    { value: 'subseccion', label: 'Subsección', help: 'Título nivel 2 (LaTeX: \\subsection). En anexos: A.1, A.2…' },
    { value: 'subsubseccion', label: 'Subsubsección', help: 'Título nivel 3 (LaTeX: \\subsubsection).' },
    { value: 'parrafo', label: 'Párrafo', help: 'Título corto (LaTeX: \\paragraph). Útil para subtítulos dentro de una sección.' },
    { value: 'subparrafo', label: 'Subpárrafo', help: 'Título aún más pequeño (LaTeX: \\subparagraph). Nota: el GAS actual no lo genera; si lo eliges, se guardará como texto.' },
    { value: 'anexo', label: 'Anexo', help: 'Inicia modo anexos (GAS inserta \\anexos una vez) y crea la sección como anexo (A, B, C…).' },
    { value: 'subanexo', label: 'Subanexo', help: 'Subsección dentro de anexos (A.1, A.2…).' },
    { value: 'portada', label: 'Portada de sección', help: 'Genera una portada visual previa a una sección (GAS: \\portadaseccion).' },
    { value: 'directorio', label: 'Directorio', help: 'Contenido especial para la página de créditos/directorio (GAS: \\paginacreditos).' },
    { value: 'contraportada', label: 'Contraportada / Datos finales', help: 'Contenido especial de contraportada (GAS: \\contraportada).' },
];

const normalizeLevelValue = (value: string) =>
    (value ?? '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ');

// --- Helper Functions for Range Math ---
const columnLetterToIndex = (letter: string) => {
    let column = 0;
    const length = letter.length;
    for (let i = 0; i < length; i++) {
        column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return column - 1; // 0-based
};

const indexToColumnLetter = (index: number) => {
    let temp, letter = '';
    while (index >= 0) {
        temp = (index) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        index = Math.floor((index) / 26) - 1;
    }
    return letter;
};

// Helper: Ensure sheet name is quoted if it has spaces
const quoteSheetName = (name: string) => {
    const cleanName = name.replace(/^'|'$/g, '');
    if (cleanName.includes(' ') || cleanName.includes('(') || cleanName.includes(')')) {
        return `'${cleanName}'`;
    }
    return cleanName;
};

// Helper to normalize sheet names for comparison (ignores case, spaces, underscores, quotes)
const normalizeSheetName = (name: string) => name.trim().toLowerCase().replace(/['"_\s]/g, '');

// Robust Helper to sanitize and format range string
const sanitizeRangeString = (range: string): string => {
    if (!range) return '';
    let clean = range.trim();

    // Remove quotes wrapping the ENTIRE string if they exist (e.g. "'Sheet!A1'")
    if ((clean.startsWith("'") && clean.endsWith("'")) || (clean.startsWith('"') && clean.endsWith('"'))) {
        if (clean.includes('!')) {
            const lastBang = clean.lastIndexOf('!');
            if (lastBang !== -1 && lastBang < clean.length - 2) {
                clean = clean.slice(1, -1);
            }
        }
    }

    const lastBangIndex = clean.lastIndexOf('!');
    if (lastBangIndex === -1) return clean;

    let sheet = clean.substring(0, lastBangIndex);
    let cells = clean.substring(lastBangIndex + 1);

    // Normalize Sheet Name
    let rawSheet = sheet.replace(/^'|'$/g, '');

    // Normalize Cells (remove any stray quotes)
    let rawCells = cells.replace(/['"]/g, '');

    const finalSheet = quoteSheetName(rawSheet);

    return `${finalSheet}!${rawCells}`;
};

// Helper to parse range string
const parseRange = (rangeStr: string) => {
    if (!rangeStr || !rangeStr.includes('!')) return null;

    // Use the sanitize logic to split correctly first
    const cleanRange = sanitizeRangeString(rangeStr);
    const lastBangIndex = cleanRange.lastIndexOf('!');

    const sheetPart = cleanRange.substring(0, lastBangIndex);
    const rangeRef = cleanRange.substring(lastBangIndex + 1);

    // Remove quotes for the object representation
    const sheetName = sheetPart.replace(/^'|'$/g, '');

    const [start, end] = rangeRef.split(':');

    if (!start || !end) return null;

    const startMatch = start.match(/([A-Z]+)([0-9]+)/);
    const endMatch = end.match(/([A-Z]+)([0-9]+)/);

    if (!startMatch || !endMatch) return null;

    return {
        sheetName,
        startCol: columnLetterToIndex(startMatch[1]),
        startRow: parseInt(startMatch[2]),
        endCol: columnLetterToIndex(endMatch[1]),
        endRow: parseInt(endMatch[2])
    };
};

export const SheetEditor: React.FC<SheetEditorProps> = ({ spreadsheet, token, initialDocId, onRefresh, onBack }) => {
    const [activeTab, setActiveTab] = useState('metadatos');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentDocId, setCurrentDocId] = useState<string>('');
    const [currentDocRowIndex, setCurrentDocRowIndex] = useState<number>(1);
    const [availableDocs, setAvailableDocs] = useState<DocumentOption[]>([]);
    const initialSelectionAppliedForSpreadsheet = useRef<string | null>(null);

    // Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');

    // Data State
    const [gridData, setGridData] = useState<string[][]>([]);
    const [gridHeaders, setGridHeaders] = useState<string[]>([]);
    const [formData, setFormData] = useState<string[]>([]); // For Metadata or Single Item Edit
    const [formHeaders, setFormHeaders] = useState<string[]>([]);
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);

    // Relationship Data State (For dropdowns/validation)
    const [availableSections, setAvailableSections] = useState<{ id: string, title: string }[]>([]);

    // Secciones editor enhancements
    const sectionContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [sectionLintIssues, setSectionLintIssues] = useState<TagIssue[]>([]);
    const [availableBibliographyKeys, setAvailableBibliographyKeys] = useState<string[]>([]);
    const [availableFigureIds, setAvailableFigureIds] = useState<string[]>([]);
    const [availableTableIds, setAvailableTableIds] = useState<string[]>([]);
    const [equationModal, setEquationModal] = useState<{ open: boolean; mode: 'math' | 'ecuacion'; title: string; value: string }>(
        { open: false, mode: 'math', title: 'Insertar ecuación', value: '' }
    );

    // Nested Grid Editor State (for Table Content inside Form)
    const [nestedGridData, setNestedGridData] = useState<string[][]>([]);
    const [nestedGridRange, setNestedGridRange] = useState<string>('');
    const [originalNestedGridRange, setOriginalNestedGridRange] = useState<string>('');
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);

    // UI Overlays State
    const [showTableWizard, setShowTableWizard] = useState(false);
    const [wizardConfig, setWizardConfig] = useState({ rows: 5, cols: 4 });
    const [calculatingRange, setCalculatingRange] = useState(false);

    // Confirm Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, rowIndex: number | null }>({
        isOpen: false,
        rowIndex: null
    });

    // Notification State (Replaces native alerts)
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // UI State
    const [saving, setSaving] = useState(false);
    const [loadingGrid, setLoadingGrid] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Auto-dismiss notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message, type });
    };

    // --- Helpers ---
    const getMetadataSheet = () => {
        const targetTitle = 'Documentos';
        return spreadsheet.sheets.find(s =>
            s.properties.title.toLowerCase() === targetTitle.toLowerCase() ||
            s.properties.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === targetTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        ) || spreadsheet.sheets[0];
    }

    const getActiveSheet = () => {
        const targetTitle = TAB_TO_SHEET_TITLE[activeTab] || 'Documentos';
        let sheet = spreadsheet.sheets.find(s =>
            s.properties.title.toLowerCase() === targetTitle.toLowerCase() ||
            s.properties.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() === targetTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
        );
        if (!sheet && activeTab === 'metadatos') {
            sheet = spreadsheet.sheets[0];
        }
        return sheet;
    };

    const getStorageSheet = () => {
        return spreadsheet.sheets.find(s =>
            s.properties.title === 'Datos_Tablas' ||
            s.properties.title === 'Datos Tablas'
        );
    };

    const activeSheet = getActiveSheet();

    // --- Initialization Effects ---
    useEffect(() => {
        const metaSheet = getMetadataSheet();
        const rowData = metaSheet?.data?.[0]?.rowData;
        if (!rowData || rowData.length < 2) {
            setAvailableDocs([]);
            setCurrentDocId('');
            setCurrentDocRowIndex(1);
            return;
        }

        const headers = rowData[0]?.values?.map(c => c.userEnteredValue?.stringValue || c.formattedValue || '') || [];
        const idColIndex = headers.findIndex(h => h === 'ID' || h === 'DocumentoID') ?? 0;
        const titleColIndex = findColumnIndex(headers, TITLE_VARIANTS);

        const docs: DocumentOption[] = [];
        rowData.slice(1).forEach((row, idx) => {
            const absoluteRowIndex = idx + 1; // because we sliced off the header
            const id = row.values?.[idColIndex]?.userEnteredValue?.stringValue || row.values?.[idColIndex]?.formattedValue || '';
            if (!id) return;
            const title = titleColIndex !== -1
                ? (row.values?.[titleColIndex]?.userEnteredValue?.stringValue || row.values?.[titleColIndex]?.formattedValue || '')
                : '';
            docs.push({ id, title, rowIndex: absoluteRowIndex });
        });

        setAvailableDocs(docs);

        const canApplyInitial = Boolean(initialDocId) && initialSelectionAppliedForSpreadsheet.current !== spreadsheet.spreadsheetId;
        const preferredId = canApplyInitial ? initialDocId! : currentDocId;

        // Keep current selection if it still exists; otherwise pick preferred/first.
        const selected = docs.find(d => d.id === preferredId) || docs.find(d => d.id === currentDocId) || docs[0];
        if (selected) {
            if (selected.id !== currentDocId) setCurrentDocId(selected.id);
            if (selected.rowIndex !== currentDocRowIndex) setCurrentDocRowIndex(selected.rowIndex);
            if (canApplyInitial && selected.id === initialDocId) {
                initialSelectionAppliedForSpreadsheet.current = spreadsheet.spreadsheetId;
            }
        }
    }, [spreadsheet, initialDocId]);

    useEffect(() => {
        setViewMode('LIST');
        setSearchTerm('');
        setCurrentPage(1);
        setFocusedCell(null);

        // Load Relationship Data for Tablas AND Figuras
        if ((activeTab === 'tablas' || activeTab === 'figuras') && currentDocId) {
            const loadSections = () => {
                const seccionesSheet = spreadsheet.sheets.find(s =>
                    s.properties.title === 'Secciones' ||
                    s.properties.title.toLowerCase().trim() === 'secciones'
                );

                if (seccionesSheet && seccionesSheet.data && seccionesSheet.data[0]?.rowData) {
                    const headers = seccionesSheet.data[0].rowData[0]?.values?.map(c => c.userEnteredValue?.stringValue || c.formattedValue || '') || [];
                    const docIdIdx = findColumnIndex(headers, DOC_ID_VARIANTS);
                    const idSecVariants = [...SECCION_COL_VARIANTS, 'Orden', 'Nivel', 'Clave'];
                    const idSecIdx = findColumnIndex(headers, idSecVariants);
                    const titleIdx = findColumnIndex(headers, TITLE_VARIANTS);

                    if (docIdIdx !== -1 && idSecIdx !== -1) {
                        const validSections: { id: string, title: string }[] = [];
                        seccionesSheet.data[0].rowData.slice(1).forEach(row => {
                            const dId = row.values?.[docIdIdx]?.userEnteredValue?.stringValue || row.values?.[docIdIdx]?.formattedValue;
                            if (dId === currentDocId) {
                                const secId = row.values?.[idSecIdx]?.userEnteredValue?.stringValue || row.values?.[idSecIdx]?.formattedValue || '';
                                const secTitle = row.values?.[titleIdx]?.userEnteredValue?.stringValue || row.values?.[titleIdx]?.formattedValue || '';
                                validSections.push({ id: secId, title: secTitle });
                            }
                        });
                        setAvailableSections(validSections);
                    }
                }
            };
            loadSections();
        }

        if (activeTab === 'metadatos') {
            if (!activeSheet) return;
            const headers = activeSheet.data?.[0]?.rowData?.[0]?.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || '') || [];
            const rowIdx = currentDocRowIndex || 1;
            const targetRow = activeSheet.data?.[0]?.rowData?.[rowIdx];
            const values = targetRow?.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || '') || [];
            setFormHeaders(headers);
            setFormData(values.length ? values : new Array(headers.length).fill(''));
            setViewMode('FORM');
        } else {
            if (!activeSheet) {
                setGridData([]);
                setGridHeaders([]);
                return;
            }
            const rawData: string[][] = [];
            if (activeSheet.data && activeSheet.data[0]?.rowData) {
                activeSheet.data[0].rowData.forEach((row) => {
                    const rowValues = row.values?.map(cell =>
                        cell.formattedValue ||
                        cell.userEnteredValue?.stringValue ||
                        (cell.userEnteredValue?.numberValue !== undefined ? String(cell.userEnteredValue.numberValue) : '') ||
                        ''
                    ) || [];
                    rawData.push(rowValues);
                });
            }
            if (rawData.length === 0) rawData.push([]);

            const headers = rawData[0];
            setGridHeaders(headers);

            const body = rawData.slice(1).map(row => {
                const newRow = [...row];
                while (newRow.length < headers.length) newRow.push('');
                return newRow;
            });

            if (currentDocId) {
                const docIdIndex = findColumnIndex(headers, DOC_ID_VARIANTS);
                if (docIdIndex !== -1) {
                    setGridData(body.filter(row => row[docIdIndex] === currentDocId));
                } else {
                    setGridData(body);
                }
            } else {
                setGridData(body);
            }
        }
    }, [activeTab, spreadsheet, currentDocId]);

    // Load IDs/keys for Secciones selectors (citas/figuras/tablas)
    useEffect(() => {
        if (activeTab !== 'secciones' || !currentDocId) {
            setAvailableBibliographyKeys([]);
            setAvailableFigureIds([]);
            setAvailableTableIds([]);
            return;
        }

        const norm = (s: string) => (s ?? '').toString().trim();
        const uniqueSorted = (arr: string[]) => Array.from(new Set(arr.map(norm).filter(Boolean))).sort((a, b) => a.localeCompare(b));

        const findSheetByTitle = (title: string) =>
            spreadsheet.sheets.find(s => normalizeSheetName(s.properties.title) === normalizeSheetName(title));

        const extractColumnValuesByDoc = (sheetTitle: string, columnCandidates: string[]) => {
            const sheet = findSheetByTitle(sheetTitle);
            const rowData = sheet?.data?.[0]?.rowData;
            if (!rowData || rowData.length < 2) return [] as string[];

            const headers = rowData[0]?.values?.map(c => c.userEnteredValue?.stringValue || c.formattedValue || '') || [];
            const docIdx = findColumnIndex(headers, DOC_ID_VARIANTS);
            const colIdx = findColumnIndex(headers, columnCandidates);
            if (docIdx === -1 || colIdx === -1) return [] as string[];

            const out: string[] = [];
            rowData.slice(1).forEach(r => {
                const dId = r.values?.[docIdx]?.userEnteredValue?.stringValue || r.values?.[docIdx]?.formattedValue || '';
                if (dId !== currentDocId) return;
                const v = r.values?.[colIdx]?.userEnteredValue?.stringValue || r.values?.[colIdx]?.formattedValue || '';
                if (v) out.push(v);
            });
            return out;
        };

        const bibKeys = extractColumnValuesByDoc('Bibliografía', CLAVE_VARIANTS);
        const figIds = extractColumnValuesByDoc('Figuras', ['ID', 'FiguraID', 'IDFigura', ...ORDEN_COL_VARIANTS]);
        const tabIds = extractColumnValuesByDoc('Tablas', ['ID', 'TablaID', 'IDTabla', ...ORDEN_COL_VARIANTS]);

        setAvailableBibliographyKeys(uniqueSorted(bibKeys));
        setAvailableFigureIds(uniqueSorted(figIds));
        setAvailableTableIds(uniqueSorted(tabIds));
    }, [activeTab, spreadsheet, currentDocId]);

    // --- Logic to Calculate Next Order ---
    const calculateNextOrder = (sectionId: string) => {
        // Allow for both Tablas and Figuras
        if (!sectionId || (activeTab !== 'tablas' && activeTab !== 'figuras')) return '1';

        const secColIdx = findColumnIndex(gridHeaders, SECCION_COL_VARIANTS);
        const ordColIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);

        if (secColIdx === -1 || ordColIdx === -1) return '1';

        let maxOrder = 0;
        gridData.forEach(row => {
            if (row[secColIdx] === sectionId) {
                const valStr = row[ordColIdx];
                // Handle potentially mixed types (e.g., "1", "1.0", or even "2.1" if user broke convention)
                // We try to extract the integer part if possible
                const ordVal = parseInt(valStr);
                if (!isNaN(ordVal) && ordVal > maxOrder) {
                    maxOrder = ordVal;
                }
            }
        });
        return String(maxOrder + 1);
    };

    const isOrderDuplicate = (sectionId: string, orderVal: string, ignoreRowIndex: number | null) => {
        const secColIdx = findColumnIndex(gridHeaders, SECCION_COL_VARIANTS);
        const ordColIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
        if (secColIdx === -1 || ordColIdx === -1) return false;

        return gridData.some((row, idx) => {
            if (ignoreRowIndex !== null && gridData[ignoreRowIndex] === row) return false;
            return row[secColIdx] === sectionId && row[ordColIdx] === orderVal;
        });
    };

    // --- Internal Logic to fetch nested grid ---
    const loadNestedGrid = async (range: string) => {
        const correctedRange = sanitizeRangeString(range);

        if (!correctedRange || !correctedRange.includes('!')) {
            setNestedGridData([['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]);
            setNestedGridRange(correctedRange);
            return;
        }

        const parsed = parseRange(correctedRange);
        if (!parsed) return;

        const sheetExists = spreadsheet.sheets.some(s => s.properties.title === parsed.sheetName);
        if (!sheetExists) {
            const rows = parsed.endRow - parsed.startRow + 1;
            const cols = parsed.endCol - parsed.startCol + 1;
            const emptyGrid = Array.from({ length: rows }, () => Array(cols).fill(''));
            setNestedGridData(emptyGrid);
            setNestedGridRange(correctedRange);
            setOriginalNestedGridRange(correctedRange);
            return;
        }

        setLoadingGrid(true);
        setNestedGridRange(correctedRange);
        setOriginalNestedGridRange(correctedRange);
        setFocusedCell(null);

        try {
            const values = await fetchValues(spreadsheet.spreadsheetId, correctedRange, token);
            if (values && values.length > 0) {
                setNestedGridData(values);
            } else {
                setNestedGridData([['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]);
            }
        } catch (e) {
            console.error("Error cargando grid:", e);
            setNestedGridData([['Error al cargar datos. Verifique el rango.']]);
        } finally {
            setLoadingGrid(false);
        }
    };

    const updateRangeString = (newData: string[][]) => {
        const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
        let currentRange = csvIndex !== -1 ? formData[csvIndex] : nestedGridRange;

        if (!currentRange || !currentRange.includes('!')) return;
        currentRange = sanitizeRangeString(currentRange);

        try {
            const lastBang = currentRange.lastIndexOf('!');
            const sheetPart = currentRange.substring(0, lastBang);
            const rangeRef = currentRange.substring(lastBang + 1);

            const [startRef] = rangeRef.split(':');
            const match = startRef.match(/([A-Z]+)([0-9]+)/);
            if (!match) return;

            const startColStr = match[1];
            const startRowStr = match[2];
            const startRow = parseInt(startRowStr);
            const startColIdx = columnLetterToIndex(startColStr);

            const numRows = newData.length;
            const numCols = newData[0]?.length || 1;

            const endRow = startRow + numRows - 1;
            const endColIdx = startColIdx + numCols - 1;
            const endColStr = indexToColumnLetter(endColIdx);

            const newRange = `${sheetPart}!${startColStr}${startRow}:${endColStr}${endRow}`;
            setNestedGridRange(newRange);

            if (csvIndex !== -1) {
                const newFormData = [...formData];
                newFormData[csvIndex] = newRange;
                setFormData(newFormData);
            }
        } catch (e) {
            console.error("Error recalculating range", e);
        }
    };

    const calculateNextAvailableRange = async (rows: number, cols: number): Promise<string> => {
        setCalculatingRange(true);
        try {
            const storageSheet = getStorageSheet();
            const sheetName = storageSheet ? storageSheet.properties.title : 'Datos_Tablas';
            const finalSheetName = quoteSheetName(sheetName);

            if (!storageSheet) {
                const endColLetter = indexToColumnLetter(cols - 1);
                return `${finalSheetName}!A1:${endColLetter}${rows}`;
            }

            const colData = await fetchValues(spreadsheet.spreadsheetId, `${finalSheetName}!A:A`, token);
            let lastRowIndex = 0;
            if (colData && colData.length > 0) {
                lastRowIndex = colData.length;
            }

            const startRow = lastRowIndex + 3;
            const endRow = startRow + rows - 1;
            const endColLetter = indexToColumnLetter(cols - 1); // 0-based index

            return `${finalSheetName}!A${startRow}:${endColLetter}${endRow}`;
        } catch (e) {
            console.error(e);
            const randomStart = 100 + Math.floor(Math.random() * 50);
            return `Datos_Tablas!A${randomStart}:E${randomStart + rows}`;
        } finally {
            setCalculatingRange(false);
        }
    };

    // --- Actions ---

    const handlePreCreate = () => {
        if (activeTab === 'tablas') {
            if (availableSections.length === 0) {
                showNotification("No se encontraron Secciones. Crea una sección primero.", 'error');
                return;
            }
            setWizardConfig({ rows: 5, cols: 4 });
            setShowTableWizard(true);
        } else if (activeTab === 'figuras') {
            // Check sections for figures too
            if (availableSections.length === 0) {
                showNotification("No se encontraron Secciones. Crea una sección primero.", 'error');
                return;
            }
            handleCreate([]);
        } else {
            handleCreate([]);
        }
    };

    const handleWizardConfirm = async () => {
        const newRange = await calculateNextAvailableRange(wizardConfig.rows, wizardConfig.cols);
        const initData: string[][] = Array(wizardConfig.rows).fill('').map((_, r) =>
            Array(wizardConfig.cols).fill('').map((__, c) =>
                r === 0 ? 'Encabezado' : ''
            )
        );
        initData[0][0] = 'Concepto';
        handleCreate(initData, newRange);
        setShowTableWizard(false);
    };

    const handleCreate = (initialGridData: string[][] = [], initialRangeStr: string = '') => {
        setEditingRowIndex(null);
        const newRow = new Array(gridHeaders.length).fill('');

        const docIdIndex = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
        if (docIdIndex !== -1) newRow[docIdIndex] = currentDocId;

        if (initialRangeStr) {
            const csvIndex = findColumnIndex(gridHeaders, CSV_COL_VARIANTS);
            if (csvIndex !== -1) {
                newRow[csvIndex] = initialRangeStr;
            }
        }

        setFormData(newRow);
        setFormHeaders(gridHeaders);
        setNestedGridRange(initialRangeStr);
        setOriginalNestedGridRange(initialRangeStr);

        if (initialGridData.length > 0) {
            setNestedGridData(initialGridData);
        } else {
            setNestedGridData([['Concepto', '2023', '2024', '2025', 'Notas'], ['', '', '', '', ''], ['', '', '', '', '']]);
        }

        setViewMode('FORM');
    };

    const handleEdit = (rowIndex: number) => {
        setEditingRowIndex(rowIndex);
        const currentRow = [...gridData[rowIndex]];
        setFormData(currentRow);
        setFormHeaders(gridHeaders);

        if (activeTab === 'tablas') {
            const csvIndex = findColumnIndex(gridHeaders, CSV_COL_VARIANTS);
            if (csvIndex !== -1) {
                const r = currentRow[csvIndex];
                setOriginalNestedGridRange(r);
                loadNestedGrid(r);
            } else {
                setNestedGridData([['Concepto', 'Col1', 'Col2'], ['', '', '']]);
            }
        }

        setViewMode('FORM');
    };

    // Trigger Modal
    const requestDelete = (rowIndex: number) => {
        setDeleteModal({ isOpen: true, rowIndex });
    };

    // Actual Execute Delete Logic (called by Modal)
    const executeDelete = async () => {
        const rowIndex = deleteModal.rowIndex;
        if (rowIndex === null) return;
        if (!activeSheet) return;

        setSaving(true);

        try {
            if (activeTab === 'tablas') {
                try {
                    const csvIndex = findColumnIndex(gridHeaders, CSV_COL_VARIANTS);
                    const rowData = gridData[rowIndex];
                    const rangeStr = rowData[csvIndex];

                    if (rangeStr) {
                        const cleanRangeStr = sanitizeRangeString(rangeStr);
                        const parsedRange = parseRange(cleanRangeStr);

                        if (parsedRange) {
                            const storageSheet = spreadsheet.sheets.find(s =>
                                normalizeSheetName(s.properties.title) === normalizeSheetName(parsedRange.sheetName)
                            );

                            if (storageSheet) {
                                const rowsToDelete = parsedRange.endRow - parsedRange.startRow + 1;
                                const deleteStartIndex = Math.max(0, parsedRange.startRow - 1);
                                console.log(`Borrando filas anidadas: ${deleteStartIndex}, Count: ${rowsToDelete}`);

                                await deleteDimensionRange(
                                    spreadsheet.spreadsheetId,
                                    storageSheet.properties.sheetId,
                                    deleteStartIndex,
                                    rowsToDelete,
                                    'ROWS',
                                    token
                                );

                                // Update references below
                                const updates: Promise<any>[] = [];
                                gridData.forEach((row, idx) => {
                                    if (idx === rowIndex) return;
                                    const otherRangeStr = row[csvIndex];
                                    if (!otherRangeStr) return;

                                    const cleanOther = sanitizeRangeString(otherRangeStr);
                                    const otherRange = parseRange(cleanOther);

                                    if (otherRange &&
                                        normalizeSheetName(otherRange.sheetName) === normalizeSheetName(parsedRange.sheetName) &&
                                        otherRange.startRow > parsedRange.endRow) {

                                        const newStart = otherRange.startRow - rowsToDelete;
                                        const newEnd = otherRange.endRow - rowsToDelete;
                                        const sCol = indexToColumnLetter(otherRange.startCol);
                                        const eCol = indexToColumnLetter(otherRange.endCol);
                                        const finalSheetName = quoteSheetName(otherRange.sheetName);
                                        const newRangeStr = `${finalSheetName}!${sCol}${newStart}:${eCol}${newEnd}`;

                                        updates.push(updateCellValue(
                                            spreadsheet.spreadsheetId,
                                            activeSheet.properties.title,
                                            { row: idx + 1, col: csvIndex, value: newRangeStr },
                                            token
                                        ));
                                    }
                                });

                                if (updates.length > 0) await Promise.all(updates);
                            }
                        }
                    }
                } catch (nestedError) {
                    console.error("Error NO CRÍTICO eliminando anidados:", nestedError);
                }
            }

            console.log(`Borrando fila principal en ${activeTab}: ${rowIndex + 1}`);
            await deleteRow(
                spreadsheet.spreadsheetId,
                activeSheet.properties.sheetId,
                rowIndex + 1,
                token
            );

            showNotification("Registro eliminado correctamente.", "success");
            onRefresh();
            // Close modal on success
            setDeleteModal({ isOpen: false, rowIndex: null });

        } catch (e) {
            console.error("Error CRÍTICO al eliminar:", e);
            showNotification("Error al eliminar el registro. Intenta de nuevo.", "error");
        } finally {
            setSaving(false);
        }
    };

    const handleSaveForm = async () => {
        if (!activeSheet) return;

        // Secciones: lint + normalize before save, and block save on errors
        if (activeTab === 'secciones') {
            const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
            if (contentIdx !== -1) {
                const raw = (formData[contentIdx] || '').toString();
                const normalized = normalizeOnSave(raw);
                const issues = lintTags(normalized, {
                    bibliographyKeys: availableBibliographyKeys,
                    figureIds: availableFigureIds,
                    tableIds: availableTableIds,
                });
                setSectionLintIssues(issues);

                const errors = issues.filter(i => i.type === 'error');
                if (errors.length > 0) {
                    showNotification(`Hay ${errors.length} error(es) en etiquetas. Corrige antes de guardar.`, 'error');
                    return;
                }

                // Apply normalization to the value that will be saved
                if (normalized !== raw) {
                    const next = [...formData];
                    next[contentIdx] = normalized;
                    setFormData(next);
                }
            }
        }

        // Validate Section and Order logic for both Tablas AND Figuras
        if (activeTab === 'tablas' || activeTab === 'figuras') {
            const secColIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
            const ordColIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
            if (secColIdx !== -1 && ordColIdx !== -1) {
                const section = formData[secColIdx];
                const order = formData[ordColIdx];
                const orderNum = parseInt(order);

                if (isNaN(orderNum) || orderNum < 1) {
                    showNotification("El Orden/Número debe ser mayor a 0.", "error");
                    return;
                }

                if (isOrderDuplicate(section, order, editingRowIndex)) {
                    showNotification(`El Número ${order} ya existe en la sección ${section}.`, "error");
                    return;
                }
                if (!section) {
                    showNotification("Selecciona una Sección.", "error");
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const sheetTitle = activeSheet.properties.title;

            if (activeTab === 'metadatos') {
                const updates = [];
                for (let i = 0; i < formData.length; i++) {
                    updates.push(updateCellValue(spreadsheet.spreadsheetId, sheetTitle, { row: currentDocRowIndex || 1, col: i, value: formData[i] }, token));
                }
                await Promise.all(updates);
                showNotification("Metadatos guardados.", "success");
            } else {
                const finalFormData = [...formData];
                if (activeTab === 'tablas') {
                    const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
                    if (csvIndex !== -1 && nestedGridRange) {
                        finalFormData[csvIndex] = nestedGridRange;
                    }
                }

                if (activeTab === 'secciones') {
                    const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
                    if (contentIdx !== -1) {
                        finalFormData[contentIdx] = normalizeOnSave((finalFormData[contentIdx] || '').toString());
                    }
                }

                if (editingRowIndex === null) {
                    await appendRow(spreadsheet.spreadsheetId, sheetTitle, finalFormData, token);
                } else {
                    const startRow = editingRowIndex + 2;
                    const endColLetter = indexToColumnLetter(finalFormData.length - 1);
                    const updateRange = `${sheetTitle}!A${startRow}:${endColLetter}${startRow}`;
                    await updateValues(spreadsheet.spreadsheetId, updateRange, [finalFormData], token);
                }

                if (activeTab === 'tablas') {
                    const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
                    let targetRange = finalFormData[csvIndex] || nestedGridRange;

                    if (targetRange && targetRange.includes('!')) {
                        targetRange = sanitizeRangeString(targetRange);
                        const parsedTarget = parseRange(targetRange);

                        if (parsedTarget) {
                            const targetSheetExists = spreadsheet.sheets.some(s => s.properties.title === parsedTarget.sheetName);
                            if (!targetSheetExists) {
                                try {
                                    await createNewTab(spreadsheet.spreadsheetId, parsedTarget.sheetName, token);
                                } catch (e) { console.error(e); }
                            }
                        }

                        if (originalNestedGridRange) {
                            const cleanOldRangeStr = sanitizeRangeString(originalNestedGridRange);
                            const oldRange = parseRange(cleanOldRangeStr);
                            const newRange = parseRange(targetRange);

                            if (oldRange && newRange && oldRange.sheetName === newRange.sheetName) {
                                const nestedSheet = spreadsheet.sheets.find(s => s.properties.title === newRange.sheetName);
                                if (nestedSheet) {
                                    const rowsDiff = (newRange.endRow - newRange.startRow) - (oldRange.endRow - oldRange.startRow);
                                    const colsDiff = (newRange.endCol - newRange.startCol) - (oldRange.endCol - oldRange.startCol);

                                    if (rowsDiff !== 0) {
                                        if (rowsDiff > 0) {
                                            await insertDimension(spreadsheet.spreadsheetId, nestedSheet.properties.sheetId, oldRange.endRow, rowsDiff, 'ROWS', token);
                                        } else {
                                            const rowsToDelete = Math.abs(rowsDiff);
                                            await deleteDimensionRange(spreadsheet.spreadsheetId, nestedSheet.properties.sheetId, newRange.endRow, rowsToDelete, 'ROWS', token);
                                        }

                                        const updatesToShift: Promise<any>[] = [];
                                        gridData.forEach((row, idx) => {
                                            if (idx === editingRowIndex) return;
                                            const otherRangeStr = row[csvIndex];
                                            if (!otherRangeStr) return;
                                            const cleanOtherRangeStr = sanitizeRangeString(otherRangeStr);
                                            const otherRange = parseRange(cleanOtherRangeStr);

                                            if (otherRange &&
                                                otherRange.sheetName === oldRange.sheetName &&
                                                otherRange.startRow >= oldRange.endRow) {

                                                const newStart = otherRange.startRow + rowsDiff;
                                                const newEnd = otherRange.endRow + rowsDiff;
                                                const sCol = indexToColumnLetter(otherRange.startCol);
                                                const eCol = indexToColumnLetter(otherRange.endCol);
                                                const finalSheetPart = quoteSheetName(otherRange.sheetName);
                                                const newRangeStr = `${finalSheetPart}!${sCol}${newStart}:${eCol}${newEnd}`;

                                                updatesToShift.push(updateCellValue(spreadsheet.spreadsheetId, activeSheet.properties.title, { row: idx + 1, col: csvIndex, value: newRangeStr }, token));
                                            }
                                        });
                                        if (updatesToShift.length > 0) await Promise.all(updatesToShift);
                                    }

                                    if (colsDiff < 0) {
                                        const colsToDelete = Math.abs(colsDiff);
                                        const startClearColIdx = newRange.endCol + 1;
                                        const endClearColIdx = oldRange.endCol;
                                        const sColChar = indexToColumnLetter(startClearColIdx);
                                        const eColChar = indexToColumnLetter(endClearColIdx);
                                        const sheetRef = quoteSheetName(nestedSheet.properties.title);
                                        const clearRangeStr = `${sheetRef}!${sColChar}${newRange.startRow}:${eColChar}${newRange.endRow}`;
                                        const numRows = newRange.endRow - newRange.startRow + 1;
                                        const emptyValues = Array(numRows).fill(Array(colsToDelete).fill(''));
                                        await updateValues(spreadsheet.spreadsheetId, clearRangeStr, emptyValues, token);
                                    }
                                }
                            }
                        }
                        await updateValues(spreadsheet.spreadsheetId, targetRange, nestedGridData, token);
                    }
                }

                showNotification("Guardado correctamente.", "success");
                onRefresh();
                setViewMode('LIST');
            }
        } catch (e) {
            console.error(e);
            showNotification("Error al guardar los cambios.", "error");
        } finally {
            setSaving(false);
        }
    };

    const addGridRow = () => {
        const cols = nestedGridData[0]?.length || 5;
        const newData = [...nestedGridData, new Array(cols).fill('')];
        setNestedGridData(newData);
        updateRangeString(newData);
    };
    const addGridCol = () => {
        const newData = nestedGridData.map(row => [...row, '']);
        setNestedGridData(newData);
        updateRangeString(newData);
    };
    const deleteGridRow = () => {
        if (nestedGridData.length <= 1) return;
        const newData = [...nestedGridData];
        newData.pop();
        setNestedGridData(newData);
        updateRangeString(newData);
    };
    const deleteGridCol = () => {
        if (!nestedGridData[0] || nestedGridData[0].length <= 1) return;
        const newData = nestedGridData.map(row => {
            const newRow = [...row];
            newRow.pop();
            return newRow;
        });
        setNestedGridData(newData);
        updateRangeString(newData);
    };

    const filteredData = gridData.map((row, index) => ({ row, index })).filter(({ row }) =>
        row.some(cell => cell.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const displayedRows = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-hidden whitespace-nowrap">
            <button onClick={onBack} className="hover:text-[#691C32] transition-colors">Inicio</button>
            <ChevronRight size={14} className="mx-2 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate max-w-[150px]">{spreadsheet.properties.title}</span>
            <ChevronRight size={14} className="mx-2 flex-shrink-0" />
            <button
                onClick={() => { if (activeTab !== 'metadatos') setViewMode('LIST'); }}
                className={clsx("hover:text-[#691C32] transition-colors capitalize", viewMode === 'LIST' && activeTab !== 'metadatos' ? "font-bold text-[#691C32]" : "")}
            >
                {activeTab}
            </button>
            {viewMode === 'FORM' && (
                <>
                    <ChevronRight size={14} className="mx-2 flex-shrink-0" />
                    <span className="font-bold text-[#691C32]">
                        {activeTab === 'metadatos' ? 'Edición' : (editingRowIndex !== null ? 'Editar' : 'Nuevo')}
                    </span>
                </>
            )}
        </nav>
    );

    // Helper for Modal Text based on Tab
    const getDeleteContext = () => {
        switch (activeTab) {
            case 'tablas': return {
                title: "¿Eliminar tabla?",
                text: "Esta acción eliminará la tabla de la lista principal y también borrará sus datos internos de la hoja de cálculo. No se puede deshacer."
            };
            case 'bibliografia': return {
                title: "¿Eliminar referencia?",
                text: "Esta acción eliminará permanentemente la referencia bibliográfica del documento."
            };
            case 'siglas': return {
                title: "¿Eliminar sigla?",
                text: "Esta acción eliminará la sigla y su definición del catálogo del documento."
            };
            case 'glosario': return {
                title: "¿Eliminar término?",
                text: "Esta acción eliminará el término y su definición del glosario."
            };
            default: return {
                title: "¿Eliminar registro?",
                text: "Esta acción eliminará el registro de la lista principal. Esta acción no se puede deshacer."
            };
        }
    };

    const deleteContext = getDeleteContext();

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F5] relative">

            {/* Notification Banner */}
            {notification && (
                <div className={clsx(
                    "fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 animate-in fade-in slide-in-from-top-2",
                    notification.type === 'success' ? "bg-[#13322B] text-white" :
                        notification.type === 'error' ? "bg-red-600 text-white" : "bg-blue-600 text-white"
                )}>
                    {notification.type === 'success' ? <Check size={18} /> :
                        notification.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
                    {notification.message}
                    <button onClick={() => setNotification(null)} className="ml-2 opacity-80 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="text-red-600" size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">{deleteContext.title}</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                {deleteContext.text}
                            </p>
                            <div className="flex w-full gap-3">
                                <Button variant="ghost" className="flex-1" onClick={() => setDeleteModal({ isOpen: false, rowIndex: null })}>
                                    Cancelar
                                </Button>
                                <Button variant="danger" className="flex-1" onClick={executeDelete} isLoading={saving}>
                                    Eliminar
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Wizard Modal */}
            {showTableWizard && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in zoom-in duration-200">
                        <h3 className="text-lg font-bold text-[#691C32] mb-2">Nueva Tabla</h3>
                        <p className="text-sm text-gray-600 mb-4">Define el tamaño inicial. El sistema buscará un espacio vacío en la hoja de datos.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Filas</label>
                                <input
                                    type="number"
                                    min="2" max="100"
                                    value={wizardConfig.rows}
                                    onChange={(e) => setWizardConfig({ ...wizardConfig, rows: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#691C32]"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Columnas</label>
                                <input
                                    type="number"
                                    min="2" max="26"
                                    value={wizardConfig.cols}
                                    onChange={(e) => setWizardConfig({ ...wizardConfig, cols: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#691C32]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="ghost" onClick={() => setShowTableWizard(false)}>Cancelar</Button>
                            <Button variant="burgundy" onClick={handleWizardConfirm} isLoading={calculatingRange}>
                                Crear y Asignar Rango
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
                <div className="flex items-center gap-3">
                    <button className="md:hidden text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        <Menu size={24} />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold text-[#691C32] capitalize leading-tight">
                            {activeTab === 'metadatos' ? 'Editor de Documento' : activeTab}
                        </h1>
                        {availableDocs.length > 0 ? (
                            <select
                                className="text-xs text-gray-600 font-mono bg-transparent border border-gray-200 rounded px-2 py-1 mt-1 max-w-[260px]"
                                value={currentDocId}
                                onChange={(e) => {
                                    const nextId = e.target.value;
                                    const selected = availableDocs.find(d => d.id === nextId);
                                    setCurrentDocId(nextId);
                                    if (selected) setCurrentDocRowIndex(selected.rowIndex);
                                }}
                                title="Seleccionar DocumentoID"
                            >
                                {availableDocs.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.id}{d.title ? ` - ${d.title}` : ''}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <span className="text-xs text-gray-400 font-mono">{currentDocId}</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={onBack} className="hidden md:flex">
                        Salir
                    </Button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">

                {/* Sidebar */}
                <div className={clsx(
                    "absolute inset-y-0 left-0 bg-white border-r border-gray-200 flex flex-col py-4 shadow-lg z-30 transition-transform duration-300 md:relative md:translate-x-0 w-64",
                    mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <nav className="space-y-1 px-2">
                        <button onClick={() => { setActiveTab('metadatos'); setMobileMenuOpen(false); }} className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md", activeTab === 'metadatos' ? "bg-red-50 text-[#691C32]" : "text-gray-600 hover:bg-gray-50")}>
                            <Info size={18} /> Metadatos
                        </button>
                        <div className="my-2 border-t border-gray-100"></div>
                        {[
                            { id: 'secciones', icon: List, label: 'Secciones' },
                            { id: 'tablas', icon: Table, label: 'Tablas' },
                            { id: 'figuras', icon: Image, label: 'Figuras' },
                            { id: 'bibliografia', icon: Book, label: 'Bibliografía' },
                            { id: 'siglas', icon: Type, label: 'Siglas' },
                            { id: 'glosario', icon: FileText, label: 'Glosario' }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setViewMode('LIST'); setMobileMenuOpen(false); }}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md", activeTab === item.id ? "bg-red-50 text-[#691C32]" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <item.icon size={18} /> {item.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">

                        <Breadcrumbs />

                        {/* --- LIST VIEW --- */}
                        {viewMode === 'LIST' && activeTab !== 'metadatos' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
                                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">{TAB_DESCRIPTIONS[activeTab]}</p>
                                    </div>
                                    <Button onClick={handlePreCreate}>
                                        <Plus size={16} className="mr-2" /> Nuevo Elemento
                                    </Button>
                                </div>

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex gap-4">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#691C32] bg-white text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left w-24">Acciones</th>
                                                    {gridHeaders.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {displayedRows.length > 0 ? displayedRows.map(({ row, index }) => (
                                                    <tr key={index} className={clsx("hover:bg-gray-50", saving && "opacity-50 pointer-events-none")}>
                                                        <td className="px-6 py-4 text-left">
                                                            <div className="flex justify-start gap-2">
                                                                <button onClick={() => handleEdit(index)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                                                                <button onClick={() => requestDelete(index)} className="text-red-600 hover:text-red-800"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                        {row.map((cell, i) => <td key={i} className="px-6 py-4 truncate max-w-xs text-gray-700">{cell}</td>)}
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={gridHeaders.length + 1} className="px-6 py-12 text-center text-gray-500">No hay registros.</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- FORM VIEW (Unified) --- */}
                        {viewMode === 'FORM' && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">

                                {/* Main Form Card */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                                        <h2 className="text-xl font-bold text-[#691C32]">
                                            {activeTab === 'metadatos' ? 'Editar Metadatos' : (editingRowIndex === null ? 'Nuevo Registro' : 'Editar Registro')}
                                        </h2>
                                        <Button variant="ghost" onClick={() => activeTab !== 'metadatos' && setViewMode('LIST')}>
                                            Cancelar
                                        </Button>
                                    </div>

                                    <div className={clsx(
                                        "grid gap-6 max-w-4xl",
                                        (activeTab === 'tablas' || activeTab === 'figuras') ? "grid-cols-2" : "grid-cols-1"
                                    )}>
                                        {formHeaders.map((header, i) => {
                                            const isReadOnly = header === 'DocumentoID' || header === 'ID Documento' || header === 'ID' || DOC_ID_VARIANTS.includes(header);
                                            const isCsvRange = CSV_COL_VARIANTS.includes(header);
                                            const isSeccion = SECCION_COL_VARIANTS.includes(header);
                                            const isOrden = ORDEN_COL_VARIANTS.includes(header);
                                            const isNivel = activeTab === 'secciones' && findColumnIndex([header], NIVEL_VARIANTS) !== -1;
                                            const isContenido = activeTab === 'secciones' && findColumnIndex([header], CONTENIDO_VARIANTS) !== -1;
                                            const colSpan = ((activeTab === 'tablas' || activeTab === 'figuras') && !isSeccion && !isOrden) ? "col-span-2" : "col-span-1";

                                            if (activeTab === 'secciones' && isNivel) {
                                                const current = normalizeLevelValue(formData[i] || '');
                                                const selected = SECTION_LEVEL_OPTIONS.find(o => o.value === current) || SECTION_LEVEL_OPTIONS[0];

                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <select
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32] bg-white text-gray-900"
                                                            value={selected?.value}
                                                            onChange={(e) => {
                                                                const newData = [...formData];
                                                                newData[i] = e.target.value;
                                                                setFormData(newData);
                                                            }}
                                                        >
                                                            {SECTION_LEVEL_OPTIONS.map(opt => (
                                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                            ))}
                                                        </select>
                                                        <p className="text-xs text-gray-500">{selected?.help}</p>
                                                    </div>
                                                );
                                            }

                                            if (activeTab === 'secciones' && isContenido) {
                                                const currentValue = (formData[i] || '').toString();
                                                const issues = sectionLintIssues;
                                                const errorCount = issues.filter(x => x.type === 'error').length;
                                                const warningCount = issues.filter(x => x.type === 'warning').length;

                                                const applyEdit = (res: { text: string; selectionStart: number; selectionEnd: number }) => {
                                                    const newData = [...formData];
                                                    newData[i] = res.text;
                                                    setFormData(newData);
                                                    requestAnimationFrame(() => {
                                                        const el = sectionContentTextareaRef.current;
                                                        if (!el) return;
                                                        el.focus();
                                                        el.setSelectionRange(res.selectionStart, res.selectionEnd);
                                                    });
                                                };

                                                const lintNow = (nextText: string) => {
                                                    const nextIssues = lintTags(nextText, {
                                                        bibliographyKeys: availableBibliographyKeys,
                                                        figureIds: availableFigureIds,
                                                        tableIds: availableTableIds,
                                                    });
                                                    setSectionLintIssues(nextIssues);
                                                };

                                                const wrapInline = (name: string, opts?: { value?: string; placeholder?: string }) => {
                                                    const el = sectionContentTextareaRef.current;
                                                    const selStart = el ? el.selectionStart : 0;
                                                    const selEnd = el ? el.selectionEnd : 0;
                                                    const res = applyInlineTag(currentValue, selStart, selEnd, name, opts);
                                                    applyEdit(res);
                                                    lintNow(res.text);
                                                };

                                                const insertBlock = (name: string, title?: string) => {
                                                    const el = sectionContentTextareaRef.current;
                                                    const pos = el ? el.selectionStart : currentValue.length;
                                                    const res = insertBlockTag(currentValue, pos, name, title);
                                                    applyEdit(res);
                                                    lintNow(res.text);
                                                };

                                                return (
                                                    <div key={i} className={colSpan + " space-y-4"}>
                                                        <div className="flex items-start justify-between gap-4">
                                                            <div className="space-y-1">
                                                                <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                                <p className="text-xs text-gray-500">
                                                                    Editor estilo “Word”: usa la barra para insertar etiquetas con formato. Validación en vivo (errores bloquean guardar).
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[11px]">
                                                                <span className={clsx(
                                                                    'inline-flex items-center gap-1 rounded-full px-2 py-1 border',
                                                                    errorCount ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                                )}>
                                                                    <AlertCircle size={12} /> {errorCount ? `${errorCount} error(es)` : 'Sin errores'}
                                                                </span>
                                                                <span className={clsx(
                                                                    'inline-flex items-center gap-1 rounded-full px-2 py-1 border',
                                                                    warningCount ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                                                                )}>
                                                                    <AlertTriangle size={12} /> {warningCount}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Ribbon */}
                                                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                                            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
                                                                <span className="text-xs font-semibold text-gray-700">Insertar</span>
                                                                <span className="text-[11px] text-gray-500">(envuelve selección o inserta plantilla)</span>
                                                            </div>
                                                            <div className="p-3 flex flex-col gap-3">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => wrapInline('nota', { placeholder: 'Nota...' })}>
                                                                        <FileText size={14} className="mr-2" /> Nota
                                                                    </Button>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => wrapInline('dorado', { placeholder: 'Texto...' })}>
                                                                        <Type size={14} className="mr-2" /> Dorado
                                                                    </Button>
                                                                    <Button type="button" variant="outline" size="sm" onClick={() => wrapInline('guinda', { placeholder: 'Texto...' })}>
                                                                        <Type size={14} className="mr-2" /> Guinda
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            const el = sectionContentTextareaRef.current;
                                                                            const sel = el ? currentValue.slice(el.selectionStart, el.selectionEnd) : '';
                                                                            setEquationModal({ open: true, mode: 'math', title: 'Insertar math inline ([[math:...]])', value: sel || '' });
                                                                        }}
                                                                    >
                                                                        <Grid size={14} className="mr-2" /> Math
                                                                    </Button>

                                                                    <div className="w-px h-6 bg-gray-300 mx-1" />

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                                                                            <Book size={12} /> Cita
                                                                        </div>
                                                                        <select
                                                                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                if (!v) return;
                                                                                wrapInline('cita', { value: v });
                                                                                e.currentTarget.value = '';
                                                                            }}
                                                                            title="Insertar cita"
                                                                        >
                                                                            <option value="">Selecciona…</option>
                                                                            {availableBibliographyKeys.map(k => (
                                                                                <option key={k} value={k}>{k}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                                                                            <Image size={12} /> Figura
                                                                        </div>
                                                                        <select
                                                                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                if (!v) return;
                                                                                wrapInline('figura', { value: v });
                                                                                e.currentTarget.value = '';
                                                                            }}
                                                                            title="Insertar referencia a figura"
                                                                        >
                                                                            <option value="">Selecciona…</option>
                                                                            {availableFigureIds.map(k => (
                                                                                <option key={k} value={k}>{k}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>

                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                                                                            <Table size={12} /> Tabla
                                                                        </div>
                                                                        <select
                                                                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900"
                                                                            value=""
                                                                            onChange={(e) => {
                                                                                const v = e.target.value;
                                                                                if (!v) return;
                                                                                wrapInline('tabla', { value: v });
                                                                                e.currentTarget.value = '';
                                                                            }}
                                                                            title="Insertar referencia a tabla"
                                                                        >
                                                                            <option value="">Selecciona…</option>
                                                                            {availableTableIds.map(k => (
                                                                                <option key={k} value={k}>{k}</option>
                                                                            ))}
                                                                        </select>
                                                                    </div>

                                                                    <div className="w-px h-6 bg-gray-300 mx-1" />

                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                                                                            <Grid size={12} /> Bloques
                                                                        </div>
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock('caja', 'Título opcional')}>
                                                                            <Grid size={14} className="mr-2" /> Caja
                                                                        </Button>
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock('alerta', 'Título')}>
                                                                            <AlertTriangle size={14} className="mr-2" /> Alerta
                                                                        </Button>
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock('info', 'Título')}>
                                                                            <Info size={14} className="mr-2" /> Info
                                                                        </Button>
                                                                        <Button type="button" variant="ghost" size="sm" onClick={() => insertBlock('destacado')}>
                                                                            <Lightbulb size={14} className="mr-2" /> Destacado
                                                                        </Button>
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                const el = sectionContentTextareaRef.current;
                                                                                const sel = el ? currentValue.slice(el.selectionStart, el.selectionEnd) : '';
                                                                                setEquationModal({ open: true, mode: 'ecuacion', title: 'Insertar ecuación display ([[ecuacion:...]] multi-línea)', value: sel || '' });
                                                                            }}
                                                                        >
                                                                            <Grid size={14} className="mr-2" /> Ecuación
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Word-like page */}
                                                        <div className="bg-[#F5F5F5] border border-gray-200 rounded-lg p-4">
                                                            <div className="mx-auto bg-white border border-gray-200 shadow-sm rounded-sm max-w-[860px]">
                                                                <div className="px-10 py-10">
                                                                    <textarea
                                                                        ref={sectionContentTextareaRef}
                                                                        className={clsx(
                                                                            'w-full min-h-[520px] resize-y text-sm leading-relaxed focus:outline-none bg-transparent text-gray-900',
                                                                            errorCount > 0 ? 'outline outline-1 outline-red-300' : 'outline outline-1 outline-transparent'
                                                                        )}
                                                                        value={currentValue}
                                                                        onChange={(e) => {
                                                                            const newData = [...formData];
                                                                            newData[i] = e.target.value;
                                                                            setFormData(newData);
                                                                            lintNow(e.target.value);
                                                                        }}
                                                                        placeholder="Escribe el contenido aquí…"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <LintPanel
                                                            issues={issues}
                                                            onSelectRange={(from, to) => {
                                                                const el = sectionContentTextareaRef.current;
                                                                if (!el) return;
                                                                el.focus();
                                                                el.setSelectionRange(from, to);
                                                            }}
                                                        />
                                                    </div>
                                                );
                                            }

                                            if ((activeTab === 'tablas' || activeTab === 'figuras') && isSeccion) {
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <select
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32] bg-white text-gray-900"
                                                            value={formData[i]?.toString().trim() || ''}
                                                            onChange={(e) => {
                                                                const newSec = e.target.value;
                                                                const newData = [...formData];
                                                                newData[i] = newSec;
                                                                if (newSec) {
                                                                    const ordIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
                                                                    if (ordIdx !== -1) {
                                                                        newData[ordIdx] = calculateNextOrder(newSec);
                                                                    }
                                                                }
                                                                setFormData(newData);
                                                            }}
                                                        >
                                                            <option value="">Selecciona Sección...</option>
                                                            {availableSections.map(sec => (
                                                                <option key={sec.id} value={sec.id}>{sec.id} - {sec.title.substring(0, 30)}...</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                );
                                            }

                                            if ((activeTab === 'tablas' || activeTab === 'figuras') && isOrden) {
                                                const secColIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
                                                const ordColIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
                                                const currentSectionId = secColIdx !== -1 ? formData[secColIdx] : '';
                                                const usedOrders = new Set<string>();
                                                let maxOrder = 0;
                                                gridData.forEach((row, idx) => {
                                                    if (secColIdx !== -1 && ordColIdx !== -1 && row[secColIdx] === currentSectionId && idx !== editingRowIndex) {
                                                        const val = row[ordColIdx];
                                                        if (val) {
                                                            usedOrders.add(val);
                                                            const numVal = parseInt(val);
                                                            if (!isNaN(numVal)) maxOrder = Math.max(maxOrder, numVal);
                                                        }
                                                    }
                                                });
                                                const currentValue = formData[i] || '';
                                                const availableOptions = [];
                                                const limit = Math.max(maxOrder + 5, 5);
                                                for (let k = 1; k <= limit; k++) {
                                                    const kStr = String(k);
                                                    if (!usedOrders.has(kStr) || kStr === currentValue) availableOptions.push(kStr);
                                                }
                                                if (currentValue && !availableOptions.includes(currentValue) && parseInt(currentValue) > 0) {
                                                    availableOptions.push(currentValue);
                                                    availableOptions.sort((a, b) => parseInt(a) - parseInt(b));
                                                }

                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <div className="relative">
                                                            <select
                                                                disabled={!currentSectionId}
                                                                className={clsx("w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32] bg-white text-gray-900", !currentSectionId && "bg-gray-100 text-gray-500 cursor-not-allowed")}
                                                                value={formData[i] || ''}
                                                                onChange={(e) => {
                                                                    const newData = [...formData];
                                                                    newData[i] = e.target.value;
                                                                    setFormData(newData);
                                                                }}
                                                            >
                                                                <option value="">Selecciona Orden...</option>
                                                                {availableOptions.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                            {!currentSectionId && (
                                                                <p className="text-xs text-gray-500 mt-1">Selecciona una sección primero.</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            const isDisabled = isReadOnly || isCsvRange;

                                            return (
                                                <div key={i} className={colSpan + " space-y-1"}>
                                                    <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            disabled={isDisabled}
                                                            className={clsx("flex-1 px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32]", isDisabled ? "bg-gray-100 text-gray-500" : "bg-white text-gray-900 border-gray-300")}
                                                            value={formData[i] || ''}
                                                            onChange={(e) => {
                                                                const newData = [...formData];
                                                                newData[i] = e.target.value;
                                                                setFormData(newData);
                                                            }}
                                                        />
                                                        {isCsvRange && activeTab === 'tablas' && (
                                                            <Button variant="secondary" size="sm" onClick={() => loadNestedGrid(formData[i])} isLoading={loadingGrid} title="Recargar Grid">
                                                                <RefreshCw size={16} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                    {isCsvRange && (
                                                        <p className="text-xs text-gray-500">
                                                            {activeTab === 'tablas' ? "Este rango define dónde se guardarán los valores de la tabla inferior." : "Define el rango donde viven los datos."}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Equation Modal (Secciones) */}
                                {equationModal.open && activeTab === 'secciones' && (
                                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-[#691C32]">{equationModal.title}</h3>
                                                    <p className="text-xs text-gray-500">Se insertará como etiqueta bien formada en el texto.</p>
                                                </div>
                                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setEquationModal({ ...equationModal, open: false })}>
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <textarea
                                                className="w-full min-h-[180px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32] bg-white text-gray-900"
                                                value={equationModal.value}
                                                onChange={(e) => setEquationModal({ ...equationModal, value: e.target.value })}
                                                placeholder={equationModal.mode === 'math' ? 'a^2 + b^2 = c^2' : 'Escribe la ecuación (puede ser multi-línea)…'}
                                            />

                                            <div className="flex justify-end gap-3 mt-4">
                                                <Button variant="ghost" onClick={() => setEquationModal({ ...equationModal, open: false })}>Cancelar</Button>
                                                <Button
                                                    variant="burgundy"
                                                    onClick={() => {
                                                        const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
                                                        if (contentIdx === -1) {
                                                            setEquationModal({ ...equationModal, open: false });
                                                            return;
                                                        }

                                                        const el = sectionContentTextareaRef.current;
                                                        const selStart = el ? el.selectionStart : 0;
                                                        const selEnd = el ? el.selectionEnd : 0;
                                                        const currentValue = (formData[contentIdx] || '').toString();
                                                        const tagName = equationModal.mode === 'math' ? 'math' : 'ecuacion';
                                                        const payload = equationModal.value || '...';

                                                        const res = applyInlineTag(currentValue, selStart, selEnd, tagName, { value: payload, placeholder: '...' });
                                                        const newData = [...formData];
                                                        newData[contentIdx] = res.text;
                                                        setFormData(newData);
                                                        setEquationModal({ ...equationModal, open: false });

                                                        const nextIssues = lintTags(res.text, {
                                                            bibliographyKeys: availableBibliographyKeys,
                                                            figureIds: availableFigureIds,
                                                            tableIds: availableTableIds,
                                                        });
                                                        setSectionLintIssues(nextIssues);

                                                        requestAnimationFrame(() => {
                                                            const el2 = sectionContentTextareaRef.current;
                                                            if (!el2) return;
                                                            el2.focus();
                                                            el2.setSelectionRange(res.selectionStart, res.selectionEnd);
                                                        });
                                                    }}
                                                >
                                                    Insertar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Nested Grid Editor (Only for Tablas) */}
                                {activeTab === 'tablas' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <Table className="text-[#691C32]" size={20} />
                                                <h3 className="text-lg font-bold text-gray-900">Valores de la Tabla</h3>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={deleteGridRow} disabled={nestedGridData.length <= 1} title="Eliminar última fila">
                                                    <Minus size={14} className="mr-1" /> Fila
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={addGridRow} title="Añadir fila al final">
                                                    <Plus size={14} className="mr-1" /> Fila
                                                </Button>
                                                <div className="w-px bg-gray-300 mx-1"></div>
                                                <Button variant="ghost" size="sm" onClick={deleteGridCol} disabled={!nestedGridData[0] || nestedGridData[0].length <= 1} title="Eliminar última columna">
                                                    <Minus size={14} className="mr-1" /> Col
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={addGridCol} title="Añadir columna al final">
                                                    <Plus size={14} className="mr-1" /> Col
                                                </Button>
                                            </div>
                                        </div>

                                        {loadingGrid ? (
                                            <div className="h-32 flex items-center justify-center text-gray-400">Cargando datos...</div>
                                        ) : (
                                            <div className="overflow-x-auto border border-gray-300 rounded-md bg-gray-50">
                                                {nestedGridData && nestedGridData.length > 0 ? (
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {nestedGridData.map((row, rIndex) => (
                                                                <tr key={rIndex}>
                                                                    <td className={clsx("px-2 py-2 text-[10px] font-mono select-none w-8 text-center border-r border-gray-200 transition-colors duration-200", focusedCell?.r === rIndex ? "bg-[#691C32] text-white font-bold" : "bg-gray-50 text-gray-400")}>
                                                                        {rIndex + 1}
                                                                    </td>
                                                                    {row.map((cell, cIndex) => (
                                                                        <td key={cIndex} className="p-0 border-r border-gray-200 last:border-0 min-w-[120px]">
                                                                            <input
                                                                                onFocus={() => setFocusedCell({ r: rIndex, c: cIndex })}
                                                                                className={clsx("w-full h-full px-3 py-2 text-sm focus:outline-none border-none bg-transparent transition-colors duration-200 text-gray-900", rIndex === 0 ? (focusedCell?.c === cIndex ? "font-bold text-[#691C32] bg-red-50" : "font-bold text-gray-800 bg-gray-50") : "text-gray-900 focus:bg-blue-50", cIndex === 0 && rIndex !== 0 && "font-bold text-gray-900")}
                                                                                value={cell}
                                                                                placeholder={rIndex === 0 ? "Encabezado" : ""}
                                                                                onChange={(e) => {
                                                                                    const newData = [...nestedGridData];
                                                                                    newData[rIndex][cIndex] = e.target.value;
                                                                                    setNestedGridData(newData);
                                                                                }}
                                                                            />
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                                                        <p>La cuadrícula está vacía.</p>
                                                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setNestedGridData([['Encabezado', '', ''], ['', '', '']])}>
                                                            Inicializar Cuadrícula
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-400 italic mt-2">
                                            Estos datos se guardarán automáticamente en el rango {nestedGridRange} al guardar el formulario.
                                        </p>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-4">
                                    {activeTab !== 'metadatos' && (
                                        <Button variant="outline" onClick={() => setViewMode('LIST')}>Cancelar</Button>
                                    )}
                                    <Button variant="burgundy" onClick={handleSaveForm} isLoading={saving}>
                                        <Save size={16} className="mr-2" /> Guardar Todo
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};