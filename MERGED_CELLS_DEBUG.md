# Diagnóstico de Celdas Combinadas

## Problema Reportado
Las celdas combinadas en Google Sheets no se muestran como combinadas en el front-end, aparecen como celdas separadas.

## Verificación del Código

### 1. Carga de Merges ✅
El código ya está cargando los merges correctamente en `loadNestedGrid()`:
```typescript
const { rowData, merges } = await fetchSpreadsheetCells(spreadsheet.spreadsheetId, [correctedRange], token);
setNestedGridMerges(merges || []);
```

### 2. Renderizado con rowSpan/colSpan ✅
El código ya tiene la lógica para aplicar `rowSpan` y `colSpan`:
```typescript
if (nestedGridMerges && nestedGridMerges.length > 0) {
    const merge = nestedGridMerges.find(m =>
        absRow >= m.startRowIndex && absRow < m.endRowIndex &&
        absCol >= m.startColumnIndex && absCol < m.endColumnIndex
    );

    if (merge) {
        if (absRow === merge.startRowIndex && absCol === merge.startColumnIndex) {
            rowSpan = merge.endRowIndex - merge.startRowIndex;
            colSpan = merge.endColumnIndex - merge.startColumnIndex;
        } else {
            isHidden = true; // Ocultar celdas que están dentro del merge
        }
    }
}

if (isHidden) return null; // No renderizar celdas ocultas
```

### 3. Aplicación en el TD ✅
```typescript
<td
    colSpan={colSpan}
    rowSpan={rowSpan}
    ...
>
```

## Logs de Depuración Agregados

### En loadNestedGrid (línea ~1703)
```typescript
console.log('[SheetEditor] Loaded grid data:', {
    range: correctedRange,
    rowCount: rowData?.length || 0,
    mergeCount: merges?.length || 0,
    merges: merges
});
```

### En renderizado (línea ~4680)
```typescript
if (rIndex === 0 && cIndex === 0) {
    console.log('[SheetEditor] Merge detected:', { absRow, absCol, rowSpan, colSpan, merge });
}
```

### Indicador Visual
Agregado badge en el header de la tabla que muestra:
- Número de merges detectados
- Ícono de Grid
- Color azul para indicar que hay merges activos

## Pasos para Diagnosticar

### 1. Abrir la Consola del Navegador
Presiona F12 y ve a la pestaña "Console"

### 2. Cargar una Tabla con Celdas Combinadas
- Ve a la pestaña "Tablas"
- Edita una tabla que tenga celdas combinadas en Google Sheets
- Observa los logs en la consola

### 3. Verificar los Logs

#### Log Esperado al Cargar:
```
[SheetEditor] Loaded grid data: {
    range: "Tabla1!A1:E10",
    rowCount: 10,
    mergeCount: 2,
    merges: [
        {
            startRowIndex: 0,
            endRowIndex: 2,
            startColumnIndex: 0,
            endColumnIndex: 1
        },
        ...
    ]
}
```

#### Log Esperado al Renderizar:
```
[SheetEditor] Merge detected: {
    absRow: 0,
    absCol: 0,
    rowSpan: 2,
    colSpan: 1,
    merge: { startRowIndex: 0, endRowIndex: 2, ... }
}
```

### 4. Verificar el Badge Visual
En el header "Valores de la Tabla" debe aparecer un badge azul que diga:
- "1 merge" (si hay 1 celda combinada)
- "2 merges" (si hay 2 celdas combinadas)
- etc.

## Posibles Problemas y Soluciones

### Problema 1: mergeCount = 0
**Causa**: `fetchSpreadsheetCells` no está devolviendo los merges
**Solución**: Verificar `services/sheetsService.ts` - función `fetchSpreadsheetCells`

### Problema 2: Índices no coinciden
**Causa**: Los índices absolutos (absRow, absCol) no coinciden con los índices del merge
**Solución**: Verificar que `parseRangeSimple` devuelve los índices correctos

### Problema 3: Merges se cargan pero no se aplican
**Causa**: La condición de búsqueda del merge no encuentra coincidencias
**Solución**: Revisar la lógica de comparación en el `find()`

## Formato de Merge en Google Sheets API

Los merges vienen en este formato:
```typescript
{
    sheetId: number,
    startRowIndex: number,    // 0-based, inclusive
    endRowIndex: number,      // 0-based, exclusive
    startColumnIndex: number, // 0-based, inclusive
    endColumnIndex: number    // 0-based, exclusive
}
```

**Ejemplo**: Una celda combinada A1:B2 sería:
```typescript
{
    startRowIndex: 0,
    endRowIndex: 2,      // Filas 0 y 1 (2 filas)
    startColumnIndex: 0,
    endColumnIndex: 2    // Columnas 0 y 1 (2 columnas)
}
```

## Verificación en sheetsService.ts

Asegúrate de que `fetchSpreadsheetCells` incluye el campo `merges` en la respuesta:

```typescript
const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?` +
    `ranges=${encodedRanges}&` +
    `fields=sheets(data(rowData(values(formattedValue,userEnteredValue)),startRow,startColumn),merges)&` +
    `includeGridData=true`,
    { headers: { Authorization: `Bearer ${token}` } }
);
```

El campo `fields` debe incluir `merges` para que la API devuelva las celdas combinadas.

## Próximos Pasos

1. **Ejecuta la aplicación** y abre la consola
2. **Carga una tabla** con celdas combinadas
3. **Revisa los logs** para ver si los merges se están cargando
4. **Verifica el badge** en el header de la tabla
5. **Reporta los resultados** con los logs de la consola

Si los merges no se están cargando (mergeCount = 0), el problema está en `sheetsService.ts`.
Si los merges se cargan pero no se aplican visualmente, el problema está en la lógica de renderizado.
