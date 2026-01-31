export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface GridRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface Sheet {
  properties: SheetProperties;
  merges?: GridRange[];
  data?: {
    rowData?: {
      values?: {
        userEnteredValue?: {
          stringValue?: string;
          numberValue?: number;
          boolValue?: boolean;
          formulaValue?: string;
        };
        formattedValue?: string;
      }[];
    }[];
  }[];
}

export interface Spreadsheet {
  spreadsheetId: string;
  properties: {
    title: string;
    locale: string;
    autoRecalc: string;
    timeZone: string;
  };
  sheets: Sheet[];
  spreadsheetUrl: string;
}

export interface CellData {
  row: number;
  col: number;
  value: string;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
}

// Table Styling System
export type HAlignType = 'left' | 'center' | 'right';
export type VAlignType = 'top' | 'middle' | 'bottom';

export interface CellStyle {
  backgroundColor?: string; // hex color or named color
  textColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  hAlign?: HAlignType;
  vAlign?: VAlignType;
  fontSize?: number;
}

export interface ColumnStyle {
  width?: string; // e.g., "2cm", "3cm"
  hAlign?: HAlignType;
  backgroundColor?: string;
  textColor?: string;
}

export interface RowStyle {
  backgroundColor?: string;
  textColor?: string;
  isBold?: boolean;
  striped?: boolean; // para alternancia de colores
}

export interface TableStyle {
  id: string;
  tableId: string; // Referencia a tabla TBL-X-Y
  headerStyle?: RowStyle;
  columnStyles?: ColumnStyle[]; // array por columna
  rowStyles?: RowStyle[]; // array por fila (override por fila)
  cellStyles?: { [key: string]: CellStyle }; // key: "row,col" e.g., "0,1"
  alternateRowColor?: string; // color para striping
  borderColor?: string;
  stripingEnabled?: boolean;
}

// Helper type for Gemini responses
export interface AIGeneratedData {
  values: string[][];
  explanation: string;
}
