import React, { useState, useEffect } from 'react';
import { 
  SSTView, WorkerData, AdminUser, AnnualTrainingPlan, 
  TrainingAssignment, DocumentSST, IPERRow, CompanyProfile,
  TrainingSession, InteractiveModule
} from './types';
import { LoginScreen } from './components/LoginScreen';
import { WorkerPortal } from './components/WorkerPortal';
import { WorkerForm } from './components/WorkerForm';
import { WorkerSelector } from './components/WorkerSelector';
import { EPPManager } from './components/EPPManager';
import { ProceduresManager } from './components/ProceduresManager';
import { IRLGenerator } from './components/IRLGenerator';
import { IPERGenerator } from './components/IPERGenerator';
import { TrainingPlayer } from './components/TrainingPlayer';
import { SSTChatbot } from './components/SSTChatbot';
import { FieldTrainingManager } from './components/FieldTrainingManager'; // New Import
import * as integration from './services/integrationService';
import * as gemini from './services/geminiService';
import { 
  LayoutDashboard, Users, UserPlus, FileText, GraduationCap, 
  Shield, Settings, LogOut, Menu, X, Loader2, Sparkles, Plus, RefreshCw, 
  HardHat, AlertTriangle, FileCheck, Eye, CheckCircle2, XCircle, PieChart as PieIcon, BarChart as BarIcon, Save, BookOpen, ListFilter, CheckSquare, Square, Building, PenTool
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const App: React.FC = () => {
  // --- STATE ---
  const [initializing, setInitializing] = useState(true); // New Loading State
  const [view, setView] = useState<SSTView>(SSTView.DASHBOARD);
  const [userRole, setUserRole] = useState<'ADMIN' | 'WORKER' | null>(null);
  const [currentUser, setCurrentUser] = useState<WorkerData | null>(null); // For Worker Portal
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dashboardTab, setDashboardTab] = useState<'GENERAL' | 'CAPACITACION' | 'IPER' | 'DOCS'>('GENERAL');

  // Data
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [documents, setDocuments] = useState<DocumentSST[]>([]);
  const [iperRows, setIperRows] = useState<IPERRow[]>([]);
  const [masterPlans, setMasterPlans] = useState<Record<string, AnnualTrainingPlan>>({});
  
  // Training View State
  const [trainingMode, setTrainingMode] = useState<'INDIVIDUAL' | 'MASIVA' | 'TERRENO'>('INDIVIDUAL'); // Updated State
  const [currentWorker, setCurrentWorker] = useState<WorkerData | null>(null);
  const [trainingPlan, setTrainingPlan] = useState<AnnualTrainingPlan | null>(null);
  const [trainingAssignments, setTrainingAssignments] = useState<TrainingAssignment[]>([]);
  const [manualTrainingTopic, setManualTrainingTopic] = useState('');
  
  // Mass Assignment State
  const [massCenter, setMassCenter] = useState('');
  const [massSelectedIds, setMassSelectedIds] = useState<string[]>([]);
  
  // Training Results & Material View
  const [viewingAssignment, setViewingAssignment] = useState<TrainingAssignment | null>(null);
  const [viewingQuizData, setViewingQuizData] = useState<any | null>(null);
  const [viewingMaterialModule, setViewingMaterialModule] = useState<InteractiveModule | null>(null);

  // Other Component States
  const [editingWorker, setEditingWorker] = useState<WorkerData | null>(null);

  const companyProfile: CompanyProfile = {
    companyName: 'Empresa Demo',
    companyRut: '76.123.456-7',
    companyLogoUrl: '',
    facilitatorName: 'Juan Experto',
    facilitatorRole: 'Ingeniero SST',
    facilitatorSignature: ''
  };

  // --- EFFECTS ---
  
  // 1. Initial Load (Users & Admins) for Login
  useEffect(() => {
    const loadUsers = async () => {
        try {
            const [ws, ads] = await Promise.all([
                integration.fetchWorkersFromBackend(),
                integration.fetchAdminsFromBackend()
            ]);
            setWorkers(ws);
            setAdmins(ads);
        } catch (e) {
            console.error("Initial load error", e);
        } finally {
            setInitializing(false);
        }
    };
    loadUsers();
  }, []);

  // 2. Full Data Load (Admin Only)
  useEffect(() => {
    if (userRole === 'ADMIN') {
      loadData();
    }
  }, [userRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Re-fetch workers/admins to be sure, plus operational data
      const [ws, ads, docs, iper, flatPlans, assigns] = await Promise.all([
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
      
      // Reconstruct Master Plans from Flat Rows
      const plansMap: Record<string, AnnualTrainingPlan> = {};
      
      // flatPlans comes as array of objects: {id, role, topic, objective, duration, month, status, instructor}
      if (Array.isArray(flatPlans)) {
          flatPlans.forEach((session: any) => {
              const roleKey = session.role;
              if (!roleKey) return;

              if (!plansMap[roleKey]) {
                  plansMap[roleKey] = {
                      year: new Date().getFullYear(),
                      role: roleKey,
                      diagnosis: 'Plan recuperado del sistema',
                      totalHours: 0,
                      budgetEstimate: 'N/A',
                      sessions: []
                  };
              }

              plansMap[roleKey].sessions.push({
                  id: session.id,
                  topic: session.topic,
                  objective: session.objective,
                  duration: Number(session.duration),
                  modality: 'Presencial', // Default fallback
                  month: session.month,
                  status: session.status,
                  instructor: session.instructor
              });
              
              plansMap[roleKey].totalHours += Number(session.duration || 0);
          });
      }
      setMasterPlans(plansMap); 
      
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
    setWorkers([]); 
    setTrainingAssignments([]);
    setView(SSTView.DASHBOARD);
    // Force reload on next login if needed
  };

  const handleWorkerSave = async (worker: WorkerData) => {
    setLoading(true);
    await integration.saveWorker(worker);
    await loadData();
    setView(SSTView.WORKERS);
    setLoading(false);
  };

  const handleWorkerDelete = async (id: string) => {
      setWorkers(workers.filter(w => w.id !== id));
      setView(SSTView.WORKERS);
  };

  // --- TRAINING LOGIC ---

  const handleCreateTrainingPlan = async () => {
    if (!currentWorker) return;
    
    // Check if we already have a master plan for this role in BACKEND
    if (masterPlans[currentWorker.role]) {
        if(confirm(`Ya existe un Plan Maestro para el cargo "${currentWorker.role}". ¿Desea cargarlo? (Cancelar para generar uno nuevo con IA)`)) {
            setTrainingPlan(masterPlans[currentWorker.role]);
            return;
        }
    }

    setLoading(true);
    try {
        const plan = await gemini.generateTrainingPlan(currentWorker.role, currentWorker.industry, currentWorker.risks);
        if (plan) {
            setTrainingPlan(plan);
        }
    } catch (error) {
        alert("Error generando plan con IA");
    } finally {
        setLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!currentWorker || !trainingPlan) return;
    setLoading(true);
    try {
        // 1. Save Master Plan to record
        await integration.syncTrainingPlan(trainingPlan);

        // 2. Prepare all assignments first (Generate content in parallel where possible or eagerly)
        const assignmentsToSave: TrainingAssignment[] = [];
        const contentPromises = trainingPlan.sessions.map(async (session) => {
             const content = await gemini.generateInteractiveTrainingContent(session.topic, currentWorker.role);
             return {
                 session,
                 content
             };
        });

        const results = await Promise.all(contentPromises);

        results.forEach(({session, content}) => {
             assignmentsToSave.push({
                id: Date.now().toString() + Math.random().toString().slice(2,5),
                workerId: currentWorker.id,
                workerName: currentWorker.fullName,
                topic: session.topic,
                source: 'PLAN_ANUAL',
                status: 'Pendiente',
                assignedDate: new Date().toISOString(),
                interactiveContent: content || undefined,
                hasContent: !!content
            });
        });
        
        // 3. BULK SAVE to prevent Race Conditions on Backend
        await integration.syncAssignmentsBulk(assignmentsToSave);
        
        // 4. Update local state immediately for UI responsiveness
        setTrainingAssignments(prev => [...assignmentsToSave, ...prev]);

        alert(`Plan aprobado con éxito. Se asignaron ${assignmentsToSave.length} capacitaciones a ${currentWorker.fullName}.`);
        setTrainingPlan(null);
        
        // REMOVED: setTimeout loadData. Rely on local state to avoid "disappearing" items.

    } catch (e) {
        console.error(e);
        alert("Error al aprobar y asignar el plan. Por favor intente nuevamente.");
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
        
        // Generate content specifically
        const content = await gemini.generateInteractiveTrainingContent(manualTrainingTopic, currentWorker.role);
        if (content) {
            assignment.interactiveContent = content;
            assignment.hasContent = true;
        }

        await integration.syncAssignment(assignment);
        
        // Optimistic Update - ADD to TOP
        setTrainingAssignments(prev => [assignment, ...prev]);
        setManualTrainingTopic('');
        
        // REMOVED: setTimeout loadData. Rely on local state.
        
        alert(`Curso "${manualTrainingTopic}" asignado y generado correctamente.`);
    } catch (e) {
        alert("Error asignando capacitación");
    } finally {
        setLoading(false);
    }
  };

  const handleMassAssignment = async () => {
      if (massSelectedIds.length === 0 || !manualTrainingTopic) {
          alert("Seleccione trabajadores y escriba un tema.");
          return;
      }
      setLoading(true);
      try {
          // 1. Generate content ONCE
          // We use a generic role context or the role of the first selected worker
          const firstWorker = workers.find(w => w.id === massSelectedIds[0]);
          const content = await gemini.generateInteractiveTrainingContent(manualTrainingTopic, firstWorker?.role || "General");
          
          if (!content) throw new Error("No content generated");

          // 2. Create assignments array
          const newAssignments: TrainingAssignment[] = massSelectedIds.map(wId => {
              const worker = workers.find(w => w.id === wId);
              return {
                  id: Date.now().toString() + Math.random().toString().slice(2,6),
                  workerId: wId,
                  workerName: worker?.fullName || "Desconocido",
                  topic: manualTrainingTopic,
                  source: 'MANUAL',
                  status: 'Pendiente',
                  assignedDate: new Date().toISOString(),
                  interactiveContent: content,
                  hasContent: true
              };
          });

          // 3. Bulk Save
          await integration.syncAssignmentsBulk(newAssignments);
          
          // 4. Update State
          setTrainingAssignments(prev => [...newAssignments, ...prev]);
          setManualTrainingTopic('');
          setMassSelectedIds([]);
          
          alert(`Capacitación asignada exitosamente a ${newAssignments.length} trabajadores.`);

      } catch (e) {
          console.error(e);
          alert("Error en asignación masiva.");
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
        if (content) {
            assignment.interactiveContent = content;
            assignment.hasContent = true;
        }

        await integration.syncAssignment(assignment);
        
        // Optimistic Update
        setTrainingAssignments(prev => [assignment, ...prev]);
        
        // REMOVED: setTimeout loadData. Rely on local state.
        
        alert(`Curso "${session.topic}" asignado y generado.`);
    } catch (e) {
        alert("Error asignando desde plan");
    } finally {
        setLoading(false);
    }
  };

  const handleViewResults = async (assignment: TrainingAssignment) => {
      setLoading(true);
      try {
          // If we don't have the content loaded (lazy loaded), fetch it now
          if (assignment.hasContent || !assignment.interactiveContent) {
              const content = await integration.fetchAssignmentContent(assignment.id);
              if (content) {
                  setViewingQuizData(content);
              } else {
                  alert("No se pudo cargar el contenido del examen.");
                  return;
              }
          } else {
              setViewingQuizData(assignment.interactiveContent!);
          }
          setViewingAssignment(assignment);
      } catch(e) {
          alert("Error cargando resultados.");
      } finally {
          setLoading(false);
      }
  };

  const handleViewMaterial = async (assignment: TrainingAssignment) => {
      setLoading(true);
      try {
          // Check if we already have the content locally (e.g. just created)
          if (assignment.interactiveContent) {
              setViewingMaterialModule(assignment.interactiveContent);
              setLoading(false);
              return;
          }

          // Otherwise fetch from backend
          const content = await integration.fetchAssignmentContent(assignment.id);
          if (content) {
              setViewingMaterialModule(content);
          } else {
              alert("No se pudo cargar el material del curso. Es posible que aún se esté procesando o haya ocurrido un error al guardar.");
          }
      } catch(e) {
          alert("Error al cargar material. Verifique su conexión.");
      } finally {
          setLoading(false);
      }
  };

  // --- HELPERS ---
  const getUniqueCenters = () => {
      return Array.from(new Set(workers.map(w => w.workCenter).filter(Boolean)));
  };

  const getWorkersByCenter = () => {
      if(!massCenter) return [];
      return workers.filter(w => w.workCenter === massCenter && w.status === 'Activo');
  };

  // --- DASHBOARD CHARTS HELPERS ---
  const getTrainingStats = () => {
    const approved = trainingAssignments.filter(a => a.status === 'Aprobado').length;
    const rejected = trainingAssignments.filter(a => a.status === 'Reprobado').length;
    const pending = trainingAssignments.filter(a => a.status === 'Pendiente').length;
    return [
        { name: 'Aprobado', value: approved, color: '#22c55e' },
        { name: 'Reprobado', value: rejected, color: '#ef4444' },
        { name: 'Pendiente', value: pending, color: '#eab308' }
    ];
  };

  // --- TRAININGS FILTERED ---
  // Fix: Ensure robust comparison (String vs Number conversion)
  const filteredAssignments = currentWorker 
      ? trainingAssignments.filter(a => String(a.workerId) === String(currentWorker.id))
      : trainingAssignments;

  // Determine which plan to show in Left Column: Local State vs Master Plan from Backend
  const displayPlan = trainingPlan || (currentWorker && masterPlans[currentWorker.role]);

  // --- RENDER ---
  
  if (initializing) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 font-sans text-gray-500">
              <Loader2 className="w-12 h-12 animate-spin text-blue-600 mb-4"/>
              <p className="font-medium animate-pulse">Conectando con base de datos segura...</p>
          </div>
      );
  }

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
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold">Dashboard de Gestión</h1>
                    <select 
                        value={dashboardTab}
                        onChange={(e) => setDashboardTab(e.target.value as any)}
                        className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg shadow-sm font-medium focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="GENERAL">Visión General</option>
                        <option value="CAPACITACION">Detalle Capacitaciones</option>
                        <option value="IPER">Detalle Riesgos (IPER)</option>
                        <option value="DOCS">Documentación</option>
                    </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                   <StatCard icon={<Users/>} label="Trabajadores" value={workers.length} color="bg-blue-500"/>
                   <StatCard icon={<FileText/>} label="Documentos" value={documents.length} color="bg-green-500"/>
                   <StatCard icon={<GraduationCap/>} label="Capacitaciones" value={trainingAssignments.length} color="bg-purple-500"/>
                   <StatCard icon={<AlertTriangle/>} label="Riesgos IPER" value={iperRows.length} color="bg-orange-500"/>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Charts Logic */}
                    {dashboardTab === 'GENERAL' && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><PieIcon size={18}/> Estado Global Capacitaciones</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={getTrainingStats()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                                            {getTrainingStats().map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <Tooltip /><Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
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

          {/* WORKER FORM */}
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
                 
                 {/* LEFT PANEL SWITCHER */}
                 <div className="lg:col-span-1 space-y-6 overflow-y-auto pr-2">
                      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 mb-2 flex">
                          <button 
                            onClick={() => setTrainingMode('INDIVIDUAL')} 
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${trainingMode === 'INDIVIDUAL' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                              Individual
                          </button>
                          <button 
                            onClick={() => setTrainingMode('MASIVA')} 
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${trainingMode === 'MASIVA' ? 'bg-purple-100 text-purple-700' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                              Masiva (Grupal)
                          </button>
                          <button 
                            onClick={() => setTrainingMode('TERRENO')} 
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${trainingMode === 'TERRENO' ? 'bg-orange-100 text-orange-700' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                              <PenTool size={12}/> En Terreno
                          </button>
                      </div>

                      {/* INDIVIDUAL MODE CONTENT */}
                      {trainingMode === 'INDIVIDUAL' && (
                          <>
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

                            {displayPlan && (
                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-fade-in-up">
                                    <h3 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500"/>
                                        {trainingPlan ? 'Plan Sugerido (IA)' : `Plan Maestro Vigente: ${displayPlan.role}`}
                                    </h3>
                                    <div className="space-y-2">
                                        {(displayPlan.sessions || []).map((session, idx) => (
                                            <div key={idx} className="p-3 bg-gray-50 border rounded hover:bg-blue-50 flex justify-between items-center group transition-colors">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-800">{session.topic}</p>
                                                    <p className="text-[10px] text-gray-500">{session.month} • {session.duration} hrs</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleAssignFromPlan(session)}
                                                    className="text-blue-600 text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-blue-200 px-2 py-1 rounded"
                                                >
                                                    Asignar
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {trainingPlan && (
                                        <button 
                                            onClick={handleApprovePlan}
                                            disabled={loading}
                                            className="w-full mt-4 bg-green-600 text-white p-2 rounded-lg font-bold hover:bg-green-700 shadow flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Aprobar y Asignar Todo
                                        </button>
                                    )}
                                </div>
                            )}
                          </>
                      )}

                      {/* MASSIVE MODE CONTENT */}
                      {trainingMode === 'MASIVA' && (
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 animate-fade-in">
                              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><Users className="text-purple-600"/> Asignación Grupal</h2>
                              
                              {/* 1. Select Center */}
                              <div className="mb-4">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1"><Building size={12}/> Centro de Trabajo</label>
                                  <select 
                                    className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                                    value={massCenter}
                                    onChange={(e) => {
                                        setMassCenter(e.target.value);
                                        setMassSelectedIds([]); // Reset selection on change
                                    }}
                                  >
                                      <option value="">-- Seleccionar Centro --</option>
                                      {getUniqueCenters().map(center => (
                                          <option key={center} value={center}>{center}</option>
                                      ))}
                                  </select>
                              </div>

                              {/* 2. Select Workers */}
                              {massCenter && (
                                  <div className="mb-4">
                                      <div className="flex justify-between items-center mb-2">
                                          <label className="block text-xs font-bold text-gray-500 uppercase">Trabajadores</label>
                                          <button 
                                            onClick={() => {
                                                const allIds = getWorkersByCenter().map(w => w.id);
                                                if (massSelectedIds.length === allIds.length) setMassSelectedIds([]);
                                                else setMassSelectedIds(allIds);
                                            }}
                                            className="text-[10px] text-blue-600 hover:underline"
                                          >
                                              {massSelectedIds.length === getWorkersByCenter().length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                          </button>
                                      </div>
                                      <div className="max-h-[200px] overflow-y-auto border border-gray-200 rounded bg-gray-50 p-2 custom-scrollbar">
                                          {getWorkersByCenter().map(w => (
                                              <label key={w.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer border-b border-gray-100 last:border-0">
                                                  <input 
                                                    type="checkbox" 
                                                    className="rounded text-purple-600 focus:ring-purple-500"
                                                    checked={massSelectedIds.includes(w.id)}
                                                    onChange={(e) => {
                                                        if(e.target.checked) setMassSelectedIds([...massSelectedIds, w.id]);
                                                        else setMassSelectedIds(massSelectedIds.filter(id => id !== w.id));
                                                    }}
                                                  />
                                                  <div className="text-xs">
                                                      <p className="font-bold text-gray-700">{w.fullName}</p>
                                                      <p className="text-gray-500">{w.role}</p>
                                                  </div>
                                              </label>
                                          ))}
                                          {getWorkersByCenter().length === 0 && <p className="text-xs text-gray-400 p-2">No hay trabajadores activos.</p>}
                                      </div>
                                      <p className="text-xs text-right mt-1 text-purple-600 font-bold">{massSelectedIds.length} seleccionados</p>
                                  </div>
                              )}

                              {/* 3. Topic & Action */}
                              <div className="border-t pt-4">
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tema de Capacitación</label>
                                  <input 
                                      type="text" 
                                      value={manualTrainingTopic} 
                                      onChange={(e) => setManualTrainingTopic(e.target.value)} 
                                      className="w-full p-2 border rounded text-sm mb-3" 
                                      placeholder="Ej: Charla Integral de Seguridad"
                                  />
                                  <button 
                                    onClick={handleMassAssignment} 
                                    disabled={loading || massSelectedIds.length === 0 || !manualTrainingTopic}
                                    className="w-full bg-purple-600 text-white p-3 rounded-lg font-bold hover:bg-purple-700 shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                      {loading ? <Loader2 className="animate-spin"/> : <Sparkles size={16}/>} Asignar a Grupo ({massSelectedIds.length})
                                  </button>
                              </div>
                          </div>
                      )}
                 </div>

                 {/* RIGHT PANEL */}
                 <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
                     {trainingMode === 'TERRENO' ? (
                         <FieldTrainingManager 
                            workers={workers}
                            companyProfile={companyProfile}
                            onClose={() => setTrainingMode('INDIVIDUAL')}
                            onSuccess={loadData}
                         />
                     ) : (
                         <>
                             <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                                 <div className="flex items-center gap-2">
                                     <h3 className="font-bold text-gray-700">Estado de Capacitaciones</h3>
                                     <button onClick={loadData} className="text-gray-400 hover:text-blue-600 p-1 transition-colors" title="Actualizar Datos"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/></button>
                                 </div>
                                 <div className="flex items-center gap-3">
                                     {currentWorker ? (
                                         <button 
                                            onClick={() => setCurrentWorker(null)}
                                            className="flex items-center gap-1 text-xs text-blue-600 font-bold px-2 py-1 bg-blue-50 rounded border border-blue-100 hover:bg-blue-100 transition-colors"
                                            title="Quitar filtro"
                                         >
                                             <ListFilter size={12}/> {currentWorker.fullName} <XCircle size={12}/>
                                         </button>
                                     ) : (
                                         <span className="text-xs text-gray-400">Mostrando todos</span>
                                     )}
                                     <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full font-bold">{filteredAssignments.length} Registros</span>
                                 </div>
                             </div>
                             <div className="flex-1 overflow-y-auto p-0">
                                 <table className="w-full text-left text-sm text-gray-600">
                                     <thead className="bg-white sticky top-0 z-10 text-xs uppercase font-semibold text-gray-500 shadow-sm">
                                         <tr>
                                             <th className="px-6 py-3">Trabajador</th>
                                             <th className="px-6 py-3">Curso / Tema</th>
                                             <th className="px-6 py-3">Origen</th>
                                             <th className="px-6 py-3 text-center">Estado</th>
                                             <th className="px-6 py-3 text-center">Nota</th>
                                             <th className="px-6 py-3 text-right">Acciones</th>
                                         </tr>
                                     </thead>
                                     <tbody className="divide-y divide-gray-100">
                                         {(filteredAssignments || []).map((assign) => (
                                             <tr key={assign.id} className="hover:bg-gray-50 transition-colors">
                                                 <td className="px-6 py-3 font-medium text-gray-800">{assign.workerName}</td>
                                                 <td className="px-6 py-3">{assign.topic}</td>
                                                 <td className="px-6 py-3 text-xs text-gray-400">{assign.source === 'PLAN_ANUAL' ? 'Plan' : 'Manual'}</td>
                                                 <td className="px-6 py-3 text-center">
                                                     <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${
                                                         assign.status === 'Aprobado' ? 'bg-green-100 text-green-700 border-green-200' : 
                                                         assign.status === 'Reprobado' ? 'bg-red-100 text-red-700 border-red-200' : 
                                                         'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                     }`}>
                                                         {assign.status}
                                                     </span>
                                                 </td>
                                                 <td className="px-6 py-3 text-center font-bold">{assign.score ? `${assign.score}%` : '-'}</td>
                                                 <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleViewMaterial(assign)}
                                                            className="bg-purple-50 text-purple-600 p-1.5 rounded hover:bg-purple-100 border border-purple-200"
                                                            title="Ver Material del Curso (Vista Previa)"
                                                        >
                                                            <BookOpen size={16}/>
                                                        </button>
                                                        {assign.status !== 'Pendiente' && (
                                                            <button 
                                                                onClick={() => handleViewResults(assign)}
                                                                className="bg-blue-50 text-blue-600 p-1.5 rounded hover:bg-blue-100 border border-blue-200"
                                                                title="Ver Resultados del Quiz"
                                                            >
                                                                <Eye size={16}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                 </td>
                                             </tr>
                                         ))}
                                         {filteredAssignments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-gray-400">No hay capacitaciones para este filtro.</td></tr>}
                                     </tbody>
                                 </table>
                             </div>
                         </>
                     )}
                 </div>
             </div>
          )}
          
          {/* RESULTS MODAL */}
          {viewingAssignment && viewingQuizData && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
                      <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                          <div>
                            <h3 className="font-bold text-lg text-gray-800">Resultados de Evaluación</h3>
                            <p className="text-xs text-gray-500">{viewingAssignment.workerName} - {viewingAssignment.topic}</p>
                          </div>
                          <button onClick={() => { setViewingAssignment(null); setViewingQuizData(null); }} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                      </div>
                      
                      <div className="p-6 overflow-y-auto space-y-6">
                          <div className="flex items-center gap-4 mb-6">
                              <div className={`p-4 rounded-lg text-center min-w-[100px] ${viewingAssignment.score! >= 75 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  <span className="block text-2xl font-bold">{viewingAssignment.score}%</span>
                                  <span className="text-xs uppercase font-bold">{viewingAssignment.status}</span>
                              </div>
                              <p className="text-sm text-gray-600 italic">
                                  {viewingAssignment.score! >= 75 ? "El trabajador aprobó satisfactoriamente la evaluación." : "El trabajador no alcanzó el puntaje mínimo de aprobación (75%)."}
                              </p>
                          </div>

                          <h4 className="font-bold text-gray-700 text-sm border-b pb-2 mb-4">Detalle de Respuestas</h4>
                          
                          {(viewingQuizData.quiz || []).map((q: any, idx: number) => {
                              const userAnsIdx = viewingAssignment.answers ? viewingAssignment.answers[idx] : -1;
                              const isCorrect = userAnsIdx === q.correctIndex;
                              
                              return (
                                  <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                      <p className="font-bold text-gray-800 text-sm mb-3">{idx + 1}. {q.question}</p>
                                      
                                      <div className="space-y-2 text-xs">
                                          {/* User Answer */}
                                          <div className={`p-2 rounded flex items-center gap-2 ${isCorrect ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                              {isCorrect ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                              <strong>Su respuesta:</strong> {userAnsIdx !== -1 ? q.options[userAnsIdx] : 'Sin responder'}
                                          </div>
                                          
                                          {/* Correct Answer (if wrong) */}
                                          {!isCorrect && (
                                              <div className="p-2 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-2">
                                                  <CheckCircle2 size={14}/>
                                                  <strong>Respuesta Correcta:</strong> {q.options[q.correctIndex]}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                      
                      <div className="p-4 border-t bg-gray-50 text-right">
                          <button onClick={() => { setViewingAssignment(null); setViewingQuizData(null); }} className="px-4 py-2 bg-gray-800 text-white rounded text-sm font-bold hover:bg-gray-900">Cerrar</button>
                      </div>
                  </div>
              </div>
          )}

          {/* MATERIAL PREVIEW MODAL (ADMIN) */}
          {viewingMaterialModule && (
              <TrainingPlayer 
                  module={viewingMaterialModule}
                  worker={{fullName: 'Administrador (Vista Previa)', role: 'Admin', id: '000'} as WorkerData}
                  company={companyProfile}
                  onComplete={() => {}} 
                  onCancel={() => setViewingMaterialModule(null)}
                  mode="PREVIEW"
              />
          )}

          {/* IRL GENERATOR VIEW (RESTORED) */}
          {view === SSTView.IRL_GENERATOR && (
              <IRLGenerator 
                  workers={workers}
                  companyProfile={companyProfile}
                  onSuccess={() => {
                      loadData(); // Refresh docs list
                  }}
              />
          )}

          {/* IPER VIEW (RESTORED WITH HISTORY) */}
          {view === SSTView.IPER && (
              <IPERGenerator 
                  workers={workers} 
                  currentWorker={currentWorker}
                  onWorkerSelect={setCurrentWorker}
                  iperHistory={iperRows}
                  onSaveSuccess={loadData}
              />
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
                        // 1. Generar contenido HTML con IA
                        const content = await gemini.generateSpecificPTS(title, currentWorker.role, currentWorker.industry, companyProfile);
                        
                        if (!content || content === "Error") {
                            throw new Error("Falló la generación de contenido");
                        }

                        // 2. Guardar como Documento (PDF generado en backend)
                        await integration.syncDocumentWithGoogle({
                             id: Date.now().toString(),
                             title: `PTS_${title.replace(/\s+/g,'_').toUpperCase()}`,
                             type: 'PTS',
                             category: 'Procedimientos',
                             date: new Date().toISOString(),
                             workerName: currentWorker.fullName,
                             workerId: currentWorker.id,
                             workCenter: currentWorker.workCenter,
                             content: content,
                             role: currentWorker.role // Metadata for reuse
                        });
                        
                        alert(`Procedimiento "${title}" generado y guardado exitosamente en la biblioteca.`);
                        loadData(); // Refrescar lista de documentos
                    } catch(e) {
                        console.error(e);
                        alert("Error al generar el procedimiento. Por favor intente nuevamente.");
                    } finally { 
                        setLoading(false); 
                    }
                }}
                onView={(doc) => window.open(doc.url, '_blank')}
                onReuse={async (doc) => {
                     if (!currentWorker) return;
                     if (confirm(`¿Desea asignar el procedimiento "${doc.title}" a ${currentWorker.fullName}? Se generará una copia nueva para firmar.`)) {
                         setLoading(true);
                         try {
                             // Reutilizar contenido pero crear nueva entrada vinculada al trabajador actual
                             await integration.syncDocumentWithGoogle({
                                 id: Date.now().toString(),
                                 title: doc.title, // Mismo título
                                 type: 'PTS',
                                 category: 'Procedimientos',
                                 date: new Date().toISOString(),
                                 workerName: currentWorker.fullName,
                                 workerId: currentWorker.id,
                                 workCenter: currentWorker.workCenter,
                                 content: doc.content || "Contenido recuperado de biblioteca", // Idealmente el backend debería manejar duplicación de PDF si no hay content string, pero aquí asumimos regeneración o link
                                 role: currentWorker.role
                             });
                             alert("Procedimiento asignado correctamente.");
                             loadData();
                         } catch(e) {
                             alert("Error al reutilizar documento.");
                         } finally {
                             setLoading(false);
                         }
                     }
                }}
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
                onViewDocument={() => {}} 
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