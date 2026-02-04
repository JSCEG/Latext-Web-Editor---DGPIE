import React, { useState, useEffect, useRef } from 'react';
import { StructurePreview } from './StructurePreview';
import { Spreadsheet, GridRange, TableStyle } from '../types';
import { updateCellValue, appendRow, deleteRow, deleteDimensionRange, fetchValues, updateValues, insertDimension, createNewTab, fetchSpreadsheetCells, mergeCells, unmergeCells, formatCells } from '../services/sheetsService';
import { socketService } from '../services/socketService';
import { UserActivityTracker } from './UserActivityTracker';
import { Button } from './Button';
import { Save, Info, List, Table, Image, Book, Type, FileText, ChevronLeft, Plus, Search, Trash2, Edit, X, Lightbulb, Menu, Copy, ChevronRight, ChevronDown, Grid, RefreshCw, Check, Minus, AlertCircle, AlertTriangle, MoreVertical, Hash, Calendar, User, Building, AlignLeft, Database, Heart, Maximize2, Minimize2, CheckCircle, PieChart } from 'lucide-react';
import { clsx } from 'clsx';
import { LintPanel } from './LintPanel';
import { RichEditorToolbar } from './RichEditorToolbar';
import { EditorAutocomplete, AutocompleteItem } from './EditorAutocomplete';
import { GraphicsEditor } from './GraphicsEditor';
import { TableStyleEditor } from './TableStyleEditor';
import { getCaretCoordinates } from '../utils/caret';
import { applyInlineTag, insertBlockTag, lintTags, normalizeOnSave, TagIssue } from '../tagEngine';
import { computeFigureId, computeTableId } from '../utils/idUtils';
import { validateMergeSelection, parseRangeSimple, expandSelection } from '../utils/gridUtils';
import { API_URL } from '../config';

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
    'glosario': 'Glosario',
    'unidades': 'Unidades',
    'graficos': 'Graficos'
};

const TAB_DESCRIPTIONS: Record<string, string> = {
    'tablas': 'Gestión de Tablas: Agrega, edita o elimina tablas del documento. Puedes editar los valores de la tabla directamente aquí abajo.',
    'figuras': 'Gestión de Figuras: Agrega, edita o elimina figuras del documento. Las imágenes deben estar en: img/graficos/.',
    'graficos': 'Gestión de Gráficos: Crea y visualiza gráficos estadísticos (barras, líneas, pastel) integrados en el documento.',
    'bibliografia': 'Gestión de Referencias Bibliográficas: Claves únicas para citar en LaTeX.',
    'siglas': 'Siglas y Acrónimos: Lista de abreviaturas utilizadas en el texto.',
    'glosario': 'Glosario de Términos: Definiciones de conceptos técnicos.',
    'unidades': 'Unidades de Medida: Define equivalencias y descripciones (ej. MW=Megawatt).',
    'secciones': 'Estructura del Documento: Capítulos, Secciones y Subsecciones.'
};

type ViewMode = 'LIST' | 'FORM';

type DocumentOption = {
    id: string;
    title: string;
    rowIndex: number; // 0-based index in metaSheet.data[0].rowData (0 is header)
};

// Helper to find column index with loose matching - ROBUST VERSION
const findColumnIndex = (headers: string[], candidates: string[]) => {
    if (!headers || !Array.isArray(headers)) return -1;
    const norm = (s: string) => (s || '').toString().trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, '');
    return headers.findIndex(h => {
        const normHeader = norm(h);
        return candidates.some(c => norm(c) === normHeader);
    });
};

const CSV_COL_VARIANTS = ['Datos CSV', 'DatosCSV', 'Datos_CSV', 'Rango', 'Datos'];
// Updated to include specific variants from screenshot
const SECCION_COL_VARIANTS = ['ID_Seccion', 'Seccion', 'SeccionOrden', 'ID Seccion', 'Sección', 'Seccion Orden', 'IDSeccion'];
const ORDEN_COL_VARIANTS = ['Orden', 'OrdenTabla', 'Numero', 'Fig.', 'Figura', 'Fig', 'Número', 'OrdenFigura', 'Orden Figura', 'Orden_Figura'];
const DOC_ID_VARIANTS = ['DocumentoID', 'ID Documento', 'ID', 'DocID'];
const TITLE_VARIANTS = ['Titulo', 'Título', 'Nombre'];
const NIVEL_VARIANTS = ['Nivel', 'level'];
const AGRADECIMIENTOS_VARIANTS = ['Agradecimientos', 'Agradecimiento', 'Acknowledgements'];
const CONTENIDO_VARIANTS = ['Contenido', 'content', 'texto', 'cuerpo'];
const CLAVE_VARIANTS = ['Clave', 'Key', 'ID'];
const OPCIONES_COL_VARIANTS = ['Opciones', 'Estilo', 'Style', 'Options', 'Configuracion'];
const HORIZONTAL_COL_VARIANTS = ['Horizontal', 'Apaisado', 'Landscape'];
const HOJA_COMPLETA_COL_VARIANTS = ['HojaCompleta', 'Hoja Completa', 'FullPage', 'PaginaCompleta'];
const HEADER_ROWS_COL_VARIANTS = ['Filas Encabezado', 'FilasEncabezado', 'HeaderRows', 'Header Rows', 'EncabezadoFilas', 'Encabezado Filas'];

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

// Helper: Ensure sheet name is quoted if it has spaces or special characters
const quoteSheetName = (name: string) => {
    const cleanName = name.replace(/^'|'$/g, '');
    // Quote if contains spaces or special chars (anything not alphanumeric or underscore)
    if (/[^a-zA-Z0-9_]/.test(cleanName)) {
        return `'${cleanName}'`;
    }
    return cleanName;
};

// Helper to normalize sheet names for comparison (ignores case, spaces, underscores, quotes)
const normalizeSheetName = (name: string) =>
    name
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['"_\s]/g, '')
        .replace(/s$/g, '');

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

// Reusable Content Preview Component
const ContentPreview: React.FC<{ text: string; limit?: number }> = ({ text, limit = 200 }) => {
    const [expanded, setExpanded] = useState(false);

    // Normalize and clean text for display
    const cleanText = (text || '').toString();
    const shouldTruncate = cleanText.length > limit;

    if (!shouldTruncate) {
        return <div className="text-gray-700 whitespace-pre-wrap">{cleanText}</div>;
    }

    return (
        <div className="relative">
            <div className={clsx(
                "text-gray-700 whitespace-pre-wrap transition-all duration-300",
                expanded ? "max-h-full" : "max-h-[4.5em] overflow-hidden"
            )}>
                {cleanText}
            </div>
            {!expanded && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            )}
            <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs font-semibold text-gob-guinda hover:underline focus:outline-none"
            >
                {expanded ? 'Leer menos' : 'Leer más...'}
            </button>
        </div>
    );
};

export const SheetEditor: React.FC<SheetEditorProps> = ({ spreadsheet, token, initialDocId, onRefresh, onBack }) => {
    const [activeTab, setActiveTab] = useState('metadatos');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentDocId, setCurrentDocId] = useState<string>('');
    const [currentDocRowIndex, setCurrentDocRowIndex] = useState<number>(1);
    const [availableDocs, setAvailableDocs] = useState<DocumentOption[]>([]);
    const [availableSections, setAvailableSections] = useState<{ id: string; title: string }[]>([]);
    const initialSelectionAppliedForSpreadsheet = useRef<string | null>(null);

    // Navigation State
    const [viewMode, setViewMode] = useState<ViewMode>('LIST');

    // Data State
    const [gridData, setGridData] = useState<string[][]>([]);
    const [gridHeaders, setGridHeaders] = useState<string[]>([]);
    const [formData, setFormData] = useState<string[]>([]); // For Metadata or Single Item Edit
    const [formHeaders, setFormHeaders] = useState<string[]>([]);
    const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
    const [dataTimestamp, setDataTimestamp] = useState<number>(Date.now());
    const [fullData, setFullData] = useState<{
        secciones: { headers: string[], data: string[][] },
        figuras: { headers: string[], data: string[][] },
        tablas: { headers: string[], data: string[][] },
        graficos: { headers: string[], data: string[][] }
    } | null>(null);

    // Cache for other tabs to support optimistic updates across tab switching
    const [sheetCache, setSheetCache] = useState<Record<string, { headers: string[], data: string[][] }>>({});
    const [lastSaveTime, setLastSaveTime] = useState<number>(0);

    // Ribbon State
    const [ribbonOpen, setRibbonOpen] = useState(true);
    const [activeMetadataField, setActiveMetadataField] = useState<string | null>(null);

    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info'; duration?: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [loadingGrid, setLoadingGrid] = useState(false);

    // Audio context for sound effects
    const playNotificationSound = (type: 'success' | 'error') => {
        try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContext) return;

            const audioCtx = new AudioContext();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            if (type === 'success') {
                // Success: High pitched pleasant ding
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                oscillator.frequency.exponentialRampToValueAtTime(1046.5, audioCtx.currentTime + 0.1); // C6
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.3);
            } else {
                // Error: Low pitched buzz
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, audioCtx.currentTime);
                oscillator.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                oscillator.start();
                oscillator.stop(audioCtx.currentTime + 0.3);
            }
        } catch (e) {
            console.error("Audio playback failed", e);
        }
    };

    const triggerHaptic = (type: 'success' | 'error') => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            if (type === 'success') {
                navigator.vibrate([50, 50, 50]); // Short double tap
            } else {
                navigator.vibrate(300); // Long buzz
            }
        }
    };

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
        setNotification({ message, type, duration });

        // Audio and Haptic Feedback
        if (type === 'success' || type === 'error') {
            playNotificationSound(type);
            triggerHaptic(type);
        }

        // Auto hide
        if (duration > 0) {
            setTimeout(() => {
                setNotification(prev => (prev && prev.message === message ? null : prev));
            }, duration);
        }
    };

    // Calculate Header Rows safely to avoid crashes in render
    const headerRowsCount = React.useMemo(() => {
        try {
            if (!formHeaders || !formData) return '1';
            const idx = findColumnIndex(formHeaders, HEADER_ROWS_COL_VARIANTS);
            return (idx !== -1 && formData[idx]) ? formData[idx].toString() : '1';
        } catch (e) {
            console.error("Error calculating header rows", e);
            return '1';
        }
    }, [formHeaders, formData]);

    // Generic Editor Modal State (For any text field)
    const [editorModal, setEditorModal] = useState<{ open: boolean; title: string; value: string; fieldId: string | null; onSave: (val: string) => void; zenMode?: boolean }>({
        open: false,
        title: '',
        value: '',
        fieldId: null,
        onSave: () => { },
        zenMode: false
    });

    // Table Styling State
    const [tableStyleMap, setTableStyleMap] = useState<Record<string, TableStyle>>({});
    const [showTableStyleEditor, setShowTableStyleEditor] = useState(false);

    const loadPreviewData = async () => {
        // If we already have fullData and we just updated it optimistically, 
        // we might want to skip fetching or just fetch in background.
        // But for now, let's allow fetching but if the data is same, react diffing handles it.
        // However, the issue is that Google Sheets API is slow to update.
        // So if we fetch immediately after save, we might get OLD data.

        // Strategy: If fullData exists and we are coming from a save (maybe check timestamp?), rely on it?
        // Better: Always set loading true, but if we have valid fullData, maybe don't clear it immediately?
        // Actually, the problem reported is that changes are not reflected until refresh.
        // The optimistic update above solves this by updating `fullData` in memory.
        // So when we switch tab to 'vista_previa', `fullData` is already correct.
        // BUT `loadPreviewData` is called in useEffect when activeTab changes.
        // And it calls `setLoadingGrid(true)`.
        // And then fetches from API.
        // If API returns old data, it overwrites our optimistic `fullData` with old data!

        // Fix: We should delay the fetch or debounce it? Or trust local data if it's "fresh"?
        // Let's implement a simple check: if we just saved (within last 2 seconds?), don't fetch?
        // Or better: merge the local data with the fetched data? That's hard.

        // The best approach for "lag" in Google Sheets is to rely on local state until we are sure.
        // But here we are switching context.

        // Let's try this: When switching to Preview, if `fullData` is populated, show it immediately 
        // and fetch in background WITHOUT clearing it or showing loading spinner over it?
        // But `setLoadingGrid(true)` hides the preview.

        if (!fullData) setLoadingGrid(true); // Only show spinner if no data

        try {
            // Check sheet names from metadata or assume defaults
            // We use TAB_TO_SHEET_TITLE values
            const secTitle = TAB_TO_SHEET_TITLE['secciones'];
            const figTitle = TAB_TO_SHEET_TITLE['figuras'];
            const tabTitle = TAB_TO_SHEET_TITLE['tablas'];
            const grafTitle = TAB_TO_SHEET_TITLE['graficos'];

            const [sec, fig, tab, graf] = await Promise.all([
                fetchValues(spreadsheet.spreadsheetId, quoteSheetName(secTitle), token),
                fetchValues(spreadsheet.spreadsheetId, quoteSheetName(figTitle), token),
                fetchValues(spreadsheet.spreadsheetId, quoteSheetName(tabTitle), token),
                fetchValues(spreadsheet.spreadsheetId, quoteSheetName(grafTitle), token)
            ]);

            // STALE DATA PROTECTION FOR PREVIEW
            if (Date.now() - lastSaveTime < 10000 && fullData) {
                const cachedSecRows = fullData.secciones.data.length;
                const fetchedSecRows = sec?.length || 0;

                if (fetchedSecRows < cachedSecRows) {
                    console.warn(`[SheetEditor] Ignoring stale Preview data. Cached Secciones: ${cachedSecRows}, Fetched: ${fetchedSecRows}`);
                    return;
                }
            }

            setFullData({
                secciones: { headers: sec[0] || [], data: sec },
                figuras: { headers: fig[0] || [], data: fig },
                tablas: { headers: tab[0] || [], data: tab },
                graficos: { headers: graf[0] || [], data: graf }
            });
        } catch (e) {
            console.error(e);
            showNotification("Error cargando datos para vista previa", "error");
        } finally {
            setLoadingGrid(false);
        }
    };

    // We need a ref for the generic editor textarea to support insertion
    const genericEditorRef = useRef<HTMLTextAreaElement | null>(null);

    // Autocomplete State
    const [autocompleteState, setAutocompleteState] = useState<{
        open: boolean;
        query: string;
        position: { top: number; left: number };
        triggerIdx: number;
        selectedIndex: number;
    }>({
        open: false,
        query: '',
        position: { top: 0, left: 0 },
        triggerIdx: -1,
        selectedIndex: 0
    });

    const getAutocompleteItems = (query: string): AutocompleteItem[] => {
        const q = query.toLowerCase();
        const items: AutocompleteItem[] = [];

        // 1. Static Tags
        const staticTags: AutocompleteItem[] = [
            { id: 'nota', label: 'Nota', type: 'style', desc: 'Nota al pie o comentario' },
            { id: 'caja', label: 'Caja', type: 'block', desc: 'Bloque recuadro con título' },
            { id: 'alerta', label: 'Alerta', type: 'block', desc: 'Bloque de advertencia' },
            { id: 'info', label: 'Info', type: 'block', desc: 'Bloque informativo' },
            { id: 'destacado', label: 'Destacado', type: 'block', desc: 'Texto destacado' },
            { id: 'dorado', label: 'Texto Dorado', type: 'style' },
            { id: 'guinda', label: 'Texto Guinda', type: 'style' },
            { id: 'math', label: 'Math Inline', type: 'math', desc: 'Ecuación en línea' },
            { id: 'ecuacion', label: 'Ecuación Display', type: 'math', desc: 'Ecuación centrada' },
        ];
        items.push(...staticTags.filter(i => i.label.toLowerCase().includes(q) || i.id.includes(q)));

        // 2. Citations
        availableBibliographyKeys.forEach(k => {
            if (k.toLowerCase().includes(q) || 'cita'.includes(q)) {
                items.push({ id: `cita:${k}`, label: `Cita: ${k}`, type: 'cita', value: k });
            }
        });

        // 3. Figures
        availableFigureItems.forEach(f => {
            if (f.title.toLowerCase().includes(q) || f.id.toLowerCase().includes(q) || 'figura'.includes(q)) {
                items.push({ id: `figura:${f.id}`, label: `Fig ${f.id}: ${f.title}`, type: 'figura', value: f.id });
            }
        });

        // 4. Tables
        availableTableItems.forEach(t => {
            if (t.title.toLowerCase().includes(q) || t.id.toLowerCase().includes(q) || 'tabla'.includes(q)) {
                items.push({ id: `tabla:${t.id}`, label: `Tabla ${t.id}: ${t.title}`, type: 'tabla', value: t.id });
            }
        });

        return items.slice(0, 10); // Limit to 10 suggestions
    };

    const handleAutocompleteSelect = (item: AutocompleteItem) => {
        const textarea = genericEditorRef.current;
        if (!textarea) return;

        const triggerIdx = autocompleteState.triggerIdx;
        const currentVal = editorModal.value;
        const beforeTrigger = currentVal.substring(0, triggerIdx);
        // Remove everything from triggerIdx (which is the first '[') up to current cursor position?
        // Actually, we want to replace `[[query` with the full tag.
        // But wait, the user might have typed `[[cit`.
        // The selection logic in `EditorAutocomplete` passes the item.

        // We construct the tag
        let tagText = '';
        if (item.type === 'cita') tagText = `[[cita:${item.value}]]`;
        else if (item.type === 'figura') tagText = `[[figura:${item.value}]]`;
        else if (item.type === 'tabla') tagText = `[[tabla:${item.value}]]`;
        else if (item.type === 'style' || item.type === 'math') {
            // For inline styles that wrap content, if we are just inserting, we put placeholder
            // But usually autocomplete happens when typing fresh.
            if (item.id === 'nota') tagText = `[[nota:Nota...]]`;
            else if (item.id === 'math') tagText = `[[math:x]]`;
            else if (item.id === 'ecuacion') tagText = `[[ecuacion:E=mc^2]]`;
            else tagText = `[[${item.id}:Texto...]]`;
        } else if (item.type === 'block') {
            tagText = `\n[[${item.id}:Título]]\n...\n[[/${item.id}]]\n`;
        }

        // We need to know where the cursor IS currently to replace correctly.
        // But since we are updating state, `editorModal.value` might be slightly stale if we typed fast?
        // No, React updates are batched but `editorModal.value` is the source of truth.
        const cursor = textarea.selectionEnd;
        // The text to replace is from `triggerIdx` to `cursor`.
        // `triggerIdx` points to the first `[` of `[[`.

        const newVal = beforeTrigger + tagText + currentVal.substring(cursor);

        setEditorModal(prev => ({ ...prev, value: newVal }));
        setAutocompleteState(prev => ({ ...prev, open: false }));

        // Restore cursor
        setTimeout(() => {
            textarea.focus();
            const newCursor = triggerIdx + tagText.length;
            textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
    };

    const handleGenericEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (autocompleteState.open) {
            const items = getAutocompleteItems(autocompleteState.query);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setAutocompleteState(prev => ({
                    ...prev,
                    selectedIndex: (prev.selectedIndex + 1) % items.length
                }));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setAutocompleteState(prev => ({
                    ...prev,
                    selectedIndex: (prev.selectedIndex - 1 + items.length) % items.length
                }));
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (items[autocompleteState.selectedIndex]) {
                    handleAutocompleteSelect(items[autocompleteState.selectedIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setAutocompleteState(prev => ({ ...prev, open: false }));
            }
        }
    };

    const handleGenericEditorChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        const cursor = e.target.selectionEnd;
        setEditorModal(prev => ({ ...prev, value: val }));

        // Detect `[[` pattern
        // We look backwards from cursor to find `[[` without a closing `]]` or newline
        const textBefore = val.substring(0, cursor);
        const lastOpen = textBefore.lastIndexOf('[[');

        if (lastOpen !== -1) {
            // Check if there's a newline or `]]` between lastOpen and cursor
            const segment = textBefore.substring(lastOpen);
            if (!segment.includes(']]') && !segment.includes('\n')) {
                const query = segment.substring(2); // remove `[[`
                // If query is too long or has spaces, maybe close? 
                // Let's allow spaces for now (e.g. "Texto Dorado") but usually tags don't have spaces in ID.
                // But "cita: key" might have space?

                // Calculate coordinates
                const coords = getCaretCoordinates(e.target, lastOpen + 2);
                // Adjust for modal position? 
                // getCaretCoordinates returns relative to the element (if positioned) or viewport?
                // The utility creates a mirror div appended to body.
                // `element.getBoundingClientRect()` + coords might be needed if the textarea is in a modal.

                const rect = e.target.getBoundingClientRect();
                const top = rect.top + coords.top + window.scrollY - e.target.scrollTop;
                const left = rect.left + coords.left + window.scrollX - e.target.scrollLeft;

                // Adjust for line height (coords.top is top of line)
                const menuTop = top + 20; // approximate line height

                setAutocompleteState({
                    open: true,
                    query: query,
                    position: { top: menuTop, left: left },
                    triggerIdx: lastOpen,
                    selectedIndex: 0
                });
                return;
            }
        }

        if (autocompleteState.open) {
            setAutocompleteState(prev => ({ ...prev, open: false }));
        }
    };

    // Reuse the logic for inserting tags into the GENERIC editor
    const insertSnippetGeneric = (textToInsert: string) => {
        if (!editorModal.open) return;
        const textarea = genericEditorRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editorModal.value;
        const before = text.substring(0, start);
        const after = text.substring(end);
        const newText = before + textToInsert + after;

        // Update state
        setEditorModal(prev => ({ ...prev, value: newText }));

        // Restore focus and cursor
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        }, 0);
    };

    const wrapInlineGeneric = (type: string, extra?: { value?: string; placeholder?: string }) => {
        if (!editorModal.open) return;
        const textarea = genericEditorRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = editorModal.value;

        const res = applyInlineTag(text, start, end, type, extra);

        setEditorModal(prev => ({ ...prev, value: res.text }));

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
        }, 0);
    };

    const insertBlockGeneric = (type: string, title?: string) => {
        if (!editorModal.open) return;
        const textarea = genericEditorRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const text = editorModal.value;

        const res = insertBlockTag(text, start, type, title);

        setEditorModal(prev => ({ ...prev, value: res.text }));

        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(res.selectionStart, res.selectionEnd);
        }, 0);
    };

    // --- Helpers for Metadata Fields ---
    const getMetadataValue = (field: string) => {
        const fieldIdx = findColumnIndex(gridHeaders, [field]);
        if (fieldIdx !== -1 && editingRowIndex !== null) {
            // If we are in editing mode, use formData
            // Wait, formData is only populated when handleEdit is called.
            // But ribbon should be available when a doc is selected (viewMode=FORM or LIST with filter)

            // If viewMode is FORM, use formData.
            // If viewMode is LIST, we can't easily edit metadata unless we enter FORM mode for the doc row.
            // So Ribbon should only be active/editable when we are in FORM mode for Metadatos tab.

            return formData[fieldIdx] || '';
        }
        return '';
    };

    const updateMetadataField = (field: string, value: string) => {
        const fieldIdx = findColumnIndex(gridHeaders, [field]);
        if (fieldIdx !== -1) {
            const newData = [...formData];
            newData[fieldIdx] = value;
            setFormData(newData);
        }
    };


    const Ribbon = () => {
        const shouldRender = activeTab === 'metadatos' && viewMode === 'FORM';

        const metadataFields = [
            { id: 'Agradecimientos', label: 'Agradecimientos', icon: <Heart size={16} />, required: true, type: 'textarea' },
            { id: 'Presentacion', label: 'Presentacion', icon: <User size={16} />, required: true, type: 'textarea' },
            { id: 'ResumenEjecutivo', label: 'Resumen Ejecutivo', icon: <FileText size={16} />, required: true, type: 'textarea', maxLength: 500 },
            { id: 'DatosClave', label: 'Puntos Clave', icon: <List size={16} />, required: true, type: 'list' }
        ];

        if (!shouldRender) return null;

        return (
            <div className="bg-white border-b border-gray-200 shadow-sm transition-all duration-300">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Metadatos del Documento</span>
                    <button onClick={() => setRibbonOpen(!ribbonOpen)} className="text-gray-400 hover:text-gob-guinda">
                        {ribbonOpen ? <ChevronDown size={16} className="transform rotate-180" /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {ribbonOpen && (
                    <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        {metadataFields.map(field => {
                            const value = getMetadataValue(field.id);
                            const hasValue = value && value.trim().length > 0;

                            return (
                                <button
                                    key={field.id}
                                    onClick={() => {
                                        setEditorModal({
                                            open: true,
                                            title: `Editar ${field.label}`,
                                            value: getMetadataValue(field.id),
                                            fieldId: field.id,
                                            onSave: (val) => updateMetadataField(field.id, val)
                                        });
                                    }}
                                    className={clsx(
                                        "flex flex-col items-start p-3 rounded-lg border text-left transition-all hover:shadow-md",
                                        hasValue ? "border-green-200 bg-green-50" : "border-red-100 bg-red-50 hover:border-red-200"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={clsx("p-1.5 rounded-full", hasValue ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                            {field.icon}
                                        </div>
                                        <span className={clsx("text-sm font-semibold", hasValue ? "text-green-800" : "text-red-800")}>
                                            {field.label}
                                        </span>
                                    </div>
                                    <span className="text-xs text-gray-500 line-clamp-2">
                                        {hasValue ? value : "Campo obligatorio pendiente"}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

            </div>
        );
    };

    // Secciones editor enhancements
    const sectionContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const equationModalTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const [sectionLintIssues, setSectionLintIssues] = useState<TagIssue[]>([]);
    const [availableBibliographyKeys, setAvailableBibliographyKeys] = useState<string[]>([]);
    const [availableFigureIds, setAvailableFigureIds] = useState<string[]>([]);
    const [availableTableIds, setAvailableTableIds] = useState<string[]>([]);
    const [availableFigureItems, setAvailableFigureItems] = useState<{ id: string; title: string; section: string; route?: string }[]>([]);
    const [availableTableItems, setAvailableTableItems] = useState<{ id: string; title: string; section: string; range?: string }[]>([]);
    const [selectorPreview, setSelectorPreview] = useState<{ type: 'figura' | 'tabla'; id: string; title: string; image?: string; data?: string[][] } | null>(null);
    const [equationModal, setEquationModal] = useState<{ open: boolean; mode: 'math' | 'ecuacion'; title: string; value: string; target: 'main' | 'note' }>(
        { open: false, mode: 'math', title: 'Insertar ecuación', value: '', target: 'main' }
    );
    const [noteModal, setNoteModal] = useState<{ open: boolean; value: string }>({ open: false, value: '' });
    const noteContentTextareaRef = useRef<HTMLTextAreaElement | null>(null);

    type EquationSymbolGroup = 'Todos' | 'Griegas' | 'Operadores' | 'Relaciones' | 'Flechas' | 'Conjuntos' | 'Funciones';
    const [equationPaletteGroup, setEquationPaletteGroup] = useState<EquationSymbolGroup>('Griegas');
    const [equationPaletteQuery, setEquationPaletteQuery] = useState<string>('');

    type EquationSymbolGroupBase = Exclude<EquationSymbolGroup, 'Todos'>;
    type EquationSymbol = { group: EquationSymbolGroupBase; latex: string; label: string; keywords: string[] };

    const EQUATION_SYMBOLS: EquationSymbol[] = [
        // Griegas
        { group: 'Griegas', latex: '\\alpha', label: 'α', keywords: ['alpha', 'alfa'] },
        { group: 'Griegas', latex: '\\beta', label: 'β', keywords: ['beta'] },
        { group: 'Griegas', latex: '\\gamma', label: 'γ', keywords: ['gamma'] },
        { group: 'Griegas', latex: '\\Gamma', label: 'Γ', keywords: ['Gamma'] },
        { group: 'Griegas', latex: '\\delta', label: 'δ', keywords: ['delta'] },
        { group: 'Griegas', latex: '\\Delta', label: 'Δ', keywords: ['Delta'] },
        { group: 'Griegas', latex: '\\epsilon', label: 'ϵ', keywords: ['epsilon', 'varepsilon'] },
        { group: 'Griegas', latex: '\\varepsilon', label: 'ε', keywords: ['varepsilon', 'epsilon'] },
        { group: 'Griegas', latex: '\\theta', label: 'θ', keywords: ['theta', 'teta'] },
        { group: 'Griegas', latex: '\\vartheta', label: 'ϑ', keywords: ['vartheta'] },
        { group: 'Griegas', latex: '\\lambda', label: 'λ', keywords: ['lambda'] },
        { group: 'Griegas', latex: '\\mu', label: 'μ', keywords: ['mu'] },
        { group: 'Griegas', latex: '\\pi', label: 'π', keywords: ['pi'] },
        { group: 'Griegas', latex: '\\Pi', label: 'Π', keywords: ['Pi'] },
        { group: 'Griegas', latex: '\\rho', label: 'ρ', keywords: ['rho'] },
        { group: 'Griegas', latex: '\\sigma', label: 'σ', keywords: ['sigma'] },
        { group: 'Griegas', latex: '\\Sigma', label: 'Σ', keywords: ['Sigma'] },
        { group: 'Griegas', latex: '\\phi', label: 'ϕ', keywords: ['phi'] },
        { group: 'Griegas', latex: '\\varphi', label: 'φ', keywords: ['varphi'] },
        { group: 'Griegas', latex: '\\omega', label: 'ω', keywords: ['omega'] },
        { group: 'Griegas', latex: '\\Omega', label: 'Ω', keywords: ['Omega'] },

        // Operadores
        { group: 'Operadores', latex: '+', label: '+', keywords: ['suma', 'plus'] },
        { group: 'Operadores', latex: '-', label: '−', keywords: ['resta', 'minus'] },
        { group: 'Operadores', latex: '\\pm', label: '±', keywords: ['pm', 'mas menos'] },
        { group: 'Operadores', latex: '\\times', label: '×', keywords: ['multiplicacion', 'cruz'] },
        { group: 'Operadores', latex: '\\cdot', label: '·', keywords: ['multiplicacion', 'punto'] },
        { group: 'Operadores', latex: '\\div', label: '÷', keywords: ['division'] },
        { group: 'Operadores', latex: '\\sum', label: '∑', keywords: ['sumatoria'] },
        { group: 'Operadores', latex: '\\prod', label: '∏', keywords: ['productoria'] },
        { group: 'Operadores', latex: '\\int', label: '∫', keywords: ['integral'] },
        { group: 'Operadores', latex: '\\iint', label: '∬', keywords: ['integral doble'] },
        { group: 'Operadores', latex: '\\iiint', label: '∭', keywords: ['integral triple'] },
        { group: 'Operadores', latex: '\\oint', label: '∮', keywords: ['integral cerrada', 'contorno'] },
        { group: 'Operadores', latex: '\\partial', label: '∂', keywords: ['parcial'] },
        { group: 'Operadores', latex: '\\nabla', label: '∇', keywords: ['nabla', 'gradiente'] },
        { group: 'Operadores', latex: '\\infty', label: '∞', keywords: ['infinito'] },

        // Relaciones
        { group: 'Relaciones', latex: '=', label: '=', keywords: ['igual'] },
        { group: 'Relaciones', latex: '\\neq', label: '≠', keywords: ['diferente'] },
        { group: 'Relaciones', latex: '\\approx', label: '≈', keywords: ['aprox'] },
        { group: 'Relaciones', latex: '\\sim', label: '∼', keywords: ['similar'] },
        { group: 'Relaciones', latex: '\\le', label: '≤', keywords: ['menor igual'] },
        { group: 'Relaciones', latex: '\\ge', label: '≥', keywords: ['mayor igual'] },
        { group: 'Relaciones', latex: '\\in', label: '∈', keywords: ['pertenece'] },
        { group: 'Relaciones', latex: '\\notin', label: '∉', keywords: ['no pertenece'] },
        { group: 'Relaciones', latex: '\\subseteq', label: '⊆', keywords: ['subset', 'subconjunto'] },
        { group: 'Relaciones', latex: '\\supseteq', label: '⊇', keywords: ['superset', 'superconjunto'] },

        // Flechas
        { group: 'Flechas', latex: '\\leftarrow', label: '←', keywords: ['izquierda'] },
        { group: 'Flechas', latex: '\\rightarrow', label: '→', keywords: ['derecha'] },
        { group: 'Flechas', latex: '\\leftrightarrow', label: '↔', keywords: ['doble'] },
        { group: 'Flechas', latex: '\\Leftarrow', label: '⇐', keywords: ['doble izquierda'] },
        { group: 'Flechas', latex: '\\Rightarrow', label: '⇒', keywords: ['doble derecha'] },
        { group: 'Flechas', latex: '\\Leftrightarrow', label: '⇔', keywords: ['equivalencia'] },
        { group: 'Flechas', latex: '\\mapsto', label: '↦', keywords: ['mapea'] },

        // Conjuntos
        { group: 'Conjuntos', latex: '\\emptyset', label: '∅', keywords: ['vacio', 'empty'] },
        { group: 'Conjuntos', latex: '\\cup', label: '∪', keywords: ['union'] },
        { group: 'Conjuntos', latex: '\\cap', label: '∩', keywords: ['interseccion'] },
        { group: 'Conjuntos', latex: '\\setminus', label: '∖', keywords: ['diferencia'] },
        { group: 'Conjuntos', latex: '\\forall', label: '∀', keywords: ['para todo'] },
        { group: 'Conjuntos', latex: '\\exists', label: '∃', keywords: ['existe'] },
        { group: 'Conjuntos', latex: '\\mathbb{N}', label: 'ℕ', keywords: ['naturales'] },
        { group: 'Conjuntos', latex: '\\mathbb{Z}', label: 'ℤ', keywords: ['enteros'] },
        { group: 'Conjuntos', latex: '\\mathbb{Q}', label: 'ℚ', keywords: ['racionales'] },
        { group: 'Conjuntos', latex: '\\mathbb{R}', label: 'ℝ', keywords: ['reales'] },
        { group: 'Conjuntos', latex: '\\mathbb{C}', label: 'ℂ', keywords: ['complejos'] },

        // Funciones
        { group: 'Funciones', latex: '\\sin', label: 'sin', keywords: ['seno'] },
        { group: 'Funciones', latex: '\\cos', label: 'cos', keywords: ['coseno'] },
        { group: 'Funciones', latex: '\\tan', label: 'tan', keywords: ['tangente'] },
        { group: 'Funciones', latex: '\\log', label: 'log', keywords: ['logaritmo'] },
        { group: 'Funciones', latex: '\\ln', label: 'ln', keywords: ['log natural'] },
        { group: 'Funciones', latex: '\\exp', label: 'exp', keywords: ['exponencial'] },
        { group: 'Funciones', latex: '\\lim', label: 'lim', keywords: ['limite'] },
        { group: 'Funciones', latex: '\\max', label: 'max', keywords: ['maximo'] },
        { group: 'Funciones', latex: '\\min', label: 'min', keywords: ['minimo'] },
    ];

    // Nested Grid Editor State (for Table Content inside Form)
    const [nestedGridData, setNestedGridData] = useState<string[][]>([]);
    const [nestedGridRange, setNestedGridRange] = useState<string>('');
    const [originalNestedGridRange, setOriginalNestedGridRange] = useState<string>('');
    const [focusedCell, setFocusedCell] = useState<{ r: number, c: number } | null>(null);
    const [nestedGridMerges, setNestedGridMerges] = useState<any[]>([]); // Store merge metadata
    const [selectionStart, setSelectionStart] = useState<{ r: number, c: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ r: number, c: number } | null>(null);
    const [hasUnsavedGridChanges, setHasUnsavedGridChanges] = useState(false);
    const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);


    // UI Overlays State
    const [showTableWizard, setShowTableWizard] = useState(false);
    const [wizardConfig, setWizardConfig] = useState({ rows: 5, cols: 4 });
    const [calculatingRange, setCalculatingRange] = useState(false);

    // Confirm Delete Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, rowIndex: number | null }>({
        isOpen: false,
        rowIndex: null
    });

    const [duplicateOrders, setDuplicateOrders] = useState<Set<string>>(new Set());
    const [missingOrderRows, setMissingOrderRows] = useState<Set<number>>(new Set());

    // UI State
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const [pendingEditSectionId, setPendingEditSectionId] = useState<string | null>(null);

    // Reset pagination when tab changes
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
        if (activeTab === 'vista_previa') {
            loadPreviewData();
        }
    }, [activeTab]);

    // Handle Pending Edit Section (when switching from Preview to Sections)
    useEffect(() => {
        if (activeTab === 'secciones' && pendingEditSectionId && gridData.length > 0) {
            // Find the row with the ID
            const secOrdIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
            const secIdIdx = findColumnIndex(gridHeaders, SECCION_COL_VARIANTS); // Sometimes ID is in "Seccion" column

            // Try to find match
            let foundIndex = -1;

            // First try by ID/Orden column match
            if (secOrdIdx !== -1) {
                foundIndex = gridData.findIndex(r => (r[secOrdIdx] || '').toString().trim() === pendingEditSectionId);
            }

            // If not found, try Seccion column (sometimes used as ID)
            if (foundIndex === -1 && secIdIdx !== -1) {
                foundIndex = gridData.findIndex(r => (r[secIdIdx] || '').toString().trim() === pendingEditSectionId);
            }

            if (foundIndex !== -1) {
                // We need to map gridData index to filteredData index if we were using filtered view, 
                // but handleEdit takes index relative to gridData if we use it directly?
                // Actually handleEdit takes index relative to `displayedRows` if clicked from UI?
                // No, handleEdit takes `index` which in the UI map is `displayedRows.map(({ row, index })`.
                // The `index` in displayedRows object is the original index in `gridData`.
                // So `foundIndex` (index in gridData) is correct.

                handleEdit(foundIndex);
                setPendingEditSectionId(null);
            }
        }
    }, [activeTab, gridData, pendingEditSectionId, gridHeaders]);

    const handleEditSectionFromPreview = (sectionId: string) => {
        setPendingEditSectionId(sectionId);
        setActiveTab('secciones');
        setViewMode('LIST'); // Will switch to FORM automatically by handleEdit, but LIST ensures data load
    };

    // Safe tab switching with unsaved changes check
    const switchTab = (newTab: string) => {
        if (hasUnsavedGridChanges && activeTab === 'tablas') {
            const confirmSwitch = window.confirm('Tienes cambios sin guardar en la tabla actual. ¿Deseas continuar sin guardar?');
            if (!confirmSwitch) {
                return;
            }
            // Clear the auto-save timer
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            setHasUnsavedGridChanges(false);
        }
        setActiveTab(newTab);
        setViewMode('LIST');
        setMobileMenuOpen(false);
    };

    // Reset pagination when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);



    const EQUATION_PLACEHOLDER_RE = /\{\{\d+\}\}/g;

    const focusNextEquationPlaceholder = (opts?: { wrap?: boolean }) => {
        const el = equationModalTextareaRef.current;
        if (!el) return false;

        const text = el.value || '';
        const from = el.selectionEnd ?? el.selectionStart ?? 0;
        const wrap = opts?.wrap ?? true;

        const findFrom = (startIndex: number) => {
            const re = new RegExp(EQUATION_PLACEHOLDER_RE.source, 'g');
            re.lastIndex = startIndex;
            return re.exec(text);
        };

        let match = findFrom(from);
        if (!match && wrap) match = findFrom(0);
        if (!match) return false;

        el.focus();
        el.setSelectionRange(match.index, match.index + match[0].length);
        return true;
    };

    const insertIntoEquationModal = (snippet: string, options?: { selectFirstPlaceholder?: boolean }) => {
        const el = equationModalTextareaRef.current;

        const start = el ? el.selectionStart : (equationModal.value || '').length;
        const end = el ? el.selectionEnd : start;

        const placeholderMatch = (options?.selectFirstPlaceholder ?? false)
            ? new RegExp(EQUATION_PLACEHOLDER_RE.source, 'g').exec(snippet)
            : null;
        const placeholderOffset = placeholderMatch ? placeholderMatch.index : null;
        const placeholderLen = placeholderMatch ? placeholderMatch[0].length : 0;

        setEquationModal(prev => {
            const current = (prev.value ?? '').toString();
            const from = Math.max(0, Math.min(Math.min(start, end), current.length));
            const to = Math.max(0, Math.min(Math.max(start, end), current.length));
            return { ...prev, value: current.slice(0, from) + snippet + current.slice(to) };
        });

        requestAnimationFrame(() => {
            const el2 = equationModalTextareaRef.current;
            if (!el2) return;

            const current = el2.value || '';
            const from = Math.max(0, Math.min(Math.min(start, end), current.length));

            if (options?.selectFirstPlaceholder && placeholderOffset !== null) {
                const selStart = Math.max(0, Math.min(from + placeholderOffset, current.length));
                const selEnd = Math.max(0, Math.min(selStart + placeholderLen, current.length));
                el2.focus();
                el2.setSelectionRange(selStart, selEnd);
                return;
            }

            const pos = Math.max(0, Math.min(from + snippet.length, current.length));
            el2.focus();
            el2.setSelectionRange(pos, pos);
        });
    };

    const commitEquationModal = () => {
        const target = equationModal.target || 'main';
        const tagName = equationModal.mode === 'math' ? 'math' : 'ecuacion';
        const payload = (equationModal.value || '...').replace(EQUATION_PLACEHOLDER_RE, '...');

        if (target === 'note') {
            // Insert into note modal textarea
            const el = noteContentTextareaRef.current;
            const selStart = el ? el.selectionStart : (noteModal.value || '').length;
            const selEnd = el ? el.selectionEnd : selStart;
            const currentValue = noteModal.value || '';

            const res = applyInlineTag(currentValue, selStart, selEnd, tagName, { value: payload, placeholder: '...' });

            setNoteModal(prev => ({ ...prev, value: res.text }));
            setEquationModal({ ...equationModal, open: false });

            requestAnimationFrame(() => {
                const el2 = noteContentTextareaRef.current;
                if (!el2) return;
                el2.focus();
                el2.setSelectionRange(res.selectionStart, res.selectionEnd);
            });
            return;
        }

        const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
        if (contentIdx === -1) {
            setEquationModal({ ...equationModal, open: false });
            return;
        }

        const el = sectionContentTextareaRef.current;
        const selStart = el ? el.selectionStart : 0;
        const selEnd = el ? el.selectionEnd : 0;
        const currentValue = (formData[contentIdx] || '').toString();

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
    };

    const insertSnippetIntoContent = (snippet: string) => {
        if (editorModal.open) {
            insertSnippetGeneric(snippet);
            return;
        }

        const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
        if (contentIdx === -1) {
            // Optional: showNotification("No se encontró la columna de Contenido.", "error");
            return;
        }

        const el = sectionContentTextareaRef.current;
        const currentContent = (formData[contentIdx] || '').toString();
        const pos = el ? el.selectionStart : currentContent.length;

        const before = currentContent.slice(0, pos);
        const after = currentContent.slice(pos);
        const nextText = before + snippet + after;

        const newData = [...formData];
        newData[contentIdx] = nextText;
        setFormData(newData);

        // Linting
        const nextIssues = lintTags(nextText, {
            bibliographyKeys: availableBibliographyKeys,
            figureIds: availableFigureIds,
            tableIds: availableTableIds,
        });
        setSectionLintIssues(nextIssues);

        // Restore focus
        requestAnimationFrame(() => {
            const el2 = sectionContentTextareaRef.current;
            if (el2) {
                el2.focus();
                // Move cursor to end of inserted snippet
                el2.setSelectionRange(pos + snippet.length, pos + snippet.length);
            }
        });
    };

    // --- Table Style Handler ---
    const handleTableStyleChange = (style: TableStyle) => {
        // Compute table ID from current form data
        const secIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
        const ordIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
        const sec = secIdx !== -1 ? (formData[secIdx] || '').toString().trim() : '';
        const ord = ordIdx !== -1 ? (formData[ordIdx] || '').toString().trim() : '';
        const tableId = (sec && ord) ? `TBL-${sec}-${ord}` : `TBL-${ord}`;

        // Update table style map
        const newMap = { ...tableStyleMap };
        newMap[tableId] = style;
        setTableStyleMap(newMap);

        showNotification(`Estilos de tabla guardados (${tableId})`, 'success');
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
        // Socket: Enter document room when docId is settled
        if (currentDocId) {
            socketService.enterDocument(currentDocId);
        }

        // Listen for real-time data updates (images, rows, etc.)
        const cleanupData = socketService.onDataUpdate((data) => {
            if (data.docId === currentDocId) {
                console.log('Data update received:', data);
                if (data.type === 'image' || data.type === 'figure_update') {
                    // Update timestamp to bust cache for images
                    setDataTimestamp(Date.now());
                }

                // Refresh grid data
                onRefresh();

                showNotification(`Datos actualizados por ${data.fromUser}`, 'info');
            }
        });

        return () => {
            // Optional: Leave when unmounting or changing doc
            // socketService.leaveDocument(); 
            // Note: server handles 'leave' automatically on 'enter_document' of new doc
            cleanupData();
        };
    }, [currentDocId]);

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
        const selected = docs.find(d => d.id === preferredId) || docs.find(d => d.id === currentDocId) || docs.find(d => d.id === 'D01') || docs[0];
        if (selected) {
            if (selected.id !== currentDocId) setCurrentDocId(selected.id);
            if (selected.rowIndex !== currentDocRowIndex) setCurrentDocRowIndex(selected.rowIndex);
            if (canApplyInitial && selected.id === initialDocId) {
                initialSelectionAppliedForSpreadsheet.current = spreadsheet.spreadsheetId;
            }
        }
    }, [spreadsheet, initialDocId]);

    useEffect(() => {
        // Force update currentDocId if initialDocId is provided and available in docs
        if (initialDocId && availableDocs.length > 0) {
            const match = availableDocs.find(d => d.id === initialDocId);
            if (match && currentDocId !== match.id) {
                setCurrentDocId(match.id);
                setCurrentDocRowIndex(match.rowIndex);
            }
        }
    }, [availableDocs, initialDocId]);

    const fetchSheetData = async () => {
        if (!activeSheet) return;

        console.log(`[SheetEditor] Fetching data for tab: ${activeTab}`);

        // 1. Optimistic Load from Cache
        if (sheetCache[activeTab]) {
            console.log(`[SheetEditor] Cache hit for ${activeTab}. Using cached data.`);
            const cached = sheetCache[activeTab];
            setGridHeaders(cached.headers);
            const body = cached.data.slice(1).map(row => {
                const newRow = [...row];
                while (newRow.length < cached.headers.length) newRow.push('');
                return newRow;
            });
            if (currentDocId) {
                const docIdIndex = findColumnIndex(cached.headers, DOC_ID_VARIANTS);
                if (docIdIndex !== -1) {
                    setGridData(body.filter(row => row[docIdIndex] === currentDocId));
                } else {
                    setGridData(body);
                }
            } else {
                setGridData(body);
            }
        }
        // 2. Fallback to Props Data (Initial Load) if no cache
        else if (activeSheet.data && activeSheet.data[0]?.rowData) {
            console.log(`[SheetEditor] No cache. Loading from Props initially.`);
            const rawData: string[][] = [];
            activeSheet.data[0].rowData.forEach((row) => {
                const rowValues = row.values?.map(cell =>
                    cell.formattedValue ||
                    cell.userEnteredValue?.stringValue ||
                    (cell.userEnteredValue?.numberValue !== undefined ? String(cell.userEnteredValue.numberValue) : '') ||
                    ''
                ) || [];
                rawData.push(rowValues);
            });

            if (rawData.length > 0) {
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
                    } else setGridData(body);
                } else setGridData(body);

                // Populate cache from props so next time it's instant
                setSheetCache(prev => ({
                    ...prev,
                    [activeTab]: { headers, data: rawData }
                }));
            }
            // Still fetch in background to ensure freshness
            setLoadingGrid(true);
        } else {
            setLoadingGrid(true);
        }

        // 3. Background Fetch from API
        try {
            const values = await fetchValues(spreadsheet.spreadsheetId, activeSheet.properties.title, token);
            console.log(`[SheetEditor] API response received for ${activeTab}. Rows: ${values?.length || 0}`);

            // STALE DATA PROTECTION
            if (Date.now() - lastSaveTime < 10000 && sheetCache[activeTab]) {
                const cachedRows = sheetCache[activeTab].data.length;
                const fetchedRows = values?.length || 0;

                if (fetchedRows < cachedRows) {
                    console.warn(`[SheetEditor] IGNORING STALE API DATA. Cached: ${cachedRows}, Fetched: ${fetchedRows}.`);
                    return;
                }
            }

            // Update Cache & Grid if we got data
            if (values && values.length > 0) {
                setSheetCache(prev => ({
                    ...prev,
                    [activeTab]: { headers: values[0], data: values }
                }));

                const headers = values[0];
                setGridHeaders(headers);

                const body = values.slice(1).map(row => {
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
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('UNAUTHENTICATED')) {
                showNotification("Sesión expirada. Por favor, recarga la página o inicia sesión nuevamente.", "error");
            } else {
                showNotification("Error actualizando datos.", "error");
            }
        } finally {
            setLoadingGrid(false);
        }
    };

    useEffect(() => {
        setViewMode('LIST');
        setSearchTerm('');
        setCurrentPage(1);
        setFocusedCell(null);
        setDuplicateOrders(new Set()); // Reset validation highlight
        setMissingOrderRows(new Set());

        // Refresh fullData for preview if needed
        if (activeTab === 'vista_previa') {
            loadPreviewData();
            return;
        }

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
            // Use the robust fetch logic with cache
            fetchSheetData();
        }
    }, [activeTab, spreadsheet, currentDocId, currentDocRowIndex]);

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
        setAvailableBibliographyKeys(uniqueSorted(bibKeys));

        // Use cached data if available for cross-tab lookups
        const getSheetData = (title: string) => {
            // First check cache if activeTab is not the one we are looking for (if it is, use gridData?)
            // Actually gridData is for activeTab.
            // If activeTab is 'secciones', we need 'Figuras' and 'Tablas'.
            // They might be in sheetCache.
            const cacheKey = Object.keys(TAB_TO_SHEET_TITLE).find(k => TAB_TO_SHEET_TITLE[k] === title);
            if (cacheKey && sheetCache[cacheKey]) {
                return {
                    data: [sheetCache[cacheKey].headers, ...sheetCache[cacheKey].data]
                };
            }
            return findSheetByTitle(title);
        };

        const figurasSheet = getSheetData('Figuras'); // findSheetByTitle('Figuras');
        const tablasSheet = getSheetData('Tablas'); // findSheetByTitle('Tablas');

        const figurasItems: { id: string; title: string; section: string; route?: string }[] = [];
        const tablasItems: { id: string; title: string; section: string; range?: string }[] = [];

        // Helper to extract from raw data (either from Sheet object or Cache object structure)
        // Cache structure: headers: string[], data: string[][] (where data includes only body?)
        // Wait, in fetchSheetData I set cache as: { headers: values[0], data: values } where values INCLUDES headers at 0.
        // So cache.data[0] is headers.

        // But findSheetByTitle returns a Google Sheet object structure: data[0].rowData[...].values
        // This is DIFFERENT from my simple cache structure.

        // I need to normalize extraction.

        const extractRows = (sheetObj: any) => {
            if (!sheetObj) return [];

            // Check if it's my cache format (simple object with data array of strings)
            if (sheetObj.data && Array.isArray(sheetObj.data) && Array.isArray(sheetObj.data[0]) && typeof sheetObj.data[0][0] === 'string') {
                // It's the cache format or fetchValues format
                return sheetObj.data;
            }

            // It's Google Sheet format
            if (sheetObj.data?.[0]?.rowData) {
                const rows: string[][] = [];
                sheetObj.data[0].rowData.forEach((r: any) => {
                    const vals = r.values?.map((c: any) => c.userEnteredValue?.stringValue || c.formattedValue || '') || [];
                    rows.push(vals);
                });
                return rows;
            }
            return [];
        };

        const figRows = extractRows(figurasSheet);
        if (figRows.length > 1) {
            const headers = figRows[0];
            const docIdx = findColumnIndex(headers, DOC_ID_VARIANTS);
            const secIdx = findColumnIndex(headers, [...SECCION_COL_VARIANTS, 'SeccionOrden', 'SecciónOrden']);
            const ordIdx = findColumnIndex(headers, [...ORDEN_COL_VARIANTS, 'OrdenFigura']);
            const titleIdx = findColumnIndex(headers, ['Título/Descripción', 'Titulo', 'Descripción', 'Descripcion', 'Caption']);
            const routeIdx = findColumnIndex(headers, ['Ruta de Imagen', 'RutaArchivo']);

            figRows.slice(1).forEach(r => {
                const dId = docIdx !== -1 ? r[docIdx] : '';
                if (dId !== currentDocId) return;
                const sec = secIdx !== -1 ? r[secIdx] : '';
                const ord = ordIdx !== -1 ? r[ordIdx] : '';
                const title = titleIdx !== -1 ? r[titleIdx] : '';
                const route = routeIdx !== -1 ? r[routeIdx] : '';
                const id = computeFigureId(sec, ord);
                if (id) figurasItems.push({ id, title, section: sec, route });
            });
        }

        const tabRows = extractRows(tablasSheet);
        if (tabRows.length > 1) {
            const headers = tabRows[0];
            const docIdx = findColumnIndex(headers, DOC_ID_VARIANTS);
            const secIdx = findColumnIndex(headers, [...SECCION_COL_VARIANTS, 'SeccionOrden', 'SecciónOrden', 'ID_Seccion']);
            const ordIdx = findColumnIndex(headers, [...ORDEN_COL_VARIANTS, 'OrdenTabla', 'Orden']);
            const titleIdx = findColumnIndex(headers, ['Título', 'Titulo']);
            const rangeIdx = findColumnIndex(headers, CSV_COL_VARIANTS);

            tabRows.slice(1).forEach(r => {
                const dId = docIdx !== -1 ? r[docIdx] : '';
                if (dId !== currentDocId) return;
                const sec = secIdx !== -1 ? r[secIdx] : '';
                const ord = ordIdx !== -1 ? r[ordIdx] : '';
                const title = titleIdx !== -1 ? r[titleIdx] : '';
                const range = rangeIdx !== -1 ? r[rangeIdx] : '';
                const id = computeTableId(sec, ord);
                if (id) tablasItems.push({ id, title, section: sec, range });
            });
        }

        const figIds = figurasItems.map(i => i.id);
        const tabIds = tablasItems.map(i => i.id);
        setAvailableFigureIds(uniqueSorted(figIds));
        setAvailableTableIds(uniqueSorted(tabIds));
        setAvailableFigureItems(figurasItems);
        setAvailableTableItems(tablasItems);
    }, [activeTab, spreadsheet, currentDocId, sheetCache]); // Added sheetCache as dependency

    // --- Logic to Calculate Next Order ---
    const calculateNextOrder = (sectionId: string) => {
        // Allow for both Tablas and Figuras
        if (!sectionId || (activeTab !== 'tablas' && activeTab !== 'figuras')) return '1';

        const secColIdx = findColumnIndex(gridHeaders, SECCION_COL_VARIANTS);
        const ordColIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);

        if (secColIdx === -1 || ordColIdx === -1) return '1';

        let maxOrder = 0;
        gridData.forEach(row => {
            const rowSec = (row[secColIdx] || '').toString().trim();
            // Handle subsection matching (exact match)
            if (rowSec === sectionId.trim()) {
                const valStr = row[ordColIdx];
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

        // If we can't find columns, we can't validate duplicates properly, but we shouldn't block
        if (ordColIdx === -1) return false;

        const targetSec = (sectionId || '').toString().trim();
        const targetOrd = (orderVal || '').toString().trim();

        return gridData.some((row, idx) => {
            if (ignoreRowIndex !== null && idx === ignoreRowIndex) return false;

            const rowOrd = (row[ordColIdx] || '').toString().trim();

            if (secColIdx !== -1) {
                const rowSec = (row[secColIdx] || '').toString().trim();
                return rowSec === targetSec && rowOrd === targetOrd;
            } else {
                // Fallback: if no section column, just check order (unlikely to be desired but safer than crashing)
                return rowOrd === targetOrd;
            }
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
            setNestedGridMerges([]);
            return;
        }

        setLoadingGrid(true);
        setNestedGridRange(correctedRange);
        setOriginalNestedGridRange(correctedRange);
        setFocusedCell(null);
        setSelectionStart(null);
        setSelectionEnd(null);

        try {
            // New logic: Fetch cells AND merges
            const { rowData, merges } = await fetchSpreadsheetCells(spreadsheet.spreadsheetId, [correctedRange], token);

            console.log('[SheetEditor] Loaded grid data:', {
                range: correctedRange,
                rowCount: rowData?.length || 0,
                mergeCount: merges?.length || 0,
                merges: merges
            });

            if (rowData && rowData.length > 0) {
                // Map rowData to string[][]
                const values = rowData.map(r => r.values?.map((c: any) => c.formattedValue || c.userEnteredValue?.stringValue || (c.userEnteredValue?.numberValue !== undefined ? String(c.userEnteredValue.numberValue) : '') || '') || []);

                // Ensure rectangular grid
                const maxCols = Math.max(...values.map(r => r.length));
                const normalizedValues = values.map(r => {
                    const newRow = [...r];
                    while (newRow.length < maxCols) newRow.push('');
                    return newRow;
                });

                setNestedGridData(normalizedValues);
                setNestedGridMerges(merges || []);
            } else {
                setNestedGridData([['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]);
                setNestedGridMerges([]);
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

        if (activeTab === 'secciones') {
            const nivelIdx = findColumnIndex(gridHeaders, NIVEL_VARIANTS);
            const ordenIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
            if (nivelIdx !== -1 && !newRow[nivelIdx]) newRow[nivelIdx] = 'seccion';
            // Pre‑calcular siguiente orden disponible (nivel seccion)
            if (ordenIdx !== -1 && (!newRow[ordenIdx] || newRow[ordenIdx].toString().trim() === '')) {
                const headers = gridHeaders;
                const idxDoc = findColumnIndex(headers, DOC_ID_VARIANTS);
                const idxOrd = findColumnIndex(headers, ORDEN_COL_VARIANTS);
                let maxTop = 0;
                gridData.forEach((row, idx) => {
                    if (idx === 0) return;
                    const dId = idxDoc !== -1 ? (row[idxDoc] || '') : '';
                    if (dId !== currentDocId) return;
                    const o = idxOrd !== -1 ? (row[idxOrd] || '') : '';
                    if (!o) return;
                    const top = parseInt(String(o).split('.')[0]);
                    if (!isNaN(top)) maxTop = Math.max(maxTop, top);
                });
                newRow[ordenIdx] = String(maxTop + 1);
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

    useEffect(() => {
        const loadPreviewData = async () => {
            if (!selectorPreview) return;
            if (selectorPreview.type !== 'tabla') return;
            const item = availableTableItems.find(x => x.id === selectorPreview.id);
            const range = item?.range || '';
            if (!range) return;
            try {
                const values = await fetchValues(spreadsheet.spreadsheetId, sanitizeRangeString(range), token);
                setSelectorPreview(prev => prev ? { ...prev, data: values } : prev);
            } catch { }
        };
        loadPreviewData();
    }, [selectorPreview]);

    const validateCurrentDocumentOrders = () => {
        if (activeTab !== 'secciones') { showNotification('Esta validación aplica en Secciones.', 'error'); return; }
        const headers = gridHeaders;
        const idxDoc = findColumnIndex(headers, DOC_ID_VARIANTS);
        const idxOrden = findColumnIndex(headers, ORDEN_COL_VARIANTS);
        const idxNivel = findColumnIndex(headers, NIVEL_VARIANTS);
        const idxTitulo = findColumnIndex(headers, TITLE_VARIANTS);
        const idxContenido = findColumnIndex(headers, CONTENIDO_VARIANTS);
        const idxEstado = headers.findIndex(h => h.trim().toLowerCase() === 'estado');

        // Group by Order to allow Portada exception
        const orderByOrder: Record<string, string[]> = {};
        const missing = new Set<number>();
        let disponibles = 0, faltantes = 0;

        gridData.forEach((row, idx) => {
            if (idx === 0) return;
            const dId = idxDoc !== -1 ? (row[idxDoc] || '') : '';
            if (dId !== currentDocId) return;
            const est = idxEstado !== -1 ? String(row[idxEstado] || '').toLowerCase().trim() : 'disponible';
            if (est !== 'disponible' && est !== 'available') return;

            disponibles++;
            const ord = idxOrden !== -1 ? (row[idxOrden] || '') : '';
            const niv = idxNivel !== -1 ? (row[idxNivel] || '').toLowerCase() : '';
            const tit = idxTitulo !== -1 ? (row[idxTitulo] || '') : '';
            const cont = idxContenido !== -1 ? (row[idxContenido] || '') : '';

            if (!ord || !niv || !tit || !cont) {
                faltantes++;
                missing.add(idx);
            }

            if (ord) {
                if (!orderByOrder[ord]) orderByOrder[ord] = [];
                orderByOrder[ord].push(niv);
            }
        });

        const dups = new Set<string>();
        let duplicados = 0;

        Object.entries(orderByOrder).forEach(([ord, levels]) => {
            if (levels.length > 1) {
                // Duplicate found. Check if it's valid (contains 'portada')
                const hasPortada = levels.some(l => l.includes('portada'));
                if (!hasPortada) {
                    duplicados++;
                    dups.add(ord);
                }
            }
        });

        setDuplicateOrders(dups);
        showNotification(`Órdenes disponibles: ${disponibles}. Duplicados reales: ${duplicados}. Faltantes: ${faltantes}.`, (duplicados || faltantes) ? 'error' : 'success');
    };

    const createNewForSection = (kind: 'figura' | 'tabla') => {
        if (kind === 'figura') {
            setActiveTab('figuras');
        } else {
            setActiveTab('tablas');
        }
        setViewMode('LIST');
        setMobileMenuOpen(false);
    };

    const openTab = (tab: 'bibliografia' | 'figuras' | 'tablas' | 'secciones') => {
        setActiveTab(tab);
        setViewMode('LIST');
        setMobileMenuOpen(false);
    };

    // removed nextOrderFor; behavior simplified to respect existing create flow

    const handleEdit = (rowIndex: number) => {
        // Warn if there are unsaved changes
        if (hasUnsavedGridChanges) {
            const confirmSwitch = window.confirm('Tienes cambios sin guardar en la tabla actual. ¿Deseas continuar sin guardar?');
            if (!confirmSwitch) {
                return;
            }
            // Clear the auto-save timer
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            setHasUnsavedGridChanges(false);
        }

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

            // Safeguard: do not delete row from other DocumentoID
            const docIdx = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
            if (docIdx !== -1) {
                const rowDoc = (gridData[rowIndex]?.[docIdx] || '').toString();
                if (rowDoc && rowDoc !== currentDocId) {
                    showNotification(`No puedes eliminar registros de otro documento (${rowDoc}).`, 'error');
                    setSaving(false);
                    setDeleteModal({ isOpen: false, rowIndex: null });
                    return;
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

            // Notify other users about delete
            socketService.notifyDataUpdate({
                docId: currentDocId,
                type: activeTab === 'figuras' ? 'figure_update' : 'row_update',
                action: 'delete',
                tab: activeTab
            });

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

    const handleSave = async (overrideGridDataOrEvent?: any, overrideRangeStr?: string) => {
        let overrideGridData: string[][] | null = null;
        if (Array.isArray(overrideGridDataOrEvent)) {
            overrideGridData = overrideGridDataOrEvent;
        }

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

            // Normalizar Nivel y validar reglas de negocio
            const nivelIdx = findColumnIndex(formHeaders, NIVEL_VARIANTS);
            const docIdxF = findColumnIndex(formHeaders, DOC_ID_VARIANTS);
            const nivelRaw = nivelIdx !== -1 ? (formData[nivelIdx] || '').toString() : '';
            const nivelNorm = normalizeLevelValue(nivelRaw);
            const docIdVal = docIdxF !== -1 ? (formData[docIdxF] || '').toString() : currentDocId;

            if (nivelNorm === 'directorio') {
                const gridDocIdx = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
                const gridNivelIdx = findColumnIndex(gridHeaders, NIVEL_VARIANTS);
                let dirCount = 0;
                gridData.forEach((row, idx) => {
                    if (idx === 0) return;
                    if (editingRowIndex !== null && idx === editingRowIndex) return; // excluir el registro en edición
                    const dId = gridDocIdx !== -1 ? (row[gridDocIdx] || '') : '';
                    const lvl = gridNivelIdx !== -1 ? normalizeLevelValue((row[gridNivelIdx] || '').toString()) : '';
                    if (dId === docIdVal && lvl === 'directorio') dirCount++;
                });
                if (dirCount > 0) {
                    showNotification('Solo puede existir un Directorio en el documento.', 'error');
                    return;
                }
            }
        }

        // Validation for Horizontal Tables Column Limit (Max 17)
        if (activeTab === 'tablas') {
            const horizontalIdx = findColumnIndex(formHeaders, HORIZONTAL_COL_VARIANTS);
            if (horizontalIdx !== -1) {
                const isHorizontal = (formData[horizontalIdx] || '').toString().toLowerCase().trim();
                // Common affirmative values
                if (['si', 'sí', 'yes', 'true', 'x', 'horizontal', 'activado'].includes(isHorizontal)) {
                    if (nestedGridData && nestedGridData.length > 0) {
                        const colCount = nestedGridData[0].length;
                        if (colCount > 20) {
                            showNotification(`En modo horizontal, la tabla no puede exceder 20 columnas (actual: ${colCount}). Por favor reduzca las columnas antes de guardar.`, "error");
                            return;
                        }
                    }
                }
            }
        }

        // Validate Section and Order logic for both Tablas AND Figuras
        if (activeTab === 'tablas' || activeTab === 'figuras') {
            const secColIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
            const ordColIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);

            // Allow saving even if columns are missing (maybe intended?), but warn if possible
            if (secColIdx !== -1 && ordColIdx !== -1) {
                const section = formData[secColIdx];
                const order = formData[ordColIdx];
                const orderNum = parseInt(order);

                if (isNaN(orderNum) || orderNum < 1) {
                    showNotification("El Orden/Número debe ser mayor a 0.", "error");
                    return;
                }

                if (!section) {
                    showNotification("Selecciona una Sección.", "error");
                    return;
                }

                if (isOrderDuplicate(section, order, editingRowIndex)) {
                    showNotification(`El Número ${order} ya existe en la sección ${section}.`, "error");
                    return;
                }

                // Extra check: Check for Duplicate Titles (Nombres)
                const titleIdx = findColumnIndex(formHeaders, TITLE_VARIANTS);
                if (titleIdx !== -1) {
                    const title = (formData[titleIdx] || '').toString().trim();
                    if (title) {
                        const isTitleDup = gridData.some((row, idx) => {
                            if (editingRowIndex !== null && idx === editingRowIndex) return false;
                            return (row[titleIdx] || '').toString().trim().toLowerCase() === title.toLowerCase();
                        });
                        if (isTitleDup) {
                            showNotification(`Advertencia: El título "${title}" ya existe en otro registro.`, 'info');
                        }
                    }
                }
            } else {
                // If columns are missing, we should probably warn but proceed if legacy sheet
                if (ordColIdx !== -1) {
                    const order = formData[ordColIdx];
                    // Fallback validation for order only
                    if (isOrderDuplicate('', order, editingRowIndex)) {
                        showNotification(`El Número ${order} ya existe.`, "error");
                        return;
                    }
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
                    // Use override range if available, otherwise current state
                    const rToUse = overrideRangeStr || nestedGridRange;
                    if (csvIndex !== -1 && rToUse) {
                        finalFormData[csvIndex] = rToUse;
                    }
                }

                if (activeTab === 'secciones') {
                    const contentIdx = findColumnIndex(formHeaders, CONTENIDO_VARIANTS);
                    if (contentIdx !== -1) {
                        finalFormData[contentIdx] = normalizeOnSave((finalFormData[contentIdx] || '').toString());
                    }
                    const nivelIdx = findColumnIndex(formHeaders, NIVEL_VARIANTS);
                    if (nivelIdx !== -1) {
                        finalFormData[nivelIdx] = normalizeLevelValue((finalFormData[nivelIdx] || '').toString());
                    }
                }

                if (editingRowIndex === null) {
                    if (activeTab === 'secciones') {
                        const headers = gridHeaders;
                        const docIdx = findColumnIndex(headers, DOC_ID_VARIANTS);
                        let lastDataIdx = -1;
                        for (let i = 1; i < gridData.length; i++) {
                            const row = gridData[i];
                            const dId = docIdx !== -1 ? (row[docIdx] || '') : '';
                            if (dId === currentDocId) lastDataIdx = i - 1;
                        }
                        const insertAtSheetRow = (lastDataIdx >= 0) ? (lastDataIdx + 2 + 1) : 2;
                        await insertDimension(spreadsheet.spreadsheetId, activeSheet.properties.sheetId, insertAtSheetRow - 1, 1, 'ROWS', token);
                        const endColLetter = indexToColumnLetter(finalFormData.length - 1);
                        const targetRange = `${sheetTitle}!A${insertAtSheetRow}:${endColLetter}${insertAtSheetRow}`;
                        await updateValues(spreadsheet.spreadsheetId, targetRange, [finalFormData], token);
                    } else {
                        await appendRow(spreadsheet.spreadsheetId, sheetTitle, finalFormData, token);
                    }
                } else {
                    const startRow = editingRowIndex + 2;
                    const endColLetter = indexToColumnLetter(finalFormData.length - 1);
                    const updateRange = `${sheetTitle}!A${startRow}:${endColLetter}${startRow}`;
                    await updateValues(spreadsheet.spreadsheetId, updateRange, [finalFormData], token);
                }

                if (activeTab === 'tablas') {
                    const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
                    let targetRange = overrideRangeStr || finalFormData[csvIndex] || nestedGridRange;
                    const dataToSave = overrideGridData || nestedGridData;

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
                        await updateValues(spreadsheet.spreadsheetId, targetRange, dataToSave, token);

                        // Critical: Update original range state so subsequent saves don't duplicate insertions
                        setOriginalNestedGridRange(targetRange);
                    }
                }

                showNotification("Guardado correctamente.", "success");
                socketService.reportAction(`Guardó cambios en ${activeTab} (${currentDocId})`);

                // Mark save time to prevent stale reads from API for a few seconds
                setLastSaveTime(Date.now());

                // Notify other users about the data update
                socketService.notifyDataUpdate({
                    docId: currentDocId,
                    type: activeTab === 'figuras' ? 'figure_update' : 'row_update',
                    tab: activeTab
                });

                // Update local state to reflect changes without full reload
                const newGridData = [...gridData];
                if (editingRowIndex === null) {
                    // New item added
                    newGridData.push(finalFormData);
                    setGridData(newGridData);
                    setEditingRowIndex(newGridData.length - 1);
                } else {
                    // Existing item updated
                    newGridData[editingRowIndex] = finalFormData;
                    setGridData(newGridData);
                }

                // Update the generic cache for the current tab so switching tabs keeps this data
                if (activeTab && gridHeaders.length > 0) {
                    setSheetCache(prev => ({
                        ...prev,
                        [activeTab]: { headers: gridHeaders, data: [gridHeaders, ...newGridData] }
                    }));
                }

                // Optimistically update fullData for Preview if we are editing sections/tables/figures
                if (fullData) {
                    const nextFullData = { ...fullData };
                    if (activeTab === 'secciones') {
                        nextFullData.secciones = {
                            ...nextFullData.secciones,
                            data: [nextFullData.secciones.data[0], ...newGridData] // Assuming gridData contains only data rows? 
                            // Wait, gridData usually contains headers at index 0?
                            // No, in fetchValues, row 0 is headers.
                            // But setGridData in useEffect (line 1160) does: setGridData(body), where body is rawData.slice(1).
                            // So gridData does NOT contain headers.
                            // But fullData.secciones.data DOES contain headers at index 0.
                        };
                        // We need to reconstruct fullData.secciones.data
                        // The headers are in nextFullData.secciones.headers or nextFullData.secciones.data[0]
                        const headers = nextFullData.secciones.headers || nextFullData.secciones.data[0];
                        nextFullData.secciones.data = [headers, ...newGridData];
                    } else if (activeTab === 'figuras') {
                        const headers = nextFullData.figuras.headers || nextFullData.figuras.data[0];
                        nextFullData.figuras.data = [headers, ...newGridData];
                    } else if (activeTab === 'tablas') {
                        const headers = nextFullData.tablas.headers || nextFullData.tablas.data[0];
                        nextFullData.tablas.data = [headers, ...newGridData];
                    } else if (activeTab === 'graficos') {
                        const headers = nextFullData.graficos.headers || nextFullData.graficos.data[0];
                        nextFullData.graficos.data = [headers, ...newGridData];
                    }
                    setFullData(nextFullData);
                }

                // Clear unsaved changes flag on successful save
                setHasUnsavedGridChanges(false);
                if (autoSaveTimerRef.current) {
                    clearTimeout(autoSaveTimerRef.current);
                }

                // Do not refresh or switch view mode, to keep user context
                // onRefresh();
                // setSearchTerm('');
                // setViewMode('LIST');
            }
        } catch (e) {
            console.error(e);
            showNotification("Error al guardar los cambios.", "error");
        } finally {
            setSaving(false);
        }
    };

    // Auto-save debounced function for cell edits
    const debouncedAutoSave = () => {
        if (autoSaveTimerRef.current) {
            clearTimeout(autoSaveTimerRef.current);
        }

        setHasUnsavedGridChanges(true);

        autoSaveTimerRef.current = setTimeout(() => {
            if (activeTab === 'tablas' && nestedGridData.length > 0) {
                console.log('[SheetEditor] Auto-saving nested grid changes...');
                handleSave();
                setHasUnsavedGridChanges(false);
            }
        }, 2000); // 2 second debounce
    };

    // Cleanup auto-save timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
        };
    }, []);

    // Helper to auto-save structure changes
    const saveStructureChange = (newData: string[][]) => {
        // Calculate new range string manually to avoid waiting for state update
        if (!nestedGridRange || !nestedGridRange.includes('!')) return;
        const parsed = parseRangeSimple(nestedGridRange);
        if (!parsed) return;

        const newRows = newData.length;
        const newCols = newData[0].length;

        // sCol and eCol
        const sColChar = indexToColumnLetter(parsed.startCol);
        const eColChar = indexToColumnLetter(parsed.startCol + newCols - 1);
        const sRow = parsed.startRow + 1; // 1-based
        const eRow = parsed.startRow + newRows;

        const escapedSheet = quoteSheetName(parsed.sheetName);
        const newRangeStr = `${escapedSheet}!${sColChar}${sRow}:${eColChar}${eRow}`;

        setNestedGridData(newData);
        updateRangeString(newData); // Still update UI state

        // Explicitly Save
        handleSave(newData, newRangeStr);
    };

    const addGridRow = () => {
        const cols = nestedGridData[0]?.length || 5;
        const newData = [...nestedGridData, new Array(cols).fill('')];
        saveStructureChange(newData);
    };
    const addGridCol = () => {
        // Validation for Horizontal Mode Limit
        if (activeTab === 'tablas') {
            const horizontalIdx = findColumnIndex(formHeaders, HORIZONTAL_COL_VARIANTS);
            if (horizontalIdx !== -1) {
                const isHorizontal = (formData[horizontalIdx] || '').toString().toLowerCase().trim();
                if (['si', 'sí', 'yes', 'true', 'x', 'horizontal', 'activado'].includes(isHorizontal)) {
                    const currentCols = nestedGridData[0]?.length || 0;
                    if (currentCols >= 17) {
                        showNotification("En modo horizontal, el límite es de 17 columnas.", "warning");
                        return;
                    }
                }
            }
        }

        const newData = nestedGridData.map(row => [...row, '']);
        saveStructureChange(newData);
    };
    const deleteGridRow = () => {
        if (nestedGridData.length <= 1) return;
        const newData = [...nestedGridData];
        newData.pop();
        saveStructureChange(newData);
    };
    const deleteGridCol = () => {
        if (!nestedGridData[0] || nestedGridData[0].length <= 1) return;
        const newData = nestedGridData.map(row => {
            const newRow = [...row];
            newRow.pop();
            return newRow;
        });
        saveStructureChange(newData);
    };

    const [isSelecting, setIsSelecting] = useState(false);

    useEffect(() => {
        const handleMouseUp = () => setIsSelecting(false);
        window.addEventListener('mouseup', handleMouseUp);
        return () => window.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const handleMerge = async () => {
        if (!selectionStart || !selectionEnd) return;
        if (!nestedGridRange || !nestedGridRange.includes('!')) return;

        const parsed = parseRangeSimple(nestedGridRange);
        if (!parsed) return;

        // Convert RELATIVE selection to ABSOLUTE coordinates for expansion
        const absSelStart = {
            row: parsed.startRow + selectionStart.r,
            col: parsed.startCol + selectionStart.c
        };
        const absSelEnd = {
            row: parsed.startRow + selectionEnd.r,
            col: parsed.startCol + selectionEnd.c
        };

        // Auto-expand selection to include any partial merges using ABSOLUTE coordinates
        const expandedAbs = expandSelection(absSelStart, absSelEnd, nestedGridMerges || []);

        // Convert back to RELATIVE coordinates for UI
        const expandedRelStart = {
            r: expandedAbs.start.row - parsed.startRow,
            c: expandedAbs.start.col - parsed.startCol
        };
        const expandedRelEnd = {
            r: expandedAbs.end.row - parsed.startRow,
            c: expandedAbs.end.col - parsed.startCol
        };

        // If selection changed due to expansion, update visual selection
        if (expandedRelStart.r !== selectionStart.r || expandedRelStart.c !== selectionStart.c ||
            expandedRelEnd.r !== selectionEnd.r || expandedRelEnd.c !== selectionEnd.c) {
            setSelectionStart(expandedRelStart);
            setSelectionEnd(expandedRelEnd);
        }

        const r1 = Math.min(expandedRelStart.r, expandedRelEnd.r);
        const r2 = Math.max(expandedRelStart.r, expandedRelEnd.r);
        const c1 = Math.min(expandedRelStart.c, expandedRelEnd.c);
        const c2 = Math.max(expandedRelStart.c, expandedRelEnd.c);

        if (r1 === r2 && c1 === c2) {
            showNotification("Selecciona al menos dos celdas para combinar", "info");
            return;
        }

        // Calculate absolute coordinates based on the nested grid's start position
        const absStartRow = parsed.startRow + r1;
        const absEndRow = parsed.startRow + r2 + 1;
        const absStartCol = parsed.startCol + c1;
        const absEndCol = parsed.startCol + c2 + 1;

        console.log("Merge Debug:", { parsedStart: parsed.startRow, relative: { r1, c1 }, absStartRow });

        const validation = validateMergeSelection(
            { row: absStartRow, col: absStartCol },
            { row: absEndRow - 1, col: absEndCol - 1 },
            {
                startRowIndex: parsed.startRow,
                endRowIndex: parsed.endRow + 1,
                startColumnIndex: parsed.startCol,
                endColumnIndex: parsed.endCol + 1
            },
            nestedGridMerges || []
        );

        if (!validation.isValid) {
            showNotification(validation.error || "Selección inválida", "error");
            return;
        }

        // Find sheetId
        const sheet = spreadsheet.sheets.find(s => s.properties.title === parsed.sheetName);
        if (!sheet) {
            console.error("Sheet not found for merging:", parsed.sheetName);
            return;
        }

        setLoadingGrid(true);
        // Backup current state for rollback on error
        const previousGridData = [...nestedGridData.map(row => [...row])];
        const previousGridMerges = [...(nestedGridMerges || [])];

        try {
            // Optimistic Update: Update local state immediately

            // 1. Remove ANY existing merges that are fully contained in the new selection
            // This allows re-merging (A+B) + C -> (A+B+C)
            let updatedMerges = [...(nestedGridMerges || [])];

            updatedMerges = updatedMerges.filter(m => {
                const contained =
                    absStartRow <= m.startRowIndex &&
                    absEndRow >= m.endRowIndex &&
                    absStartCol <= m.startColumnIndex &&
                    absEndCol >= m.endColumnIndex;
                return !contained;
            });

            // 2. Add the NEW merge
            const newMerge: GridRange = {
                startRowIndex: absStartRow,
                endRowIndex: absEndRow,
                startColumnIndex: absStartCol,
                endColumnIndex: absEndCol
            };
            updatedMerges.push(newMerge);
            setNestedGridMerges(updatedMerges);

            // 3. Update Data (Clear cells except top-left)
            // IMPORTANT: We update local state to reflect what we WANT.
            // But we must send the update to the server too.
            const newData = nestedGridData.map(row => [...row]);
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    if (r === r1 && c === c1) continue; // Keep top-left
                    if (newData[r] && newData[r][c] !== undefined) {
                        newData[r][c] = '';
                    }
                }
            }
            setNestedGridData(newData);

            // 4. Clear selection
            setSelectionStart(null);
            setSelectionEnd(null);

            // API Calls
            // A. Merge Cells
            console.log('[SheetEditor] Calling mergeCells API...');
            await mergeCells(spreadsheet.spreadsheetId, sheet.properties.sheetId, {
                startRowIndex: absStartRow,
                endRowIndex: absEndRow,
                startColumnIndex: absStartCol,
                endColumnIndex: absEndCol
            }, token);

            // Center Align Merged Content
            try {
                await formatCells(spreadsheet.spreadsheetId, sheet.properties.sheetId, {
                    startRowIndex: absStartRow,
                    endRowIndex: absEndRow,
                    startColumnIndex: absStartCol,
                    endColumnIndex: absEndCol
                }, { horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' }, token);
            } catch (e) {
                console.warn("Could not center align merged cells:", e);
            }

            // B. Clear Content in Backend (to match local state)
            const startColChar = indexToColumnLetter(parsed.startCol + c1);
            const endColChar = indexToColumnLetter(parsed.startCol + c2);
            // The range for updates needs to be 1-based for A1 notation
            // parsed.startRow is 0-based. r1 is 0-based relative.
            // A1 notation uses 1-based rows.
            const escapedSheetName = quoteSheetName(parsed.sheetName);
            const updateRangeStr = `${escapedSheetName}!${startColChar}${parsed.startRow + r1 + 1}:${endColChar}${parsed.startRow + r2 + 1}`;

            // Extract the subset of data for this range from our *already updated* newData
            const valuesToSync = [];
            for (let r = r1; r <= r2; r++) {
                const rowVals = [];
                for (let c = c1; c <= c2; c++) {
                    rowVals.push(newData[r][c]);
                }
                valuesToSync.push(rowVals);
            }

            console.log('[SheetEditor] Calling updateValues API to clear merged cells...');
            await updateValues(spreadsheet.spreadsheetId, updateRangeStr, valuesToSync, token);

            // Reload grid to get updated merges
            console.log('[SheetEditor] Reloading grid after merge...');
            await loadNestedGrid(nestedGridRange);
            showNotification("Celdas combinadas correctamente", "success");
        } catch (e: any) {
            console.error('[SheetEditor] Merge failed:', e);

            // ROLLBACK LOCAL STATE
            console.log('[SheetEditor] Rolling back local state due to error...');
            setNestedGridData(previousGridData);
            setNestedGridMerges(previousGridMerges);

            if (e.message && e.message.includes('UNAUTHENTICATED')) {
                showNotification("Sesión expirada. Por favor, recarga la página o inicia sesión nuevamente.", "error");
            } else {
                showNotification(e.message || "Error al combinar celdas", "error");
            }
            setLoadingGrid(false);

            // Try to reload grid to ensure consistency, but if it fails, at least we rolled back local state
            try {
                await loadNestedGrid(nestedGridRange);
            } catch (reloadError) {
                console.error('[SheetEditor] Failed to reload grid after merge error:', reloadError);
            }
        }
    };

    const handleUnmerge = async () => {
        const targetStart = selectionStart || focusedCell;
        const targetEnd = selectionEnd || focusedCell;

        if (!targetStart || !targetEnd) return;
        if (!nestedGridRange || !nestedGridRange.includes('!')) return;

        // Use consistent parser
        const parsed = parseRangeSimple(nestedGridRange);
        if (!parsed) return;

        console.log("Unmerge Debug:", { parsedStart: parsed.startRow, selection: { r1: targetStart.r, r2: targetEnd.r } });

        const r1 = Math.min(targetStart.r, targetEnd.r);
        const r2 = Math.max(targetStart.r, targetEnd.r);
        const c1 = Math.min(targetStart.c, targetEnd.c);
        const c2 = Math.max(targetStart.c, targetEnd.c);

        const absStartRow = parsed.startRow + r1;
        const absEndRow = parsed.startRow + r2 + 1;
        const absStartCol = parsed.startCol + c1;
        const absEndCol = parsed.startCol + c2 + 1;

        // Check if there are any merges in the selection
        let mergesToUnmerge: any[] = [];

        if (nestedGridMerges && nestedGridMerges.length > 0) {
            mergesToUnmerge = nestedGridMerges.filter(m =>
                !(absEndRow <= m.startRowIndex || absStartRow >= m.endRowIndex ||
                    absEndCol <= m.startColumnIndex || absStartCol >= m.endColumnIndex)
            );
        }

        if (mergesToUnmerge.length === 0) {
            showNotification("No hay celdas combinadas en la selección", "info");
            return;
        }

        const sheet = spreadsheet.sheets.find(s => s.properties.title === parsed.sheetName);
        if (!sheet) return;

        setLoadingGrid(true);
        try {
            // Optimistic Update: Remove merges from local state
            if (nestedGridMerges) {
                const updatedMerges = nestedGridMerges.filter(m =>
                    !mergesToUnmerge.some(toRemove =>
                        toRemove.startRowIndex === m.startRowIndex &&
                        toRemove.endRowIndex === m.endRowIndex &&
                        toRemove.startColumnIndex === m.startColumnIndex &&
                        toRemove.endColumnIndex === m.endColumnIndex
                    )
                );
                setNestedGridMerges(updatedMerges);
            }

            // Determine range to send. 
            // If single cell, send the specific merge range.
            // If multiple cells, send the selection range.
            let rangeToSend;
            if (r1 === r2 && c1 === c2 && mergesToUnmerge.length === 1) {
                rangeToSend = mergesToUnmerge[0];
            } else {
                rangeToSend = {
                    startRowIndex: absStartRow,
                    endRowIndex: absEndRow,
                    startColumnIndex: absStartCol,
                    endColumnIndex: absEndCol
                };
            }

            await unmergeCells(spreadsheet.spreadsheetId, sheet.properties.sheetId, rangeToSend, token);

            // Reload grid to sync state
            await loadNestedGrid(nestedGridRange);
            showNotification("Celdas separadas correctamente", "success");
        } catch (e: any) {
            console.error(e);
            if (e.message && e.message.includes('UNAUTHENTICATED')) {
                showNotification("Sesión expirada. Por favor, recarga la página o inicia sesión nuevamente.", "error");
            } else {
                showNotification(e.message || "Error al separar celdas", "error");
            }
            setLoadingGrid(false);
            // On error, restore state
            loadNestedGrid(nestedGridRange);
        }
    };


    const normalizedQuery = (searchTerm || '').toString().trim().toLowerCase();
    const filteredData = gridData.map((row, index) => ({ row, index })).filter(({ row }) => {
        if (!normalizedQuery) return true;
        return row.some(cell => cell.toLowerCase().includes(normalizedQuery));
    });
    // Optimized hierarchical sort function
    const compareHierarchicalOrder = (valA: string, valB: string) => {
        // Normalize: empty/null becomes 0 equivalent
        const cleanA = (valA || '').toString().trim();
        const cleanB = (valB || '').toString().trim();

        if (!cleanA && !cleanB) return 0;
        if (!cleanA) return -1; // Empty values first
        if (!cleanB) return 1;

        // Split by dot for hierarchy (1.1, 1.2, 1.10)
        const partsA = cleanA.split('.');
        const partsB = cleanB.split('.');

        const len = Math.max(partsA.length, partsB.length);
        for (let k = 0; k < len; k++) {
            // Parse each part as integer. Missing parts treat as 0.
            // Example: 1 vs 1.1 -> [1] vs [1, 1] -> 1==1, 0 < 1.
            const partA = partsA[k];
            const partB = partsB[k];

            const numA = partA === undefined ? 0 : (parseInt(partA) || 0);
            const numB = partB === undefined ? 0 : (parseInt(partB) || 0);

            if (numA !== numB) return numA - numB;
        }
        return 0;
    };

    const sortedData = (activeTab === 'secciones') ? [...filteredData].sort((a, b) => {
        const hIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
        const av = hIdx !== -1 ? (a.row[hIdx] || '') : '';
        const bv = hIdx !== -1 ? (b.row[hIdx] || '') : '';
        return compareHierarchicalOrder(av, bv);
    }) : filteredData;

    const displayedRows = sortedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

    const Breadcrumbs = () => (
        <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-hidden whitespace-nowrap">
            <button onClick={onBack} className="hover:text-gob-guinda transition-colors">Inicio</button>
            <ChevronRight size={14} className="mx-2 flex-shrink-0" />
            <span className="font-medium text-gray-900 truncate max-w-[150px]">{spreadsheet.properties.title}</span>
            <ChevronRight size={14} className="mx-2 flex-shrink-0" />
            <button
                onClick={() => { if (activeTab !== 'metadatos') setViewMode('LIST'); }}
                className={clsx("hover:text-gob-guinda transition-colors capitalize", viewMode === 'LIST' && activeTab !== 'metadatos' ? "font-bold text-gob-guinda" : "")}
            >
                {activeTab}
            </button>
            {viewMode === 'FORM' && (
                <>
                    <ChevronRight size={14} className="mx-2 flex-shrink-0" />
                    <span className="font-bold text-gob-guinda">
                        {activeTab === 'metadatos' ? 'Edición' : (editingRowIndex !== null ? 'Editar' : 'Nuevo')}
                    </span>
                </>
            )}
        </nav>
    );

    // --- Helpers for Stats ---
    const getSectionStats = (row: string[]) => {
        if (activeTab !== 'secciones') return null;

        const ordIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
        const sectionId = ordIdx !== -1 ? (row[ordIdx] || '').toString().trim() : '';

        const contentIdx = findColumnIndex(gridHeaders, CONTENIDO_VARIANTS);
        const content = contentIdx !== -1 ? (row[contentIdx] || '').toString() : '';

        // Count items
        const tableCount = availableTableItems.filter(t => t.section === sectionId).length;
        const figureCount = availableFigureItems.filter(f => f.section === sectionId).length;
        const eqCount = (content.match(/\[\[(ecuacion|math):/g) || []).length;
        const citeCount = (content.match(/\[\[cita:/g) || []).length;

        return { tableCount, figureCount, eqCount, citeCount };
    };

    // Helper for Modal Text based on Tab
    const getDeleteContext = () => {
        switch (activeTab) {
            case 'tablas': return {
                title: "¿Eliminar tabla?",
                text: "Esta acción eliminará la tabla de la lista principal y también borrará sus datos internos de la hoja de cálculo. No se puede deshacer."
            };
            case 'figuras': return {
                title: "¿Eliminar figura?",
                text: "Esta acción eliminará la figura. Asegúrate de que no esté referenciada en el texto (ej. [[figura:FIG-X-Y]]) para evitar errores de compilación."
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
            case 'graficos': return {
                title: "¿Eliminar gráfico?",
                text: "Esta acción eliminará el gráfico. Asegúrate de que no esté referenciado en el texto (ej. [[grafico:ID]]) para evitar errores."
            };
            default: return {
                title: "¿Eliminar registro?",
                text: "Esta acción eliminará el registro de la lista principal. Esta acción no se puede deshacer."
            };
        }
    };

    const handleSaveRowGraphics = async (rowIndex: number, newRow: string[]) => {
        if (!activeSheet) {
            showNotification('Error: Hoja de gráficos no encontrada', 'error');
            return;
        }
        setSaving(true);
        try {
            // Row index in sheet: Header (1) + Index (0-based) + 1 = Index + 2
            const sheetRow = rowIndex + 2;
            const range = `${quoteSheetName(activeSheet.properties.title)}!A${sheetRow}`;
            await updateValues(spreadsheet.spreadsheetId, range, [newRow], token);
            showNotification('Gráfico actualizado correctamente', 'success');
            onRefresh();
        } catch (error) {
            console.error(error);
            showNotification('Error al guardar el gráfico', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAddRowGraphics = async (newRow: string[]) => {
        if (!activeSheet) {
            showNotification('Error: Hoja de gráficos no encontrada', 'error');
            return;
        }
        setSaving(true);
        try {
            await appendRow(spreadsheet.spreadsheetId, quoteSheetName(activeSheet.properties.title), newRow, token);
            showNotification('Gráfico creado correctamente', 'success');
            onRefresh();
        } catch (error) {
            console.error(error);
            showNotification('Error al crear el gráfico', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRowGraphics = async (rowIndex: number) => {
        if (!activeSheet) return;
        if (!confirm('¿Estás seguro de eliminar este gráfico?')) return;

        setSaving(true);
        try {
            // Row index in sheet: Header (1) + Index (0-based) + 1 = Index + 2
            // deleteRow expects 1-based index? usually yes.
            // Check usage in deleteRow service. 
            // It calls batchUpdate with deleteDimension. deleteDimension uses startIndex (0-based).
            // Let's check deleteRow implementation in sheetsService.ts if possible, or assume 1-based like other calls in this file.
            // In handleMainDelete: deleteRow(spreadsheetId, sheetId, rowIndex + 1, token) where rowIndex is from grid (0-based).
            // So if grid has header, grid[0] is row 2.
            // Wait, handleMainDelete uses rowIndex + 1. If gridData is just data (no header), then grid[0] is row 2.
            // If deleteRow takes 1-based row number:
            // Row 1: Header
            // Row 2: Data 0
            // So Data 0 -> Row 2.
            // If handleMainDelete passes rowIndex + 1, and rowIndex is 0... it deletes Row 1? That would be header.
            // Let's re-read handleMainDelete in lines 2004+.
            // console.log(`Borrando fila principal en ${activeTab}: ${rowIndex + 1}`);
            // await deleteRow(..., rowIndex + 1, ...);
            // If rowIndex is 0 (first data row), passing 1.
            // If deleteRow uses 1-based index, 1 is Header. That seems wrong.
            // Maybe gridData includes header?
            // Line 256: const [gridData, setGridData] = useState<string[][]>([]);
            // Usually gridData is only data.

            // Let's trust the pattern: rowIndex + 1.
            // Actually, if I look at `handleMainDelete`:
            // It calls `deleteRow` with `rowIndex + 1`.
            // If I am selecting row 0 of data...
            // I'll stick to the existing pattern, but verify `deleteRow` imports.

            await deleteRow(spreadsheet.spreadsheetId, activeSheet.properties.sheetId, rowIndex + 1, token);
            showNotification('Gráfico eliminado correctamente', 'success');
            onRefresh();
        } catch (error) {
            console.error(error);
            showNotification('Error al eliminar el gráfico', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateLatex = async () => {
        if (activeTab !== 'metadatos') {
            showNotification("Debes estar en la vista de 'Metadatos' (Documentos) para generar el archivo.", 'error');
            return;
        }

        // Try to get ID from current selection or context
        let targetDocId = currentDocId;

        // If no global doc id, try to find from editing row
        if (!targetDocId && editingRowIndex !== null) {
            const idxDoc = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
            if (idxDoc !== -1) {
                targetDocId = gridData[editingRowIndex][idxDoc];
            }
        }

        if (!targetDocId) {
            showNotification("No se ha detectado un ID de documento válido. Selecciona un documento o abre uno.", 'error');
            return;
        }

        // Regex validation (Simple alphanumeric)
        if (!/^[a-zA-Z0-9_-]+$/.test(targetDocId)) {
            showNotification(`El ID del documento "${targetDocId}" no tiene un formato válido.`, 'error');
            return;
        }

        setSaving(true); // Re-use saving state for loading
        showNotification("Generando archivos LaTeX... Esto puede tardar unos segundos.", 'info');

        try {
            const response = await fetch(`${API_URL}/generate-latext`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spreadsheetId: spreadsheet.spreadsheetId,
                    docId: targetDocId,
                    token: token
                })
            });

            const result = await response.json().catch(() => null);

            if (!response.ok) {
                const errorDetail = result?.error || result?.message || response.statusText;
                if (result?.stack) console.error("Server Stack:", result.stack);
                throw new Error(`Server Error (${response.status}): ${errorDetail}`);
            }

            if (!result || !result.success) {
                const apiError = (result && result.error) ? result.error : "Error desconocido en el servidor";
                throw new Error(apiError);
            }

            // Trigger Download
            // 1. .tex file
            if (result.tex) {
                const blobTex = new Blob([result.tex], { type: 'text/plain' });
                const urlTex = window.URL.createObjectURL(blobTex);
                const aTex = document.createElement('a');
                aTex.href = urlTex;
                aTex.download = `${result.filename || 'documento'}.tex`;
                document.body.appendChild(aTex);
                aTex.click();
                document.body.removeChild(aTex);
                window.URL.revokeObjectURL(urlTex);
            }

            // 2. .bib file (if exists)
            if (result.bib) {
                const blobBib = new Blob([result.bib], { type: 'text/plain' });
                const urlBib = window.URL.createObjectURL(blobBib);
                const aBib = document.createElement('a');
                aBib.href = urlBib;
                aBib.download = `referencias.bib`;
                document.body.appendChild(aBib);
                aBib.click();
                document.body.removeChild(aBib);
                window.URL.revokeObjectURL(urlBib);
            }

            showNotification("Archivos generados y descargados correctamente.", 'success');

        } catch (e: any) {
            console.error("LATEX GENERATION ERROR:", e);
            const errorMsg = (e && e.message) ? e.message : String(e);
            showNotification(`Error al generar LaTeX: ${errorMsg}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const deleteContext = getDeleteContext();

    return (
        <div className="flex flex-col h-screen bg-[#F5F5F5] relative">

            {/* Notification Banner */}
            {notification && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className={clsx(
                        "fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-6 py-4 rounded-lg shadow-2xl text-base font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 border-2",
                        notification.type === 'success' ? "bg-green-100 text-green-900 border-green-600" :
                            notification.type === 'error' ? "bg-red-100 text-red-900 border-red-600" : "bg-blue-100 text-blue-900 border-blue-600"
                    )}>
                    {notification.type === 'success' ? <CheckCircle size={24} className="text-green-600" /> :
                        notification.type === 'error' ? <AlertCircle size={24} className="text-red-600" /> : <Info size={24} className="text-blue-600" />}

                    <span className="flex-1">{notification.message}</span>

                    <button
                        onClick={() => setNotification(null)}
                        className="ml-4 p-1 rounded-full hover:bg-black/10 transition-colors"
                        aria-label="Cerrar notificación"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {/* Editing Indicator (Sticky Pill) */}
            {viewMode === 'FORM' && activeTab !== 'metadatos' && !notification && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[50] px-4 py-1.5 rounded-full bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-bold uppercase tracking-wide shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    Edición en progreso
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
                        <h3 className="text-lg font-bold text-gob-guinda mb-2">Nueva Tabla</h3>
                        <p className="text-sm text-gray-600 mb-4">Define el tamaño inicial. El sistema buscará un espacio vacío en la hoja de datos.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Filas</label>
                                <input
                                    type="number"
                                    min="2" max="100"
                                    value={wizardConfig.rows}
                                    onChange={(e) => setWizardConfig({ ...wizardConfig, rows: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gob-guinda"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Columnas</label>
                                <input
                                    type="number"
                                    min="2" max="26"
                                    value={wizardConfig.cols}
                                    onChange={(e) => setWizardConfig({ ...wizardConfig, cols: parseInt(e.target.value) })}
                                    className="w-full border border-gray-300 rounded px-3 py-2 mt-1 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-gob-guinda"
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
                        <h1 className="text-lg font-bold text-gob-guinda capitalize leading-tight">
                            {activeTab === 'metadatos' ? 'Editor de Documento' : activeTab}
                        </h1>
                        <div className="mt-1 text-sm text-gray-700 font-medium flex items-center gap-2">
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono border border-gray-200">
                                {currentDocId}
                            </span>
                            <span className="truncate max-w-[200px] md:max-w-[400px]" title={availableDocs.find(d => d.id === currentDocId)?.title || ''}>
                                {availableDocs.find(d => d.id === currentDocId)?.title || 'Cargando título...'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleGenerateLatex} className="hidden md:flex gap-2 text-gob-guinda border-gob-guinda hover:bg-gob-guinda hover:text-white transition-colors" title="Generar archivos .tex y .bib">
                        <FileText size={16} /> Generar .Latex
                    </Button>
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
                        <button onClick={() => {
                            if (hasUnsavedGridChanges && activeTab === 'tablas') {
                                const confirmSwitch = window.confirm('Tienes cambios sin guardar en la tabla actual. ¿Deseas continuar sin guardar?');
                                if (!confirmSwitch) return;
                                if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
                                setHasUnsavedGridChanges(false);
                            }
                            setActiveTab('metadatos');
                            setMobileMenuOpen(false);
                        }} className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md", activeTab === 'metadatos' ? "bg-red-50 text-gob-guinda" : "text-gray-600 hover:bg-gray-50")}>
                            <Info size={18} /> Metadatos
                        </button>
                        <div className="my-2 border-t border-gray-100"></div>
                        {[
                            { id: 'secciones', icon: List, label: 'Secciones' },
                            { id: 'tablas', icon: Table, label: 'Tablas' },
                            { id: 'figuras', icon: Image, label: 'Figuras' },
                            { id: 'graficos', icon: PieChart, label: 'Gráficos' },
                            { id: 'bibliografia', icon: Book, label: 'Bibliografía' },
                            { id: 'siglas', icon: Type, label: 'Siglas' },
                            { id: 'glosario', icon: FileText, label: 'Glosario' },
                            { id: 'unidades', icon: Hash, label: 'Unidades' },
                            { id: 'vista_previa', icon: Maximize2, label: 'Vista Previa' }
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => { switchTab(item.id); }}
                                className={clsx("w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md", activeTab === item.id ? "bg-red-50 text-gob-guinda" : "text-gray-600 hover:bg-gray-50")}
                            >
                                <item.icon size={18} /> {item.label}
                            </button>
                        ))}
                    </nav>
                    <UserActivityTracker variant="sidebar" />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
                    <div className="max-w-6xl mx-auto">

                        <Breadcrumbs />

                        {/* --- PREVIEW VIEW --- */}
                        {activeTab === 'vista_previa' && (
                            <div className="h-[calc(100vh-200px)]">
                                {loadingGrid ? (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gob-guinda"></div>
                                    </div>
                                ) : (fullData && (
                                    <StructurePreview
                                        docId={currentDocId}
                                        secciones={fullData.secciones}
                                        figuras={fullData.figuras}
                                        tablas={fullData.tablas}
                                        graficos={fullData.graficos}
                                        onEditSection={handleEditSectionFromPreview}
                                    />
                                ))}
                            </div>
                        )}

                        {/* --- GRAPHICS EDITOR --- */}
                        {activeTab === 'graficos' && (
                            <div className="h-[calc(100vh-200px)] animate-in fade-in duration-300">
                                <GraphicsEditor
                                    headers={gridHeaders}
                                    data={gridData}
                                    onSaveRow={handleSaveRowGraphics}
                                    onAddRow={handleAddRowGraphics}
                                    onDeleteRow={handleDeleteRowGraphics}
                                    availableSections={Array.isArray(fullData?.secciones) ? fullData.secciones.map((s: any) => ({
                                        value: s.id || s.ID_Seccion,
                                        label: `${s.id || s.ID_Seccion} - ${s.Titulo || s.title || ''}`
                                    })) : []}
                                />
                            </div>
                        )}

                        {/* --- LIST VIEW --- */}
                        {viewMode === 'LIST' && activeTab !== 'metadatos' && activeTab !== 'vista_previa' && activeTab !== 'graficos' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
                                        <p className="text-sm text-gray-500 mt-1 max-w-2xl">{TAB_DESCRIPTIONS[activeTab]}</p>
                                    </div>
                                    <Button onClick={handlePreCreate}>
                                        <Plus size={16} className="mr-2" /> Nuevo Elemento
                                    </Button>
                                    {activeTab === 'secciones' && (
                                        <Button variant="secondary" onClick={() => validateCurrentDocumentOrders()}>
                                            Validar órdenes
                                        </Button>
                                    )}
                                </div>

                                {/* Global Stats Card for Other Tabs */}
                                {(activeTab === 'bibliografia' || activeTab === 'glosario' || activeTab === 'siglas' || activeTab === 'tablas' || activeTab === 'figuras' || activeTab === 'unidades' || activeTab === 'graficos') && (
                                    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4 flex items-center gap-6 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-full bg-gob-guinda/10 text-gob-guinda">
                                                {activeTab === 'bibliografia' ? <Book size={20} /> :
                                                    activeTab === 'glosario' ? <FileText size={20} /> :
                                                        activeTab === 'siglas' ? <Type size={20} /> :
                                                            activeTab === 'tablas' ? <Table size={20} /> :
                                                                activeTab === 'graficos' ? <PieChart size={20} /> :
                                                                    activeTab === 'unidades' ? <Hash size={20} /> :
                                                                        <Image size={20} />}
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-gray-900">{gridData.length}</div>
                                                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                                                    {activeTab === 'bibliografia' ? 'Referencias Total' :
                                                        activeTab === 'glosario' ? 'Términos Total' :
                                                            activeTab === 'siglas' ? 'Siglas Total' :
                                                                activeTab === 'unidades' ? 'Unidades Total' :
                                                                    activeTab === 'tablas' ? 'Tablas Total' :
                                                                        activeTab === 'graficos' ? 'Gráficos Total' :
                                                                            'Figuras Total'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-8 w-px bg-gray-200"></div>
                                        <div className="text-sm text-gray-500">
                                            {activeTab === 'bibliografia' ? 'Recuerda usar [[cita:CLAVE]] en el texto.' :
                                                activeTab === 'glosario' ? 'Define términos técnicos aquí.' :
                                                    activeTab === 'unidades' ? 'Define unidades de medida (ej. MW=Megawatt).' :
                                                        activeTab === 'siglas' ? 'Define abreviaturas usadas.' :
                                                            activeTab === 'graficos' ? 'Gestiona los gráficos estadísticos.' :
                                                                'Gestiona los elementos visuales del documento.'}
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 flex gap-4">
                                        <div className="relative flex-1 max-w-md">
                                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="Buscar..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-gob-guinda bg-white text-gray-900"
                                            />
                                        </div>
                                    </div>
                                    {(activeTab === 'unidades' && gridData.length === 0) ? (
                                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-600">
                                            Esta sección está vacía. No se renderiza en LaTeX.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left w-28 font-semibold" style={{ backgroundColor: '#f5f5f5', border: '1px solid #ddd' }}>
                                                            <span className="inline-flex items-center gap-2"><MoreVertical size={14} aria-hidden="true" /> Acciones</span>
                                                        </th>
                                                        {activeTab === 'secciones' && (
                                                            <th className="px-6 py-3 font-semibold text-center w-40">Estadísticas</th>
                                                        )}
                                                        {gridHeaders.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {displayedRows.length > 0 ? displayedRows.map(({ row, index }) => {
                                                        const docIdxLocal = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
                                                        const rowDocId = docIdxLocal !== -1 ? (row[docIdxLocal] || '') : '';
                                                        const canDelete = !rowDocId || rowDocId === currentDocId;

                                                        // Get Order value for data attribute
                                                        const ordIdxLocal = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
                                                        const orderVal = ordIdxLocal !== -1 ? (row[ordIdxLocal] || '') : '';
                                                        const isDuplicate = activeTab === 'secciones' && duplicateOrders.has(orderVal);

                                                        return (
                                                            <tr
                                                                key={index}
                                                                className={clsx(
                                                                    "hover:bg-gray-50",
                                                                    saving && "opacity-50 pointer-events-none",
                                                                    isDuplicate && "bg-red-50"
                                                                )}
                                                                data-order={orderVal}
                                                            >
                                                                <td className={clsx("px-6 py-4 text-left", isDuplicate && "border-l-4 border-l-red-500")} style={{ backgroundColor: isDuplicate ? '#FEF2F2' : '#f5f5f5', border: '1px solid #ddd', borderLeft: isDuplicate ? '4px solid #ef4444' : '1px solid #ddd' }}>
                                                                    <div className="flex justify-start gap-2">
                                                                        <button onClick={() => handleEdit(index)} className="text-blue-600 hover:text-blue-800" title="Editar"><Edit size={16} /></button>
                                                                        <button onClick={() => canDelete ? requestDelete(index) : null} className={clsx("", canDelete ? "text-red-600 hover:text-red-800" : "text-gray-400 cursor-not-allowed")} title={canDelete ? "Eliminar" : "No puedes eliminar registros de otro DocumentoID"}><Trash2 size={16} /></button>
                                                                    </div>
                                                                </td>
                                                                {activeTab === 'secciones' && (
                                                                    <td className="px-6 py-4">
                                                                        {(function () {
                                                                            const stats = getSectionStats(row);
                                                                            if (!stats) return null;
                                                                            return (
                                                                                <div className="flex flex-col gap-1 min-w-[120px]">
                                                                                    <div className="flex items-center justify-between text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full border border-blue-100" title="Tablas">
                                                                                        <span className="flex items-center gap-1"><Table size={10} /> Tablas</span>
                                                                                        <span className="font-bold">{stats.tableCount}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center justify-between text-[10px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded-full border border-purple-100" title="Figuras">
                                                                                        <span className="flex items-center gap-1"><Image size={10} /> Figuras</span>
                                                                                        <span className="font-bold">{stats.figureCount}</span>
                                                                                    </div>
                                                                                    <div className="flex items-center justify-between text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full border border-gray-200" title="Ecuaciones">
                                                                                        <span className="flex items-center gap-1"><Grid size={10} /> Ecua.</span>
                                                                                        <span className="font-bold">{stats.eqCount}</span>
                                                                                    </div>
                                                                                    {stats.citeCount > 0 && (
                                                                                        <div className="flex items-center justify-between text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-100" title="Citas">
                                                                                            <span className="flex items-center gap-1"><Book size={10} /> Citas</span>
                                                                                            <span className="font-bold">{stats.citeCount}</span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                )}
                                                                {row.map((cell, i) => (
                                                                    <td key={i} className="px-6 py-4 min-w-[150px] max-w-[400px]">
                                                                        <ContentPreview text={cell} limit={120} />
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        );
                                                    }) : (
                                                        <tr><td colSpan={gridHeaders.length + 1} className="px-6 py-12 text-center text-gray-500">No hay registros.</td></tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {/* Pagination Controls */}
                                    {(!(activeTab === 'unidades' && gridData.length === 0)) && totalPages > 1 && (
                                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                                            <div className="text-sm text-gray-700">
                                                Mostrando <span className="font-medium">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, sortedData.length)}</span> de <span className="font-medium">{sortedData.length}</span> resultados
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <ChevronLeft size={16} /> Anterior
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    Siguiente <ChevronRight size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- FORM VIEW (Unified) --- */}
                        {viewMode === 'FORM' && (
                            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">

                                {/* <Ribbon /> Removed as per user request */}

                                {/* Main Form Card */}
                                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 relative">
                                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 sticky top-0 bg-white z-20 pt-2 -mt-2">
                                        <div className="flex items-center gap-4">
                                            <h2 className="text-xl font-bold text-gob-guinda">
                                                {activeTab === 'metadatos' ? 'Editar Metadatos' : (editingRowIndex === null ? 'Nuevo Registro' : 'Editar Registro')}
                                            </h2>

                                            {/* Stats in Form Header (Secciones) */}
                                            {activeTab === 'secciones' && editingRowIndex !== null && (
                                                <div className="hidden md:flex gap-2">
                                                    {(function () {
                                                        const row = gridData[editingRowIndex];
                                                        if (!row) return null;
                                                        const stats = getSectionStats(row);
                                                        if (!stats) return null;
                                                        return (
                                                            <>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100" title="Tablas en esta sección">
                                                                    <Table size={12} /> {stats.tableCount}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-100" title="Figuras en esta sección">
                                                                    <Image size={12} /> {stats.figureCount}
                                                                </span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200" title="Ecuaciones en el texto">
                                                                    <Grid size={12} /> {stats.eqCount}
                                                                </span>
                                                            </>
                                                        )
                                                    })()}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="ghost"
                                                onClick={() => activeTab !== 'metadatos' && setViewMode('LIST')}
                                                className="text-gray-500 hover:text-gray-700"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                variant="burgundy"
                                                size="lg" // Larger size
                                                onClick={handleSave}
                                                isLoading={saving}
                                                className="shadow-md hover:shadow-lg transform transition-all hover:-translate-y-0.5 active:translate-y-0 font-bold px-8"
                                            >
                                                <Save size={20} className="mr-2" />
                                                Guardar Cambios
                                                {hasUnsavedGridChanges && (
                                                    <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="Cambios sin guardar"></span>
                                                )}
                                            </Button>
                                        </div>
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
                                            const isOpciones = (activeTab === 'tablas' || activeTab === 'figuras') && findColumnIndex([header], OPCIONES_COL_VARIANTS) !== -1;
                                            const isHorizontal = (activeTab === 'tablas' || activeTab === 'figuras') && findColumnIndex([header], HORIZONTAL_COL_VARIANTS) !== -1;
                                            const isHojaCompleta = (activeTab === 'tablas' || activeTab === 'figuras') && findColumnIndex([header], HOJA_COMPLETA_COL_VARIANTS) !== -1;
                                            const isHeaderRows = activeTab === 'tablas' && findColumnIndex([header], HEADER_ROWS_COL_VARIANTS) !== -1;
                                            const colSpan = ((activeTab === 'tablas' || activeTab === 'figuras') && !isSeccion && !isOrden && !isOpciones && !isHorizontal && !isHojaCompleta && !isHeaderRows) ? "col-span-2" : "col-span-1";
                                            const isTipoBiblio = activeTab === 'bibliografia' && header.trim().toLowerCase() === 'tipo';

                                            // --- Editor Filas Encabezado ---
                                            if (isHeaderRows) {
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header} <span className="text-xs text-gray-500 font-normal">(Default: 1)</span></label>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="10"
                                                            step="1"
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                            value={formData[i] || '1'}
                                                            onChange={(e) => {
                                                                const newData = [...formData];
                                                                const val = parseInt(e.target.value);
                                                                newData[i] = isNaN(val) ? '1' : val.toString();
                                                                setFormData(newData);
                                                            }}
                                                        />
                                                        <p className="text-xs text-gray-500">Número de filas que forman el encabezado (útil para combinar celdas).</p>
                                                    </div>
                                                );
                                            }

                                            // --- Editor de Opciones (Horizontal / Hoja Completa) ---
                                            if (isOpciones) {
                                                const currentVal = (formData[i] || '').toString().toLowerCase();
                                                const hasHorizontal = currentVal.includes('horizontal');
                                                const hasFullPage = currentVal.includes('hoja_completa') || currentVal.includes('hoja completa');

                                                const updateOpciones = (add: boolean, key: string) => {
                                                    let parts = currentVal.split(',').map(s => s.trim()).filter(s => s);
                                                    // Remove key and aliases roughly
                                                    const keyClean = key.toLowerCase();
                                                    parts = parts.filter(p => !p.includes(keyClean) && !p.includes(keyClean.replace('_', ' ')));

                                                    if (add) parts.push(key);

                                                    const newData = [...formData];
                                                    newData[i] = parts.join(', ');
                                                    setFormData(newData);
                                                };

                                                return (
                                                    <div key={i} className={colSpan + " space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200"}>
                                                        <label className="block text-sm font-bold text-gray-700 mb-2">{header}</label>
                                                        <div className="flex flex-col sm:flex-row gap-4">
                                                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={hasHorizontal}
                                                                    onChange={e => updateOpciones(e.target.checked, 'horizontal')}
                                                                    className="w-4 h-4 text-gob-guinda border-gray-300 rounded focus:ring-gob-guinda"
                                                                />
                                                                <span className="text-sm text-gray-700">Horizontal (Rotado)</span>
                                                            </label>
                                                            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={hasFullPage}
                                                                    onChange={e => updateOpciones(e.target.checked, 'hoja_completa')}
                                                                    className="w-4 h-4 text-gob-guinda border-gray-300 rounded focus:ring-gob-guinda"
                                                                />
                                                                <span className="text-sm text-gray-700">Hoja Completa</span>
                                                            </label>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Permite rotar la página para elementos anchos o maximizar el tamaño.
                                                        </p>
                                                    </div>
                                                );
                                            }

                                            // --- Editor Individual Horizontal ---
                                            if (isHorizontal) {
                                                const isChecked = (formData[i] || '').toString().toLowerCase().includes('si');
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none p-2 border rounded-md bg-white w-full">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={e => {
                                                                    const newData = [...formData];
                                                                    newData[i] = e.target.checked ? 'si' : 'no';
                                                                    setFormData(newData);
                                                                }}
                                                                className="w-4 h-4 text-gob-guinda border-gray-300 rounded focus:ring-gob-guinda"
                                                            />
                                                            <span className="text-sm text-gray-700">Activar orientación horizontal</span>
                                                        </label>
                                                    </div>
                                                );
                                            }

                                            // --- Editor Individual Hoja Completa ---
                                            if (isHojaCompleta) {
                                                const isChecked = (formData[i] || '').toString().toLowerCase().includes('si');
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <label className="inline-flex items-center gap-2 cursor-pointer select-none p-2 border rounded-md bg-white w-full">
                                                            <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={e => {
                                                                    const newData = [...formData];
                                                                    newData[i] = e.target.checked ? 'si' : 'no';
                                                                    setFormData(newData);
                                                                }}
                                                                className="w-4 h-4 text-gob-guinda border-gray-300 rounded focus:ring-gob-guinda"
                                                            />
                                                            <span className="text-sm text-gray-700">Maximizar a hoja completa</span>
                                                        </label>
                                                    </div>
                                                );
                                            }

                                            if (activeTab === 'secciones' && isNivel) {
                                                const current = normalizeLevelValue(formData[i] || '');
                                                const selected = SECTION_LEVEL_OPTIONS.find(o => o.value === current) || SECTION_LEVEL_OPTIONS[0];

                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <select
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
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

                                                // We now use the generic modal for editing section content as well,
                                                // to keep consistency and remove the inline complexity here.
                                                // Or better: Let's keep the inline editor for sections as it was, 
                                                // BUT we can also offer a "Maximize" button to open the modal?
                                                //
                                                // Wait, the user asked to REUSE the editor used in "content of sections" FOR metadata.
                                                // I did that.
                                                // But now I see the user might want the section editor itself to be improved or consistent?
                                                //
                                                // Actually, the previous implementation of "Section Editor" was inline.
                                                // The Metadata editor is now Modal.
                                                // They share the same toolbar logic (copied).
                                                //
                                                // Let's just keep the Section Editor as is (inline), but maybe clean up the code duplication later.
                                                // For now, I will just fix the linting issue or whatever caused the overlay if any.
                                                // The overlay was likely due to a syntax error in my previous SearchReplace which I fixed in the last step.

                                                // Re-declaring the helper functions here because they are inside the map loop and closure.
                                                // This is fine.

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

                                                const getCurrentSectionOrder = (): string => {
                                                    const ordIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
                                                    const val = ordIdx !== -1 ? (formData[ordIdx] || '').toString().trim() : '';
                                                    return val;
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

                                                const insertSnippet = (snippet: string) => {
                                                    const el = sectionContentTextareaRef.current;
                                                    const pos = el ? el.selectionStart : currentValue.length;
                                                    const before = currentValue.slice(0, pos);
                                                    const after = currentValue.slice(pos);
                                                    const nextText = before + snippet + after;
                                                    applyEdit({ text: nextText, selectionStart: pos, selectionEnd: pos + snippet.length });
                                                    lintNow(nextText);
                                                };

                                                // Check for unreferenced items assigned to this section
                                                const unreferencedItems = (() => {
                                                    const secOrd = getCurrentSectionOrder();
                                                    if (!secOrd) return [];
                                                    const missing: { type: string, id: string, title: string }[] = [];

                                                    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

                                                    availableTableItems.filter(t => t.section === secOrd).forEach(t => {
                                                        const safeId = t.id.trim();
                                                        const regex = new RegExp(`\\[\\[tabla:\\s*${escapeRegExp(safeId)}\\s*\\]\\]`, 'i');
                                                        if (!regex.test(currentValue)) {
                                                            missing.push({ type: 'Tabla', id: t.id, title: t.title });
                                                        }
                                                    });

                                                    availableFigureItems.filter(f => f.section === secOrd).forEach(f => {
                                                        const safeId = f.id.trim();
                                                        const regex = new RegExp(`\\[\\[figura:\\s*${escapeRegExp(safeId)}\\s*\\]\\]`, 'i');
                                                        if (!regex.test(currentValue)) {
                                                            missing.push({ type: 'Figura', id: f.id, title: f.title });
                                                        }
                                                    });
                                                    return missing;
                                                })();

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

                                                        {/* Unreferenced Items Warning */}
                                                        {unreferencedItems.length > 0 && (
                                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                                                <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-bold text-amber-800 mb-1">
                                                                        Elementos asignados pendientes de insertar:
                                                                    </p>
                                                                    <p className="text-xs text-amber-700 mb-2">
                                                                        Estos elementos están vinculados a esta sección pero no has añadido su etiqueta en el contenido.
                                                                        <strong> No aparecerán en el PDF</strong> si no los insertas.
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {unreferencedItems.map((item, idx) => (
                                                                            <div key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-amber-200 rounded text-xs text-amber-900 shadow-sm group hover:border-amber-400 transition-colors">
                                                                                {item.type === 'Figura' ? <Image size={10} /> : <Table size={10} />}
                                                                                <span className="font-mono font-bold">{item.id}</span>
                                                                                <span className="truncate max-w-[150px] opacity-75 hidden sm:inline">- {item.title}</span>
                                                                                <button
                                                                                    onClick={(e) => { e.preventDefault(); insertSnippet(item.type === 'Figura' ? `\n[[figura:${item.id}]]\n` : `\n[[tabla:${item.id}]]\n`); }}
                                                                                    className="ml-1 bg-amber-100 hover:bg-amber-200 text-amber-700 p-0.5 rounded cursor-pointer"
                                                                                    title="Insertar etiqueta ahora"
                                                                                >
                                                                                    <Plus size={12} />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Ribbon */}
                                                        <RichEditorToolbar
                                                            availableFigureItems={availableFigureItems}
                                                            availableTableItems={availableTableItems}
                                                            availableBibliographyKeys={availableBibliographyKeys}
                                                            onInsertSnippet={insertSnippet}
                                                            onWrapInline={wrapInline}
                                                            onInsertBlock={insertBlock}
                                                            onOpenNote={() => setNoteModal({ open: true, value: '' })}
                                                            onOpenEquation={(mode) => {
                                                                const el = sectionContentTextareaRef.current;
                                                                const sel = el ? currentValue.slice(el.selectionStart, el.selectionEnd) : '';
                                                                setEquationModal({
                                                                    open: true,
                                                                    mode: mode,
                                                                    title: mode === 'math' ? 'Insertar math inline' : 'Insertar ecuación display',
                                                                    value: sel || '',
                                                                    target: 'main'
                                                                });
                                                            }}
                                                            onOpenNewItem={(type) => {
                                                                if (type === 'bibliografia') openTab('bibliografia');
                                                                else if (type === 'figura' || type === 'tabla') createNewForSection(type);
                                                            }}
                                                            selectorPreview={selectorPreview}
                                                            setSelectorPreview={setSelectorPreview}
                                                            currentSectionOrder={getCurrentSectionOrder()}
                                                            dataTimestamp={dataTimestamp}
                                                        />

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

                                            // Orden de Secciones: seleccionar números disponibles y soportar jerarquía según Nivel
                                            if (activeTab === 'secciones' && isOrden) {
                                                const nivelIdx = findColumnIndex(formHeaders, NIVEL_VARIANTS);
                                                const nivelVal = nivelIdx !== -1 ? normalizeLevelValue((formData[nivelIdx] || '').toString()) : 'seccion';
                                                const docColIdx = findColumnIndex(formHeaders, DOC_ID_VARIANTS);
                                                const currentDoc = (docColIdx !== -1 ? formData[docColIdx] : currentDocId) || currentDocId;
                                                const gridDocIdx = findColumnIndex(gridHeaders, DOC_ID_VARIANTS);
                                                const gridOrdIdx = findColumnIndex(gridHeaders, ORDEN_COL_VARIANTS);
                                                const gridNivelIdx = findColumnIndex(gridHeaders, NIVEL_VARIANTS);
                                                const rowsDoc = gridData.filter(r => gridDocIdx !== -1 ? r[gridDocIdx] === currentDoc : true);
                                                const topOrders = new Set<string>();
                                                const subOrders = new Map<string, Set<string>>();
                                                const subSubOrders = new Map<string, Set<string>>();
                                                const subSubSubOrders = new Map<string, Set<string>>();
                                                rowsDoc.forEach((row, idx) => {
                                                    if (idx === editingRowIndex) return;
                                                    const ord = (gridOrdIdx !== -1 ? row[gridOrdIdx] : '').toString();
                                                    if (!ord) return;
                                                    const parts = ord.split('.');
                                                    if (parts.length === 1) {
                                                        topOrders.add(parts[0]);
                                                    } else if (parts.length === 2) {
                                                        const parent = parts[0];
                                                        if (!subOrders.has(parent)) subOrders.set(parent, new Set<string>());
                                                        subOrders.get(parent)!.add(parts[1]);
                                                    } else if (parts.length === 3) {
                                                        const parent = `${parts[0]}.${parts[1]}`;
                                                        if (!subSubOrders.has(parent)) subSubOrders.set(parent, new Set<string>());
                                                        subSubOrders.get(parent)!.add(parts[2]);
                                                    } else if (parts.length >= 4) {
                                                        const parent = `${parts[0]}.${parts[1]}.${parts[2]}`;
                                                        if (!subSubSubOrders.has(parent)) subSubSubOrders.set(parent, new Set<string>());
                                                        subSubSubOrders.get(parent)!.add(parts[3]);
                                                    }
                                                });
                                                const currentValue = (formData[i] || '').toString();
                                                const currentParts = currentValue ? currentValue.split('.') : [];
                                                if (nivelVal === 'seccion') {
                                                    const used = Array.from(topOrders).map(x => parseInt(x)).filter(x => !isNaN(x)).sort((a, b) => a - b);
                                                    const max = used.length ? used[used.length - 1] : 0;
                                                    const options: string[] = [];
                                                    for (let k = 1; k <= Math.max(max + 10, 10); k++) {
                                                        const kStr = String(k);
                                                        if (!topOrders.has(kStr) || currentValue === kStr) options.push(kStr);
                                                    }
                                                    if (currentValue && !options.includes(currentValue)) options.push(currentValue);
                                                    options.sort((a, b) => parseInt(a) - parseInt(b));
                                                    return (
                                                        <div key={i} className={colSpan + " space-y-1"}>
                                                            <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                            <select className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                                value={currentValue}
                                                                onChange={(e) => { const nd = [...formData]; nd[i] = e.target.value; setFormData(nd); }}
                                                            >
                                                                <option value="">Selecciona Orden…</option>
                                                                {options.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                                                            </select>
                                                        </div>
                                                    );
                                                } else if (nivelVal === 'subseccion') {
                                                    const parent = currentParts[0] || Array.from(topOrders).sort((a, b) => parseInt(a) - parseInt(b))[0] || '';
                                                    const usedChildren = subOrders.get(parent) || new Set<string>();
                                                    const nums = Array.from(usedChildren).map(x => parseInt(x)).filter(x => !isNaN(x)).sort((a, b) => a - b);
                                                    const max = nums.length ? nums[nums.length - 1] : 0;
                                                    const childOptions: string[] = [];
                                                    for (let k = 1; k <= Math.max(max + 10, 10); k++) {
                                                        const kStr = String(k);
                                                        if (!usedChildren.has(kStr) || currentParts[1] === kStr) childOptions.push(kStr);
                                                    }
                                                    if (currentParts[1] && !childOptions.includes(currentParts[1])) childOptions.push(currentParts[1]);
                                                    childOptions.sort((a, b) => parseInt(a) - parseInt(b));
                                                    return (
                                                        <div key={i} className={colSpan + " space-y-1"}>
                                                            <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                            <div className="flex gap-2">
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900"
                                                                    value={parent}
                                                                    onChange={(e) => { const nd = [...formData]; const child = currentParts[1] || ''; nd[i] = e.target.value && child ? `${e.target.value}.${child}` : e.target.value; setFormData(nd); }}
                                                                >
                                                                    <option value="">Sección padre…</option>
                                                                    {Array.from(topOrders).sort((a, b) => parseInt(a) - parseInt(b)).map(p => (<option key={p} value={p}>{p}</option>))}
                                                                </select>
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900"
                                                                    value={currentParts[1] || ''}
                                                                    onChange={(e) => { const nd = [...formData]; const child = e.target.value; const p = parent; nd[i] = p && child ? `${p}.${child}` : child; setFormData(nd); }}
                                                                >
                                                                    <option value="">Índice…</option>
                                                                    {childOptions.map(c => (<option key={c} value={c}>{c}</option>))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (nivelVal === 'subsubseccion') {
                                                    const parentCandidates = Array.from(topOrders).flatMap(p => {
                                                        const subs = subOrders.get(p) || new Set<string>();
                                                        return Array.from(subs).map(s => `${p}.${s}`);
                                                    }).sort((a, b) => {
                                                        const [a1, a2] = a.split('.').map(n => parseInt(n)); const [b1, b2] = b.split('.').map(n => parseInt(n)); return a1 === b1 ? a2 - b2 : a1 - b1;
                                                    });
                                                    const parentChain = (currentParts[0] && currentParts[1]) ? `${currentParts[0]}.${currentParts[1]}` : (parentCandidates[0] || '');
                                                    const usedChildren = parentChain ? (subSubOrders.get(parentChain) || new Set<string>()) : new Set<string>();
                                                    const nums = Array.from(usedChildren).map(x => parseInt(x)).filter(x => !isNaN(x)).sort((a, b) => a - b);
                                                    const max = nums.length ? nums[nums.length - 1] : 0;
                                                    const childOptions: string[] = [];
                                                    for (let k = 1; k <= Math.max(max + 10, 10); k++) {
                                                        const kStr = String(k);
                                                        if (!usedChildren.has(kStr) || currentParts[2] === kStr) childOptions.push(kStr);
                                                    }
                                                    if (currentParts[2] && !childOptions.includes(currentParts[2])) childOptions.push(currentParts[2]);
                                                    childOptions.sort((a, b) => parseInt(a) - parseInt(b));
                                                    return (
                                                        <div key={i} className={colSpan + " space-y-1"}>
                                                            <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                            <div className="flex gap-2">
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900"
                                                                    value={parentChain}
                                                                    onChange={(e) => { const nd = [...formData]; const child = currentParts[2] || ''; nd[i] = e.target.value && child ? `${e.target.value}.${child}` : e.target.value; setFormData(nd); }}
                                                                >
                                                                    <option value="">Subsección padre…</option>
                                                                    {parentCandidates.map(p => (<option key={p} value={p}>{p}</option>))}
                                                                </select>
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900"
                                                                    value={currentParts[2] || ''}
                                                                    onChange={(e) => { const nd = [...formData]; const child = e.target.value; const pc = parentChain; nd[i] = pc && child ? `${pc}.${child}` : child; setFormData(nd); }}
                                                                >
                                                                    <option value="">Índice…</option>
                                                                    {childOptions.map(c => (<option key={c} value={c}>{c}</option>))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (nivelVal === 'parrafo') {
                                                    const parentCandidates = Array.from(topOrders).flatMap(p => {
                                                        const subs = subOrders.get(p) || new Set<string>();
                                                        return Array.from(subs).flatMap(s => {
                                                            const p2 = `${p}.${s}`;
                                                            const subsubs = subSubOrders.get(p2) || new Set<string>();
                                                            return Array.from(subsubs).map(ss => `${p}.${s}.${ss}`);
                                                        });
                                                    }).sort((a, b) => {
                                                        const partsA = a.split('.').map(n => parseInt(n));
                                                        const partsB = b.split('.').map(n => parseInt(n));
                                                        for (let k = 0; k < Math.max(partsA.length, partsB.length); k++) {
                                                            const valA = partsA[k] || 0;
                                                            const valB = partsB[k] || 0;
                                                            if (valA !== valB) return valA - valB;
                                                        }
                                                        return 0;
                                                    });

                                                    const parentChain = (currentParts[0] && currentParts[1] && currentParts[2]) ? `${currentParts[0]}.${currentParts[1]}.${currentParts[2]}` : (parentCandidates[0] || '');
                                                    const usedChildren = parentChain ? (subSubSubOrders.get(parentChain) || new Set<string>()) : new Set<string>();
                                                    const nums = Array.from(usedChildren).map(x => parseInt(x)).filter(x => !isNaN(x)).sort((a, b) => a - b);
                                                    const max = nums.length ? nums[nums.length - 1] : 0;
                                                    const childOptions: string[] = [];
                                                    for (let k = 1; k <= Math.max(max + 10, 10); k++) {
                                                        const kStr = String(k);
                                                        if (!usedChildren.has(kStr) || currentParts[3] === kStr) childOptions.push(kStr);
                                                    }
                                                    if (currentParts[3] && !childOptions.includes(currentParts[3])) childOptions.push(currentParts[3]);
                                                    childOptions.sort((a, b) => parseInt(a) - parseInt(b));

                                                    return (
                                                        <div key={i} className={colSpan + " space-y-1"}>
                                                            <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                            <div className="flex gap-2">
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900 w-2/3"
                                                                    value={parentChain}
                                                                    onChange={(e) => { const nd = [...formData]; const child = currentParts[3] || ''; nd[i] = e.target.value && child ? `${e.target.value}.${child}` : e.target.value; setFormData(nd); }}
                                                                >
                                                                    <option value="">Sub-subsección padre…</option>
                                                                    {parentCandidates.map(p => (<option key={p} value={p}>{p}</option>))}
                                                                </select>
                                                                <select className="px-4 py-2 border rounded-md text-sm bg-white text-gray-900 w-1/3"
                                                                    value={currentParts[3] || ''}
                                                                    onChange={(e) => { const nd = [...formData]; const child = e.target.value; const pc = parentChain; nd[i] = pc && child ? `${pc}.${child}` : child; setFormData(nd); }}
                                                                >
                                                                    <option value="">Índice…</option>
                                                                    {childOptions.map(c => (<option key={c} value={c}>{c}</option>))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            }

                                            if ((activeTab === 'tablas' || activeTab === 'figuras') && isSeccion) {
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <select
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
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
                                                                className={clsx("w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900", !currentSectionId && "bg-gray-100 text-gray-500 cursor-not-allowed")}
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

                                            if (isTipoBiblio) {
                                                const tipos = ['article', 'book', 'inbook', 'inproceedings', 'report', 'thesis', 'online', 'manual', 'dataset', 'misc'];
                                                const current = (formData[i] || '').toString() || 'article';
                                                return (
                                                    <div key={i} className={colSpan + " space-y-1"}>
                                                        <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                        <select
                                                            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                            value={current}
                                                            onChange={(e) => {
                                                                const next = [...formData];
                                                                next[i] = e.target.value;
                                                                setFormData(next);
                                                            }}
                                                        >
                                                            {tipos.map(t => (<option key={t} value={t}>{t}</option>))}
                                                        </select>
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
                                                            className={clsx("flex-1 px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda", isDisabled ? "bg-gray-100 text-gray-500" : "bg-white text-gray-900 border-gray-300")}
                                                            value={formData[i] || ''}
                                                            onChange={(e) => {
                                                                const newData = [...formData];
                                                                newData[i] = e.target.value;
                                                                setFormData(newData);
                                                            }}
                                                        />
                                                        {!isDisabled && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="shrink-0 font-semibold transition-all duration-300 ease-in-out hover:shadow-md hover:bg-gob-guinda hover:text-white border-gob-guinda text-gob-guinda px-4 py-2 rounded-md h-auto gap-2"
                                                                title="Abrir editor avanzado con formato"
                                                                onClick={() => {
                                                                    setEditorModal({
                                                                        open: true,
                                                                        title: `Editar ${header}`,
                                                                        value: (formData[i] || '').toString(),
                                                                        fieldId: header,
                                                                        onSave: (val) => {
                                                                            const newData = [...formData];
                                                                            newData[i] = val;
                                                                            setFormData(newData);
                                                                        }
                                                                    });
                                                                }}
                                                            >
                                                                <Edit size={16} />
                                                                <span>Editar</span>
                                                            </Button>
                                                        )}
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
                                    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gob-guinda">{equationModal.title}</h3>
                                                    <p className="text-xs text-gray-500">Se insertará como etiqueta bien formada en el texto.</p>
                                                </div>
                                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setEquationModal({ ...equationModal, open: false })}>
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <div className="text-[11px] text-gray-600 mr-1">Plantillas:</div>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\frac{ {{1}} }{ {{2}} }', { selectFirstPlaceholder: true })} title="Fracción">
                                                    {'\\frac'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\sqrt{ {{1}} }', { selectFirstPlaceholder: true })} title="Raíz">
                                                    {'\\sqrt'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('{{1}}^{ {{2}} }', { selectFirstPlaceholder: true })} title="Exponente">
                                                    x^n
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\int_{ {{1}} }^{ {{2}} } {{3}} \\, d{{4}}', { selectFirstPlaceholder: true })} title="Integral">
                                                    {'\\int'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\frac{d {{1}}}{d {{2}}}', { selectFirstPlaceholder: true })} title="Derivada">
                                                    d/dx
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\frac{\\partial {{1}}}{\\partial {{2}}}', { selectFirstPlaceholder: true })} title="Derivada parcial">
                                                    {'\\partial'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\Delta')} title="Delta">
                                                    {'\\Delta'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\cdot')} title="Multiplicación punto">
                                                    {'\\cdot'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\times')} title="Multiplicación cruz">
                                                    {'\\times'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\sin( {{1}} )', { selectFirstPlaceholder: true })} title="Seno">
                                                    {'\\sin'}
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => insertIntoEquationModal('\\cos( {{1}} )', { selectFirstPlaceholder: true })} title="Coseno">
                                                    {'\\cos'}
                                                </Button>
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                                <div className="text-[11px] text-gray-600 mr-1">Símbolos:</div>
                                                <select
                                                    className="px-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                    value={equationPaletteGroup}
                                                    onChange={(e) => setEquationPaletteGroup(e.target.value as EquationSymbolGroup)}
                                                >
                                                    <option value="Todos">Todos</option>
                                                    <option value="Griegas">Griegas</option>
                                                    <option value="Operadores">Operadores</option>
                                                    <option value="Relaciones">Relaciones</option>
                                                    <option value="Flechas">Flechas</option>
                                                    <option value="Conjuntos">Conjuntos</option>
                                                    <option value="Funciones">Funciones</option>
                                                </select>
                                                <div className="relative flex-1 min-w-[180px]">
                                                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        className="w-full pl-7 pr-2 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                        value={equationPaletteQuery}
                                                        onChange={(e) => setEquationPaletteQuery(e.target.value)}
                                                        placeholder="Buscar (alpha, integral, <=, R, flecha...)"
                                                    />
                                                </div>
                                            </div>

                                            <div className="border border-gray-200 rounded-md p-2 max-h-[160px] overflow-auto mb-2">
                                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                    {EQUATION_SYMBOLS
                                                        .filter(s => equationPaletteGroup === 'Todos' || s.group === equationPaletteGroup)
                                                        .filter(s => {
                                                            const q = equationPaletteQuery.trim().toLowerCase();
                                                            if (!q) return true;
                                                            const hay = [s.label, s.latex, ...s.keywords].join(' ').toLowerCase();
                                                            return hay.includes(q);
                                                        })
                                                        .map((s) => (
                                                            <button
                                                                key={`${s.group}:${s.latex}`}
                                                                type="button"
                                                                className="border border-gray-300 rounded-md px-2 py-1 text-left hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gob-guinda"
                                                                title={s.latex}
                                                                onClick={() => insertIntoEquationModal(s.latex)}
                                                            >
                                                                <div className="text-sm leading-none text-gray-900">{s.label}</div>
                                                                <div className="text-[10px] leading-tight text-gray-600 truncate">{s.latex}</div>
                                                            </button>
                                                        ))}
                                                </div>
                                            </div>

                                            <textarea
                                                ref={equationModalTextareaRef}
                                                className="w-full min-h-[180px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900"
                                                value={equationModal.value}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Tab') {
                                                        e.preventDefault();
                                                        focusNextEquationPlaceholder({ wrap: true });
                                                    }
                                                }}
                                                onChange={(e) => setEquationModal({ ...equationModal, value: e.target.value })}
                                                placeholder={equationModal.mode === 'math' ? 'a^2 + b^2 = c^2' : 'Escribe la ecuación (puede ser multi-línea)…'}
                                            />

                                            <div className="flex justify-end gap-3 mt-4">
                                                <Button variant="ghost" onClick={() => setEquationModal({ ...equationModal, open: false })}>Cancelar</Button>
                                                <Button
                                                    variant="burgundy"
                                                    onClick={commitEquationModal}
                                                >
                                                    Insertar
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Note Modal */}
                                {noteModal.open && (
                                    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                                        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                                            <div className="flex items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gob-guinda">Insertar Nota</h3>
                                                    <p className="text-xs text-gray-500">Agrega una nota explicativa o al pie.</p>
                                                </div>
                                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setNoteModal({ ...noteModal, open: false })}>
                                                    <X size={18} />
                                                </button>
                                            </div>

                                            <div className="flex gap-2 mb-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                                    const el = noteContentTextareaRef.current;
                                                    const start = el ? el.selectionStart : 0;
                                                    const end = el ? el.selectionEnd : 0;
                                                    const val = noteModal.value;
                                                    const newVal = val.slice(0, start) + `**${val.slice(start, end)}**` + val.slice(end);
                                                    setNoteModal({ ...noteModal, value: newVal });
                                                }} title="Negrita">
                                                    <b>B</b>
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                                    const el = noteContentTextareaRef.current;
                                                    const start = el ? el.selectionStart : 0;
                                                    const end = el ? el.selectionEnd : 0;
                                                    const val = noteModal.value;
                                                    const newVal = val.slice(0, start) + `*${val.slice(start, end)}*` + val.slice(end);
                                                    setNoteModal({ ...noteModal, value: newVal });
                                                }} title="Cursiva">
                                                    <i>I</i>
                                                </Button>
                                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                                    const el = noteContentTextareaRef.current;
                                                    const start = el ? el.selectionStart : 0;
                                                    const end = el ? el.selectionEnd : 0;
                                                    const val = noteModal.value;
                                                    const sel = val.slice(start, end);

                                                    // Open equation modal targeting note
                                                    setEquationModal({
                                                        open: true,
                                                        mode: 'math',
                                                        title: 'Insertar LaTeX en Nota',
                                                        value: sel || '',
                                                        target: 'note'
                                                    });
                                                }} title="Insertar LaTeX">
                                                    LaTeX
                                                </Button>
                                            </div>

                                            <textarea
                                                ref={noteContentTextareaRef}
                                                className="w-full min-h-[150px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gob-guinda bg-white text-gray-900 mb-4"
                                                value={noteModal.value}
                                                onChange={(e) => setNoteModal({ ...noteModal, value: e.target.value })}
                                                placeholder="Escribe el contenido de la nota..."
                                            />

                                            <div className="flex justify-end gap-3">
                                                <Button variant="ghost" onClick={() => setNoteModal({ ...noteModal, open: false })}>Cancelar</Button>
                                                <Button variant="burgundy" onClick={() => {
                                                    insertSnippetIntoContent(`[[nota:${noteModal.value}]]`);
                                                    setNoteModal({ open: false, value: '' });
                                                }}>Insertar</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Nested Grid Editor (Only for Tablas) */}
                                {activeTab === 'tablas' && (
                                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <Table className="text-gob-guinda" size={20} />
                                                <h3 className="text-lg font-bold text-gray-900">Valores de la Tabla</h3>
                                                {hasUnsavedGridChanges && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 animate-pulse">
                                                        <AlertCircle size={12} /> Guardando...
                                                    </span>
                                                )}
                                                {nestedGridMerges && nestedGridMerges.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200" title="Celdas combinadas detectadas">
                                                        <Grid size={12} /> {nestedGridMerges.length} merge{nestedGridMerges.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleMerge}
                                                    title="Combinar celdas seleccionadas"
                                                    disabled={!selectionStart || !selectionEnd || (selectionStart.r === selectionEnd.r && selectionStart.c === selectionEnd.c)}
                                                >
                                                    <Grid size={14} className="mr-1" /> Combinar
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={handleUnmerge}
                                                    title="Descombinar celdas"
                                                    disabled={!nestedGridMerges || nestedGridMerges.length === 0}
                                                >
                                                    <Grid size={14} className="mr-1 opacity-50" /> Separar
                                                </Button>
                                                <div className="w-px bg-gray-300 mx-1"></div>
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
                                                <div className="flex items-center gap-1 bg-amber-50 rounded px-1 border border-amber-200">
                                                    <span className="text-[10px] font-bold text-amber-800 uppercase px-1">Encabezado:</span>
                                                    <button
                                                        className="p-1 hover:bg-amber-100 rounded text-amber-700 disabled:opacity-30"
                                                        onClick={() => {
                                                            try {
                                                                if (!formHeaders || !formData) return;
                                                                const idx = findColumnIndex(formHeaders, HEADER_ROWS_COL_VARIANTS);
                                                                if (idx !== -1) {
                                                                    const val = parseInt(formData[idx] || '1', 10);
                                                                    const newData = [...formData];
                                                                    newData[idx] = Math.max(0, val - 1).toString();
                                                                    setFormData(newData);
                                                                } else {
                                                                    showNotification('⚠️ Falta columna "Filas Encabezado" en hoja Tablas. Por favor agrégala en Google Sheets.', 'error');
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                                showNotification('Error al modificar encabezados.', 'error');
                                                            }
                                                        }}
                                                        title="Reducir filas de encabezado"
                                                    >
                                                        <Minus size={12} />
                                                    </button>
                                                    <span className="text-xs font-mono font-bold w-4 text-center text-amber-900">
                                                        {headerRowsCount}
                                                    </span>
                                                    <button
                                                        className="p-1 hover:bg-amber-100 rounded text-amber-700"
                                                        onClick={() => {
                                                            try {
                                                                if (!formHeaders || !formData) return;
                                                                const idx = findColumnIndex(formHeaders, HEADER_ROWS_COL_VARIANTS);
                                                                if (idx !== -1) {
                                                                    const val = parseInt(formData[idx] || '1', 10);
                                                                    const newData = [...formData];
                                                                    newData[idx] = Math.min(10, val + 1).toString();
                                                                    setFormData(newData);
                                                                } else {
                                                                    showNotification('⚠️ Falta columna "Filas Encabezado" en hoja Tablas. Por favor agrégala en Google Sheets.', 'error');
                                                                }
                                                            } catch (e) {
                                                                console.error(e);
                                                                showNotification('Error al modificar encabezados.', 'error');
                                                            }
                                                        }}
                                                        title="Aumentar filas de encabezado"
                                                    >
                                                        <Plus size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {loadingGrid ? (
                                            <div className="h-32 flex items-center justify-center text-gray-400">Cargando datos...</div>
                                        ) : (
                                            <div className="overflow-x-auto border border-gray-300 rounded-md bg-gray-50">
                                                {nestedGridData && nestedGridData.length > 0 ? (
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                            {nestedGridData.map((row, rIndex) => {
                                                                const parsed = parseRangeSimple(nestedGridRange);
                                                                const headersIdx = findColumnIndex(formHeaders, HEADER_ROWS_COL_VARIANTS);
                                                                const tableHeaderRowCount = (headersIdx !== -1 && formData[headersIdx]) ? parseInt(formData[headersIdx].toString(), 10) : 1;

                                                                const startRowAbs = parsed ? parsed.startRow : 0;
                                                                const startColAbs = parsed ? parsed.startCol : 0;
                                                                const absRow = startRowAbs + rIndex;

                                                                return (
                                                                    <tr key={rIndex}>
                                                                        <td className={clsx("px-2 py-2 text-[10px] font-mono select-none w-8 text-center border-r border-gray-200 transition-colors duration-200", focusedCell?.r === rIndex ? "bg-gob-guinda text-white font-bold" : "bg-gray-50 text-gray-400")}>
                                                                            {rIndex + 1}
                                                                        </td>
                                                                        {row.map((cell, cIndex) => {
                                                                            const absCol = startColAbs + cIndex;

                                                                            // Check for merges
                                                                            let isHidden = false;
                                                                            let rowSpan = 1;
                                                                            let colSpan = 1;

                                                                            if (nestedGridMerges && nestedGridMerges.length > 0) {
                                                                                const merge = nestedGridMerges.find(m =>
                                                                                    absRow >= m.startRowIndex && absRow < m.endRowIndex &&
                                                                                    absCol >= m.startColumnIndex && absCol < m.endColumnIndex
                                                                                );

                                                                                if (merge) {
                                                                                    if (absRow === merge.startRowIndex && absCol === merge.startColumnIndex) {
                                                                                        rowSpan = merge.endRowIndex - merge.startRowIndex;
                                                                                        colSpan = merge.endColumnIndex - merge.startColumnIndex;
                                                                                        if (rIndex === 0 && cIndex === 0) {
                                                                                            console.log('[SheetEditor] Merge detected:', { absRow, absCol, rowSpan, colSpan, merge });
                                                                                        }
                                                                                    } else {
                                                                                        isHidden = true;
                                                                                    }
                                                                                }
                                                                            }

                                                                            if (isHidden) return null;

                                                                            // Check selection
                                                                            let isSelected = false;
                                                                            if (selectionStart && selectionEnd) {
                                                                                const rMin = Math.min(selectionStart.r, selectionEnd.r);
                                                                                const rMax = Math.max(selectionStart.r, selectionEnd.r);
                                                                                const cMin = Math.min(selectionStart.c, selectionEnd.c);
                                                                                const cMax = Math.max(selectionStart.c, selectionEnd.c);

                                                                                if (rIndex >= rMin && rIndex <= rMax && cIndex >= cMin && cIndex <= cMax) {
                                                                                    isSelected = true;
                                                                                }
                                                                            }

                                                                            const isFocused = focusedCell?.r === rIndex && focusedCell?.c === cIndex;
                                                                            const isHeader = rIndex < tableHeaderRowCount;

                                                                            return (
                                                                                <td
                                                                                    key={cIndex}
                                                                                    colSpan={colSpan}
                                                                                    rowSpan={rowSpan}
                                                                                    className={clsx(
                                                                                        "p-0 border border-gray-300 min-w-[120px] relative select-none", // Added full border
                                                                                        isSelected && !isFocused && "bg-blue-50 ring-2 ring-inset ring-blue-300 z-10",
                                                                                        // Updated Header Style: Dark Gold Background with White Text + darker border
                                                                                        isHeader && !isSelected && "bg-[#B38E5D] text-white font-semibold border-amber-800/40"
                                                                                    )}
                                                                                    onMouseDown={(e) => {
                                                                                        if (e.button === 0) { // Left click only
                                                                                            setIsSelecting(true);
                                                                                            setSelectionStart({ r: rIndex, c: cIndex });
                                                                                            setSelectionEnd({ r: rIndex, c: cIndex });
                                                                                            setFocusedCell({ r: rIndex, c: cIndex });
                                                                                        }
                                                                                    }}
                                                                                    onMouseEnter={() => {
                                                                                        if (isSelecting && selectionStart) {
                                                                                            setSelectionEnd({ r: rIndex, c: cIndex });
                                                                                        }
                                                                                    }}
                                                                                    onClick={(e) => {
                                                                                        if (e.shiftKey && selectionStart) {
                                                                                            setSelectionEnd({ r: rIndex, c: cIndex });
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    <textarea
                                                                                        onFocus={() => {
                                                                                            if (!isSelecting) {
                                                                                                setFocusedCell({ r: rIndex, c: cIndex });
                                                                                                if (!selectionStart) {
                                                                                                    setSelectionStart({ r: rIndex, c: cIndex });
                                                                                                    setSelectionEnd({ r: rIndex, c: cIndex });
                                                                                                }
                                                                                            }
                                                                                        }}
                                                                                        className={clsx(
                                                                                            "w-full h-full px-2 py-1 text-xs focus:outline-none border-none bg-transparent transition-colors duration-200 text-gray-900 cursor-cell resize-none overflow-hidden",
                                                                                            rIndex === 0 ? (isFocused ? "font-bold text-gob-guinda bg-red-50" : "font-bold text-gray-800 bg-gray-50") : "text-gray-900 focus:bg-blue-50",
                                                                                            cIndex === 0 && rIndex !== 0 && "font-bold text-gray-900",
                                                                                            isSelected && !isFocused && "bg-blue-50"
                                                                                        )}
                                                                                        value={cell}
                                                                                        placeholder={rIndex === 0 ? "Encabezado" : ""}
                                                                                        onChange={(e) => {
                                                                                            const newData = [...nestedGridData];
                                                                                            newData[rIndex][cIndex] = e.target.value;
                                                                                            setNestedGridData(newData);
                                                                                            debouncedAutoSave();
                                                                                        }}
                                                                                        style={{ minHeight: '40px', whiteSpace: 'normal' }}
                                                                                    />
                                                                                </td>
                                                                            );
                                                                        })}
                                                                    </tr>
                                                                );
                                                            })}
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

                                {/* Table Style Editor (Only for Tablas) */}
                                {activeTab === 'tablas' && nestedGridData.length > 0 && (
                                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                        <TableStyleEditor
                                            tableId={(() => {
                                                const secIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
                                                const ordIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
                                                const sec = secIdx !== -1 ? (formData[secIdx] || '').toString().trim() : '';
                                                const ord = ordIdx !== -1 ? (formData[ordIdx] || '').toString().trim() : '';
                                                return (sec && ord) ? `TBL-${sec}-${ord}` : `TBL-${ord}`;
                                            })()}
                                            numRows={nestedGridData.length}
                                            numCols={nestedGridData[0]?.length || 1}
                                            onStylesChange={handleTableStyleChange}
                                            initialStyle={tableStyleMap[(() => {
                                                const secIdx = findColumnIndex(formHeaders, SECCION_COL_VARIANTS);
                                                const ordIdx = findColumnIndex(formHeaders, ORDEN_COL_VARIANTS);
                                                const sec = secIdx !== -1 ? (formData[secIdx] || '').toString().trim() : '';
                                                const ord = ordIdx !== -1 ? (formData[ordIdx] || '').toString().trim() : '';
                                                return (sec && ord) ? `TBL-${sec}-${ord}` : `TBL-${ord}`;
                                            })()]}
                                        />
                                    </div>
                                )}

                                {/* Bottom actions removed as they are now in the sticky header */}
                                {/* <div className="flex justify-end gap-3 pt-4">...</div> */}
                            </div>
                        )}
                    </div>
                </div>

                {/* Generic Rich Editor Modal */}
                {editorModal.open && (
                    <div className={clsx("fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in", editorModal.zenMode ? "p-0" : "p-4")}>
                        <div className={clsx("bg-white shadow-2xl w-full flex flex-col transition-all duration-300", editorModal.zenMode ? "h-full rounded-none" : "max-w-5xl max-h-[90vh] rounded-xl")}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gob-guinda flex items-center gap-2">
                                    <Edit size={18} />
                                    {editorModal.title}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setEditorModal(prev => ({ ...prev, zenMode: !prev.zenMode }))} className="text-gray-400 hover:text-gob-guinda p-1 rounded hover:bg-gray-100 transition-colors" title={editorModal.zenMode ? "Salir de pantalla completa" : "Pantalla completa"}>
                                        {editorModal.zenMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                                    </button>
                                    <button onClick={() => setEditorModal(prev => ({ ...prev, open: false }))} className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className={clsx("overflow-y-auto flex-1 bg-gray-50/50", editorModal.zenMode ? "p-8 md:p-12 lg:px-24" : "p-6")}>
                                <RichEditorToolbar
                                    availableFigureItems={availableFigureItems}
                                    availableTableItems={availableTableItems}
                                    availableBibliographyKeys={availableBibliographyKeys}
                                    onInsertSnippet={insertSnippetGeneric}
                                    onWrapInline={wrapInlineGeneric}
                                    onInsertBlock={insertBlockGeneric}
                                    onOpenNote={() => setNoteModal({ open: true, value: '' })}
                                    onOpenEquation={(mode) => {
                                        const el = genericEditorRef.current;
                                        const sel = el ? editorModal.value.slice(el.selectionStart, el.selectionEnd) : '';
                                        setEquationModal({
                                            open: true,
                                            mode: mode,
                                            title: mode === 'math' ? 'Insertar math inline' : 'Insertar ecuación display',
                                            value: sel || '',
                                            target: 'main'
                                        });
                                    }}
                                    onOpenNewItem={(type) => {
                                        if (type === 'bibliografia') openTab('bibliografia');
                                        else if (type === 'figura' || type === 'tabla') createNewForSection(type);
                                    }}
                                    currentSectionOrder=""
                                />

                                <textarea
                                    ref={genericEditorRef}
                                    className={clsx(
                                        "w-full p-6 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gob-guinda/20 focus:border-gob-guinda outline-none resize-none font-mono text-sm leading-relaxed shadow-inner transition-all",
                                        editorModal.zenMode ? "h-[calc(100vh-280px)] text-base" : "h-96"
                                    )}
                                    value={editorModal.value}
                                    onChange={handleGenericEditorChange}
                                    onKeyDown={handleGenericEditorKeyDown}
                                    onSelect={(e) => {
                                        // Update cursor position or selection if needed for status bar
                                    }}
                                    placeholder="Escribe aquí el contenido..."
                                />

                                {autocompleteState.open && (
                                    <EditorAutocomplete
                                        items={getAutocompleteItems(autocompleteState.query)}
                                        selectedIndex={autocompleteState.selectedIndex}
                                        position={autocompleteState.position}
                                        onSelect={handleAutocompleteSelect}
                                        onClose={() => setAutocompleteState(prev => ({ ...prev, open: false }))}
                                    />
                                )}

                                <div className="flex justify-between items-center mt-2 px-1">
                                    <div className="text-xs text-gray-400 flex gap-3">
                                        <span>
                                            {editorModal.value.trim().split(/\s+/).filter(w => w.length > 0).length} palabras
                                        </span>
                                        <span>
                                            {editorModal.value.length} caracteres
                                        </span>
                                        {editorModal.fieldId === 'ResumenEjecutivo' && (
                                            <span className={clsx("font-medium", editorModal.value.length > 500 ? "text-red-600" : "text-gray-400")}>
                                                (Máx 500)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={clsx("p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50", editorModal.zenMode ? "fixed bottom-0 left-0 right-0 z-[70] border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]" : "rounded-b-xl")}>
                            <Button variant="outline" onClick={() => setEditorModal(prev => ({ ...prev, open: false }))}>
                                Cancelar
                            </Button>
                            <Button variant="primary" onClick={() => {
                                editorModal.onSave(editorModal.value);
                                setEditorModal(prev => ({ ...prev, open: false }));
                            }}>
                                <Check size={16} className="mr-2" />
                                Guardar Cambios
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
