
const ID_HOJA = SpreadsheetApp.getActiveSpreadsheet().getId();
const DEFAULT_ROOT_FOLDER_NAME = "SST_Documentos_2025";
const COURSES_FOLDER_NAME = "SST_Cursos_Generados";

const SHEET_WORKERS = "Trabajadores";
const SHEET_ADMINS = "Administradores"; 
const SHEET_DOCS = "Documentos_Generados";
const SHEET_IPER = "Historial_IPER";
const SHEET_TRAINING = "Plan_Capacitacion";
const SHEET_EPP = "Registro_EPP";
const SHEET_ASSIGNMENTS = "Asignaciones_Capacitacion";

// Encabezados Oficiales IPER (17 Columnas)
const IPER_HEADERS = [
    "FECHA", "CARGO", "PROCESO", "TAREA", "TIPO_TAREA", "PELIGRO", "RIESGO", 
    "PROBABILIDAD", "CONSECUENCIA", "MAGNITUD", "NIVEL", 
    "MED_INGENIERIA", "MED_ADMIN", "MED_EPP", "RESPONSABLE", "PLAZO", "METADATA_JSON"
];

function setupSheets() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  
  if (!ss.getSheetByName(SHEET_WORKERS)) {
      ss.insertSheet(SHEET_WORKERS).appendRow(["ID", "ESTADO", "NOMBRE_COMPLETO", "RUT", "EMAIL", "TELEFONO", "FECHA_INGRESO", "CARGO", "DEPARTAMENTO", "CENTRO_TRABAJO", "UBICACION", "MODALIDAD", "TURNOS", "RUBRO", "RIESGOS", "CONDICION_ESPECIAL", "ENTORNO_TRABAJO", "PASSWORD"]);
  }
  
  if (!ss.getSheetByName(SHEET_ADMINS)) {
      const adminSheet = ss.insertSheet(SHEET_ADMINS);
      adminSheet.appendRow(["EMAIL", "PASSWORD", "NOMBRE"]);
      adminSheet.appendRow(["admin@empresa.cl", "admin123", "Administrador Principal"]);
  }

  if (!ss.getSheetByName(SHEET_DOCS)) ss.insertSheet(SHEET_DOCS).appendRow(["FECHA", "TIPO", "CATEGORIA", "TITULO", "TRABAJADOR", "CENTRO", "URL_PDF"]);
  
  // La lógica de IPER se ha movido a una función auxiliar dedicada
  ensureIPERColumns(ss);

  if (!ss.getSheetByName(SHEET_TRAINING)) ss.insertSheet(SHEET_TRAINING).appendRow(["ID_SESION", "CARGO", "TEMA", "OBJETIVO", "DURACION", "MES", "ESTADO", "INSTRUCTOR"]);
  
  if (!ss.getSheetByName(SHEET_EPP)) {
      ss.insertSheet(SHEET_EPP).appendRow(["ID", "WORKER_ID", "WORKER_NAME", "FECHA", "TIPO", "ITEMS", "MOTIVO", "FIRMA_BASE64", "URL_PDF"]);
  }
  
  let sheetAssign = ss.getSheetByName(SHEET_ASSIGNMENTS);
  if (!sheetAssign) {
      sheetAssign = ss.insertSheet(SHEET_ASSIGNMENTS);
      sheetAssign.appendRow(["ID", "WORKER_ID", "WORKER_NAME", "TEMA", "FUENTE", "ESTADO", "FECHA_ASIGNACION", "NOTA", "CONTENIDO_JSON", "RESPUESTAS"]);
  }
}

// Nueva función dedicada para forzar la estructura de la matriz
function ensureIPERColumns(ss) {
  let sheetIPER = ss.getSheetByName(SHEET_IPER);
  if (!sheetIPER) {
      sheetIPER = ss.insertSheet(SHEET_IPER);
      sheetIPER.appendRow(IPER_HEADERS);
  } else {
      // Verificar si faltan columnas y agregarlas
      const currentMaxCols = sheetIPER.getMaxColumns();
      if (currentMaxCols < IPER_HEADERS.length) {
          sheetIPER.insertColumnsAfter(currentMaxCols, IPER_HEADERS.length - currentMaxCols);
      }
      // Actualizar encabezados para asegurar que coincidan
      sheetIPER.getRange(1, 1, 1, IPER_HEADERS.length).setValues([IPER_HEADERS]);
  }
  return sheetIPER;
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);
  try {
    // AUTO-REPAIR: Check if critical sheets exist
    const ss = SpreadsheetApp.openById(ID_HOJA);
    if(!ss.getSheetByName(SHEET_WORKERS) || !ss.getSheetByName(SHEET_ASSIGNMENTS)) {
        setupSheets();
    }

    const data = JSON.parse(e.postData.contents);
    const type = data.type;
    const payload = data.payload;

    if (type === 'DOCUMENT') return handleDocumentUpload(payload);
    if (type === 'WORKER') return saveWorker(payload);
    if (type === 'DELETE_WORKER') return deleteWorker(payload);
    if (type === 'ADMIN') return saveAdmin(payload);
    if (type === 'DELETE_ADMIN') return deleteAdmin(payload);
    if (type === 'IPER') return saveIPER(payload);
    if (type === 'TRAINING_PLAN') return saveTrainingPlan(payload);
    if (type === 'UPDATE_TRAINING_STATUS') return updateTrainingStatus(payload);
    if (type === 'EPP_TRANSACTION') return saveEPPTransaction(payload);
    if (type === 'SAVE_ASSIGNMENT') return saveAssignment(payload);
    if (type === 'SAVE_ASSIGNMENTS_BULK') return saveAssignmentsBulk(payload); // New Handler
    if (type === 'UPDATE_ASSIGNMENT_STATUS') return updateAssignmentStatus(payload);

    return responseJSON({status: 'success'});
  } catch (error) {
    return responseJSON({status: 'error', message: error.toString()});
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  try {
    // AUTO-REPAIR: Check if critical sheets exist on load
    const ss = SpreadsheetApp.openById(ID_HOJA);
    if(!ss.getSheetByName(SHEET_WORKERS) || !ss.getSheetByName(SHEET_ASSIGNMENTS)) {
        setupSheets();
    }

    const type = e.parameter.type;
    if (type === 'GET_WORKERS') return getWorkers();
    if (type === 'GET_ADMINS') return getAdmins();
    if (type === 'GET_DOCUMENTS') return getDocuments();
    if (type === 'GET_IPER') return getIPER();
    if (type === 'GET_TRAINING_PLANS') return getTrainingPlans();
    if (type === 'GET_EPP_HISTORY') return getEPPHistory(e.parameter.workerId);
    if (type === 'GET_ASSIGNMENTS') return getAssignments();
    if (type === 'GET_ASSIGNMENT_CONTENT') return getAssignmentContent(e.parameter.id);
    
    return responseJSON({status: 'error', message: 'Invalid Type'});
  } catch (error) {
    return responseJSON({status: 'error', message: error.toString()});
  }
}

function responseJSON(data) { 
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON); 
}

// --- HELPERS PARA DRIVE ---
function getOrCreateFolder(parent, name) {
  let folders = parent ? parent.getFoldersByName(name) : DriveApp.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : (parent ? parent.createFolder(name) : DriveApp.createFolder(name));
}

function saveCourseContentToDrive(assignmentId, courseTitle, contentObj) {
    try {
        const root = getOrCreateFolder(null, DEFAULT_ROOT_FOLDER_NAME);
        const coursesFolder = getOrCreateFolder(root, COURSES_FOLDER_NAME);
        
        const fileName = `CURSO_${assignmentId}_${courseTitle.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
        const contentStr = JSON.stringify(contentObj);
        
        // Check if exists to update, else create
        const files = coursesFolder.getFilesByName(fileName);
        let file;
        if (files.hasNext()) {
            file = files.next();
            file.setContent(contentStr);
        } else {
            file = coursesFolder.createFile(fileName, contentStr, MimeType.PLAIN_TEXT);
        }
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return file.getId(); // Return ID to save in sheet
    } catch (e) {
        throw new Error("Error saving course to Drive: " + e.toString());
    }
}

// --- TRABAJADORES ---
function getWorkers() {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_WORKERS);
  if (!sheet) return responseJSON([]);
  const data = sheet.getDataRange().getValues().slice(1);
  const cleanData = data.filter(r => r[0] !== ""); 
  return responseJSON(cleanData.map(r => ({
    id: String(r[0]), status: r[1], fullName: r[2], rut: r[3], email: r[4], phone: r[5],
    entryDate: r[6], role: r[7], department: r[8], workCenter: r[9], location: r[10],
    modality: r[11], shifts: r[12]?String(r[12]).split(','):[], industry: r[13], risks: r[14]?String(r[14]).split(','):[],
    specialCondition: r[15], workEnvironment: r[16],
    password: r[17]
  })));
}

function saveWorker(w) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_WORKERS);
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) if (String(data[i][0]) === String(w.id)) rowIndex = i + 1;
  
  const row = [
    w.id, w.status, w.fullName, w.rut, w.email, w.phone, 
    w.entryDate, w.role, w.department, w.workCenter, w.location, 
    w.modality, w.shifts.join(','), w.industry, w.risks.join(','), 
    w.specialCondition, w.workEnvironment, 
    w.password 
  ];
  
  if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  else sheet.appendRow(row);
  return responseJSON({status: 'success'});
}

function deleteWorker(p) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_WORKERS);
  const data = sheet.getDataRange().getValues();
  for (let i=1; i<data.length; i++) if(String(data[i][0])===String(p.id)) { sheet.deleteRow(i+1); return responseJSON({status:'success'}); }
  return responseJSON({status:'error'});
}

// --- ADMINISTRADORES ---
function getAdmins() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  let sheet = ss.getSheetByName(SHEET_ADMINS);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(SHEET_ADMINS); }
  
  const data = sheet.getDataRange().getValues().slice(1);
  const cleanData = data.filter(r => r[0] !== "");
  
  return responseJSON(cleanData.map(r => ({
    email: r[0],
    password: r[1],
    name: r[2]
  })));
}

function saveAdmin(admin) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ADMINS);
  if(!sheet) return responseJSON({status:'error', message:'Sheet not found'});
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for(let i=1; i<data.length; i++) {
    if(String(data[i][0]).toLowerCase() === String(admin.email).toLowerCase()) {
      rowIndex = i+1;
      break;
    }
  }
  const row = [admin.email, admin.password, admin.name];
  if(rowIndex > 0) {
     sheet.getRange(rowIndex, 1, 1, 3).setValues([row]);
  } else {
     sheet.appendRow(row);
  }
  return responseJSON({status:'success'});
}

function deleteAdmin(payload) {
   const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ADMINS);
   const data = sheet.getDataRange().getValues();
   for(let i=1; i<data.length; i++) {
     if(String(data[i][0]).toLowerCase() === String(payload.email).toLowerCase()) {
       sheet.deleteRow(i+1);
       return responseJSON({status:'success'});
     }
   }
   return responseJSON({status:'error'});
}

// --- ASIGNACIONES ---
function getAssignments() {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ASSIGNMENTS);
  if (!sheet) return responseJSON([]);
  const allData = sheet.getDataRange().getValues();
  const data = allData.slice(1);
  return responseJSON(data.map(r => {
    let answers = [];
    try { if(r[9]) answers = JSON.parse(r[9]); } catch(e) {}
    // Check if content column (index 8) has a File ID or content.
    // If it's a Drive ID (approx 33 chars) or a raw JSON string.
    const contentRef = r[8];
    const hasContent = !!(contentRef && contentRef.length > 5);
    
    return {
        id: String(r[0]), workerId: String(r[1]), workerName: r[2] || "", topic: r[3] || "", 
        source: r[4] || "MANUAL", status: r[5] || "Pendiente", assignedDate: r[6] || "", 
        score: r[7] || 0, hasContent: hasContent, answers: answers
    };
  }).reverse());
}

function getAssignmentContent(id) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ASSIGNMENTS);
  const data = sheet.getDataRange().getValues();
  
  for(let i = 1; i < data.length; i++) {
     if(String(data[i][0]) === String(id)) {
         let contentRef = data[i][8];
         let content = null;
         
         if (!contentRef) return responseJSON({ status: 'error', message: 'No content' });

         try {
             // 1. Try to parse as JSON directly (Legacy support or raw storage)
             if (String(contentRef).trim().startsWith('{')) {
                 content = JSON.parse(contentRef);
             } else {
                 // 2. Assume it's a File ID from Drive
                 const file = DriveApp.getFileById(contentRef);
                 const jsonStr = file.getBlob().getDataAsString();
                 content = JSON.parse(jsonStr);
             }
             return responseJSON({ status: 'success', content: content });
         } catch(e) { 
             return responseJSON({ status: 'error', message: 'Error loading content: ' + e.toString() }); 
         }
     }
  }
  return responseJSON({ status: 'error', message: 'Assignment not found' });
}

function saveAssignment(a) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ASSIGNMENTS);
  
  let contentRef = "";
  if (a.interactiveContent) {
      try {
          // Attempt to save to Drive to keep Sheet clean
          contentRef = saveCourseContentToDrive(a.id, a.topic, a.interactiveContent);
      } catch (e) {
          // Fallback: Store raw JSON in sheet (might hit cell limits)
          contentRef = JSON.stringify(a.interactiveContent);
      }
  }

  sheet.appendRow([
      a.id, 
      a.workerId, 
      a.workerName, 
      a.topic, 
      a.source, 
      a.status, 
      a.assignedDate, 
      a.score || '', 
      contentRef, // Column 9 (Index 8)
      '[]'
  ]);
  
  return responseJSON({status: 'success'});
}

// NEW: Optimized Bulk Save
function saveAssignmentsBulk(assignments) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ASSIGNMENTS);
  if(!assignments || assignments.length === 0) return responseJSON({status:'success'});

  const rows = assignments.map(a => {
      let contentRef = "";
      if (a.interactiveContent) {
          try {
              contentRef = saveCourseContentToDrive(a.id, a.topic, a.interactiveContent);
          } catch (e) {
              contentRef = JSON.stringify(a.interactiveContent);
          }
      } else if (a.contentRef) {
          // If the frontend already saved content separately and passed the ID/Ref
          contentRef = a.contentRef;
      }

      return [
          a.id, 
          a.workerId, 
          a.workerName, 
          a.topic, 
          a.source, 
          a.status, 
          a.assignedDate, 
          a.score || '', 
          contentRef, 
          '[]'
      ];
  });

  // Bulk Append
  if(rows.length > 0) {
      const lastRow = sheet.getLastRow();
      sheet.getRange(lastRow + 1, 1, rows.length, 10).setValues(rows);
  }
  
  return responseJSON({status: 'success'});
}

function updateAssignmentStatus(payload) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_ASSIGNMENTS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      sheet.getRange(i + 1, 6).setValue(payload.status);
      sheet.getRange(i + 1, 8).setValue(payload.score);
      if(payload.answers) sheet.getRange(i + 1, 10).setValue(JSON.stringify(payload.answers)); 
      return responseJSON({status: 'success'});
    }
  }
  return responseJSON({status: 'error'});
}

// --- DOCUMENTOS ---
function getDocuments() {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_DOCS);
  if (!sheet) return responseJSON([]);
  const data = sheet.getDataRange().getValues();
  const sliceData = data.slice(1);
  return responseJSON(sliceData.map(r => ({
    date: r[0], type: r[1], category: r[2], title: r[3], workerName: r[4], workCenter: r[5], url: r[6], content: ""
  })).reverse());
}

// --- IPER (LECTURA Y ESCRITURA ACTUALIZADA) ---
function getIPER() {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheet = ensureIPERColumns(ss);
  
  const allData = sheet.getDataRange().getValues();
  const data = allData.length > 1 ? allData.slice(1) : [];
  
  return responseJSON(data.map(r => {
      const hasFullData = r.length >= 16;
      return {
        date: r[0], 
        cargo: r[1], 
        proceso: r[2], 
        tarea: r[3], 
        tipo: r[4], 
        peligro: r[5], 
        riesgo: r[6], 
        probabilidad: hasFullData ? (Number(r[7]) || 0) : 0, 
        consecuencia: hasFullData ? (Number(r[8]) || 0) : 0, 
        magnitud: hasFullData ? (Number(r[9]) || 0) : 0, 
        nivel: hasFullData ? r[10] : "Pendiente", 
        medidasIngenieria: hasFullData ? r[11] : "", 
        medidasAdministrativas: hasFullData ? r[12] : "", 
        medidasEPP: hasFullData ? r[13] : "", 
        responsable: hasFullData ? r[14] : "", 
        plazo: hasFullData ? r[15] : ""
      };
  }).reverse());
}

function saveIPER(p) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  const sheetRef = ensureIPERColumns(ss);

  const rowsToAdd = p.rows.map(r => [
    p.date || new Date().toLocaleDateString(),
    p.role || "", 
    r.proceso || "", 
    r.tarea || "", 
    r.tipo || "Rutinaria", 
    r.peligro || "", 
    r.riesgo || "", 
    Number(r.probabilidad) || 0,
    Number(r.consecuencia) || 0,
    Number(r.magnitud) || 0,
    r.nivel || "",
    r.medidasIngenieria || "",
    r.medidasAdministrativas || "",
    r.medidasEPP || "",
    r.responsable || "",
    r.plazo || "",
    JSON.stringify(r)
  ]);

  rowsToAdd.forEach(row => sheetRef.appendRow(row));
  SpreadsheetApp.flush();
  return responseJSON({status: 'success'});
}

// --- OTROS ---
function getTrainingPlans() {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_TRAINING);
  if (!sheet) return responseJSON([]);
  const data = sheet.getDataRange().getValues().slice(1);
  return responseJSON(data.map(r => ({
    id: r[0], role: r[1], topic: r[2], objective: r[3], duration: r[4], month: r[5], status: r[6], instructor: r[7]
  })));
}

function saveTrainingPlan(p) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_TRAINING);
  p.rows.forEach(r => sheet.appendRow([r.id, p.role, r.topic, r.objective, r.duration, r.month, r.status, r.instructor]));
  return responseJSON({status: 'success'});
}

function updateTrainingStatus(payload) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_TRAINING);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(payload.id)) {
      sheet.getRange(i + 1, 7).setValue(payload.status);
      return responseJSON({status: 'success'});
    }
  }
  return responseJSON({status: 'error'});
}

function getEPPHistory(wid) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_EPP);
  if (!sheet) return responseJSON([]);
  const data = sheet.getDataRange().getValues();
  const filtered = data.slice(1).filter(r => String(r[1]) === String(wid));
  return responseJSON(filtered.reverse().map(r => {
      let itemsArray = [];
      if (r[5]) itemsArray = String(r[5]).split(', ').map(i => i.trim()).filter(i => i !== "");
      return {
          id: r[0], workerId: r[1], workerName: r[2], date: r[3], type: r[4], items: itemsArray, 
          motive: r[6], signature: r[7], pdfUrl: r[8] || ""
      };
  }));
}

function saveEPPTransaction(p) {
  const sheet = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_EPP);
  if(!sheet) setupSheets();
  const sheetRef = SpreadsheetApp.openById(ID_HOJA).getSheetByName(SHEET_EPP);
  const itemsStr = Array.isArray(p.items) ? p.items.join(', ') : p.items;
  sheetRef.appendRow([p.id, p.workerId, p.workerName, p.date, p.type, itemsStr, p.motive, p.signature, p.pdfUrl || ""]);
  return responseJSON({status: 'success'});
}

function handleDocumentUpload(docData) {
  const ss = SpreadsheetApp.openById(ID_HOJA);
  let sheet = ss.getSheetByName(SHEET_DOCS);
  if (!sheet) { setupSheets(); sheet = ss.getSheetByName(SHEET_DOCS); }

  const rootFolder = getOrCreateFolder(null, docData.folderName || DEFAULT_ROOT_FOLDER_NAME);
  let currentFolder = rootFolder;
  if (docData.workCenter) currentFolder = getOrCreateFolder(currentFolder, docData.workCenter);
  if (docData.workerName) currentFolder = getOrCreateFolder(currentFolder, docData.workerName);

  const blob = Utilities.newBlob(docData.content, MimeType.HTML, docData.title + ".html");
  const pdfFile = currentFolder.createFile(blob.getAs(MimeType.PDF)).setName(docData.title + ".pdf");
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  sheet.appendRow([new Date(), docData.type, docData.category, docData.title, docData.workerName, docData.workCenter, pdfFile.getUrl()]);
  return responseJSON({ status: 'success', url: pdfFile.getUrl() });
}
