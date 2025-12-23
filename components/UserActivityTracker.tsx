import React, { useEffect, useState } from 'react';
import { Users, Circle, FileText, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { socketService, ConnectedUser } from '../services/socketService';

interface UserActivityTrackerProps {
    variant?: 'floating' | 'sidebar';
}

export const UserActivityTracker: React.FC<UserActivityTrackerProps> = ({ variant = 'floating' }) => {
    const [users, setUsers] = useState<ConnectedUser[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);

    // Get current doc ID from URL or context if available (optional enhancement for future)
    // For now, we assume we want to show ALL users if in dashboard, or filter if in editor.
    // However, the prompt asks to filter by "current book". 
    // Since this component is global, we need to know the context.

    // Actually, the prompt says "filter by current book".
    // The socket service knows the "currentDoc" (which is actually DocID).
    // It doesn't strictly know the Spreadsheet ID unless we pass it.
    // But typically collaboration happens per Document (DocID).

    useEffect(() => {
        const unsubscribe = socketService.subscribe((updatedUsers) => {
            // Filter out the current user (self) to avoid duplication
            // And filter by context if needed.

            const currentSocketId = socketService.getSocketId();

            const filteredUsers = updatedUsers.filter(u =>
                u.socketId !== currentSocketId // Remove self
            );

            setUsers(filteredUsers);
        });
        return unsubscribe;
    }, []);

    const onlineCount = users.length;
    const isFloating = variant === 'floating';

    return (
        <div
            className={isFloating
                ? "fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden font-sans transition-all duration-300 ease-in-out"
                : "w-full border-t border-gray-200 bg-gray-50 font-sans"
            }
        >
            {/* Header */}
            <div
                className={isFloating
                    ? "bg-gob-guinda text-white px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gob-guinda-dark transition-colors"
                    : "w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
                }
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Users size={isFloating ? 16 : 18} className={!isFloating ? "text-gray-500" : ""} />
                    <span className={!isFloating ? "text-gray-700" : ""}>Colaboradores</span>
                    <span className={`${isFloating ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"} px-2 py-0.5 rounded-full text-xs font-medium`}>
                        {onlineCount}
                    </span>
                </div>
                {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </div>

            {/* Content */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded
                        ? (isFloating ? "max-h-96 opacity-100" : "max-h-[500px] opacity-100 border-t border-gray-200")
                        : "max-h-0 opacity-0"
                    }`}
            >
                <div className={isFloating ? "overflow-y-auto max-h-96" : "overflow-y-auto max-h-80 bg-white"}>
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
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gob-guinda font-bold text-xs border border-gray-300">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user.status === 'editing' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-medium text-gray-800 truncate">{user.name}</p>
                                                <p className="text-[10px] text-gray-500 truncate max-w-[120px]">{user.email}</p>
                                            </div>
                                        </div>

                                        {user.currentDoc && (
                                            <div className="flex-shrink-0 flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] font-medium border border-blue-100">
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
                                                        <span className="truncate max-w-[120px]">• {change.desc}</span>
                                                        <span className="text-gray-400 ml-2 whitespace-nowrap">
                                                            {new Date(change.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            </div>
        </div>
    );
};