import { Spreadsheet, Sheet, CellData } from '../types';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';

export interface Collaborator {
  id: string;
  displayName: string;
  photoLink?: string;
  emailAddress?: string;
  role: string;
}

// Helper for retrying operations with exponential backoff
const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const isRetryable =
      error.message.includes('429') || // Rate limit
      error.message.includes('500') || // Server error
      error.message.includes('502') || // Bad gateway
      error.message.includes('503') || // Service unavailable
      error.message.includes('socket hang up') ||
      error.message.includes('ETIMEDOUT');

    if (retries > 0 && isRetryable) {
      console.warn(`Retrying operation... Attempts left: ${retries}. Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryOperation(operation, retries - 1, delay * 2);
    }
    throw error;
  }
};

// --- MOCK DATA FOR DEMO MODE (Government LaTeX Template Style) ---
const getMockSpreadsheet = (): Spreadsheet => ({
  spreadsheetId: 'demo-latex-gov',
  properties: { title: 'Editor de Documentos LaTeX', locale: 'es_MX', autoRecalc: 'ON_CHANGE', timeZone: 'America/Mexico_City' },
  spreadsheetUrl: '#',
  sheets: [
    {
      properties: { sheetId: 1, title: 'Documentos', index: 0, gridProperties: { rowCount: 20, columnCount: 12 } },
      data: [{
        rowData: [
          // Headers
          {
            values: [
              { userEnteredValue: { stringValue: 'ID' }, formattedValue: 'ID' },
              { userEnteredValue: { stringValue: 'Titulo' }, formattedValue: 'Titulo' },
              { userEnteredValue: { stringValue: 'Subtitulo' }, formattedValue: 'Subtitulo' },
              { userEnteredValue: { stringValue: 'Autor' }, formattedValue: 'Autor' },
              { userEnteredValue: { stringValue: 'Fecha' }, formattedValue: 'Fecha' },
              { userEnteredValue: { stringValue: 'Institucion' }, formattedValue: 'Institucion' },
              { userEnteredValue: { stringValue: 'Unidad' }, formattedValue: 'Unidad' },
              { userEnteredValue: { stringValue: 'NombreCorto' }, formattedValue: 'NombreCorto' },
              { userEnteredValue: { stringValue: 'Version' }, formattedValue: 'Version' },
              { userEnteredValue: { stringValue: 'PalabrasClave' }, formattedValue: 'PalabrasClave' },
            ]
          },
          // Row 1
          {
            values: [
              { userEnteredValue: { stringValue: 'D01' }, formattedValue: 'D01' },
              { userEnteredValue: { stringValue: 'Informe Institucional de Energía 2025' }, formattedValue: 'Informe Institucional de Energía 2025' },
              { userEnteredValue: { stringValue: 'Avances, retos y perspectivas de la transición energética en México' }, formattedValue: 'Avances, retos y perspectivas de la transición energética en México' },
              { userEnteredValue: { stringValue: 'Dirección General de Planeación Energética' }, formattedValue: 'Dirección General de Planeación Energética' },
              { userEnteredValue: { stringValue: '09/12/2025' }, formattedValue: '09/12/2025' },
              { userEnteredValue: { stringValue: 'Secretaría de Energía (SENER)' }, formattedValue: 'Secretaría de Energía (SENER)' },
              { userEnteredValue: { stringValue: 'Unidad de Planeación y Transición Energética' }, formattedValue: 'Unidad de Planeación y Transición Energética' },
              { userEnteredValue: { stringValue: 'InformeEnergia25' }, formattedValue: 'InformeEnergia25' },
              { userEnteredValue: { stringValue: '1' }, formattedValue: '1' },
              { userEnteredValue: { stringValue: 'transición energética; eficiencia; renovables; seguridad energética' }, formattedValue: 'transición energética; eficiencia; renovables; seguridad energética' },
            ]
          }
        ]
      }]
    },
    {
      properties: { sheetId: 2, title: 'Secciones', index: 1, gridProperties: { rowCount: 10, columnCount: 4 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'ID_Seccion' } }, { userEnteredValue: { stringValue: 'Titulo' } }, { userEnteredValue: { stringValue: 'Contenido' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'S01' } }, { userEnteredValue: { stringValue: 'Introducción' } }, { userEnteredValue: { stringValue: 'El panorama energético...' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'S02' } }, { userEnteredValue: { stringValue: 'Metodología' } }, { userEnteredValue: { stringValue: 'Se analizaron datos de...' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D02' } }, { userEnteredValue: { stringValue: 'S01' } }, { userEnteredValue: { stringValue: 'Resumen' } }, { userEnteredValue: { stringValue: 'Otro documento...' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 3, title: 'Tablas', index: 2, gridProperties: { rowCount: 5, columnCount: 6 } },
      data: [{
        rowData: [
          // Updated Headers: Replaced 'Tabla' with 'ID_Seccion' and 'Orden'
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'ID_Seccion' } }, { userEnteredValue: { stringValue: 'Orden' } }, { userEnteredValue: { stringValue: 'Título' } }, { userEnteredValue: { stringValue: 'Datos CSV' } }, { userEnteredValue: { stringValue: 'Fuente' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'S02' } }, { userEnteredValue: { numberValue: 1 } }, { userEnteredValue: { stringValue: 'Capacidad instalada de generación eléctrica' } }, { userEnteredValue: { stringValue: "'Datos Tablas'!A1:E4" } }, { userEnteredValue: { stringValue: 'Elaboración propia con base en el Balance Nacional de Energía' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'S02' } }, { userEnteredValue: { numberValue: 2 } }, { userEnteredValue: { stringValue: 'Ejemplo de Notas al Pie de tablas' } }, { userEnteredValue: { stringValue: "'Datos Tablas'!A6:D10" } }, { userEnteredValue: { stringValue: 'Elaboración propia.\\n\\n1/ Incluye generación distribuida.' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 8, title: 'Datos_Tablas', index: 7, gridProperties: { rowCount: 100, columnCount: 26 } },
      data: [{
        rowData: [
          // Range A1:E4 (Tabla 2.1)
          { values: [{ userEnteredValue: { stringValue: 'Tecnología' } }, { userEnteredValue: { stringValue: '2023' } }, { userEnteredValue: { stringValue: '2024' } }, { userEnteredValue: { stringValue: '2025' } }, { userEnteredValue: { stringValue: 'Var %' } }] },
          { values: [{ userEnteredValue: { stringValue: 'Ciclo Combinado' } }, { userEnteredValue: { numberValue: 35000 } }, { userEnteredValue: { numberValue: 36000 } }, { userEnteredValue: { numberValue: 37500 } }, { userEnteredValue: { numberValue: 4.1 } }] },
          { values: [{ userEnteredValue: { stringValue: 'Solar' } }, { userEnteredValue: { numberValue: 8000 } }, { userEnteredValue: { numberValue: 9500 } }, { userEnteredValue: { numberValue: 11000 } }, { userEnteredValue: { numberValue: 15.7 } }] },
          { values: [{ userEnteredValue: { stringValue: 'Eólica' } }, { userEnteredValue: { numberValue: 7000 } }, { userEnteredValue: { numberValue: 7200 } }, { userEnteredValue: { numberValue: 7500 } }, { userEnteredValue: { numberValue: 4.1 } }] },
          // Spacer Row 5
          { values: [] },
          // Range A6:D10 (Tabla 3.2)
          { values: [{ userEnteredValue: { stringValue: 'Región' } }, { userEnteredValue: { stringValue: 'Consumo (GWh)' } }, { userEnteredValue: { stringValue: 'Pérdidas (%)' } }, { userEnteredValue: { stringValue: 'Usuarios (M)' } }] },
          { values: [{ userEnteredValue: { stringValue: 'Central' } }, { userEnteredValue: { numberValue: 45000 } }, { userEnteredValue: { numberValue: 12.5 } }, { userEnteredValue: { numberValue: 10.2 } }] },
          { values: [{ userEnteredValue: { stringValue: 'Noreste' } }, { userEnteredValue: { numberValue: 38000 } }, { userEnteredValue: { numberValue: 8.2 } }, { userEnteredValue: { numberValue: 5.4 } }] },
          { values: [{ userEnteredValue: { stringValue: 'Occidente' } }, { userEnteredValue: { numberValue: 32000 } }, { userEnteredValue: { numberValue: 9.8 } }, { userEnteredValue: { numberValue: 6.1 } }] },
          { values: [{ userEnteredValue: { stringValue: 'Total' } }, { userEnteredValue: { numberValue: 115000 } }, { userEnteredValue: { numberValue: 10.1 } }, { userEnteredValue: { numberValue: 21.7 } }] },
        ]
      }]
    },
    {
      properties: { sheetId: 4, title: 'Figuras', index: 3, gridProperties: { rowCount: 5, columnCount: 5 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'Fig.' } }, { userEnteredValue: { stringValue: 'Título/Descripción' } }, { userEnteredValue: { stringValue: 'Ruta de Imagen' } }, { userEnteredValue: { stringValue: 'Fuente' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: '2.1' } }, { userEnteredValue: { stringValue: 'Evolución de la capacidad instalada 2020-2025' } }, { userEnteredValue: { stringValue: 'img/graficos/figura_2_1.png' } }, { userEnteredValue: { stringValue: 'SENER, 2025' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: '3.1' } }, { userEnteredValue: { stringValue: 'Distribución del consumo final de energía' } }, { userEnteredValue: { stringValue: 'img/graficos/figura_2_12.png' } }, { userEnteredValue: { stringValue: 'Cálculos de la Unidad de Planeación' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 5, title: 'Bibliografía', index: 4, gridProperties: { rowCount: 5, columnCount: 5 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'Clave' } }, { userEnteredValue: { stringValue: 'Tipo' } }, { userEnteredValue: { stringValue: 'Año' } }, { userEnteredValue: { stringValue: 'Referencia' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'cenace2023_flexibilidad' } }, { userEnteredValue: { stringValue: 'article' } }, { userEnteredValue: { stringValue: '2023' } }, { userEnteredValue: { stringValue: 'CENACE. Retos operativos para la integración de renovables...' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'inventarioGEI2024' } }, { userEnteredValue: { stringValue: 'online' } }, { userEnteredValue: { stringValue: '2024' } }, { userEnteredValue: { stringValue: 'Instituto Nacional de Ecología y Cambio Climático. Inventario Nacional...' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 6, title: 'Siglas', index: 5, gridProperties: { rowCount: 5, columnCount: 3 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'Sigla' } }, { userEnteredValue: { stringValue: 'Definición/Significado' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'CENACE' } }, { userEnteredValue: { stringValue: 'Centro Nacional de Control de Energía' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'SENER' } }, { userEnteredValue: { stringValue: 'Secretaría de Energía' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 7, title: 'Glosario', index: 6, gridProperties: { rowCount: 5, columnCount: 3 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'Término' } }, { userEnteredValue: { stringValue: 'Definición' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'Energías Limpias' } }, { userEnteredValue: { stringValue: 'Fuentes de energía y procesos de generación de electricidad cuyas emisiones...' } }] }
        ]
      }]
    },
    {
      properties: { sheetId: 8, title: 'Unidades', index: 7, gridProperties: { rowCount: 5, columnCount: 3 } },
      data: [{
        rowData: [
          { values: [{ userEnteredValue: { stringValue: 'DocumentoID' } }, { userEnteredValue: { stringValue: 'Unidad' } }, { userEnteredValue: { stringValue: 'Descripción' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'MW' } }, { userEnteredValue: { stringValue: 'Megawatt' } }] },
          { values: [{ userEnteredValue: { stringValue: 'D01' } }, { userEnteredValue: { stringValue: 'GWh' } }, { userEnteredValue: { stringValue: 'Gigawatt-hora' } }] }
        ]
      }]
    }
  ]
});
// -------------------------------

const getHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
});

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || response.statusText || 'Unknown API Error';
    if (response.status === 401) {
      throw new Error(`UNAUTHENTICATED: ${message}`);
    }
    // If range parsing fails, it might be because the sheet doesn't exist.
    // Return empty values instead of crashing to allow the app to continue.
    if (message.includes('Unable to parse range') || message.includes('Range not found')) {
        console.warn(`[SheetsAPI] Range error ignored: ${message}`);
        return { values: [] };
    }
    throw new Error(message);
  }
  return response.json();
};

export const fetchCollaborators = async (fileId: string, token: string): Promise<Collaborator[]> => {
  if (token === 'DEMO') {
    return [
      { id: '1', displayName: 'Juan Silva', role: 'owner' },
      { id: '2', displayName: 'Ana Lopez', role: 'writer' },
      { id: '3', displayName: 'Carlos Ruiz', role: 'writer' },
      { id: '4', displayName: 'Maria Diaz', role: 'reader' }
    ];
  }

  try {
    const response = await retryOperation(() => fetch(`${DRIVE_BASE_URL}/${fileId}/permissions?fields=permissions(id,displayName,photoLink,emailAddress,role)`, {
      headers: getHeaders(token),
    }));
    const data = await handleResponse(response);
    return data.permissions || [];
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return [];
  }
};

export const fetchLastModifiedTime = async (fileId: string, token: string): Promise<string> => {
  if (token === 'DEMO') {
    // Return a date 2 hours ago
    const date = new Date();
    date.setHours(date.getHours() - 2);
    return date.toISOString();
  }

  try {
    const response = await retryOperation(() => fetch(`${DRIVE_BASE_URL}/${fileId}?fields=modifiedTime`, {
      headers: getHeaders(token),
    }));
    const data = await handleResponse(response);
    return data.modifiedTime;
  } catch (error) {
    console.error('Error fetching modified time:', error);
    return new Date().toISOString(); // Fallback
  }
};

export const fetchSpreadsheet = async (spreadsheetId: string, token: string): Promise<Spreadsheet> => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 180));
    return getMockSpreadsheet();
  }

  const response = await retryOperation(() => fetch(`${BASE_URL}/${spreadsheetId}?includeGridData=true`, {
    headers: getHeaders(token),
  }));
  return handleResponse(response);
};

export const fetchSpreadsheetProperties = async (spreadsheetId: string, token: string): Promise<{ title: string }> => {
  if (token === 'DEMO') {
    return { title: 'Demo Spreadsheet' };
  }
  const response = await retryOperation(() => fetch(`${BASE_URL}/${spreadsheetId}?fields=properties.title`, {
    headers: getHeaders(token),
  }));
  const data = await handleResponse(response);
  return data.properties;
};

export const createSpreadsheet = async (title: string, token: string): Promise<Spreadsheet> => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 220));
    const mock = getMockSpreadsheet();
    mock.properties.title = title;
    return mock;
  }

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      properties: { title },
    }),
  });
  return handleResponse(response);
};

export const copySpreadsheet = async (fileId: string, title: string, token: string): Promise<Spreadsheet> => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 800));
    const mock = getMockSpreadsheet();
    mock.properties.title = title;
    mock.spreadsheetId = `demo-copy-${Date.now()}`;
    return mock;
  }

  const response = await retryOperation(() => fetch(`${DRIVE_BASE_URL}/${fileId}/copy`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      name: title,
    }),
  }));
  const fileData = await handleResponse(response);

  // After copying, we return a basic Spreadsheet object structure
  // The full data would require a fetchSpreadsheet call, but for the index we just need ID and properties
  return {
    spreadsheetId: fileData.id,
    properties: {
      title: fileData.name || title,
      locale: 'es_MX', // Default assumption until fetched
      autoRecalc: 'ON_CHANGE',
      timeZone: 'America/Mexico_City'
    },
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${fileData.id}/edit`,
    sheets: []
  };
};

export const deleteFile = async (fileId: string, token: string) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {};
  }

  const response = await retryOperation(() => fetch(`${DRIVE_BASE_URL}/${fileId}`, {
    method: 'DELETE',
    headers: getHeaders(token),
  }));

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || response.statusText || 'Unknown API Error';
    throw new Error(message);
  }
  return true;
};

export const updateCellValue = async (
  spreadsheetId: string,
  sheetName: string,
  cell: CellData,
  token: string
) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { updatedRange: 'Demo!A1' };
  }

  const getColumnLetter = (colIndex: number) => {
    let temp, letter = '';
    while (colIndex >= 0) {
      temp = (colIndex) % 26;
      letter = String.fromCharCode(temp + 65) + letter;
      colIndex = Math.floor((colIndex) / 26) - 1;
    }
    return letter;
  };

  const range = `${sheetName}!${getColumnLetter(cell.col)}${cell.row + 1}`;

  const response = await retryOperation(() => fetch(`${BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[cell.value]],
    }),
  }));
  return handleResponse(response);
};

export const appendRow = async (
  spreadsheetId: string,
  sheetName: string,
  values: string[],
  token: string
) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 150));
    return {};
  }

  const range = `${sheetName}!A1`;
  const response = await retryOperation(() => fetch(`${BASE_URL}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [values],
    }),
  }));
  return handleResponse(response);
}

export const deleteRow = async (
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number,
  token: string
) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 130));
    return {};
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex,
            endIndex: rowIndex + 1
          }
        }
      }]
    })
  });
  return handleResponse(response);
}

export const deleteDimensionRange = async (
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  count: number,
  dimension: 'ROWS' | 'COLUMNS',
  token: string
) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 130));
    return {};
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: dimension,
            startIndex: startIndex,
            endIndex: startIndex + count
          }
        }
      }]
    })
  });
  return handleResponse(response);
}

export const createNewTab = async (spreadsheetId: string, title: string, token: string) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 160));
    return {};
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
  });
  return handleResponse(response);
};

export const insertDimension = async (
  spreadsheetId: string,
  sheetId: number,
  startIndex: number,
  count: number,
  dimension: 'ROWS' | 'COLUMNS',
  token: string
) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 400));
    return {};
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({
      requests: [{
        insertDimension: {
          range: {
            sheetId: sheetId,
            dimension: dimension,
            startIndex: startIndex,
            endIndex: startIndex + count
          },
          inheritFromBefore: true
        }
      }]
    })
  });
  return handleResponse(response);
}

// Helper for generic column math in Demo mode
const columnLetterToIndex = (letter: string) => {
  let column = 0;
  const length = letter.length;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
  }
  return column - 1; // 0-based
};

// --- Values Fetching for Range (Grid Editor) ---
export const fetchValues = async (spreadsheetId: string, range: string, token: string): Promise<string[][]> => {
  if (token === 'DEMO') {
    // Mock returning data based on the mock setup
    // Handles ranges like: "Datos Tablas!A1:B2" or "'Datos Tablas'!A1:B2" or "Datos_Tablas!A1:B2"
    const parts = range.split('!');
    let sheetName = parts[0];
    const rangeRef = parts[1];

    // 1. Remove wrapping single quotes if present
    if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
      sheetName = sheetName.slice(1, -1);
    }

    // 2. Normalize sheet name check (Handle space vs underscore mismatch)
    const isDatosTablas = sheetName === 'Datos Tablas' || sheetName === 'Datos_Tablas';

    // Return dummy data for demo purposes if it matches our mock keys
    if (isDatosTablas) {
      if (rangeRef.startsWith('A1') && !rangeRef.includes('21')) { // Very loose check for specific demo scenarios
        return [
          ['Tecnología', '2023', '2024', '2025', 'Var %'],
          ['Ciclo Combinado', '35000', '36000', '37500', '4.1'],
          ['Solar', '8000', '9500', '11000', '15.7'],
          ['Eólica', '7000', '7200', '7500', '4.1']
        ];
      } else if (rangeRef.startsWith('A6')) {
        return [
          ['Región', 'Consumo (GWh)', 'Pérdidas (%)', 'Usuarios (M)'],
          ['Central', '45000', '12.5', '10.2'],
          ['Noreste', '38000', '8.2', '5.4'],
          ['Occidente', '32000', '9.8', '6.1'],
          ['Total', '115000', '10.1', '21.7']
        ];
      }
    }

    // Generic fallback for any other range (e.g. A21:L42) to prevent blank screen in demo
    if (rangeRef.includes(':')) {
      try {
        const [start, end] = rangeRef.split(':');
        const startMatch = start.match(/([A-Z]+)([0-9]+)/);
        const endMatch = end.match(/([A-Z]+)([0-9]+)/);

        if (startMatch && endMatch) {
          const startRow = parseInt(startMatch[2]);
          const endRow = parseInt(endMatch[2]);
          const startCol = columnLetterToIndex(startMatch[1]);
          const endCol = columnLetterToIndex(endMatch[1]);

          const rows = endRow - startRow + 1;
          const cols = endCol - startCol + 1;

          // Generate empty grid of this size
          return Array(rows).fill('').map((_, r) =>
            Array(cols).fill('').map((__, c) =>
              r === 0 ? `Header ${c + 1}` : ''
            )
          );
        }
      } catch (e) { console.error("Demo parsing error", e) }
    }

    return [['', '', '', '', ''], ['', '', '', '', '']]; // Generic fallback
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}`, {
    headers: getHeaders(token),
  });
  const json = await handleResponse(response);
  return json.values || [];
}

export const updateValues = async (spreadsheetId: string, range: string, values: string[][], token: string) => {
  if (token === 'DEMO') {
    await new Promise(resolve => setTimeout(resolve, 500));
    return {};
  }

  const response = await fetch(`${BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: getHeaders(token),
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: values,
    }),
  });
  return handleResponse(response);
}
