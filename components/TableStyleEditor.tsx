import React, { useState } from 'react';
import {
  TableStyle,
  CellStyle,
  ColumnStyle,
  RowStyle,
  HAlignType,
  VAlignType,
} from '../types';
import {
  Plus,
  Trash2,
  Palette,
  Type,
  Copy,
  Grid,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface TableStyleEditorProps {
  tableId: string;
  numRows: number;
  numCols: number;
  onStylesChange: (styles: TableStyle) => void;
  initialStyle?: TableStyle;
}

const PRESET_COLORS = [
  '#FFFFFF',
  '#F5F5DC', // beige
  '#FFFACD', // light yellow
  '#FFE4E1', // misty rose
  '#E6F3FF', // light blue
  '#F0FFF0', // honeydew
  '#D4A574', // SENER dorado
  '#8B4513', // SENER brown
  '#DC143C', // crimson
  '#000000', // black
];

const COLOR_NAMES: Record<string, string> = {
  '#D4A574': 'Dorado SENER',
  '#8B4513': 'Marrón SENER',
  '#F5F5DC': 'Beige',
  '#FFFACD': 'Amarillo claro',
  '#FFE4E1': 'Rosa suave',
  '#E6F3FF': 'Azul claro',
  '#F0FFF0': 'Verde claro',
};

export const TableStyleEditor: React.FC<TableStyleEditorProps> = ({
  tableId,
  numRows,
  numCols,
  onStylesChange,
  initialStyle,
}) => {
  const [style, setStyle] = useState<TableStyle>(
    initialStyle || {
      id: `style-${tableId}-${Date.now()}`,
      tableId,
      headerStyle: {
        backgroundColor: '#D4A574',
        textColor: '#FFFFFF',
        isBold: true,
      },
      columnStyles: Array(numCols).fill({}),
      alternateRowColor: '#F5F5F5',
      stripingEnabled: false,
    }
  );

  const [activeTab, setActiveTab] = useState<'header' | 'columns' | 'rows' | 'cells' | 'preview'>('header');
  const [selectedCol, setSelectedCol] = useState(0);
  const [selectedRow, setSelectedRow] = useState(1);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  const updateStyle = (updated: Partial<TableStyle>) => {
    const newStyle = { ...style, ...updated };
    setStyle(newStyle);
    onStylesChange(newStyle);
  };

  const updateHeaderStyle = (updated: Partial<RowStyle>) => {
    const newHeader = { ...style.headerStyle, ...updated };
    updateStyle({ headerStyle: newHeader });
  };

  const updateColumnStyle = (col: number, updated: Partial<ColumnStyle>) => {
    const colStyles = [...(style.columnStyles || Array(numCols).fill({}))];
    colStyles[col] = { ...colStyles[col], ...updated };
    updateStyle({ columnStyles: colStyles });
  };

  const updateCellStyle = (row: number, col: number, updated: Partial<CellStyle>) => {
    const key = `${row},${col}`;
    const cellStyles = { ...style.cellStyles };
    cellStyles[key] = { ...cellStyles[key], ...updated };
    updateStyle({ cellStyles });
  };

  const getCellStyle = (row: number, col: number): CellStyle | undefined => {
    return style.cellStyles?.[`${row},${col}`];
  };

  // Color Picker Component
  const ColorPicker: React.FC<{
    value?: string;
    onChange: (color: string) => void;
    label: string;
  }> = ({ value, onChange, label }) => (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <input
        type="color"
        value={value || '#FFFFFF'}
        onChange={(e) => onChange(e.target.value)}
        className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
      />
      <select
        value={value || '#FFFFFF'}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-sm border border-gray-300 rounded px-2 py-1"
      >
        {PRESET_COLORS.map((color) => (
          <option key={color} value={color}>
            {COLOR_NAMES[color] || color}
          </option>
        ))}
      </select>
    </div>
  );

  // Alignment buttons
  const AlignmentButtons: React.FC<{
    value: HAlignType | undefined;
    onChange: (align: HAlignType) => void;
  }> = ({ value, onChange }) => (
    <div className="flex gap-1">
      <button
        onClick={() => onChange('left')}
        className={clsx(
          'p-2 rounded border',
          value === 'left' ? 'bg-blue-200 border-blue-400' : 'bg-white border-gray-300'
        )}
        title="Alinear izquierda"
      >
        <AlignLeft size={16} />
      </button>
      <button
        onClick={() => onChange('center')}
        className={clsx(
          'p-2 rounded border',
          value === 'center' ? 'bg-blue-200 border-blue-400' : 'bg-white border-gray-300'
        )}
        title="Alinear centro"
      >
        <AlignCenter size={16} />
      </button>
      <button
        onClick={() => onChange('right')}
        className={clsx(
          'p-2 rounded border',
          value === 'right' ? 'bg-blue-200 border-blue-400' : 'bg-white border-gray-300'
        )}
        title="Alinear derecha"
      >
        <AlignRight size={16} />
      </button>
    </div>
  );

  return (
    <div className="bg-white border border-gray-300 rounded-lg p-4 max-w-4xl">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Palette size={20} />
        Diseño de Tabla: {tableId}
      </h3>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b">
        {(['header', 'columns', 'rows', 'cells', 'preview'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 font-medium border-b-2 transition',
              activeTab === tab
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Header Tab */}
      {activeTab === 'header' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Estilos de Encabezado</h4>
          <ColorPicker
            value={style.headerStyle?.backgroundColor}
            onChange={(color) => updateHeaderStyle({ backgroundColor: color })}
            label="Color de fondo"
          />
          <ColorPicker
            value={style.headerStyle?.textColor}
            onChange={(color) => updateHeaderStyle({ textColor: color })}
            label="Color de texto"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="headerBold"
              checked={style.headerStyle?.isBold ?? true}
              onChange={(e) => updateHeaderStyle({ isBold: e.target.checked })}
            />
            <label htmlFor="headerBold" className="text-sm font-medium">
              Texto en negrita
            </label>
          </div>
        </div>
      )}

      {/* Columns Tab */}
      {activeTab === 'columns' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Estilos por Columna</h4>
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {Array.from({ length: numCols }).map((_, col) => (
              <button
                key={col}
                onClick={() => setSelectedCol(col)}
                className={clsx(
                  'px-3 py-2 rounded border font-medium',
                  selectedCol === col
                    ? 'bg-blue-500 text-white border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-100'
                )}
              >
                Col {col + 1}
              </button>
            ))}
          </div>

          {selectedCol !== null && (
            <div className="border-t pt-4 space-y-3">
              <ColorPicker
                value={style.columnStyles?.[selectedCol]?.backgroundColor}
                onChange={(color) => updateColumnStyle(selectedCol, { backgroundColor: color })}
                label="Color de fondo"
              />
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Alineación horizontal
                </label>
                <AlignmentButtons
                  value={style.columnStyles?.[selectedCol]?.hAlign}
                  onChange={(align) => updateColumnStyle(selectedCol, { hAlign: align })}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Rows Tab */}
      {activeTab === 'rows' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Estilos por Fila (Data)</h4>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={style.stripingEnabled ?? false}
                onChange={(e) => updateStyle({ stripingEnabled: e.target.checked })}
              />
              <span className="text-sm font-medium">Habilitar filas alternas (Striping)</span>
            </label>
            {style.stripingEnabled && (
              <ColorPicker
                value={style.alternateRowColor}
                onChange={(color) => updateStyle({ alternateRowColor: color })}
                label="Color de filas alternas"
              />
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200 text-sm text-blue-800">
            <p className="font-semibold mb-1">Nota:</p>
            <p>
              Los estilos por fila se aplicarán a las filas de datos (excluyendo encabezado). El striping
              alternará los colores automáticamente.
            </p>
          </div>
        </div>
      )}

      {/* Cells Tab */}
      {activeTab === 'cells' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Estilos Individuales de Celdas</h4>

          {/* Grid de celdas para seleccionar */}
          <div className="grid grid-cols-8 gap-1 border p-2 bg-gray-50 rounded max-h-48 overflow-y-auto">
            {Array.from({ length: numRows }).map((_, row) =>
              Array.from({ length: numCols }).map((_, col) => {
                const key = `${row},${col}`;
                const cellBg = style.cellStyles?.[key]?.backgroundColor || 'white';
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedCell({ row, col })}
                    className={clsx(
                      'w-8 h-8 border rounded text-xs',
                      selectedCell?.row === row && selectedCell?.col === col
                        ? 'border-blue-500 border-2'
                        : 'border-gray-300'
                    )}
                    style={{ backgroundColor: cellBg }}
                    title={`R${row}C${col}`}
                  />
                );
              })
            )}
          </div>

          {selectedCell && (
            <div className="border-t pt-4 space-y-3">
              <h5 className="font-semibold">
                Celda: Fila {selectedCell.row}, Columna {selectedCell.col}
              </h5>
              <ColorPicker
                value={getCellStyle(selectedCell.row, selectedCell.col)?.backgroundColor}
                onChange={(color) =>
                  updateCellStyle(selectedCell.row, selectedCell.col, { backgroundColor: color })
                }
                label="Color de fondo"
              />
              <ColorPicker
                value={getCellStyle(selectedCell.row, selectedCell.col)?.textColor}
                onChange={(color) =>
                  updateCellStyle(selectedCell.row, selectedCell.col, { textColor: color })
                }
                label="Color de texto"
              />
            </div>
          )}
        </div>
      )}

      {/* Preview Tab */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <h4 className="font-semibold">Previsualización</h4>
          <div className="overflow-x-auto border rounded">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr
                  style={{
                    backgroundColor: style.headerStyle?.backgroundColor,
                    color: style.headerStyle?.textColor,
                  }}
                >
                  {Array.from({ length: numCols }).map((_, col) => (
                    <th
                      key={col}
                      className="border border-gray-300 px-3 py-2"
                      style={{
                        fontWeight: style.headerStyle?.isBold ? 'bold' : 'normal',
                        backgroundColor: style.columnStyles?.[col]?.backgroundColor,
                      }}
                    >
                      Encabezado {col + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.min(5, numRows - 1) }).map((_, rowIdx) => {
                  const row = rowIdx + 1;
                  const isAlternate = style.stripingEnabled && rowIdx % 2 === 1;
                  return (
                    <tr key={row}>
                      {Array.from({ length: numCols }).map((_, col) => {
                        const cellStyle = getCellStyle(row, col);
                        const rowBg = isAlternate
                          ? style.alternateRowColor
                          : style.columnStyles?.[col]?.backgroundColor;
                        return (
                          <td
                            key={col}
                            className="border border-gray-300 px-3 py-2"
                            style={{
                              backgroundColor: cellStyle?.backgroundColor || rowBg,
                              color: cellStyle?.textColor,
                              textAlign: style.columnStyles?.[col]?.hAlign as any,
                            }}
                          >
                            Dato {row},{col}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Export for debugging */}
      <details className="mt-6 p-3 bg-gray-100 rounded text-xs">
        <summary className="font-semibold cursor-pointer">Config JSON (para debug)</summary>
        <pre className="mt-2 overflow-auto max-h-48 bg-white p-2 rounded border">
          {JSON.stringify(style, null, 2)}
        </pre>
      </details>
    </div>
  );
};

export default TableStyleEditor;
