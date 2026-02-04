# Auto-Save Implementation for Table Editor

## Problem
The table editor (nested grid) was not saving cell edits automatically. Users had to manually click the "Guardar" button, and changes were lost when:
- Switching between table items
- Switching tabs
- Refreshing the page

## Root Cause
Cell edits only updated the `nestedGridData` state but didn't trigger any save mechanism. The `handleSave` function existed but was only called when:
- User clicked "Guardar" button
- Adding/removing rows or columns (via `saveStructureChange`)

## Solution Implemented

### 1. Auto-Save with Debouncing
- Added `debouncedAutoSave()` function that triggers 2 seconds after the last edit
- Prevents excessive API calls while typing
- Automatically saves changes without user intervention

### 2. Unsaved Changes Tracking
- Added `hasUnsavedGridChanges` state flag
- Added `autoSaveTimerRef` to manage the debounce timer
- Visual indicators show when changes are pending

### 3. Visual Feedback
- **Save Button**: Shows a pulsing yellow dot when there are unsaved changes
- **Grid Header**: Shows "Guardando..." badge when auto-save is pending
- Clear visual cues help users understand the save state

### 4. Protection Against Data Loss
- **Tab Switching**: Warns user before switching tabs with unsaved changes
- **Item Switching**: Warns user before editing a different table with unsaved changes
- Gives user option to cancel or proceed without saving

### 5. Cleanup
- Auto-save timer is cleared on component unmount
- Timer is cleared when save completes successfully
- Timer is cleared when user cancels navigation

## Code Changes

### State Additions (Line ~903)
```typescript
const [hasUnsavedGridChanges, setHasUnsavedGridChanges] = useState(false);
const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
```

### Auto-Save Function (Line ~2451)
```typescript
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
```

### Cell Edit Handler Update (Line ~4671)
```typescript
onChange={(e) => {
    const newData = [...nestedGridData];
    newData[rIndex][cIndex] = e.target.value;
    setNestedGridData(newData);
    debouncedAutoSave(); // ← Added this line
}}
```

### Save Button Visual Indicator (Line ~3538)
```typescript
<Button onClick={handleSave} isLoading={saving}>
    <Save size={20} className="mr-2" />
    Guardar Cambios
    {hasUnsavedGridChanges && (
        <span className="ml-2 inline-flex items-center justify-center w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
    )}
</Button>
```

### Grid Header Visual Indicator (Line ~4547)
```typescript
<h3 className="text-lg font-bold text-gray-900">Valores de la Tabla</h3>
{hasUnsavedGridChanges && (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded border border-yellow-200 animate-pulse">
        <AlertCircle size={12} /> Guardando...
    </span>
)}
```

### Navigation Protection (Line ~1959, ~976)
```typescript
const handleEdit = (rowIndex: number) => {
    if (hasUnsavedGridChanges) {
        const confirmSwitch = window.confirm('Tienes cambios sin guardar...');
        if (!confirmSwitch) return;
        // Clear timer and flag
    }
    // ... rest of function
};

const switchTab = (newTab: string) => {
    if (hasUnsavedGridChanges && activeTab === 'tablas') {
        const confirmSwitch = window.confirm('Tienes cambios sin guardar...');
        if (!confirmSwitch) return;
        // Clear timer and flag
    }
    setActiveTab(newTab);
    // ... rest of function
};
```

## User Experience Improvements

### Before
- ❌ Changes lost when switching items
- ❌ No indication of save status
- ❌ Manual save required for every edit
- ❌ Easy to lose work

### After
- ✅ Auto-save after 2 seconds of inactivity
- ✅ Visual indicators show save status
- ✅ Warnings prevent accidental data loss
- ✅ Seamless editing experience

## Testing Recommendations

1. **Basic Auto-Save**: Edit a cell, wait 2 seconds, verify save notification
2. **Debouncing**: Type rapidly in multiple cells, verify only one save after 2 seconds
3. **Tab Switching**: Edit a cell, immediately switch tabs, verify warning appears
4. **Item Switching**: Edit a cell, click another table, verify warning appears
5. **Visual Indicators**: Verify yellow dot appears on save button and "Guardando..." badge appears
6. **Manual Save**: Click "Guardar" button, verify it still works and clears indicators
7. **Row/Column Operations**: Add/remove rows/columns, verify immediate save still works

## Notes

- Auto-save only applies to the nested grid (table content), not form fields
- The 2-second debounce can be adjusted if needed
- Manual save button still works and provides immediate feedback
- Structure changes (add/remove rows/columns) still save immediately via `saveStructureChange`
