
import React, { useMemo } from 'react';
import { FileText, Image, Table, AlertTriangle, CheckCircle, AlertCircle, Edit } from 'lucide-react';
import { validateStructure, ValidationResult } from '../services/validationService';
import { computeFigureId, computeTableId } from '../utils/idUtils';

interface StructurePreviewProps {
    docId: string;
    secciones: { headers: string[], data: string[][] };
    figuras: { headers: string[], data: string[][] };
    tablas: { headers: string[], data: string[][] };
    graficos?: { headers: string[], data: string[][] };
    onEditSection?: (sectionId: string) => void;
}

const NORMALIZE = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/_/g, '');
const FIND_COL = (headers: string[], candidates: string[]) => {
    return headers.findIndex(h => {
        const normHeader = NORMALIZE(h);
        return candidates.some(c => NORMALIZE(c) === normHeader);
    });
};

const SECCION_ID_VARIANTS = ['ID_Seccion', 'Seccion', 'SeccionOrden', 'ID Seccion', 'Sección', 'Seccion Orden', 'IDSeccion', 'Section', 'SectionID'];
const ORDEN_VARIANTS = ['Orden', 'OrdenTabla', 'Numero', 'Fig.', 'Figura', 'Fig', 'Número', 'OrdenFigura', 'Orden Figura', 'Orden_Figura', 'Order'];
const TITLE_VARIANTS = ['Titulo', 'Título', 'Nombre', 'Caption', 'Descripcion', 'Title'];
const DOC_ID_VARIANTS = ['DocumentoID', 'ID Documento', 'ID', 'DocID', 'DocumentID'];
const NIVEL_VARIANTS = ['Nivel', 'Level'];
const CONTENIDO_VARIANTS = ['Contenido', 'content', 'texto', 'cuerpo', 'Text'];

const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const StructurePreview: React.FC<StructurePreviewProps> = ({ docId, secciones, figuras, tablas, graficos, onEditSection }) => {

    const validation = useMemo<ValidationResult>(() => {
        return validateStructure(docId, secciones, figuras, tablas, graficos || { headers: [], data: [] });
    }, [docId, secciones, figuras, tablas, graficos]);

    const tree = useMemo(() => {
        // Parse Sections
        const secOrdenIdx = FIND_COL(secciones.headers, ['Orden']);
        const secTitleIdx = FIND_COL(secciones.headers, TITLE_VARIANTS);
        const secNivelIdx = FIND_COL(secciones.headers, NIVEL_VARIANTS);
        const secDocIdx = FIND_COL(secciones.headers, DOC_ID_VARIANTS);
        const secContenidoIdx = FIND_COL(secciones.headers, CONTENIDO_VARIANTS);

        const sectionNodes = secciones.data
            .slice(1) // skip header
            .filter(r => secDocIdx === -1 || r[secDocIdx] === docId)
            .map(r => {
                const id = secOrdenIdx !== -1 ? r[secOrdenIdx] : '';
                const content = secContenidoIdx !== -1 ? (r[secContenidoIdx] || '') : '';

                return {
                    id,
                    title: secTitleIdx !== -1 ? r[secTitleIdx] : 'Sin título',
                    level: secNivelIdx !== -1 ? r[secNivelIdx] : 'seccion',
                    content, // Store content to check usage
                    children: [] as any[]
                };
            })
            .sort((a, b) => parseFloat(a.id || '0') - parseFloat(b.id || '0'));

        // Parse Figures
        const figSecIdx = FIND_COL(figuras.headers, SECCION_ID_VARIANTS);
        const figTitleIdx = FIND_COL(figuras.headers, TITLE_VARIANTS);
        const figDocIdx = FIND_COL(figuras.headers, DOC_ID_VARIANTS);
        const figOrdenIdx = FIND_COL(figuras.headers, ORDEN_VARIANTS);

        figuras.data.slice(1).forEach(r => {
            if (figDocIdx !== -1 && r[figDocIdx] !== docId) return;
            const secId = figSecIdx !== -1 ? (r[figSecIdx] || '').toString().trim() : '';
            const title = figTitleIdx !== -1 ? (r[figTitleIdx] || '').toString().trim() : 'Figura sin título';
            const ord = figOrdenIdx !== -1 ? (r[figOrdenIdx] || '').toString().trim() : '';

            // Compute full ID using the same util as Editor
            const id = computeFigureId(secId, ord);

            // Fallback: If ID is empty (maybe missing columns), use a generic placeholder to show something exists
            const displayId = id || `(Fila sin ID)`;

            const parent = sectionNodes.find(s => s.id === secId);
            if (parent) {
                // Check if referenced in content with flexible regex
                // Allow spaces around [[, after figura:, and around ID
                const safeId = id.trim();
                let isReferenced = false;

                if (safeId) {
                    const regex = new RegExp(`\\[\\[\\s*figura:\\s*${escapeRegExp(safeId)}\\s*\\]\\]`, 'i');
                    isReferenced = regex.test(parent.content);
                }

                parent.children.push({ type: 'figure', title, id: displayId, isReferenced });
            }
        });

        // Parse Tables
        const tabSecIdx = FIND_COL(tablas.headers, SECCION_ID_VARIANTS);
        const tabTitleIdx = FIND_COL(tablas.headers, TITLE_VARIANTS);
        const tabDocIdx = FIND_COL(tablas.headers, DOC_ID_VARIANTS);
        const tabOrdenIdx = FIND_COL(tablas.headers, ORDEN_VARIANTS);

        tablas.data.slice(1).forEach(r => {
            if (tabDocIdx !== -1 && r[tabDocIdx] !== docId) return;
            const secId = tabSecIdx !== -1 ? (r[tabSecIdx] || '').toString().trim() : '';
            const title = tabTitleIdx !== -1 ? (r[tabTitleIdx] || '').toString().trim() : 'Tabla sin título';
            const ord = tabOrdenIdx !== -1 ? (r[tabOrdenIdx] || '').toString().trim() : '';

            // Compute full ID using the same util as Editor
            const id = computeTableId(secId, ord);

            const parent = sectionNodes.find(s => s.id === secId);
            if (parent) {
                const safeId = id.trim();
                const regex = new RegExp(`\\[\\[\\s*tabla:\\s*${escapeRegExp(safeId)}\\s*\\]\\]`, 'i');
                const isReferenced = regex.test(parent.content);
                parent.children.push({ type: 'table', title, id, isReferenced });
            }
        });

        return sectionNodes;
    }, [secciones, figuras, tablas, docId]);

    return (
        <div className="flex flex-col h-full bg-gray-50 p-6 overflow-hidden">
            <div className="mb-6 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gob-guinda">Vista Previa Estructural</h2>
                    <p className="text-sm text-gray-500">Representación jerárquica del documento final</p>
                </div>
                <div className="flex gap-4">
                    <div className="bg-white px-4 py-2 rounded shadow-sm border border-gray-200 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${validation.isValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span className="font-bold text-sm">{validation.isValid ? 'Estructura Válida' : 'Errores Detectados'}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full overflow-hidden">
                {/* Tree View */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 overflow-y-auto p-6">
                    {tree.length === 0 ? (
                        <div className="text-center text-gray-400 py-10">No hay secciones definidas</div>
                    ) : (
                        <div className="space-y-4">
                            {tree.map((node, i) => (
                                <div key={i} className="border-l-2 border-gob-gold pl-4 pb-4">
                                    <div className="flex items-center gap-2 mb-2 justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono bg-gray-100 px-1 rounded text-gray-500">{node.id}</span>
                                            <h3 className={`font-bold text-gray-800 ${node.level === 'seccion' ? 'text-lg' : 'text-md ml-4'}`}>
                                                {node.title}
                                            </h3>
                                            <span className="text-xs text-gray-400 uppercase border border-gray-200 px-1 rounded">{node.level}</span>
                                        </div>
                                        {onEditSection && (
                                            <button
                                                onClick={() => onEditSection(node.id)}
                                                className="text-gray-400 hover:text-gob-guinda p-1 rounded hover:bg-red-50 transition-colors"
                                                title="Editar esta sección"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Content Flow */}
                                    <div className="ml-8 space-y-2">
                                        {/* Render interleaved content and referenced items */}
                                        {(() => {
                                            // Split content by figure/table tags
                                            // Regex captures the tag so it's included in the array
                                            const parts = node.content.split(/(\[\[\s*(?:figura|tabla):\s*[^\]]+?\s*\]\])/gi);

                                            return parts.map((part, pIdx) => {
                                                const tagMatch = part.match(/^\[\[\s*(figura|tabla):\s*(.+?)\s*\]\]$/i);

                                                if (tagMatch) {
                                                    const type = tagMatch[1].toLowerCase();
                                                    const refId = tagMatch[2].trim();

                                                    // Find the corresponding child item
                                                    const item = node.children.find(c =>
                                                        c.id === refId &&
                                                        ((type === 'figura' && c.type === 'figure') || (type === 'tabla' && c.type === 'table'))
                                                    );

                                                    if (item) {
                                                        // Render referenced item card
                                                        return (
                                                            <div key={pIdx} className="flex items-center gap-2 text-sm p-2 rounded border bg-gray-50 border-gray-200 text-gray-700 shadow-sm my-2">
                                                                {item.type === 'figure' ? <Image size={14} className="text-blue-500" /> : <Table size={14} className="text-green-500" />}
                                                                <span className="font-medium uppercase text-xs">{item.type === 'figure' ? 'FIG' : 'TAB'}</span>
                                                                <span className="text-[10px] font-mono bg-gray-100 text-gray-500 px-1 rounded">{item.id}</span>
                                                                <span className="truncate flex-1 font-semibold">{item.title}</span>
                                                                <CheckCircle size={12} className="text-green-500" />
                                                            </div>
                                                        );
                                                    } else {
                                                        // Reference points to something not assigned to this section (or typo)
                                                        return (
                                                            <div key={pIdx} className="flex items-center gap-2 text-sm p-2 rounded border border-dashed border-gray-300 bg-gray-50 text-gray-400 my-2">
                                                                <AlertCircle size={14} />
                                                                <span className="italic">Referencia externa o no encontrada: {refId}</span>
                                                            </div>
                                                        );
                                                    }
                                                } else {
                                                    // Render Text Snippet
                                                    const text = part.trim();
                                                    if (!text) return null;
                                                    return (
                                                        <div key={pIdx} className="text-sm text-gray-600 font-serif border-l-2 border-gray-100 pl-2 my-1">
                                                            {text.length > 150 ? text.substring(0, 150) + '...' : text}
                                                        </div>
                                                    );
                                                }
                                            });
                                        })()}

                                        {/* Unreferenced Items (Warnings) */}
                                        {node.children.filter(c => !c.isReferenced).length > 0 && (
                                            <div className="mt-4 pt-2 border-t border-amber-100">
                                                <p className="text-[10px] font-bold text-amber-600 uppercase mb-2 flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Asignados pero no incluidos (No saldrán en PDF):
                                                </p>
                                                {node.children.filter(c => !c.isReferenced).map((child, ci) => (
                                                    <div key={ci} className="flex items-center gap-2 text-sm p-2 rounded border bg-amber-50 border-amber-200 text-amber-800 mb-2">
                                                        {child.type === 'figure' ? <Image size={14} className="text-amber-500" /> : <Table size={14} className="text-amber-500" />}
                                                        <span className="font-medium uppercase text-xs">{child.type === 'figure' ? 'FIG' : 'TAB'}</span>
                                                        <span className="text-[10px] font-mono bg-white text-amber-900 px-1 rounded border border-amber-100">{child.id}</span>
                                                        <span className="truncate flex-1">{child.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {node.children.length === 0 && !node.content.trim() && (
                                            <div className="text-xs text-gray-300 italic">Sin contenido ni elementos adjuntos</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Validation Panel */}
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-y-auto p-6">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} /> Reporte de Validación
                    </h3>

                    {!validation.isValid ? (
                        <div className="space-y-3">
                            {validation.errors.map((err, i) => (
                                <div key={i} className="bg-red-50 border-l-4 border-red-500 p-3 text-sm">
                                    <p className="font-bold text-red-800">{err.message}</p>
                                    <p className="text-red-600 text-xs mt-1">
                                        {err.sheet} - ID: {err.itemId}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-green-50 border-l-4 border-green-500 p-4 text-center">
                            <CheckCircle className="mx-auto text-green-600 mb-2" size={32} />
                            <p className="font-bold text-green-800">Todo correcto</p>
                            <p className="text-green-700 text-sm">No se encontraron errores estructurales.</p>
                        </div>
                    )}

                    <div className="mt-8">
                        <h4 className="font-bold text-gray-700 text-sm uppercase tracking-wider mb-3">Estadísticas</h4>
                        <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="bg-gray-50 p-3 rounded">
                                <div className="text-2xl font-bold text-gob-guinda">{validation.stats.sectionsCount}</div>
                                <div className="text-xs text-gray-500">Secciones</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <div className="text-2xl font-bold text-blue-600">{validation.stats.figuresCount}</div>
                                <div className="text-xs text-gray-500">Figuras</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <div className="text-2xl font-bold text-green-600">{validation.stats.tablesCount}</div>
                                <div className="text-xs text-gray-500">Tablas</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <div className="text-2xl font-bold text-purple-600">{validation.stats.graphicsCount}</div>
                                <div className="text-xs text-gray-500">Gráficos</div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded">
                                <div className={`text-2xl font-bold ${validation.stats.orphanedFigures + validation.stats.orphanedTables + validation.stats.orphanedGraphics > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {validation.stats.orphanedFigures + validation.stats.orphanedTables + validation.stats.orphanedGraphics}
                                </div>
                                <div className="text-xs text-gray-500">Huérfanos</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
