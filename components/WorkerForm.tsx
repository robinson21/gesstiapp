
import React, { useState, useEffect } from 'react';
import { WorkerData, RISKS_LIST } from '../types';
import { Save, User, Cloud, Sparkles, Loader2, Factory, Trash2, AlertTriangle, Calendar, Mail, Phone, MapPin, Briefcase, Building, CheckCircle2, XCircle, FileText, Lock, Eye, EyeOff } from 'lucide-react';
import { syncWorkerData, deleteWorkerFromBackend } from '../services/integrationService';
import { suggestWorkerProfile } from '../services/geminiService';

interface Props {
  onSubmit: (data: WorkerData) => void;
  onGenerateIRL: (data: WorkerData) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  initialData?: WorkerData | null;
}

export const WorkerForm: React.FC<Props> = ({ onSubmit, onGenerateIRL, onDelete, onCancel, initialData }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState<WorkerData>({
    id: Date.now().toString(),
    status: 'Activo',
    fullName: '',
    rut: '',
    email: '',
    phone: '',
    entryDate: new Date().toISOString().split('T')[0],
    password: '',
    role: '', 
    customRole: '',
    department: '', 
    workCenter: 'Casa Matriz',
    location: '',
    workEnvironment: '', 
    modality: 'Presencial',
    shifts: [],
    customShift: '',
    industry: '',
    activities: '',
    risks: [],
    specialCondition: 'No aplica'
  });

  useEffect(() => {
      if (initialData) {
          // FIX: Ensure arrays are initialized if missing in source data
          setFormData({
              ...initialData,
              risks: initialData.risks || [],
              shifts: initialData.shifts || []
          });
      }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'shift' | 'risk') => {
    const { value, checked } = e.target;
    if (type === 'shift') {
      setFormData(prev => ({
        ...prev,
        shifts: checked ? [...prev.shifts, value] : prev.shifts.filter(s => s !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        risks: checked ? [...prev.risks, value] : prev.risks.filter(r => r !== value)
      }));
    }
  };

  const handleSuggestProfile = async () => {
    setAiFeedback(null);
    if (!formData.role || !formData.industry) {
        setAiFeedback({ type: 'error', message: 'Por favor ingrese CARGO y RUBRO primero.' });
        return;
    }
    
    setIsSuggesting(true);
    try {
      const suggestion = await suggestWorkerProfile(formData.role, formData.industry);
      
      // Filter risks that match our hardcoded list to visualize checkboxes
      const mappedRisks = suggestion.risks.map(r => {
         const match = RISKS_LIST.find(listRisk => 
             r.toLowerCase().includes(listRisk.toLowerCase()) || 
             listRisk.toLowerCase().includes(r.toLowerCase())
         );
         return match || r; 
      }).filter(r => r) as string[];

      const uniqueNewRisks = Array.from(new Set([...formData.risks, ...mappedRisks]));

      setFormData(prev => ({
        ...prev,
        activities: suggestion.activities,
        risks: uniqueNewRisks
      }));

      setAiFeedback({ 
          type: 'success', 
          message: `Análisis IA completado.` 
      });

    } catch (e) { 
        console.error(e); 
        setAiFeedback({ type: 'error', message: 'Error de conexión con IA.' });
    } finally { 
        setIsSuggesting(false); 
    }
  };

  const handleSave = async () => {
    if (!formData.fullName || !formData.rut) {
        alert("Nombre y RUT son obligatorios");
        return;
    }
    setIsSyncing(true);
    try {
      await syncWorkerData(formData);
      onSubmit(formData);
    } catch(e) {
      alert("Error al sincronizar, guardando localmente.");
      onSubmit(formData);
    } finally { setIsSyncing(false); }
  };

  const handleDeleteConfirm = async () => {
    if (!formData.id || !onDelete) return;
    setIsSyncing(true);
    try {
        await deleteWorkerFromBackend(formData.id);
        onDelete(formData.id);
    } catch (e) {
        alert("Error al eliminar. Verifique conexión.");
        setIsSyncing(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-fade-in">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <User className="text-primary" /> {initialData ? 'Editar Trabajador' : 'Nuevo Trabajador'}
        </h2>
        <div className="flex items-center gap-2">
            {initialData && (
                <select 
                    name="status" 
                    value={formData.status || 'Activo'} 
                    onChange={handleChange}
                    className={`text-xs font-bold px-2 py-1 rounded border ${
                        formData.status === 'Activo' 
                        ? 'bg-green-100 text-green-800 border-green-200' 
                        : 'bg-gray-200 text-gray-600 border-gray-300'
                    }`}
                >
                    <option value="Activo">VIGENTE (Activo)</option>
                    <option value="Inactivo">NO VIGENTE (Baja)</option>
                </select>
            )}
            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">ID: {formData.id.slice(-4)}</span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Section 1: Personal */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</div>
            Identificación y Contacto
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Nombre Completo</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="Ej: Juan Pérez" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">RUT</label>
              <input type="text" name="rut" value={formData.rut} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="12.345.678-9" />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Calendar size={12}/> Fecha Ingreso</label>
              <input type="date" name="entryDate" value={formData.entryDate} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Mail size={12}/> Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="correo@empresa.cl" />
            </div>
             <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Phone size={12}/> Teléfono</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="+569..." />
            </div>
            
            {/* Password Field for Admin Management */}
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Lock size={12}/> Contraseña (Acceso Portal)</label>
                <div className="relative">
                    <input 
                        type={showPassword ? "text" : "password"}
                        name="password" 
                        value={formData.password || ''} 
                        onChange={handleChange} 
                        className="w-full p-2 pr-8 border border-gray-300 rounded bg-white" 
                        placeholder={!formData.password ? "Default: RUT" : ""} 
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                    >
                        {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Deje en blanco para usar RUT por defecto.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Job Info */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs">2</div>
            Datos del Cargo
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Briefcase size={12}/> Cargo</label>
              <input type="text" name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="Ej: Soldador" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Building size={12}/> Departamento / Área</label>
              <input type="text" name="department" value={formData.department} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="Ej: Mantenimiento" />
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Modalidad</label>
               <select name="modality" value={formData.modality} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white">
                   <option value="Presencial">Presencial</option>
                   <option value="Remota">Remota</option>
                   <option value="Híbrida">Híbrida</option>
               </select>
            </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><Factory size={12}/> Centro de Trabajo</label>
                <input type="text" name="workCenter" value={formData.workCenter} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1"><MapPin size={12}/> Ubicación / Ciudad</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="Ej: Antofagasta" />
             </div>
          </div>
        </section>

        {/* Section 3: Operational Context */}
        <section>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs">3</div>
            Contexto Operacional (SST)
          </h3>
          
          <div className="mb-4">
             <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Rubro / Industria</label>
             <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded bg-white" placeholder="Ej: Minería, Construcción, Alimentos..." />
          </div>

          {/* Work Environment */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    Descripción del Entorno de Trabajo
                </label>
                <textarea 
                    name="workEnvironment" 
                    value={formData.workEnvironment} 
                    onChange={handleChange}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary bg-gray-50 text-sm"
                    placeholder="Describa el lugar: Ej. Galpón cerrado, piso irregular, ruido..."
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase flex items-center gap-1">
                    Actividades / Tareas Principales
                </label>
                <textarea 
                    name="activities" 
                    value={formData.activities} 
                    onChange={handleChange}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary bg-gray-50 text-sm"
                    placeholder="La IA completará esto automáticamente..."
                />
             </div>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                 <button 
                    onClick={handleSuggestProfile}
                    disabled={isSuggesting}
                    className="text-xs bg-white text-blue-700 px-4 py-2 rounded border border-blue-200 flex items-center gap-2 font-bold hover:bg-blue-100 shadow-sm whitespace-nowrap"
                 >
                    {isSuggesting ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
                    IA: SUGERIR RIESGOS
                 </button>
                 
                 {aiFeedback && (
                     <div className={`text-xs px-3 py-2 rounded flex items-center gap-2 animate-fade-in ${
                         aiFeedback.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
                     }`}>
                         {aiFeedback.type === 'success' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                         {aiFeedback.message}
                     </div>
                 )}
             </div>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-200">
             <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Riesgos Detectados</label>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                 {RISKS_LIST.map(risk => (
                   <label key={risk} className={`flex items-center p-2 rounded border cursor-pointer text-xs transition-all ${formData.risks.includes(risk) ? 'border-red-400 bg-red-50 font-bold text-red-900 shadow-sm' : 'border-gray-200 bg-white text-gray-600'}`}>
                     <input type="checkbox" value={risk} checked={formData.risks.includes(risk)} onChange={(e) => handleCheckboxChange(e, 'risk')} className="mr-2 accent-red-600" />
                     {risk}
                   </label>
                 ))}
             </div>
          </div>
        </section>

        <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
           <div className="flex gap-3">
                <button onClick={handleSave} disabled={isSyncing} className="bg-primary hover:bg-blue-700 text-white font-bold py-2 px-6 rounded shadow flex items-center gap-2">
                    {isSyncing ? <Cloud className="animate-pulse" size={18}/> : <Save size={18} />} 
                    {initialData ? 'Actualizar Datos' : 'Guardar Trabajador'}
                </button>
                
                {/* BOTÓN NUEVO: Generar IRL directo */}
                {initialData && (
                    <button onClick={() => onGenerateIRL(formData)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded shadow flex items-center gap-2">
                         <FileText size={18} /> Generar IRL
                    </button>
                )}
                
                <button onClick={onCancel} className="bg-white text-gray-700 font-medium py-2 px-6 rounded border border-gray-300 hover:bg-gray-50">Cancelar</button>
           </div>

           {initialData && onDelete && (
               <div className="relative">
                   {!showDeleteConfirm ? (
                        <button onClick={() => setShowDeleteConfirm(true)} className="text-red-500 text-sm hover:bg-red-50 px-3 py-2 rounded flex items-center gap-1">
                            <Trash2 size={16}/> Eliminar
                        </button>
                   ) : (
                       <div className="flex items-center gap-2 bg-red-50 p-2 rounded border border-red-200 animate-fade-in-up">
                           <span className="text-xs text-red-700 font-bold">¿Eliminar definitivamente?</span>
                           <button onClick={handleDeleteConfirm} className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700">Sí, borrar</button>
                           <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-500 text-xs px-2 hover:text-gray-700">Cancelar</button>
                       </div>
                   )}
               </div>
           )}
        </div>
      </div>
    </div>
  );
};
