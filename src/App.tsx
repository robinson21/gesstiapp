import React, { useState, useEffect } from 'react';
import { 
  SSTView, WorkerData, AdminUser, AnnualTrainingPlan, 
  TrainingAssignment, DocumentSST, IPERRow, CompanyProfile,
  TrainingSession
} from './types';
import { LoginScreen } from './components/LoginScreen';
import { WorkerPortal } from './components/WorkerPortal';
import { WorkerForm } from './components/WorkerForm';
import { WorkerSelector } from './components/WorkerSelector';
import { EPPManager } from './components/EPPManager';
import { ProceduresManager } from './components/ProceduresManager';
import { SSTChatbot } from './components/SSTChatbot';
import * as integration from './services/integrationService';
import * as gemini from './services/geminiService';
import { 
  LayoutDashboard, Users, UserPlus, FileText, GraduationCap, 
  Shield, Settings, LogOut, Menu, X, Loader2, Sparkles, Plus, RefreshCw, 
  HardHat, AlertTriangle, FileCheck 
} from 'lucide-react';

const App: React.FC = () => {
  // --- STATE ---
  const [view, setView] = useState<SSTView>(SSTView.DASHBOARD);
  const [userRole, setUserRole] = useState<'ADMIN' | 'WORKER' | null>(null);
  const [currentUser, setCurrentUser] = useState<WorkerData | null>(null); // For Worker Portal
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);

  // Data
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<DocumentSST[]>([]);
  const [iperRows, setIperRows] = useState<IPERRow[]>([]);
  const [masterPlans, setMasterPlans] = useState<Record<string, AnnualTrainingPlan>>({});
  
  // Training View State
  const [currentWorker, setCurrentWorker] = useState<WorkerData | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<AnnualTrainingPlan | null>(null);
  const [trainingAssignments, setTrainingAssignments] = useState<TrainingAssignment[]>([]);
  const [manualTrainingTopic, setManualTrainingTopic] = useState('');

  // Other Component States
  const [editingWorker, setEditingWorker] = useState<WorkerData | null>(null);
  const [generatedIRL, setGeneratedIRL] = useState<string>('');

  const companyProfile: CompanyProfile = {
    companyName: 'Empresa Demo',
    companyRut: '76.123.456-7',
    companyLogoUrl: '',
    facilitatorName: 'Juan Experto',
    facilitatorRole: 'Ingeniero SST',
    facilitatorSignature: ''
  };

  // --- EFFECTS ---
  useEffect(() => {
    if (userRole === 'ADMIN') {
      loadData();
    }
  }, [userRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ws, ads, docs, iper, plans, assigns] = await Promise.all([
        integration.fetchWorkersFromBackend(),
        integration.fetchAdminsFromBackend(),
        integration.fetchDocumentsFromBackend(),
        integration.fetchIPERFromBackend(),
        integration.fetchTrainingPlansFromBackend(),
        integration.fetchAssignmentsFromBackend()
      ]);
      setWorkers(ws);
      setAdmins(ads);
      setDocuments(docs);
      setIperRows(iper);
      setTrainingAssignments(assigns);
      
      const plansMap: Record<string, AnnualTrainingPlan> = {};
      plans.forEach((p: any) => {
        // Simple mapping, normally we'd parse properly
        // Assuming backend returns flat rows, we might need grouping, but for now just mock or use as is
      });
      // setMasterPlans(plansMap); // Simplified
    } catch (e) {
      console.error("Error loading data", e);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---

  const handleLogin = (role: 'ADMIN' | 'WORKER', userData?: WorkerData) => {
    setUserRole(role);
    if (role === 'WORKER' && userData) {
      setCurrentUser(userData);
      // Load specific worker data
      loadWorkerData(userData);
    }
  };

  const loadWorkerData = async (worker: WorkerData) => {
      // Fetch data specifically for the worker portal
      const [docs, assigns] = await Promise.all([
          integration.fetchDocumentsFromBackend(),
          integration.fetchAssignmentsFromBackend()
      ]);
      setDocuments(docs);
      setTrainingAssignments(assigns);
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    setView(SSTView.DASHBOARD);
  };

  const handleWorkerSave = async (worker: WorkerData) => {
    setLoading(true);
    await integration.saveWorker(worker);
    await loadData();
    setView(SSTView.WORKERS);
    setLoading(false);
  };

  const handleWorkerDelete = async (id: string) => {
      // Optimistic update
      setWorkers(workers.filter(w => w.id !== id));
      setView(SSTView.WORKERS);
  };

  // --- TRAINING LOGIC ---

  const handleCreateTrainingPlan = async () => {
    if (!currentWorker) return;
    setLoading(true);
    try {
        const plan = await gemini.generateTrainingPlan(currentWorker.role, currentWorker.industry, currentWorker.risks);
        if (plan) {
            setTrainingPlan(plan);
            // Save plan to backend if needed
        }
    } catch (error) {
        alert("Error generando plan con IA");
    } finally {
        setLoading(false);
    }
  };

  const handleManualAssignment = async () => {
    if (!currentWorker || !manualTrainingTopic) return;
    setLoading(true);
    try {
        const assignment: TrainingAssignment = {
            id: Date.now().toString(),
            workerId: currentWorker.id,
            workerName: currentWorker.fullName,
            topic: manualTrainingTopic,
            source: 'MANUAL',
            status: 'Pendiente',
            assignedDate: new Date().toISOString()
        };
        
        // Optionally generate content immediately
        const content = await gemini.generateInteractiveTrainingContent(manualTrainingTopic, currentWorker.role);
        if (content) assignment.interactiveContent = content;

        await integration.syncAssignment(assignment);
        setTrainingAssignments(prev => [assignment, ...prev]);
        setManualTrainingTopic('');
    } catch (e) {
        alert("Error asignando capacitación");
    } finally {
        setLoading(false);
    }
  };

  const handleAssignFromPlan = async (session: TrainingSession) => {
    if (!currentWorker) return;
    setLoading(true);
    try {
        const assignment: TrainingAssignment = {
            id: Date.now().toString(),
            workerId: currentWorker.id,
            workerName: currentWorker.fullName,
            topic: session.topic,
            source: 'PLAN_ANUAL',
            status: 'Pendiente',
            assignedDate: new Date().toISOString()
        };
        
        const content = await gemini.generateInteractiveTrainingContent(session.topic, currentWorker.role);
        if (content) assignment.interactiveContent = content;

        await integration.syncAssignment(assignment);
        setTrainingAssignments(prev => [assignment, ...prev]);
    } catch (e) {
        alert("Error asignando desde plan");
    } finally {
        setLoading(false);
    }
  };

  // --- RENDER ---

  if (!userRole) {
    return <LoginScreen workers={workers} admins={admins} onLogin={handleLogin} onSaveWorker={integration.syncWorkerData} />;
  }

  if (userRole === 'WORKER' && currentUser) {
    return (
        <>
            <WorkerPortal 
                currentUser={currentUser}
                allDocuments={documents}
                masterPlans={masterPlans}
                assignments={trainingAssignments}
                onExit={handleLogout}
                showToast={(msg) => alert(msg)}
                onAssignmentUpdate={integration.updateAssignmentStatus}
                onUpdatePassword={integration.syncWorkerData}
            />
            <SSTChatbot />
        </>
    );
  }

  // ADMIN DASHBOARD
  return (
    <div className="flex min-h-screen bg-gray-100 font-sans text-gray-800">
       <SSTChatbot />
       
       {/* SIDEBAR */}
       <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col fixed h-full z-20 shadow-2xl`}>
          <div className="p-4 flex items-center justify-between border-b border-slate-700">
             {sidebarOpen && <h1 className="font-bold text-xl tracking-tight flex items-center gap-2"><Shield className="text-blue-500"/> GeSSTI</h1>}
             <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-400 hover:text-white"><Menu size={20}/></button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4 space-y-1">
             <SidebarItem icon={<LayoutDashboard/>} label="Dashboard" active={view === SSTView.DASHBOARD} onClick={() => setView(SSTView.DASHBOARD)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<Users/>} label="Trabajadores" active={view === SSTView.WORKERS || view === SSTView.EDIT_WORKER || view === SSTView.NEW_WORKER} onClick={() => setView(SSTView.WORKERS)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<FileText/>} label="Documentación (IRL)" active={view === SSTView.IRL_GENERATOR} onClick={() => setView(SSTView.IRL_GENERATOR)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<AlertTriangle/>} label="Matriz IPER" active={view === SSTView.IPER} onClick={() => setView(SSTView.IPER)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<GraduationCap/>} label="Capacitación" active={view === SSTView.TRAINING} onClick={() => setView(SSTView.TRAINING)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<FileCheck/>} label="Procedimientos (PTS)" active={view === SSTView.PROCEDURES} onClick={() => setView(SSTView.PROCEDURES)} isOpen={sidebarOpen}/>
             <SidebarItem icon={<HardHat/>} label="Gestión EPP" active={view === SSTView.EPP} onClick={() => setView(SSTView.EPP)} isOpen={sidebarOpen}/>
          </nav>

          <div className="p-4 border-t border-slate-700">
             <button onClick={handleLogout} className="flex items-center gap-3 text-red-400 hover:text-red-300 w-full p-2 rounded hover:bg-slate-800 transition-colors">
                <LogOut size={20}/>
                {sidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
             </button>
          </div>
       </aside>

       {/* MAIN CONTENT */}
       <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'} p-6 md:p-8`}>
          
          {/* DASHBOARD */}
          {view === SSTView.DASHBOARD && (
             <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-6">Dashboard General</h1>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                   <StatCard icon={<Users/>} label="Trabajadores" value={workers.length} color="bg-blue-500"/>
                   <StatCard icon={<FileText/>} label="Documentos" value={documents.length} color="bg-green-500"/>
                   <StatCard icon={<GraduationCap/>} label="Capacitaciones" value={trainingAssignments.length} color="bg-purple-500"/>
                   <StatCard icon={<AlertTriangle/>} label="Riesgos IPER" value={iperRows.length} color="bg-orange-500"/>
                </div>
                {/* Placeholder for charts/lists */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
                   <p>Seleccione una opción del menú lateral para comenzar a gestionar.</p>
                </div>
             </div>
          )}

          {/* WORKERS */}
          {view === SSTView.WORKERS && (
             <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold flex items-center gap-2"><Users className="text-blue-600"/> Gestión de Trabajadores</h2>
                   <button onClick={() => { setEditingWorker(null); setView(SSTView.NEW_WORKER); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700 shadow">
                      <UserPlus size={18}/> Nuevo Trabajador
                   </button>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                         <tr>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">RUT</th>
                            <th className="px-6 py-3">Cargo</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3 text-right">Acciones</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                         {workers.map(w => (
                            <tr key={w.id} className="hover:bg-gray-50">
                               <td className="px-6 py-3 font-medium">{w.fullName}</td>
                               <td className="px-6 py-3 text-gray-500">{w.rut}</td>
                               <td className="px-6 py-3">{w.role}</td>
                               <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${w.status === 'Inactivo' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{w.status || 'Activo'}</span></td>
                               <td className="px-6 py-3 text-right">
                                  <button onClick={() => { setEditingWorker(w); setView(SSTView.EDIT_WORKER); }} className="text-blue-600 hover:text-blue-800 font-bold text-xs">Editar</button>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}

          {/* WORKER FORM (NEW/EDIT) */}
          {(view === SSTView.NEW_WORKER || view === SSTView.EDIT_WORKER) && (
             <WorkerForm 
                initialData={editingWorker}
                onSubmit={handleWorkerSave}
                onCancel={() => setView(SSTView.WORKERS)}
                onDelete={handleWorkerDelete}
                onGenerateIRL={(w) => { /* Handle generate logic */ }}
             />
          )}

          {/* TRAINING VIEW */}
          {view === SSTView.TRAINING && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in h-[calc(100vh-100px)]">
                 <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                           <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><GraduationCap className="text-primary"/> Plan de Capacitación</h2>
                           
                           <WorkerSelector 
                              workers={workers || []} 
                              currentWorker={currentWorker} 
                              onSelect={(w) => setCurrentWorker(w)} 
                           />

                           <div className="space-y-4">
                               <button 
                                  onClick={handleCreateTrainingPlan} 
                                  disabled={loading || !currentWorker} 
                                  className="w-full bg-blue-600 text-white p-3 rounded-lg font-bold hover:bg-blue-700 shadow flex items-center justify-center gap-2"
                               >
                                   {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={16}/>} Generar Plan Anual IA
                               </button>
                               
                               <div className="border-t pt-4">
                                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asignación Manual</label>
                                   <div className="flex gap-2">
                                       <input 
                                          type="text" 
                                          value={manualTrainingTopic} 
                                          onChange={(e) => setManualTrainingTopic(e.target.value)} 
                                          className="w-full p-2 border rounded text-sm" 
                                          placeholder="Ej: Uso de Extintores"
                                       />
                                       <button onClick={handleManualAssignment} disabled={loading} className="bg-green-600 text-white p-2 rounded hover:bg-green-700">
                                           <Plus size={20}/>
                                       </button>
                                   </div>
                               </div>
                           </div>
                      </div>

                      {trainingPlan && (
                          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                              <h3 className="font-bold text-sm text-gray-700 mb-2">Plan Sugerido: {trainingPlan.role}</h3>
                              <div className="space-y-2">
                                  {(trainingPlan.sessions || []).map((session, idx) => (
                                      <div key={idx} className="p-3 bg-gray-50 border rounded hover:bg-blue-50 flex justify-between items-center group">
                                          <div>
                                              <p className="text-xs font-bold text-gray-800">{session.topic}</p>
                                              <p className="text-[10px] text-gray-500">{session.month} • {session.duration} hrs</p>
                                          </div>
                                          <button 
                                              onClick={() => handleAssignFromPlan(session)}
                                              className="text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                                          >
                                              Asignar
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                 </div>

                 <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                     <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                         <div className="flex items-center gap-2">
                             <h3 className="font-bold text-gray-700">Estado de Capacitaciones</h3>
                             <button onClick={loadData} className="text-gray-400 hover:text-blue-600 p-1" title="Actualizar Datos"><RefreshCw size={14}/></button>
                         </div>
                         <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">{trainingAssignments.length} Asignaciones</span>
                     </div>
                     <div className="flex-1 overflow-y-auto p-0">
                         <table className="w-full text-left text-sm text-gray-600">
                             <thead className="bg-white sticky top-0 z-10 text-xs uppercase font-semibold text-gray-500 shadow-sm">
                                 <tr>
                                     <th className="px-6 py-3">Trabajador</th>
                                     <th className="px-6 py-3">Curso / Tema</th>
                                     <th className="px-6 py-3">Fecha Asignación</th>
                                     <th className="px-6 py-3 text-center">Estado</th>
                                     <th className="px-6 py-3 text-center">Nota</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100">
                                 {(trainingAssignments || []).map((assign) => (
                                     <tr key={assign.id} className="hover:bg-gray-50">
                                         <td className="px-6 py-3 font-medium">{assign.workerName}</td>
                                         <td className="px-6 py-3">{assign.topic}</td>
                                         <td className="px-6 py-3 text-xs">{new Date(assign.assignedDate).toLocaleDateString()}</td>
                                         <td className="px-6 py-3 text-center">
                                             <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                                 assign.status === 'Aprobado' ? 'bg-green-100 text-green-700' : 
                                                 assign.status === 'Reprobado' ? 'bg-red-100 text-red-700' : 
                                                 'bg-yellow-100 text-yellow-700'
                                             }`}>
                                                 {assign.status}
                                             </span>
                                         </td>
                                         <td className="px-6 py-3 text-center font-bold">{assign.score ? `${assign.score}%` : '-'}</td>
                                     </tr>
                                 ))}
                                 {trainingAssignments.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay capacitaciones asignadas.</td></tr>}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>
          )}

          {/* PROCEDURES VIEW */}
          {view === SSTView.PROCEDURES && (
             <ProceduresManager 
                workers={workers}
                currentWorker={currentWorker}
                onWorkerSelect={setCurrentWorker}
                documents={documents}
                loading={loading}
                onGenerate={async (title) => {
                    if (!currentWorker) return;
                    setLoading(true);
                    try {
                        const content = await gemini.generateSpecificPTS(title, currentWorker.role, currentWorker.industry, companyProfile);
                        // Logic to save/download
                        console.log(content);
                        alert("PTS Generado. (Implementar guardado)");
                    } finally { setLoading(false); }
                }}
                onView={(doc) => window.open(doc.url, '_blank')}
                onReuse={() => {}}
             />
          )}

          {/* EPP VIEW */}
          {view === SSTView.EPP && (
             <EPPManager 
                workers={workers}
                currentWorker={currentWorker}
                onWorkerSelect={setCurrentWorker}
                companyProfile={companyProfile}
                onSaveSuccess={() => alert("Entrega registrada")}
                onViewDocument={(html) => {}}
             />
          )}

       </main>
    </div>
  );
};

// UI Helpers
const SidebarItem = ({ icon, label, active, onClick, isOpen }: any) => (
    <button onClick={onClick} className={`w-full flex items-center gap-4 p-3 transition-colors ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
        <div className="min-w-[20px]">{icon}</div>
        {isOpen && <span className="font-medium text-sm">{label}</span>}
    </button>
);

const StatCard = ({ icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center gap-4">
        <div className={`p-4 rounded-full text-white ${color} shadow-lg`}>{icon}</div>
        <div>
            <p className="text-gray-500 text-xs uppercase font-bold">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

export default App;
