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
            <div className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                Sin issues. Todo listo.
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
            <div className="px-3 py-2 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                Validación en vivo ({issues.length})
            </div>
            <ul className="divide-y divide-gray-100 max-h-44 overflow-auto">
                {issues.map((issue, idx) => (
                    <li key={idx}>
                        <button
                            type="button"
                            className={clsx(
                                'w-full text-left px-3 py-2 text-xs flex items-start gap-2 hover:bg-gray-50',
                                issue.type === 'error' && 'bg-red-50/30'
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
