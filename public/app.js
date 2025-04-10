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
            evaluateCancerPrevention(data);
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
    console.log('Datos completos recibidos:', data); // Para depuración
    
    // 1. Obtener valores REALES del paciente (sin procesar)
    const valoresReales = {
        edad: parseInt(data.Edad || data.edad) || 0,
        sexo: (data.Sexo || '').toUpperCase().startsWith('F') ? 'Femenino' : 'Masculino',
        presion: data['Presion Arterial'] || data['Presion_Arterial'] || 'No registrado',
        imc: data['IMC'] || 'No registrado',
        diabetes: data['Diabetes'] || data['Diabetes'] || 'No registrado',
        dislipemia: data['Dislipemias'] || data['Dislipemias'] || 'No registrado',
        tabaquismo: data['Tabaquismo'] || data['Tabaco'] || 'No registrado',
    };

    // 2. Evaluar factores de riesgo (lógica que funciona bien)
    const factoresEvaluados = {
        presion: evaluarPresion(valoresReales.presion),
        imc: evaluarIMC(valoresReales.imc),
        diabetes: { valor: valoresReales.diabetes, riesgo: valoresReales.diabetes === 'Presenta' },
        dislipemia: { valor: valoresReales.dislipemia, riesgo: valoresReales.dislipemia === 'Presenta' },
        tabaquismo: { valor: valoresReales.tabaquismo, riesgo: valoresReales.tabaquismo === 'Fuma' },
        edad: { valor: valoresReales.edad, riesgo: valoresReales.edad >= 40 },
        sexo: { valor: valoresReales.sexo, riesgo: valoresReales.sexo === 'Masculino' }
    };

    // 3. Calcular puntuación (función existente que funciona)
    const puntuacion = calcularPuntuacionRiesgo(factoresEvaluados);
    
    // 4. Clasificar riesgo (función existente que funciona)
    const riesgo = clasificarRiesgo(puntuacion, factoresEvaluados.diabetes.riesgo, factoresEvaluados.presion.riesgo);

    // 5. Mostrar resultados CORRECTAMENTE
    mostrarResultadosFinales({
        valoresReales,
        factoresEvaluados,
        puntuacion,
        riesgo
    });
}

function evaluarPresion(presion) {
    let valor = presion;
    let riesgo = false;
    
    if (presion.includes('Hipertensión')) {
        riesgo = true;
    } else if (presion.match(/\d+\s*\/\s*\d+/)) {
        const [sistolica, diastolica] = presion.split('/').map(Number);
        riesgo = sistolica >= 140 || diastolica >= 90;
        valor = `${sistolica}/${diastolica}`;
    }
    
    return {valor, riesgo};
}

function evaluarIMC(imc) {
    let valor = imc;
    let riesgo = false;
    const imcNum = parseFloat(imc);
    
    if (!isNaN(imcNum)) {
        riesgo = imcNum >= 25;
        valor = imcNum.toFixed(1);
    } else if (imc.includes('Sobrepeso') || imc.includes('Obesidad')) {
        riesgo = true;
    }
    
    return {valor, riesgo};
}

function evaluarTabaquismo(tabaco) {
    let valor = tabaco;
    let riesgo = false;
    
    if (tabaco === "Fuma") {
        riesgo = true;
        valor = "Fuma";
    } else if (tabaco === "No fuma") {
        riesgo = false;
        valor = "No fuma";
    } else {
        // Para casos como "No registrado" o valores inesperados
        riesgo = false;
        valor = tabaco || "No registrado";
    }
    
    return {valor, riesgo};
}

function calcularPuntuacionRiesgo(factores) {
    let puntos = 0;

    // Puntos por edad
    if (factores.edad.valor >= 70) puntos += (factores.sexo.valor === 'Masculino' ? 8 : 9);
    else if (factores.edad.valor >= 60) puntos += (factores.sexo.valor === 'Masculino' ? 6 : 7);
    else if (factores.edad.valor >= 50) puntos += 4;
    else if (factores.edad.valor >= 40) puntos += (factores.sexo.valor === 'Masculino' ? 3 : 2);

    // Puntos por factores de riesgo
    if (factores.presion.riesgo) puntos += 3;
    if (factores.diabetes.riesgo) puntos += 3;
    if (factores.tabaquismo.riesgo) puntos += 2;
    if (factores.dislipemia.riesgo) puntos += 2;
    if (factores.imc.riesgo) {
        const imcNum = parseFloat(factores.imc.valor);
        puntos += (!isNaN(imcNum) && imcNum >= 30) ? 2 : 1;
    }

    return puntos;
}

function clasificarRiesgo(puntuacion, diabetes, hipertension) {
    if (puntuacion >= 15 || diabetes || hipertension) {
        return {
            nivel: "ALTO RIESGO",
            porcentaje: "≥20% a 10 años",
            clase: "risk-high",
            recomendacion: "Consulta cardiológica urgente. Control estricto de factores de riesgo."
        };
    } else if (puntuacion >= 10) {
        return {
            nivel: "RIESGO MODERADO",
            porcentaje: "10-19% a 10 años",
            clase: "risk-medium",
            recomendacion: "Consulta con médico clínico. Mejora de hábitos."
        };
    }
    return {
        nivel: "BAJO RIESGO",
        porcentaje: "<10% a 10 años",
        clase: "risk-low",
        recomendacion: "Control médico anual. Mantener hábitos saludables."
    };
}

function mostrarResultadosCompletos({presion, imc, diabetes, dislipemia, tabaquismo, edad, sexo, puntuacion, riesgo, datosOriginales}) {
    const riskAssessmentDiv = document.getElementById('risk-assessment');
    
    // Mostrar valores REALES del paciente
    document.getElementById('pressure-value').textContent = presion.valor;
    document.getElementById('imc-value').textContent = imc.valor;
    document.getElementById('diabetes-value').textContent = diabetes.valor;
    document.getElementById('dislipemia-value').textContent = (datosOriginales.Dislipemias || '').includes('PRESENTA') ? 'PRESENTA' : 'No registrada';
    document.getElementById('tabaquismo-value').textContent = (datosOriginales.Tabaco || '').includes('FUMA') ? 'FUMADOR' : 'No fumador';
    document.getElementById('edad-value').textContent = `${edad.valor} años`;
    document.getElementById('sexo-value').textContent = sexo.valor;

    // Aplicar estilos según evaluación de riesgo
    actualizarEstiloTarjeta('pressure', presion.riesgo);
    actualizarEstiloTarjeta('imc', imc.riesgo);
    actualizarEstiloTarjeta('diabetes', diabetes.riesgo);
    actualizarEstiloTarjeta('dislipemia', dislipemia.riesgo);
    actualizarEstiloTarjeta('tabaquismo', tabaquismo.riesgo);

    // Mostrar resultado final
    document.getElementById('risk-level').textContent = riesgo.nivel;
    document.getElementById('risk-percentage').textContent = riesgo.porcentaje;
    document.getElementById('risk-description').innerHTML = `
        <strong>Puntuación:</strong> ${puntuacion}<br>
        <strong>Recomendaciones:</strong> ${riesgo.recomendacion}
    `;

    document.getElementById('risk-card').className = `md:col-span-2 p-4 rounded-lg ${riesgo.clase}`;
    riskAssessmentDiv.classList.remove('hidden');
}
function actualizarEstiloTarjeta(tipo, tieneRiesgo) {
    const card = document.getElementById(`${tipo}-card`);
    const notesElement = document.getElementById(`${tipo}-notes`);
    
    if (tieneRiesgo) {
        card.className = `p-4 rounded-lg bg-red-100 border-l-4 border-red-500`;
        if (notesElement) notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Riesgo detectado</span>';
    } else {
        card.className = `p-4 rounded-lg bg-green-100 border-l-4 border-green-500`;
        if (notesElement) notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Normal</span>';
    }
}
function mostrarResultadosFinales({valoresReales, factoresEvaluados, puntuacion, riesgo}) {
    const riskAssessmentDiv = document.getElementById('risk-assessment');
    
    // 1. Mostrar valores EXACTOS del paciente
    document.getElementById('pressure-value').textContent = valoresReales.presion;
    document.getElementById('imc-value').textContent = valoresReales.imc;
    document.getElementById('diabetes-value').textContent = valoresReales.diabetes;
    document.getElementById('dislipemia-value').textContent = valoresReales.dislipemia;
    document.getElementById('tabaquismo-value').textContent = valoresReales.tabaquismo;
    document.getElementById('edad-value').textContent = `${valoresReales.edad} años`;
    document.getElementById('sexo-value').textContent = valoresReales.sexo;

    // 2. Aplicar estilos según evaluación (sin alterar los valores mostrados)
    actualizarEstiloTarjeta('pressure', factoresEvaluados.presion.riesgo);
    actualizarEstiloTarjeta('imc', factoresEvaluados.imc.riesgo);
    actualizarEstiloTarjeta('diabetes', factoresEvaluados.diabetes.riesgo);
    actualizarEstiloTarjeta('dislipemia', factoresEvaluados.dislipemia.riesgo);
    actualizarEstiloTarjeta('tabaquismo', factoresEvaluados.tabaquismo.riesgo);

    // 3. Mostrar evaluación de riesgo (calculada correctamente)
    document.getElementById('risk-level').textContent = riesgo.nivel;
    document.getElementById('risk-percentage').textContent = riesgo.porcentaje;
    document.getElementById('risk-description').innerHTML = `
        <strong>Puntuación:</strong> ${puntuacion}<br>
        <strong>Recomendaciones:</strong> ${riesgo.recomendacion}
    `;

    // 4. Color del recuadro principal según riesgo
    document.getElementById('risk-card').className = `md:col-span-2 p-4 rounded-lg ${riesgo.clase}`;
    
    riskAssessmentDiv.classList.remove('hidden');
}

function evaluateCancerPrevention(data) {
    const cancerDiv = document.getElementById('cancer-prevention');
    const recommendationsList = document.getElementById('cancer-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Mapeo de campos de cáncer con nombres normalizados
    const cancerTests = {
        'hpv': {
            field: 'Cancer_cervico_uterino_HPV',
            notesField: 'Observaciones - HPV',
            name: 'Test de HPV',
            gender: 'Femenino',
            ageRange: '30-65 años',
            frequency: 'Cada 5 años'
        },
        'pap': {
            field: 'Cancer_cervico_uterino_PAP',
            notesField: 'Observaciones - PAP',
            name: 'Papanicolaou',
            gender: 'Femenino',
            ageRange: '25-65 años',
            frequency: 'Cada 3 años'
        },
        'somf': {
            field: 'Cancer_colon_SOMF',
            notesField: 'Observaciones - SOMF',
            name: 'SOMF (Sangre Oculta en Materia Fecal)',
            gender: 'Ambos',
            ageRange: '50-75 años',
            frequency: 'Anual'
        },
        'colonoscopia': {
            field: 'Cancer_colon_Colonoscopia',
            notesField: 'Observaciones - Colonoscopia',
            name: 'Colonoscopia',
            gender: 'Ambos',
            ageRange: '50-75 años',
            frequency: 'Cada 10 años'
        },
        'mamografia': {
            field: 'Cancer_mama_Mamografia',
            notesField: 'Observaciones - Mamografia',
            name: 'Mamografía',
            gender: 'Femenino',
            ageRange: '50-69 años',
            frequency: 'Cada 2 años'
        },
        'psa': {
            field: 'Prostata_PSA',
            notesField: 'Observaciones - PSA',
            name: 'PSA (Antígeno Prostático Específico)',
            gender: 'Masculino',
            ageRange: '50-70 años',
            frequency: 'Según criterio médico'
        }
    };
    
    // Procesar cada examen
    for (const [testId, testInfo] of Object.entries(cancerTests)) {
        const valueElement = document.getElementById(`${testId}-value`);
        const notesElement = document.getElementById(`${testId}-notes`);
        const cardElement = document.getElementById(`${testId}-card`);
        
        // Obtener el valor del campo, normalizando posibles variaciones
        let value = data[testInfo.field] || 'No registrado';
        const notes = data[testInfo.notesField] || '';
        
        // Normalizar valores (por si hay diferencias en mayúsculas/minúsculas o espacios)
        value = value.toString().trim();
        
        // Verificar si el valor contiene alguna de las palabras clave (insensible a mayúsculas)
        const isPatologico = /patológico|patologica|alterado|positivo/i.test(value);
        const isNormal = /normal|negativo/i.test(value);
        const isNoRealizado = /no se realiza|no realizado|no efectuado/i.test(value);
        
        valueElement.textContent = value;
        
        // Establecer estilo según resultado
        if (isPatologico) {
            cardElement.className = 'p-4 rounded-lg risk-high';
            notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Resultado patológico - Requiere atención</span>';
            
            // Agregar recomendación urgente
            recommendationsList.innerHTML += `
                <li class="text-red-600 font-medium">
                    <strong>${testInfo.name}:</strong> Resultado patológico (${value}). Consultar con especialista urgentemente.
                </li>
            `;
        } else if (isNormal) {
            cardElement.className = 'p-4 rounded-lg risk-low';
            notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Resultado normal</span>';
        } else if (isNoRealizado) {
            cardElement.className = 'p-4 rounded-lg bg-gray-100';
            notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
            
            // Verificar si debería recomendarse según edad y sexo
            const edad = parseInt(data.Edad || data.edad) || 0;
            const sexo = (data.Sexo || '').toUpperCase().startsWith('F') ? 'Femenino' : 'Masculino';
            
            if ((testInfo.gender === 'Ambos' || testInfo.gender === sexo) && 
                edad >= parseInt(testInfo.ageRange.split('-')[0])) {
                recommendationsList.innerHTML += `
                    <li>
                        <strong>${testInfo.name}:</strong> Recomendado para ${sexo} ${testInfo.ageRange} (${testInfo.frequency}). 
                        <span class="text-blue-600">Considerar realizar.</span>
                    </li>
                `;
            }
        } else {
            cardElement.className = 'p-4 rounded-lg bg-gray-100';
            notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
        }
        
        // Mostrar observaciones si existen
        if (notes) {
            notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
        }
    }
    
    // Mostrar la sección
    cancerDiv.classList.remove('hidden');
}
function resetProfile() {
    document.getElementById('user-name').textContent = 'Nombre Apellido';
    document.getElementById('welcome-message').innerHTML = 
        '¡Hola! Este programa es para ayudarte y acompañarte en el cuidado de tu salud.';
    document.getElementById('risk-assessment').classList.add('hidden');
    document.getElementById('cancer-prevention').classList.add('hidden'); // Nueva línea
}