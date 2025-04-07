document.getElementById('consultar').addEventListener('click', consultarDNI);
document.getElementById('dni').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') consultarDNI();
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
    document.getElementById('result').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h3 class="font-semibold text-blue-800 mb-2">Datos Personales</h3>
                <p><span class="font-medium">Nombre:</span> ${data.Nombre || data.nombre || 'N/A'}</p>
                <p><span class="font-medium">Apellido:</span> ${data.Apellido || data.apellido || 'N/A'}</p>
                <p><span class="font-medium">Edad:</span> ${data.Edad || data.edad || 'N/A'}</p>
                <p><span class="font-medium">DNI:</span> ${data.DNI || data.dni || data.Documento || 'N/A'}</p>
            </div>
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