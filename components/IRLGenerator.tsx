
import React, { useState } from 'react';
import { WorkerData, CompanyProfile, DocumentSST } from '../types';
import { WorkerSelector } from './WorkerSelector';
import { generateIRL } from '../services/geminiService';
import { syncDocumentWithGoogle } from '../services/integrationService';
import { FileText, Save, Loader2, Sparkles, Eye, Lock } from 'lucide-react';

interface Props {
  workers: WorkerData[];
  companyProfile: CompanyProfile;
  onSuccess: () => void;
}

export const IRLGenerator: React.FC<Props> = ({ workers, companyProfile, onSuccess }) => {
  const [currentWorker, setCurrentWorker] = useState<WorkerData | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState(''); // New: Password

  const handleGenerate = async () => {
    if (!currentWorker) return;
    setLoading(true);
    try {
      const html = await generateIRL(currentWorker, companyProfile);
      setGeneratedHtml(html);
    } catch (e) {
      alert("Error generando documento. Intente nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentWorker || !generatedHtml) return;
    
    // Password Validation
    const cleanRut = (currentWorker.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
    const storedPass = currentWorker.password ? String(currentWorker.password).trim() : "";
    const inputPass = password.trim();
    let isValid = false;
    
    if (storedPass) isValid = inputPass === storedPass;
    else isValid = inputPass === cleanRut || inputPass === currentWorker.rut.trim();

    if (!isValid) {
        alert("Contraseña o PIN incorrecto. No se puede validar la firma.");
        return;
    }

    setSaving(true);
    try {
        const legalFooter = "<p style='font-size: 8px; color: #666; margin-top: 5px; text-align: center;'>Documento suscrito mediante Firma Electrónica Simple (FES) conforme a la Ley N° 19.799. La identidad del firmante ha sido verificada mediante clave personal intransferible, declarando haber leído, comprendido y aceptado el contenido íntegro del presente instrumento.</p>";
        
        const finalContent = generatedHtml + legalFooter;

        const doc: DocumentSST = {
            id: Date.now().toString(),
            title: `ODI_${currentWorker.rut}_${new Date().toISOString().split('T')[0]}`,
            type: 'IRL',
            category: 'Obligación de Informar',
            date: new Date().toISOString(),
            workerName: currentWorker.fullName,
            workerId: currentWorker.id,
            workCenter: currentWorker.workCenter,
            content: finalContent
        };
        await syncDocumentWithGoogle(doc);
        alert("Documento guardado exitosamente en la nube.");
        setGeneratedHtml('');
        setPassword('');
        onSuccess();
    } catch (e) {
        alert("Error al guardar en Google Drive.");
    } finally {
        setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="text-blue-600"/> Generador de Documentación (ODI / IRL)
            </h2>
            <p className="text-sm text-gray-500 mb-6">Genera automáticamente la Obligación de Informar (Decreto 44) específica para cada trabajador basada en su cargo y riesgos asociados.</p>
            
            <WorkerSelector workers={workers} currentWorker={currentWorker} onSelect={setCurrentWorker} />

            <div className="flex justify-end mt-4">
                <button 
                    onClick={handleGenerate} 
                    disabled={!currentWorker || loading}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 disabled:bg-gray-400 shadow-lg transition-all"
                >
                    {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={18}/>} 
                    {loading ? 'Generando con IA...' : 'Generar Documento Legal'}
                </button>
            </div>
        </div>

        {generatedHtml && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4 border-b pb-4 bg-gray-50 -mx-6 -mt-6 p-6 rounded-t-xl">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><Eye size={18}/> Vista Previa del Documento</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setGeneratedHtml('')}
                            className="text-gray-500 px-4 py-2 rounded font-bold hover:bg-gray-200"
                        >
                            Descartar
                        </button>
                    </div>
                </div>
                
                <div className="border p-8 bg-white shadow-inner min-h-[500px] text-sm overflow-x-auto">
                    <div className="max-w-[210mm] mx-auto bg-white" dangerouslySetInnerHTML={{__html: generatedHtml}} />
                </div>
                
                <div className="mt-6 border-t pt-6 bg-gray-50 p-4 rounded-xl flex items-center justify-between">
                    <div className="w-1/2">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Lock size={12}/> Contraseña / PIN (Confirmar Identidad)
                        </label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-center font-bold tracking-widest bg-white focus:ring-2 focus:ring-blue-500"
                            placeholder="****"
                        />
                    </div>
                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-green-700 shadow ml-4 h-fit"
                    >
                        {saving ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Guardar y Firmar
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
