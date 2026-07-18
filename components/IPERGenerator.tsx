
import React, { useState, useEffect } from 'react';
import { IPERRow, WorkerData } from '../types';
import { generateIPER, generateIPERDocumentHTML } from '../services/geminiService';
import { syncIPERMatrix, syncDocumentWithGoogle } from '../services/integrationService';
import { AlertTriangle, Loader2, Save, Sparkles, LayoutGrid, CheckCircle2, Edit3, Trash2, Info, Download, FileSpreadsheet, PlusCircle } from 'lucide-react';
import { WorkerSelector } from './WorkerSelector';

interface Props {
  workers: WorkerData[];
  currentWorker: WorkerData | null;
  onWorkerSelect: (worker: WorkerData) => void;
  iperHistory: IPERRow[];
  onSaveSuccess: () => void;
}

export const IPERGenerator: React.FC<Props> = ({ workers, currentWorker, onWorkerSelect, iperHistory, onSaveSuccess }) => {
    const [role, setRole] = useState('');
    const [industry, setIndustry] = useState('');
    const [rows, setRows] = useState<IPERRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const workerHistory = iperHistory.filter(r => 
        currentWorker && r.cargo && r.cargo.toLowerCase().trim() === currentWorker.role.toLowerCase().trim()
    );

    useEffect(() => {
        if (currentWorker) {
            setRole(currentWorker.role);
            setIndustry(currentWorker.industry);
            setRows([]); 
        } else {
            setRole('');
            setIndustry('');
        }
    }, [currentWorker]);

    const handleGenerate = async () => {
        if(!role || !industry) { alert("Por favor ingrese Cargo y Rubro."); return; }
        setLoading(true);
        try {
            // Pass activities for specific process identification
            const activities = currentWorker?.activities || "Labores generales del cargo";
            const data = await generateIPER(industry, role, currentWorker?.workCenter || "General", activities);
            setRows(data);
        } catch(e) {
            alert("Error generando matriz. Intente nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if(rows.length === 0) return;
        setSaving(true);
        try {
            await syncIPERMatrix(rows, role);
            
            const html = generateIPERDocumentHTML(rows, currentWorker || { 
                fullName: 'MATRIZ GENERAL', rut: 'N/A', role: role, industry: industry, workCenter: 'General' 
            } as WorkerData);
            
            await syncDocumentWithGoogle({
                id: Date.now().toString(),
                title: `IPER_${role.replace(/\s+/g,'_')}_${new Date().getFullYear()}`,
                type: 'IPER',
                category: 'Matrices de Riesgo',
                date: new Date().toISOString(),
                workerName: currentWorker ? currentWorker.fullName : 'Matriz General',
                workerId: currentWorker ? currentWorker.id : undefined,
                role: role,
                content: html
            });

            alert("Matriz IPER guardada correctamente.");
            setRows([]);
            onSaveSuccess(); 
        } catch(e) {
            alert("Error al guardar.");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadExcel = (targetRows: IPERRow[], filenameSuffix: string) => {
        // @ts-ignore
        if (!window.XLSX) {
            alert("Librería Excel no cargada. Por favor recargue la página.");
            return;
        }

        const excelData = targetRows.map(r => ({
            "Fecha": r.date,
            "Cargo": r.cargo,
            "Proceso": r.proceso,
            "Tarea": r.tarea,
            "Tipo Tarea": r.tipo,
            "Peligro (Fuente)": r.peligro,
            "Riesgo (Incidente)": r.riesgo,
            "Probabilidad": r.probabilidad,
            "Consecuencia": r.consecuencia,
            "Magnitud Riesgo (MR)": r.magnitud,
            "Nivel Riesgo": r.nivel,
            "Medidas Ingeniería": r.medidasIngenieria,
            "Medidas Administrativas": r.medidasAdministrativas,
            "Medidas EPP": r.medidasEPP,
            "Responsable": r.responsable,
            "Plazo": r.plazo
        }));

        // @ts-ignore
        const ws = window.XLSX.utils.json_to_sheet(excelData);
        // @ts-ignore
        const wb = window.XLSX.utils.book_new();
        // @ts-ignore
        window.XLSX.utils.book_append_sheet(wb, ws, "Matriz IPER");
        
        const fileName = `IPER_${role.replace(/\s+/g, '_')}_${filenameSuffix}.xlsx`;
        // @ts-ignore
        window.XLSX.writeFile(wb, fileName);
    };

    const handleDownloadPDF = (targetRows: IPERRow[], filenameSuffix: string) => {
        if (!currentWorker && !role) return;
        
        const workerContext = currentWorker || {
            fullName: 'BORRADOR',
            rut: 'N/A',
            role: role,
            industry: industry,
            workCenter: 'General'
        } as WorkerData;

        const htmlContent = generateIPERDocumentHTML(targetRows, workerContext);

        const element = document.createElement('div');
        element.innerHTML = htmlContent;
        element.style.width = '100%';
        element.style.background = 'white';
        
        const opt = {
            margin: [5, 5, 5, 5], // Top, Left, Bottom, Right
            filename: `IPER_${workerContext.role.replace(/\s+/g, '_')}_${filenameSuffix}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { 
                scale: 2, 
                useCORS: true,
                logging: false,
                letterRendering: true
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] } // CRITICAL: Prevents cutting rows in half
        };

        // @ts-ignore
        if (window.html2pdf) {
            // @ts-ignore
            window.html2pdf().set(opt).from(element).save();
        } else {
            alert("Librería de PDF no disponible. Recargue la página.");
        }
    };

    // Update row logic with VEP calculation
    const updateRow = (index: number, field: keyof IPERRow, value: any) => {
        const newRows = [...rows];
        const row = { ...newRows[index], [field]: value };
        
        // Auto Recalculate Logic VEP (ISP Guide)
        if (field === 'probabilidad' || field === 'consecuencia') {
            const p = Number(field === 'probabilidad' ? value : row.probabilidad) || 1;
            const c = Number(field === 'consecuencia' ? value : row.consecuencia) || 1;
            const mag = p * c;
            row.magnitud = mag;
            
            // ISP Risk Levels
            if (mag >= 16) row.nivel = 'Intolerable';
            else if (mag >= 8) row.nivel = 'Importante';
            else if (mag >= 4) row.nivel = 'Moderado';
            else row.nivel = 'Tolerable';
        }
        
        newRows[index] = row;
        setRows(newRows);
    };

    const deleteRow = (index: number) => {
        const newRows = rows.filter((_, i) => i !== index);
        setRows(newRows);
    };

    const addRow = () => {
        const newRow: IPERRow = {
            id: Date.now().toString() + Math.random().toString().slice(2,5),
            date: new Date().toLocaleDateString(),
            cargo: role,
            proceso: "Nuevo Proceso",
            tarea: "Nueva Tarea",
            tipo: "Rutinaria",
            peligro: "Peligro...",
            riesgo: "Riesgo...",
            probabilidad: 2,
            consecuencia: 2,
            magnitud: 4,
            nivel: "Moderado",
            medidasIngenieria: "",
            medidasAdministrativas: "",
            medidasEPP: "",
            responsable: "Supervisor",
            plazo: "Inmediato"
        };
        setRows([...rows, newRow]);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <LayoutGrid className="text-orange-500"/> Gestión de Matriz IPER (DS 44)
                </h2>
                
                <WorkerSelector 
                    workers={workers} 
                    currentWorker={currentWorker} 
                    onSelect={onWorkerSelect} 
                />

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-100 mt-6">
                    <h3 className="font-bold text-gray-700 text-sm uppercase mb-4">Generar Nueva Evaluación</h3>
                    
                    <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800 mb-4 flex gap-2">
                        <Info size={16} className="flex-none mt-0.5"/>
                        <div>
                            <p className="font-bold">Nota Técnica (Guía ISP):</p>
                            <p>Esta herramienta utiliza la metodología VEP (Valor Esperado de la Pérdida).</p>
                            <p>Escala Probabilidad/Consecuencia: 1 (Bajo), 2 (Medio), 4 (Alto).</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cargo / Puesto</label>
                            <input type="text" value={role} onChange={e => setRole(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ej: Soldador Calificado"/>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rubro / Área</label>
                            <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} className="w-full p-2 border rounded bg-white text-sm" placeholder="Ej: Metalmecánica"/>
                        </div>
                        <div className="flex items-end">
                            <button onClick={handleGenerate} disabled={loading} className="w-full bg-orange-600 text-white p-2 rounded font-bold flex items-center justify-center gap-2 hover:bg-orange-700 shadow-md transition-all disabled:opacity-50">
                                {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>} Identificar Procesos y Riesgos (IA)
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Generated Rows (Editable) */}
            {rows.length > 0 && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up border-l-4 border-l-orange-500 overflow-hidden">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                             <h3 className="font-bold text-gray-700 flex items-center gap-2"><Edit3 size={18} className="text-orange-500"/> Editor de Matriz IPER</h3>
                             <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">Modo Edición</span>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleDownloadExcel(rows, 'DRAFT')} className="bg-green-600 text-white border border-green-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow-sm text-sm">
                                <FileSpreadsheet size={16}/> Excel
                            </button>
                            <button onClick={() => handleDownloadPDF(rows, 'DRAFT')} className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-gray-50 shadow-sm text-sm">
                                <Download size={16}/> PDF
                            </button>
                            <button onClick={handleSave} disabled={saving} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow-md text-sm">
                                {saving ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
                            </button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto pb-4">
                        <table className="w-full text-xs text-left border-collapse min-w-[1200px]">
                            <thead className="bg-gray-100 uppercase font-bold text-gray-600">
                                <tr>
                                    <th className="p-2 border-b w-32">Proceso/Tarea</th>
                                    <th className="p-2 border-b w-24">Tipo</th>
                                    <th className="p-2 border-b w-32">Peligro/Riesgo</th>
                                    <th className="p-2 border-b w-12 text-center" title="Probabilidad (1, 2, 4)">P</th>
                                    <th className="p-2 border-b w-12 text-center" title="Consecuencia (1, 2, 4)">C</th>
                                    <th className="p-2 border-b w-20 text-center">Nivel</th>
                                    <th className="p-2 border-b w-40">Medidas Ingeniería</th>
                                    <th className="p-2 border-b w-40">Medidas Adm.</th>
                                    <th className="p-2 border-b w-32">EPP</th>
                                    <th className="p-2 border-b w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {rows.map((r, i) => (
                                    <tr key={i} className="hover:bg-gray-50 group">
                                        <td className="p-2 align-top">
                                            <input type="text" value={r.proceso} onChange={(e)=>updateRow(i, 'proceso', e.target.value)} className="w-full text-xs font-bold border-none bg-transparent focus:ring-1 p-0.5 mb-1"/>
                                            <input type="text" value={r.tarea} onChange={(e)=>updateRow(i, 'tarea', e.target.value)} className="w-full text-[10px] italic border-none bg-transparent focus:ring-1 p-0.5"/>
                                        </td>
                                        <td className="p-2 align-top">
                                            <select value={r.tipo} onChange={(e)=>updateRow(i, 'tipo', e.target.value)} className="w-full p-1 border rounded bg-white text-[10px]">
                                                <option value="Rutinaria">Rutinaria</option>
                                                <option value="No Rutinaria">No Rutinaria</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <input type="text" value={r.peligro} onChange={(e)=>updateRow(i, 'peligro', e.target.value)} className="w-full text-xs font-bold border-none bg-transparent focus:ring-1 p-0.5 mb-1"/>
                                            <input type="text" value={r.riesgo} onChange={(e)=>updateRow(i, 'riesgo', e.target.value)} className="w-full text-[10px] text-gray-500 border-none bg-transparent focus:ring-1 p-0.5"/>
                                        </td>
                                        <td className="p-2 align-top">
                                            <select value={r.probabilidad} onChange={(e)=>updateRow(i, 'probabilidad', e.target.value)} className="w-full p-1 border rounded bg-white text-center font-bold">
                                                <option value="1">1 (B)</option>
                                                <option value="2">2 (M)</option>
                                                <option value="4">4 (A)</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top">
                                            <select value={r.consecuencia} onChange={(e)=>updateRow(i, 'consecuencia', e.target.value)} className="w-full p-1 border rounded bg-white text-center font-bold">
                                                <option value="1">1 (L)</option>
                                                <option value="2">2 (D)</option>
                                                <option value="4">4 (E)</option>
                                            </select>
                                        </td>
                                        <td className="p-2 align-top text-center">
                                            <div className={`px-1 py-1 rounded text-[10px] font-bold border flex flex-col items-center justify-center ${
                                                r.nivel === 'Intolerable' ? 'bg-red-50 text-red-700 border-red-200' :
                                                r.nivel === 'Importante' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                r.nivel === 'Moderado' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                'bg-green-50 text-green-700 border-green-200'
                                            }`}>
                                                <span>MR: {r.magnitud}</span>
                                                <span>{r.nivel}</span>
                                            </div>
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea rows={3} value={r.medidasIngenieria} onChange={(e)=>updateRow(i, 'medidasIngenieria', e.target.value)} className="w-full text-[10px] border rounded p-1 resize-y"/>
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea rows={3} value={r.medidasAdministrativas} onChange={(e)=>updateRow(i, 'medidasAdministrativas', e.target.value)} className="w-full text-[10px] border rounded p-1 resize-y"/>
                                        </td>
                                        <td className="p-2 align-top">
                                            <textarea rows={3} value={r.medidasEPP} onChange={(e)=>updateRow(i, 'medidasEPP', e.target.value)} className="w-full text-[10px] border rounded p-1 resize-y text-blue-600"/>
                                        </td>
                                        <td className="p-2 align-middle text-center">
                                            <button onClick={() => deleteRow(i)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                     <div className="mt-2 border-t pt-4">
                        <button onClick={addRow} className="text-xs bg-white border border-dashed border-gray-400 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 font-bold w-full justify-center">
                             <PlusCircle size={16}/> Agregar Fila Manualmente
                        </button>
                    </div>
                </div>
            )}

            {/* Historical Data (Read Only) */}
            {currentWorker && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-600"/> Historial de Riesgos Evaluados: {currentWorker.role}
                        </h3>
                        {workerHistory.length > 0 && (
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDownloadExcel(workerHistory, 'VIGENTE')} 
                                    className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 flex items-center gap-2 transition-colors"
                                >
                                    <FileSpreadsheet size={14}/> Excel
                                </button>
                                <button 
                                    onClick={() => handleDownloadPDF(workerHistory, 'VIGENTE')} 
                                    className="bg-white text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-50 flex items-center gap-2 transition-colors"
                                >
                                    <Download size={14}/> PDF
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {workerHistory.length === 0 ? (
                        <p className="text-gray-400 text-sm text-center py-8">No hay evaluaciones vigentes registradas para este cargo.</p>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-gray-100 uppercase font-bold text-gray-600">
                                    <tr>
                                        <th className="p-3 border-b">Proceso / Tarea</th>
                                        <th className="p-3 border-b">Peligro / Riesgo</th>
                                        <th className="p-3 border-b text-center" title="Probabilidad">P</th>
                                        <th className="p-3 border-b text-center" title="Consecuencia">C</th>
                                        <th className="p-3 border-b text-center">Nivel (MR)</th>
                                        <th className="p-3 border-b">Medidas de Control (Jerarquía)</th>
                                        <th className="p-3 border-b">EPP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {workerHistory.map((r, i) => (
                                        <tr key={i} className="hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-800 align-top">
                                                {r.proceso}
                                                <div className="text-gray-500 text-[10px] italic mt-1">{r.tarea}</div>
                                                <span className="text-[9px] bg-gray-100 px-1 rounded text-gray-500">{r.tipo}</span>
                                            </td>
                                            <td className="p-3 text-gray-700 align-top">
                                                <div className="font-bold">{r.peligro}</div>
                                                <div className="text-gray-500 text-[10px]">{r.riesgo}</div>
                                            </td>
                                            <td className="p-3 text-center align-top font-bold">{r.probabilidad}</td>
                                            <td className="p-3 text-center align-top font-bold">{r.consecuencia}</td>
                                            <td className="p-3 text-center align-top">
                                                <span className={`px-2 py-1 rounded font-bold text-[10px] border block ${
                                                    r.nivel === 'Intolerable' || r.magnitud >= 16 ? 'bg-red-50 text-red-700 border-red-200' :
                                                    r.nivel === 'Importante' || r.magnitud >= 8 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    r.nivel === 'Moderado' || r.magnitud >= 4 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                    'bg-green-50 text-green-700 border-green-200'
                                                }`}>
                                                    {r.nivel} ({r.magnitud})
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-600 align-top">
                                                <div className="mb-1"><span className="font-bold text-[10px]">ING:</span> {r.medidasIngenieria || 'N/A'}</div>
                                                <div className="mb-1"><span className="font-bold text-[10px]">ADM:</span> {r.medidasAdministrativas}</div>
                                                <div className="text-[10px] text-gray-400">Resp: {r.responsable} | Plazo: {r.plazo}</div>
                                            </td>
                                            <td className="p-3 text-blue-600 font-medium align-top">{r.medidasEPP}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
