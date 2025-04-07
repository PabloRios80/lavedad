const express = require('express');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./credentials.json');

const app = express();
const PORT = 3000;
const SHEET_ID = '15YPfBG9PBfN3nBW5xXJYjIXEgYIS9z71pI0VpeCtAAU';

app.use(express.json());
app.use(express.static('public'));

app.post('/buscar', async (req, res) => {
  try {
    const doc = new GoogleSpreadsheet(SHEET_ID);
    
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key.replace(/\\n/g, '\n'),
    });
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    
    // Diagnóstico: Mostrar todos los encabezados
    await sheet.loadHeaderRow();
    console.log('Columnas disponibles:', sheet.headerValues);
    
    const rows = await sheet.getRows();
    
    // Diagnóstico: Mostrar primera fila completa
    if (rows.length > 0) {
      console.log('Ejemplo de datos en primera fila:', Object.fromEntries(
        sheet.headerValues.map(header => [header, rows[0][header] || ''])
      ));
    }
    
    const resultado = rows.find(row => 
      String(row['DNI'] || row['Documento'] || '').trim() === String(req.body.dni).trim()
    );

    if (!resultado) {
      return res.json({ error: 'No encontrado' });
    }

    // Extraer TODOS los datos disponibles
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

app.listen(PORT, () => {
  console.log(`✅ Servidor funcionando en http://localhost:${PORT}`);
});