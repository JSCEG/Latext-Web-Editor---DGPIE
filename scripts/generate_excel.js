import ExcelJS from 'exceljs';

async function generateExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'WebLatex System';
  workbook.lastModifiedBy = 'WebLatex System';
  workbook.created = new Date();
  workbook.modified = new Date();

  // --- 1. Hoja "Documentos Principales" ---
  const sheetDocs = workbook.addWorksheet('Documentos Principales', {
    views: [{ state: 'frozen', ySplit: 1 }],
    properties: { tabColor: { argb: 'FF691C32' } }
  });

  sheetDocs.columns = [
    { header: 'ID Documento', key: 'id', width: 15 },
    { header: 'Nombre del Documento', key: 'nombre', width: 40 },
    { header: 'Tipo', key: 'tipo', width: 20 },
    { header: 'Fecha Creación', key: 'fecha', width: 15 },
    { header: 'Descripción Breve', key: 'descripcion', width: 50 }
  ];

  // Estilo de Cabecera
  const headerRow = sheetDocs.getRow(1);
  headerRow.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF691C32' } // Burgundy project color
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;

  // Filtros
  sheetDocs.autoFilter = 'A1:E1';

  // Validaciones
  // Columna D (Fecha) - Aunque ExcelJS tiene soporte limitado para crear DataValidations complejos,
  // podemos intentar configurar el tipo de celda.
  // Nota: ExcelJS define validaciones a nivel de celda/rango.
  for (let i = 2; i <= 100; i++) {
    sheetDocs.getCell(`D${i}`).dataValidation = {
      type: 'date',
      operator: 'greaterThan',
      showErrorMessage: true,
      allowBlank: true,
      formulae: [new Date(2000, 0, 1)]
    };
    sheetDocs.getCell(`C${i}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Reporte,Informe,Balance,Anexo,Otro"']
    };
  }

  // Ejemplo de dato
  sheetDocs.addRow({
    id: 'D01',
    nombre: 'Balance Nacional de Energía 2024',
    tipo: 'Balance',
    fecha: new Date(),
    descripcion: 'Documento principal del sector energético.'
  });

  // Formato Condicional (Alternar colores - simulado)
  // ExcelJS soporta conditional formatting rules.
  sheetDocs.addConditionalFormatting({
    ref: 'A2:E100',
    rules: [
      {
        type: 'expression',
        formulae: ['MOD(ROW(),2)=0'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFF5F5F5' } } }
      }
    ]
  });

  // Protección
  await sheetDocs.protect('password123', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: true, // Permitir insertar filas
    insertHyperlinks: true,
    deleteColumns: false,
    deleteRows: false,
    sort: true,
    autoFilter: true,
    pivotTables: false
  });


  // --- 2. Hoja "Metadatos" ---
  const sheetMeta = workbook.addWorksheet('Metadatos', {
    properties: { tabColor: { argb: 'FFBC955C' } }
  });

  sheetMeta.columns = [
    { header: 'Clave', key: 'key', width: 25 },
    { header: 'Valor', key: 'value', width: 40 }
  ];

  sheetMeta.getRow(1).font = { bold: true };
  sheetMeta.getRow(1).border = { bottom: { style: 'thick', color: { argb: 'FFBC955C' } } };

  sheetMeta.addRows([
    { key: 'Fecha Generación', value: new Date() },
    { key: 'Versión Formato', value: '1.0' },
    { key: 'Autor Sistema', value: 'WebLatex Generator' },
    { key: 'Descripción', value: 'Archivo estructura base para gestión documental.' }
  ]);

  // Proteger Metadatos totalmente
  await sheetMeta.protect('admin', {
    selectLockedCells: true,
    selectUnlockedCells: true
  });

  // Guardar archivo
  const filename = 'Documentos_Principales.xlsx';
  await workbook.xlsx.writeFile(filename);
  console.log(`Archivo creado exitosamente: ${filename}`);
}

generateExcel().catch(console.error);
