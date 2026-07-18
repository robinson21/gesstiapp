
import React, { useState, useEffect } from 'react';
import { UserCircle, Search, X } from 'lucide-react';
import { WorkerData } from '../types';

interface Props {
  workers: WorkerData[];
  currentWorker: WorkerData | null;
  onSelect: (worker: WorkerData) => void;
}

export const WorkerSelector: React.FC<Props> = ({ workers, currentWorker, onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredWorkers, setFilteredWorkers] = useState<WorkerData[]>(workers);

  useEffect(() => {
    setFilteredWorkers(
      (workers || []).filter(w => {
        const term = searchTerm.toLowerCase();
        return (
          w.fullName.toLowerCase().includes(term) ||
          w.rut.toLowerCase().includes(term) ||
          w.role.toLowerCase().includes(term)
        );
      })
    );
  }, [searchTerm, workers]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const w = workers.find(wk => wk.id === e.target.value);
    if (w) {
      onSelect(w);
      // Optional: Clear search on select if desired, but keeping it allows context
    }
  };

  return (
    <div className="mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm animate-fade-in no-print">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Icon */}
        <div className="hidden md:block bg-blue-100 p-3 rounded-full text-blue-600 h-fit">
          <UserCircle size={24} />
        </div>

        <div className="flex-1 space-y-3">
          <label className="block text-xs font-bold text-gray-500 uppercase">
            Buscar y Seleccionar Trabajador
          </label>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por Nombre, RUT o Cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 p-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Dropdown */}
          <select
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 bg-gray-50 text-sm"
            onChange={handleSelectChange}
            value={currentWorker?.id || ''}
          >
            <option value="">
              {filteredWorkers.length === 0 
                ? 'No se encontraron coincidencias' 
                : `-- Seleccionar de ${filteredWorkers.length} resultados --`}
            </option>
            {filteredWorkers.map(w => (
              <option key={w.id} value={w.id}>
                {w.fullName} | {w.rut} | {w.role} {w.status === 'Inactivo' ? '(BAJA)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Selected Info Card */}
        {currentWorker && (
          <div className="md:w-1/3 bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold">
                    {currentWorker.fullName.charAt(0)}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-gray-800 truncate">{currentWorker.fullName}</p>
                    <p className="text-xs text-gray-500">{currentWorker.rut}</p>
                </div>
            </div>
            <div className="space-y-1 text-xs text-gray-600 border-t border-blue-200 pt-2">
                <p><span className="font-bold">Cargo:</span> {currentWorker.role}</p>
                <p><span className="font-bold">Centro:</span> {currentWorker.workCenter}</p>
                {currentWorker.status === 'Inactivo' && (
                    <p className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded w-fit mt-1">NO VIGENTE</p>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
