
import React, { useState } from 'react';
import { ShieldCheck, UserCircle, ArrowRight, Lock, Search, Loader2, AlertTriangle, Mail, RefreshCw, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { WorkerData, AdminUser } from '../types';

interface Props {
  workers: WorkerData[];
  admins: AdminUser[]; // New prop
  onLogin: (role: 'ADMIN' | 'WORKER', userData?: WorkerData) => void;
  onSaveWorker: (worker: WorkerData) => Promise<void>;
}

export const LoginScreen: React.FC<Props> = ({ workers, admins, onLogin, onSaveWorker }) => {
  const [mode, setMode] = useState<'SELECTION' | 'ADMIN' | 'WORKER' | 'RECOVER'>('SELECTION');
  
  // Admin Login
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Worker Login
  const [rut, setRut] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  
  // Reset Flow States
  const [resetStep, setResetStep] = useState<'IDENTIFY' | 'SET_NEW'>('IDENTIFY');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [foundWorker, setFoundWorker] = useState<WorkerData | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Helper: Clean RUT for robust comparison (e.g. 12.345.678-9 -> 123456789 or 12345678k)
  const cleanRutString = (r: string) => (r || '').replace(/[^0-9kK]/g, '').toLowerCase();

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    setTimeout(() => {
        // Safe access to admins array
        const safeAdmins = Array.isArray(admins) ? admins : [];
        const foundAdmin = safeAdmins.find(a => a.email.toLowerCase() === adminEmail.trim().toLowerCase() && a.password === password);
        
        // 1. Check DB Match
        if (foundAdmin) {
            onLogin('ADMIN');
        } 
        // 2. Check Default Fallback (Critical for first run or empty DB)
        else if (
            (adminEmail.trim().toLowerCase() === 'admin' && password === 'admin123') ||
            (adminEmail.trim().toLowerCase() === 'admin@empresa.cl' && password === 'admin123')
        ) {
            onLogin('ADMIN');
        } 
        else {
            setError('Credenciales inválidas.');
        }
        setIsLoading(false);
    }, 800);
  };

  const handleWorkerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
        const cleanRutInput = cleanRutString(rut);
        // Safe access to workers array
        const safeWorkers = Array.isArray(workers) ? workers : [];
        
        if (safeWorkers.length === 0) {
            setError('Base de datos vacía. Ingrese como Administrador para registrar colaboradores.');
            setIsLoading(false);
            return;
        }

        // Find worker matching RUT (Cleaner comparison)
        const worker = safeWorkers.find(w => cleanRutString(w.rut) === cleanRutInput);

        if (worker) {
            if (worker.status === 'Inactivo') {
                setError('Este usuario está inactivo. Contacte a RRHH.');
            } else {
                // Fix: Ensure storedPass is treated as a string before trim()
                const storedPass = worker.password ? String(worker.password).trim() : "";
                
                // Allow both Cleaned RUT and Raw RUT as default passwords to avoid user confusion
                const defaultPassClean = cleanRutString(worker.rut);
                const defaultPassRaw = worker.rut.trim();

                const inputPass = password.trim();

                if (storedPass && storedPass.length > 0) {
                    // Password IS set in DB
                    if (inputPass === storedPass) {
                         onLogin('WORKER', worker);
                    } else {
                         setError('Contraseña incorrecta.');
                    }
                } else {
                    // Password NOT set -> Check defaults
                    if (inputPass === defaultPassClean || inputPass === defaultPassRaw) {
                        onLogin('WORKER', worker);
                    } else {
                        setError('Contraseña incorrecta. (Por defecto es su RUT sin puntos ni guión)');
                    }
                }
            }
        } else {
            setError('RUT no encontrado en el registro.');
        }
        setIsLoading(false);
    }, 800);
  };

  const handleIdentifyUser = (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      setError('');
      setSuccessMsg('');

      setTimeout(() => {
          const cleanRut = cleanRutString(rut);
          const safeWorkers = Array.isArray(workers) ? workers : [];
          const worker = safeWorkers.find(w => cleanRutString(w.rut) === cleanRut);

          if (worker) {
             if (worker.email && worker.email.toLowerCase() === email.trim().toLowerCase()) {
                 setFoundWorker(worker);
                 setResetStep('SET_NEW');
                 setSuccessMsg('Identidad verificada. Establezca su nueva contraseña.');
             } else {
                 setError('El correo no coincide con el registrado para este RUT.');
             }
          } else {
             setError('RUT no encontrado.');
          }
          setIsLoading(false);
      }, 1000);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword !== confirmPassword) {
          setError('Las contraseñas no coinciden.');
          return;
      }
      if (newPassword.length < 4) {
          setError('La contraseña es muy corta.');
          return;
      }
      if (!foundWorker) return;

      setIsLoading(true);
      try {
          const updatedWorker: WorkerData = { ...foundWorker, password: newPassword };
          await onSaveWorker(updatedWorker);
          setSuccessMsg('¡Contraseña actualizada con éxito!');
          setTimeout(() => {
             setMode('WORKER');
             setResetStep('IDENTIFY');
             setFoundWorker(null);
             setPassword(''); 
             setRut(updatedWorker.rut);
          }, 2000);
      } catch (err) {
          setError('Error al guardar. Intente nuevamente.');
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col md:flex-row min-h-[500px] animate-fade-in">
        
        {/* Left Side: Banner */}
        <div className="bg-blue-600 md:w-1/2 p-12 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                 <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                    <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
                 </svg>
            </div>
            
            <div className="relative z-10">
                <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
                    <ShieldCheck size={32} />
                </div>
                <h1 className="text-4xl font-bold mb-2">GeSSTIApp</h1>
                <p className="text-blue-100 text-lg">Plataforma Integral de Seguridad y Salud en el Trabajo.</p>
            </div>

            <div className="relative z-10 text-sm text-blue-200">
                <p className="mb-1">Cumplimiento Normativo DS 44</p>
                <p>Gestión impulsada por IA</p>
            </div>
        </div>

        {/* Right Side: Forms */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-gray-50">
            
            {mode === 'SELECTION' && (
                <div className="space-y-6 animate-fade-in">
                    <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Selecciona tu perfil</h2>
                    
                    <button 
                        onClick={() => setMode('ADMIN')}
                        className="w-full bg-white p-6 rounded-xl shadow-sm border-2 border-transparent hover:border-blue-500 hover:shadow-md transition-all group text-left flex items-center gap-4"
                    >
                        <div className="bg-blue-100 p-4 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <ShieldCheck size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">Administrador SST</h3>
                            <p className="text-sm text-gray-500">Acceso al panel de gestión, matrices y reportes.</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300 group-hover:text-blue-500" />
                    </button>

                    <button 
                        onClick={() => setMode('WORKER')}
                        className="w-full bg-white p-6 rounded-xl shadow-sm border-2 border-transparent hover:border-green-500 hover:shadow-md transition-all group text-left flex items-center gap-4"
                    >
                        <div className="bg-green-100 p-4 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <UserCircle size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-lg">Colaborador</h3>
                            <p className="text-sm text-gray-500">Acceso a mis documentos, cursos y firmas.</p>
                        </div>
                        <ArrowRight className="ml-auto text-gray-300 group-hover:text-green-500" />
                    </button>
                </div>
            )}

            {mode === 'ADMIN' && (
                <form onSubmit={handleAdminLogin} className="space-y-6 animate-fade-in">
                    <div>
                        <button type="button" onClick={() => setMode('SELECTION')} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Volver</button>
                        <h2 className="text-2xl font-bold text-gray-800">Acceso Administrador</h2>
                        <p className="text-gray-500 text-sm">Ingrese sus credenciales.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email Corporativo / Usuario</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                value={adminEmail}
                                onChange={(e) => setAdminEmail(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="admin@empresa.cl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                    <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Ingresar al Dashboard'}
                    </button>
                </form>
            )}

            {mode === 'WORKER' && (
                <form onSubmit={handleWorkerLogin} className="space-y-6 animate-fade-in">
                    <div>
                        <button type="button" onClick={() => setMode('SELECTION')} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Volver</button>
                        <h2 className="text-2xl font-bold text-gray-800">Portal Colaborador</h2>
                        <p className="text-gray-500 text-sm">Ingrese RUT y contraseña.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">RUT Trabajador</label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="12.345.678-9"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none"
                                placeholder="••••••••"
                            />
                             <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <div className="text-right mt-1">
                            <button type="button" onClick={() => setMode('RECOVER')} className="text-xs text-blue-600 hover:underline font-medium">¿Olvidaste o quieres restablecer tu contraseña?</button>
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                    <button disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2">
                        {isLoading ? <Loader2 className="animate-spin" /> : 'Ingresar al Portal'}
                    </button>
                </form>
            )}

            {mode === 'RECOVER' && (
                 <div className="space-y-6 animate-fade-in">
                     <div>
                        <button type="button" onClick={() => { setMode('WORKER'); setResetStep('IDENTIFY'); setError(''); setSuccessMsg(''); }} className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">← Volver al Login</button>
                        <h2 className="text-2xl font-bold text-gray-800">Recuperar Cuenta</h2>
                        <p className="text-gray-500 text-sm">Verificaremos tus datos para restablecer el acceso.</p>
                    </div>

                    {resetStep === 'IDENTIFY' ? (
                        <form onSubmit={handleIdentifyUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">RUT</label>
                                <div className="relative">
                                    <UserCircle className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input 
                                        type="text" 
                                        value={rut}
                                        onChange={(e) => setRut(e.target.value)}
                                        className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="12.345.678-9"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Correo Electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="correo@empresa.cl"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 mt-1">Debe coincidir con el registrado por RRHH.</p>
                            </div>
                            
                            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                            <button disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2">
                                {isLoading ? <Loader2 className="animate-spin" /> : <><Search size={18}/> Verificar Identidad</>}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleResetPassword} className="space-y-4 animate-fade-in">
                             {successMsg && <div className="text-green-600 text-sm bg-green-50 p-3 rounded flex items-center gap-2"><CheckCircle2 size={16}/> {successMsg}</div>}
                             
                             <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nueva Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Mínimo 4 caracteres"
                                        required
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirmar Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-10 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder="Repetir contraseña"
                                        required
                                    />
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded flex items-center gap-2"><AlertTriangle size={16}/> {error}</div>}

                             <button disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center gap-2">
                                {isLoading ? <Loader2 className="animate-spin" /> : <><RefreshCw size={18}/> Guardar Contraseña</>}
                            </button>
                        </form>
                    )}
                 </div>
            )}
        </div>
      </div>
      
      <div className="fixed bottom-4 text-slate-500 text-xs">
         v2.5.4 - Powered by Google Gemini & Apps Script
      </div>
    </div>
  );
};
