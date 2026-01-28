import React, { useState } from 'react';
import type { Collaborator } from '../services/sheetsService';
import { API_URL } from '../config';

interface WorkbookDashboardProps {
    user: {
        name: string;
        email: string;
        photo?: string;
    } | null;
    documents: {
        id: string;
        name: string;
        description: string;
        updatedAt: string;
        collaborators: Collaborator[];
        isCustom: boolean;
        status: 'Activo' | 'Revisión' | 'Archivado' | 'Pendiente'; // Derived or passed
    }[];
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onOpen: (id: string) => void;
    onCreate: () => void;
    onDelete: (id: string, name: string) => void;
    onLogout: () => void;
}

export const WorkbookDashboard: React.FC<WorkbookDashboardProps> = ({
    user,
    documents,
    searchQuery,
    onSearchChange,
    onOpen,
    onCreate,
    onDelete,
    onLogout
}) => {

    const [imgError, setImgError] = useState(false);

    // Reset error when user photo changes
    React.useEffect(() => {
        setImgError(false);
    }, [user?.photo]);

    // Helper to determine status color/text based on description or random for demo
    const getStatus = (doc: any) => {
        // Simple logic to map status for visual fidelity to design
        if (doc.description.includes('Balance')) return { label: 'Activo', color: 'bg-green-100 text-green-600' };
        if (doc.description.includes('Demo')) return { label: 'Revisión', color: 'bg-blue-100 text-blue-600' };
        if (doc.description.includes('PLADESHI Web')) return { label: 'Archivado', color: 'bg-slate-100 text-slate-500' };

        return { label: 'Pendiente', color: 'bg-amber-100 text-amber-600' };
    };

    const getIcon = (doc: any) => {
        if (doc.name.includes('Balance')) return 'menu_book';
        if (doc.name.includes('Demo')) return 'description';
        if (doc.name.includes('PLADESHI')) return 'folder';
        return 'article';
    };

    return (
        <div className="bg-background-light font-display text-slate-900 min-h-screen pb-24 font-sans">

            {/* HEADER */}
            <header className="sticky top-0 z-30 bg-background-light/80 backdrop-blur-md px-6 pt-12 pb-4">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-sm font-medium text-slate-500">Buenos días,</h2>
                        <h1 className="text-2xl font-bold tracking-tight">Mis Documentos</h1>
                    </div>
                    <div className="relative group cursor-pointer" onClick={onLogout} title="Cerrar Sesión">
                        <button className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border-2 border-white">
                            {user?.photo && !imgError ? (
                                <img
                                    alt="Avatar del usuario"
                                    className="w-full h-full object-cover"
                                    src={user.photo?.includes('googleusercontent.com') ? `${API_URL}/proxy-image?url=${encodeURIComponent(user.photo)}` : user.photo}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <span className="material-symbols-rounded text-slate-400 text-2xl">person</span>
                            )}
                        </button>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                </div>

                <div className="relative">
                    <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                    <input
                        className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-primary transition-all"
                        placeholder="Buscar repositorio..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </header>

            <main className="px-6 space-y-8">

                {/* QUICK ACCESS (Hardcoded for now based on design, or could be recent) */}
                {/* For this implementation, we will hide it if no documents, or just show top 3 recent */}
                {documents.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Acceso rápido</h3>
                            <button className="text-sm font-medium text-primary">Ver todos</button>
                        </div>
                        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                            {documents.slice(0, 3).map(doc => (
                                <div key={doc.id} onClick={() => onOpen(doc.id)} className="flex-none w-48 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center mb-3">
                                        <span className="material-symbols-rounded text-red-600 text-xl">{getIcon(doc)}</span>
                                    </div>
                                    <p className="font-semibold text-sm line-clamp-1">{doc.name}</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{doc.updatedAt}</p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}


                {/* WORKBOOKS GRID */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Libros de Trabajo</h3>
                        <button className="material-symbols-rounded text-slate-400">filter_list</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {documents.map((doc) => {
                            const status = getStatus(doc);
                            return (
                                <div key={doc.id} onClick={() => onOpen(doc.id)} className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center cursor-pointer hover:border-primary/30 transition-colors relative group">

                                    {/* Delete Button (Only for custom docs) */}
                                    {doc.isCustom && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDelete(doc.id, doc.name); }}
                                            className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <span className="material-symbols-rounded text-sm">delete</span>
                                        </button>
                                    )}

                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                                        <span className="material-symbols-rounded text-primary text-3xl">{getIcon(doc)}</span>
                                    </div>
                                    <span className={`px-2 py-0.5 ${status.color} text-[10px] font-bold rounded-full mb-2 uppercase`}>
                                        {status.label}
                                    </span>
                                    <h4 className="font-bold text-sm line-clamp-2 leading-snug">{doc.name}</h4>

                                    <div className="mt-4 flex -space-x-2">
                                        {doc.collaborators.slice(0, 3).map((collab, i) => (
                                            <img
                                                key={i}
                                                alt={collab.displayName}
                                                className="w-7 h-7 rounded-full border-2 border-white object-cover"
                                                src={collab.photoLink || `https://ui-avatars.com/api/?name=${collab.displayName}&background=random`}
                                            />
                                        ))}
                                        {doc.collaborators.length > 3 && (
                                            <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                                                +{doc.collaborators.length - 3}
                                            </div>
                                        )}
                                        {doc.collaborators.length === 0 && (
                                            <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400">?</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

            </main>

            {/* FLOATING ACTION BUTTON */}
            <button onClick={onCreate} className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-2xl shadow-lg shadow-primary/40 flex items-center justify-center transform active:scale-95 transition-transform z-40 hover:bg-[#691C32]">
                <span className="material-symbols-rounded text-3xl">add</span>
            </button>

            {/* BOTTOM NAV */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 px-8 py-3 pb-8 flex justify-between items-center z-50">
                <button className="flex flex-col items-center gap-1 text-primary">
                    <span className="material-symbols-rounded">grid_view</span>
                    <span className="text-[10px] font-medium">Dashboard</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">folder_open</span>
                    <span className="text-[10px] font-medium">Archivos</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">group</span>
                    <span className="text-[10px] font-medium">Equipo</span>
                </button>
                <button className="flex flex-col items-center gap-1 text-slate-400 hover:text-primary transition-colors">
                    <span className="material-symbols-rounded">settings</span>
                    <span className="text-[10px] font-medium">Ajustes</span>
                </button>
            </nav>

            <style>{`
        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}</style>
        </div>
    );
};
