import React from 'react';
import { Button } from './Button';
import { Info, Image, Book, Type, FileText, Plus, AlertTriangle, Lightbulb, Grid, X, Table } from 'lucide-react';
import { clsx } from 'clsx';

export interface RichEditorToolbarProps {
    availableFigureItems: { id: string; title: string; section: string; route?: string }[];
    availableTableItems: { id: string; title: string; section: string; range?: string }[];
    availableBibliographyKeys: string[];
    onInsertSnippet: (text: string) => void;
    onWrapInline: (type: string, opts?: { value?: string; placeholder?: string }) => void;
    onInsertBlock: (type: string, title?: string) => void;
    onOpenNote: () => void;
    onOpenEquation: (mode: 'math' | 'ecuacion') => void;
    onOpenNewItem?: (type: 'figura' | 'tabla' | 'bibliografia') => void;
    selectorPreview?: { type: 'figura' | 'tabla'; id: string; title: string; image?: string; data?: string[][] } | null;
    setSelectorPreview?: (preview: any) => void;
    currentSectionOrder?: string;
    dataTimestamp?: number;
}

export const RichEditorToolbar: React.FC<RichEditorToolbarProps> = ({
    availableFigureItems,
    availableTableItems,
    availableBibliographyKeys,
    onInsertSnippet,
    onWrapInline,
    onInsertBlock,
    onOpenNote,
    onOpenEquation,
    onOpenNewItem,
    selectorPreview,
    setSelectorPreview,
    currentSectionOrder,
    dataTimestamp
}) => {
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-3 shadow-sm">
             <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-gray-700">Herramientas de Edición</span>
                <span className="text-[11px] text-gray-500">(formato, etiquetas, plantillas)</span>
            </div>
            <div className="p-3 flex flex-col gap-3">
                {/* Styles Row */}
                <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => onWrapInline('nota', { placeholder: 'Nota...' })}>
                        <FileText size={14} className="mr-2" /> Nota
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onWrapInline('dorado', { placeholder: 'Texto...' })}>
                        <Type size={14} className="mr-2" /> Dorado
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onWrapInline('guinda', { placeholder: 'Texto...' })}>
                        <Type size={14} className="mr-2" /> Guinda
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpenEquation('math')}>
                        <Grid size={14} className="mr-2" /> Math
                    </Button>
                </div>

                <div className="w-full h-px bg-gray-100" />

                {/* Inserts Row */}
                <div className="flex flex-wrap items-center gap-4">
                    {/* Cita */}
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                            <Book size={12} /> Cita
                        </div>
                        <select
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 w-32 focus:ring-1 focus:ring-gob-guinda outline-none"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                onWrapInline('cita', { value: v });
                                e.currentTarget.value = '';
                            }}
                        >
                            <option value="">Selecciona...</option>
                            {availableBibliographyKeys.map(k => (
                                <option key={k} value={k}>{k}</option>
                            ))}
                        </select>
                        {onOpenNewItem && <Button type="button" variant="ghost" size="sm" onClick={() => onOpenNewItem('bibliografia')} title="Nueva Cita"><Plus size={14}/></Button>}
                    </div>

                    {/* Figura */}
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                            <Image size={12} /> Figura
                        </div>
                        <select
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 w-32 focus:ring-1 focus:ring-gob-guinda outline-none"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                if (v === '__CREATE_FIG__' && onOpenNewItem) {
                                    onOpenNewItem('figura');
                                } else {
                                    const item = availableFigureItems.find(x => x.id === v);
                                    if (item && setSelectorPreview) setSelectorPreview({ type: 'figura', id: item.id, title: item.title, image: item.route });
                                    onWrapInline('figura', { value: v });
                                }
                                e.currentTarget.value = '';
                            }}
                        >
                            <option value="">Selecciona...</option>
                             {(() => {
                                const list = currentSectionOrder ? availableFigureItems.filter(i => (i.section || '') === currentSectionOrder) : availableFigureItems;
                                return list.map(i => (
                                    <option key={i.id} value={i.id}>{i.title || i.id}</option>
                                ));
                            })()}
                        </select>
                         {onOpenNewItem && <Button type="button" variant="ghost" size="sm" onClick={() => onOpenNewItem('figura')} title="Nueva Figura"><Plus size={14}/></Button>}
                         {selectorPreview?.type === 'figura' && setSelectorPreview && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectorPreview(selectorPreview)} title="Ver Previsualización">Ver</Button>
                        )}
                    </div>

                    {/* Tabla */}
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                            <Table size={12} /> Tabla
                        </div>
                         <select
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 w-32 focus:ring-1 focus:ring-gob-guinda outline-none"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                if (v === '__CREATE_TBL__' && onOpenNewItem) {
                                    onOpenNewItem('tabla');
                                } else {
                                    const item = availableTableItems.find(x => x.id === v);
                                    if (item && setSelectorPreview) setSelectorPreview({ type: 'tabla', id: item.id, title: item.title });
                                    onWrapInline('tabla', { value: v });
                                }
                                e.currentTarget.value = '';
                            }}
                        >
                            <option value="">Selecciona...</option>
                             {(() => {
                                const list = currentSectionOrder ? availableTableItems.filter(i => (i.section || '') === currentSectionOrder) : availableTableItems;
                                return list.map(i => (
                                    <option key={i.id} value={i.id}>{i.title || i.id}</option>
                                ));
                            })()}
                        </select>
                         {onOpenNewItem && <Button type="button" variant="ghost" size="sm" onClick={() => onOpenNewItem('tabla')} title="Nueva Tabla"><Plus size={14}/></Button>}
                         {selectorPreview?.type === 'tabla' && setSelectorPreview && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectorPreview(selectorPreview)} title="Ver Previsualización">Ver</Button>
                        )}
                    </div>

                    {/* Ejemplos */}
                    <div className="flex items-center gap-2">
                        <div className="text-[11px] text-gray-600 inline-flex items-center gap-1">
                            <Lightbulb size={12} /> Ejemplos
                        </div>
                        <select
                            className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-900 w-32 focus:ring-1 focus:ring-gob-guinda outline-none"
                            value=""
                            onChange={(e) => {
                                const v = e.target.value;
                                if (!v) return;
                                
                                const citeKey = availableBibliographyKeys[0] || 'clave_biblio';
                                const figId = availableFigureItems[0]?.id || '2.1';
                                const tableId = availableTableItems[0]?.id || '3.2';

                                if (v === 'cita-nota') {
                                    onInsertSnippet(
                                        `Texto con [[cita:${citeKey}]] y una nota [[nota:Nota al pie o comentario...]].\n\n` +
                                        `Ver [[figura:${figId}]] y [[tabla:${tableId}]].\n`
                                    );
                                } else if (v === 'guinda-dorado') {
                                    onInsertSnippet(`Texto con énfasis: [[guinda:Guinda]] y [[dorado:Dorado]].\n\n`);
                                } else if (v === 'caja-nota') {
                                    onInsertSnippet(
                                        `\n\n[[caja:Título opcional]]\n` +
                                        `Contenido dentro de recuadro. Puedes agregar una [[nota:Nota al pie / comentario...]].\n` +
                                        `[[/caja]]\n\n`
                                    );
                                } else if (v === 'bloque-alerta') {
                                    onInsertSnippet(
                                        `\n\n[[alerta:Título]]\n` +
                                        `Escribe aquí el mensaje de alerta...\n` +
                                        `[[/alerta]]\n\n`
                                    );
                                } else if (v === 'math-basico') {
                                    onInsertSnippet(`\n\n[[math:\\frac{a}{b} + \\Delta x]]\n\n`);
                                } else if (v === 'ecuacion') {
                                    onInsertSnippet(`\n\n[[ecuacion:E = mc^2]]\n\n`);
                                }
                                e.currentTarget.value = '';
                            }}
                        >
                            <option value="">Selecciona...</option>
                            <option value="cita-nota">Cita + Nota + Fig/Tab</option>
                            <option value="guinda-dorado">Guinda + Dorado</option>
                            <option value="caja-nota">Recuadro + Nota</option>
                            <option value="bloque-alerta">Bloque Alerta</option>
                            <option value="math-basico">Math inline</option>
                            <option value="ecuacion">Ecuación Display</option>
                        </select>
                    </div>
                </div>

                <div className="w-full h-px bg-gray-100" />

                 {/* Blocks Row */}
                 <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-gray-600 mr-2">Bloques:</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onInsertBlock('caja', 'Título opcional')}>
                        <Grid size={14} className="mr-2" /> Caja
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onInsertBlock('alerta', 'Título')}>
                        <AlertTriangle size={14} className="mr-2" /> Alerta
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onInsertBlock('info', 'Título')}>
                        <Info size={14} className="mr-2" /> Info
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onInsertBlock('destacado')}>
                        <Lightbulb size={14} className="mr-2" /> Destacado
                    </Button>
                     <Button type="button" variant="ghost" size="sm" onClick={onOpenNote}>
                        <FileText size={14} className="mr-2" /> Nota Pie
                    </Button>
                     <Button type="button" variant="ghost" size="sm" onClick={() => onOpenEquation('ecuacion')}>
                        <Grid size={14} className="mr-2" /> Ecuación Display
                    </Button>
                 </div>

                 {/* Preview Area */}
                 {selectorPreview && (
                    <div className="mt-2 border border-gray-200 rounded p-3 bg-gray-50 relative animate-in fade-in slide-in-from-top-2">
                        <button onClick={() => setSelectorPreview && setSelectorPreview(null)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"><X size={14}/></button>
                        <div className="text-xs text-gray-600 mb-2">Previsualización: {selectorPreview.type === 'figura' ? 'Figura' : 'Tabla'} — {selectorPreview.title}</div>
                        {selectorPreview.type === 'figura' ? (
                            <div className="flex items-center justify-start">
                                {selectorPreview.image ? (
                                    <img src={`${selectorPreview.image}?t=${dataTimestamp}`} alt={selectorPreview.title} className="max-h-40 object-contain border rounded bg-white" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <div className="text-xs text-gray-500">Sin ruta de imagen</div>
                                )}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {selectorPreview.data && selectorPreview.data.length ? (
                                    <table className="text-xs border-collapse border border-gray-300 bg-white">
                                        <tbody>
                                            {selectorPreview.data.slice(0, 6).map((row, r) => (
                                                <tr key={r}>
                                                    {row.slice(0, 6).map((cell, c) => (
                                                        <td key={c} className={clsx("px-2 py-1 border border-gray-300", r === 0 ? "font-semibold bg-gray-100" : "")}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="text-xs text-gray-500">Cargando rango...</div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
