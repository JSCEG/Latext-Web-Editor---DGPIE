import React, { useState } from 'react';
import { Plus, Eye, FileText, User, Calendar, Building, FileJson } from 'lucide-react';
import { Button } from './Button';

interface DashboardProps {
  onCreate: (title: string) => void;
  onOpen: (id: string) => void;
  onLogout: () => void;
}

// Hardcoded ID provided by user
const DEFAULT_SHEET_ID = '1zKKvxR_56Gk5ku4ZZ682hSpOgQQo3gC0xXOB_nta3Zg';

export const Dashboard: React.FC<DashboardProps> = ({ onCreate, onOpen, onLogout }) => {
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
                <Plus size={16} className="mr-2"/> Nuevo Documento
            </Button>
        </div>
      </div>

      {/* Document Card List */}
      <div className="space-y-4">
        
        {/* Card 1 (Default Sheet) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
            {/* Icon / ID */}
            <div className="flex-shrink-0">
                <div className="w-12 h-16 bg-red-50 border border-red-100 rounded flex flex-col items-center justify-center text-[#691C32]">
                    <FileText size={24} />
                    <span className="text-[10px] font-bold mt-1">DOC</span>
                </div>
                <div className="text-center mt-2 text-xs font-bold text-gray-500">MASTER</div>
            </div>

            {/* Content */}
            <div className="flex-1 space-y-3">
                <div>
                    <h2 className="text-xl font-bold text-gray-900 leading-tight">Template Maestro LaTeX (Dumentos LaTeX)</h2>
                    <p className="text-gray-500 italic text-sm mt-1">Hoja de cálculo principal para la generación de documentos oficiales.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <User size={14} className="text-[#13322B]" />
                        <span>Administrador del Sistema</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-[#13322B]" />
                        <span>Actualizado Recientemente</span>
                    </div>
                    <div className="flex items-center gap-2 md:col-span-2">
                        <Building size={14} className="text-[#13322B]" />
                        <span>Unidad de Planeación y Transición Energética</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-2">
                    <Button variant="burgundy" size="sm" onClick={() => onOpen(DEFAULT_SHEET_ID)}>
                        <FileText size={14} className="mr-2"/> Editar Datos
                    </Button>
                    <Button variant="green" size="sm" onClick={() => onOpen('demo-latex-gov')}>
                        <Eye size={14} className="mr-2"/> Ver Demo
                    </Button>
                </div>
            </div>
        </div>

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