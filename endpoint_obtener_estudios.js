// ====================================================================
// ENDPOINT: /obtener-estudios-paciente (VERSIÓN SUPABASE)
// Reemplaza los dos endpoints anteriores del mismo nombre.
// Lee TODOS los estudios desde Supabase (no Google Sheets).
// NO toca el guardado en Sheets ni el Apps Script de PDFs.
// ====================================================================

function registrarEndpointObtenerEstudios(app, supabase) {

    app.post('/obtener-estudios-paciente', async (req, res) => {
        const { dni } = req.body;
        if (!dni) return res.status(400).json({ error: 'DNI requerido.' });

        try {
            const estudiosEncontrados = [];

            // ── 1. LABORATORIO desde practicas_historicas ──
            // Tiene columnas individuales por determinación + link_pdf como array JSON
            const { data: laboratorios } = await supabase
                .from('practicas_historicas')
                .select('*')
                .eq('dni', dni)
                .eq('tipo_practica', 'laboratorio')
                .order('fecha', { ascending: false });

            (laboratorios || []).forEach(lab => {
                // Parsear link_pdf (puede ser array JSON o string simple)
                let links = [];
                try {
                    const parsed = JSON.parse(lab.link_pdf || '[]');
                    links = Array.isArray(parsed) ? parsed : [parsed];
                } catch(e) {
                    if (lab.link_pdf) links = [lab.link_pdf];
                }

                estudiosEncontrados.push({
                    TipoEstudio: 'Laboratorio',
                    DNI: lab.dni,
                    Nombre: lab.nombre || '',
                    Apellido: lab.apellido || '',
                    Fecha: lab.fecha || '',
                    Prestador: lab.prestador || '',
                    LinkPDF: links[0] || '',
                    LinksPDF: links, // array completo para mostrar múltiples botones
                    ResultadosLaboratorio: {
                        'Glucemia':                          lab.glucemia || '',
                        'Creatinina':                        lab.creatinina || '',
                        'Índice Filtrado Glomerular':        lab.indice_filtrado_glomerular || '',
                        'Colesterol Total':                  lab.colesterol_total || '',
                        'Colesterol HDL':                    lab.colesterol_hdl || '',
                        'Colesterol LDL':                    lab.colesterol_ldl || '',
                        'Triglicéridos':                     lab.trigliceridos || '',
                        'HIV':                               lab.hiv || '',
                        'SOMF':                              lab.somf || '',
                        'Hepatitis B Antígeno Superficie':   lab.hepatitis_b_antigeno || '',
                        'Hepatitis C':                       lab.hepatitis_c || '',
                        'Hepatitis B Anti Core':             lab.hepatitis_b_anti_core || '',
                        'HPV Genotipo 16':                   lab.hpv_genotipo_16 || '',
                        'HPV Genotipo 18':                   lab.hpv_genotipo_18 || '',
                        'HPV Otros Genotipos Alto Riesgo':   lab.hpv_otros || '',
                        'VDRL':                              lab.vdrl || '',
                        'PSA':                               lab.psa || '',
                        'Chagas HAI':                        lab.chagas_hai || '',
                        'Chagas ECLIA':                      lab.chagas_eclia || '',
                        'Hemoglobina Glicosilada':           lab.hemoglobina_glicosilada || '',
                        'Microalbuminuria':                  lab.microalbuminuria || '',
                        'Proteinuria':                       lab.proteinuria || '',
                        'Clearence Creatinina':              lab.clearence_creatinina || ''
                    }
                });
            });

            // ── 2. ODONTOLOGÍA desde odontologia_consultas ──
            const { data: odonto } = await supabase
                .from('odontologia_consultas')
                .select('*')
                .eq('dni', dni)
                .order('created_at', { ascending: false });

            (odonto || []).forEach(o => {
                estudiosEncontrados.push({
                    TipoEstudio: 'Odontologia',
                    DNI: o.dni,
                    Nombre: o.nombre || '',
                    Apellido: o.apellido || '',
                    Fecha: o.fecha || '',
                    Prestador: o.odontologo || '',
                    LinkPDF: o.enlace_pdf || '',
                    Resultado: o.riesgo_evaluacion || o.riesgo_general || '',
                    Observaciones: o.observaciones || ''
                });
            });

            // ── 3. ENFERMERÍA desde enfermeria_consultas ──
            const { data: enfermeria } = await supabase
                .from('enfermeria_consultas')
                .select('*')
                .eq('dni', dni)
                .order('created_at', { ascending: false });

            (enfermeria || []).forEach(e => {
                estudiosEncontrados.push({
                    TipoEstudio: 'Enfermeria',
                    DNI: e.dni,
                    Nombre: e.nombre || '',
                    Apellido: e.apellido || '',
                    Fecha: e.fecha_cierre_enf || '',
                    Prestador: e.nombre_enfermera || '',
                    ResultadosEnfermeria: {
                        'Altura':                e.altura_cm ? String(e.altura_cm) : '',
                        'Peso':                  e.peso_kg ? String(e.peso_kg) : '',
                        'Circunferencia_cintura': e.cintura_cm ? String(e.cintura_cm) : '',
                        'Presion_Arterial':      e.presion_arterial || '',
                        'Vacunas':               e.vacunas || '',
                        'AgudezaVisual':         e.agudeza_visual || '',
                        'Espirometria_PDF':      e.espirometria_link || e.espirometria_pdf || ''
                    }
                });
            });

            // ── 4. RESTO DE PRÁCTICAS desde practicas_historicas ──
            // (mamografia, eco_mamaria, ecografia, densitometria, vcc,
            //  papanicolau, espirometria, biopsia, oftalmologia)
            const tiposOtros = [
                'mamografia', 'eco_mamaria', 'ecografia', 'densitometria',
                'vcc', 'papanicolau', 'espirometria', 'biopsia', 'oftalmologia'
            ];

            const { data: otrasHistoricas } = await supabase
                .from('practicas_historicas')
                .select('*')
                .eq('dni', dni)
                .in('tipo_practica', tiposOtros)
                .order('fecha', { ascending: false });

            (otrasHistoricas || []).forEach(p => {
                let links = [];
                try {
                    const parsed = JSON.parse(p.link_pdf || '[]');
                    links = Array.isArray(parsed) ? parsed : [parsed];
                } catch(e) {
                    if (p.link_pdf) links = [p.link_pdf];
                }

                const ETIQUETAS_TIPO = {
                    'mamografia':    'Mamografia',
                    'eco_mamaria':   'Eco mamaria',
                    'ecografia':     'Ecografia',
                    'densitometria': 'Densitometria',
                    'vcc':           'VCC',
                    'papanicolau':   'Papanicolau',
                    'espirometria':  'Espirometria',
                    'biopsia':       'Biopsia',
                    'oftalmologia':  'Oftalmologia'
                };

                estudiosEncontrados.push({
                    TipoEstudio: ETIQUETAS_TIPO[p.tipo_practica] || p.tipo_practica,
                    DNI: p.dni,
                    Nombre: p.nombre || '',
                    Apellido: p.apellido || '',
                    Fecha: p.fecha || '',
                    Prestador: p.prestador || '',
                    Resultado: p.resultado || '',
                    LinkPDF: links[0] || '',
                    LinksPDF: links
                });
            });

            res.json({ success: true, estudios: estudiosEncontrados });

        } catch (e) {
            console.error('Error en /obtener-estudios-paciente:', e.message);
            res.status(500).json({ error: 'Error al obtener estudios.' });
        }
    });
}

module.exports = { registrarEndpointObtenerEstudios };