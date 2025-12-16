import React from 'react';
import { AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react';
import { clsx } from 'clsx';
import type { TagIssue } from '../tagEngine';

type Props = {
    issues: TagIssue[];
    onSelectRange: (from: number, to: number) => void;
};

const iconFor = (type: TagIssue['type']) => {
    if (type === 'error') return <AlertCircle size={16} className="text-red-600" />;
    if (type === 'warning') return <AlertTriangle size={16} className="text-amber-600" />;
    return <Lightbulb size={16} className="text-blue-600" />;
};

export const LintPanel: React.FC<Props> = ({ issues, onSelectRange }) => {
    if (!issues.length) {
        return (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                Sin issues. Todo listo para guardar.
            </div>
        );
    }

    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;
    const hintCount = issues.filter(i => i.type === 'hint').length;

    return (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-gray-700">
                        Validación en vivo ({issues.length})
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                        <span
                            className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 border',
                                errorCount ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}
                        >
                            <AlertCircle size={12} /> {errorCount}
                        </span>
                        <span
                            className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 border',
                                warningCount ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}
                        >
                            <AlertTriangle size={12} /> {warningCount}
                        </span>
                        <span
                            className={clsx(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 border',
                                hintCount ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                            )}
                        >
                            <Lightbulb size={12} /> {hintCount}
                        </span>
                    </div>
                </div>
            </div>

            <ul className="divide-y divide-gray-100 max-h-44 overflow-auto">
                {issues.map((issue, idx) => (
                    <li key={idx}>
                        <button
                            type="button"
                            className={clsx(
                                'w-full text-left px-3 py-2 text-xs flex items-start gap-2 hover:bg-gray-50',
                                issue.type === 'error' && 'bg-red-50/40 border-l-4 border-l-red-400',
                                issue.type === 'warning' && 'bg-amber-50/30 border-l-4 border-l-amber-400',
                                issue.type === 'hint' && 'bg-blue-50/25 border-l-4 border-l-blue-300'
                            )}
                            onClick={() => onSelectRange(issue.from, issue.to)}
                            title="Ir al problema"
                        >
                            <span className="mt-[1px]">{iconFor(issue.type)}</span>
                            <span className="text-gray-700">{issue.message}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};
