document.addEventListener('DOMContentLoaded', () => {
    // Definimos los botones y sus destinos
    const portals = {
        'medico-btn': 'portal-medicos.html',
        'enfermera-btn': 'portal-enfermeria.html',
        'odontologo-btn': 'portal-odontologia.html',
        'gestor-btn': 'portal-gestor.html'
    };

    // Agregamos un listener a cada botón de profesional
    Object.keys(portals).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                // Aquí va tu lógica para el inicio de sesión con Google.
                // Esta es solo una simulación.
                console.log(`Iniciando sesión con Google para el portal: ${buttonId}`);

                // Después de un login exitoso, redirigimos al usuario.
                // window.location.href = portals[buttonId];

                // Simulación de login exitoso:
                const isUserAuthenticated = true; 
                if (isUserAuthenticated) {
                    window.location.href = portals[buttonId];
                } else {
                    alert('Acceso denegado. Por favor, inicie sesión.');
                }
            });
        }
    });
});