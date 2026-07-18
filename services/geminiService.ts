
import { GoogleGenAI, Type } from "@google/genai";
import { WorkerData, IPERRow, AnnualTrainingPlan, CompanyProfile, InteractiveModule } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Constants
const MODEL_NAME = 'gemini-3-pro-preview';

const getSystemInstruction = (customKnowledge?: string) => `
Eres un Experto Prevencionista de Riesgos (Ingeniero en Prevención) en Chile (SNS).
Tu objetivo es proteger la vida de los trabajadores cumpliendo estrictamente con el DECRETO SUPREMO 44 (2024), DECRETO SUPREMO 594 y la GUÍA TÉCNICA DEL ISP.

NORMATIVA OBLIGATORIA:
1. IDENTIFICACIÓN: Usa el modelo GEMA (Gente, Equipos, Materiales, Ambiente).
2. GÉNERO: Considera la perspectiva de género (ergonomía, riesgos psicosociales, EPP diferenciado).
3. EVALUACIÓN (VEP): Probabilidad x Consecuencia.
   - PROBABILIDAD (P): SOLO usa valores 1, 2 o 4.
   - CONSECUENCIA (C): SOLO usa valores 1, 2 o 4.
   - NO USES valor 3.
4. JERARQUÍA DE CONTROLES:
   - Las medidas deben priorizar: Eliminación -> Sustitución -> Ingeniería -> Administrativas -> EPP.
   - Debes ser ESPECÍFICO y TÉCNICO. No digas "usar guantes", di "Guantes de nitrilo puño largo certificados".

BASE DE CONOCIMIENTO EXTRA:
${customKnowledge ? `NORMATIVA INTERNA DEL CLIENTE:\n"${customKnowledge}"\n` : ""}
`;

// IMPROVED CLEAN JSON FUNCTION
const cleanJson = (text: string): string => {
  if (!text) return "[]";
  let cleaned = text.trim();
  
  // 1. Remove standard Markdown code blocks
  cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();

  // 2. Identify if it's an Object {} or Array [] based on what comes first
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  
  let startIndex = -1;
  let endIndex = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      // It's likely an Object
      startIndex = firstBrace;
      endIndex = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
      // It's likely an Array
      startIndex = firstBracket;
      endIndex = cleaned.lastIndexOf(']');
  }

  // 3. Extract the JSON substring if indices are valid
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      return cleaned.substring(startIndex, endIndex + 1);
  }
  
  return cleaned;
};

export const suggestWorkerProfile = async (role: string, industry: string): Promise<{activities: string, risks: string[]}> => {
    const prompt = `
      Perfil SST para Cargo: "${role}" en Rubro: "${industry}".
      1. Describe las actividades principales (1 párrafo).
      2. Lista 10 riesgos específicos (físicos, químicos, ergonómicos, psicosociales).
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        activities: { type: Type.STRING },
                        risks: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                }
            }
        });
        const text = response.text;
        if(!text) return { activities: '', risks: [] };
        return JSON.parse(cleanJson(text));
    } catch (error) {
        return { activities: '', risks: [] };
    }
};

export const generateIRL = async (worker: WorkerData, company?: CompanyProfile): Promise<string> => {
  // Existing implementation remains unchanged
  const companyName = company?.companyName || "[NOMBRE EMPRESA]";
  const customKnowledge = company?.customSSTKnowledge || "";

  const prompt = `
    REDACTAR INFORMACIÓN DE RIESGOS LABORALES (IRL) - ESTÁNDAR DS 44 (2025).
    
    IMPORTANTE: PROHIBIDO MENCIONAR DECRETO SUPREMO 40. CITA ÚNICAMENTE DECRETO SUPREMO 44 Y CÓDIGO DEL TRABAJO.
    
    CONTEXTO DEL TRABAJADOR:
    - Nombre: ${worker.fullName} (RUT: ${worker.rut})
    - Cargo: ${worker.role}
    - Área: ${worker.department}
    - Centro: ${worker.workCenter}
    - Entorno: "${worker.workEnvironment || 'General'}"
    - Riesgos Base: ${worker.risks.join(', ')}

    FORMATO DE SALIDA:
    Código HTML puro usando TABLAS HTML (<table>, <tr>, <td>) para toda la estructura de datos.
    Diseñado para impresión en papel A4.
    
    IMPORTANTE SOBRE FIRMAS:
    NO DIBUJES LÍNEAS DE FIRMA (ej: _________).
    AL FINAL DEL DOCUMENTO, INSERTA UNA TABLA INVISIBLE CON ESTOS DOS MARCADORES HTML EXACTOS:
    <!-- FIRMA_TRABAJADOR_PLACEHOLDER -->
    <!-- FIRMA_RESPONSABLE_PLACEHOLDER -->
    El sistema reemplazará estos marcadores por las firmas digitales.
    
    ESTRUCTURA REQUERIDA:
    
    <div style="font-family: Arial, sans-serif; font-size: 12px; color: #000;">
        <h2 style="text-align:center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 5px;">INFORMACIÓN DE RIESGOS LABORALES (IRL)</h2>
        <p style="text-align:center; font-size: 10px; color: #666; margin-bottom: 20px;">Cumplimiento Decreto Supremo N° 44 (Gestión SST) / Código del Trabajo Art. 184</p>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">1.0 ANTECEDENTES GENERALES</div>
        <table width="100%" style="border-collapse: collapse; border: 1px solid #ccc; margin-bottom: 15px;">
          <tr>
              <td style="border: 1px solid #ccc; padding: 4px; background-color: #f9fafb; font-weight: bold;">NOMBRE</td>
              <td style="border: 1px solid #ccc; padding: 4px;">${worker.fullName}</td>
              <td style="border: 1px solid #ccc; padding: 4px; background-color: #f9fafb; font-weight: bold;">RUT</td>
              <td style="border: 1px solid #ccc; padding: 4px;">${worker.rut}</td>
          </tr>
          <tr>
              <td style="border: 1px solid #ccc; padding: 4px; background-color: #f9fafb; font-weight: bold;">CARGO</td>
              <td style="border: 1px solid #ccc; padding: 4px;">${worker.role}</td>
              <td style="border: 1px solid #ccc; padding: 4px; background-color: #f9fafb; font-weight: bold;">FECHA</td>
              <td style="border: 1px solid #ccc; padding: 4px;">${new Date().toLocaleDateString()}</td>
          </tr>
        </table>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">2.0 MARCO LEGAL</div>
        <p style="text-align: justify; margin-bottom: 10px;">El presente documento acredita que el trabajador ha sido instruido sobre los peligros y riesgos inherentes a sus labores, las medidas preventivas y los métodos de trabajo correctos, dando cumplimiento a la obligación establecida en el artículo 21 del Decreto Supremo N° 44 (que actualiza las disposiciones sobre el derecho a saber) y el artículo 184 del Código del Trabajo.</p>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">3.0 RIESGOS INHERENTES Y MEDIDAS DE CONTROL</div>
        <p style="font-style: italic; margin-bottom: 5px; font-size: 11px;">Entorno: ${worker.workEnvironment}</p>
        <table width="100%" style="border-collapse: collapse; border: 1px solid #666; margin-bottom: 15px;">
          <thead>
              <tr style="background-color: #e5e7eb;">
                  <th style="border: 1px solid #666; padding: 5px; text-align: left;">PELIGRO / RIESGO</th>
                  <th style="border: 1px solid #666; padding: 5px; text-align: left;">CONSECUENCIA</th>
                  <th style="border: 1px solid #666; padding: 5px; text-align: left;">MEDIDA DE CONTROL (Preventiva)</th>
              </tr>
          </thead>
          <tbody>
             <!-- GENERAR 6 FILAS CON RIESGOS ESPECÍFICOS DEL CARGO EN <tr><td>..</td></tr> -->
          </tbody>
        </table>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">4.0 EPP REQUERIDOS</div>
        <table width="100%" style="margin-bottom: 15px;">
             <!-- LISTAR EPP EN UNA TABLA DE 2 COLUMNAS -->
        </table>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">5.0 PROCEDIMIENTOS Y PROTOCOLOS</div>
        <div style="margin-bottom: 15px;">
          <p style="font-weight: bold;">Protocolos MINSAL aplicables:</p>
          <ul>
             <!-- Listar PREXOR, TMERT, UV, Psicosocial si aplican -->
          </ul>
        </div>
    
        <div style="background-color: #f3f4f6; border-left: 4px solid #000; padding: 5px; font-weight: bold; margin-bottom: 10px;">6.0 EVALUACIÓN DE COMPRENSIÓN</div>
        <table width="100%" style="border-collapse: collapse; border: 1px solid #ccc;">
           <tr><td style="border: 1px solid #ccc; padding: 5px;">1. ¿Entiende que debe usar siempre su EPP?</td><td style="border: 1px solid #ccc; padding: 5px; text-align: center;">V / F</td></tr>
           <tr><td style="border: 1px solid #ccc; padding: 5px;">2. ¿Sabe qué hacer en caso de accidente?</td><td style="border: 1px solid #ccc; padding: 5px; text-align: center;">V / F</td></tr>
           <tr><td style="border: 1px solid #ccc; padding: 5px;">3. ¿Conoce los riesgos de su área?</td><td style="border: 1px solid #ccc; padding: 5px; text-align: center;">V / F</td></tr>
        </table>
        
        <div style="margin-top: 20px; font-size: 10px; color: #666; text-align: justify;">
           Declaro que he recibido, leído y comprendido la información contenida en este documento "Información de Riesgos Laborales (IRL)". Me comprometo a respetar las normas de seguridad y salud en el trabajo.
        </div>

        <table width="100%" style="margin-top: 40px; border-top: 1px solid #eee;">
            <tr>
                <td align="center" width="40%">
                    <!-- FIRMA_TRABAJADOR_PLACEHOLDER -->
                    <p style="font-size: 10px; font-weight: bold; margin-top:5px;">${worker.fullName}</p>
                    <p style="font-size: 9px;">RUT: ${worker.rut}</p>
                    <p style="font-size: 9px;">FIRMA TRABAJADOR</p>
                </td>
                <td width="20%"></td>
                <td align="center" width="40%">
                    <!-- FIRMA_RESPONSABLE_PLACEHOLDER -->
                    <p style="font-size: 10px; font-weight: bold; margin-top:5px;">RESPONSABLE SST</p>
                    <p style="font-size: 9px;">FIRMA EMPLEADOR/EXPERTO</p>
                </td>
            </tr>
        </table>
    </div>
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: { systemInstruction: getSystemInstruction(customKnowledge), temperature: 0.3 }
    });
    return response.text || "Error generando IRL.";
  } catch (error) {
    throw error;
  }
};

export const suggestPTSList = async (role: string, industry: string, activities: string = ""): Promise<{title: string, reason: string}[]> => {
    // Existing implementation remains unchanged
    const prompt = `
        Para un trabajador con cargo "${role}" en la industria "${industry}".
        Contexto Laboral (Actividades): "${activities}".
        Lista 4 Procedimientos de Trabajo Seguro (PTS) CRÍTICOS y obligatorios.
        Devuelve SOLAMENTE un arreglo JSON, sin markdown.
        Ejemplo: [{"title": "Uso de Esmeril Angular", "reason": "Riesgo de corte y proyección"}]
    `;
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: {type: Type.STRING},
                            reason: {type: Type.STRING}
                        }
                    }
                }
            }
        });
        const text = response.text;
        if(!text) return [];
        return JSON.parse(cleanJson(text));
    } catch (e) { 
        console.error("Error PTS List:", e);
        return []; 
    }
};

export const generateSpecificPTS = async (ptsTitle: string, role: string, industry: string, company?: CompanyProfile): Promise<string> => {
    // Existing implementation remains unchanged
    const customKnowledge = company?.customSSTKnowledge || "";
    const prompt = `
        REDACTAR PROCEDIMIENTO DE TRABAJO SEGURO (PTS): "${ptsTitle}".
        CARGO: ${role} | INDUSTRIA: ${industry}
        
        Genera HTML limpio.
        USA MARCADORES DE FIRMA INVISIBLES AL FINAL:
        <!-- FIRMA_TRABAJADOR_PLACEHOLDER -->
        <!-- FIRMA_RESPONSABLE_PLACEHOLDER -->
        NO generes líneas visuales de firma.
        
        ESTRUCTURA:
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #000;">
            <h1 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; text-transform: uppercase;">${ptsTitle}</h1>
            
            <h3 style="background-color: #eee; border-left: 4px solid #0066cc; padding: 5px; margin-top: 20px;">1.0 OBJETIVO</h3>
            <p style="text-align: justify;">Establecer la metodología segura para...</p>
            
            <h3 style="background-color: #eee; border-left: 4px solid #0066cc; padding: 5px; margin-top: 20px;">2.0 EPP REQUERIDO</h3>
            <ul>...</ul>
            
            <h3 style="background-color: #eee; border-left: 4px solid #0066cc; padding: 5px; margin-top: 20px;">3.0 PASO A PASO (METODOLOGÍA)</h3>
            <table width="100%" style="border-collapse: collapse; border: 1px solid #ccc;">
            <thead style="background-color: #ddd;"><tr><th style="border: 1px solid #ccc; padding: 5px;">PASO</th><th style="border: 1px solid #ccc; padding: 5px;">ACCIÓN</th><th style="border: 1px solid #ccc; padding: 5px;">RIESGO/CONTROL</th></tr></thead>
            <tbody>...</tbody>
            </table>
            
            <h3 style="background-color: #eee; border-left: 4px solid #0066cc; padding: 5px; margin-top: 20px;">4.0 EMERGENCIAS</h3>
            <p style="text-align: justify;">...</p>
            
            <table width="100%" style="margin-top: 40px;">
                <tr>
                    <td align="center" width="50%">
                        <!-- FIRMA_TRABAJADOR_PLACEHOLDER -->
                        <p style="font-size: 10px; font-weight: bold;">FIRMA TOMA DE CONOCIMIENTO</p>
                    </td>
                    <td align="center" width="50%">
                        <!-- FIRMA_RESPONSABLE_PLACEHOLDER -->
                        <p style="font-size: 10px; font-weight: bold;">FIRMA APROBACIÓN</p>
                    </td>
                </tr>
            </table>
        </div>
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { systemInstruction: getSystemInstruction(customKnowledge), temperature: 0.4 }
        });
        return response.text || "Error";
    } catch (e) { return "Error"; }
};

export const generateIPER = async (industry: string, role: string, workCenter: string, activities: string, customKnowledge?: string): Promise<IPERRow[]> => {
  const prompt = `
    ACTÚA COMO UN EXPERTO EN PREVENCIÓN DE RIESGOS AUDITOR (ISP CHILE).
    Genera una MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS (IPER) según DS 44 (2024) y ANEXO N°6 GUÍA ISP.
    
    CONTEXTO:
    - Cargo: "${role}"
    - Rubro: "${industry}"
    - Centro: "${workCenter}"
    - ACTIVIDADES DESCRITAS: "${activities}"

    INSTRUCCIONES CLAVE DE CONTENIDO:
    1. ANALISIS COMPLETO: Desglosa las "ACTIVIDADES" en todos sus PROCESOS y TAREAS constitutivas (operativas, de mantenimiento, administrativas, etc.).
    2. IDENTIFICACIÓN TOTAL: Para cada tarea identificada, lista TODOS los peligros (GEMA) y riesgos asociados (Seguridad, Higiene, Psicosocial).
    3. NO LIMITES LA CANTIDAD ARBITRARIAMENTE: Cubre toda la operación descrita en las actividades, pero sé conciso en las descripciones de las medidas para optimizar el espacio.
    4. JERARQUÍA DE CONTROLES:
       - Ingeniería: Barreras duras.
       - Administrativas: Procedimientos y capacitación.
       - EPP: Elemento técnico específico.
    
    ESTRUCTURA DE RESPUESTA JSON REQUERIDA (ARRAY DE OBJETOS):
    [
      {
        "proceso": "String (Ej: Montaje)",
        "tarea": "String (Ej: Izaje de carga)",
        "tipo": "String (Rutinaria / No Rutinaria)",
        "peligro": "String (Fuente)",
        "riesgo": "String (Consecuencia)",
        "probabilidad": Number (1, 2 o 4),
        "consecuencia": Number (1, 2 o 4),
        "medidasIngenieria": "String",
        "medidasAdministrativas": "String",
        "medidasEPP": "String",
        "responsable": "String"
      }
    ]
    
    DEVUELVE SOLO EL JSON PURO. SIN MARKDOWN.
  `;

  // Retry Logic for 500 Errors
  for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { 
                systemInstruction: getSystemInstruction(customKnowledge),
                responseMimeType: "application/json",
                temperature: 0.2, // Reduced temperature for stability
            }
        });
        const text = response.text;
        if (!text) throw new Error("Empty response");
        
        // Safety Try-Catch for JSON Parsing
        try {
            const rows = JSON.parse(cleanJson(text)) as any[];
            
            return rows.map(row => {
                // Enforce Valid Scales
                const validValues = [1, 2, 4];
                const rawP = Number(row.probabilidad);
                const rawC = Number(row.consecuencia);
                
                let p: 1 | 2 | 4 = validValues.includes(rawP) ? (rawP as 1 | 2 | 4) : 2;
                let c: 1 | 2 | 4 = validValues.includes(rawC) ? (rawC as 1 | 2 | 4) : 2;
                
                const mag = p * c;
                let nivel: 'Tolerable' | 'Moderado' | 'Importante' | 'Intolerable' = 'Tolerable';
                if (mag === 4) nivel = 'Moderado';
                else if (mag === 8) nivel = 'Importante';
                else if (mag >= 16) nivel = 'Intolerable';
                else nivel = 'Tolerable'; // 1 or 2

                // Helper to ensure clean string
                const cleanStr = (val: any) => {
                    if(Array.isArray(val)) return val.join(', ');
                    if(typeof val === 'object') return JSON.stringify(val);
                    return String(val || '');
                };
                
                const rawTipo = cleanStr(row.tipo || "Rutinaria");
                // Ensure strictly typed string for tipo
                const tipo: 'Rutinaria' | 'No Rutinaria' = rawTipo.toLowerCase().includes('no') ? 'No Rutinaria' : 'Rutinaria';

                return {
                    id: Date.now().toString() + Math.random().toString().slice(2,6),
                    date: new Date().toLocaleDateString(),
                    cargo: role,
                    proceso: cleanStr(row.proceso || "Proceso"),
                    tarea: cleanStr(row.tarea || "Tarea"),
                    tipo: tipo,
                    peligro: cleanStr(row.peligro || "Peligro"),
                    riesgo: cleanStr(row.riesgo || "Riesgo"),
                    probabilidad: p,
                    consecuencia: c,
                    magnitud: mag,
                    nivel: nivel,
                    medidasIngenieria: cleanStr(row.medidasIngenieria || "N/A"),
                    medidasAdministrativas: cleanStr(row.medidasAdministrativas || "Procedimiento de trabajo"),
                    medidasEPP: cleanStr(row.medidasEPP || "EPP Básico"),
                    responsable: cleanStr(row.responsable || "Supervisor"),
                    plazo: "Permanente"
                };
            });
        } catch (parseError) {
            console.error("JSON Parse Error on IPER generation:", parseError);
            if (attempt === 2) return [];
        }

      } catch (error) { 
        console.error(`Attempt ${attempt} failed:`, error);
        if (attempt === 2) return []; 
      }
  }
  return [];
};

export const generateIPERDocumentHTML = (rows: IPERRow[], worker: WorkerData): string => {
    // Existing implementation remains unchanged
    const date = new Date().toLocaleDateString();
    const tableRows = rows.map(r => `
        <tr style="page-break-inside: avoid; page-break-after: auto;">
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;">${r.proceso}</td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;">${r.tarea} <br/><span style="font-size: 6px; color: #555;">(${r.tipo === 'Rutinaria' ? 'R' : 'NR'})</span></td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;"><strong>${r.peligro}</strong></td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;">${r.riesgo}</td>
            <td style="padding: 2px; border: 1px solid #000; vertical-align: middle; text-align: center;">${r.probabilidad}</td>
            <td style="padding: 2px; border: 1px solid #000; vertical-align: middle; text-align: center;">${r.consecuencia}</td>
            <td style="padding: 2px; border: 1px solid #000; vertical-align: middle; text-align: center; font-weight: bold; background-color: ${
                r.nivel === 'Intolerable' ? '#fee2e2' : 
                r.nivel === 'Importante' ? '#ffedd5' :
                r.nivel === 'Moderado' ? '#fef9c3' : '#dcfce7'
            }">${r.magnitud}<br/><span style="font-size: 6px;">${r.nivel.substring(0,3).toUpperCase()}</span></td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;">
                <div style="margin-bottom: 2px;"><strong style="font-size: 6px;">ING:</strong> ${r.medidasIngenieria}</div>
                <div><strong style="font-size: 6px;">ADM:</strong> ${r.medidasAdministrativas}</div>
            </td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top;">${r.medidasEPP}</td>
            <td style="padding: 2px 3px; border: 1px solid #000; vertical-align: top; text-align: center;">${r.responsable}</td>
        </tr>
    `).join('');

    return `
        <style>
            @media print {
                @page { size: landscape; margin: 5mm; }
                body { -webkit-print-color-adjust: exact; margin: 0; padding: 0; }
                .iper-container { width: 100%; max-width: 100%; }
                table { page-break-inside: auto; table-layout: fixed; width: 100%; }
                tr { page-break-inside: avoid; page-break-after: auto; }
                td, th { word-wrap: break-word; overflow-wrap: break-word; }
            }
            .iper-container {
                font-family: Arial, sans-serif; 
                font-size: 8px; /* Reduced font size for fit */
                color: #000; 
                padding: 5px; 
                width: 100%; 
                background: #fff;
                box-sizing: border-box;
            }
            .iper-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 7px; /* Very compact font for data */
                table-layout: fixed; /* Critical for fixed column widths */
            }
            .iper-table th {
                border: 1px solid #000;
                padding: 3px;
                background-color: #e5e7eb;
                text-align: center;
                font-weight: bold;
                font-size: 7px;
            }
            .iper-table td {
                border: 1px solid #000;
                padding: 2px 3px;
            }
        </style>

        <div class="iper-container">
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 5px; table-layout: fixed;">
                <tr>
                    <td width="15%" style="border: 1px solid #000; padding: 5px; text-align: center;">
                        <div style="font-size: 12px; font-weight: bold; color: #555;">LOGO</div>
                    </td>
                    <td width="65%" style="border: 1px solid #000; padding: 5px; text-align: center;">
                        <h2 style="margin: 0; font-size: 12px; text-transform: uppercase;">Matriz de Identificación de Peligros y Evaluación de Riesgos (IPER)</h2>
                        <p style="margin: 2px 0 0 0; font-size: 8px;">DECRETO SUPREMO N° 44 (2024) / GUÍA TÉCNICA ISP</p>
                    </td>
                    <td width="20%" style="border: 1px solid #000; padding: 2px;">
                        <table width="100%" style="border: none; font-size: 7px;">
                            <tr><td><strong>CÓDIGO:</strong> REG-SST-IPER-001</td></tr>
                            <tr><td><strong>VERSIÓN:</strong> 01</td></tr>
                            <tr><td><strong>FECHA:</strong> ${date}</td></tr>
                            <tr><td><strong>PÁGINA:</strong> 1 de 1</td></tr>
                        </table>
                    </td>
                </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-bottom: 5px; background-color: #f8f9fa; font-size: 8px; table-layout: fixed;">
                <tr>
                    <td width="10%" style="padding: 3px; border: 1px solid #000; font-weight: bold;">CARGO:</td>
                    <td width="40%" style="padding: 3px; border: 1px solid #000;">${worker.role}</td>
                    <td width="10%" style="padding: 3px; border: 1px solid #000; font-weight: bold;">CENTRO:</td>
                    <td width="40%" style="padding: 3px; border: 1px solid #000;">${worker.workCenter}</td>
                </tr>
            </table>

            <table class="iper-table">
                <colgroup>
                    <col style="width: 8%;">
                    <col style="width: 8%;">
                    <col style="width: 10%;">
                    <col style="width: 12%;">
                    <col style="width: 3%;">
                    <col style="width: 3%;">
                    <col style="width: 4%;">
                    <col style="width: 32%;">
                    <col style="width: 14%;">
                    <col style="width: 6%;">
                </colgroup>
                <thead>
                    <tr>
                        <th>PROCESO</th>
                        <th>TAREA</th>
                        <th>PELIGRO (FUENTE)</th>
                        <th>RIESGO (INCIDENTE)</th>
                        <th>P</th>
                        <th>C</th>
                        <th>MR</th>
                        <th>MEDIDAS DE CONTROL (Jerarquía)</th>
                        <th>EPP</th>
                        <th>RESP.</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            
             <table style="width: 100%; margin-top: 20px; border-collapse: collapse; border: 1px solid #000; page-break-inside: avoid; table-layout: fixed;">
                <tr>
                    <td align="center" width="33%" style="padding: 15px 5px 5px 5px; border-right: 1px solid #000;">
                        <div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 3px;"></div>
                        <p style="font-weight: bold; margin: 0; font-size: 7px;">ELABORADO POR</p>
                        <p style="margin: 0; font-size: 7px;">Experto en Prevención</p>
                    </td>
                    <td align="center" width="33%" style="padding: 15px 5px 5px 5px; border-right: 1px solid #000;">
                        <div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 3px;"></div>
                        <p style="font-weight: bold; margin: 0; font-size: 7px;">REVISADO POR</p>
                        <p style="margin: 0; font-size: 7px;">Comité Paritario (CPHS)</p>
                    </td>
                    <td align="center" width="34%" style="padding: 15px 5px 5px 5px;">
                        <div style="border-bottom: 1px solid #000; width: 80%; margin-bottom: 3px;"></div>
                        <p style="font-weight: bold; margin: 0; font-size: 7px;">APROBADO POR</p>
                        <p style="margin: 0; font-size: 7px;">Gerencia General</p>
                    </td>
                </tr>
            </table>
        </div>
    `;
};

export const generateTrainingPlan = async (role: string, industry: string, risks: string[]): Promise<AnnualTrainingPlan | null> => {
    // Existing code remains...
    const prompt = `
        Genera un Plan Anual de Capacitación SST para el cargo: "${role}" en rubro "${industry}".
        Riesgos detectados: ${risks.join(', ')}.
        
        Devuelve JSON con la estructura:
        {
            "year": 2025,
            "role": "${role}",
            "diagnosis": "Resumen breve...",
            "totalHours": 40,
            "budgetEstimate": "20 UF",
            "sessions": [
                {
                    "id": "1", "topic": "Uso de Extintores", "objective": "Aprender PASS", 
                    "duration": 2, "modality": "Presencial", "month": "Marzo", 
                    "status": "Programada", "instructor": "Bomberos"
                },
                ... (Generar 6 sesiones clave)
            ]
        }
    `;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return null;
        return JSON.parse(cleanJson(text));
    } catch (e) {
        console.error("Training Plan Error:", e);
        return null;
    }
};

export const generateInteractiveTrainingContent = async (topic: string, role: string): Promise<InteractiveModule | null> => {
    // UPDATED PROMPT: Strict 8 Slides + Visual Content (SVG) + General/Specific mix
    const prompt = `
        Crea una PRESENTACIÓN DE CAPACITACIÓN SST interactiva para: "${topic}".
        Dirigida a: ${role}.
        
        REGLAS ESTRICTAS:
        1. Genera EXACTAMENTE 8 DIAPOSITIVAS (Slides).
        2. ESTRUCTURA DEL CONTENIDO:
           - Diapositivas 1-3: Conceptos Generales y Teóricos sobre "${topic}" (Universal para cualquier trabajador).
           - Diapositivas 4-7: Riesgos y Medidas Específicas aplicadas al cargo de "${role}".
           - Diapositiva 8: Procedimiento de Emergencia y conclusiones.
        3. GENERACIÓN DE INFOGRAFÍAS (SVG):
           - Para CADA diapositiva, en el campo "visualContent", genera CÓDIGO SVG (<svg>...</svg>) que ilustre el concepto de forma esquemática y moderna (estilo flat design, colores profesionales).
           - El SVG debe ser simple pero claro (iconos, esquemas, señales de prohibición/obligación).
           - NO uses texto dentro del SVG, solo gráficos.
        4. Genera un QUIZ (Evaluación) de 5 preguntas al final.
        
        Estructura JSON requerida:
        {
            "title": "${topic}",
            "introduction": "Bienvenida breve (2 líneas) explicando la importancia del curso.",
            "slides": [
                {
                    "title": "Título Slide 1", 
                    "content": "Explicación teórica...", 
                    "emoji": "📋",
                    "visualContent": "<svg viewBox='0 0 100 100'>...</svg>"
                },
                ... (hasta 8)
            ],
            "infographic": [
                {"step": 1, "title": "Paso 1", "description": "Acción simple"},
                {"step": 2, "title": "Paso 2", "description": "Acción simple"},
                {"step": 3, "title": "Paso 3", "description": "Acción simple"}
            ],
            "quiz": [
                {"question": "¿Pregunta 1?", "options": ["A", "B", "C"], "correctIndex": 0},
                ...
            ]
        }
    `;
    
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text;
        if (!text) return null;
        return JSON.parse(cleanJson(text));
    } catch (e) {
        console.error("Interactive Content Error:", e);
        return null;
    }
};

export const chatWithSSTExpert = async (history: {role: 'user' | 'model', parts: {text: string}[]}[], newMessage: string): Promise<string> => {
    try {
        const chat = ai.chats.create({
            model: MODEL_NAME,
            config: {
                systemInstruction: getSystemInstruction(),
            },
            history: history
        });
        const result = await chat.sendMessage(newMessage);
        return result.text;
    } catch (e) {
        console.error("Chat Error", e);
        return "Lo siento, tuve un problema técnico. Intenta de nuevo.";
    }
};
