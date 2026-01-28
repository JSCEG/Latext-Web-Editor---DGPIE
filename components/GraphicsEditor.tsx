
import React, { useState, useEffect, useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar, Bubble, PolarArea } from 'react-chartjs-2';
import { Save, Plus, Trash2, X, RefreshCw, BarChart2, PieChart, Activity, Grip, Layout } from 'lucide-react';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    RadialLinearScale,
    Filler
);

interface GraphicsEditorProps {
    headers: string[];
    data: string[][];
    onSaveRow: (rowIndex: number, newRow: string[]) => void;
    onAddRow: (newRow: string[]) => void;
    onDeleteRow: (rowIndex: number) => void;
    availableSections: { value: string; label: string }[];
}

// Helper to find column index
const getColIndex = (headers: string[], variants: string[]) => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/_/g, '');
    return headers.findIndex(h => {
        const normHeader = norm(h);
        return variants.some(v => norm(v) === normHeader);
    });
};

const CHART_TYPES = [
    { value: 'bar', label: 'Barras', icon: BarChart2 },
    { value: 'line', label: 'Líneas', icon: Activity },
    { value: 'pie', label: 'Pastel', icon: PieChart },
    { value: 'doughnut', label: 'Dona', icon: PieChart },
    { value: 'radar', label: 'Radar', icon: Activity },
    { value: 'polarArea', label: 'Área Polar', icon: PieChart },
    // { value: 'bubble', label: 'Burbujas', icon: Circle } // Requires specialized data structure
];

export const GraphicsEditor: React.FC<GraphicsEditorProps> = ({
    headers,
    data,
    onSaveRow,
    onAddRow,
    onDeleteRow,
    availableSections
}) => {
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Record<string, any>>({});
    const [chartData, setChartData] = useState<{ labels: string[], datasets: { label: string, data: number[] }[] }>({ labels: [], datasets: [] });

    // Identify columns
    const idIdx = getColIndex(headers, ['ID', 'Identificador']);
    const titleIdx = getColIndex(headers, ['Titulo', 'Título', 'Nombre']);
    const typeIdx = getColIndex(headers, ['Tipo', 'Type', 'Estilo']);
    const sectionIdx = getColIndex(headers, ['Seccion', 'ID_Seccion', 'Sección']);
    const dataIdx = getColIndex(headers, ['Datos', 'Data', 'JSON']);
    const optionsIdx = getColIndex(headers, ['Opciones', 'Config', 'Options']);
    const sourceIdx = getColIndex(headers, ['Fuente', 'Source']);

    // --- Data Parsing/Stringifying ---

    // Parse JSON data from the cell
    const parseChartData = (jsonString: string) => {
        try {
            if (!jsonString || !jsonString.trim()) return { labels: ['A', 'B', 'C'], datasets: [{ label: 'Serie 1', data: [10, 20, 30] }] };
            const parsed = JSON.parse(jsonString);
            // Basic validation
            if (!parsed.labels || !parsed.datasets) return { labels: [], datasets: [] };
            return parsed;
        } catch (e) {
            console.error("Error parsing chart data JSON", e);
            return { labels: ['Error'], datasets: [{ label: 'Invalid Data', data: [0] }] };
        }
    };

    // Load row into form
    useEffect(() => {
        if (selectedRowIndex !== null && data[selectedRowIndex]) {
            const row = data[selectedRowIndex];
            let opts: any = {};
            try { opts = JSON.parse(optionsIdx !== -1 ? row[optionsIdx] : '{}'); } catch { }

            setEditForm({
                id: idIdx !== -1 ? row[idIdx] : '',
                title: titleIdx !== -1 ? row[titleIdx] : '',
                type: typeIdx !== -1 ? row[typeIdx] : 'bar',
                section: sectionIdx !== -1 ? row[sectionIdx] : '',
                data: dataIdx !== -1 ? row[dataIdx] : '',
                options: optionsIdx !== -1 ? row[optionsIdx] : '',
                source: sourceIdx !== -1 ? row[sourceIdx] : '',
                stacked: opts.stacked || false
            });
            setChartData(parseChartData(dataIdx !== -1 ? row[dataIdx] : ''));
        } else {
            // New Item Defaults
            setEditForm({
                id: `GRAF-${Date.now()}`,
                title: 'Nuevo Gráfico',
                type: 'bar',
                section: '',
                data: JSON.stringify({ labels: ['Ene', 'Feb', 'Mar'], datasets: [{ label: 'Ventas', data: [10, 15, 8], backgroundColor: 'rgba(54, 162, 235, 0.5)' }] }, null, 2),
                options: '{}',
                source: '',
                stacked: false
            });
            setChartData({ labels: ['Ene', 'Feb', 'Mar'], datasets: [{ label: 'Ventas', data: [10, 15, 8] }] });
        }
    }, [selectedRowIndex, data, idIdx, titleIdx, typeIdx, sectionIdx, dataIdx, optionsIdx, sourceIdx]);

    const handleSave = () => {
        const sourceRow = (selectedRowIndex !== null && data[selectedRowIndex]) ? data[selectedRowIndex] : null;
        const newRow = [...(sourceRow || new Array(headers.length).fill(''))];

        // Prepare options
        const opts = { stacked: editForm.stacked };
        const optionsStr = JSON.stringify(opts);

        // Fill mapped columns
        if (idIdx !== -1) newRow[idIdx] = editForm.id;
        if (titleIdx !== -1) newRow[titleIdx] = editForm.title;
        if (typeIdx !== -1) newRow[typeIdx] = editForm.type;
        if (sectionIdx !== -1) newRow[sectionIdx] = editForm.section;
        if (dataIdx !== -1) newRow[dataIdx] = editForm.data; // JSON string
        if (optionsIdx !== -1) newRow[optionsIdx] = optionsStr;
        if (sourceIdx !== -1) newRow[sourceIdx] = editForm.source;

        if (selectedRowIndex !== null) {
            onSaveRow(selectedRowIndex, newRow);
        } else {
            onAddRow(newRow);
        }
        setSelectedRowIndex(null);
    };

    // --- Chart Renderer ---
    const renderChart = () => {
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' as const },
                title: { display: true, text: editForm.title },
            },
            scales: (editForm.type === 'bar' && editForm.stacked) ? {
                x: { stacked: true },
                y: { stacked: true }
            } : undefined
        };

        const type = editForm.type?.toLowerCase() || 'bar';

        // Prepare data with some default colors if missing
        const finalData = {
            ...chartData,
            datasets: chartData.datasets.map((ds, i) => ({
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                    'rgba(255, 159, 64, 0.5)',
                ][i % 6],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                ][i % 6],
                borderWidth: 1,
                ...ds
            }))
        };

        switch (type) {
            case 'line': return <Line options={options} data={finalData as any} />;
            case 'pie': return <Pie options={options} data={finalData as any} />;
            case 'doughnut': return <Doughnut options={options} data={finalData as any} />;
            case 'radar': return <Radar options={options} data={finalData as any} />;
            case 'polararea': return <PolarArea options={options} data={finalData as any} />;
            default: return <Bar options={options} data={finalData as any} />;
        }
    };

    // --- Mini Data Editor (Tabular) ---
    // Converts JSON chartData to a grid for editing
    const renderDataEditor = () => {
        // Assume Labels are Row 0 (after col 0)
        // Series names are Col 0 (after row 0)
        // This is a simplification. Usually ChartJS data is: Labels array, then Datasets array.

        // View:
        //       | Label 1 | Label 2 | ...
        // Series1| Val 1   | Val 2   | ...

        const labels = chartData.labels || [];
        const datasets = chartData.datasets || [];

        const updateLabel = (idx: number, val: string) => {
            const newLabels = [...labels];
            newLabels[idx] = val;
            const newData = { ...chartData, labels: newLabels };
            setChartData(newData);
            setEditForm(prev => ({ ...prev, data: JSON.stringify(newData, null, 2) }));
        };

        const updateValue = (datasetIdx: number, dataIdx: number, val: string) => {
            const newDatasets = [...datasets];
            const numVal = parseFloat(val);
            if (!isNaN(numVal)) {
                newDatasets[datasetIdx].data[dataIdx] = numVal;
                const newData = { ...chartData, datasets: newDatasets };
                setChartData(newData);
                setEditForm(prev => ({ ...prev, data: JSON.stringify(newData, null, 2) }));
            }
        };

        const updateSeriesLabel = (datasetIdx: number, val: string) => {
            const newDatasets = [...datasets];
            newDatasets[datasetIdx].label = val;
            const newData = { ...chartData, datasets: newDatasets };
            setChartData(newData);
            setEditForm(prev => ({ ...prev, data: JSON.stringify(newData, null, 2) }));
        };

        const addColumn = () => {
            const newLabels = [...labels, `New Label ${labels.length + 1}`];
            const newDatasets = datasets.map(ds => ({ ...ds, data: [...ds.data, 0] }));
            const newData = { ...chartData, labels: newLabels, datasets: newDatasets };
            setChartData(newData);
            setEditForm(prev => ({ ...prev, data: JSON.stringify(newData, null, 2) }));
        };

        const addRow = () => {
            const newDataset = {
                label: `Serie ${datasets.length + 1}`,
                data: new Array(labels.length).fill(0)
            };
            const newDatasets = [...datasets, newDataset];
            const newData = { ...chartData, datasets: newDatasets };
            setChartData(newData);
            setEditForm(prev => ({ ...prev, data: JSON.stringify(newData, null, 2) }));
        };

        return (
            <div className="overflow-x-auto border rounded bg-white p-2">
                <div className="flex gap-2 mb-2">
                    <button onClick={addColumn} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">+ Columna</button>
                    <button onClick={addRow} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded">+ Serie</button>
                </div>
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead>
                        <tr>
                            <th className="px-2 py-1 bg-gray-50">Series \ Etiquetas</th>
                            {labels.map((lbl, i) => (
                                <th key={i} className="px-2 py-1 bg-gray-50">
                                    <input
                                        value={lbl}
                                        onChange={e => updateLabel(i, e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0 text-center font-bold"
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {datasets.map((ds, dsIdx) => (
                            <tr key={dsIdx}>
                                <td className="px-2 py-1 font-medium bg-gray-50">
                                    <input
                                        value={ds.label}
                                        onChange={e => updateSeriesLabel(dsIdx, e.target.value)}
                                        className="w-full bg-transparent border-none focus:ring-0"
                                    />
                                </td>
                                {ds.data.map((val, valIdx) => (
                                    <td key={valIdx} className="px-2 py-1">
                                        <input
                                            type="number"
                                            value={val}
                                            onChange={e => updateValue(dsIdx, valIdx, e.target.value)}
                                            className="w-full text-center border-gray-200 rounded p-1"
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Mini Chart Component ---
    const MiniChart = ({ type, dataStr }: { type: string, dataStr: string }) => {
        const data = useMemo(() => {
            try { return JSON.parse(dataStr); } catch { return null; }
        }, [dataStr]);

        if (!data) return <div className="text-xs text-gray-400 flex items-center justify-center h-full">Sin datos</div>;

        const options = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, title: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } },
            animation: false as const
        };

        const chartType = type?.toLowerCase() || 'bar';

        switch (chartType) {
            case 'line': return <Line options={options} data={data} />;
            case 'pie': return <Pie options={options} data={data} />;
            case 'doughnut': return <Doughnut options={options} data={data} />;
            case 'radar': return <Radar options={options} data={data} />;
            case 'polararea': return <PolarArea options={options} data={data} />;
            default: return <Bar options={options} data={data} />;
        }
    };

    // --- Main Render ---

    if (selectedRowIndex === null) {
        // LIST MODE
        return (
            <div className="h-full flex flex-col p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5 text-gob-guinda" />
                        Gestión de Gráficos
                    </h2>
                    <button
                        onClick={() => setSelectedRowIndex(-1)} // -1 indicates New
                        className="flex items-center gap-2 px-4 py-2 bg-gob-guinda text-white rounded hover:bg-gob-guinda-dark transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Nuevo Gráfico
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-white rounded shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                {['ID', 'Vista Previa', 'Título', 'Tipo', 'Sección', 'Fuente', 'Acciones'].map(h => (
                                    <th key={h} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{idIdx !== -1 ? row[idIdx] : ''}</td>
                                    <td className="px-6 py-4 w-32 h-24">
                                        <div className="w-24 h-16">
                                            <MiniChart type={typeIdx !== -1 ? row[typeIdx] : 'bar'} dataStr={dataIdx !== -1 ? row[dataIdx] : ''} />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{titleIdx !== -1 ? row[titleIdx] : ''}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{typeIdx !== -1 ? row[typeIdx] : ''}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sectionIdx !== -1 ? row[sectionIdx] : ''}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{sourceIdx !== -1 ? row[sourceIdx] : ''}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium flex gap-2">
                                        <button onClick={() => setSelectedRowIndex(idx)} className="text-indigo-600 hover:text-indigo-900"><Layout className="w-4 h-4" /></button>
                                        <button onClick={() => onDeleteRow(idx)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                    </td>
                                </tr>
                            ))}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No hay gráficos creados. Comienza añadiendo uno nuevo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // EDITOR MODE
    return (
        <div className="h-full flex flex-col bg-gray-100">
            {/* Toolbar */}
            <div className="bg-white border-b px-4 py-3 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedRowIndex(null)} className="p-1 hover:bg-gray-100 rounded">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800">
                        {selectedRowIndex === -1 ? 'Crear Gráfico' : 'Editar Gráfico'}
                    </h2>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gob-guinda text-white rounded hover:bg-gob-guinda-dark">
                        <Save className="w-4 h-4" /> Guardar
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Configuration */}
                <div className="w-1/3 bg-white border-r overflow-y-auto p-4 space-y-4">
                    <h3 className="font-semibold text-gray-700 mb-2">Configuración General</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">ID Único</label>
                        <input
                            type="text"
                            value={editForm.id}
                            onChange={e => setEditForm({ ...editForm, id: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2 text-sm bg-gray-50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Título</label>
                        <input
                            type="text"
                            value={editForm.title}
                            onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Tipo de Gráfico</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {CHART_TYPES.map(t => (
                                <button
                                    key={t.value}
                                    onClick={() => setEditForm({ ...editForm, type: t.value })}
                                    className={`flex items-center gap-2 px-3 py-2 text-sm border rounded ${editForm.type === t.value ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'hover:bg-gray-50'}`}
                                >
                                    <t.icon className="w-4 h-4" />
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sección de Anclaje</label>
                        <select
                            value={editForm.section}
                            onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2 text-sm"
                        >
                            <option value="">Selecciona una sección...</option>
                            {availableSections.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    {editForm.type === 'bar' && (
                        <div className="flex items-center gap-2 mt-2">
                            <input
                                type="checkbox"
                                id="stacked"
                                checked={editForm.stacked || false}
                                onChange={e => setEditForm({ ...editForm, stacked: e.target.checked })}
                                className="h-4 w-4 text-gob-guinda border-gray-300 rounded focus:ring-gob-guinda"
                            />
                            <label htmlFor="stacked" className="text-sm text-gray-700">Gráfico Apilado</label>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fuente de Datos (Texto)</label>
                        <input
                            type="text"
                            value={editForm.source}
                            onChange={e => setEditForm({ ...editForm, source: e.target.value })}
                            className="mt-1 w-full border rounded px-3 py-2 text-sm"
                            placeholder="Ej. Elaboración propia con datos de..."
                        />
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-700 mb-2">Editor de Datos</h3>
                        <p className="text-xs text-gray-500 mb-2">Edita los valores directamente en la tabla inferior.</p>
                        {renderDataEditor()}

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-gray-500">JSON Crudo (Avanzado)</label>
                            <textarea
                                value={editForm.data}
                                onChange={e => {
                                    setEditForm({ ...editForm, data: e.target.value });
                                    setChartData(parseChartData(e.target.value));
                                }}
                                className="mt-1 w-full border rounded px-3 py-2 text-xs font-mono h-24"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Preview */}
                <div className="flex-1 bg-gray-50 p-8 flex flex-col">
                    <div className="bg-white rounded-lg shadow-lg p-6 flex-1 flex flex-col items-center justify-center">
                        <div className="w-full h-full max-h-[600px] relative">
                            {renderChart()}
                        </div>
                    </div>
                    <div className="mt-4 text-center text-gray-500 text-sm">
                        Vista previa del gráfico generado
                    </div>
                </div>
            </div>
        </div>
    );
};
