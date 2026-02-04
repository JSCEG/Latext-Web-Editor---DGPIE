/**
 * Grid utilities for table operations
 */

export interface GridRange {
  startRowIndex: number;
  endRowIndex: number;
  startColumnIndex: number;
  endColumnIndex: number;
}

export interface MergeValidation {
  isValid: boolean;
  error?: string;
}

/**
 * Validates if a merge selection is valid
 * @param start - Start cell coordinates
 * @param end - End cell coordinates
 * @param gridRange - The grid range to validate against
 * @param existingMerges - Existing merges to check for conflicts
 */
export function validateMergeSelection(
  start: { row: number; col: number },
  end: { row: number; col: number },
  gridRange: GridRange,
  existingMerges: GridRange[]
): MergeValidation {
  // Check if selection is within grid bounds
  if (
    start.row < gridRange.startRowIndex ||
    end.row >= gridRange.endRowIndex ||
    start.col < gridRange.startColumnIndex ||
    end.col >= gridRange.endColumnIndex
  ) {
    return {
      isValid: false,
      error: "La selección está fuera de los límites de la tabla"
    };
  }

  // Check if selection is a single cell (no merge needed)
  if (start.row === end.row && start.col === end.col) {
    return {
      isValid: false,
      error: "Selecciona más de una celda para combinar"
    };
  }

  // Check for conflicts with existing merges
  for (const merge of existingMerges) {
    const hasOverlap = !(
      end.row < merge.startRowIndex ||
      start.row >= merge.endRowIndex ||
      end.col < merge.startColumnIndex ||
      start.col >= merge.endColumnIndex
    );

    if (hasOverlap) {
      // Check if it's an exact match (trying to unmerge)
      const isExactMatch =
        start.row === merge.startRowIndex &&
        end.row === merge.endRowIndex - 1 &&
        start.col === merge.startColumnIndex &&
        end.col === merge.endColumnIndex - 1;

      // Check if the existing merge is fully contained within the new selection
      // (This allows merging over existing merges, effectively consuming them)
      const isContained =
        start.row <= merge.startRowIndex &&
        end.row >= merge.endRowIndex - 1 &&
        start.col <= merge.startColumnIndex &&
        end.col >= merge.endColumnIndex - 1;

      if (!isExactMatch && !isContained) {
        return {
          isValid: false,
          error: "La selección se superpone con una celda combinada existente (parcialmente)"
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Parses a simple range string like "A1:B2"
 * @param range - Range string to parse
 */
export function parseRangeSimple(range: string): {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
  sheetName: string;
} | null {
  // Handle range strings that might include sheet name (e.g. "Sheet1!A1:B2")
  const parts = range.split('!');
  const sheetName = parts.length > 1 ? parts[0].replace(/^'|'$/g, '') : 'Sheet1'; // Default to Sheet1 if not present, strip quotes
  const rangePart = parts.length > 1 ? parts[1] : parts[0];

  const match = rangePart.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);
  if (!match) return null;

  const [, startColStr, startRowStr, endColStr, endRowStr] = match;

  return {
    startRow: parseInt(startRowStr, 10) - 1,
    startCol: columnToIndex(startColStr),
    endRow: parseInt(endRowStr, 10) - 1,
    endCol: columnToIndex(endColStr),
    sheetName: sheetName
  };
}

/**
 * Converts column letter to index (A=0, B=1, etc.)
 */
function columnToIndex(col: string): number {
  let index = 0;
  for (let i = 0; i < col.length; i++) {
    index = index * 26 + (col.charCodeAt(i) - 65 + 1);
  }
  return index - 1;
}

/**
 * Expands a selection to include full merged cells
 * @param start - Start cell coordinates
 * @param end - End cell coordinates
 * @param merges - Existing merges
 */
export function expandSelection(
  start: { row: number; col: number },
  end: { row: number; col: number },
  merges: GridRange[]
): { start: { row: number; col: number }; end: { row: number; col: number } } {
  let minRow = Math.min(start.row, end.row);
  let maxRow = Math.max(start.row, end.row);
  let minCol = Math.min(start.col, end.col);
  let maxCol = Math.max(start.col, end.col);

  let expanded = true;
  while (expanded) {
    expanded = false;

    for (const merge of merges) {
      // Check if selection overlaps with this merge
      const hasOverlap = !(
        maxRow < merge.startRowIndex ||
        minRow >= merge.endRowIndex ||
        maxCol < merge.startColumnIndex ||
        minCol >= merge.endColumnIndex
      );

      if (hasOverlap) {
        // Expand selection to include the entire merge
        if (merge.startRowIndex < minRow) {
          minRow = merge.startRowIndex;
          expanded = true;
        }
        if (merge.endRowIndex - 1 > maxRow) {
          maxRow = merge.endRowIndex - 1;
          expanded = true;
        }
        if (merge.startColumnIndex < minCol) {
          minCol = merge.startColumnIndex;
          expanded = true;
        }
        if (merge.endColumnIndex - 1 > maxCol) {
          maxCol = merge.endColumnIndex - 1;
          expanded = true;
        }
      }
    }
  }

  return {
    start: { row: minRow, col: minCol },
    end: { row: maxRow, col: maxCol }
  };
}
