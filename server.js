require("dotenv").config();
const v8 = require("v8");
v8.setFlagsFromString("--max-old-space-size=8192"); // 8GB
const {
  registrarEndpointObtenerEstudios,
} = require("./endpoint_obtener_estudios");

const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Limitar el tamaño del heap de Node.js
const heapSizeLimit = 8192 * 1024 * 1024; // 8GB en bytes
if (process.memoryUsage().heapTotal > heapSizeLimit) {
  console.warn("⚠️  Memoria cerca del límite, forzando garbage collection");
  global.gc();
}

// 1. Agregamos un pequeño caché al inicio del archivo server.js
const cachePacientes = new Map();
const CACHE_EXPIRATION = 1000 * 60 * 10; // 10 minutos

// Garbage collection automático cada 30 segundos
setInterval(() => {
  if (global.gc) {
    global.gc();
    console.log("🧹 Garbage collection ejecutado");
  }
}, 30000);

// ====================================================================
// FUNCIÓN HIPER-OPTIMIZADA PARA GOOGLE SHEETS
// ====================================================================
async function getUltraOptimizedSheetData(sheetIdentifier, filters = {}) {
  if (!doc) throw new Error("Google Sheet not initialized");

  let sheet;
  if (typeof sheetIdentifier === "string")
    sheet = doc.sheetsByTitle[sheetIdentifier];
  else if (typeof sheetIdentifier === "number")
    sheet = doc.sheetsByIndex[sheetIdentifier];

  if (!sheet) {
    console.warn(`Hoja "${sheetIdentifier}" no encontrada`);
    return [];
  }

  // ✅ OPTIMIZACIÓN CRÍTICA: Cargar SOLO las columnas necesarias
  await sheet.loadHeaderRow();
  const rows = await sheet.getRows();

  // Filtrar MUY eficientemente
  return rows
    .filter((row) => {
      if (!filters.dni) return true;
      const rowDni = String(row["DNI"] || row["Documento"] || "").trim();
      return rowDni === String(filters.dni).trim();
    })
    .map((row) => {
      const rowData = {};
      // ✅ Solo incluir campos esenciales
      const essentialFields = [
        "DNI",
        "Documento",
        "Nombre",
        "Apellido",
        "Fecha",
        "Prestador",
        "Resultado",
      ];
      sheet.headerValues.forEach((header) => {
        if (
          essentialFields.includes(header) ||
          header.includes("Link") ||
          header.includes("PDF")
        ) {
          rowData[header] = row[header] || "";
        }
      });
      return rowData;
    });
}

// Manejo de errores no capturados
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const express = require("express");
const path = require("path");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const { google } = require("googleapis");
const app = express();
const PORT = process.env.PORT || 3000;
const SPREADSHEET_ID = "15YPfBG9PBfN3nBW5xXJYjIXEgYIS9z71pI0VpeCtAAU";
const API_BASE_URL =
  process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

app.get("/cierre-formulario.html", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "cierre-formulario.html"));
});
app.get("/cierre-formulario.js", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cierre-formulario.js"));
});
app.get("/consultas.html", (req, res) => {
  res.sendFile(path.join(__dirname, "private", "consultas.html"));
});
// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static("public")); // Sirve archivos estáticos desde la carpeta 'public'

// Nueva ruta para que el frontend obtenga la URL base de la API
app.get("/api/config", (req, res) => {
  res.json({ apiBaseUrl: API_BASE_URL });
});

// --- VARIABLES GLOBALES ---
let doc;
let credentials;

app.post("/api/enfermeria/guardar", async (req, res) => {
  try {
    const newRow = req.body;
    newRow["Fecha_cierre_Enf"] = new Date().toLocaleDateString("es-AR");

    // 1. Guardar en Google Sheets
    const sheet = doc.sheetsByTitle["Enfermeria"];
    if (!sheet) {
      return res
        .status(500)
        .json({ message: 'Hoja "Enfermeria" no encontrada.' });
    }
    await sheet.addRow(newRow);

    // 2. Guardar en Supabase
    const { error } = await supabase.from("enfermeria_consultas").insert({
      dni: newRow["DNI"],
      nombre: newRow["Nombre"],
      apellido: newRow["Apellido"],
      altura_cm: newRow["Altura (cm)"],
      peso_kg: newRow["Peso (kg)"],
      circunferencia_cintura_cm: newRow["Circunferencia de cintura (cm)"],
      presion_arterial: newRow["Presion Arterial (mmhg)"],
      vacunas: newRow["Vacunas"],
      agudeza_visual: newRow["Agudeza Visual"],
      espirometria_pdf: newRow["Espirometria (Enlace a PDF)"],
      fecha_cierre_enf: newRow["Fecha_cierre_Enf"],
      nombre_enfermera: newRow["Nombre Enfermera"],
    });

    if (error) console.error("Error Supabase enfermería:", error);
    else
      console.log(
        "✅ Enfermería guardada en Supabase para DNI:",
        newRow["DNI"],
      );

    res.status(200).json({ message: "Datos guardados correctamente." });
  } catch (error) {
    console.error("Error al guardar datos de enfermería:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
});

// Función para inicializar el documento de Google Sheet y cargar su información (SOLO UNA VEZ)
async function initializeGoogleSheet() {
  try {
    doc = new GoogleSpreadsheet(SPREADSHEET_ID);

    if (process.env.CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.CREDENTIALS_JSON);
    } else {
      credentials = require("./credentials.json");
    }

    await doc.useServiceAccountAuth({
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
    });
    await doc.loadInfo();
    console.log("✅ Google Sheet document loaded successfully.");
  } catch (error) {
    console.error("❌ Error initializing Google Sheet document:", error);
    throw error; // Re-lanza el error para que el servidor no arranque si falla la conexión
  }
}

// Función para obtener todos los datos de una hoja específica (por nombre o índice)
// Usaremos esta función para ambas: la hoja principal y las hojas de estudios.
async function getDataFromSpecificSheet(sheetIdentifier) {
  // sheetIdentifier puede ser el nombre o el índice
  if (!doc) {
    throw new Error(
      "Google Sheet document not initialized. Call initializeGoogleSheet() first.",
    );
  }
  try {
    let sheet;
    if (typeof sheetIdentifier === "string") {
      sheet = doc.sheetsByTitle[sheetIdentifier]; // Busca por nombre
    } else if (typeof sheetIdentifier === "number") {
      sheet = doc.sheetsByIndex[sheetIdentifier]; // Busca por índice
    }

    if (!sheet) {
      console.warn(`Hoja "${sheetIdentifier}" no encontrada en el documento.`);
      return [];
    }

    await sheet.loadHeaderRow(); // Carga la fila de encabezados de esta hoja
    const rows = await sheet.getRows(); // Obtiene todas las filas de datos

    const allData = rows.map((row) => {
      const rowData = {};
      sheet.headerValues.forEach((header) => {
        // Maneja valores nulos o indefinidos, devolviendo una cadena vacía
        rowData[header] = row[header] || "";
      });
      return rowData;
    });
    return allData;
  } catch (error) {
    console.error(
      `Error al leer la hoja de cálculo "${sheetIdentifier}":`,
      error,
    );
    throw error; // Re-lanza el error para que sea manejado por la ruta que la llamó
  }
}

async function uploadFileToDrive(fileBuffer, fileName, mimeType) {
  const FOLDER_ID = "1JhWxc3eFhZaT3edEjiUM-vHY4Y9MgVy-";

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n"),
    },
    // The scopes must be changed to allow writing to shared folders.
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const drive = google.drive({ version: "v3", auth });
  const fileStream = streamifier.createReadStream(fileBuffer);

  const fileMetadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: mimeType,
    body: fileStream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, webViewLink",
  });

  return response.data.webViewLink;
}

// ====================================================================
// RUTAS EXISTENTES - ADAPTADAS PARA USAR EL OBJETO 'doc' GLOBAL
// Y la nueva función 'getDataFromSpecificSheet'
// ====================================================================

// Ruta para obtener todos los campos (para el selector), excluyendo los de observaciones
app.get("/obtener-campos", async (req, res) => {
  try {
    // Asumimos que los campos a filtrar están en la primera hoja (índice 0)
    const data = await getDataFromSpecificSheet(0);
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]).filter(
        (header) => !header.startsWith("Observaciones"),
      );
      res.json(headers);
    } else {
      res.status(404).send("No se encontraron datos en la hoja principal.");
    }
  } catch (error) {
    console.error("Error al obtener los campos:", error);
    res.status(500).send("Error al obtener los campos.");
  }
});

// Nueva ruta para obtener todas las opciones únicas de un campo específico
app.get("/obtener-opciones-campo/:campo", async (req, res) => {
  const campo = req.params.campo;
  try {
    // Asumimos que las opciones están en la primera hoja (índice 0)
    const allData = await getDataFromSpecificSheet(0);
    // Obtiene valores únicos y elimina los vacíos o nulos (filter(Boolean))
    const opcionesUnicas = [
      ...new Set(allData.map((item) => item[campo]).filter(Boolean)),
    ];
    res.json(opcionesUnicas);
  } catch (error) {
    console.error(
      `Error al obtener las opciones para el campo ${campo}:`,
      error,
    );
    res
      .status(500)
      .json({
        error: `Error al obtener las opciones para el campo ${campo}`,
        details: error.message,
      });
  }
});

// --- RUTA PRINCIPAL DE BÚSQUEDA - /buscar ---
app.post("/buscar", async (req, res) => {
  try {
    const allData = await getDataFromSpecificSheet(0); // Suponiendo que los datos del Día Preventivo están en la hoja 0
    const dniABuscar = String(req.body.dni).trim();

    const NOMBRE_COLUMNA_FECHA = "Fecha_cierre_DP"; // Asegúrate de que este es el nombre exacto de la columna de fecha

    const parseDateDDMMYYYY = (dateString) => {
      if (!dateString) return new Date(NaN);
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);
        if (isNaN(day) || isNaN(month) || isNaN(year)) return new Date(NaN);
        return new Date(year, month, day);
      }
      return new Date(NaN);
    };

    // 1. Filtrar TODOS los registros para el DNI
    const resultadosParaDNI = allData.filter(
      (patient) =>
        String(patient["DNI"] || patient["Documento"] || "").trim() ===
        dniABuscar,
    );

    if (resultadosParaDNI.length === 0) {
      console.log(`SERVER: DNI ${dniABuscar} no encontrado.`);
      // Cuando no se encuentra, devolvemos un objeto con 'error'
      return res.json({ error: "DNI no encontrado." });
    }

    // 2. Ordenar los resultados por fecha (más reciente primero)
    resultadosParaDNI.sort((a, b) => {
      const dateA = parseDateDDMMYYYY(a[NOMBRE_COLUMNA_FECHA]);
      const dateB = parseDateDDMMYYYY(b[NOMBRE_COLUMNA_FECHA]);

      if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) return 0;
      if (isNaN(dateA.getTime())) return 1;
      if (isNaN(dateB.getTime())) return -1;

      return dateB.getTime() - dateA.getTime();
    });

    // El primer elemento es el más reciente (el que se mostrará como principal)
    const pacientePrincipal = resultadosParaDNI[0];

    // Los estudios previos son todos los demás, si existen.
    // Mapeamos solo la fecha para el cartel informativo.
    const estudiosPrevios = resultadosParaDNI.slice(1).map((estudio) => ({
      fecha: estudio[NOMBRE_COLUMNA_FECHA] || "Fecha desconocida",
    }));

    console.log(
      `SERVER: DNI ${dniABuscar} encontrado. Enviando el más reciente y ${estudiosPrevios.length} estudios previos.`,
    );

    // 3. ¡LA CLAVE! Enviamos un objeto con dos propiedades claras.
    // Esto evita que tu frontend se confunda sobre dónde están los datos principales.
    res.json({
      pacientePrincipal: pacientePrincipal,
      estudiosPrevios: estudiosPrevios,
    });
  } catch (error) {
    console.error("Error en servidor al buscar paciente por DNI:", error);
    res.status(500).json({
      error: "Error interno del servidor",
      details: error.message,
    });
  }
});

// Ruta para consultas grupales (usada en estadisticas.html)
app.post("/consultar-grupo", async (req, res) => {
  try {
    const { conditions, combinator = "AND", fieldsToRetrieve = [] } = req.body;

    // Obtener todos los datos de la hoja principal (índice 0)
    const allData = await getDataFromSpecificSheet(0);
    const totalRegistros = allData.length;
    let filteredResults;

    if (combinator === "AND") {
      filteredResults = allData.filter((patient) => {
        return conditions.every((condition) => {
          const patientValue = patient[condition.field];
          const conditionValue = condition.value;
          const operator = condition.operator;

          switch (operator) {
            case "equals":
              return (
                String(patientValue || "").trim() ===
                String(conditionValue || "").trim()
              );
            case "notEquals":
              return (
                String(patientValue || "").trim() !==
                String(conditionValue || "").trim()
              );
            case "greaterThan":
              return Number(patientValue) > Number(conditionValue);
            case "greaterThanOrEqual":
              return Number(patientValue) >= Number(conditionValue);
            case "lessThan":
              return Number(patientValue) < Number(conditionValue);
            case "lessThanOrEqual":
              return Number(patientValue) <= Number(conditionValue);
            case "includes":
              return String(patientValue || "")
                .toLowerCase()
                .includes(String(conditionValue || "").toLowerCase());
            case "in":
              if (Array.isArray(conditionValue)) {
                return conditionValue.some(
                  (val) =>
                    String(patientValue || "").trim() ===
                    String(val || "").trim(),
                );
              }
              return false;
            default:
              return false;
          }
        });
      });
    } else if (combinator === "OR") {
      filteredResults = allData.filter((patient) => {
        return conditions.some((condition) => {
          const patientValue = patient[condition.field];
          const conditionValue = condition.value;
          const operator = condition.operator;

          switch (operator) {
            case "equals":
              return (
                String(patientValue || "").trim() ===
                String(conditionValue || "").trim()
              );
            case "notEquals":
              return (
                String(patientValue || "").trim() !==
                String(conditionValue || "").trim()
              );
            case "greaterThan":
              return Number(patientValue) > Number(conditionValue);
            case "greaterThanOrEqual":
              return Number(patientValue) >= Number(conditionValue);
            case "lessThan":
              return Number(patientValue) < Number(conditionValue);
            case "lessThanOrEqual":
              return Number(patientValue) <= Number(conditionValue);
            case "includes":
              return String(patientValue || "")
                .toLowerCase()
                .includes(String(conditionValue || "").toLowerCase());
            case "in":
              if (Array.isArray(conditionValue)) {
                return conditionValue.some(
                  (val) =>
                    String(patientValue || "").trim() ===
                    String(val || "").trim(),
                );
              }
              return false;
            default:
              return false;
          }
        });
      });
    } else {
      filteredResults = []; // Si no se especifica el combinador
    }

    const conteoCruce = filteredResults.length;
    const criteriosCruce = {};
    conditions.forEach((condition) => {
      criteriosCruce[condition.field] = condition.value;
    });

    res.json({
      total_registros: totalRegistros,
      conteo_cruce: conteoCruce,
      criterios_cruce: criteriosCruce,
      data: filteredResults, // Incluimos el array completo de filteredResults para la exportación
    });
  } catch (error) {
    console.error("Error al realizar la consulta grupal:", error);
    res.status(500).json({ error: "Error al realizar la consulta" });
  }
});

app.get("/obtener-resultados-variable/:variable", async (req, res) => {
  const variable = req.params.variable;
  try {
    // Obtener datos de la hoja principal (índice 0)
    const data = await getDataFromSpecificSheet(0);
    if (data && data.length > 0 && data[0].hasOwnProperty(variable)) {
      const resultadosUnicos = [
        ...new Set(
          data.map((row) => row[variable]).filter((value) => value !== ""),
        ),
      ];
      res.json(resultadosUnicos);
    } else {
      res.status(404).send(`Variable "${variable}" no encontrada o sin datos.`);
    }
  } catch (error) {
    console.error(
      `Error al obtener los resultados para la variable "${variable}":`,
      error,
    );
    res
      .status(500)
      .send(`Error al obtener los resultados para la variable "${variable}".`);
  }
});

// Agrega esta nueva ruta GET en tu server.js, junto a tus otras rutas
app.get("/api/user", (req, res) => {
  // Si el usuario está autenticado, req.isAuthenticated() será verdadero
  if (req.isAuthenticated()) {
    res.json({
      isLoggedIn: true,
      user: {
        name: req.user.displayName,
        email: req.user.emails[0].value,
      },
    });
  } else {
    res.json({
      isLoggedIn: false,
    });
  }
});
// ====================================================================
// NUEVA RUTA - OBTENER ESTUDIOS COMPLEMENTARIOS POR DNI
// ====================================================================

app.post("/api/seguimiento/guardar", async (req, res) => {
  const {
    fecha,
    profesional,
    paciente,
    evaluaciones,
    observacionProfesional,
    pdfLinks,
  } = req.body;
  console.log(
    `SERVER: Recibido informe de seguimiento para DNI: ${paciente.dni} en fecha: ${fecha}`,
  );

  if (!doc) {
    console.error("SERVER ERROR: Google Sheet document not initialized.");
    return res
      .status(500)
      .json({
        error: "Error interno del servidor: Base de datos no disponible.",
      });
  }

  try {
    await doc.loadInfo();
    let sheetSeguimiento = doc.sheetsByTitle["Seguimiento"];

    if (!sheetSeguimiento) {
      console.log(
        'SERVER: Creando nueva hoja "Seguimiento" en Google Sheet con encabezados predefinidos.',
      );
      sheetSeguimiento = await doc.addSheet({
        title: "Seguimiento",
        headerValues: [
          "Fecha_Seguimiento",
          "DNI_Paciente",
          "Nombre_Paciente",
          "Profesional_Apellido_Nombre",
          "Profesional_Matricula",
          "Riesgo_Cardiovascular_Calificacion",
          "Riesgo_Cardiovascular_Observaciones",
          "Diabetes_Calificacion",
          "Diabetes_Observaciones",
          "Dislipemia_Calificacion",
          "Dislipemia_Observaciones",
          "Tabaquismo_Calificacion",
          "Tabaquismo_Observaciones",
          "Actividad_fisica_Calificacion",
          "Actividad_fisica_Observaciones",
          "Observacion_Profesional",
          "Links_PDFs",
        ],
      });
    }

    // *************************************************************************
    // ** ESTE CÓDIGO DEBE ESTAR DENTRO DE LA RUTA /api/seguimiento/guardar **
    // *************************************************************************
    const newRow = {
      Fecha_Seguimiento: fecha,
      DNI_Paciente: paciente.dni,
      Nombre_Paciente: paciente.nombre,
      Profesional_Apellido_Nombre: profesional.nombre,
      Profesional_Matricula: profesional.matricula,
      Observacion_Profesional: observacionProfesional,
      Links_PDFs: JSON.stringify(pdfLinks),
    };

    if (evaluaciones && evaluaciones.length > 0) {
      evaluaciones.forEach((eva) => {
        let motivoOriginal = eva.motivo;
        let motivoParaColumna = motivoOriginal;

        motivoParaColumna = motivoParaColumna.replace(/\s*\([^)]*\)\s*/g, " ");
        motivoParaColumna = motivoParaColumna.replace(
          /\s*Se verifica\s*$/i,
          "",
        );
        motivoParaColumna = motivoParaColumna.replace(/\s*Pendiente\s*$/i, "");
        motivoParaColumna = motivoParaColumna.replace(
          /\s*Riesgo Alto\s*$/i,
          "",
        );

        if (motivoOriginal.includes("Control Odontológico")) {
          motivoParaColumna = "Control Odontologico";
        } else if (motivoOriginal.includes("Agudeza visual")) {
          motivoParaColumna = "Agudeza visual";
        } else if (motivoOriginal.includes("Seguridad Vial")) {
          motivoParaColumna = "Seguridad Vial";
        } else if (motivoOriginal === "IMC") {
          motivoParaColumna = "IMC";
        }
        motivoParaColumna = motivoParaColumna.trim();

        let columnaBase = motivoParaColumna;
        columnaBase = columnaBase.replace(/\s+/g, "_");
        columnaBase = columnaBase
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        columnaBase = columnaBase.replace(/[^\w]/g, "");
        columnaBase = columnaBase.replace(/_+/g, "_");
        columnaBase = columnaBase.replace(/^_|_$/g, "");

        console.log(
          `SERVER DEBUG: Motivo original recibido: "${motivoOriginal}"`,
        );
        console.log(
          `SERVER DEBUG: Motivo normalizado (para columna): "${motivoParaColumna}"`,
        );
        console.log(
          `SERVER DEBUG: Nombre de columna sanitizado FINAL: "${columnaBase}"`,
        );

        newRow[`${columnaBase}_Calificacion`] = eval.calificacion;
        newRow[`${columnaBase}_Observaciones`] = eval.observaciones;
      });
    }

    await sheetSeguimiento.addRow(newRow);

    console.log("SERVER: Informe de seguimiento guardado con éxito.");
    res.json({ success: true, message: "Informe de seguimiento guardado." });
  } catch (error) {
    console.error(
      "SERVER ERROR: Fallo al guardar informe de seguimiento:",
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        error:
          "Error interno del servidor al guardar el informe de seguimiento.",
        details: error.message,
      });
  }
}); // <--- ESTA ES LA LLAVE DE CIERRE CORRECTA PARA LA RUTA DE SEGUIMIENTO
// *************************************************************************
app.post("/api/cierre/guardar", async (req, res) => {
  // AHORA VERIFICA SI EL USUARIO ESTÁ AUTENTICADO
  const profesionalName = req.body["Profesional"] || "Desconocido";
  const formData = req.body;

  const dni = String(formData["DNI"]).trim();
  const fechaCierre = String(formData["Fecha_cierre_dp"]).trim();

  if (!doc) {
    console.error("SERVER ERROR: Google Sheet document not initialized.");
    return res
      .status(500)
      .json({
        error: "Error interno del servidor: Base de datos no disponible.",
      });
  }

  if (!dni || !fechaCierre) {
    return res
      .status(400)
      .json({
        success: false,
        error:
          "DNI del paciente y Fecha de Cierre son requeridos para guardar el cierre.",
      });
  }

  try {
    await doc.loadInfo();
    const pacientesSheet = doc.sheetsByTitle["Hoja 1"];

    if (!pacientesSheet) {
      console.error(
        'SERVER ERROR: Hoja "Hoja 1" no encontrada. Por favor, asegúrese de que la hoja exista y se llame "Hoja 1".',
      );
      return res
        .status(500)
        .json({
          success: false,
          error:
            'Error interno del servidor: La hoja de pacientes ("Hoja 1") no fue encontrada.',
        });
    }

    await pacientesSheet.loadHeaderRow();

    const newRowData = {};
    pacientesSheet.headerValues.forEach((header) => {
      newRowData[header] =
        formData[header] !== undefined ? String(formData[header]) : "";
    });

    // ✅ AÑADIMOS EL NOMBRE DEL PROFESIONAL Y LA FECHA
    newRowData["Profesional"] = profesionalName;
    newRowData["Fecha_cierre_DP"] = new Date().toLocaleDateString("es-AR");

    // ✅ AQUÍ AGREGAMOS LOS NUEVOS CAMPOS DEL FORMULARIO
    newRowData["Cancer_mama_Eco_mamaria"] = formData["Cancer_mama_Eco_mamaria"];
    newRowData["Observaciones_Eco_mamaria"] =
      formData["Observaciones_Eco_mamaria"];

    newRowData["DNI"] = dni;
    newRowData["Fecha_cierre_dp"] = fechaCierre;

    await pacientesSheet.addRow(newRowData);

    // Guardar también en Supabase
    try {
      const supabaseData = {
        dni: dni,
        apellido_y_nombre:
          `${formData["Apellido"] || ""} ${formData["Nombre"] || ""}`.trim(),
        fechax:
          formData["Fecha_cierre_DP"] || new Date().toISOString().split("T")[0],
        edad: formData["Edad"] || null,
        sexo: formData["Sexo"] || null,
        efector: "IAPOS ESP PREST",
        tipo: "Adultos",
        profesional: profesionalName,
        marca_temporal: new Date().toISOString(),
        // Campos clínicos
        presion_arterial: formData["Presion_Arterial"] || null,
        obs_presion_arterial:
          formData["Observaciones_Presion_Arterial"] || null,
        imc: formData["IMC"] || null,
        obs_imc: formData["Observaciones_IMC"] || null,
        agudeza_visual: formData["Agudeza_visual"] || null,
        obs_agudeza_visual: formData["Observaciones_Agudeza_visual"] || null,
        control_odontologico_adultos: formData["Control_odontologico"] || null,
        obs_control_odontologico:
          formData["Observaciones_Control_odontologico"] || null,
        alimentacion_saludable: formData["Alimentacion_saludable"] || null,
        obs_alimentacion:
          formData["Observaciones_Alimentacion_saludable"] || null,
        actividad_fisica: formData["Actividad_fisica"] || null,
        obs_actividad_fisica:
          formData["Observaciones_Actividad_fisica"] || null,
        seguridad_vial: formData["Seguridad_vial"] || null,
        obs_seguridad_vial: formData["Observaciones_Seguridad_vial"] || null,
        abuso_alcohol: formData["Abuso_alcohol"] || null,
        obs_abuso_alcohol: formData["Observaciones_Abuso_alcohol"] || null,
        tabaco: formData["Tabaco"] || null,
        obs_tabaco: formData["Observaciones_Tabaco"] || null,
        violencia: formData["Violencia"] || null,
        obs_violencia: formData["Observaciones_Violencia"] || null,
        depresion: formData["Depresion"] || null,
        obs_depresion: formData["Observaciones_Depresion"] || null,
        its: formData["ITS"] || null,
        obs_its: formData["Observaciones_ITS"] || null,
        hepatitis_b: formData["Hepatitis_B"] || null,
        obs_hepatitis_b: formData["Observaciones_Hepatitis_B"] || null,
        hepatitis_c: formData["Hepatitis_C"] || null,
        obs_hepatitis_c: formData["Observaciones_Hepatitis_C"] || null,
        vih: formData["VIH"] || null,
        obs_vih: formData["Observaciones_VIH"] || null,
        dislipemias: formData["Dislipemias"] || null,
        obs_dislipemias: formData["Observaciones_Dislipemias"] || null,
        diabetes: formData["Diabetes"] || null,
        obs_diabetes: formData["Observaciones_Diabetes"] || null,
        cancer_cervico_hpv: formData["Cancer_cervico_uterino_HPV"] || null,
        obs_hpv: formData["Observaciones_Cancer_cervico_uterino_HPV"] || null,
        cancer_cervico_pap: formData["Cancer_cervico_uterino_PAP"] || null,
        obs_pap: formData["Observaciones_PAP"] || null,
        somf: formData["Cancer_colon_SOMF"] || null,
        obs_somf: formData["Observaciones_Cancer_colon_SOMF"] || null,
        cancer_colon_colonoscopia:
          formData["Cancer_colon_Colonoscopia"] || null,
        obs_colonoscopia: formData["Observaciones_Colonoscopia"] || null,
        cancer_mama_mamografia: formData["Cancer_mama_Mamografia"] || null,
        obs_mamografia: formData["Observaciones_Mamografia"] || null,
        cancer_mama_eco_mamaria: formData["Cancer_mama_Eco_mamaria"] || null,
        obs_eco_mamaria: formData["Observaciones_Eco_mamaria"] || null,
        erc: formData["ERC"] || null,
        obs_erc: formData["Observaciones_ECG"] || null,
        epoc: formData["EPOC"] || null,
        obs_epoc: formData["Observaciones_EPOC"] || null,
        aneurisma_aorta: formData["Aneurisma_aorta"] || null,
        obs_aneurisma_aorta: formData["Observaciones_Aneurisma_aorta"] || null,
        osteoporosis: formData["Osteoporosis"] || null,
        obs_osteoporosis: formData["Observaciones_Osteoporosis"] || null,
        estratificacion_riesgo_cv:
          formData["Estratificacion_riesgo_CV"] || null,
        obs_riesgo_cv: formData["Observaciones_Riesgo_CV"] || null,
        aspirina: formData["Aspirina"] || null,
        obs_aspirina: formData["Observaciones_Aspirina"] || null,
        inmunizaciones: formData["Inmunizaciones"] || null,
        obs_inmunizaciones: formData["Observaciones_Inmunizaciones"] || null,
        vdrl: formData["VDRL"] || null,
        obs_vdrl: formData["Observaciones_VDRL"] || null,
        prostata_psa: formData["Prostata_PSA"] || null,
        obs_psa: formData["Observaciones_PSA"] || null,
        chagas: formData["Chagas"] || null,
        obs_chagas: formData["Observaciones_Chagas"] || null,
      };

      const { error: supabaseError } = await supabase
        .from("historial_dia_preventivo")
        .insert(supabaseData);

      if (supabaseError) {
        console.error("Error al guardar en Supabase:", supabaseError);
      } else {
        console.log("✅ Cierre guardado en Supabase para DNI:", dni);

        // Registrar la consulta médica como acción facturable (módulo DP)
        try {
          const hoy = new Date().toISOString().split("T")[0];
          await supabase.from("practicas_autorizadas").insert({
            dni: dni,
            nombre_completo:
              `${formData["Apellido"] || ""} ${formData["Nombre"] || ""}`.trim(),
            descripcion_practica: "Consulta médica (Día Preventivo)",
            estado: "REALIZADA",
            fecha_autorizacion: hoy,
            fecha_carga: hoy,
            nombre_prestador: profesionalName,
          });
          console.log(
            "✅ Consulta médica registrada como REALIZADA para DNI:",
            dni,
          );
        } catch (medErr) {
          console.error(
            "Error al registrar consulta médica en practicas_autorizadas:",
            medErr.message,
          );
        }
      }
    } catch (supabaseErr) {
      console.error("Error Supabase cierre:", supabaseErr.message);
    }

    console.log(
      `SERVER: Nuevo registro de cierre guardado para DNI: ${dni} por ${profesionalName}`,
    );
    return res.json({
      success: true,
      message:
        "Formulario de cierre guardado exitosamente como nuevo registro.",
    });
  } catch (error) {
    console.error(
      "SERVER ERROR: Fallo al guardar el formulario de cierre:",
      error,
    );
    res
      .status(500)
      .json({
        success: false,
        error: "Error interno del servidor al guardar el formulario de cierre.",
        details: error.message,
      });
  }
});
app.post("/guardar-consulta", async (req, res) => {
  console.log("Datos recibidos del cliente:", req.body);
  const profesionalName = req.body["Profesional"] || "Desconocido";
  console.log(
    "Solicitud para guardar consulta recibida por el profesional:",
    profesionalNombre,
  );

  const {
    DNI,
    Nombre,
    Apellido,
    Edad,
    Sexo,
    "motivo de consulta": motivoConsulta,
    diagnostico,
    indicaciones,
    recordatorio,
  } = req.body;

  if (!DNI || !profesionalNombre) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Faltan datos obligatorios (DNI o Profesional).",
      });
  }

  try {
    // ✅ CLAVE: Usamos la variable 'doc' que ya está inicializada globalmente.
    // Las siguientes dos líneas son ELIMINADAS porque son la causa del error.
    // const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);
    // await doc.useServiceAccountAuth(jwt);

    await doc.loadInfo();

    const sheetTitle = "Consultas";
    let sheet = doc.sheetsByTitle[sheetTitle];

    if (!sheet) {
      console.log(`La hoja "${sheetTitle}" no existe. Creándola...`);
      sheet = await doc.addSheet({
        title: sheetTitle,
        headerValues: [
          "DNI",
          "Nombre",
          "Apellido",
          "Edad",
          "Sexo",
          "Motivo de consulta",
          "Diagnóstico",
          "Indicaciones",
          "Recordatorio",
          "Profesional",
          "Fecha",
        ],
      });
    }

    await sheet.addRow({
      DNI: DNI,
      Nombre: Nombre,
      Apellido: Apellido,
      Edad: Edad,
      Sexo: Sexo,
      "Motivo de consulta": motivoConsulta,
      Diagnostico: diagnostico,
      Indicaciones: indicaciones,
      Recordatorio: recordatorio,
      Profesional: profesionalNombre,
      Fecha: new Date().toLocaleString("es-AR", {
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    });

    console.log("Datos de consulta guardados con éxito.");
    res.json({ success: true, message: "Consulta guardada con éxito." });
  } catch (error) {
    console.error("Error al guardar la consulta:", error);
    res
      .status(500)
      .json({ success: false, message: "Error interno del servidor." });
  }
});
// ====================================================================
// INICIO DEL SERVIDOR
// ====================================================================

// Cargar datos del paciente desde IAPOS + Supabase
app.post("/cargar-datos-paciente", async (req, res) => {
  const { dni } = req.body;
  if (!dni) return res.status(400).json({ error: "DNI requerido." });

  const hoy = new Date().toISOString().split("T")[0];

  // 1. Consultar IAPOS
  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
            <BEWsValidaAfi.Execute xmlns="IAPOS_WS">
                <Usuario>CONSULTAPDP</Usuario>
                <Passwd>1Qaz</Passwd>
                <Nafiliado>${dni}</Nafiliado>
                <Badocnumdo>${dni}</Badocnumdo>
                <Tidocodigo_de_documento>96</Tidocodigo_de_documento>
                <Ogorcodigo>1</Ogorcodigo>
                <Fechpresta>${hoy}</Fechpresta>
            </BEWsValidaAfi.Execute>
        </soap:Body>
    </soap:Envelope>`;

  let datosIAPOS = null;
  try {
    const iaposRes = await axios.post(
      "https://aswe.santafe.gov.ar/iapos-sw-srvt/servlet/abewsvalidaafi",
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "IAPOS_WSaction/ABEWSVALIDAAFI.Execute",
        },
        timeout: 10000,
      },
    );
    const xml = iaposRes.data;
    const getValor = (tag) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
      return match ? match[1].trim() : null;
    };
    datosIAPOS = {
      estado: getValor("Estado"),
      esActivo: getValor("Estado") === "A",
      nombre: getValor("Apenom"),
      edad: getValor("Edad"),
      sexo: getValor("Sexo"), // 1=M, 2=F
      localidad: getValor("Localidad"),
      fechaNac: getValor("Fechanac"),
    };
  } catch (e) {
    console.error("Error IAPOS:", e.message);
  }

  // 2. Buscar hoja de vida en Supabase
  const { data: afiliado } = await supabase
    .from("afiliados")
    .select("*")
    .eq("dni", dni)
    .single();

  // 3. Buscar último DP
  const { data: ultimoDP } = await supabase
    .from("historial_dia_preventivo")
    .select(
      "fechax, efector, cancer_cervico_hpv, somf, dislipemias, diabetes, presion_arterial",
    )
    .eq("dni", dni)
    .order("fechax", { ascending: false })
    .limit(1)
    .single();

  // 4. Buscar prácticas realizadas
  const { data: practicas } = await supabase
    .from("practicas_autorizadas")
    .select("*")
    .eq("dni", dni)
    .eq("estado", "REALIZADA");

  // 5. Buscar datos de enfermería
  const { data: enfermeria } = await supabase
    .from("enfermeria_consultas")
    .select("presion_arterial, peso_kg, altura_cm")
    .eq("dni", dni)
    .order("fecha_cierre_enf", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 6. Generar alertas clínicas con campo asociado
  const alertas = [];

  // ── HOJA DE VIDA ──
  if (afiliado?.hipertension === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Presion_Arterial",
      mensaje: "⚠️ Declara hipertensión en hoja de vida",
    });
  if (afiliado?.hipertension_familiar === "si")
    alertas.push({
      tipo: "INFO",
      campo: "Presion_Arterial",
      mensaje: "ℹ️ Antecedente familiar de hipertensión",
    });
  if (afiliado?.diabetes === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Diabetes",
      mensaje: "⚠️ Declara diabetes en hoja de vida",
    });
  if (afiliado?.diabetes_familiar === "si")
    alertas.push({
      tipo: "INFO",
      campo: "Diabetes",
      mensaje: "ℹ️ Antecedente familiar de diabetes",
    });
  if (afiliado?.colesterol === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Dislipemias",
      mensaje: "⚠️ Declara colesterol alto en hoja de vida",
    });
  if (afiliado?.depresion === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Depresion",
      mensaje: "⚠️ Depresión diagnosticada declarada en hoja de vida",
    });
  if (afiliado?.abuso_alcohol_drogas === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Abuso_alcohol",
      mensaje: "⚠️ Declara problemas con alcohol/drogas en hoja de vida",
    });
  if (afiliado?.fuma && afiliado.fuma !== "nunca")
    alertas.push({
      tipo: "INFO",
      campo: "Tabaco",
      mensaje: `ℹ️ Fumador declarado: ${afiliado.fuma}`,
    });
  if (afiliado?.fuma && afiliado.fuma !== "nunca")
    alertas.push({
      tipo: "INFO",
      campo: "EPOC",
      mensaje: "⚠️ Fumador — evaluar espirometría",
    });
  if (afiliado?.cancer_de_colon === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Cancer_colon_SOMF",
      mensaje: "⚠️ Antecedente familiar de cáncer de colon — indicar VCC",
    });
  if (afiliado?.cancer_de_mama === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Cancer_mama_Mamografia",
      mensaje: "⚠️ Antecedente familiar de cáncer de mama",
    });
  if (afiliado?.cancer_de_prostata === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Prostata_PSA",
      mensaje: "⚠️ Antecedente familiar de cáncer de próstata",
    });
  if (afiliado?.cancer_cuello_utero === "si")
    alertas.push({
      tipo: "RIESGO",
      campo: "Cancer_cervico_uterino_HPV",
      mensaje: "⚠️ Antecedente familiar de cáncer de cuello uterino",
    });
  if (afiliado?.stress === "si")
    alertas.push({
      tipo: "INFO",
      campo: "Depresion",
      mensaje: "ℹ️ Declara estrés/ansiedad excesiva en hoja de vida",
    });

  // ── ENFERMERÍA ──
  if (enfermeria?.presion_arterial) {
    const ta = enfermeria.presion_arterial;
    const partes = ta.split("/");
    if (partes.length === 2) {
      const sist = parseInt(partes[0]);
      const diast = parseInt(partes[1]);
      if (sist >= 140 || diast >= 90)
        alertas.push({
          tipo: "URGENTE",
          campo: "Presion_Arterial",
          mensaje: `🔴 Enfermería registró TA elevada: ${ta} mmHg`,
        });
      else if (sist >= 130 || diast >= 85)
        alertas.push({
          tipo: "RIESGO",
          campo: "Presion_Arterial",
          mensaje: `⚠️ Enfermería registró TA en límite: ${ta} mmHg`,
        });
    }
  }
  if (enfermeria?.peso_kg && enfermeria?.altura_cm) {
    const imc =
      parseFloat(enfermeria.peso_kg) /
      Math.pow(parseFloat(enfermeria.altura_cm) / 100, 2);
    if (imc >= 30)
      alertas.push({
        tipo: "RIESGO",
        campo: "IMC",
        mensaje: `⚠️ Enfermería registró IMC: ${imc.toFixed(1)} — obesidad`,
      });
    else if (imc >= 25)
      alertas.push({
        tipo: "INFO",
        campo: "IMC",
        mensaje: `ℹ️ Enfermería registró IMC: ${imc.toFixed(1)} — sobrepeso`,
      });
  }

  // ── HISTORIAL DP ANTERIOR ──
  if (ultimoDP?.cancer_cervico_hpv === "Patologico")
    alertas.push({
      tipo: "URGENTE",
      campo: "Cancer_cervico_uterino_HPV",
      mensaje: "🔴 HPV Patológico en DP anterior — verificar PAP",
    });
  if (ultimoDP?.somf === "Patologico")
    alertas.push({
      tipo: "URGENTE",
      campo: "Cancer_colon_SOMF",
      mensaje: "🔴 SOMF Patológico en DP anterior — indicar VCC urgente",
    });
  if (ultimoDP?.dislipemias === "Presenta")
    alertas.push({
      tipo: "RIESGO",
      campo: "Dislipemias",
      mensaje: "⚠️ Dislipemias presentes en DP anterior",
    });
  if (ultimoDP?.diabetes === "Presenta")
    alertas.push({
      tipo: "RIESGO",
      campo: "Diabetes",
      mensaje: "⚠️ Diabetes presente en DP anterior",
    });
  if (ultimoDP?.presion_arterial === "Hipertensión")
    alertas.push({
      tipo: "RIESGO",
      campo: "Presion_Arterial",
      mensaje: "⚠️ Hipertensión registrada en DP anterior",
    });
  res.json({
    success: true,
    iapos: datosIAPOS,
    afiliado: afiliado || null,
    ultimoDP: ultimoDP || null,
    practicasRealizadas: practicas || [],
    alertas,
  });
});

function mapearTipoEstudio(descripcion) {
  if (!descripcion) return "Otro";
  const d = descripcion.toLowerCase();
  if (d.includes("mamog")) return "Mamografia";
  if (d.includes("ecograf") && d.includes("mam")) return "Eco mamaria";
  if (d.includes("ecograf")) return "Ecografia";
  if (d.includes("densito")) return "Densitometria";
  if (d.includes("colonos") || d.includes("vcc")) return "VCC";
  if (d.includes("pap")) return "Papanicolau";
  if (d.includes("espiro")) return "Espirometria";
  if (d.includes("biopsia")) return "Biopsia";
  if (
    d.includes("glucemia") ||
    d.includes("colesterol") ||
    d.includes("hepatitis") ||
    d.includes("vih") ||
    d.includes("chagas") ||
    d.includes("vdrl")
  )
    return "Laboratorio";
  if (d.includes("odonto")) return "Odontologia";
  if (d.includes("vision") || d.includes("visual")) return "Oftalmologia";
  return "Otro";
}

function parsearResultadosLab(practica) {
  return {
    Glucemia: practica.resultado_texto || "N/A",
    "Colesterol Total": practica.resultado_texto || "N/A",
  };
}

// ── VERIFICAR AFILIADO IAPOS ──
app.get("/verificar-afiliado/:dni", async (req, res) => {
  const dni = req.params.dni;
  const hoy = new Date().toISOString().split("T")[0];

  const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
            <BEWsValidaAfi.Execute xmlns="IAPOS_WS">
                <Usuario>CONSULTAPDP</Usuario>
                <Passwd>1Qaz</Passwd>
                <Nafiliado>${dni}</Nafiliado>
                <Badocnumdo>${dni}</Badocnumdo>
                <Tidocodigo_de_documento>96</Tidocodigo_de_documento>
                <Ogorcodigo>1</Ogorcodigo>
                <Fechpresta>${hoy}</Fechpresta>
            </BEWsValidaAfi.Execute>
        </soap:Body>
    </soap:Envelope>`;

  try {
    const iaposRes = await axios.post(
      "https://aswe.santafe.gov.ar/iapos-sw-srvt/servlet/abewsvalidaafi",
      soapBody,
      {
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: "IAPOS_WSaction/ABEWSVALIDAAFI.Execute",
        },
        timeout: 10000,
      },
    );
    const xml = iaposRes.data;
    const getValor = (tag) => {
      const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`));
      return match ? match[1].trim() : null;
    };
    res.json({
      esActivo: getValor("Estado") === "A",
      nombre: getValor("Apenom"),
      edad: getValor("Edad"),
      sexo: getValor("Sexo"),
      localidad: getValor("Localidad"),
      fechaNac: getValor("Fechanac"),
    });
  } catch (e) {
    console.error("Error IAPOS:", e.message);
    res.json({ esActivo: false, nombre: null });
  }
});
registrarEndpointObtenerEstudios(app, supabase);

async function iniciarApp() {
  const maxIntentos = 5;
  let retraso = 1000;
  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      console.log(
        `⏳ Cargando Google Sheet (Intento ${intento}/${maxIntentos})...`,
      );
      await initializeGoogleSheet();
      console.log("✅ Google Sheets conectado.");
      break;
    } catch (error) {
      console.error(`⚠️ Intento ${intento} fallido:`, error.message);
      if (intento === maxIntentos) {
        console.error(
          "⚠️ Google Sheets no disponible al arrancar — el servidor sigue funcionando sin Sheets.",
        );
      } else {
        console.log(`🔄 Reintentando en ${retraso / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, retraso));
        retraso *= 2;
      }
    }
  }
  app.listen(PORT, () => {
    console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
  });
}

iniciarApp();
