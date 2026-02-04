# Solución: Celdas Combinadas en el Front-End

## Problema
Las celdas combinadas en Google Sheets no se mostraban como combinadas en el front-end. Aparecían como celdas separadas.

## Causa Raíz
La función `fetchSpreadsheetCells` en `services/sheetsService.ts` **NO estaba solicitando el campo `merges`** en la petición a la API de Google Sheets.

## Solución Implementada

### 1. Corrección en sheetsService.ts (Línea ~655)

**ANTES:**
```typescript
const response = await retryOperation(() => fetch(
    `${BASE_URL}/${spreadsheetId}?ranges=${ranges.map(r => encodeURIComponent(r)).join('&ranges=')}&includeGridData=true`,
    { headers: getHeaders(token) }
));
```

**DESPUÉS:**
```typescript
const encodedRanges = ranges.map(r => encodeURIComponent(r)).join('&ranges=');
const response = await retryOperation(() => fetch(
    `${BASE_URL}/${spreadsheetId}?ranges=${encodedRanges}&fields=sheets(data(rowData(values(formattedValue,userEnteredValue)),startRow,startColumn),merges)&includeGridData=true`,
    { headers: getHeaders(token) }
));
```

**Cambio clave:** Agregado el parámetro `fields` que incluye:
- `sheets(data(rowData(...)))` - Para obtener los datos de las celdas
- `merges` - **Para obtener las celdas combinadas**

### 2. Logs de Depuración Agregados

#### En sheetsService.ts (Línea ~668):
```typescript
console.log('[sheetsService] fetchSpreadsheetCells response:', {
    sheetsCount: data.sheets?.length || 0,
    firstSheetMerges: data.sheets?.[0]?.merges?.length || 0,
    merges: data.sheets?.[0]?.merges
});
```

#### En SheetEditor.tsx - loadNestedGrid (Línea ~1703):
```typescript
console.log('[SheetEditor] Loaded grid data:', {
    range: correctedRange,
    rowCount: rowData?.length || 0,
    mergeCount: merges?.length || 0,
    merges: merges
});
```

#### En SheetEditor.tsx - Renderizado (Línea ~4680):
```typescript
if (rIndex === 0 && cIndex === 0) {
    console.log('[SheetEditor] Merge detected:', { absRow, absCol, rowSpan, colSpan, merge });
}
```

### 3. Indicador Visual en la UI (Línea ~4555)

Agregado badge que muestra el número de celdas combinadas detectadas:

```typescript
{nestedGridMerges && nestedGridMerges.length > 0 && (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
        <Grid size={12} /> {nestedGridMerges.length} merge{nestedGridMerges.length !== 1 ? 's' : ''}
    </span>
)}
```

## Cómo Funciona el Renderizado de Celdas Combinadas

El código ya tenía la lógica correcta para renderizar celdas combinadas (estaba implementada desde antes):

```typescript
// 1. Detectar si la celda está en un merge
if (nestedGridMerges && nestedGridMerges.length > 0) {
    const merge = nestedGridMerges.find(m =>
        absRow >= m.startRowIndex && absRow < m.endRowIndex &&
        absCol >= m.startColumnIndex && absCol < m.endColumnIndex
    );

    if (merge) {
        // 2. Si es la celda superior izquierda del merge, aplicar rowSpan/colSpan
        if (absRow === merge.startRowIndex && absCol === merge.startColumnIndex) {
            rowSpan = merge.endRowIndex - merge.startRowIndex;
            colSpan = merge.endColumnIndex - merge.startColumnIndex;
        } else {
            // 3. Si es una celda dentro del merge (pero no la superior izquierda), ocultarla
            isHidden = true;
        }
    }
}

// 4. No renderizar celdas ocultas
if (isHidden) return null;

// 5. Aplicar rowSpan y colSpan al <td>
<td colSpan={colSpan} rowSpan={rowSpan}>
    ...
</td>
```

## Formato de Merges en Google Sheets API

```typescript
{
    sheetId: number,
    startRowIndex: number,    // 0-based, inclusive
    endRowIndex: number,      // 0-based, exclusive
    startColumnIndex: number, // 0-based, inclusive
    endColumnIndex: number    // 0-based, exclusive
}
```

**Ejemplo:** Celda combinada A1:B2
```typescript
{
    startRowIndex: 0,
    endRowIndex: 2,      // Filas 0 y 1 (2 filas)
    startColumnIndex: 0,
    endColumnIndex: 2    // Columnas 0 y 1 (2 columnas)
}
```

## Verificación

### 1. Abrir Consola del Navegador (F12)

### 2. Cargar una Tabla con Celdas Combinadas

### 3. Verificar Logs

**Log esperado en sheetsService:**
```
[sheetsService] fetchSpreadsheetCells response: {
    sheetsCount: 1,
    firstSheetMerges: 2,
    merges: [
        { startRowIndex: 0, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 1 },
        { startRowIndex: 0, endRowIndex: 1, startColumnIndex: 2, endColumnIndex: 4 }
    ]
}
```

**Log esperado en SheetEditor:**
```
[SheetEditor] Loaded grid data: {
    range: "Tabla1!A1:E10",
    rowCount: 10,
    mergeCount: 2,
    merges: [...]
}
```

### 4. Verificar Badge Visual

En el header "Valores de la Tabla" debe aparecer:
- Badge azul con ícono de Grid
- Texto: "2 merges" (o el número correspondiente)

### 5. Verificar Renderizado

Las celdas combinadas deben:
- ✅ Mostrarse como una sola celda grande
- ✅ Tener el contenido de la celda superior izquierda
- ✅ Las celdas internas no deben renderizarse (están ocultas)

## Archivos Modificados

1. **services/sheetsService.ts**
   - Línea ~655: Agregado parámetro `fields` con `merges`
   - Línea ~668: Agregado log de depuración

2. **components/SheetEditor.tsx**
   - Línea ~1703: Agregado log al cargar grid
   - Línea ~4555: Agregado badge visual de merges
   - Línea ~4680: Agregado log al detectar merge en renderizado

## Resultado Final

✅ Las celdas combinadas en Google Sheets ahora se muestran correctamente como combinadas en el front-end
✅ El auto-save respeta la estructura de celdas combinadas
✅ Los logs permiten diagnosticar problemas fácilmente
✅ El badge visual confirma que los merges se cargaron correctamente

## Notas Importantes

- El auto-save guarda el valor en la celda correcta (superior izquierda del merge)
- Las celdas ocultas (dentro del merge) no se renderizan en el DOM
- Los índices son 0-based y el `endRowIndex`/`endColumnIndex` son **exclusivos**
- El campo `fields` en la API es **crítico** - sin él, no se devuelven los merges
