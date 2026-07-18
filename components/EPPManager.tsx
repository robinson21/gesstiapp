
import React, { useState, useEffect } from 'react';
import { WorkerData, PPETransaction, EPP_LIST, CompanyProfile, DocumentSST } from '../types';
import { SignaturePad } from './SignaturePad';
import { WorkerSelector } from './WorkerSelector';
import { syncPPETransaction, fetchPPEHistory, syncDocumentWithGoogle } from '../services/integrationService';
import { HardHat, CheckCircle2, History, AlertTriangle, Save, Loader2, RefreshCw, Eye, FileCheck, Download, FileText, X, Calendar, Lock } from 'lucide-react';

interface Props {
  workers: WorkerData[];
  currentWorker: WorkerData | null;
  onWorkerSelect: (worker: WorkerData) => void;
  companyProfile: CompanyProfile;
  onSaveSuccess: () => void;
  onViewDocument: (content: string, signature: string) => void;
}

export const EPPManager: React.FC<Props> = ({ workers, currentWorker, onWorkerSelect, companyProfile, onSaveSuccess, onViewDocument }) => {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [transactionType, setTransactionType] = useState<'Entrega Inicial' | 'Recambio' | 'Devolución'>('Entrega Inicial');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]); 
  const [motive, setMotive] = useState('');
  const [signature, setSignature] = useState('');
  const [workerPassword, setWorkerPassword] = useState(''); // New: Password
  const [history, setHistory] = useState<PPETransaction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const [viewingRecord, setViewingRecord] = useState<PPETransaction | null>(null);

  useEffect(() => {
    if (currentWorker) {
      loadHistory();
      setSelectedItems([]);
      setSignature('');
      setMotive('');
      setWorkerPassword('');
      setTransactionType('Entrega Inicial');
      setTransactionDate(new Date().toISOString().split('T')[0]);
    } else {
        setHistory([]);
    }
  }, [currentWorker]);

  const loadHistory = async () => {
      if (!currentWorker) return;
      setIsLoadingHistory(true);
      try {
          const data = await fetchPPEHistory(currentWorker.id);
          setHistory(data);
      } catch (error) {
          console.error("Failed to load history", error);
      } finally {
          setIsLoadingHistory(false);
      }
  };

  const handleToggleItem = (item: string) => {
    if (selectedItems.includes(item)) {
      setSelectedItems(selectedItems.filter(i => i !== item));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleSave = async () => {
    if (!currentWorker) return;
    if (selectedItems.length === 0) {
      alert("Debe seleccionar al menos un EPP.");
      return;
    }
    if (!signature) {
      alert("La firma del trabajador es obligatoria para la recepción conforme.");
      return;
    }
    if (transactionType === 'Recambio' && !motive) {
      alert("Debe indicar el motivo del recambio.");
      return;
    }
    if (!transactionDate) {
        alert("La fecha es obligatoria.");
        return;
    }
    
    // Password Validation
    const cleanRut = (currentWorker.rut || '').replace(/[^0-9kK]/g, '').toLowerCase();
    const storedPass = currentWorker.password ? String(currentWorker.password).trim() : "";
    const inputPass = workerPassword.trim();
    let isValid = false;
    
    if (storedPass) isValid = inputPass === storedPass;
    else isValid = inputPass === cleanRut || inputPass === currentWorker.rut.trim();

    if (!isValid) {
        alert("Contraseña o PIN incorrecto. No se puede validar la firma.");
        return;
    }

    setIsSyncing(true);
    try {
      const baseTransaction: PPETransaction = {
        id: Date.now().toString(),
        workerId: currentWorker.id,
        workerName: currentWorker.fullName,
        date: transactionDate,
        type: transactionType,
        items: selectedItems,
        motive: transactionType === 'Recambio' ? motive : '',
        signature: signature
      };

      const htmlContent = generateReceiptHTML(baseTransaction);

      const docResponse = await syncDocumentWithGoogle({
          id: baseTransaction.id,
          title: `COMPROBANTE_EPP_${baseTransaction.type.toUpperCase()}_${baseTransaction.date}`,
          type: 'EPP',
          category: 'Entrega EPP',
          date: baseTransaction.date,
          workerName: currentWorker.fullName,
          workerId: currentWorker.id,
          workCenter: currentWorker.workCenter, 
          content: htmlContent,
          role: currentWorker.role
      });
      
      const pdfUrl = docResponse?.url || "";

      const finalTransaction = { ...baseTransaction, pdfUrl: pdfUrl };
      await syncPPETransaction(finalTransaction);
      
      setHistory([finalTransaction, ...history]);
      
      setSelectedItems([]);
      setSignature('');
      setMotive('');
      setWorkerPassword('');
      setTransactionType('Entrega Inicial');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      onSaveSuccess();
      alert("Registro guardado y comprobante generado exitosamente en carpeta del Centro de Trabajo.");
      
    } catch (error) {
      console.error(error);
      alert("Error al guardar registro. Verifique su conexión.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getSafeItems = (items: any): string[] => {
      if (Array.isArray(items)) return items;
      if (typeof items === 'string') return items.split(',').map(i => i.trim()).filter(i => i);
      return [];
  };

  const generateReceiptHTML = (record: PPETransaction) => {
      const safeItems = getSafeItems(record.items);
      const legalFooter = "Documento suscrito mediante Firma Electrónica Simple (FES) conforme a la Ley N° 19.799. La identidad del firmante ha sido verificada mediante clave personal intransferible, declarando haber leído, comprendido y aceptado el contenido íntegro del presente instrumento.";

      return `
        <div id="receipt-content" style="font-family: Arial, sans-serif; color: #000; padding: 20px; width: 100%; box-sizing: border-box; background: white;">
            
            <table width="100%" style="border-collapse: collapse; border-bottom: 2px solid #000; margin-bottom: 15px;">
                <tr>
                    <td align="center" style="padding-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 16px; text-transform: uppercase;">COMPROBANTE DE ENTREGA DE EPP</h2>
                        <p style="margin: 5px 0 0 0; font-size: 9px; color: #555;">
                            Conforme al Art. 53 del Decreto Supremo N° 594 y Código del Trabajo
                        </p>
                    </td>
                </tr>
            </table>

            <table width="100%" style="border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
                <tr>
                    <td colspan="4" style="background-color: #f3f4f6; font-weight: bold; padding: 4px; border: 1px solid #ccc;">1. ANTECEDENTES DEL TRABAJADOR</td>
                </tr>
                <tr>
                    <td width="15%" style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">NOMBRE</td>
                    <td width="35%" style="border: 1px solid #ccc; padding: 4px;">${record.workerName}</td>
                    <td width="15%" style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">RUT</td>
                    <td width="35%" style="border: 1px solid #ccc; padding: 4px;">${currentWorker?.rut || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">CARGO</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${currentWorker?.role || 'N/A'}</td>
                    <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">CENTRO</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${currentWorker?.workCenter || 'N/A'}</td>
                </tr>
                <tr>
                    <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">FECHA</td>
                    <td style="border: 1px solid #ccc; padding: 4px;">${record.date}</td>
                    <td style="border: 1px solid #ccc; padding: 4px; font-weight: bold;">TIPO</td>
                    <td style="border: 1px solid #ccc; padding: 4px; text-transform: uppercase;">${record.type}</td>
                </tr>
            </table>

            <table width="100%" style="border-collapse: collapse; margin-bottom: 15px; font-size: 10px;">
                <thead>
                    <tr>
                        <td colspan="3" style="background-color: #f3f4f6; font-weight: bold; padding: 4px; border: 1px solid #ccc;">2. DETALLE DE ELEMENTOS ENTREGADOS</td>
                    </tr>
                    <tr>
                        <th style="border: 1px solid #ccc; padding: 4px; background-color: #eee; text-align: left;">ELEMENTO DE PROTECCIÓN PERSONAL</th>
                        <th style="border: 1px solid #ccc; padding: 4px; background-color: #eee; text-align: center; width: 60px;">CANTIDAD</th>
                        <th style="border: 1px solid #ccc; padding: 4px; background-color: #eee; text-align: center; width: 80px;">ESTADO</th>
                    </tr>
                </thead>
                <tbody>
                    ${safeItems.map(item => `
                        <tr>
                            <td style="border: 1px solid #ccc; padding: 4px;">${item}</td>
                            <td style="border: 1px solid #ccc; padding: 4px; text-align: center;">1</td>
                            <td style="border: 1px solid #ccc; padding: 4px; text-align: center;">NUEVO</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            ${record.motive ? `
                <div style="border: 1px solid #ccc; padding: 8px; background-color: #fff7ed; margin-bottom: 15px; font-size: 10px;">
                    <strong>MOTIVO DEL RECAMBIO:</strong> ${record.motive}
                </div>
            ` : ''}

            <div style="border: 1px solid #ccc; padding: 8px; margin-bottom: 20px; font-size: 9px; text-align: justify; line-height: 1.3;">
                <strong>3. DECLARACIÓN DE RECEPCIÓN Y COMPROMISO:</strong><br>
                Declaro haber recibido los elementos de protección personal detallados anteriormente en buen estado.
                He recibido instrucción sobre su uso correcto, mantención y almacenamiento. 
                Me comprometo a utilizarlos durante mi jornada laboral y a cuidarlos según la normativa vigente.
                Entiendo que estos elementos son propiedad de la empresa y son para mi seguridad personal.
            </div>

            <table width="100%" style="border-collapse: collapse; margin-top: 30px;">
                <tr>
                    <td align="center" valign="bottom" width="40%" style="height: 100px; vertical-align: bottom;">
                        <div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>
                        <img src="${record.signature}" style="height: 40px; margin-top: -40px; display: block;" />
                        <p style="margin: 5px 0 0 0; font-size: 9px; font-weight: bold;">${record.workerName}</p>
                        <p style="margin: 0; font-size: 8px;">RUT: ${currentWorker?.rut}</p>
                        <p style="margin: 0; font-size: 8px;">FIRMA TRABAJADOR</p>
                    </td>
                    <td width="20%"></td>
                    <td align="center" valign="bottom" width="40%" style="height: 100px; vertical-align: bottom;">
                        <div style="border-bottom: 1px solid #000; width: 80%; margin: 0 auto;"></div>
                        <p style="margin: 5px 0 0 0; font-size: 9px; font-weight: bold;">ENTREGADO POR</p>
                        <p style="margin: 0; font-size: 8px;">RESPONSABLE SST / BODEGA</p>
                    </td>
                </tr>
            </table>
            
            <div style="margin-top: 20px; text-align: center; font-size: 8px; color: #999;">
                ${legalFooter}
            </div>
        </div>
      `.replace(/\n/g, '').trim();
  };

  const handlePreview = (record: PPETransaction) => {
     setViewingRecord(record);
  };

  const handleDownloadPDF = () => {
      if (!viewingRecord) return;
      const element = document.getElementById('receipt-content');
      if (!element) return;

      const opt = {
          margin: 10,
          filename: `COMPROBANTE_EPP_${viewingRecord.workerName}_${viewingRecord.date}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // @ts-ignore
      if (window.html2pdf) {
          // @ts-ignore
          window.html2pdf().set(opt).from(element).save();
      } else {
          alert("Error: Librería de PDF no disponible. Por favor recargue la página.");
      }
  };

  return (
    <div className="animate-fade-in relative">
        <WorkerSelector 
            workers={workers} 
            currentWorker={currentWorker} 
            onSelect={onWorkerSelect} 
        />

        {!currentWorker ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400 bg-white rounded-xl border border-gray-200 mt-6">
                <HardHat size={48} className="mb-4 opacity-50" />
                <p>Busque y seleccione un trabajador arriba para gestionar su EPP.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-4 border-b pb-2">
                    <HardHat className="text-primary" /> Registro de Entrega / Recambio
                </h3>

                <div className="mb-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1">
                        <Calendar size={14}/> Fecha de Entrega / Regularización
                    </label>
                    <input 
                        type="date" 
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1 italic">Puede seleccionar una fecha pasada para regularizar entregas anteriores.</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    {['Entrega Inicial', 'Recambio', 'Devolución'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setTransactionType(type as any)}
                        className={`py-2 px-4 rounded-lg text-sm font-bold border transition-all ${
                        transactionType === type 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {type}
                    </button>
                    ))}
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Seleccionar Elementos a Entregar</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {EPP_LIST.map((item) => (
                        <div 
                        key={item}
                        onClick={() => handleToggleItem(item)}
                        className={`cursor-pointer p-3 rounded border text-xs flex items-center justify-between transition-all ${
                            selectedItems.includes(item) 
                            ? 'bg-blue-50 border-blue-400 text-blue-800' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                        >
                        <span>{item}</span>
                        {selectedItems.includes(item) && <CheckCircle2 size={14} className="text-blue-600"/>}
                        </div>
                    ))}
                    </div>
                </div>

                {transactionType === 'Recambio' && (
                    <div className="mb-6 bg-orange-50 p-4 rounded border border-orange-200 animate-fade-in">
                        <label className="block text-xs font-bold text-orange-700 uppercase mb-2 flex items-center gap-1">
                        <AlertTriangle size={14}/> Motivo del Recambio (Obligatorio)
                        </label>
                        <select 
                        value={motive} 
                        onChange={(e) => setMotive(e.target.value)}
                        className="w-full p-2 border border-orange-300 rounded bg-white text-sm"
                        >
                        <option value="">-- Seleccione Motivo --</option>
                        <option value="Deterioro por uso normal">Deterioro por uso normal</option>
                        <option value="Pérdida / Robo">Pérdida / Robo</option>
                        <option value="Defecto de fábrica">Defecto de fábrica</option>
                        <option value="Accidente / Daño">Accidente / Daño</option>
                        <option value="Vencimiento">Vencimiento (Ej: Casco)</option>
                        </select>
                    </div>
                )}

                <div className="mb-6">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 p-4">
                    {signature ? (
                        <div className="relative">
                            <img src={signature} alt="Firma" className="h-24 mx-auto"/>
                            <button onClick={() => setSignature('')} className="absolute top-0 right-0 text-red-500 text-xs underline">Re-firmar</button>
                            <p className="text-center text-xs text-green-600 font-bold mt-2 flex justify-center gap-1"><CheckCircle2 size={12}/> Firmado por {currentWorker.fullName}</p>
                        </div>
                    ) : (
                        <SignaturePad onSave={setSignature} label={`Firma de ${currentWorker.fullName}`} />
                    )}
                    </div>
                    
                    <div className="mt-4">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                            <Lock size={12}/> Contraseña / PIN (Validación FES)
                        </label>
                        <input 
                            type="password" 
                            value={workerPassword} 
                            onChange={e => setWorkerPassword(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded text-center font-bold tracking-widest bg-white focus:ring-2 focus:ring-blue-500"
                            placeholder="****"
                        />
                    </div>

                    <p className="text-[10px] text-gray-400 mt-2 text-justify">
                    Al firmar, el trabajador declara haber recibido los elementos seleccionados en buen estado y haber recibido instrucción sobre su uso correcto (Art. 53 DS 594).
                    </p>
                </div>

                <div className="flex justify-end">
                    <button 
                    onClick={handleSave}
                    disabled={isSyncing}
                    className="bg-primary hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2"
                    >
                    {isSyncing ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
                    Registrar Entrega Conforme
                    </button>
                </div>

                </div>
            </div>

            <div className="lg:col-span-1">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                        <History size={16}/> Historial de EPP
                    </h3>
                    <button onClick={loadHistory} disabled={isLoadingHistory} className="text-gray-400 hover:text-primary"><RefreshCw size={14} className={isLoadingHistory ? 'animate-spin' : ''}/></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 max-h-[600px]">
                    {history.length === 0 && !isLoadingHistory && (
                        <p className="text-center text-xs text-gray-400 py-4">Sin registros previos.</p>
                    )}
                    
                    {history.map((record) => {
                        const safeItems = getSafeItems(record.items);
                        return (
                        <div key={record.id} className="bg-gray-50 p-3 rounded border border-gray-100 text-xs hover:border-blue-300 transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                            <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                                record.type === 'Recambio' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
                            }`}>
                                {record.type}
                            </span>
                            <span className="text-gray-400">{record.date}</span>
                            </div>
                            <div className="mb-2">
                            {safeItems.map(item => (
                                <span key={item} className="block text-gray-700">• {item}</span>
                            ))}
                            </div>
                            <div className="mt-3 flex flex-wrap justify-between items-center pt-2 border-t border-gray-200 gap-2">
                                <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                                <FileCheck size={12}/> Firmado
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handlePreview(record)}
                                        className="bg-white border border-blue-200 text-blue-600 px-2 py-1 rounded hover:bg-blue-50 flex items-center gap-1 shadow-sm transition-colors"
                                        title="Vista Previa HTML"
                                    >
                                        <Eye size={12}/> Ver
                                    </button>
                                    
                                    {record.pdfUrl && (
                                        <a 
                                            href={record.pdfUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center gap-1 shadow-sm transition-colors text-[10px] font-bold"
                                            title="Abrir PDF Oficial en Drive"
                                        >
                                            <Download size={12}/> Drive
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
            </div>
            </div>
        )}

        {viewingRecord && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-xl shadow-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileText size={18} className="text-blue-600"/> Comprobante EPP
                        </h3>
                        <button onClick={() => setViewingRecord(null)} className="text-gray-500 hover:text-gray-700 font-bold">
                            <X size={20}/>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
                        <div 
                            className="bg-white shadow-lg mx-auto max-w-[210mm] min-h-[297mm] text-xs"
                            dangerouslySetInnerHTML={{ __html: generateReceiptHTML(viewingRecord) }}
                        />
                    </div>
                    
                    <div className="p-4 border-t bg-white flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                            {viewingRecord.pdfUrl ? "Documento respaldado en Google Drive." : "Generando vista previa local."}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleDownloadPDF} 
                                className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                            >
                                <Download size={16}/> Descargar PDF
                            </button>
                            <button onClick={() => setViewingRecord(null)} className="px-4 py-2 bg-gray-800 text-white rounded font-bold hover:bg-gray-900">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
