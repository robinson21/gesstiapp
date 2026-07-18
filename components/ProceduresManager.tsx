
import React, { useState, useEffect } from 'react';
import { WorkerData, DocumentSST } from '../types';
import { WorkerSelector } from './WorkerSelector';
import { suggestPTSList } from '../services/geminiService';
import { BookOpen, Sparkles, Loader2, FileText, History, Library, ArrowRightCircle, Plus, Search, AlertTriangle } from 'lucide-react';

interface Props {
  workers: WorkerData[];
  currentWorker: WorkerData | null;
  onWorkerSelect: (worker: WorkerData) => void;
  documents: DocumentSST[];
  onGenerate: (title: string) => void;
  onView: (doc: DocumentSST) => void;
  onReuse: (doc: DocumentSST) => void;
  loading: boolean;
}

export const ProceduresManager: React.FC<Props> = ({ 
  workers, currentWorker, onWorkerSelect, documents, onGenerate, onView, onReuse, loading 
}) => {
  const [suggestions, setSuggestions] = useState<{title: string, reason: string}[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [manualTopic, setManualTopic] = useState('');
  const [activeTab, setActiveTab] = useState<'PERSONAL' | 'LIBRARY'>('PERSONAL');
  const [libraryFilter, setLibraryFilter] = useState('');

  // Clear suggestions when worker changes
  useEffect(() => {
    setSuggestions([]);
    setManualTopic('');
    // Default to Library if current worker has no docs, otherwise Personal
    const hasPersonal = documents.some(d => d.type === 'PTS' && d.workerId === currentWorker?.id);
    setActiveTab(hasPersonal ? 'PERSONAL' : 'LIBRARY');
  }, [currentWorker, documents]);

  const handleSuggest = async () => {
    if (!currentWorker) return;
    setIsSuggesting(true);
    try {
      // Pass activities (Labor) for better context
      const list = await suggestPTSList(currentWorker.role, currentWorker.industry, currentWorker.activities);
      setSuggestions(list);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSuggesting(false);
    }
  };

  // 1. Personal Docs: Strictly matching Worker ID
  const personalDocs = documents.filter(d => d.type === 'PTS' && d.workerId === currentWorker?.id);
  
  // 2. Library Docs: Matching Role/Cargo, EXCLUDING current worker (to avoid duplicates)
  // Logic: Matches strict role OR if the document content mentions the role (fallback)
  const libraryDocs = documents.filter(d => 
    d.type === 'PTS' && 
    currentWorker && 
    (d.role === currentWorker.role || (d.content && d.content.includes(currentWorker.role))) &&
    d.workerId !== currentWorker.id
  );

  const filteredLibrary = libraryDocs.filter(d => d.title.toLowerCase().includes(libraryFilter.toLowerCase()));

  return (
    <div className="animate-fade-in space-y-6 h-full flex flex-col">
      
      {/* 1. Worker Selection Header */}
      <div className="flex-none">
        <WorkerSelector 
            workers={workers} 
            currentWorker={currentWorker} 
            onSelect={onWorkerSelect} 
        />
      </div>

      {!currentWorker ? (
         <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <BookOpen size={48} className="mb-4 opacity-50" />
            <p>Seleccione un trabajador arriba para gestionar sus Procedimientos de Trabajo Seguro (PTS).</p>
         </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
          
          {/* LEFT: Generation & Suggestions (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
                <Sparkles className="text-primary" size={20}/> Generar Nuevo PTS
              </h3>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 border border-blue-100">
                    <p className="font-bold mb-1">Contexto IA:</p>
                    <p>Cargo: <strong>{currentWorker.role}</strong></p>
                    <p>Labor: <span className="italic">{currentWorker.activities ? currentWorker.activities.substring(0, 50) + '...' : 'General'}</span></p>
                </div>

                <button 
                  onClick={handleSuggest} 
                  disabled={isSuggesting || loading}
                  className="w-full bg-white text-blue-700 border border-blue-200 p-3 rounded-lg font-bold hover:bg-blue-50 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {isSuggesting ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                  Sugerir PTS según Cargo y Labor
                </button>

                {suggestions.length > 0 && (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar bg-gray-50 p-2 rounded border border-gray-100">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-1">Sugeridos por IA</p>
                    {suggestions.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => onGenerate(item.title)}
                        className={`p-3 rounded border bg-white hover:border-blue-400 cursor-pointer group transition-all ${loading ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                             <p className="font-bold text-sm text-gray-700 group-hover:text-blue-600">{item.title}</p>
                             <Plus size={14} className="text-blue-400 opacity-0 group-hover:opacity-100"/>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-4 border-t">
                   <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Tema Específico</label>
                   <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={manualTopic}
                        onChange={(e) => setManualTopic(e.target.value)}
                        placeholder="Ej: Trabajo en Caliente"
                        className="w-full p-2 border rounded text-sm"
                      />
                      <button 
                        onClick={() => onGenerate(manualTopic)}
                        disabled={!manualTopic || loading}
                        className="bg-primary text-white p-2 rounded hover:bg-blue-700 shadow-sm"
                      >
                        <Plus size={20}/>
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Library & History (8 Cols) */}
          <div className="lg:col-span-8 h-full flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
              
              {/* Tabs */}
              <div className="flex border-b bg-gray-50 flex-none">
                <button 
                  onClick={() => setActiveTab('PERSONAL')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'PERSONAL' ? 'bg-white text-blue-600 border-t-2 border-t-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                   <History size={16}/> Mis Procedimientos ({personalDocs.length})
                </button>
                <button 
                  onClick={() => setActiveTab('LIBRARY')}
                  className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'LIBRARY' ? 'bg-white text-purple-600 border-t-2 border-t-purple-600' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                   <Library size={16}/> Biblioteca del Cargo ({filteredLibrary.length})
                </button>
              </div>

              {/* Content Area */}
              <div className="p-4 flex-1 overflow-y-auto bg-gray-50/30 custom-scrollbar">
                
                {/* PERSONAL TAB */}
                {activeTab === 'PERSONAL' && (
                  <div className="space-y-3">
                    {personalDocs.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">
                        <FileText size={48} className="mx-auto mb-3 opacity-20"/>
                        <p className="font-medium">No hay procedimientos asignados a {currentWorker.fullName}.</p>
                        <p className="text-sm mt-1">Genere uno nuevo o busque en la biblioteca.</p>
                      </div>
                    ) : (
                      personalDocs.map(doc => (
                        <div key={doc.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-all">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded text-blue-600">
                                <FileText size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 text-sm">{doc.title}</p>
                                <p className="text-xs text-gray-500">{new Date(doc.date).toLocaleDateString()} • {doc.category}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => onView(doc)}
                            className="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-bold border border-blue-200 hover:bg-blue-50 flex items-center gap-1 transition-colors"
                          >
                            <FileText size={14}/> Ver / Firmar
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* LIBRARY TAB */}
                {activeTab === 'LIBRARY' && (
                  <div className="space-y-4 h-full flex flex-col">
                     <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-2">
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-purple-600 mt-0.5 flex-none"/>
                            <div className="text-xs text-purple-800">
                                <p className="font-bold">Modo Biblioteca</p>
                                <p>Aquí aparecen documentos creados para otros trabajadores con el cargo <strong>"{currentWorker.role}"</strong>.</p>
                                <p>Al reutilizarlos, se actualizarán los datos (Nombre/RUT) para {currentWorker.fullName} y se solicitará nueva firma.</p>
                            </div>
                        </div>
                     </div>

                     <div className="relative flex-none">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
                        <input 
                          type="text" 
                          placeholder="Buscar en biblioteca de procedimientos..." 
                          value={libraryFilter}
                          onChange={(e) => setLibraryFilter(e.target.value)}
                          className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                        />
                     </div>

                     <div className="space-y-3 flex-1 overflow-y-auto">
                        {filteredLibrary.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 text-sm">
                            <Library size={32} className="mx-auto mb-2 opacity-30"/>
                            <p>No se encontraron procedimientos reutilizables para el cargo <strong>{currentWorker.role}</strong>.</p>
                            </div>
                        ) : (
                            filteredLibrary.map(doc => (
                                <div key={doc.id} className="bg-white p-4 rounded-lg border border-gray-200 hover:border-purple-300 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-purple-100 p-2 rounded text-purple-600">
                                            <BookOpen size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm group-hover:text-purple-700 transition-colors">{doc.title}</p>
                                            <p className="text-xs text-gray-500">Origen: {doc.workerName} • {new Date(doc.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => onReuse(doc)}
                                        className="whitespace-nowrap bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-700 flex items-center gap-2 shadow-sm transition-colors"
                                        title={`Aplicar este procedimiento a ${currentWorker.fullName}`}
                                    >
                                        <ArrowRightCircle size={14}/> Reutilizar
                                    </button>
                                </div>
                            ))
                        )}
                     </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
