document.getElementById('consultar').addEventListener('click', consultarDNI);
document.getElementById('dni').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') consultarDNI();
});
document.getElementById('practica').addEventListener('change', function() {
    const dni = document.getElementById('dni').value.trim();
    if (dni) consultarDNI();
});

async function consultarDNI() {
    const dni = document.getElementById('dni').value.trim();
    const resultDiv = document.getElementById('result');
    const loadingDiv = document.getElementById('loading');
    const riskAssessmentDiv = document.getElementById('risk-assessment');
    
    if (!dni) {
        alert('Por favor ingrese un DNI');
        return;
    }
    
    loadingDiv.classList.remove('hidden');
    resultDiv.innerHTML = '<p class="text-center text-gray-500 py-8"><i class="fas fa-spinner fa-spin"></i> Buscando información...</p>';
    riskAssessmentDiv.classList.add('hidden');
    
    try {
        console.log('Iniciando búsqueda para DNI:', dni);
        const response = await fetch('/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dni })
        });
        
        const data = await response.json();
        console.log('Datos recibidos del servidor:', data);
        
        if (data.error) {
            resultDiv.innerHTML = `<p class="text-center text-red-500 py-8">${data.error}</p>`;
            resetProfile();
        } else {
            updateProfile(data);
            showResults(data);
            evaluateCardiovascularRisk(data);
        }
    } catch (error) {
        console.error('Error en la consulta:', error);
        resultDiv.innerHTML = '<p class="text-center text-red-500 py-8">Error al conectar con el servidor</p>';
        resetProfile();
    } finally {
        loadingDiv.classList.add('hidden');
    }
}

function updateProfile(data) {
    const nombre = data.Nombre || data.nombre || 'Afiliado';
    document.getElementById('user-name').textContent = `${nombre} ${data.Apellido || data.apellido || ''}`.trim();
    document.getElementById('welcome-message').innerHTML = 
        `¡Hola, ${nombre}! Este programa es para ayudarte y acompañarte en el cuidado de tu salud.`;
}
function showResults(data) {
    console.log('Mostrando resultados con datos:', data);
    const practicaSelect = document.getElementById('practica');
    const practicaSeleccionada = practicaSelect.value;
    
    let infoPractica = '';
    
    if (practicaSeleccionada) {
        // Mapeo de campos a sus observaciones correspondientes
        const mapaObservaciones = {
            'Presion_Arterial': 'Observaciones_Presion_Arterial',
            'IMC': 'Observaciones_IMC',
            'Agudeza_visual': 'Observaciones - Agudeza visual',
            'Control_odontologico': 'Observaciones - Control_odontologico',
            'Valor_CPO': 'Observaciones - Control_odontologico',
            'Alimentacion_saludable': 'Observaciones - Alimentacion_saludable',
            'Actividad_fisica': 'Observaciones - Actividad_fisica',
            'Seguridad_vial': 'Observaciones - Seguridad_vial',
            'Caidas_en_adultos_mayores': 'Observaciones - Caidas_en_adultos_mayores',
            'Acido_folico': 'Observaciones - Acido_folico',
            'Abuso_alcohol': 'Observaciones - Abuso_alcohol',
            'Tabaco': 'Observaciones - Tabaco',
            'Violencia': 'Observaciones - Violencia',
            'Depresion': 'Observaciones - Depresion',
            'ITS': 'Observaciones - ITS',
            'Hepatitis_B': 'Observaciones - Hepatitis_B',
            'Hepatitis_C': 'Observaciones - Hepatitis_C',
            'VIH': 'Observaciones - VIH',
            'Dislipemias': 'Observaciones - Dislipemias',
            'Diabetes': 'Observaciones - Diabetes',
            'Cancer_cervico_uterino_HPV': 'Observaciones - HPV',
            'Cancer_cervico_uterino_PAP': 'Observaciones - PAP',
            'Cancer_colon_SOMF': 'Observaciones - SOMF',
            'Cancer_colon_Colonoscopia': 'Observaciones - Colonoscopia',
            'Cancer_mama_Mamografia': 'Observaciones - Mamografia',
            'ERC': 'Observaciones - ERC',
            'EPOC': 'Observaciones - EPOC',
            'Aneurisma_aorta': 'Observaciones - Aneurisma_aorta',
            'Osteoporosis': 'Observaciones - Osteoporosis',
            'Estratificacion_riesgo_CV': 'Observaciones - Riesgo_CV',
            'Aspirina': 'Observaciones - Aspirina',
            'Inmunizaciones': 'Observaciones - Inmunizaciones',
            'VDRL': 'Observaciones - VDRL',
            'Prostata_PSA': 'Observaciones - PSA',
            'Chagas': 'Observaciones - Chagas'
            // 'Profesional' no tiene observaciones asociadas
        };

        const valor = data[practicaSeleccionada] || 'No registrado';
        const nombrePractica = practicaSelect.options[practicaSelect.selectedIndex].text;
        
        // Solo buscar observaciones si no es el campo "Profesional"
        let observaciones = '';
        if (practicaSeleccionada !== 'Profesional' && mapaObservaciones[practicaSeleccionada]) {
            observaciones = data[mapaObservaciones[practicaSeleccionada]] || '';
        }

        infoPractica = `
            <div class="bg-blue-50 p-4 rounded-lg mt-4">
                <h3 class="font-semibold text-blue-800 mb-2">${nombrePractica}</h3>
                <p><span class="font-medium">Valor:</span> ${valor}</p>
                ${observaciones ? `<p><span class="font-medium">Observaciones:</span> ${observaciones}</p>` : ''}
            </div>
        `;
    }

    document.getElementById('result').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="font-semibold text-blue-800 mb-2">Datos Personales</h3>
                <p><span class="font-medium">Nombre:</span> ${data.Nombre || data.nombre || 'N/A'}</p>
                <p><span class="font-medium">Apellido:</span> ${data.Apellido || data.apellido || 'N/A'}</p>
                <p><span class="font-medium">Edad:</span> ${data.Edad || data.edad || 'N/A'}</p>
                <p><span class="font-medium">DNI:</span> ${data.DNI || data.dni || data.Documento || 'N/A'}</p>
                ${data.Profesional ? `<p><span class="font-medium">Profesional:</span> ${data.Profesional}</p>` : ''}
            </div>
            ${infoPractica}
        </div>
    `;
}
function evaluateCardiovascularRisk(data) {
    console.log('Evaluando riesgo cardiovascular con datos:', data);
    const riskAssessmentDiv = document.getElementById('risk-assessment');
    
    // Obtener datos con acceso seguro a propiedades
    const presionArterial = data['Presion Arterial'] || data['Presion_Arterial'] || 'No registrado';
    const obsPresion = data['Observaciones_Presion Arterial'] || data['Observaciones_Presion_Arterial'] || '';
    const imc = data['IMC'] || 'No registrado';
    const obsIMC = data['Observaciones_IMC'] || '';
    
    console.log('Datos médicos:', { presionArterial, obsPresion, imc, obsIMC });

    // Mostrar valores en la interfaz
    document.getElementById('pressure-value').textContent = presionArterial;
    document.getElementById('pressure-notes').textContent = obsPresion;
    document.getElementById('imc-value').textContent = imc;
    document.getElementById('imc-notes').textContent = obsIMC;
    
    // Evaluar riesgo
    let riesgo = 'NORMAL';
    let descripcion = 'Indicadores dentro de parámetros normales.';
    let riesgoClass = 'risk-low';
    
    // Lógica de evaluación mejorada
    const tieneHipertension = presionArterial.includes('Hipertensión') || obsPresion.includes('Hipertensión');
    const tieneObesidad = imc.includes('Obesidad') || obsIMC.includes('Obesidad');
    const tieneSobrepeso = imc.includes('Sobrepeso') || obsIMC.includes('Sobrepeso');
    
    if (tieneHipertension && tieneObesidad) {
        riesgo = 'ALTO';
        descripcion = 'Presenta Hipertensión y Obesidad. Riesgo cardiovascular elevado.';
        riesgoClass = 'risk-high';
    } else if (tieneHipertension || tieneObesidad || tieneSobrepeso) {
        riesgo = 'MODERADO';
        descripcion = 'Presenta factores de riesgo que requieren atención.';
        riesgoClass = 'risk-medium';
    }
    
    // Actualizar interfaz
    document.getElementById('risk-level').textContent = riesgo;
    document.getElementById('risk-description').textContent = descripcion;
    
    // Aplicar estilos
    document.getElementById('pressure-card').className = `p-4 rounded-lg ${riesgoClass}`;
    document.getElementById('imc-card').className = `p-4 rounded-lg ${riesgoClass}`;
    document.getElementById('risk-card').className = `md:col-span-2 p-4 rounded-lg ${riesgoClass}`;
    
    riskAssessmentDiv.classList.remove('hidden');
}

function resetProfile() {
    document.getElementById('user-name').textContent = 'Nombre Apellido';
    document.getElementById('welcome-message').innerHTML = 
        '¡Hola! Este programa es para ayudarte y acompañarte en el cuidado de tu salud.';
    document.getElementById('risk-assessment').classList.add('hidden');
}