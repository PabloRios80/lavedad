// Abrimos tu archivo 'auth-redirect.js'
document.addEventListener('DOMContentLoaded', () => {
    // Definimos los botones y sus destinos
    const portals = {
        'medico-btn': 'index-medico.html', // Destino original
        'enfermera-btn': 'formulario-enfermeria.html', // Destino correcto
        'odontologo-btn': 'formulario-enfermeria.html', // Redirige a Enfermería
        'gestor-btn': 'index-gestor.html',
    };

    // Agregamos un listener a cada botón de profesional
    Object.keys(portals).forEach(buttonId => {
        const button = document.getElementById(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                // Simulación de login exitoso:
                const isUserAuthenticated = true; 
                if (isUserAuthenticated) {
                    // Redirige al usuario al destino correcto
                    window.location.href = portals[buttonId];
                } else {
                    alert('Acceso denegado. Por favor, inicie sesión.');
                }
            });
        }
    });
});