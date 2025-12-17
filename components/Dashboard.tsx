import React, { useState } from 'react';
import { Plus, FileText, User, Calendar, Building } from 'lucide-react';
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

interface DashboardProps {
    onCreate: (title: string) => void;
    onOpen: (spreadsheetId: string, docId?: string) => void;
    onLogout: () => void;
    documents: DocumentCard[];
}

// Hardcoded ID provided by user
const DEFAULT_SHEET_ID = '1HpvaN82xj75IhTg0ZyeGOBWluivCQdQh9OuDL-nnGgI';

export const Dashboard: React.FC<DashboardProps> = ({ onCreate, onOpen, onLogout, documents }) => {
    const [inputSheetId, setInputSheetId] = useState('');

    return (
        <div className="max-w-7xl mx-auto p-8 space-y-8 animate-in fade-in duration-500">

            {/* Title Section */}
            <div className="flex justify-between items-end border-b-4 border-[#691C32] pb-2">
                <div>
                    <h1 className="text-3xl font-bold text-[#691C32]">Documentos Disponibles</h1>
                </div>
                <div>
                    <Button onClick={() => onCreate("Nuevo Documento")}>
                        <Plus size={16} className="mr-2" /> Nuevo Documento
                    </Button>
                </div>
            </div>

            {/* Document Card List */}
            <div className="space-y-4">

                {documents.length > 0 ? (
                    documents.map((doc) => (
                        <div
                            key={`${doc.sheetId || 'master'}-${doc.id}`}
                            aria-label={`Documento ${doc.id}`}
                            className="group bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 flex flex-col md:flex-row gap-6 hover:shadow-lg transition-all duration-200 focus-within:ring-2 focus-within:ring-[#691C32]/30"
                        >
                            {/* Icon / ID */}
                            <div className="flex-shrink-0">
                                <div className="w-12 h-16 bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center text-[#691C32]">
                                    <FileText size={24} />
                                    <span className="text-[10px] font-bold mt-1">{doc.id}</span>
                                </div>
                                <div className="text-center mt-2 text-xs font-bold text-gray-500">DOCUMENTO</div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-3">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 leading-tight">
                                        {doc.title || `Documento ${doc.id}`}
                                    </h2>
                                    {doc.subtitle && (
                                        <p className="text-gray-600 italic text-sm mt-1 line-clamp-2">{doc.subtitle}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-700">
                                    {doc.author && (
                                        <div className="flex items-center gap-2">
                                            <User size={14} className="text-[#13322B]" />
                                            <span className="truncate">{doc.author}</span>
                                        </div>
                                    )}
                                    {doc.date && (
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-[#13322B]" />
                                            <span>{doc.date}</span>
                                        </div>
                                    )}
                                    {(doc.institution || doc.unit) && (
                                        <div className="flex items-center gap-2 md:col-span-2">
                                            <Building size={14} className="text-[#13322B]" />
                                            <span className="truncate">{[doc.institution, doc.unit].filter(Boolean).join(' · ')}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <Button variant="burgundy" size="sm" onClick={() => onOpen(doc.sheetId || DEFAULT_SHEET_ID, doc.id)}>
                                        <FileText size={14} className="mr-2" /> Abrir
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
                        No se encontraron documentos en la hoja "Documentos".
                    </div>
                )}

            </div>

            <div className="mt-8 pt-8 border-t border-gray-200 text-center">
                <p className="text-gray-500 text-sm">¿Tienes otro ID de hoja de cálculo?</p>
                <div className="max-w-md mx-auto mt-4 flex gap-2">
                    <input
                        type="text"
                        placeholder="Pegar ID de Google Sheets aquí"
                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#691C32]"
                        value={inputSheetId}
                        onChange={(e) => setInputSheetId(e.target.value)}
                    />
                    <Button variant="secondary" onClick={() => onOpen(inputSheetId)} disabled={!inputSheetId}>
                        Abrir Externo
                    </Button>
                </div>
            </div>
        </div>
    );
};
