// Aumentar el límite de memoria de Node.js
const v8 = require('v8');
v8.setFlagsFromString('--max-old-space-size=4096'); // 4GB


// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


const express = require('express');
const path = require('path');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { google } = require('googleapis');
const app = express();
const PORT = process.env.PORT || 3000; // Usa el puerto que Render te asigne o el 3000 para local
const SPREADSHEET_ID = '15YPfBG9PBfN3nBW5xXJYjIXEgYIS9z71pI0VpeCtAAU';
// Determina la URL base de la API
const API_BASE_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;


// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static('public')); // Sirve archivos estáticos desde la carpeta 'public'

// Nueva ruta para que el frontend obtenga la URL base de la API
app.get('/api/config', (req, res) => {
    res.json({ apiBaseUrl: API_BASE_URL });
});

// --- VARIABLES GLOBALES ---
let doc;
let credentials;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en ${API_BASE_URL}`);
});

app.post('/api/enfermeria/guardar', async (req, res) => {
    try {
        // La conexión ya está inicializada al arrancar el servidor
        // No necesitas la línea "if (!doc) { await initializeGoogleSheet(); }"
        
        const sheet = doc.sheetsByTitle["Enfermeria"];
        if (!sheet) {
            return res.status(500).json({ message: 'Hoja de cálculo "Enfermeria" no encontrada.' });
        }

        const newRow = req.body;
        await sheet.addRow(newRow);

        res.status(200).json({ message: 'Datos guardados correctamente.' });
    } catch (error) {
        console.error('Error al guardar datos de enfermería:', error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
});

// Función para inicializar el documento de Google Sheet y cargar su información (SOLO UNA VEZ)
async function initializeGoogleSheet() {
    try {
        doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        
        if (process.env.CREDENTIALS_JSON) {
            credentials = JSON.parse(process.env.CREDENTIALS_JSON);
        } else {
            credentials = require('./credentials.json');
        }

        await doc.useServiceAccountAuth({
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g, '\n'),
        });
        await doc.loadInfo();
        console.log('✅ Google Sheet document loaded successfully.');
    } catch (error) {
        console.error('❌ Error initializing Google Sheet document:', error);
        throw error; // Re-lanza el error para que el servidor no arranque si falla la conexión
    }
}


// Función para obtener todos los datos de una hoja específica (por nombre o índice)
// Usaremos esta función para ambas: la hoja principal y las hojas de estudios.
async function getDataFromSpecificSheet(sheetIdentifier) { // sheetIdentifier puede ser el nombre o el índice
    if (!doc) {
        throw new Error('Google Sheet document not initialized. Call initializeGoogleSheet() first.');
    }
    try {
        let sheet;
        if (typeof sheetIdentifier === 'string') {
            sheet = doc.sheetsByTitle[sheetIdentifier]; // Busca por nombre
        } else if (typeof sheetIdentifier === 'number') {
            sheet = doc.sheetsByIndex[sheetIdentifier]; // Busca por índice
        }

        if (!sheet) {
            console.warn(`Hoja "${sheetIdentifier}" no encontrada en el documento.`);
            return [];
        }

        await sheet.loadHeaderRow(); // Carga la fila de encabezados de esta hoja
        const rows = await sheet.getRows(); // Obtiene todas las filas de datos

        const allData = rows.map(row => {
            const rowData = {};
            sheet.headerValues.forEach(header => {
                // Maneja valores nulos o indefinidos, devolviendo una cadena vacía
                rowData[header] = row[header] || '';
            });
            return rowData;
        });
        return allData;
    } catch (error) {
        console.error(`Error al leer la hoja de cálculo "${sheetIdentifier}":`, error);
        throw error; // Re-lanza el error para que sea manejado por la ruta que la llamó
    }
}

async function uploadFileToDrive(fileBuffer, fileName, mimeType) {
    const FOLDER_ID = '1JhWxc3eFhZaT3edEjiUM-vHY4Y9MgVy-';

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: credentials.client_email,
            private_key: credentials.private_key.replace(/\\n/g, '\n'),
        },
        // The scopes must be changed to allow writing to shared folders.
        scopes: ['https://www.googleapis.com/auth/drive'], 
    });

    const drive = google.drive({ version: 'v3', auth });
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
        fields: 'id, webViewLink',
    });

    return response.data.webViewLink;
}

// ====================================================================
// RUTAS EXISTENTES - ADAPTADAS PARA USAR EL OBJETO 'doc' GLOBAL
// Y la nueva función 'getDataFromSpecificSheet'
// ====================================================================

// Ruta para obtener todos los campos (para el selector), excluyendo los de observaciones
app.get('/obtener-campos', async (req, res) => {
    try {
        // Asumimos que los campos a filtrar están en la primera hoja (índice 0)
        const data = await getDataFromSpecificSheet(0);
        if (data && data.length > 0) {
            const headers = Object.keys(data[0]).filter(header => !header.startsWith('Observaciones'));
            res.json(headers);
        } else {
            res.status(404).send('No se encontraron datos en la hoja principal.');
        }
    } catch (error) {
        console.error('Error al obtener los campos:', error);
        res.status(500).send('Error al obtener los campos.');
    }
});

// Nueva ruta para obtener todas las opciones únicas de un campo específico
app.get('/obtener-opciones-campo/:campo', async (req, res) => {
    const campo = req.params.campo;
    try {
        // Asumimos que las opciones están en la primera hoja (índice 0)
        const allData = await getDataFromSpecificSheet(0);
        // Obtiene valores únicos y elimina los vacíos o nulos (filter(Boolean))
        const opcionesUnicas = [...new Set(allData.map(item => item[campo]).filter(Boolean))];
        res.json(opcionesUnicas);
    } catch (error) {
        console.error(`Error al obtener las opciones para el campo ${campo}:`, error);
        res.status(500).json({ error: `Error al obtener las opciones para el campo ${campo}`, details: error.message });
    }
});

// --- RUTA PRINCIPAL DE BÚSQUEDA - /buscar ---
app.post('/buscar', async (req, res) => {
    try {
        const allData = await getDataFromSpecificSheet(0); // Suponiendo que los datos del Día Preventivo están en la hoja 0
        const dniABuscar = String(req.body.dni).trim();

        const NOMBRE_COLUMNA_FECHA = 'Fecha_cierre_DP'; // Asegúrate de que este es el nombre exacto de la columna de fecha

        const parseDateDDMMYYYY = (dateString) => {
            if (!dateString) return new Date(NaN);
            const parts = dateString.split('/');
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
        const resultadosParaDNI = allData.filter(patient =>
            String(patient['DNI'] || patient['Documento'] || '').trim() === dniABuscar
        );

        if (resultadosParaDNI.length === 0) {
            console.log(`SERVER: DNI ${dniABuscar} no encontrado.`);
            // Cuando no se encuentra, devolvemos un objeto con 'error'
            return res.json({ error: 'DNI no encontrado.' }); 
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
        const estudiosPrevios = resultadosParaDNI.slice(1).map(estudio => ({
            fecha: estudio[NOMBRE_COLUMNA_FECHA] || 'Fecha desconocida'
        }));

        console.log(`SERVER: DNI ${dniABuscar} encontrado. Enviando el más reciente y ${estudiosPrevios.length} estudios previos.`);

        // 3. ¡LA CLAVE! Enviamos un objeto con dos propiedades claras.
        // Esto evita que tu frontend se confunda sobre dónde están los datos principales.
        res.json({
            pacientePrincipal: pacientePrincipal,
            estudiosPrevios: estudiosPrevios
        });

    } catch (error) {
        console.error('Error en servidor al buscar paciente por DNI:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Ruta para consultas grupales (usada en estadisticas.html)
app.post('/consultar-grupo', async (req, res) => {
    try {
        const { conditions, combinator = 'AND', fieldsToRetrieve = [] } = req.body;

        // Obtener todos los datos de la hoja principal (índice 0)
        const allData = await getDataFromSpecificSheet(0);
        const totalRegistros = allData.length;
        let filteredResults;

        if (combinator === 'AND') {
            filteredResults = allData.filter(patient => {
                return conditions.every(condition => {
                    const patientValue = patient[condition.field];
                    const conditionValue = condition.value;
                    const operator = condition.operator;

                    switch (operator) {
                        case 'equals':
                            return String(patientValue || '').trim() === String(conditionValue || '').trim();
                        case 'notEquals':
                            return String(patientValue || '').trim() !== String(conditionValue || '').trim();
                        case 'greaterThan':
                            return Number(patientValue) > Number(conditionValue);
                        case 'greaterThanOrEqual':
                            return Number(patientValue) >= Number(conditionValue);
                        case 'lessThan':
                            return Number(patientValue) < Number(conditionValue);
                        case 'lessThanOrEqual':
                            return Number(patientValue) <= Number(conditionValue);
                        case 'includes':
                            return String(patientValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
                        case 'in':
                            if (Array.isArray(conditionValue)) {
                                return conditionValue.some(val => String(patientValue || '').trim() === String(val || '').trim());
                            }
                            return false;
                        default:
                            return false;
                    }
                });
            });
        } else if (combinator === 'OR') {
            filteredResults = allData.filter(patient => {
                return conditions.some(condition => {
                    const patientValue = patient[condition.field];
                    const conditionValue = condition.value;
                    const operator = condition.operator;

                    switch (operator) {
                        case 'equals':
                            return String(patientValue || '').trim() === String(conditionValue || '').trim();
                        case 'notEquals':
                            return String(patientValue || '').trim() !== String(conditionValue || '').trim();
                        case 'greaterThan':
                            return Number(patientValue) > Number(conditionValue);
                        case 'greaterThanOrEqual':
                            return Number(patientValue) >= Number(conditionValue);
                        case 'lessThan':
                            return Number(patientValue) < Number(conditionValue);
                        case 'lessThanOrEqual':
                            return Number(patientValue) <= Number(conditionValue);
                        case 'includes':
                            return String(patientValue || '').toLowerCase().includes(String(conditionValue || '').toLowerCase());
                        case 'in':
                            if (Array.isArray(conditionValue)) {
                                return conditionValue.some(val => String(patientValue || '').trim() === String(val || '').trim());
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
        conditions.forEach(condition => {
            criteriosCruce[condition.field] = condition.value;
        });

        res.json({
            total_registros: totalRegistros,
            conteo_cruce: conteoCruce,
            criterios_cruce: criteriosCruce,
            data: filteredResults // Incluimos el array completo de filteredResults para la exportación
        });

    } catch (error) {
        console.error('Error al realizar la consulta grupal:', error);
        res.status(500).json({ error: 'Error al realizar la consulta' });
    }
});

app.get('/obtener-resultados-variable/:variable', async (req, res) => {
    const variable = req.params.variable;
    try {
        // Obtener datos de la hoja principal (índice 0)
        const data = await getDataFromSpecificSheet(0);
        if (data && data.length > 0 && data[0].hasOwnProperty(variable)) {
            const resultadosUnicos = [...new Set(data.map(row => row[variable]).filter(value => value !== ''))];
            res.json(resultadosUnicos);
        } else {
            res.status(404).send(`Variable "${variable}" no encontrada o sin datos.`);
        }
    } catch (error) {
        console.error(`Error al obtener los resultados para la variable "${variable}":`, error);
        res.status(500).send(`Error al obtener los resultados para la variable "${variable}".`);
    }
});


// ====================================================================
// NUEVA RUTA - OBTENER ESTUDIOS COMPLEMENTARIOS POR DNI
// ====================================================================
app.post('/obtener-estudios-paciente', async (req, res) => {
    try {
        const { dni } = req.body;
        if (!dni) {
            return res.status(400).json({ error: 'DNI del paciente es requerido.' });
        }

        const estudiosEncontrados = [];
        // >>>>>>>> ATENCIÓN <<<<<<<<
        // MUY IMPORTANTE: Asegúrate que estos nombres de hojas coincidan EXACTAMENTE
        // con los nombres de las pestañas (hojas) en tu archivo de Google Sheets
        const hojasDeEstudios = [
            'Mamografia',
            'Laboratorio', // ¡Aquí está tu hoja de laboratorio!
            'Ecografia',
            'Espirometria',
            'Densitometria',
            'VCC',
            'Biopsia',
            'Odontologia',
            'Enfermeria'
        ];

        // >>>>>>>> NUEVO: Definición de campos específicos para la hoja de Laboratorio <<<<<<<<
        // ESTOS DEBEN COINCIDIR EXACTAMENTE CON LOS ENCABEZADOS DE LAS COLUMNAS EN TU HOJA 'Laboratorio'
        const camposLaboratorio = [
            'Glucemia',
            'Creatinina',
            'Indice de Filtracion Glomerular', // Asegúrate de que el espacio y tildes sean exactos
            'Colesterol Total',
            'Colesterol HDL',
            'Colesterol LDL',
            'Trigliceridos',
            'HIV',
            'SOMF',
            'Hepatitis B antigeno de superficie',
            'Hepatitis C Ac. Totales',
            'Hepatitis B AC anti core total',
            'HPV OTROS GENOTIPOS DE ALTO RIESGO',
            'HPV GENOTIPO 18',
            'HPV GENOTIPO 16'
        ];

        // Itera sobre cada hoja de estudio definida
        for (const sheetName of hojasDeEstudios) {
            try {
                // Obtiene los datos de la hoja de estudio actual
                const sheetData = await getDataFromSpecificSheet(sheetName);

                // Filtra los estudios de esa hoja para encontrar los que coincidan con el DNI
                const estudiosPacienteEnHoja = sheetData.filter(row => {
                    // Asumimos que la columna del DNI en TODAS TUS HOJAS DE ESTUDIOS se llama 'DNI'.
                    // Si en alguna hoja se llama diferente (ej: 'Documento'), ajústalo aquí.
                    return String(row['DNI'] || '').trim() === String(dni).trim();
                });

                // Añade los estudios encontrados de esta hoja a la lista global
                estudiosPacienteEnHoja.forEach(estudio => {
                    // >>>>>>>> LÓGICA CONDICIONAL: DIFERENCIAR LABORATORY DE OTROS ESTUDIOS <<<<<<<<
                    if (sheetName === 'Laboratorio') {
                        const labResultados = {};
                        camposLaboratorio.forEach(campo => {
                            // Si el campo existe en la fila de Google Sheets, úsalo; de lo contrario, 'N/A'
                            labResultados[campo] = estudio[campo] !== undefined ? estudio[campo] : 'N/A';
                        });

                        estudiosEncontrados.push({
                            TipoEstudio: sheetName, // Será 'Laboratorio'
                            DNI: estudio['DNI'] || 'N/A',
                            Nombre: estudio['Nombre'] || 'N/A',
                            Apellido: estudio['Apellido'] || 'N/A',
                            Fecha: estudio['Fecha'] || 'N/A',
                            Prestador: estudio['Prestador'] || 'N/A',
                            // >>>>>>>> IMPORTANTE: Para Laboratorio, enviamos los resultados específicos <<<<<<<<
                            ResultadosLaboratorio: labResultados // Objeto con todos los resultados de laboratorio
                        });

                                 // --- NUEVA LÓGICA PARA LA HOJA 'Enfermeria' ---
                    } else if (sheetName === 'Enfermeria') {
                        // Obtenemos los campos específicos de Enfermeria
                        const datosEnfermeria = {
                            Altura: estudio['Altura (cm)'] || 'N/A',
                            Peso: estudio['Peso (kg)'] || 'N/A',
                            Circunferencia_cintura: estudio['Circunferencia de cintura (cm)'] || 'N/A',
                            Presion_Arterial: estudio['Presion Arterial (mmhg)'] || 'N/A',
                            Vacunas: estudio['Vacunas'] || 'N/A', // <-- ¡Agrega esta línea!
                            Agudeza_Visual_PDF: estudio['Agudeza Visual (Enlace a PDF)'] || '',
                            Espirometria_PDF: estudio['Espirometria (Enlace a PDF)'] || ''
                        };

                        estudiosEncontrados.push({
                            TipoEstudio: sheetName,
                            DNI: estudio['DNI'] || 'N/A',
                            Nombre: estudio['Nombre'] || 'N/A',
                            Apellido: estudio['Apellido'] || 'N/A',
                            // Agrega otros campos si son relevantes
                            Fecha: estudio['Fecha'] || 'N/A',
                            Prestador: estudio['Prestador'] || 'N/A',
                            ResultadosEnfermeria: datosEnfermeria // Un objeto que contiene todos los resultados de enfermería
                        });


                    } else {
                        // Lógica para Mamografia, Ecografia, etc. (los que tienen Resultado y/o LinkPDF)
                        estudiosEncontrados.push({
                            TipoEstudio: sheetName,
                            DNI: estudio['DNI'] || 'N/A',
                            Nombre: estudio['Nombre'] || 'N/A',
                            Apellido: estudio['Apellido'] || 'N/A',
                            Fecha: estudio['Fecha'] || 'N/A',
                            Prestador: estudio['Prestador'] || 'N/A',
                            // Puedes añadir más opciones si la columna de resultado tiene variantes
                            Resultado: estudio['Resultado'] || estudio['Normal/Patologica'] || 'N/A',
                            // Aquí usamos el nombre de columna del link PDF que ya te funcionaba
                            LinkPDF: estudio['LinkPDF'] || '' // Vacío si no hay link
                            // Si tu LinkPDF venía de 'Link al PDF' o 'URL PDF', asegúrate de usar ese nombre aquí:
                            // LinkPDF: estudio['Link al PDF'] || estudio['URL PDF'] || estudio['LinkPDF'] || ''
                        });
                    }
                });

            } catch (sheetError) {
                console.warn(`⚠️ Error al procesar la hoja "${sheetName}" para DNI ${dni}: ${sheetError.message}`);
                // console.error(`Detalles del error para hoja ${sheetName}:`, sheetError); // Descomentar para depuración profunda
            }
        }

        // Responde al frontend con la lista de estudios encontrados o un mensaje de no encontrados
        if (estudiosEncontrados.length > 0) {
            res.json({ success: true, estudios: estudiosEncontrados });
        } else {
            res.json({ success: true, message: 'No se encontraron estudios complementarios para este DNI.', estudios: [] });
        }

    } catch (error) {
        // Esto capturará errores fatales fuera del bucle de hojas
        console.error('❌ Error fatal al obtener estudios del paciente:', error);
        res.status(500).json({ error: 'Error interno del servidor al obtener estudios.' });
    }
});

app.post('/api/seguimiento/guardar', async (req, res) => {
    const { fecha, profesional, paciente, evaluaciones, observacionProfesional, pdfLinks } = req.body;
    console.log(`SERVER: Recibido informe de seguimiento para DNI: ${paciente.dni} en fecha: ${fecha}`);

    if (!doc) {
        console.error('SERVER ERROR: Google Sheet document not initialized.');
        return res.status(500).json({ error: 'Error interno del servidor: Base de datos no disponible.' });
    }

    try {
        await doc.loadInfo();
        let sheetSeguimiento = doc.sheetsByTitle['Seguimiento'];

        if (!sheetSeguimiento) {
            console.log('SERVER: Creando nueva hoja "Seguimiento" en Google Sheet con encabezados predefinidos.');
            sheetSeguimiento = await doc.addSheet({
                title: 'Seguimiento',
                headerValues: [
                    'Fecha_Seguimiento', 'DNI_Paciente', 'Nombre_Paciente',
                    'Profesional_Apellido_Nombre', 'Profesional_Matricula',
                    'Riesgo_Cardiovascular_Calificacion', 'Riesgo_Cardiovascular_Observaciones',
                    'Diabetes_Calificacion', 'Diabetes_Observaciones',
                    'Dislipemia_Calificacion', 'Dislipemia_Observaciones',
                    'Tabaquismo_Calificacion', 'Tabaquismo_Observaciones',
                    'Actividad_fisica_Calificacion', 'Actividad_fisica_Observaciones',
                    'Observacion_Profesional', 'Links_PDFs'
                ]
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
            Links_PDFs: JSON.stringify(pdfLinks)
        };

        if (evaluaciones && evaluaciones.length > 0) {
            evaluaciones.forEach(eval => {
                let motivoOriginal = eval.motivo;
                let motivoParaColumna = motivoOriginal;

                motivoParaColumna = motivoParaColumna.replace(/\s*\([^)]*\)\s*/g, ' ');
                motivoParaColumna = motivoParaColumna.replace(/\s*Se verifica\s*$/i, '');
                motivoParaColumna = motivoParaColumna.replace(/\s*Pendiente\s*$/i, '');
                motivoParaColumna = motivoParaColumna.replace(/\s*Riesgo Alto\s*$/i, '');

                if (motivoOriginal.includes('Control Odontológico')) {
                    motivoParaColumna = 'Control Odontologico';
                } else if (motivoOriginal.includes('Agudeza visual')) {
                    motivoParaColumna = 'Agudeza visual';
                } else if (motivoOriginal.includes('Seguridad Vial')) {
                    motivoParaColumna = 'Seguridad Vial';
                } else if (motivoOriginal === 'IMC') {
                    motivoParaColumna = 'IMC';
                }
                motivoParaColumna = motivoParaColumna.trim();

                let columnaBase = motivoParaColumna;
                columnaBase = columnaBase.replace(/\s+/g, '_');
                columnaBase = columnaBase.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                columnaBase = columnaBase.replace(/[^\w]/g, '');
                columnaBase = columnaBase.replace(/_+/g, '_');
                columnaBase = columnaBase.replace(/^_|_$/g, '');

                console.log(`SERVER DEBUG: Motivo original recibido: "${motivoOriginal}"`);
                console.log(`SERVER DEBUG: Motivo normalizado (para columna): "${motivoParaColumna}"`);
                console.log(`SERVER DEBUG: Nombre de columna sanitizado FINAL: "${columnaBase}"`);

                newRow[`${columnaBase}_Calificacion`] = eval.calificacion;
                newRow[`${columnaBase}_Observaciones`] = eval.observaciones;
            });
        }

        await sheetSeguimiento.addRow(newRow);

        console.log('SERVER: Informe de seguimiento guardado con éxito.');
        res.json({ success: true, message: 'Informe de seguimiento guardado.' });

    } catch (error) {
        console.error('SERVER ERROR: Fallo al guardar informe de seguimiento:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al guardar el informe de seguimiento.', details: error.message });
    }
}); // <--- ESTA ES LA LLAVE DE CIERRE CORRECTA PARA LA RUTA DE SEGUIMIENTO
// *************************************************************************
// ** LA RUTA /api/cierre/guardar DEBE IR DESPUÉS DE LA RUTA DE SEGUIMIENTO **
// *************************************************************************
app.post('/api/cierre/guardar', async (req, res) => {
    const formData = req.body;

    const dni = String(formData['DNI']).trim();
    const fechaCierre = String(formData['Fecha_cierre_dp']).trim();

    if (!doc) {
        console.error('SERVER ERROR: Google Sheet document not initialized.');
        return res.status(500).json({ error: 'Error interno del servidor: Base de datos no disponible.' });
    }

    if (!dni || !fechaCierre) {
        return res.status(400).json({ success: false, error: 'DNI del paciente y Fecha de Cierre son requeridos para guardar el cierre.' });
    }

    try {
        await doc.loadInfo();
        const pacientesSheet = doc.sheetsByTitle['Hoja 1'];
        
        if (!pacientesSheet) {
            console.error('SERVER ERROR: Hoja "Hoja 1" no encontrada. Por favor, asegúrese de que la hoja exista y se llame "Hoja 1".');
            return res.status(500).json({ success: false, error: 'Error interno del servidor: La hoja de pacientes ("Hoja 1") no fue encontrada.' });
        }

        await pacientesSheet.loadHeaderRow();

        const newRowData = {};
        pacientesSheet.headerValues.forEach(header => {
            newRowData[header] = formData[header] !== undefined ? String(formData[header]) : '';
        });

        newRowData['DNI'] = dni;
        newRowData['Fecha_cierre_dp'] = fechaCierre;

        await pacientesSheet.addRow(newRowData);

        console.log(`SERVER: Nuevo registro de cierre guardado para DNI: ${dni} en fecha: ${fechaCierre}`);
        return res.json({ success: true, message: 'Formulario de cierre guardado exitosamente como nuevo registro.' });

    } catch (error) {
        console.error('SERVER ERROR: Fallo al guardar el formulario de cierre:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor al guardar el formulario de cierre.', details: error.message });
    }
});
        // ====================================================================
// INICIO DEL SERVIDOR
// ====================================================================

// Llama a la función de inicialización de Google Sheet una vez que el servidor arranca.
// El servidor no empezará a escuchar peticiones hasta que la conexión con la hoja esté lista.
initializeGoogleSheet().then(() => {
    app.listen(PORT, () => {
        console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
    });
}).catch(err => {
    console.error('❌ Fallo al iniciar el servidor debido a un error de inicialización de Google Sheet:', err);
    process.exit(1); // Sale si no se puede iniciar el servidor
});