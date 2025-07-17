document.addEventListener('DOMContentLoaded', () => {
    const dniInput = document.getElementById('paciente-dni');
    const cargarDatosBtn = document.getElementById('cargar-datos-btn');
    const pacienteApellidoInput = document.getElementById('paciente-apellido');
    const pacienteNombreInput = document.getElementById('paciente-nombre');
    const pacienteEdadInput = document.getElementById('paciente-edad');
    const pacienteSexoSelect = document.getElementById('paciente-sexo');
    const restOfFormFieldsDiv = document.getElementById('rest-of-form-fields');
    const guardarCierreBtn = document.getElementById('guardar-cierre-btn');
    const cancelarCierreBtn = document.getElementById('cancelar-cierre-btn');
    const fechaCierreDpInput = document.getElementById('fecha_cierre_dp'); // Esta línea ahora dará NULL inicialmente, lo corregiremos
                                                                        // Más abajo, al generar el formulario.
    let currentPatientData = null; // Para almacenar los datos del paciente actual
    let formattedDate = ''; // Declarar aquí para que sea accesible en otras funciones.

    // Deshabilita el botón de guardar y los campos inicialmente
    guardarCierreBtn.disabled = true;    
     // Función para limpiar y deshabilitar los campos de paciente
    function resetPatientFields() {
        dniInput.value = ''; // Limpiamos el DNI también al resetear
        pacienteApellidoInput.value = '';
        pacienteNombreInput.value = '';
        pacienteEdadInput.value = '';
        pacienteSexoSelect.value = '';
        pacienteApellidoInput.readOnly = true;
        pacienteNombreInput.readOnly = true;
        pacienteEdadInput.readOnly = true;
        pacienteSexoSelect.disabled = true;
        
        // =========================================================================================
        // COMIENZO DE LA MODIFICACIÓN: Ajustar el contenido inicial de restOfFormFieldsDiv
        restOfFormFieldsDiv.innerHTML = '<p class="text-gray-500 text-center">Ingrese un DNI y haga clic en "Cargar Datos" para ver el resto del formulario.</p>';
        // FIN DE LA MODIFICACIÓN
        // =========================================================================================

        guardarCierreBtn.disabled = true;
        currentPatientData = null;

        // =========================================================================================
        // COMIENZO DE LA MODIFICACIÓN: Restablecer la fecha de cierre aquí también
        const today = new Date();
        formattedDate = today.getFullYear() + '-' +
                            String(today.getMonth() + 1).padStart(2, '0') + '-' +
                            String(today.getDate()).padStart(2, '0');
        // Si fechaCierreDpInput no es null (es decir, ya se generó el campo), actualízalo.
        // Si no, no hacemos nada porque se generará con la fecha correcta más tarde.
        const currentFechaCierreInput = document.getElementById('fecha_cierre_dp');
        if (currentFechaCierreInput) {
            currentFechaCierreInput.value = formattedDate;
        }
        
    }

    // Función para generar dinámicamente el resto de los campos del formulario
    function generateRestOfForm(patientData) {
        restOfFormFieldsDiv.innerHTML = ''; // Limpiar contenido previo

        // Define la estructura de tus campos con sus opciones y si necesitan botón de estudio
        // IMPORTANTÍSIMO: Los 'name' y 'id' deben coincidir con las columnas de tu Google Sheet
        const fieldsConfig = [
            { name: 'Presion_Arterial', label: 'Presión Arterial', type: 'select', options: ['Control Normal', 'Hipertensión', 'No se realiza'], required: true },
            { name: 'Observaciones_Presion_Arterial', label: 'Obs. Presión Arterial', type: 'textarea', required: false },
            { name: 'IMC', label: 'IMC', type: 'select', options: ['Bajo Peso', 'Control Normal', 'Sobrepeso', 'Obesidad', 'Obesidad Grado II', 'Obesidad Mórbida', 'No se realiza'], required: true },
            { name: 'Observaciones_IMC', label: 'Obs. IMC', type: 'textarea', required: false },
            { name: 'Agudeza_visual', label: 'Agudeza Visual', type: 'select', options: ['Alterada', 'Control Normal', 'No se realiza'], required: true },
            { name: 'Observaciones_Agudeza_visual', label: 'Obs. Agudeza Visual', type: 'textarea', required: false },
            { name: 'Control_odontologico', label: 'Control Odontológico', type: 'select', options: ['Control Normal', 'No se realiza', 'Riesgo'], hasStudyButton: true, studyType: 'Odontologia', required: true },
            { name: 'Observaciones_Control_odontologico', label: 'Obs. Control Odontológico', type: 'textarea', required: false },
            { name: 'Alimentacion_saludable', label: 'Alimentación Saludable', type: 'select', options: ['Sí', 'No'], required: true },
            { name: 'Observaciones_Alimentacion_saludable', label: 'Obs. Alimentación Saludable', type: 'textarea', required: false },
            { name: 'Actividad_fisica', label: 'Actividad Física', type: 'select', options: ['Sí realiza', 'No realiza'], required: true },
            { name: 'Observaciones_Actividad_fisica', label: 'Obs. Actividad Física', type: 'textarea', required: false },
            { name: 'Seguridad_vial', label: 'Seguridad Vial', type: 'select', options: ['Cumple', 'No cumple', 'No realiza'], required: true },
            { name: 'Observaciones_Seguridad_vial', label: 'Obs. Seguridad Vial', type: 'textarea', required: false },
            { name: 'Cuidados_adultos_mayores', label: 'Cuidados Adultos Mayores', type: 'select', options: ['No se realiza', 'Se verifica'], required: true },
            { name: 'Observaciones_Cuidados_adultos_mayores', label: 'Obs. Cuidados Adultos Mayores', type: 'textarea', required: false },
            { name: 'Acido_folico', label: 'Ácido Fólico', type: 'select', options: ['Indicado', 'No indicado'], required: true },
            { name: 'Observaciones_Acido_folico', label: 'Obs. Ácido Fólico', type: 'textarea', required: false },
            { name: 'Abuso_alcohol', label: 'Abuso Alcohol', type: 'select', options: ['Abuso', 'No abusa', 'No se realiza'], required: true },
            { name: 'Observaciones_Abuso_alcohol', label: 'Obs. Abuso Alcohol', type: 'textarea', required: false },
            { name: 'Tabaco', label: 'Tabaco', type: 'select', options: ['Fuma', 'No fuma'], required: true },
            { name: 'Observaciones_Tabaco', label: 'Obs. Tabaco', type: 'textarea', required: false },
            { name: 'Violencia', label: 'Violencia', type: 'select', options: ['Se verifica', 'No se verifica', 'No se realiza'], required: true },
            { name: 'Observaciones_Violencia', label: 'Obs. Violencia', type: 'textarea', required: false },
            { name: 'Depresion', label: 'Depresión', type: 'select', options: ['Se verifica', 'No se verifica', 'No se realiza'], required: true },
            { name: 'Observaciones_Depresion', label: 'Obs. Depresión', type: 'textarea', required: false },
            { name: 'ITS', label: 'ITS', type: 'select', options: ['Negativo', 'Positivo', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_ITS', label: 'Obs. ITS', type: 'textarea', required: false },
            { name: 'Hepatitis_B', label: 'Hepatitis B', type: 'select', options: ['Negativo', 'Positivo', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Hepatitis_B', label: 'Obs. Hepatitis B', type: 'textarea', required: false },
            { name: 'Hepatitis_C', label: 'Hepatitis C', type: 'select', options: ['Negativo', 'Positivo', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Hepatitis_C', label: 'Obs. Hepatitis C', type: 'textarea', required: false },
            { name: 'VIH', label: 'VIH', type: 'select', options: ['Negativo', 'Positivo', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_VIH', label: 'Obs. VIH', type: 'textarea', required: false },
            { name: 'Dislipemias', label: 'Dislipemias', type: 'select', options: ['No presenta', 'Presenta', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Dislipemias', label: 'Obs. Dislipemias', type: 'textarea', required: false },
            { name: 'Diabetes', label: 'Diabetes', type: 'select', options: ['No presenta', 'Presenta', 'No se realiza'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Diabetes', label: 'Obs. Diabetes', type: 'textarea', required: false },
            { name: 'Cancer_cervico_uterino_HPV', label: 'Cáncer Cérvico Uterino (HPV)', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Cancer_cervico_uterino_HPV', label: 'Obs. Cáncer Cérvico Uterino (HPV)', type: 'textarea', required: false },
            { name: 'Cancer_cervico_uterino_PAP', label: 'Cáncer Cérvico Uterino (PAP)', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'Biopsia', required: true },
            { name: 'Observaciones_PAP', label: 'Obs. PAP', type: 'textarea', required: false },
            { name: 'Cancer_colon_SOMF', label: 'Cáncer Colon (SOMF)', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Cancer_colon_SOMF', label: 'Obs. Cáncer Colon (SOMF)', type: 'textarea', required: false },
            { name: 'Cancer_colon_Colonoscopia', label: 'Cáncer Colon (Colonoscopia)', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'VCC', required: true },
            { name: 'Observaciones_Colonoscopia', label: 'Obs. Colonoscopia', type: 'textarea', required: false },
            { name: 'Cancer_mama_Mamografia', label: 'Cáncer Mama (Mamografía)', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'Mamografia', required: true },
            { name: 'Observaciones_Mamografia', label: 'Obs. Mamografía', type: 'textarea', required: false },
            { name: 'ERC', label: 'ERC', type: 'select', options: ['Normal', 'Pendiente', 'No se realiza', 'Patologico'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_ECG', label: 'Obs. ECG', type: 'textarea', required: false },
            { name: 'EPOC', label: 'EPOC', type: 'select', options: ['Se verifica', 'No se verifica', 'No se realiza'], required: true },
            { name: 'Observaciones_EPOC', label: 'Obs. EPOC', type: 'textarea', required: false },
            { name: 'Aneurisma_aorta', label: 'Aneurisma Aorta', type: 'select', options: ['Se verifica', 'No se verifica', 'No se realiza'], hasStudyButton: true, studyType: 'Ecografia', required: true },
            { name: 'Observaciones_Aneurisma_aorta', label: 'Obs. Aneurisma Aorta', type: 'textarea', required: false },
            { name: 'Osteoporosis', label: 'Osteoporosis', type: 'select', options: ['Se verifica', 'No se verifica', 'No se realiza'], hasStudyButton: true, studyType: 'Densitometria', required: true },
            { name: 'Observaciones_Osteoporosis', label: 'Obs. Osteoporosis', type: 'textarea', required: false },
            { name: 'Estratificacion_riesgo_CV', label: 'Estratificación Riesgo CV', type: 'select', options: ['Alto', 'Bajo', 'Medio', 'Muy Alto'], required: true },
            { name: 'Observaciones_Riesgo_CV', label: 'Obs. Riesgo CV', type: 'textarea', required: false },
            { name: 'Aspirina', label: 'Aspirina', type: 'select', options: ['Indicado', 'No indicado'], required: true },
            { name: 'Observaciones_Aspirina', label: 'Obs. Aspirina', type: 'textarea', required: false },
            { name: 'Inmunizaciones', label: 'Inmunizaciones', type: 'select', options: ['Completo', 'Incompleto'], required: true },
            { name: 'Observaciones_Inmunizaciones', label: 'Obs. Inmunizaciones', type: 'textarea', required: false },
            { name: 'VDRL', label: 'VDRL', type: 'select', options: ['Negativo', 'Positivo', 'No aplica', 'Pendiente'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_VDRL', label: 'Obs. VDRL', type: 'textarea', required: false },
            { name: 'Prostata_PSA', label: 'Próstata (PSA)', type: 'select', options: ['Normal', 'Pendiente', 'No aplica', 'Patologico'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_PSA', label: 'Obs. PSA', type: 'textarea', required: false },
            { name: 'Chagas', label: 'Chagas', type: 'select', options: ['Negativo', 'Positivo', 'No aplica', 'Pendiente'], hasStudyButton: true, studyType: 'Laboratorio', required: true },
            { name: 'Observaciones_Chagas', label: 'Obs. Chagas', type: 'textarea', required: false },
            { name: 'Fecha_cierre_dp', label: 'Fecha Cierre DP', type: 'date', required: true }
        ];

        const formGrid = document.createElement('div');
        formGrid.className = 'grid grid-cols-1 md:grid-cols-2 gap-4'; // Grid para 2 columnas en pantallas medianas

        fieldsConfig.forEach(field => {
            const fieldContainer = document.createElement('div');
            fieldContainer.className = 'mb-4';

            const label = document.createElement('label');
            label.htmlFor = field.name;
            label.className = 'block text-gray-700 text-sm font-bold mb-2';
            label.textContent = field.label + ':';

            let inputElement;

            if (field.type === 'select') {
                inputElement = document.createElement('select');
                inputElement.className = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
                inputElement.id = field.name;
                inputElement.name = field.name;
                inputElement.required = field.required !== false; // <-- CAMBIO AQUÍ

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Seleccione';
                defaultOption.disabled = true;
                defaultOption.selected = true;
                inputElement.appendChild(defaultOption);

                field.options.forEach(optionText => {
                    const option = document.createElement('option');
                    option.value = optionText;
                    option.textContent = optionText;
                    inputElement.appendChild(option);
                });
            } else if (field.type === 'textarea') {
                inputElement = document.createElement('textarea');
                inputElement.className = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-20 resize-y';
                inputElement.id = field.name;
                inputElement.name = field.name;
                inputElement.required = field.required !== false; // <-- CAMBIO AQUÍ
            } else { // type 'text' o 'date' o 'number'
                inputElement = document.createElement('input');
                inputElement.type = field.type;
                inputElement.className = 'shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline';
                inputElement.id = field.name;
                inputElement.name = field.name;
                inputElement.required = field.required !== false;
            }

            // Precargar valor si existe en patientData
            if (patientData[field.name]) {
                inputElement.value = patientData[field.name];
            }
            // COMIENZO DE LA MODIFICACIÓN
            else if (field.name === 'Fecha_cierre_dp') {
                // Establecer la fecha actual solo si el campo es Fecha_cierre_dp y no hay un valor previo
                const today = new Date();
                const currentFormattedDate = today.getFullYear() + '-' +
                                            String(today.getMonth() + 1).padStart(2, '0') + '-' +
                                            String(today.getDate()).padStart(2, '0');
                inputElement.value = currentFormattedDate;
            }
            // FIN DE LA MODIFICACIÓN

            fieldContainer.appendChild(label);

            if (field.hasStudyButton) {
                const inputGroup = document.createElement('div');
                inputGroup.className = 'flex items-center';
                inputGroup.appendChild(inputElement);

                const studyButton = document.createElement('button');
                studyButton.className = 'bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-r ml-2 focus:outline-none focus:shadow-outline flex-shrink-0';
                studyButton.innerHTML = `<i class="fas fa-search mr-2"></i>Ver Estudio`;
                studyButton.dataset.studyType = field.studyType; // Almacenar el tipo de estudio
                studyButton.addEventListener('click', () => handleVerEstudio(studyButton.dataset.studyType, currentPatientData.DNI)); // Pasar DNI

                inputGroup.appendChild(studyButton);
                fieldContainer.appendChild(inputGroup);
            } else {
                fieldContainer.appendChild(inputElement);
            }

            formGrid.appendChild(fieldContainer);
        });

        restOfFormFieldsDiv.appendChild(formGrid);
    }

    async function handleVerEstudio(studyType, dni) {
        if (!dni) {
            alert('DNI del paciente no disponible para ver estudios.');
            return;
        }

        console.log(`Intentando ver estudio tipo: ${studyType} para DNI: ${dni}`);
        
        // Ejemplo hipotético de cómo podría ser tu función existente:
        if (typeof mostrarEstudiosModal === 'function') {
             mostrarEstudiosModal(dni, studyType); // Pasa el DNI y el tipo de estudio
        } else {
            alert('Función para mostrar estudios no encontrada. Asegúrate de que `mostrarEstudiosModal` esté definida globalmente o importada.');
            // Si no tienes una función global, tendríamos que implementar la lógica
            // para el fetch a /obtener-estudios-paciente y la creación del modal aquí.
            // Por ahora, mostrará un mensaje básico de la búsqueda del estudio.
            try {
                const response = await fetch('/obtener-estudios-paciente', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dni: dni })
                });
                const data = await response.json();
                if (data.success && data.estudios.length > 0) {
                    const filteredStudies = data.estudios.filter(s => s.TipoEstudio === studyType);
                    if (filteredStudies.length > 0) {
                        let studyDetails = `Estudios de ${studyType} para DNI ${dni}:\n\n`;
                        filteredStudies.forEach(s => {
                            studyDetails += `Fecha: ${s.Fecha || 'N/A'}\n`;
                            studyDetails += `Resultado: ${s.Resultado || s.ResultadosLaboratorio ? JSON.stringify(s.ResultadosLaboratorio, null, 2) : 'N/A'}\n`;
                            if (s.LinkPDF) {
                                studyDetails += `Link PDF: ${s.LinkPDF}\n`;
                            }
                            studyDetails += '--------------------\n';
                        });
                         alert(studyDetails); // Solo para pruebas, idealmente esto iría en un modal
                    } else {
                        alert(`No se encontraron estudios de tipo "${studyType}" para este DNI.`);
                    }
                } else {
                    alert(data.message || 'No se encontraron estudios para este DNI.');
                }
            } catch (error) {
                console.error('Error al obtener estudios:', error);
                alert('Error al obtener los estudios.');
            }
        }
    }
// Event Listener para el botón "Cargar Datos" (Simplificado, no busca en Google Sheets)
    cargarDatosBtn.addEventListener('click', () => {
        const dni = dniInput.value.trim();
        if (!dni) {
            alert('Por favor, ingrese un DNI.');
            return;
        }

        // Habilitar la edición de Nombre, Apellido, Edad, Sexo
        pacienteApellidoInput.removeAttribute('readOnly');
        pacienteNombreInput.removeAttribute('readOnly');
        pacienteEdadInput.removeAttribute('readOnly');
        pacienteSexoSelect.removeAttribute('disabled');

        // Limpiar los campos de paciente al "cargar" un nuevo DNI, ya que no estamos precargando
        pacienteApellidoInput.value = '';
        pacienteNombreInput.value = '';
        pacienteEdadInput.value = '';
        pacienteSexoSelect.value = '';

        // Generar el resto del formulario (pasamos un objeto vacío porque no hay datos previos)
        generateRestOfForm({}); // Llama a la función para dibujar los campos

        // Habilitar el botón de guardar
        guardarCierreBtn.disabled = false;
        
        // Ahora que el campo de fecha está generado, podemos asignarle la fecha actual.
        // Asegúrate de que 'fechaCierreDpInput' (que es global) tenga el valor correcto.
        // O lo buscas de nuevo si prefieres.
        const currentFechaCierreInput = document.getElementById('Fecha_cierre_dp'); // Nota: mayúscula en 'F'
        if (currentFechaCierreInput) {
            const today = new Date();
            const currentFormattedDate = today.getFullYear() + '-' +
                                        String(today.getMonth() + 1).padStart(2, '0') + '-' +
                                        String(today.getDate()).padStart(2, '0');
            currentFechaCierreInput.value = currentFormattedDate;
        }
    });

    // Validar DNI en tiempo real para habilitar/deshabilitar el botón de cargar datos
    dniInput.addEventListener('input', () => {
        if (dniInput.value.trim().length > 0) {
            cargarDatosBtn.disabled = false;
        } else {
            cargarDatosBtn.disabled = true;
            resetPatientFields(); // Llama a tu función para limpiar y ocultar
        }
    });

    // Asegurarse de que el botón cargarDatosBtn esté deshabilitado al cargar la página si el DNI está vacío
    if (!dniInput.value.trim()) {
        cargarDatosBtn.disabled = true;
    }
    // Event Listener para el botón "Guardar Cierre"
    guardarCierreBtn.addEventListener('click', async () => {
        // Validar que todos los campos obligatorios estén llenos
        const formInputs = restOfFormFieldsDiv.querySelectorAll('input, select, textarea');
        let allFieldsValid = true;
        const formData = {};

        // Incluir DNI, Apellido, Nombre, Edad, Sexo desde los campos fijos
        formData['DNI'] = dniInput.value.trim();
        formData['Apellido'] = pacienteApellidoInput.value.trim();
        formData['Nombre'] = pacienteNombreInput.value.trim();
        formData['Edad'] = pacienteEdadInput.value.trim();
        formData['Sexo'] = pacienteSexoSelect.value.trim();

    formInputs.forEach(input => {
    // Solo validar si el campo es requerido
    if (input.required && !input.value.trim()) { // input.required ya viene del field.required !== false
        allFieldsValid = false;
        input.classList.add('border-red-500'); // Resaltar campos vacíos
    } else {
        input.classList.remove('border-red-500');
    }
    formData[input.name] = input.value.trim(); // Recolectar todos los datos
});
        if (!allFieldsValid) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }

        guardarCierreBtn.disabled = true; // Deshabilitar para evitar múltiples envíos
        guardarCierreBtn.textContent = 'Guardando...';

        try {
            const response = await fetch('/api/cierre/guardar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();
if (result.success) {
                alert(result.message);
                // =========================================================================================
                // COMIENZO DE LA MODIFICACIÓN: Lógica de reseteo (REEMPLAZA window.location.reload();)
                // Limpiar campos fijos
                dniInput.value = '';
                pacienteApellidoInput.value = '';
                pacienteNombreInput.value = '';
                pacienteEdadInput.value = '';
                pacienteSexoSelect.value = '';

                // Volver a poner los campos fijos como readonly/disabled
                pacienteApellidoInput.readOnly = true;
                pacienteNombreInput.readOnly = true;
                pacienteEdadInput.readOnly = true;
                pacienteSexoSelect.disabled = true;

                // Restablecer la fecha actual en el campo de fecha de cierre
                // Lo buscamos de nuevo porque se generó dinámicamente
                const currentFechaCierreInput = document.getElementById('Fecha_cierre_dp'); // O 'fecha_cierre_dp' si cambiaste el config
                if (currentFechaCierreInput) {
                    const today = new Date();
                    const newFormattedDate = today.getFullYear() + '-' +
                                            String(today.getMonth() + 1).padStart(2, '0') + '-' +
                                            String(today.getDate()).padStart(2, '0');
                    currentFechaCierreInput.value = newFormattedDate;
                }

                // Ocultar el resto del formulario y deshabilitar el botón de guardar
                restOfFormFieldsDiv.innerHTML = '<p class="text-gray-500 text-center">Ingrese un DNI y haga clic en "Cargar Datos" para ver el resto del formulario.</p>';
                guardarCierreBtn.disabled = true;
                // FIN DE LA MODIFICACIÓN
                // =========================================================================================
            } else {
                alert(`Error al guardar: ${result.error}`);
            }

        } catch (error) {
            console.error('Error al guardar el formulario de cierre:', error);
            alert('Ocurrió un error al guardar el formulario. Intente nuevamente.');
        } finally {
            guardarCierreBtn.disabled = false;
            guardarCierreBtn.textContent = 'Guardar Cierre';
        }
    });

    // Event Listener para el botón "Cancelar"
    cancelarCierreBtn.addEventListener('click', () => {
        if (confirm('¿Está seguro de que desea cancelar? Se perderán los cambios no guardados.')) {
            window.location.reload(); // Simplemente recarga la página para resetear el formulario
        }
    });
});