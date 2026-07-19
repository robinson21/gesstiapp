import { WorkerData, IPERRow, AnnualTrainingPlan, CompanyProfile, InteractiveModule } from "../types";

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || import.meta.env.NVIDIA_API_KEY || "";
const MODEL_NAME = "nvidia/llama-3.3-nemotron-super-49b"; // o el modelo NVIDIA que tengas

const BASE_URL = "https://integrate.api.nvidia.com/v1";

async function chatCompletion(prompt: string, systemPrompt: string, temperature = 0.3) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });
  if (!res.ok) throw new Error(`NVIDIA API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

function cleanJson(text: string): string {
  if (!text) return "[]";
  let cleaned = text.trim();
  cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIndex = -1, endIndex = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIndex = firstBrace;
    endIndex = cleaned.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
    endIndex = cleaned.lastIndexOf("]");
  }
  if (startIndex === -1) return cleaned;
  return cleaned.slice(startIndex, endIndex + 1);
}

function cleanStr(text: string): string {
  return text.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim();
}

const SYSTEM_IPER = `Eres un Experto Prevencionista de Riesgos (Ingeniero en Prevención) en Chile (SNS).
Tu objetivo es proteger la vida de los trabajadores.
NORMATIVA OBLIGATORIA:
1. Usa el modelo GEMA (Gente, Equipos, Materiales, Ambiente).
2. Considera perspectiva de género (ergonomía, riesgos psicosociales, EPP diferenciado).
3. EVALUACIÓN (VEP): Probabilidad (P) valores 1, 2 o 4. Consecuencia (C) valores 1, 2 o 4. NUNCA uses 3.
4. JERARQUÍA DE CONTROLES: Eliminación > Sustitución > Ingeniería > Administrativas > EPP.
Sé ESPECÍFICO y TÉCNICO.`;

const SYSTEM_IRL = `Eres un experto en identificación de requisitos legales chilenos de SST.
Normas aplicables: DS 44, DS 594, Ley 16.744, DS 76, PREXOR, TMERT, CEAL-SM.
Genera listas precisas de requisitos legales según el contexto entregado.`;

const SYSTEM_TRAINING = `Eres un experto en planificación de capacitación SST en Chile.
Genera planes anuales de capacitación según Ley 16.744 y DS 40.
Incluye: tema, objetivo, público objetivo, frecuencia, duración, metodología y evaluación.`;

export async function generateIPER(
  industry: string, role: string, workCenter: string, activities: string, customKnowledge?: string
): Promise<IPERRow[]> {
  const prompt = `
CONTEXTO:
- Cargo: "${role}"
- Rubro: "${industry}"
- Centro de trabajo: "${workCenter}"
- Actividades: "${activities}"
${customKnowledge ? `- Conocimiento adicional:\n${customKnowledge}` : ""}

Genera una matriz IPER en JSON según DS 44 (2024) y ANEXO N°6 GUÍA ISP.
Cada riesgo debe tener: fecha, cargo, proceso, tarea, tipoTarea, peligro, riesgo, probabilidad, consecuencia, magnitud, nivel, medIngenieria, medAdmin, medEpp, responsable, plazo.
La respuesta debe ser SOLO un arreglo JSON válido. Ejemplo:
[{"fecha":"HOY","cargo":"...","proceso":"...","tarea":"...","tipoTarea":"...","peligro":"...","riesgo":"...","probabilidad":4,"consecuencia":4,"magnitud":16,"nivel":"INTOLERABLE","medIngenieria":"...","medAdmin":"...","medEpp":"...","responsable":"...","plazo":"..."}]
NO escribas texto antes o después del JSON. Solo el arreglo JSON.`;
  const text = await chatCompletion(prompt, SYSTEM_IPER);
  return JSON.parse(cleanJson(text));
}

export async function generateIRL(companyProfile: CompanyProfile, workers: WorkerData[]): Promise<string> {
  const prompt = `
Empresa: ${companyProfile.companyName}
Rubro: ${companyProfile.industry}
Trabajadores: ${workers.map(w => w.role).join(", ")}
Genera el IDENTIFICADOR DE REQUISITOS LEGALES (IRL) en formato markdown estructurado.
Incluye:DS 44, DS 594, Ley 16.744, DS 76, normativa específica del rubro.
Sé técnico y preciso con los artículos.`;
  return await chatCompletion(prompt, SYSTEM_IRL, 0.4);
}

export async function generateTrainingPlan(
  company: CompanyProfile, workers: WorkerData[]
): Promise<AnnualTrainingPlan> {
  const prompt = `
Empresa: ${company.companyName}
Rubro: ${company.industry}
Centros de trabajo: ${company.workCenters?.join(", ") || "N/A"}
Trabajadores: ${workers.map(w => `${w.fullName} (${w.role})`).join(", ")}

Genera un plan anual de capacitación en JSON según Ley 16.744 y DS 40.
Incluye: temas, objetivos, público, frecuencia, duración, metodología, evaluación.
La respuesta debe ser SOLO un JSON válido con este formato:
{"year":2026,"companyName":"...","trainings":[{"title":"...","objective":"...","targetAudience":["..."],"frequency":"...","duration":"...","methodology":"...","evaluation":"...","priority":"Alta|Media|Baja"}]}
NO escribas texto antes o después del JSON.`;
  const text = await chatCompletion(prompt, SYSTEM_TRAINING);
  return JSON.parse(cleanJson(text));
}

export async function suggestWorkerProfile(role: string, industry: string): Promise<Partial<WorkerData>> {
  const prompt = `Sugiere perfil ocupacional para "${role}" en "${industry}".
Responde SOLO JSON: {"role":"...","industry":"...","department":"...","modality":"Presencial","risks":["..."],"workEnvironment":"...","activities":"..."}`;
  return JSON.parse(cleanJson(await chatCompletion(prompt, SYSTEM_IPER, 0.5)));
}

export async function generateIPERDocumentHTML(rows: IPERRow[]): Promise<string> {
  const rowsHtml = rows.map(r => `
    <tr class="${r.nivel === 'INTOLERABLE' ? 'bg-red-900/30' : r.nivel === 'IMPORTANTE' ? 'bg-orange-900/30' : r.nivel === 'MODERADO' ? 'bg-yellow-900/30' : 'bg-green-900/30'}">
      <td>${r.fecha}</td><td>${r.cargo}</td><td>${r.proceso}</td><td>${r.tarea}</td>
      <td>${r.peligro}</td><td>${r.riesgo}</td>
      <td class="text-center font-bold">${r.probabilidad}</td>
      <td class="text-center font-bold">${r.consecuencia}</td>
      <td class="text-center font-bold">${r.magnitud}</td>
      <td class="font-bold text-center">${r.nivel}</td>
      <td>${r.medIngenieria || '-'}</td><td>${r.medAdmin || '-'}</td><td>${r.medEpp || '-'}</td>
      <td>${r.responsable || '-'}</td><td>${r.plazo || '-'}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Matriz IPER</title>
  <script src="https://cdn.tailwindcss.com"></script></head>
  <body class="bg-slate-900 text-white p-6"><h1 class="text-2xl font-bold mb-4">Matriz IPER</h1>
  <table class="w-full text-sm border-collapse">${rowsHtml}</table></body></html>`;
}

export async function chatWithSSTExpert(message: string, history?: {role:string,content:string}[]): Promise<string> {
  const hist = (history || []).map(h => ({ role: h.role, content: h.content }));
  const systemMsg = { role: "system", content: SYSTEM_IPER + "\nEres un asistente de SST en Chile. Responde en español." };
  const body = {
    model: MODEL_NAME,
    messages: [systemMsg, ...hist, { role: "user", content: message }],
    temperature: 0.4,
    max_tokens: 2048,
  };
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${NVIDIA_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`NVIDIA API error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function suggestPTSList(industry: string, role: string): Promise<string[]> {
  const prompt = `Sugiere 5-10 procedimientos de trabajo seguro (PTS) para "${role}" en "${industry}".
Responde SOLO JSON array de strings: ["PTS 1", "PTS 2", ...]`;
  return JSON.parse(cleanJson(await chatCompletion(prompt, SYSTEM_IPER, 0.4)));
}

export async function generateSpecificPTS(title: string, industry: string): Promise<string> {
  const prompt = `Genera un Procedimiento de Trabajo Seguro (PTS) completo para: "${title}" en "${industry}".
Incluye: objetivo, alcance, definiciones, responsabilidades, pasos ordenados, EPP requerido, medidas de control, referencias normativas.
Sé técnico y detallado.`;
  return await chatCompletion(prompt, SYSTEM_IPER, 0.3);
}

export async function generateInteractiveTrainingContent(title: string): Promise<InteractiveModule> {
  const prompt = `Genera módulo de capacitación interactivo para: "${title}".
Responde SOLO JSON: {"title":"...","slides":[{"title":"...","content":"...","quiz":{"question":"...","options":["...","...","...","..."],"correct":0}}],"duration":"10 min"}]}`;
  return JSON.parse(cleanJson(await chatCompletion(prompt, SYSTEM_TRAINING, 0.4)));
}