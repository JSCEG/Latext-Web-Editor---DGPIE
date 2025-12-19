import React, { useEffect, useRef } from 'react';
import { clsx } from 'clsx';
import { Book, Image, Table, FileText, Grid, AlertTriangle, Info, Lightbulb, Type, Hash } from 'lucide-react';

export interface AutocompleteItem {
    id: string;
    label: string;
    type: 'cita' | 'figura' | 'tabla' | 'block' | 'style' | 'math';
    value?: string; // e.g. the citation key or figure ID
    desc?: string;
}

interface EditorAutocompleteProps {
    items: AutocompleteItem[];
    selectedIndex: number;
    position: { top: number; left: number };
    onSelect: (item: AutocompleteItem) => void;
    onClose: () => void;
}

export const EditorAutocomplete: React.FC<EditorAutocompleteProps> = ({
    items,
    selectedIndex,
    position,
    onSelect,
    onClose
}) => {
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        if (listRef.current && items.length > 0) {
            const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
            if (selectedElement) {
                selectedElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex, items]);

    if (items.length === 0) return null;

    const getIcon = (type: string) => {
        switch (type) {
            case 'cita': return <Book size={14} className="text-blue-600" />;
            case 'figura': return <Image size={14} className="text-purple-600" />;
            case 'tabla': return <Table size={14} className="text-green-600" />;
            case 'style': return <Type size={14} className="text-orange-600" />;
            case 'math': return <Hash size={14} className="text-indigo-600" />;
            case 'block':
            default: return <Grid size={14} className="text-gray-600" />;
        }
    };

    return (
        <div
            className="fixed z-[70] bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden min-w-[250px] max-w-[350px] flex flex-col animate-in fade-in zoom-in-95 duration-100"
            style={{
                top: position.top,
                left: position.left,
            }}
        >
            <div className="bg-gray-50 px-2 py-1 text-[10px] text-gray-500 font-medium border-b border-gray-100 flex justify-between">
                <span>Sugerencias</span>
                <span>ESC para cerrar</span>
            </div>
            <ul ref={listRef} className="max-h-[200px] overflow-y-auto py-1">
                {items.map((item, index) => (
                    <li
                        key={`${item.type}-${item.id}`}
                        className={clsx(
                            "px-3 py-2 text-sm cursor-pointer flex items-center gap-2 transition-colors",
                            index === selectedIndex ? "bg-[#691C32]/10 text-[#691C32]" : "text-gray-700 hover:bg-gray-50"
                        )}
                        onClick={() => onSelect(item)}
                    >
                        <span className="shrink-0">{getIcon(item.type)}</span>
                        <div className="flex flex-col overflow-hidden">
                            <span className="truncate font-medium">{item.label}</span>
                            {item.desc && <span className="text-[10px] text-gray-400 truncate">{item.desc}</span>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
