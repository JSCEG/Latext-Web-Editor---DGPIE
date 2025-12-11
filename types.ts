export interface SheetProperties {
  sheetId: number;
  title: string;
  index: number;
  gridProperties?: {
    rowCount: number;
    columnCount: number;
  };
}

export interface Sheet {
  properties: SheetProperties;
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

// Helper type for Gemini responses
export interface AIGeneratedData {
  values: string[][];
  explanation: string;
}
