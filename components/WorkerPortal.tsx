
import React, { useState } from 'react';
import { WorkerData, AnnualTrainingPlan, DocumentSST, InteractiveModule, TrainingAssignment } from '../types';
import { UserCheck, FileText, GraduationCap, Play, CheckCircle2, Lock, Calendar, BookOpen, KeyRound, X, Save, Loader2, Clock, RefreshCw } from 'lucide-react';
import { TrainingPlayer } from './TrainingPlayer';
import { syncDocumentWithGoogle, fetchAssignmentContent } from '../services/integrationService';

interface Props {
  currentUser: WorkerData;
  allDocuments: DocumentSST[];
  masterPlans: Record<string, AnnualTrainingPlan>;
  assignments: TrainingAssignment[];
  onExit: () => void;
  showToast: (msg: string, type: any) => void;
  onAssignmentUpdate: (id: string, status: 'Aprobado'|'Reprobado'|'Pendiente', score: number, answers?: number[]) => Promise<void>;
  onUpdatePassword: (data: WorkerData) => Promise<void>; 
}

export const WorkerPortal: React.FC<Props> = ({ currentUser, allDocuments, masterPlans, assignments, onExit, showToast, onAssignmentUpdate, onUpdatePassword }) => {
  const [activeModule, setActiveModule] = useState<InteractiveModule | null>(null);
  const [currentAssignmentId, setCurrentAssignmentId] = useState<string | null>(null);
  const [loadingModule, setLoadingModule] = useState(false);
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);

  const myDocuments = allDocuments.filter(d => d.workerName === currentUser.fullName || (d.workerId === currentUser.id));
  const myAssignments = assignments.filter(a => String(a.workerId) === String(currentUser.id));

  const sortedAssignments = [...myAssignments].sort((a, b) => {
      if (a.status === 'Pendiente' && b.status !== 'Pendiente') return -1;
      if (a.status !== 'Pendiente' && b.status === 'Pendiente') return 1;
      return new Date(b.assignedDate).getTime() - new Date(a.assignedDate).getTime();
  });

  const handleStartTraining = async (item: TrainingAssignment) => {
      setLoadingModule(true);
      setCurrentAssignmentId(item.id);
      
      if (item.interactiveContent) {
           setTimeout(() => {
               setActiveModule(item.interactiveContent!);
               setLoadingModule(false);
           }, 500);
           return;
      }

      try {
          const content = await fetchAssignmentContent(item.id);
          if (content) {
              setActiveModule(content);
          } else {
              showToast("Error: No se pudo cargar el contenido del curso.", "error");
              setCurrentAssignmentId(null);
          }
      } catch (e) {
          showToast("Error de conexión al cargar curso.", "error");
          setCurrentAssignmentId(null);
      } finally {
          setLoadingModule(false);
      }
  };

  const handleTrainingComplete = async (signature: string, score: number, answers: number[]) => {
      if (!activeModule) return;
      
      const legalFooter = "Documento suscrito mediante Firma Electrónica Simple (FES) conforme a la Ley N° 19.799. La identidad del firmante ha sido verificada mediante clave personal intransferible, declarando haber leído, comprendido y aceptado el contenido íntegro del presente instrumento.";

      const diplomaHtml = `
        <div style="text-align: center; padding: 40px; font-family: Arial, sans-serif; border: 10px solid #1a73e8; position: relative;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0.05; background-image: repeating-linear-gradient(45deg, #ccc 0, #ccc 1px, transparent 0, transparent 50%); pointer-events: none;"></div>
            
            <h1 style="font-size: 36px; color: #1a73e8; margin-bottom: 5px; text-transform: uppercase; letter-spacing: 2px;">Certificado de Aprobación</h1>
            <p style="font-size: 12px; color: #555; margin-top: 0; text-transform: uppercase;">Gestión de Seguridad y Salud en el Trabajo (SST)</p>
            
            <div style="margin: 40px 0;">
                <p style="font-size: 18px; color: #333;">Se certifica que el colaborador:</p>
                <h2 style="font-size: 32px; font-weight: bold; margin: 10px 0; text-transform: uppercase; color: #000; border-bottom: 1px solid #ccc; display: inline-block; padding-bottom: 5px;">
                    ${currentUser.fullName}
                </h2>
                <p style="font-size: 14px; color: #666;">RUT: ${currentUser.rut}</p>
            </div>

            <p style="font-size: 18px; color: #333;">Ha completado y aprobado satisfactoriamente la capacitación:</p>
            <h3 style="font-size: 26px; color: #1a73e8; font-weight: bold; margin: 20px 0;">"${activeModule.title}"</h3>
            
            <div style="display: flex; justify-content: center; gap: 40px; margin: 30px 0;">
                <div style="background: #f0f4f8; padding: 10px 20px; border-radius: 8px;">
                    <span style="font-size: 12px; color: #666;">NOTA OBTENIDA</span><br/>
                    <strong style="font-size: 24px; color: #1a73e8;">${score}%</strong>
                </div>
                <div style="background: #f0f4f8; padding: 10px 20px; border-radius: 8px;">
                    <span style="font-size: 12px; color: #666;">ESTADO</span><br/>
                    <strong style="font-size: 24px; color: #2e7d32;">APROBADO</strong>
                </div>
            </div>

            <p style="font-size: 12px; color: #777; font-style: italic; margin-bottom: 40px;">
                El presente certificado acredita el cumplimiento de la obligación de informar y capacitar (Art. 21 DS 44 / Art. 184 Código del Trabajo).
            </p>

            <div style="display: flex; justify-content: space-around; align-items: flex-end; margin-top: 50px;">
                <div style="text-align: center;">
                    <img src="${signature}" style="height: 60px; display: block; margin: 0 auto;" alt="Firma Alumno" />
                    <div style="border-top: 1px solid #999; width: 200px; margin-top: 5px;"></div>
                    <p style="font-size: 12px; font-weight: bold; margin: 5px 0;">FIRMA TRABAJADOR</p>
                </div>
                <div style="text-align: center;">
                     <div style="height: 60px;"></div> 
                    <div style="border-top: 1px solid #999; width: 200px; margin-top: 5px;"></div>
                    <p style="font-size: 12px; font-weight: bold; margin: 5px 0;">RESPONSABLE CAPACITACIÓN</p>
                </div>
            </div>

            <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center;">
                <p style="font-size: 10px; color: #aaa;">Fecha de Emisión: ${new Date().toLocaleDateString()} | Código de Validación: ${Date.now().toString().slice(-8)}</p>
                <p style="font-size: 8px; color: #aaa; margin-top:5px;">${legalFooter}</p>
            </div>
        </div>
      `;

      const doc: DocumentSST = {
          id: Date.now().toString(),
          title: `CERT_${activeModule.title.replace(/\s+/g, '_').substring(0,20)}`,
          type: 'CERTIFICADO',
          category: 'Capacitaciones',
          date: new Date().toISOString(),
          workerName: currentUser.fullName,
          workCenter: currentUser.workCenter,
          workerId: currentUser.id,
          content: diplomaHtml
      };

      await syncDocumentWithGoogle(doc);
      showToast("Certificado legal generado y guardado.", "success");
      
      if (currentAssignmentId) {
          await onAssignmentUpdate(currentAssignmentId, 'Aprobado', score, answers);
          showToast("Progreso y respuestas registradas.", "info");
      }

      setActiveModule(null);
      setCurrentAssignmentId(null);
  };

  const handleChangePassword = async () => {
      if (newPassword !== confirmPassword) {
          showToast("Las contraseñas no coinciden.", "error");
          return;
      }
      if (newPassword.length < 4) {
          showToast("La contraseña es muy corta.", "error");
          return;
      }
      
      setIsUpdatingPass(true);
      try {
          const updatedUser = { ...currentUser, password: newPassword };
          await onUpdatePassword(updatedUser);
          setShowPasswordModal(false);
          setNewPassword('');
          setConfirmPassword('');
          showToast("Contraseña actualizada correctamente.", "success");
      } catch (e) {
          showToast("Error al actualizar contraseña.", "error");
      } finally {
          setIsUpdatingPass(false);
      }
  };

  if (activeModule) {
      return (
          <TrainingPlayer 
             module={activeModule} 
             worker={currentUser} 
             company={{companyName: 'Empresa', companyRut: '', companyLogoUrl: '', facilitatorName: '', facilitatorRole: '', facilitatorSignature: ''}} 
             onComplete={handleTrainingComplete} 
             onCancel={() => { setActiveModule(null); setCurrentAssignmentId(null); }} 
          />
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in">
        <div className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-10">
            <div>
                <h2 className="font-bold text-gray-800">Hola, {currentUser.fullName.split(' ')[0]}</h2>
                <p className="text-xs text-gray-500">{currentUser.role}</p>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-blue-600 p-2" title="Actualizar Datos">
                     <RefreshCw size={16} />
                 </button>
                 <button onClick={() => setShowPasswordModal(true)} className="text-gray-600 text-sm font-medium px-3 py-1 rounded-lg hover:bg-gray-100 flex items-center gap-1" title="Cambiar Contraseña">
                    <KeyRound size={16}/>
                 </button>
                 <button onClick={onExit} className="text-red-500 text-sm font-medium bg-red-50 px-3 py-1 rounded-lg border border-red-200 hover:bg-red-100">Cerrar Sesión</button>
            </div>
        </div>

        <div className="p-6 max-w-3xl mx-auto space-y-8">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-lg">
                <h1 className="text-2xl font-bold mb-2">Portal del Colaborador</h1>
                <p className="opacity-90 text-sm">Gestiona tus capacitaciones y firma tus documentos legales desde aquí.</p>
            </div>

            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2"><GraduationCap className="text-green-600"/> Mis Cursos Asignados</h3>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{sortedAssignments.length}</span>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                     <div className="divide-y">
                         {sortedAssignments.length === 0 && <p className="p-6 text-center text-gray-400">No tienes cursos asignados actualmente.</p>}
                         
                         {sortedAssignments.map((item) => {
                             const isPending = item.status === 'Pendiente';
                             
                             return (
                                 <div key={item.id} className={`p-4 flex justify-between items-center transition-colors ${isPending ? 'bg-white hover:bg-blue-50' : 'bg-gray-50 opacity-80'}`}>
                                     <div className="flex items-start gap-3">
                                         <div className={`p-2 rounded-lg ${isPending ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                                            <BookOpen size={20}/>
                                         </div>
                                         <div>
                                             <p className="font-bold text-gray-800 text-sm">{item.topic}</p>
                                             <p className="text-xs text-gray-500 flex items-center gap-1">
                                                 <Calendar size={10}/> Asignado: {new Date(item.assignedDate).toLocaleDateString()}
                                                 {item.status === 'Aprobado' ? <span className="text-green-600 font-bold ml-2">• Aprobado ({item.score}%)</span> : <span className="text-orange-500 ml-2 flex items-center gap-1"><Clock size={10}/> Pendiente</span>}
                                             </p>
                                         </div>
                                     </div>
                                     
                                     {isPending ? (
                                         <button 
                                            onClick={() => handleStartTraining(item)}
                                            disabled={loadingModule}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 shadow hover:bg-blue-700 disabled:bg-gray-400"
                                         >
                                            {loadingModule && currentAssignmentId === item.id ? <><Loader2 size={12} className="animate-spin"/> Cargando...</> : <><Play size={12}/> Realizar Curso</>}
                                         </button>
                                     ) : (
                                         <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                             <CheckCircle2 size={12}/> Completado
                                         </span>
                                     )}
                                 </div>
                             );
                         })}
                     </div>
                </div>
            </section>

            <section>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="text-blue-600"/> Mis Documentos Firmados</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {myDocuments.length > 0 ? myDocuments.map(doc => (
                        <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="bg-gray-100 p-2 rounded-lg">
                                <Lock size={20} className="text-gray-500"/>
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm truncate">{doc.title}</p>
                                <p className="text-xs text-gray-500">{new Date(doc.date).toLocaleDateString()}</p>
                                <span className="text-[10px] bg-green-50 text-green-600 px-1 rounded mt-1 inline-block border border-green-100">Firmado Digitalmente</span>
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-2 p-8 text-center bg-white rounded-xl border border-dashed border-gray-300">
                            <UserCheck className="mx-auto text-gray-300 mb-2" size={32}/>
                            <p className="text-gray-400 text-sm">No tienes documentos firmados aún.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>

        {showPasswordModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-fade-in-up">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="font-bold text-lg text-gray-800">Cambiar Contraseña</h3>
                        <button onClick={() => setShowPasswordModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nueva Contraseña</label>
                            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2 border rounded" placeholder="Mínimo 4 caracteres" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Contraseña</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2 border rounded" placeholder="Repetir contraseña" />
                        </div>
                        <div className="pt-2 flex justify-end gap-2">
                            <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm">Cancelar</button>
                            <button onClick={handleChangePassword} disabled={isUpdatingPass} className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-bold flex items-center gap-2 hover:bg-blue-700">
                                {isUpdatingPass ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
