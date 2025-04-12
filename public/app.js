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
            evaluateInfectiousDiseases(data);
            evaluateHealthyHabits(data);
            evaluateDentalHealth(data); 
            evaluateMentalHealth(data); 
            evaluateRenalHealth(data);
            evaluateEPOC(data); 
            evaluateAneurisma(data); 
            evaluateOsteoporosis(data); 
            evaluateAspirina(data);
            evaluateVisualHealth(data);
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
        const isNoRealizado = /no se realiza|no realizado|No aplica/i.test(value);
        
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
function evaluateInfectiousDiseases(data) {
    const infectiousDiv = document.getElementById('infectious-diseases');
    const recommendationsList = document.getElementById('infectious-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Mapeo de campos de enfermedades infecciosas
    const infectiousTests = {
        'its': {
            field: 'ITS',
            notesField: 'Observaciones - ITS',
            name: 'Infecciones de Transmisión Sexual',
            riskGroups: ['Personas sexualmente activas', 'Múltiples parejas', 'Sin protección'],
            screening: 'Anual o según factores de riesgo'
        },
        'hepatitis-b': {
            field: 'Hepatitis_B',
            notesField: 'Observaciones - Hepatitis_B',
            name: 'Hepatitis B',
            riskGroups: ['Personal de salud', 'Parejas de infectados', 'Usuarios de drogas IV'],
            screening: 'Al menos una vez en la vida'
        },
        'hepatitis-c': {
            field: 'Hepatitis_C',
            notesField: 'Observaciones - Hepatitis_C',
            name: 'Hepatitis C',
            riskGroups: ['Nacidos entre 1945-1965', 'Transfusiones antes de 1992', 'Usuarios de drogas IV'],
            screening: 'Al menos una vez en la vida'
        },
        'vih': {
            field: 'VIH',
            notesField: 'Observaciones - VIH',
            name: 'VIH',
            riskGroups: ['Personas sexualmente activas', 'Usuarios de drogas IV', 'Parejas de positivos'],
            screening: 'Al menos una vez en la vida, anual si factores de riesgo'
        },
        'vdrl': {
            field: 'VDRL',
            notesField: 'Observaciones - VDRL',
            name: 'VDRL (Sífilis)',
            riskGroups: ['Embarazadas', 'Personas sexualmente activas', 'Hombres que tienen sexo con hombres'],
            screening: 'Anual si factores de riesgo'
        },
        'chagas': {
            field: 'Chagas',
            notesField: 'Observaciones - Chagas',
            name: 'Chagas',
            riskGroups: ['Zonas endémicas', 'Madres positivas', 'Transfusiones antes de 2005'],
            screening: 'Al menos una vez en la vida si factores de riesgo'
        }
    };
    
    // Procesar cada examen
    for (const [testId, testInfo] of Object.entries(infectiousTests)) {
        const valueElement = document.getElementById(`${testId}-value`);
        const notesElement = document.getElementById(`${testId}-notes`);
        const cardElement = document.getElementById(`${testId}-card`);
        
        // Obtener el valor del campo, normalizando posibles variaciones
        let value = data[testInfo.field] || 'No registrado';
        const notes = data[testInfo.notesField] || '';
        
        // Normalizar valores
        value = value.toString().trim();
        
        // Verificar si el valor contiene alguna de las palabras clave
        const isPositive = /positivo|reactivo|detectado|presenta/i.test(value);
        const isNegative = /negativo|no reactivo|no presenta/i.test(value);
        const isNotDone = /no se realiza|no realizado|no efectuado/i.test(value);
        
        valueElement.textContent = value;
        
        // Establecer estilo según resultado
        if (isPositive) {
            cardElement.className = 'p-4 rounded-lg risk-high';
            notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Resultado positivo - Requiere atención</span>';
            
            // Agregar recomendación urgente
            recommendationsList.innerHTML += `
                <li class="text-red-600 font-medium">
                    <strong>${testInfo.name}:</strong> Resultado positivo (${value}). Consultar con especialista urgentemente.
                </li>
            `;
        } else if (isNegative) {
            cardElement.className = 'p-4 rounded-lg risk-low';
            notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Resultado negativo</span>';
        } else if (isNotDone) {
            cardElement.className = 'p-4 rounded-lg bg-gray-100';
            notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
            
            // Recomendación de screening según factores de riesgo
            recommendationsList.innerHTML += `
                <li>
                    <strong>${testInfo.name}:</strong> Prueba recomendada para ${testInfo.riskGroups.join(', ')}. 
                    <span class="text-blue-600">Frecuencia: ${testInfo.screening}.</span>
                </li>
            `;
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
    infectiousDiv.classList.remove('hidden');
}
function evaluateHealthyHabits(data) {
    const habitsDiv = document.getElementById('healthy-habits');
    const recommendationsList = document.getElementById('habits-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Mapeo de hábitos saludables con patrones de detección mejorados
    const healthyHabits = {
        'alimentacion': {
            field: 'Alimentacion_saludable',
            notesField: 'Observaciones - Alimentacion_saludable',
            name: 'Alimentación Saludable',
            recommendationPositive: 'Excelentes hábitos alimenticios, continúa así',
            recommendationNegative: 'Considera mejorar tu dieta con más frutas, verduras y alimentos integrales',
            recommendationNotDone: 'Recomendación: Evaluación nutricional anual'
        },
        'actividad': {
            field: 'Actividad_fisica',
            notesField: 'Observaciones - Actividad_fisica',
            name: 'Actividad Física',
            recommendationPositive: 'Buen nivel de actividad física, mantén la rutina',
            recommendationNegative: 'Intenta realizar al menos 150 minutos de actividad moderada por semana',
            recommendationNotDone: 'Recomendación: Evaluación de actividad física anual'
        },
        'seguridad': {
            field: 'Seguridad_vial',
            notesField: 'Observaciones - Seguridad_vial',
            name: 'Seguridad Vial',
            recommendationPositive: 'Buenas prácticas de seguridad vial',
            recommendationNegative: 'Recuerda usar siempre cinturón de seguridad y casco en motocicletas',
            recommendationNotDone: 'Recomendación: Revisión de hábitos de seguridad vial'
        },
        'caidas': {
            field: 'Caidas_en_adultos_mayores',
            notesField: 'Observaciones - Caidas_en_adultos_mayores',
            name: 'Prevención de Caídas',
            recommendationPositive: 'Buenas medidas de prevención de caídas',
            recommendationNegative: 'Evalúa la seguridad en tu hogar y usa calzado adecuado',
            recommendationNotDone: 'Recomendación: Evaluación de riesgo de caídas'
        },
        'alcohol': {
            field: 'Abuso_alcohol',
            notesField: 'Observaciones - Abuso_alcohol',
            name: 'Consumo de Alcohol',
            recommendationPositive: 'Consumo responsable o nulo de alcohol',
            recommendationNegative: 'Considera reducir el consumo de alcohol',
            recommendationNotDone: 'Recomendación: Evaluación de consumo de alcohol anual'
        },
        'tabaco': {
            field: 'Tabaco',
            notesField: 'Observaciones - Tabaco',
            name: 'Consumo de Tabaco',
            recommendationPositive: 'No fumas o has dejado de fumar, excelente decisión',
            recommendationNegative: 'Dejar de fumar es lo mejor para tu salud',
            recommendationNotDone: 'Recomendación: Evaluación de hábito tabáquico'
        },
        'acido': {
            field: 'Acido_folico',
            notesField: 'Observaciones - Acido_folico',
            name: 'Ácido Fólico',
            recommendationPositive: 'Niveles adecuados de ácido fólico',
            recommendationNegative: 'Considera suplementación si estás en edad fértil',
            recommendationNotDone: 'Recomendación: Evaluación de niveles de ácido fólico'
        }
    };
    
    // Procesar cada hábito
    for (const [habitId, habitInfo] of Object.entries(healthyHabits)) {
        const valueElement = document.getElementById(`${habitId}-value`);
        const notesElement = document.getElementById(`${habitId}-notes`);
        const cardElement = document.getElementById(`${habitId}-card`);
        
        // Obtener el valor del campo
        let value = data[habitInfo.field] || 'No registrado';
        const notes = data[habitInfo.notesField] || '';
        
        // Normalizar valores
        value = value.toString().trim();
        
        // Verificar patrones (similar al módulo de infecciosas)
        const isPositive = /adecuad[ao]|buen[ao]|No se verifica|si|Cumple|no abusa|No fuma|nunca|Indicado/i.test(value);
        const isNegative = /No Cumple|Se verifica|no|No cumple|abusa|excesiv[ao]|Fuma|sedentario|poc[ao]/i.test(value);
        const isNotDone = /No se Realiza|no realizado|No indicado|pendiente/i.test(value);
        
        valueElement.textContent = value;
        
        // Establecer estilo según resultado
        if (isPositive) {
            cardElement.className = 'p-4 rounded-lg risk-low';
            notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Adecuado</span>';
            
            // Agregar recomendación positiva
            recommendationsList.innerHTML += `
                <li class="text-green-600">
                    <strong>${habitInfo.name}:</strong> ${habitInfo.recommendationPositive}
                </li>
            `;
        } else if (isNegative) {
            cardElement.className = 'p-4 rounded-lg risk-high';
            notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Requiere mejora</span>';
            
            // Agregar recomendación
            recommendationsList.innerHTML += `
                <li class="text-red-600 font-medium">
                    <strong>${habitInfo.name}:</strong> ${habitInfo.recommendationNegative}
                </li>
            `;
        } else if (isNotDone) {
            cardElement.className = 'p-4 rounded-lg bg-gray-100';
            notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
            
            // Agregar recomendación
            recommendationsList.innerHTML += `
                <li>
                    <strong>${habitInfo.name}:</strong> ${habitInfo.recommendationNotDone}
                </li>
            `;
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
    habitsDiv.classList.remove('hidden');
}
function evaluateDentalHealth(data) {
    const dentalDiv = document.getElementById('dental-health');
    const recommendationsList = document.getElementById('dental-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['Control_odontologico'] || 'No registrado';
    const notes = data['Observaciones - Control_odontologico'] || '';
    
    // Mostrar valores
    document.getElementById('odontologico-value').textContent = value;
    
    // Evaluar resultado
    const isHighRisk = /riesgo alto/i.test(value);
    const isModerateRisk = /riesgo moderado/i.test(value);
    const isLowRisk = /riesgo bajo/i.test(value);
    const isNotDone = /no se realiza/i.test(value);
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('odontologico-card');
    const notesElement = document.getElementById('odontologico-notes');
    
    if (isHighRisk) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Riesgo Alto</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Consulta odontológica urgente requerida</li>
            <li>Evaluación cada 3 meses</li>
            <li>Reforzar higiene bucal</li>
        `;
    } else if (isModerateRisk) {
        cardElement.className = 'p-4 rounded-lg risk-medium';
        notesElement.innerHTML = '<span class="text-yellow-500"><i class="fas fa-exclamation-circle"></i> Riesgo Moderado</span>';
        recommendationsList.innerHTML = `
            <li class="text-yellow-600 font-medium">Consulta odontológica recomendada</li>
            <li>Evaluación cada 6 meses</li>
            <li>Mejorar técnicas de cepillado</li>
        `;
    } else if (isLowRisk) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Riesgo Bajo</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Control anual odontológico</li>
            <li>Mantener buenos hábitos de higiene</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Recomendado: Control odontológico anual</li>
            <li>Importante para salud general</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    dentalDiv.classList.remove('hidden');
}
function evaluateMentalHealth(data) {
    const mentalDiv = document.getElementById('mental-health');
    const recommendationsList = document.getElementById('mental-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Evaluar Depresión
    const depresionValue = data['Depresion'] || '';
    const depresionNotes = data['Observaciones - Depresion'] || '';
    
    document.getElementById('depresion-value').textContent = depresionValue || 'No registrado';
    
    // Detección corregida (insensible a mayúsculas/minúsculas y espacios)
    const isDepresion = /^se\s*verifica$/i.test(depresionValue.trim());
    const isNotDepresion = /^no\s*se\s*verifica$/i.test(depresionValue.trim());
    
    const depresionCard = document.getElementById('depresion-card');
    const depresionNotesElement = document.getElementById('depresion-notes');
    
    if (isDepresion) {
        depresionCard.className = 'p-4 rounded-lg risk-high';
        depresionNotesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Se verifica</span>';
        recommendationsList.innerHTML += `
            <li class="text-red-600 font-medium">Depresión detectada: Evaluación por especialista requerida</li>
            <li>Considerar intervención psicológica/psiquiátrica</li>
        `;
    } else if (isNotDepresion) {
        depresionCard.className = 'p-4 rounded-lg risk-low';
        depresionNotesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No se verifica</span>';
        recommendationsList.innerHTML += `
            <li class="text-green-600">Sin indicios de depresión detectados</li>
        `;
    } else {
        depresionCard.className = 'p-4 rounded-lg bg-gray-100';
        depresionNotesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Evaluar Violencia (misma lógica corregida)
    const violenciaValue = data['Violencia'] || '';
    const violenciaNotes = data['Observaciones - Violencia'] || '';
    
    document.getElementById('violencia-value').textContent = violenciaValue || 'No registrado';
    
    const isViolencia = /^se\s*verifica$/i.test(violenciaValue.trim());
    const isNotViolencia = /^no\s*se\s*verifica$/i.test(violenciaValue.trim());
    
    const violenciaCard = document.getElementById('violencia-card');
    const violenciaNotesElement = document.getElementById('violencia-notes');
    
    if (isViolencia) {
        violenciaCard.className = 'p-4 rounded-lg risk-high';
        violenciaNotesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Se verifica</span>';
        recommendationsList.innerHTML += `
            <li class="text-red-600 font-medium">Violencia detectada: Intervención urgente necesaria</li>
            <li>Contactar con servicios de protección</li>
            <li>Protocolo de actuación frente a violencia</li>
        `;
    } else if (isNotViolencia) {
        violenciaCard.className = 'p-4 rounded-lg risk-low';
        violenciaNotesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No se verifica</span>';
        recommendationsList.innerHTML += `
            <li class="text-green-600">Sin indicios de violencia detectados</li>
        `;
    } else {
        violenciaCard.className = 'p-4 rounded-lg bg-gray-100';
        violenciaNotesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones si existen
    if (depresionNotes) {
        depresionNotesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${depresionNotes}</div>`;
    }
    if (violenciaNotes) {
        violenciaNotesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${violenciaNotes}</div>`;
    }
    
    // Mostrar sección
    mentalDiv.classList.remove('hidden');
}
function evaluateRenalHealth(data) {
    const renalDiv = document.getElementById('renal-health');
    const recommendationsList = document.getElementById('renal-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['ERC'] || 'No registrado';
    const notes = data['Observaciones - ERC'] || '';
    
    // Mostrar valores
    document.getElementById('erc-value').textContent = value;
    
    // Evaluar resultado
    const isNormal = /normal/i.test(value);
    const isPathological = /patol[oó]gico/i.test(value);
    const isNotDone = /no se realiza/i.test(value);
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('erc-card');
    const notesElement = document.getElementById('erc-notes');
    
    if (isPathological) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Resultado Patológico</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Evaluación nefrológica urgente requerida</li>
            <li>Control estricto de función renal</li>
            <li>Monitorizar presión arterial</li>
        `;
    } else if (isNormal) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Normal</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Control anual de función renal</li>
            <li>Mantener buena hidratación</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Recomendado: Evaluación de función renal</li>
            <li>Especialmente si hay factores de riesgo</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    renalDiv.classList.remove('hidden');
}
function evaluateEPOC(data) {
    const epocDiv = document.getElementById('epoc-section');
    const recommendationsList = document.getElementById('epoc-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['EPOC'] || '';
    const notes = data['Observaciones - EPOC'] || '';
    
    // Mostrar valores
    document.getElementById('epoc-value').textContent = value || 'No registrado';
    
    // Evaluar resultado
    const isPositive = /^se\s*verifica$/i.test(value.trim());
    const isNegative = /^no\s*se\s*verifica$/i.test(value.trim());
    const isNotDone = /^no\s*se\s*realiza$/i.test(value.trim());
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('epoc-card');
    const notesElement = document.getElementById('epoc-notes');
    
    if (isPositive) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">EPOC detectado: Evaluación neumológica</li>
            <li>Rehabilitación pulmonar recomendada</li>
            <li>Evitar exposición a humos/contaminantes</li>
        `;
    } else if (isNegative) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Sin indicios de EPOC detectados</li>
            <li>Continuar con prevención en fumadores</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Evaluación recomendada para fumadores</li>
            <li>Espirometría como prueba diagnóstica</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    epocDiv.classList.remove('hidden');
}

function evaluateAneurisma(data) {
    const aneurismaDiv = document.getElementById('aneurisma-section');
    const recommendationsList = document.getElementById('aneurisma-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['Aneurisma_aorta'] || '';
    const notes = data['Observaciones - Aneurisma_aorta'] || '';
    
    // Mostrar valores
    document.getElementById('aneurisma-value').textContent = value || 'No registrado';
    
    // Evaluar resultado
    const isPositive = /^se\s*verifica$/i.test(value.trim());
    const isNegative = /^no\s*se\s*verifica$/i.test(value.trim());
    const isNotDone = /^no\s*se\s*realiza$/i.test(value.trim());
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('aneurisma-card');
    const notesElement = document.getElementById('aneurisma-notes');
    
    if (isPositive) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Aneurisma detectado: Urgencia vascular</li>
            <li>Evaluación por cirugía vascular</li>
            <li>Control estricto de presión arterial</li>
        `;
    } else if (isNegative) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Sin evidencia de aneurisma</li>
            <li>Control en pacientes de riesgo</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Recomendado en fumadores >65 años</li>
            <li>Ecografía abdominal de screening</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    aneurismaDiv.classList.remove('hidden');
}

function evaluateOsteoporosis(data) {
    const osteoporosisDiv = document.getElementById('osteoporosis-section');
    const recommendationsList = document.getElementById('osteoporosis-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['Osteoporosis'] || '';
    const notes = data['Observaciones - Osteoporosis'] || '';
    
    // Mostrar valores
    document.getElementById('osteoporosis-value').textContent = value || 'No registrado';
    
    // Evaluar resultado
    const isPositive = /^se\s*verifica$/i.test(value.trim());
    const isNegative = /^no\s*se\s*verifica$/i.test(value.trim());
    const isNotDone = /^no\s*se\s*realiza$/i.test(value.trim());
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('osteoporosis-card');
    const notesElement = document.getElementById('osteoporosis-notes');
    
    if (isPositive) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Osteoporosis confirmada</li>
            <li>Suplementación con calcio/vitamina D</li>
            <li>Evaluación para tratamiento específico</li>
        `;
    } else if (isNegative) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No se verifica</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Densidad ósea normal</li>
            <li>Mantener ingesta adecuada de calcio</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Recomendado en mujeres >65 años</li>
            <li>Densitometría ósea como prueba clave</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    osteoporosisDiv.classList.remove('hidden');
}

function evaluateAspirina(data) {
    const aspirinaDiv = document.getElementById('aspirina-section');
    const recommendationsList = document.getElementById('aspirina-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['Aspirina'] || '';
    const notes = data['Observaciones - Aspirina'] || '';
    
    // Mostrar valores
    document.getElementById('aspirina-value').textContent = value || 'No registrado';
    
    // Evaluar resultado
    const isIndicated = /^indicada$/i.test(value.trim());
    const isNotIndicated = /^no\s*indicada$/i.test(value.trim());
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('aspirina-card');
    const notesElement = document.getElementById('aspirina-notes');
    
    if (isIndicated) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Indicada</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Aspirina indicada para prevención</li>
            <li>Dosis usual: 75-100 mg/día</li>
            <li>Monitorizar efectos gastrointestinales</li>
        `;
    } else if (isNotIndicated) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> No indicada</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Sin indicación actual de aspirina</li>
            <li>Reevaluar según factores de riesgo</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
        recommendationsList.innerHTML = `
            <li>Evaluar indicación según riesgo CV</li>
            <li>Balancear riesgo/beneficio individual</li>
        `;
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    aspirinaDiv.classList.remove('hidden');
}
function evaluateVisualHealth(data) {
    const visualDiv = document.getElementById('visual-health');
    const recommendationsList = document.getElementById('visual-recommendations');
    
    // Limpiar recomendaciones previas
    recommendationsList.innerHTML = '';
    
    // Obtener valores
    const value = data['Agudeza_visual'] || '';
    const notes = data['Observaciones - Agudeza visual'] || '';
    
    // Mostrar valores
    document.getElementById('agudeza-value').textContent = value || 'No registrado';
    
    // Evaluar resultado
    const isAlterada = /Alterada/i.test(value);
    const isNormal = /Normal/i.test(value);
    const isControlNormal = /Control Normal/i.test(value);
    const isNotDone = /No se Realiza|no realizado/i.test(value);
    
    // Aplicar estilos y recomendaciones
    const cardElement = document.getElementById('agudeza-card');
    const notesElement = document.getElementById('agudeza-notes');
    
    if (isAlterada) {
        cardElement.className = 'p-4 rounded-lg risk-high';
        notesElement.innerHTML = '<span class="text-red-500"><i class="fas fa-exclamation-triangle"></i> Alterada</span>';
        recommendationsList.innerHTML = `
            <li class="text-red-600 font-medium">Agudeza visual alterada detectada</li>
            <li>Evaluación oftalmológica urgente recomendada</li>
            <li>Considerar corrección visual</li>
        `;
    } else if (isNormal || isControlNormal) {
        cardElement.className = 'p-4 rounded-lg risk-low';
        notesElement.innerHTML = '<span class="text-green-500"><i class="fas fa-check-circle"></i> Normal</span>';
        recommendationsList.innerHTML = `
            <li class="text-green-600">Agudeza visual dentro de parámetros normales</li>
            <li>Control anual recomendado</li>
        `;
    } else if (isNotDone) {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-info-circle"></i> No realizado</span>';
        recommendationsList.innerHTML = `
            <li>Evaluación de agudeza visual recomendada</li>
            <li>Realizar en próximo control de salud</li>
            <li>Importante para detección temprana de problemas visuales</li>
        `;
    } else {
        cardElement.className = 'p-4 rounded-lg bg-gray-100';
        notesElement.innerHTML = '<span class="text-gray-500"><i class="fas fa-question-circle"></i> No registrado</span>';
    }
    
    // Mostrar observaciones
    if (notes) {
        notesElement.innerHTML += `<div class="mt-1 text-gray-600">Obs: ${notes}</div>`;
    }
    
    // Mostrar sección
    visualDiv.classList.remove('hidden');
}
function resetProfile() {
    document.getElementById('user-name').textContent = 'Nombre Apellido';
    document.getElementById('welcome-message').innerHTML = 
        '¡Hola! Este programa es para ayudarte y acompañarte en el cuidado de tu salud.';
    document.getElementById('risk-assessment').classList.add('hidden');
    document.getElementById('cancer-prevention').classList.add('hidden');
    document.getElementById('infectious-diseases').classList.add('hidden');
    document.getElementById('healthy-habits').classList.add('hidden');
    document.getElementById('dental-health').classList.add('hidden');
    document.getElementById('mental-health').classList.add('hidden');
    document.getElementById('renal-health').classList.add('hidden');
    document.getElementById('epoc-section').classList.add('hidden');
    document.getElementById('aneurisma-section').classList.add('hidden');
    document.getElementById('osteoporosis-section').classList.add('hidden');
    document.getElementById('aspirina-section').classList.add('hidden');
    document.getElementById('visual-health').classList.add('hidden');
}