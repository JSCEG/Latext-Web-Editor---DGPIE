import React, { useState, useEffect, useMemo } from 'react';
import { Plus, FileText, User, Calendar, Building, X, Search, LayoutGrid, List } from 'lucide-react';
import { Button } from './Button';

export type DocumentCard = {
    id: string;
    sheetId?: string;
    title?: string;
    subtitle?: string;
    author?: string;
    date?: string;
    institution?: string;
    unit?: string;
};

export interface NewDocumentData {
    id: string;
    title: string;
    subtitle: string;
    author: string;
    date: string;
    institution: string;
    unit: string;
    shortName: string;
    keywords: string;
    version: string;
    acknowledgments: string;
    presentation: string;
    executiveSummary: string;
    keyData: string;
    coverPath: string;
    backCoverPath: string;
}

interface DashboardProps {
    onCreate: (data: NewDocumentData) => void;
    onOpen: (spreadsheetId: string, docId?: string) => void;
    onLogout: () => void;
    documents: DocumentCard[];
}

// Hardcoded ID provided by user
const DEFAULT_SHEET_ID = '1HpvaN82xj75IhTg0ZyeGOBWluivCQdQh9OuDL-nnGgI';

export const Dashboard: React.FC<DashboardProps> = ({ onCreate, onOpen, onLogout, documents }) => {
    const [inputSheetId, setInputSheetId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState<NewDocumentData>({
        id: '',
        title: '',
        subtitle: '',
        author: '',
        date: new Date().toLocaleDateString('es-MX'),
        institution: 'Secretaría de Energía (SENER)',
        unit: 'Unidad de Planeación y Transición Energética',
        shortName: '',
        keywords: '',
        version: '1',
        acknowledgments: '',
        presentation: '',
        executiveSummary: '',
        keyData: '',
        coverPath: 'img/portada.png',
        backCoverPath: 'img/contraportada.png'
    });

    useEffect(() => {
        if (isModalOpen) {
            // Calculate next ID
            const ids = documents.map(d => parseInt(d.id.replace(/\D/g, '')) || 0);
            const maxId = Math.max(0, ...ids);
            const nextId = `D${(maxId + 1).toString().padStart(2, '0')}`;
            setFormData(prev => ({ ...prev, id: nextId }));
        }
    }, [isModalOpen, documents]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(formData);
        setIsModalOpen(false);
    };

    const filteredDocuments = useMemo(() => {
        if (!searchQuery) return documents;
        const lowerQuery = searchQuery.toLowerCase();
        return documents.filter(doc =>
            doc.title?.toLowerCase().includes(lowerQuery) ||
            doc.id.toLowerCase().includes(lowerQuery) ||
            doc.author?.toLowerCase().includes(lowerQuery) ||
            doc.institution?.toLowerCase().includes(lowerQuery)
        );
    }, [documents, searchQuery]);

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">

            {/* Title Section & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-4 border-gob-guinda pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-gob-guinda">Documentos Disponibles</h1>
                    <p className="text-gray-500 mt-1">Gestiona y edita tus documentos oficiales</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gob-guinda/20 focus:border-gob-guinda outline-none transition-all"
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} className="flex-shrink-0">
                        <Plus size={16} className="mr-2" /> Nuevo
                    </Button>
                </div>
            </div>

            {/* Document Card List */}
            <div className="space-y-4">
                {filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc) => (
                        <div
                            key={`${doc.sheetId || 'master'}-${doc.id}`}
                            className="group bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-all duration-200 hover:border-gob-guinda/30"
                        >
                            {/* Icon / ID */}
                            <div className="flex-shrink-0 flex flex-col items-center">
                                <div className="w-16 h-20 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center justify-center text-gob-guinda group-hover:bg-gob-guinda/5 transition-colors relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-4 h-4 bg-gray-200 rounded-bl-lg" />
                                    <FileText size={32} strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-bold mt-2 text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{doc.id}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="mb-3">
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-gob-guinda transition-colors">
                                        {doc.title || `Documento ${doc.id}`}
                                    </h2>
                                    {doc.subtitle && (
                                        <p className="text-gray-500 text-sm mt-1">{doc.subtitle}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-gray-600">
                                    {doc.author && (
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-gob-gold" />
                                            <span className="truncate">{doc.author}</span>
                                        </div>
                                    )}
                                    {doc.date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-gob-gold" />
                                            <span>{doc.date}</span>
                                        </div>
                                    )}
                                    {(doc.institution || doc.unit) && (
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <Building size={14} className="text-gob-gold" />
                                            <span className="truncate">{[doc.institution, doc.unit].filter(Boolean).join(' · ')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col justify-center items-end gap-2 border-l border-gray-100 pl-6 ml-2">
                                <Button variant="burgundy" onClick={() => onOpen(doc.sheetId || DEFAULT_SHEET_ID, doc.id)} className="w-full md:w-auto">
                                    <FileText size={16} className="mr-2" /> Abrir
                                </Button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-12 text-center">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                            <Search size={48} strokeWidth={1} />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No se encontraron documentos</h3>
                        <p className="text-gray-500 mt-1">Intenta con otros términos de búsqueda.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <p className="text-gray-500 text-sm">¿Tienes otro ID de hoja de cálculo?</p>
                <div className="max-w-md mx-auto mt-4 flex gap-2">
                    <input
                        type="text"
                        placeholder="Pegar ID de Google Sheets aquí"
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-gob-guinda"
                        value={inputSheetId}
                        onChange={(e) => setInputSheetId(e.target.value)}
                    />
                    <Button variant="secondary" onClick={() => onOpen(inputSheetId)} disabled={!inputSheetId}>
                        Abrir Externo
                    </Button>
                </div>
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gob-guinda">Nuevo Documento</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID (Automático)</label>
                                    <input
                                        type="text"
                                        name="id"
                                        value={formData.id}
                                        readOnly
                                        className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500 cursor-not-allowed"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
                                    <input
                                        type="text"
                                        name="version"
                                        value={formData.version}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                    <input
                                        type="text"
                                        name="title"
                                        required
                                        value={formData.title}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                                    <input
                                        type="text"
                                        name="subtitle"
                                        value={formData.subtitle}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Autor</label>
                                    <input
                                        type="text"
                                        name="author"
                                        value={formData.author}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                                    <input
                                        type="text"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Institución</label>
                                    <input
                                        type="text"
                                        name="institution"
                                        value={formData.institution}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                                    <input
                                        type="text"
                                        name="unit"
                                        value={formData.unit}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Corto</label>
                                    <input
                                        type="text"
                                        name="shortName"
                                        value={formData.shortName}
                                        onChange={handleChange}
                                        placeholder="Ej: Informe2025"
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Palabras Clave</label>
                                    <input
                                        type="text"
                                        name="keywords"
                                        value={formData.keywords}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-gob-guinda focus:border-gob-guinda"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="burgundy">
                                    Crear Documento
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
