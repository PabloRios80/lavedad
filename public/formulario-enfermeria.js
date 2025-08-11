document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('enfermeriaForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Crear un objeto FormData para incluir campos de texto y archivos
        const formData = new FormData(form);
        // Convierte FormData a un objeto JSON
        const data = Object.fromEntries(formData.entries());

        // Validar que los campos básicos no estén vacíos
        if (!formData.get('DNI') || !formData.get('Nombre') || !formData.get('Apellido')) {
            alert('Por favor, completa los campos de DNI, Nombre y Apellido.');
            return;
        }

        try {
            const response = await fetch('/api/enfermeria/guardar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json' // Especifica que el cuerpo es JSON
        },
        body: JSON.stringify(data) // Envía el objeto como una cadena JSON
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