import React, { useEffect, useState } from 'react';
import { Users, Circle, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { socketService, ConnectedUser } from '../services/socketService';

export const UserActivityTracker: React.FC = () => {
    const [users, setUsers] = useState<ConnectedUser[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const unsubscribe = socketService.subscribe((updatedUsers) => {
            setUsers(updatedUsers);
        });
        return unsubscribe;
    }, []);

    const onlineCount = users.length;

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans">
            {/* Header */}
            <div 
                className="bg-[#691C32] text-white px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-[#541628] transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Users size={16} />
                    <span className="font-semibold text-sm">Colaboradores</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-medium">
                        {onlineCount}
                    </span>
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>

            {/* Content */}
            {isExpanded && (
                <div className="max-h-96 overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                            No hay otros usuarios conectados.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {users.map((user) => (
                                <div key={user.socketId} className="p-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[#691C32] font-bold text-xs border border-gray-300">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user.status === 'editing' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">{user.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.email}</p>
                                            </div>
                                        </div>
                                        
                                        {user.currentDoc && (
                                            <div className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-medium border border-blue-100">
                                                <FileText size={10} />
                                                {user.currentDoc}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recent Activity */}
                                    {user.recentChanges.length > 0 && (
                                        <div className="mt-2 pl-10">
                                            <p className="text-[10px] text-gray-400 font-medium mb-1 flex items-center gap-1">
                                                <Clock size={10} /> Actividad reciente:
                                            </p>
                                            <ul className="space-y-1">
                                                {user.recentChanges.map((change, idx) => (
                                                    <li key={idx} className="text-[10px] text-gray-600 flex justify-between">
                                                        <span className="truncate max-w-[140px]">• {change.desc}</span>
                                                        <span className="text-gray-400 ml-2">
                                                            {new Date(change.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};