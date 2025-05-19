const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./credentials.json');

const app = express();
const PORT = 3000;
const SHEET_ID = '15YPfBG9PBfN3nBW5xXJYjIXEgYIS9z71pI0VpeCtAAU';

app.use(express.json());
app.use(express.static('public'));

// Función para obtener todos los datos de la hoja de Google Sheets (reutilizada)
async function getAllDataFromSheet() {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const allData = rows.map(row => {
      const rowData = {};
      sheet.headerValues.forEach(header => {
        rowData[header] = row[header] || '';
      });
      return rowData;
    });

    return allData;
  } catch (error) {
    console.error('Error al leer la hoja de cálculo:', error);
    return [];
  }
}

// Ruta para obtener todos los campos (para el selector), excluyendo los de observaciones
app.get('/obtener-campos', async (req, res) => {
  try {
    const data = await getAllDataFromSheet();
    if (data && data.length > 0) {
      const headers = Object.keys(data[0]).filter(header => !header.startsWith('Observaciones'));
      res.json(headers);
    } else {
      res.status(404).send('No se encontraron datos en la hoja.');
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
    const allData = await getAllDataFromSheet();
    const opcionesUnicas = [...new Set(allData.map(item => item[campo]).filter(Boolean))]; // Obtiene valores únicos y elimina los vacíos
    res.json(opcionesUnicas);
  } catch (error) {
    console.error(`Error al obtener las opciones para el campo ${campo}:`, error);
    res.status(500).json({ error: `Error al obtener las opciones para el campo ${campo}`, details: error.message });
  }
});

app.post('/buscar', async (req, res) => {
  // (Tu código existente para la búsqueda por DNI - SIN MODIFICACIONES)
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadHeaderRow();
    const rows = await sheet.getRows();

    const resultado = rows.find(row =>
      String(row['DNI'] || row['Documento'] || '').trim() === String(req.body.dni).trim()
    );

    if (!resultado) {
      return res.json({ error: 'No encontrado' });
    }

    const responseData = {};
    sheet.headerValues.forEach(header => {
      responseData[header] = resultado[header] || '';
    });

    console.log('Datos enviados al frontend:', responseData);
    res.json(responseData);

  } catch (error) {
    console.error('Error en servidor:', error);
    res.status(500).json({
      error: 'Error en el servidor',
      details: error.message
    });
  }
});
app.post('/consultar-grupo', async (req, res) => {
    try {
        const { conditions, combinator = 'AND', fieldsToRetrieve = [] } = req.body; // Dejamos fieldsToRetrieve pero usaremos todos los campos para exportar

        const allData = await getAllDataFromSheet();
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
                            return String(patientValue).trim() === String(conditionValue).trim();
                        case 'notEquals':
                            return String(patientValue).trim() !== String(conditionValue).trim();
                        case 'greaterThan':
                            return Number(patientValue) > Number(conditionValue);
                        case 'greaterThanOrEqual':
                            return Number(patientValue) >= Number(conditionValue);
                        case 'lessThan':
                            return Number(patientValue) < Number(conditionValue);
                        case 'lessThanOrEqual':
                            return Number(patientValue) <= Number(conditionValue);
                        case 'includes':
                            return String(patientValue).toLowerCase().includes(String(conditionValue).toLowerCase());
                        case 'in':
                            if (Array.isArray(conditionValue)) {
                                return conditionValue.some(val => String(patientValue).trim() === String(val).trim());
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
                            return String(patientValue).trim() === String(conditionValue).trim();
                        case 'notEquals':
                            return String(patientValue).trim() !== String(conditionValue).trim();
                        case 'greaterThan':
                            return Number(patientValue) > Number(conditionValue);
                        case 'greaterThanOrEqual':
                            return Number(patientValue) >= Number(conditionValue);
                        case 'lessThan':
                            return Number(patientValue) < Number(conditionValue);
                        case 'lessThanOrEqual':
                            return Number(patientValue) <= Number(conditionValue);
                        case 'includes':
                            return String(patientValue).toLowerCase().includes(String(conditionValue).toLowerCase());
                        case 'in':
                            if (Array.isArray(conditionValue)) {
                                return conditionValue.some(val => String(patientValue).trim() === String(val).trim());
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
            // Incluimos el array completo de filteredResults
            data: filteredResults
        });

    } catch (error) {
        console.error('Error al realizar la consulta grupal:', error);
        res.status(500).json({ error: 'Error al realizar la consulta' });
    }
});

app.get('/obtener-resultados-variable/:variable', async (req, res) => {
    const variable = req.params.variable;
    try {
        const data = await getAllDataFromSheet();
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

app.listen(PORT, () => {
  console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
});