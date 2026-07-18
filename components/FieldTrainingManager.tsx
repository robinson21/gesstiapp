
import React, { useState } from 'react';
import { WorkerData, CompanyProfile, DocumentSST } from '../types';
import { SignaturePad } from './SignaturePad';
import { Users, Calendar, Clock, MapPin, FileText, CheckCircle2, ChevronRight, Save, Loader2, UserCheck, ArrowRight, Download, PenTool, Lock } from 'lucide-react';
import { syncDocumentWithGoogle } from '../services/integrationService';

interface Props {
  workers: WorkerData[];
  companyProfile: CompanyProfile;
  onClose: () => void;
  onSuccess: () => void;
}

interface SignerStatus {
  workerId: string;
  workerName: string;
  rut: string;
  signature: string;
  signed: boolean;
}

export const FieldTrainingManager: React.FC<Props> = ({ workers, companyProfile, onClose, onSuccess }) => {
  const [step, setStep] = useState<'SELECTION' | 'DETAILS' | 'SIGNING' | 'SAVING' | 'COMPLETED'>('SELECTION');
  
  // Form Data
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('1');
  const [location, setLocation] = useState('');
  const [contentDetail, setContentDetail] = useState('');
  const [instructor, setInstructor] = useState(companyProfile.facilitatorName || '');
  const [instructorSignature, setInstructorSignature] = useState('');

  // Signing State
  const [signers, setSigners] = useState<SignerStatus[]>([]);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0);
  const [signerPassword, setSignerPassword] = useState(''); // New: Password Input
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState('');

  // -- STEP 1: SELECTION --
  const toggleWorker = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleToDetails = () => {
    if (selectedIds.length === 0) {
      alert("Seleccione al menos un trabajador.");
      return;
    }
    setStep('DETAILS');
  };

  // -- STEP 2: DETAILS --
  const handleToSigning = () => {
    if (!topic || !contentDetail || !instructor) {
      alert("Complete los campos obligatorios (Tema, Instructor, Detalle).");
      return;
    }
    if (!instructorSignature) {
        alert("La firma del relator es obligatoria.");
        return;
    }
    
    // Prepare signers queue
    const queue = workers
      .filter(w => selectedIds.includes(w.id))
      .map(w => ({
        workerId: w.id,
        workerName: w.fullName,
        rut: w.rut,
        signature: '',
        signed: false
      }));
    
    setSigners(queue);
    setCurrentSignerIndex(0);
    setSignerPassword('');
    setStep('SIGNING');
  };

  // -- STEP 3: SIGNING --
  const handleSignatureCapture = (signatureData: string) => {
    if (!signatureData) {
        alert("La firma es obligatoria.");
        return;
    }

    // Password Validation Logic
    const currentWorkerId = signers[currentSignerIndex].workerId;
    const worker = workers.find(w => w.id === currentWorkerId);
    
    if (worker) {
        const cleanRut = (worker.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
        const storedPass = worker.password ? String(worker.password).trim() : "";
        const inputPass = signerPassword.trim();
        
        let isValid = false;
        if (storedPass) {
            isValid = inputPass === storedPass;
        } else {
            // Fallback to RUT if no specific password set
            isValid = inputPass === cleanRut || inputPass === worker.rut.trim();
        }

        if (!isValid) {
            alert("Contraseña o PIN incorrecto. No se puede validar la firma.");
            return;
        }
    }

    const newSigners = [...signers];
    newSigners[currentSignerIndex] = {
        ...newSigners[currentSignerIndex],
        signature: signatureData,
        signed: true
    };
    setSigners(newSigners);
    setSignerPassword(''); // Clear for next person

    // Move to next or finish
    if (currentSignerIndex < signers.length - 1) {
        setCurrentSignerIndex(prev => prev + 1);
    } else {
        handleFinalSave(newSigners);
    }
  };

  // -- STEP 4: SAVE --
  const handleFinalSave = async (completedSigners: SignerStatus[]) => {
    setStep('SAVING');
    try {
        const htmlContent = generateTrainingRecordHTML(completedSigners);
        
        const result = await syncDocumentWithGoogle({
            id: Date.now().toString(),
            title: `CAP_TERRENO_${topic.replace(/\s+/g, '_').toUpperCase()}_${date}`,
            type: 'CAPACITACION', 
            category: 'Registro Capacitación',
            date: date,
            workerName: 'GRUPAL', 
            workerId: 'VARIOUS',
            workCenter: location || 'Terreno',
            content: htmlContent
        });

        if (result && result.url) {
            setGeneratedPdfUrl(result.url);
            setStep('COMPLETED');
            onSuccess();
        } else {
            alert("Guardado, pero no se pudo obtener el enlace del PDF.");
            onClose();
        }

    } catch (e) {
        console.error(e);
        alert("Error al guardar el documento.");
        setStep('SIGNING'); 
    }
  };

  const generateTrainingRecordHTML = (attendees: SignerStatus[]) => {
      const legalFooter = "Documento suscrito mediante Firma Electrónica Simple (FES) conforme a la Ley N° 19.799. La identidad del firmante ha sido verificada mediante clave personal intransferible, declarando haber leído, comprendido y aceptado el contenido íntegro del presente instrumento.";
      
      return `
        <div style="font-family: Arial, sans-serif; padding: 30px; color: #000;">
            <table width="100%" style="border-collapse: collapse; margin-bottom: 20px;">
                <tr>
                    <td width="20%" style="border: 1px solid #000; padding: 10px; text-align: center;">LOGO</td>
                    <td width="60%" style="border: 1px solid #000; padding: 10px; text-align: center;">
                        <h2 style="margin: 0;">REGISTRO DE CAPACITACIÓN</h2>
                    </td>
                    <td width="20%" style="border: 1px solid #000; padding: 10px; font-size: 10px;">
                        FECHA: ${date}<br>
                        FOLIO: ${Date.now().toString().slice(-6)}
                    </td>
                </tr>
            </table>

            <div style="background-color: #eee; padding: 5px; font-weight: bold; border: 1px solid #000; margin-bottom: 10px;">1. ANTECEDENTES DE LA ACTIVIDAD</div>
            <table width="100%" style="border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background-color: #f9f9f9;">TEMA / ACTIVIDAD</td>
                    <td colspan="3" style="border: 1px solid #000; padding: 5px;">${topic}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background-color: #f9f9f9;">RELATOR / INSTRUCTOR</td>
                    <td style="border: 1px solid #000; padding: 5px;">${instructor}</td>
                    <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background-color: #f9f9f9;">DURACIÓN (Horas)</td>
                    <td style="border: 1px solid #000; padding: 5px;">${duration}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #000; padding: 5px; font-weight: bold; background-color: #f9f9f9;">LUGAR</td>
                    <td colspan="3" style="border: 1px solid #000; padding: 5px;">${location || 'En Terreno'}</td>
                </tr>
            </table>

            <div style="background-color: #eee; padding: 5px; font-weight: bold; border: 1px solid #000; margin-bottom: 10px;">2. CONTENIDOS TRATADOS</div>
            <div style="border: 1px solid #000; padding: 10px; min-height: 100px; font-size: 11px; margin-bottom: 20px; white-space: pre-wrap;">${contentDetail}</div>

            <div style="background-color: #eee; padding: 5px; font-weight: bold; border: 1px solid #000; margin-bottom: 10px;">3. ASISTENCIA Y FIRMAS</div>
            <p style="font-size: 10px; margin-bottom: 10px;">Declaro haber recibido la capacitación indicada, comprendiendo los contenidos tratados y aclarando mis dudas al respecto.</p>
            
            <table width="100%" style="border-collapse: collapse; font-size: 10px;">
                <thead>
                    <tr style="background-color: #f0f0f0;">
                        <th style="border: 1px solid #000; padding: 5px; width: 5%;">N°</th>
                        <th style="border: 1px solid #000; padding: 5px; width: 40%;">NOMBRE COMPLETO</th>
                        <th style="border: 1px solid #000; padding: 5px; width: 25%;">RUT</th>
                        <th style="border: 1px solid #000; padding: 5px; width: 30%;">FIRMA</th>
                    </tr>
                </thead>
                <tbody>
                    ${attendees.map((a, idx) => `
                        <tr>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${idx + 1}</td>
                            <td style="border: 1px solid #000; padding: 5px;">${a.workerName}</td>
                            <td style="border: 1px solid #000; padding: 5px; text-align: center;">${a.rut}</td>
                            <td style="border: 1px solid #000; padding: 2px; text-align: center;">
                                <img src="${a.signature}" style="height: 30px; display: block; margin: 0 auto;">
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="margin-top: 40px; text-align: center;">
                <div style="border-bottom: 1px solid #000; width: 200px; margin: 0 auto;"></div>
                <img src="${instructorSignature}" style="height: 50px; display: block; margin: -50px auto 0 auto;" />
                <p style="font-size: 11px; font-weight: bold; margin-top: 5px;">${instructor}</p>
                <p style="font-size: 10px;">FIRMA RELATOR</p>
            </div>

            <div style="margin-top: 30px; border-top: 1px solid #ccc; padding-top: 5px; font-size: 9px; color: #666; text-align: center;">
                ${legalFooter}
            </div>
        </div>
      `;
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col animate-fade-in">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-orange-600"/> Capacitación en Terreno
            </h2>
            <div className="flex items-center gap-2 text-sm">
                <span className={`px-2 py-1 rounded ${step === 'SELECTION' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-400'}`}>1. Asistentes</span>
                <ChevronRight size={14} className="text-gray-300"/>
                <span className={`px-2 py-1 rounded ${step === 'DETAILS' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-400'}`}>2. Datos</span>
                <ChevronRight size={14} className="text-gray-300"/>
                <span className={`px-2 py-1 rounded ${step === 'SIGNING' ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-400'}`}>3. Firmas</span>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto">
            {step === 'SELECTION' && (
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Seleccione los trabajadores presentes en la charla:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {workers.map(w => (
                            <div 
                                key={w.id} 
                                onClick={() => toggleWorker(w.id)}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-all ${
                                    selectedIds.includes(w.id) 
                                    ? 'bg-orange-50 border-orange-400 shadow-sm' 
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                            >
                                <div>
                                    <p className="font-bold text-sm text-gray-700">{w.fullName}</p>
                                    <p className="text-xs text-gray-500">{w.role}</p>
                                </div>
                                {selectedIds.includes(w.id) && <CheckCircle2 className="text-orange-500" size={18}/>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {step === 'DETAILS' && (
                <div className="space-y-6 max-w-2xl mx-auto pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tema de Capacitación</label>
                            <input 
                                type="text" 
                                value={topic} 
                                onChange={e => setTopic(e.target.value)}
                                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                placeholder="Ej: Charla 5 Minutos - Uso de EPP"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Calendar size={12}/> Fecha</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Duración (Horas)</label>
                            <input 
                                type="number" 
                                value={duration} 
                                onChange={e => setDuration(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                step="0.5"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><UserCheck size={12}/> Relator / Instructor</label>
                            <input 
                                type="text" 
                                value={instructor} 
                                onChange={e => setInstructor(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                placeholder="Nombre del responsable"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><MapPin size={12}/> Lugar / Obra</label>
                            <input 
                                type="text" 
                                value={location} 
                                onChange={e => setLocation(e.target.value)}
                                className="w-full p-2 border rounded-lg"
                                placeholder="Ej: Taller Central"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1"><FileText size={12}/> Detalle de Contenidos</label>
                            <textarea 
                                value={contentDetail} 
                                onChange={e => setContentDetail(e.target.value)}
                                className="w-full p-2 border rounded-lg h-24 resize-none"
                                placeholder="Describa brevemente los puntos tratados..."
                            />
                        </div>
                        
                        <div className="md:col-span-2 bg-orange-50 p-4 rounded-xl border border-orange-200 mt-2">
                            <label className="block text-xs font-bold text-orange-800 uppercase mb-2 flex items-center gap-1">
                                <PenTool size={12}/> Firma del Relator (Obligatoria)
                            </label>
                            <div className="bg-white rounded-lg">
                                {instructorSignature ? (
                                    <div className="relative p-2 text-center">
                                        <img src={instructorSignature} alt="Firma Relator" className="h-16 mx-auto"/>
                                        <button 
                                            onClick={() => setInstructorSignature('')} 
                                            className="text-xs text-red-500 underline mt-1"
                                        >
                                            Borrar y firmar de nuevo
                                        </button>
                                    </div>
                                ) : (
                                    <SignaturePad onSave={setInstructorSignature} label="Firma del Relator en pantalla" />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 'SIGNING' && signers.length > 0 && (
                <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="w-full max-w-md bg-orange-50 border border-orange-200 rounded-xl p-6 text-center">
                        <p className="text-xs text-orange-600 font-bold uppercase mb-2">Firmando: {currentSignerIndex + 1} de {signers.length}</p>
                        <h3 className="text-2xl font-bold text-gray-800 mb-1">{signers[currentSignerIndex].workerName}</h3>
                        <p className="text-gray-500 text-sm mb-6">{signers[currentSignerIndex].rut}</p>
                        
                        <div className="bg-white rounded-xl shadow-inner border border-gray-300 p-2 mb-4">
                            <SignaturePad 
                                key={signers[currentSignerIndex].workerId} 
                                onSave={handleSignatureCapture} 
                                label="Firme en el recuadro"
                            />
                        </div>

                        {/* Password Input for Validity */}
                        <div className="text-left mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                <Lock size={12}/> Contraseña / PIN (Validación FES)
                            </label>
                            <input 
                                type="password" 
                                value={signerPassword} 
                                onChange={e => setSignerPassword(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded text-center font-bold tracking-widest bg-white focus:ring-2 focus:ring-orange-500"
                                placeholder="****"
                            />
                        </div>
                        
                        <p className="text-xs text-gray-400 italic">Por favor firme y presione "Guardar" para pasar al siguiente.</p>
                    </div>
                </div>
            )}

            {step === 'SAVING' && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Loader2 size={48} className="animate-spin text-orange-500 mb-4"/>
                    <p className="font-bold">Generando Documento PDF...</p>
                    <p className="text-xs">Sincronizando firmas con la nube.</p>
                </div>
            )}

            {step === 'COMPLETED' && (
                <div className="flex flex-col items-center justify-center h-full space-y-6 animate-fade-in-up">
                    <div className="bg-green-100 p-6 rounded-full text-green-600 mb-2">
                        <CheckCircle2 size={64}/>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">¡Registro Exitoso!</h2>
                    <p className="text-gray-600 text-center max-w-md">
                        Se han registrado {signers.length} firmas validadas y se ha generado el documento PDF oficial en la nube.
                    </p>
                    
                    {generatedPdfUrl && (
                        <a 
                            href={generatedPdfUrl} 
                            target="_blank" 
                            rel="noreferrer"
                            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Download size={20}/> Descargar / Ver PDF
                        </a>
                    )}
                    
                    <button 
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-800 underline mt-4"
                    >
                        Volver al inicio
                    </button>
                </div>
            )}
        </div>

        {step !== 'COMPLETED' && (
            <div className="mt-6 pt-4 border-t flex justify-between items-center">
                {step === 'SELECTION' && (
                    <>
                        <p className="text-sm font-bold text-gray-600">{selectedIds.length} seleccionados</p>
                        <button onClick={handleToDetails} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                            Siguiente <ArrowRight size={18}/>
                        </button>
                    </>
                )}
                
                {step === 'DETAILS' && (
                    <>
                        <button onClick={() => setStep('SELECTION')} className="text-gray-500 hover:text-gray-800 font-medium">Volver</button>
                        <button onClick={handleToSigning} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                            Comenzar Firmas <CheckCircle2 size={18}/>
                        </button>
                    </>
                )}

                {step === 'SIGNING' && (
                    <button onClick={() => setStep('DETAILS')} className="text-gray-500 hover:text-gray-800 font-medium">Cancelar y Volver</button>
                )}
            </div>
        )}
    </div>
  );
};
