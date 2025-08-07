document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formulario-enfermeria');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Crear un objeto FormData para incluir campos de texto y archivos
        const formData = new FormData(form);

        // Validar que los campos básicos no estén vacíos
        if (!formData.get('DNI') || !formData.get('Nombre') || !formData.get('Apellido')) {
            alert('Por favor, completa los campos de DNI, Nombre y Apellido.');
            return;
        }

        try {
            const response = await fetch('/api/enfermeria/guardar', {
                method: 'POST',
                body: formData // FormData se envía directamente con fetch
            });

            const result = await response.json();

            if (response.ok) {
                alert('Datos de enfermería guardados correctamente.');
                form.reset(); // Limpiar el formulario después del éxito
            } else {
                alert(`Error al guardar los datos: ${result.message}`);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Ocurrió un error al intentar guardar los datos.');
        }
    });
});