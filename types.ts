
export interface WorkerData {
  id: string;
  // Lifecycle
  status?: 'Activo' | 'Inactivo'; 
  // Personal
  fullName: string;
  rut: string;
  email: string;
  phone: string;
  entryDate: string;
  password?: string; // New: For authentication
  // Occupational
  role: string;
  customRole?: string;
  department: string;
  workCenter: string;
  location: string;
  workEnvironment: string; // New field for detailed context
  modality: 'Presencial' | 'Remota' | 'Híbrida';
  shifts: string[];
  customShift?: string;
  // Sector Info
  industry: string;
  activities: string;
  risks: string[];
  customRisks?: string;
  // Special
  specialCondition: string;
}

export interface AdminUser {
  email: string;
  password: string;
  name: string;
}

export interface CompanyProfile {
  companyName: string;
  companyRut: string;
  companyLogoUrl: string; // URL or Base64
  facilitatorName: string;
  facilitatorRole: string;
  facilitatorSignature: string; // Base64 image
  customSSTKnowledge?: string; // New: Custom Knowledge Base text
}

export interface DocumentSST {
  id: string;
  title: string;
  type: 'IRL' | 'PTS' | 'IPER' | 'CAPACITACION' | 'EPP' | 'CERTIFICADO' | 'PLAN_MAESTRO'; // Added new types
  category?: string; 
  date: string;
  workerName?: string;
  workerId?: string; // Added for linking
  role?: string; // Added for Master Plans
  workCenter?: string; 
  content: string; 
  url?: string; 
  signedByWorker?: boolean; 
}

export interface IPERRow {
  id: string;
  date: string;  // Added for History Tracking
  cargo: string; // Added for Filtering by Role
  proceso: string;
  tarea: string;
  tipo: 'Rutinaria' | 'No Rutinaria'; // Added per ISP Guide
  peligro: string; // Fuente (GEMA)
  riesgo: string; // Incidente
  probabilidad: 1 | 2 | 4; // Strict VEP Scale
  consecuencia: 1 | 2 | 4; // Strict VEP Scale
  magnitud: number; // P x C
  nivel: 'Tolerable' | 'Moderado' | 'Importante' | 'Intolerable'; // ISP Levels
  // Jerarquía de Control (DS 44)
  medidasIngenieria: string;
  medidasAdministrativas: string;
  medidasEPP: string;
  responsable: string;
  plazo: string;
}

export interface TrainingSession {
  id: string;
  topic: string;
  objective: string;
  duration: number; 
  modality: 'Presencial' | 'Remota' | 'E-learning' | 'Práctica';
  month: string; 
  status: 'Programada' | 'Realizada' | 'Pendiente';
  instructor: string;
  attendees?: string[];
  content?: string; 
}

export interface AnnualTrainingPlan {
  year: number;
  role: string;
  diagnosis: string;
  sessions: TrainingSession[];
  totalHours: number;
  budgetEstimate: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface TrainingSlide {
  title: string;
  content: string;
  emoji: string;
  visualContent?: string; // NEW: Stores SVG code for dynamic illustrations
}

export interface InfographicStep {
  step: number;
  title: string;
  description: string;
}

export interface InteractiveModule {
  title: string;
  introduction: string;
  slides: TrainingSlide[];
  infographic: InfographicStep[];
  quiz: QuizQuestion[];
  contentHtml?: string; // Legacy fallback
}

// New Interface for Individual Assignments
export interface TrainingAssignment {
  id: string;
  workerId: string;
  workerName: string;
  topic: string;
  source: 'PLAN_ANUAL' | 'MANUAL';
  status: 'Pendiente' | 'Aprobado' | 'Reprobado';
  score?: number;
  assignedDate: string;
  completedDate?: string;
  interactiveContent?: InteractiveModule; // Store the AI generated content here
  answers?: number[]; // Added to store quiz answers
  hasContent?: boolean; // Added for lazy loading indication
}

export interface PTSFormData {
  taskName: string;
  principalRisk: string;
  criticality: 'Baja' | 'Media' | 'Alta';
  affectedWorkers: number;
  workCenter: string;
  currentSteps: string;
}

export interface PPETransaction {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  type: 'Entrega Inicial' | 'Recambio' | 'Devolución';
  items: string[]; 
  motive?: string; 
  signature: string; 
  pdfUrl?: string; // Added for PDF Access
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface IntegrationConfig {
  googleScriptUrl: string;
  powerAutomateUrl: string;
  driveFolderName: string;
  useWorkerSubfolders?: boolean; 
}

export enum SSTView {
  DASHBOARD = 'DASHBOARD',
  WORKERS = 'WORKERS',
  NEW_WORKER = 'NEW_WORKER',
  EDIT_WORKER = 'EDIT_WORKER',
  IRL_GENERATOR = 'IRL_GENERATOR',
  IPER = 'IPER',
  TRAINING = 'TRAINING',
  PROCEDURES = 'PROCEDURES', 
  EPP = 'EPP', 
  DOCUMENTS = 'DOCUMENTS',
  SETTINGS = 'SETTINGS',
  WORKER_PORTAL = 'WORKER_PORTAL' // New Portal View
}

// Constants
export const ROLES = ['Operario', 'Técnico', 'Administrativo', 'Supervisor', 'Gerente', 'Especialista', 'Otro'];
export const DEPARTMENTS = ['Producción', 'Administrativo', 'Logística', 'Ventas', 'RRHH', 'TI', 'Otro'];
export const INDUSTRIES = ['Construcción', 'Manufactura', 'Retail', 'Salud', 'Servicios', 'Transporte', 'Agrícola', 'Minería', 'Otro'];
export const RISKS_LIST = [
  'Trabajo en altura',
  'Espacios confinados',
  'Manejo de químicos',
  'Electricidad',
  'Temperaturas extremas',
  'Maquinaria pesada',
  'Riesgos psicosociales',
  'Ergonomía',
  'Ruido',
  'Radiación UV'
];

export const EPP_LIST = [
  'Casco de Seguridad',
  'Lentes de Seguridad (Claros)',
  'Lentes de Seguridad (Oscuros)',
  'Zapatos de Seguridad',
  'Guantes de Cabritilla',
  'Guantes de Nitrilo',
  'Guantes Hycron/Rudos',
  'Protector Auditivo (Tipo Fono)',
  'Tapones Auditivos',
  'Arnés de Seguridad',
  'Cabo de Vida',
  'Respirador Medio Rostro',
  'Filtros P100',
  'Filtros Gases/Vapores',
  'Chaleco Geólogo/Reflectante',
  'Ropa de Trabajo (Overol)',
  'Protector Solar UV',
  'Legionario (Cubre nuca)'
];

export const MONTHS_ORDER = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];
