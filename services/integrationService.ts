
import { DocumentSST, IntegrationConfig, WorkerData, IPERRow, AnnualTrainingPlan, PPETransaction, TrainingAssignment, AdminUser, InteractiveModule } from "../types";

export const DEFAULT_FOLDER_NAME = 'SST_Documentos_2025';
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_BDeMnIVkpITPcsNEJ_jIjfFTc3RNOX6MTxUqqaqKnsKIn_q835THIOjG65vFqab8/exec';

export const getConfig = (): IntegrationConfig => {
  const saved = localStorage.getItem('sst_integration_config');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      if (config && typeof config === 'object') {
        return {
          googleScriptUrl: config.googleScriptUrl || DEFAULT_SCRIPT_URL,
          powerAutomateUrl: config.powerAutomateUrl || '',
          driveFolderName: config.driveFolderName || DEFAULT_FOLDER_NAME,
          useWorkerSubfolders: config.useWorkerSubfolders ?? false
        };
      }
    } catch (e) {
      console.error("Failed to parse integration config, using defaults.", e);
    }
  }
  return { 
    googleScriptUrl: DEFAULT_SCRIPT_URL, 
    powerAutomateUrl: '', 
    driveFolderName: DEFAULT_FOLDER_NAME,
    useWorkerSubfolders: false
  };
};

// Updated to return Promise<any> to capture response data (like URLs)
const sendToBackend = async (type: string, payload: any): Promise<any> => {
  const config = getConfig();
  
  if (config.driveFolderName) payload.folderName = config.driveFolderName;
  if (config.useWorkerSubfolders) payload.useWorkerSubfolders = true;

  let result = null;

  if (config.googleScriptUrl && config.googleScriptUrl.startsWith('http')) {
    try {
        const response = await fetch(config.googleScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ type, payload })
        });
        result = await response.json();
    } catch(e) {
        console.warn("[SST] Google Sync Warning:", e);
    }
  }

  // Fire and forget for Power Automate usually, but can be awaited if needed
  if (config.powerAutomateUrl && config.powerAutomateUrl.startsWith('http')) {
    fetch(config.powerAutomateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, ...payload })
    }).catch(e => console.warn("[SST] Power Automate Sync Warning:", e));
  }

  return result;
};

const getUrlWithParams = (baseUrl: string, params: string) => {
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${params}&t=${Date.now()}`;
};

export const fetchAdminsFromBackend = async (): Promise<AdminUser[]> => {
    const config = getConfig();
    if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
    try {
        const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_ADMINS'));
        if (!res.ok) return [];
        try {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch(e) { 
            console.warn("[SST] Error parsing admins (Unterminated JSON?):", e);
            return []; 
        }
    } catch (e) {
        return [];
    }
};

export const saveAdminToBackend = async (admin: AdminUser) => {
    await sendToBackend('ADMIN', admin);
};

export const deleteAdminFromBackend = async (email: string) => {
    await sendToBackend('DELETE_ADMIN', { email });
};

export const fetchWorkersFromBackend = async (): Promise<WorkerData[]> => {
  const config = getConfig();
  if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
  try {
      const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_WORKERS'));
      if (!res.ok) return [];
      try {
        const data = await res.json();
        if (Array.isArray(data)) return data;
        return [];
      } catch(e) { 
          console.warn("Fetch Workers JSON Error", e);
          return []; 
      }
  } catch (e) {
      return [];
  }
};

export const saveWorker = async (worker: WorkerData) => {
    await sendToBackend('WORKER', worker);
};

export const syncWorkerData = async (worker: WorkerData) => {
    await sendToBackend('WORKER', worker);
};

export const deleteWorkerFromBackend = async (id: string) => {
    await sendToBackend('DELETE_WORKER', { id });
};

export const fetchDocumentsFromBackend = async (): Promise<DocumentSST[]> => {
  const config = getConfig();
  if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
  try {
      const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_DOCUMENTS'));
      if (!res.ok) return [];
      try {
          const data = await res.json();
          if (Array.isArray(data)) return data;
          return [];
      } catch(e) { 
          console.warn("Fetch Documents JSON Error (Truncated?)", e);
          return []; 
      }
  } catch (e) { 
      return []; 
  }
};

export const syncDocumentWithGoogle = async (doc: DocumentSST): Promise<{status: string, url?: string}> => {
    return await sendToBackend('DOCUMENT', doc);
};

export const fetchIPERFromBackend = async (): Promise<any[]> => {
    const config = getConfig();
    if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
    try {
        const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_IPER'));
        if (!res.ok) return [];
        try {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch(e) { 
            console.warn("Fetch IPER JSON Error", e);
            return []; 
        }
    } catch (e) {
        return [];
    }
};

export const syncIPERMatrix = async (rows: IPERRow[], role: string) => {
    await sendToBackend('IPER', { date: new Date().toLocaleDateString(), role, rows });
};

export const fetchTrainingPlansFromBackend = async (): Promise<any[]> => {
    const config = getConfig();
    if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
    try {
        const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_TRAINING_PLANS'));
        if (!res.ok) return [];
        try {
            const data = await res.json();
            return Array.isArray(data) ? data : [];
        } catch(e) { return []; }
    } catch (e) {
        return [];
    }
}

export const syncTrainingPlan = async (plan: AnnualTrainingPlan) => {
    await sendToBackend('TRAINING_PLAN', { role: plan.role, rows: plan.sessions });
};

export const fetchAssignmentsFromBackend = async (): Promise<TrainingAssignment[]> => {
    const config = getConfig();
    if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
    try {
        const res = await fetch(getUrlWithParams(config.googleScriptUrl, 'type=GET_ASSIGNMENTS'));
        if (!res.ok) return [];
        try {
            const data = await res.json();
            // Data now comes without heavy content by default, but with answers
            return Array.isArray(data) ? data : [];
        } catch (parseError) {
            console.warn("[SST] JSON Parse Error on Assignments (Truncated?):", parseError);
            return [];
        }
    } catch (e) {
        return [];
    }
};

// NEW FUNCTION: Lazy Load Content
export const fetchAssignmentContent = async (id: string): Promise<InteractiveModule | null> => {
    const config = getConfig();
    if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return null;
    try {
        const res = await fetch(getUrlWithParams(config.googleScriptUrl, `type=GET_ASSIGNMENT_CONTENT&id=${id}`));
        const json = await res.json();
        if (json.status === 'success' && json.content) {
            return json.content;
        }
        return null;
    } catch (e) {
        console.error("Error fetching assignment content:", e);
        return null;
    }
};

export const syncAssignment = async (assignment: TrainingAssignment) => {
    await sendToBackend('SAVE_ASSIGNMENT', assignment);
};

export const syncAssignmentsBulk = async (assignments: TrainingAssignment[]) => {
    await sendToBackend('SAVE_ASSIGNMENTS_BULK', assignments);
};

export const updateAssignmentStatus = async (id: string, status: 'Aprobado' | 'Reprobado' | 'Pendiente', score: number, answers?: number[]) => {
    await sendToBackend('UPDATE_ASSIGNMENT_STATUS', { id, status, score, answers });
};

export const updateTrainingSessionStatus = async (id: string, status: 'Realizada' | 'Pendiente') => {
    await sendToBackend('UPDATE_TRAINING_STATUS', { id, status });
};

export const fetchPPEHistory = async (workerId: string): Promise<PPETransaction[]> => {
  const config = getConfig();
  if (!config.googleScriptUrl || !config.googleScriptUrl.startsWith('http')) return [];
  try {
      const res = await fetch(getUrlWithParams(config.googleScriptUrl, `type=GET_EPP_HISTORY&workerId=${workerId}`));
      if (!res.ok) return [];
      try {
          const data = await res.json();
          if (Array.isArray(data)) return data;
          return [];
      } catch(e) { return []; }
  } catch (e) { 
      return []; 
  }
};

export const syncPPETransaction = async (trx: PPETransaction) => {
    await sendToBackend('EPP_TRANSACTION', trx);
};
