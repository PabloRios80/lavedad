const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./credentials.json'); // Asegúrate de que este archivo exista y esté bien configurado

const app = express();
const PORT = 3000;
const SPREADSHEET_ID = '15YPfBG9PBfN3nBW5xXJYjIXEgYIS9z71pI0VpeCtAAU'; // Tu ID de la hoja de cálculo de Google

app.use(express.json());
app.use(express.static('public')); // Sirve archivos estáticos desde la carpeta 'public'

// Variable global para el objeto del documento de Google Spreadsheet
// Se inicializará una vez al inicio del servidor para evitar re-autenticaciones
let doc;

// Función para inicializar el documento de Google Sheet y cargar su información
async function initializeGoogleSheet() {
    try {
        doc = new GoogleSpreadsheet(SPREADSHEET_ID);
        await doc.useServiceAccountAuth({
            client_email: creds.client_email,
            private_key: creds.private_key.replace(/\\n/g, '\n'), // Reemplaza saltos de línea para la clave privada
        });
        await doc.loadInfo(); // Carga la información de todas las hojas (pestañas)
        console.log('✅ Google Sheet document loaded successfully.');
    } catch (error) {
        console.error('❌ Error initializing Google Sheet document:', error);
        // Es crítico que esto funcione. Si falla, el servidor no podrá acceder a las hojas.
        process.exit(1); // Sale del proceso si la inicialización falla
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

// Ruta para buscar un paciente por DNI (usada en index.html)
app.post('/buscar', async (req, res) => {
    try {
        // Obtener datos de la hoja principal (índice 0)
        const allData = await getDataFromSpecificSheet(0);

        const resultado = allData.find(patient =>
            // Asegura que 'DNI' o 'Documento' se manejen como cadenas y se limpien espacios
            String(patient['DNI'] || patient['Documento'] || '').trim() === String(req.body.dni).trim()
        );

        if (!resultado) {
            return res.json({ error: 'No encontrado' });
        }

        // Devolver todos los datos de la fila del paciente encontrado
        res.json(resultado); // 'resultado' ya es un objeto con todos los datos
    } catch (error) {
        console.error('Error en servidor al buscar paciente por DNI:', error);
        res.status(500).json({
            error: 'Error en el servidor',
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
            // Si tenías 'Laboratorio' dos veces, lo dejé una sola vez aquí por claridad.
            // Si tienes otras hojas, agrégalas.
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