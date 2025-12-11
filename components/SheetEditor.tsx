import React, { useState, useEffect } from 'react';
import { Spreadsheet } from '../types';
import { updateCellValue, appendRow, deleteRow, deleteDimensionRange, fetchValues, updateValues, insertDimension } from '../services/sheetsService';
import { Button } from './Button';
import { Save, Info, List, Table, Image, Book, Type, FileText, ChevronLeft, Plus, Search, Trash2, Edit, X, Lightbulb, Menu, Copy, ChevronRight, Grid, RefreshCw, Check, Minus } from 'lucide-react';
import { clsx } from 'clsx';

interface SheetEditorProps {
  spreadsheet: Spreadsheet;
  token: string;
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

// Helper to find column index with loose matching
const findColumnIndex = (headers: string[], candidates: string[]) => {
    return headers.findIndex(h => candidates.includes(h) || candidates.includes(h.trim()));
};

const CSV_COL_VARIANTS = ['Datos CSV', 'DatosCSV', 'Datos_CSV', 'Rango', 'Datos'];

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

// Helper to parse range string
const parseRange = (rangeStr: string) => {
    if (!rangeStr || !rangeStr.includes('!')) return null;
    const parts = rangeStr.split('!');
    const sheetName = parts[0].replace(/'/g, '');
    const rangeRef = parts[1];
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

export const SheetEditor: React.FC<SheetEditorProps> = ({ spreadsheet, token, onRefresh, onBack }) => {
  const [activeTab, setActiveTab] = useState('metadatos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDocId, setCurrentDocId] = useState<string>('');
  
  // Navigation State
  const [viewMode, setViewMode] = useState<ViewMode>('LIST');
  
  // Data State
  const [gridData, setGridData] = useState<string[][]>([]);
  const [gridHeaders, setGridHeaders] = useState<string[]>([]);
  const [formData, setFormData] = useState<string[]>([]); // For Metadata or Single Item Edit
  const [formHeaders, setFormHeaders] = useState<string[]>([]);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  
  // Nested Grid Editor State (for Table Content inside Form)
  const [nestedGridData, setNestedGridData] = useState<string[][]>([]);
  const [nestedGridRange, setNestedGridRange] = useState<string>('');
  const [originalNestedGridRange, setOriginalNestedGridRange] = useState<string>(''); 
  
  // New Table Wizard State
  const [showTableWizard, setShowTableWizard] = useState(false);
  const [wizardConfig, setWizardConfig] = useState({ rows: 5, cols: 4 });
  const [calculatingRange, setCalculatingRange] = useState(false);

  // UI State
  const [saving, setSaving] = useState(false);
  const [loadingGrid, setLoadingGrid] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

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

  const activeSheet = getActiveSheet();

  // --- Initialization Effects ---

  // 1. Extract Doc ID
  useEffect(() => {
    const metaSheet = getMetadataSheet();
    if (metaSheet && metaSheet.data && metaSheet.data[0]?.rowData) {
        const headerRow = metaSheet.data[0].rowData[0]?.values?.map(c => c.userEnteredValue?.stringValue || '');
        const idColIndex = headerRow?.findIndex(h => h === 'ID' || h === 'DocumentoID') ?? 0;
        const firstDataRow = metaSheet.data[0].rowData[1];
        if (firstDataRow) {
            const val = firstDataRow.values?.[idColIndex]?.userEnteredValue?.stringValue || firstDataRow.values?.[idColIndex]?.formattedValue || '';
            setCurrentDocId(val);
        }
    }
  }, [spreadsheet]);

  // 2. Load List Data
  useEffect(() => {
    // Reset view when tab changes
    setViewMode('LIST');
    setSearchTerm('');
    setCurrentPage(1);
    
    if (activeTab === 'metadatos') {
        // Load Form Data directly for Metadata
        if (!activeSheet) return;
        const headers = activeSheet.data?.[0]?.rowData?.[0]?.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || '') || [];
        const values = activeSheet.data?.[0]?.rowData?.[1]?.values?.map(c => c.formattedValue || c.userEnteredValue?.stringValue || '') || [];
        setFormHeaders(headers);
        setFormData(values.length ? values : new Array(headers.length).fill(''));
        setViewMode('FORM'); // Metadata is always a form
    } else {
        // Load Table Data for List
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
            while(newRow.length < headers.length) newRow.push('');
            return newRow;
        });

        if (currentDocId) {
            const docIdIndex = headers.findIndex(h => h === 'DocumentoID' || h === 'ID Documento');
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

  // --- Internal Logic to fetch nested grid ---
  const loadNestedGrid = async (range: string) => {
      // 1. Aggressive Sanitization
      let correctedRange = range.trim();
      correctedRange = correctedRange.replace(/'!/g, '!');
      if (correctedRange.includes('Datos_Tablas') && !correctedRange.includes('\'')) {
          correctedRange = correctedRange.replace('Datos_Tablas', '\'Datos Tablas\'');
      }

      console.log("Cargando rango saneado:", correctedRange);

      // 2. Validate format
      if (!correctedRange || !correctedRange.includes('!')) {
          console.warn("Rango inválido, cargando grid vacío por defecto.");
          setNestedGridData([['', '', '', '', ''], ['', '', '', '', ''], ['', '', '', '', '']]); 
          setNestedGridRange(correctedRange);
          return;
      }

      setLoadingGrid(true);
      setNestedGridRange(correctedRange);
      setOriginalNestedGridRange(correctedRange);

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
    // Logic to recalculate the end range based on data size
    const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
    let currentRange = csvIndex !== -1 ? formData[csvIndex] : nestedGridRange;

    // Sanitize common issues before parsing
    currentRange = currentRange.replace(/'!/g, '!'); // Fix stray quotes
    if (currentRange.includes('Datos_Tablas')) {
        currentRange = currentRange.replace('Datos_Tablas', '\'Datos Tablas\'');
    }

    if (!currentRange || !currentRange.includes('!')) return;

    try {
        const parts = currentRange.split('!');
        const sheetPart = parts[0];
        const rangeRef = parts[1];
        
        const [startRef] = rangeRef.split(':');
        
        // Extract start column letter and start row number
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

        // Update State
        setNestedGridRange(newRange);
        
        // Update Form Input
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
          // Fetch Column A of 'Datos Tablas' to find where the data ends
          // Assuming 'Datos Tablas' is the standard storage sheet
          const sheetName = "'Datos Tablas'";
          const colData = await fetchValues(spreadsheet.spreadsheetId, `${sheetName}!A:A`, token);
          
          let lastRowIndex = 0;
          if (colData && colData.length > 0) {
              lastRowIndex = colData.length;
          }
          
          // Add a buffer of 3 rows
          const startRow = lastRowIndex + 3;
          const endRow = startRow + rows - 1;
          const endColLetter = indexToColumnLetter(cols - 1); // 0-based index

          return `${sheetName}!A${startRow}:${endColLetter}${endRow}`;
      } catch (e) {
          console.error(e);
          // Fallback random
          const randomStart = 100 + Math.floor(Math.random() * 50);
          return `'Datos Tablas'!A${randomStart}:E${randomStart + rows}`;
      } finally {
          setCalculatingRange(false);
      }
  };

  // --- Actions ---

  const handlePreCreate = () => {
      if (activeTab === 'tablas') {
          // Open Wizard for Tables
          setWizardConfig({ rows: 5, cols: 4 });
          setShowTableWizard(true);
      } else {
          // Direct Create for others
          handleCreate([]);
      }
  };

  const handleWizardConfirm = async () => {
      const newRange = await calculateNextAvailableRange(wizardConfig.rows, wizardConfig.cols);
      
      // Initialize grid with requested size
      const initData: string[][] = Array(wizardConfig.rows).fill('').map((_, r) => 
          Array(wizardConfig.cols).fill('').map((__, c) => 
            r === 0 ? 'Encabezado' : ''
          )
      );
      initData[0][0] = 'Concepto'; // Default header

      handleCreate(initData, newRange);
      setShowTableWizard(false);
  };

  const handleCreate = (initialGridData: string[][] = [], initialRangeStr: string = '') => {
      setEditingRowIndex(null);
      const newRow = new Array(gridHeaders.length).fill('');
      
      // Auto-fill Document ID
      const docIdIndex = gridHeaders.findIndex(h => h === 'DocumentoID' || h === 'ID Documento');
      if (docIdIndex !== -1) newRow[docIdIndex] = currentDocId;
      
      // Fill Range if provided
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
           // Default fallback
           setNestedGridData([['Concepto', '2023', '2024', '2025', 'Notas'], ['', '', '', '', ''], ['', '', '', '', '']]); 
      }
      
      setViewMode('FORM');
  };

  const handleEdit = (rowIndex: number) => {
      setEditingRowIndex(rowIndex);
      const currentRow = [...gridData[rowIndex]];
      setFormData(currentRow);
      setFormHeaders(gridHeaders);

      // If Tablas, fetch the nested data immediately
      if (activeTab === 'tablas') {
          const csvIndex = findColumnIndex(gridHeaders, CSV_COL_VARIANTS);
          if (csvIndex !== -1) {
              const r = currentRow[csvIndex];
              setOriginalNestedGridRange(r); // Save original
              loadNestedGrid(r);
          } else {
              console.warn("No se encontró columna para Datos CSV en:", gridHeaders);
              // Fallback initialization to prevent blank screen
              setNestedGridData([['Concepto', 'Col1', 'Col2'], ['', '', '']]);
          }
      }

      setViewMode('FORM');
  };

  const handleDelete = async (rowIndex: number) => {
       if (!window.confirm("¿Estás seguro de que quieres eliminar este registro?")) return;
       if (!activeSheet) return;
       setSaving(true);
       try {
            alert("Función de eliminar pendiente de reconexión con lógica de índice real.");
            onRefresh();
       } finally {
           setSaving(false);
       }
  };

  const handleSaveForm = async () => {
      if (!activeSheet) return;
      setSaving(true);
      try {
          const sheetTitle = activeSheet.properties.title;
          
          if (activeTab === 'metadatos') {
               const updates = [];
               for(let i=0; i<formData.length; i++) {
                   updates.push(updateCellValue(spreadsheet.spreadsheetId, sheetTitle, { row: 1, col: i, value: formData[i]}, token));
               }
               await Promise.all(updates);
               alert("Metadatos guardados.");
          } else {
              // 1. Prepare Data: Sync 'DatosCSV' with 'nestedGridRange' if applicable
              const finalFormData = [...formData];
              if (activeTab === 'tablas') {
                  const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
                  // Ensure we save the latest calculated range, not the stale form input
                  if (csvIndex !== -1 && nestedGridRange) {
                      finalFormData[csvIndex] = nestedGridRange;
                  }
              }

              // 2. Save the Main Record (Create or Update)
              if (editingRowIndex === null) {
                  // CREATE
                  await appendRow(spreadsheet.spreadsheetId, sheetTitle, finalFormData, token);
              } else {
                  // UPDATE
                  const startRow = editingRowIndex + 2; 
                  const endColLetter = indexToColumnLetter(finalFormData.length - 1);
                  const updateRange = `${sheetTitle}!A${startRow}:${endColLetter}${startRow}`;
                  await updateValues(spreadsheet.spreadsheetId, updateRange, [finalFormData], token);
              }

              // 3. Save the Nested Grid Data (if applicable)
              if (activeTab === 'tablas') {
                  const csvIndex = findColumnIndex(formHeaders, CSV_COL_VARIANTS);
                  let targetRange = finalFormData[csvIndex] || nestedGridRange;
                  
                  // Sanitize before saving
                  targetRange = targetRange.replace(/'!/g, '!');
                  if (targetRange && targetRange.includes('Datos_Tablas')) {
                      targetRange = targetRange.replace('Datos_Tablas', '\'Datos Tablas\'');
                  }
                  
                  if (targetRange && targetRange.includes('!')) {
                      
                      const oldRange = parseRange(originalNestedGridRange);
                      const newRange = parseRange(targetRange);

                      if (oldRange && newRange && oldRange.sheetName === newRange.sheetName) {
                          // Find Sheet ID of the nested table (e.g., 'Datos Tablas')
                          const nestedSheet = spreadsheet.sheets.find(s => 
                              s.properties.title === newRange.sheetName || 
                              s.properties.title === newRange.sheetName.replace(/'/g, '')
                          );
                          
                          if (nestedSheet) {
                              const rowsDiff = (newRange.endRow - newRange.startRow) - (oldRange.endRow - oldRange.startRow);
                              const colsDiff = (newRange.endCol - newRange.startCol) - (oldRange.endCol - oldRange.startCol);
                              
                              // --- HANDLE ROWS (Vertical Shift) ---
                              // We use insertDimension/deleteDimension for rows because tables are stacked VERTICALLY.
                              if (rowsDiff !== 0) {
                                  if (rowsDiff > 0) {
                                      await insertDimension(
                                          spreadsheet.spreadsheetId, 
                                          nestedSheet.properties.sheetId, 
                                          oldRange.endRow, 
                                          rowsDiff, 
                                          'ROWS', 
                                          token
                                      );
                                  } else {
                                      const rowsToDelete = Math.abs(rowsDiff);
                                      await deleteDimensionRange(
                                          spreadsheet.spreadsheetId,
                                          nestedSheet.properties.sheetId,
                                          newRange.endRow, 
                                          rowsToDelete,
                                          'ROWS',
                                          token
                                      );
                                  }

                                  // Correct downstream table references for rows
                                  const updatesToShift: Promise<any>[] = [];
                                  gridData.forEach((row, idx) => {
                                      if (idx === editingRowIndex) return;
                                      const otherRangeStr = row[csvIndex];
                                      if (!otherRangeStr) return; 
                                      const otherRange = parseRange(otherRangeStr);

                                      if (otherRange && 
                                          otherRange.sheetName === oldRange.sheetName && 
                                          otherRange.startRow >= oldRange.endRow) {
                                          
                                          const newStart = otherRange.startRow + rowsDiff;
                                          const newEnd = otherRange.endRow + rowsDiff;
                                          const sCol = indexToColumnLetter(otherRange.startCol);
                                          const eCol = indexToColumnLetter(otherRange.endCol);
                                          const originalSheetPart = otherRangeStr.split('!')[0];
                                          const newRangeStr = `${originalSheetPart}!${sCol}${newStart}:${eCol}${newEnd}`;
                                          
                                          updatesToShift.push(updateCellValue(
                                              spreadsheet.spreadsheetId,
                                              activeSheet.properties.title,
                                              { row: idx + 1, col: csvIndex, value: newRangeStr },
                                              token
                                          ));
                                      }
                                  });
                                  if (updatesToShift.length > 0) await Promise.all(updatesToShift);
                              }

                              // --- HANDLE COLUMNS (Horizontal Shift) ---
                              // FIX: Do NOT use insertDimension/deleteDimension for columns as it affects other tables stacked vertically.
                              // If expanding: We just overwrite cells (handled by final updateValues).
                              // If shrinking: We must manually clear the cells that are no longer in use to prevent "ghost" data.
                              if (colsDiff < 0) {
                                  const colsToDelete = Math.abs(colsDiff);
                                  // We want to clear from the first column OUTSIDE the new range, up to the end of the old range.
                                  const startClearColIdx = newRange.endCol + 1;
                                  const endClearColIdx = oldRange.endCol; 
                                  
                                  const sColChar = indexToColumnLetter(startClearColIdx);
                                  const eColChar = indexToColumnLetter(endClearColIdx);
                                  
                                  // Ensure sheet name is quoted if it has spaces
                                  let sheetRef = nestedSheet.properties.title;
                                  if (sheetRef.includes(' ') && !sheetRef.startsWith("'")) {
                                      sheetRef = `'${sheetRef}'`;
                                  }

                                  const clearRangeStr = `${sheetRef}!${sColChar}${newRange.startRow}:${eColChar}${newRange.endRow}`;
                                  
                                  // Create grid of empty strings
                                  const numRows = newRange.endRow - newRange.startRow + 1;
                                  const emptyValues = Array(numRows).fill(Array(colsToDelete).fill(''));
                                  
                                  await updateValues(spreadsheet.spreadsheetId, clearRangeStr, emptyValues, token);
                              }
                          }
                      }

                      // 4. Finally write the data
                      await updateValues(spreadsheet.spreadsheetId, targetRange, nestedGridData, token);
                  }
              }

              alert("Registro y datos guardados correctamente.");
              onRefresh();
              setViewMode('LIST');
          }
      } catch (e) {
          console.error(e);
          alert("Error al guardar.");
      } finally {
          setSaving(false);
      }
  };

  // Helper to expand grid rows/cols
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
      newData.pop(); // Remove last row
      setNestedGridData(newData);
      updateRangeString(newData);
  };

  const deleteGridCol = () => {
      if (!nestedGridData[0] || nestedGridData[0].length <= 1) return;
      const newData = nestedGridData.map(row => {
          const newRow = [...row];
          newRow.pop(); // Remove last col
          return newRow;
      });
      setNestedGridData(newData);
      updateRangeString(newData);
  };

  // --- Filtering ---
  const filteredData = gridData.map((row, index) => ({ row, index })).filter(({ row }) => 
      row.some(cell => cell.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  const displayedRows = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- Components ---

  const Breadcrumbs = () => (
      <nav className="flex items-center text-sm text-gray-500 mb-4 overflow-hidden whitespace-nowrap">
          <button onClick={onBack} className="hover:text-[#691C32] transition-colors">Inicio</button>
          <ChevronRight size={14} className="mx-2 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate max-w-[150px]">{spreadsheet.properties.title}</span>
          <ChevronRight size={14} className="mx-2 flex-shrink-0" />
          <button 
            onClick={() => {
                if (activeTab === 'metadatos') return;
                setViewMode('LIST');
            }}
            className={clsx(
                "hover:text-[#691C32] transition-colors capitalize",
                viewMode === 'LIST' && activeTab !== 'metadatos' ? "font-bold text-[#691C32]" : ""
            )}
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

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5]">
       
       {/* New Table Wizard Modal */}
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
                                onChange={(e) => setWizardConfig({...wizardConfig, rows: parseInt(e.target.value)})}
                                className="w-full border rounded px-3 py-2 mt-1"
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-gray-700">Columnas</label>
                           <input 
                                type="number" 
                                min="2" max="26"
                                value={wizardConfig.cols} 
                                onChange={(e) => setWizardConfig({...wizardConfig, cols: parseInt(e.target.value)})}
                                className="w-full border rounded px-3 py-2 mt-1"
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

       {/* Top Bar (Simplified) */}
       <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm z-20">
            <div className="flex items-center gap-3">
                 <button className="md:hidden text-gray-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    <Menu size={24} />
                 </button>
                 <div className="flex flex-col">
                     <h1 className="text-lg font-bold text-[#691C32] capitalize leading-tight">
                         {activeTab === 'metadatos' ? 'Editor de Documento' : activeTab}
                     </h1>
                     <span className="text-xs text-gray-400 font-mono">{currentDocId}</span>
                 </div>
            </div>
            <div className="flex items-center gap-2">
                 {/* Global Actions depending on View */}
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
                        {id: 'secciones', icon: List, label: 'Secciones'},
                        {id: 'tablas', icon: Table, label: 'Tablas'},
                        {id: 'figuras', icon: Image, label: 'Figuras'},
                        {id: 'bibliografia', icon: Book, label: 'Bibliografía'},
                        {id: 'siglas', icon: Type, label: 'Siglas'},
                        {id: 'glosario', icon: FileText, label: 'Glosario'}
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
                                   <Plus size={16} className="mr-2"/> Nuevo Elemento
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
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-[#691C32]"
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                            <tr>
                                                {gridHeaders.map((h, i) => <th key={i} className="px-6 py-3 font-semibold">{h}</th>)}
                                                <th className="px-6 py-3 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {displayedRows.length > 0 ? displayedRows.map(({row, index}) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    {row.map((cell, i) => <td key={i} className="px-6 py-4 truncate max-w-xs">{cell}</td>)}
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => handleEdit(index)} className="text-blue-600 hover:text-blue-800"><Edit size={16}/></button>
                                                            <button onClick={() => handleDelete(index)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={gridHeaders.length + 1} className="px-6 py-12 text-center text-gray-500">No hay registros.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                           </div>
                           {/* Pagination Controls here (omitted for brevity) */}
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

                                <div className="grid grid-cols-1 gap-6 max-w-4xl">
                                    {formHeaders.map((header, i) => {
                                        const isReadOnly = header === 'DocumentoID' || header === 'ID Documento' || header === 'ID';
                                        const isCsvRange = CSV_COL_VARIANTS.includes(header);
                                        
                                        return (
                                            <div key={i} className="space-y-1">
                                                <label className="block text-sm font-medium text-gray-700">{header}</label>
                                                <div className="flex gap-2">
                                                        <input 
                                                            disabled={isReadOnly}
                                                            className={clsx(
                                                                "flex-1 px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#691C32]",
                                                                isReadOnly ? "bg-gray-100 text-gray-500" : "bg-white border-gray-300"
                                                            )}
                                                            value={formData[i] || ''}
                                                            onChange={(e) => {
                                                                const newData = [...formData];
                                                                newData[i] = e.target.value;
                                                                setFormData(newData);
                                                            }}
                                                        />
                                                        {isCsvRange && activeTab === 'tablas' && (
                                                            <Button 
                                                                variant="secondary" 
                                                                size="sm"
                                                                onClick={() => loadNestedGrid(formData[i])} 
                                                                isLoading={loadingGrid}
                                                                title="Recargar Grid"
                                                            >
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

                           {/* Nested Grid Editor (Only for Tablas) */}
                           {activeTab === 'tablas' && (
                               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <Table className="text-[#691C32]" size={20}/>
                                            <h3 className="text-lg font-bold text-gray-900">Valores de la Tabla</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="sm" onClick={deleteGridRow} disabled={nestedGridData.length <= 1} title="Eliminar última fila">
                                                <Minus size={14} className="mr-1"/> Fila
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={addGridRow} title="Añadir fila al final">
                                                <Plus size={14} className="mr-1"/> Fila
                                            </Button>
                                            <div className="w-px bg-gray-300 mx-1"></div>
                                            <Button variant="ghost" size="sm" onClick={deleteGridCol} disabled={!nestedGridData[0] || nestedGridData[0].length <= 1} title="Eliminar última columna">
                                                <Minus size={14} className="mr-1"/> Col
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={addGridCol} title="Añadir columna al final">
                                                <Plus size={14} className="mr-1"/> Col
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
                                                                <td className="px-2 py-2 bg-gray-50 text-[10px] text-gray-400 font-mono select-none w-8 text-center border-r border-gray-200">
                                                                    {rIndex + 1}
                                                                </td>
                                                                {row.map((cell, cIndex) => (
                                                                    <td key={cIndex} className="p-0 border-r border-gray-200 last:border-0 min-w-[120px]">
                                                                        <input 
                                                                                className={clsx(
                                                                                    "w-full h-full px-3 py-2 text-sm focus:outline-none border-none bg-transparent",
                                                                                    rIndex === 0 ? "font-bold text-gray-800 bg-gray-50" : "text-gray-600 focus:bg-blue-50"
                                                                                )}
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
                                   <Save size={16} className="mr-2"/> Guardar Todo
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