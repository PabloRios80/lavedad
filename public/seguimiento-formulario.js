// public/seguimiento-formulario.js

document.addEventListener('DOMContentLoaded', () => {
    const afiliadoNombreSpan = document.getElementById('afiliado-nombre');
    const afiliadoDniSpan = document.getElementById('afiliado-dni');
    const motivosSeguimientoContainer = document.getElementById('motivos-seguimiento-container');
    const guardarSeguimientoBtn = document.getElementById('guardar-seguimiento-btn');
    const cancelarSeguimientoBtn = document.getElementById('cancelar-seguimiento-btn');
    const observacionProfesionalTextarea = document.getElementById('observacion-profesional');
    const pdfLinksTextarea = document.getElementById('pdf-links');
    const seguimientoFechaInput = document.getElementById('seguimiento-fecha');
    
    let currentPatientData = null;
    let redFlagsData = [];

    // Precargar la fecha actual en el campo de fecha
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // Months start at 0!
    const dd = String(today.getDate()).padStart(2, '0');
    seguimientoFechaInput.value = `${yyyy}-${mm}-${dd}`;

    // Cargar datos del paciente y motivos desde sessionStorage
    const patientDataJSON = sessionStorage.getItem('currentPatientForSeguimiento');
    const redFlagsJSON = sessionStorage.getItem('redFlagsForSeguimiento');

    if (patientDataJSON && redFlagsJSON) {
        currentPatientData = JSON.parse(patientDataJSON);
        redFlagsData = JSON.parse(redFlagsJSON);

        afiliadoNombreSpan.textContent = `${currentPatientData.Apellido || ''}, ${currentPatientData.Nombre || ''}`;
        afiliadoDniSpan.textContent = currentPatientData.DNI || currentPatientData.Documento || 'No especificado';

        renderMotivosSeguimiento(redFlagsData);
    } else {
        alert('No se encontraron datos del paciente para generar el formulario de seguimiento. Vuelva a la página principal y busque un paciente.');
        // Opcional: Redirigir o deshabilitar el formulario
        motivosSeguimientoContainer.innerHTML = '<p class="text-red-500">Error: No se pudieron cargar los datos del paciente.</p>';
        guardarSeguimientoBtn.disabled = true;
    }

    function renderMotivosSeguimiento(motivos) {
        motivosSeguimientoContainer.innerHTML = ''; // Limpiar el mensaje de carga
        if (motivos.length === 0) {
            motivosSeguimientoContainer.innerHTML = '<p class="text-gray-600">No se identificaron puntos de seguimiento para este paciente.</p>';
            return;
        }

        motivos.forEach(motivo => {
            const motivoDiv = document.createElement('div');
            motivoDiv.className = 'bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200';
            motivoDiv.innerHTML = `
                <h4 class="text-lg font-semibold text-blue-800 mb-2">${motivo}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-gray-700 text-sm font-bold mb-2">Calificación del Tratamiento y Autocuidado:</label>
                        <div class="flex items-center space-x-4">
                            <label class="inline-flex items-center">
                                <input type="radio" class="form-radio text-green-600" name="calificacion-${motivo.replace(/\s+/g, '-')}" value="Bueno" checked>
                                <span class="ml-2 text-gray-700">Bueno</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" class="form-radio text-yellow-600" name="calificacion-${motivo.replace(/\s+/g, '-')}" value="Regular">
                                <span class="ml-2 text-gray-700">Regular</span>
                            </label>
                            <label class="inline-flex items-center">
                                <input type="radio" class="form-radio text-red-600" name="calificacion-${motivo.replace(/\s+/g, '-')}" value="Malo">
                                <span class="ml-2 text-gray-700">Malo</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label for="observaciones-${motivo.replace(/\s+/g, '-')}" class="block text-gray-700 text-sm font-bold mb-2">Observaciones:</label>
                        <textarea id="observaciones-${motivo.replace(/\s+/g, '-')}" rows="2" class="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
                    </div>
                </div>
            `;
            motivosSeguimientoContainer.appendChild(motivoDiv);
        });
    }

    // Manejar el guardado del formulario
    guardarSeguimientoBtn.addEventListener('click', async () => {
        const profesionalNombre = document.getElementById('profesional-nombre').value.trim();
        const profesionalMatricula = document.getElementById('profesional-matricula').value.trim();
        const seguimientoFecha = seguimientoFechaInput.value;
        const afiliadoDni = afiliadoDniSpan.textContent;

        if (!profesionalNombre || !profesionalMatricula || !seguimientoFecha) {
            alert('Por favor, complete los datos del profesional y la fecha de seguimiento.');
            return;
        }

        const seguimientoData = {
            fecha: seguimientoFecha,
            profesional: {
                nombre: profesionalNombre,
                matricula: profesionalMatricula
            },
            paciente: {
                dni: afiliadoDni,
                nombre: afiliadoNombreSpan.textContent // Ya está en formato Apellido, Nombre
            },
            evaluaciones: [],
            observacionProfesional: observacionProfesionalTextarea.value.trim(),
            pdfLinks: pdfLinksTextarea.value.split('\n').map(link => link.trim()).filter(link => link !== '')
        };

        redFlagsData.forEach(motivo => {
            const calificacion = document.querySelector(`input[name="calificacion-${motivo.replace(/\s+/g, '-')}"]:checked`).value;
            const observaciones = document.getElementById(`observaciones-${motivo.replace(/\s+/g, '-')}`).value.trim();
            seguimientoData.evaluaciones.push({
                motivo: motivo,
                calificacion: calificacion,
                observaciones: observaciones
            });
        });

        try {
            const response = await fetch('/api/seguimiento/guardar', { // Nueva ruta en el backend
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(seguimientoData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Informe de seguimiento guardado con éxito.');
                // Opcional: Cerrar la ventana o redirigir
                window.close(); 
            } else {
                alert(`Error al guardar el informe de seguimiento: ${result.error}`);
            }
        } catch (error) {
            console.error('Error de red al guardar el seguimiento:', error);
            alert('Error de conexión al guardar el informe de seguimiento.');
        }
    });

    // Manejar el botón de cancelar
    cancelarSeguimientoBtn.addEventListener('click', () => {
        if (confirm('¿Está seguro que desea cancelar? Se perderán los cambios no guardados.')) {
            window.close();
        }
    });
});