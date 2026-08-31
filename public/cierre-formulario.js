console.log("%c🔵 cierre-formulario.js VERSION 2026-08-31-cruce-lab", "background: blue; color: white; font-size: 14px; padding: 4px;");
document.addEventListener("DOMContentLoaded", () => {
  const unauthorizedMessage = document.getElementById("unauthorized-message");
  const mainContent = document.getElementById("main-content");

  // Primero, verifica el estado de autenticación del usuario
  checkAuthStatus();
  async function checkAuthStatus() {
    const prof = window.dpProfesional;
    if (prof && prof.nombre) {
      document.getElementById("unauthorized-message")?.classList.add("hidden");
      document.getElementById("main-content")?.classList.remove("hidden");
      // Si hay campo de profesional, llenarlo automáticamente
      const profInput = document.getElementById("profesional-nombre");
      if (profInput) profInput.value = `${prof.nombre} ${prof.apellido}`;
    } else {
      document
        .getElementById("unauthorized-message")
        ?.classList.remove("hidden");
      document.getElementById("main-content")?.classList.add("hidden");
    }
  }
  const verEstudiosBtn = document.getElementById("ver-estudios-btn");
  const dniInput = document.getElementById("paciente-dni");
  const cargarDatosBtn = document.getElementById("cargar-datos-btn");
  const patientInfoDisplay = document.getElementById("patient-info-display");
  const pacienteApellidoInput = document.getElementById("paciente-apellido");
  const pacienteNombreInput = document.getElementById("paciente-nombre");
  const pacienteEdadInput = document.getElementById("paciente-edad");
  const sexoSelect = document.getElementById("paciente-sexo");
  const cierreForm = document.getElementById("cierre-form");
  const formStepsContainer = document.getElementById("form-steps-container");
  const progressBar = document.getElementById("progress-bar");

  function verificarDiscrepanciaEnVivo(selectEl) {
    const campo = selectEl.name;
    const esperados = window._valoresEsperadosLab || {};
    if (!esperados[campo]) return;

    const valorMedico = selectEl.value;
    if (!valorMedico || valorMedico === esperados[campo].esperado) {
      selectEl.dataset.discrepanciaConfirmada = "";
      return;
    }

    const { esperado, valorLabCrudo } = esperados[campo];
    const confirma = confirm(
      `⚠️ El valor que elegiste en "${campo.replace(/_/g, " ")}" es "${valorMedico}", pero el laboratorio dice "${valorLabCrudo}" (esperado: "${esperado}").\n\n¿Confirmás que querés dejarlo así? Vas a tener que explicar el motivo en el campo de Observaciones correspondiente antes de poder guardar el cierre.`,
    );

    if (!confirma) {
      selectEl.value = "";
      selectEl.dataset.discrepanciaConfirmada = "";
      selectEl.focus();
      return;
    }

    selectEl.dataset.discrepanciaConfirmada = "true";
    const nombreObs = `Observaciones_${campo}`;
    const inputObs = cierreForm.querySelector(`[name="${nombreObs}"]`);
    if (inputObs) {
      inputObs.classList.add("border-yellow-500", "ring-yellow-500");
      setTimeout(() => {
        inputObs.scrollIntoView({ behavior: "smooth", block: "center" });
        inputObs.focus();
      }, 200);
    }
  }

  function mostrarCartelBloqueoAnual(bloqueo) {
    let cartel = document.getElementById("cartelBloqueoAnual");
    if (!bloqueo) {
      if (cartel) cartel.remove();
      return;
    }
    const fechaLegible = new Date(
      bloqueo.fechaUltimoCierre + "T00:00:00",
    ).toLocaleDateString("es-AR");
    const html = `
      <div id="cartelBloqueoAnual" style="position: sticky; top: 0; z-index: 50; background: #dc2626; color: white; padding: 14px 20px; border-radius: 8px; margin-bottom: 16px; font-weight: bold; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.2);">
        ⛔ Este paciente ya tiene un Día Preventivo cerrado el ${fechaLegible}.
        Todavía faltan ${bloqueo.diasRestantes} días para cumplir el año. Podés revisar el caso, pero NO se va a poder guardar un nuevo cierre.
      </div>`;
    if (cartel) {
      cartel.outerHTML = html;
    } else {
      document
        .getElementById("main-content")
        .insertAdjacentHTML("afterbegin", html);
    }
  }
  const prevStepBtn = document.getElementById("prev-step-btn");
  const nextStepBtn = document.getElementById("next-step-btn");
  const guardarCierreBtn = document.getElementById("guardar-cierre-btn");
  const cancelarCierreBtn = document.getElementById("cancelar-cierre-btn");
  const estudiosModal = document.getElementById("estudiosModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const modalCloseButtonBottom = document.getElementById(
    "modalCloseButtonBottom",
  );
  const modalDNI = document.getElementById("modalDNI");
  const estudiosModalContent = document.getElementById("estudiosModalContent");

  let currentPatientData = null;
  let currentStep = 0;
  let formSteps = [];

  if (!dniInput.value.trim()) {
    cargarDatosBtn.disabled = true;
  }

  // Inicializar el formulario: ocultar campos de paciente y el formulario de cierre
  patientInfoDisplay.classList.add("hidden");
  cierreForm.classList.add("hidden");
  prevStepBtn.classList.add("hidden"); // Ocultar botón anterior al inicio

  // Definición de los campos del formulario con iconos
  const fieldsConfig = [
    {
      name: "Presion_Arterial",
      label: "Presión Arterial",
      type: "select",
      options: ["Control Normal", "Hipertensión", "No se realiza"],
      hasStudyButton: true,
      studyType: "Enfermeria",
      required: true,
      icon: "fas fa-heartbeat",
    },
    {
      name: "Observaciones_Presion_Arterial",
      label: "Obs. Presión Arterial",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "IMC",
      label: "IMC",
      type: "select",
      options: [
        "Bajo Peso",
        "Control Normal",
        "Sobrepeso",
        "Obesidad",
        "Obesidad Grado II",
        "Obesidad Mórbida",
        "No se realiza",
      ],
      hasStudyButton: true,
      studyType: "Enfermeria",
      required: true,
      icon: "fas fa-weight",
    },
    {
      name: "Observaciones_IMC",
      label: "Obs. IMC",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Agudeza_visual",
      label: "Agudeza Visual",
      type: "select",
      options: ["Alterada", "Control Normal", "No se realiza"],
      hasStudyButton: true,
      studyType: "Enfermeria",
      required: true,
      icon: "fas fa-eye",
    },
    {
      name: "Observaciones_Agudeza_visual",
      label: "Obs. Agudeza Visual",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Control_odontologico",
      label: "Control Odontológico",
      type: "select",
      options: [
        "Control Normal",
        "No se realiza",
        "Riesgo bajo",
        "Riesgo medio",
        "Riesgo alto",
      ],
      hasStudyButton: true,
      studyType: "Odontologia",
      required: true,
      icon: "fas fa-tooth",
    },
    {
      name: "Observaciones_Control_odontologico",
      label: "Obs. Control Odontológico",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Alimentacion_saludable",
      label: "Alimentación Saludable",
      type: "select",
      options: ["Sí", "No"],
      required: true,
      icon: "fas fa-apple-alt",
    },
    {
      name: "Observaciones_Alimentacion_saludable",
      label: "Obs. Alimentación Saludable",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Actividad_fisica",
      label: "Actividad Física",
      type: "select",
      options: ["Sí realiza", "No realiza"],
      required: true,
      icon: "fas fa-running",
    },
    {
      name: "Observaciones_Actividad_fisica",
      label: "Obs. Actividad Física",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Seguridad_vial",
      label: "Seguridad Vial",
      type: "select",
      options: ["Cumple", "No cumple", "No realiza"],
      required: true,
      icon: "fas fa-car",
    },
    {
      name: "Observaciones_Seguridad_vial",
      label: "Obs. Seguridad Vial",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cuidados_adultos_mayores",
      label: "Cuidados Adultos Mayores",
      type: "select",
      options: ["No se realiza", "Se verifica"],
      required: true,
      icon: "fas fa-hands-helping",
    },
    {
      name: "Observaciones_Cuidados_adultos_mayores",
      label: "Obs. Cuidados Adultos Mayores",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Acido_folico",
      label: "Ácido Fólico",
      type: "select",
      options: ["Indicado", "No indicado"],
      required: true,
      icon: "fas fa-pills",
    },
    {
      name: "Observaciones_Acido_folico",
      label: "Obs. Ácido Fólico",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Abuso_alcohol",
      label: "Abuso Alcohol",
      type: "select",
      options: ["Abuso", "No abusa", "No se realiza"],
      required: true,
      icon: "fas fa-beer",
    },
    {
      name: "Observaciones_Abuso_alcohol",
      label: "Obs. Abuso Alcohol",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Tabaco",
      label: "Tabaco",
      type: "select",
      options: ["Fuma", "No fuma"],
      required: true,
      icon: "fas fa-smoking",
    },
    {
      name: "Observaciones_Tabaco",
      label: "Obs. Tabaco",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Violencia",
      label: "Violencia",
      type: "select",
      options: ["Se verifica", "No se verifica", "No se realiza"],
      required: true,
      icon: "fas fa-hand-rock",
    },
    {
      name: "Observaciones_Violencia",
      label: "Obs. Violencia",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Depresion",
      label: "Depresión",
      type: "select",
      options: ["Se verifica", "No se verifica", "No se realiza"],
      required: true,
      icon: "fas fa-sad-tear",
    },
    {
      name: "Observaciones_Depresion",
      label: "Obs. Depresión",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "ITS",
      label: "ITS",
      type: "select",
      options: ["Negativo", "Positivo", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-microscope",
    },
    {
      name: "Observaciones_ITS",
      label: "Obs. ITS",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Hepatitis_B",
      label: "Hepatitis B",
      type: "select",
      options: ["Negativo", "Positivo", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-virus",
    },
    {
      name: "Observaciones_Hepatitis_B",
      label: "Obs. Hepatitis B",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Hepatitis_C",
      label: "Hepatitis C",
      type: "select",
      options: ["Negativo", "Positivo", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-virus",
    },
    {
      name: "Observaciones_Hepatitis_C",
      label: "Obs. Hepatitis C",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "VIH",
      label: "VIH",
      type: "select",
      options: ["Negativo", "Positivo", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-viruses",
    },
    {
      name: "Observaciones_VIH",
      label: "Obs. VIH",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Dislipemias",
      label: "Dislipemias",
      type: "select",
      options: ["No presenta", "Presenta", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-blood-drop",
    },
    {
      name: "Observaciones_Dislipemias",
      label: "Obs. Dislipemias",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Diabetes",
      label: "Diabetes",
      type: "select",
      options: ["No presenta", "Presenta", "No se realiza"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-candy-cane",
    }, // Icono simbólico
    {
      name: "Observaciones_Diabetes",
      label: "Obs. Diabetes",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_cervico_uterino_HPV",
      label: "Cáncer Cérvico Uterino (HPV)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-dna",
    },
    {
      name: "Observaciones_Cancer_cervico_uterino_HPV",
      label: "Obs. Cáncer Cérvico Uterino (HPV)",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_cervico_uterino_PAP",
      label: "Cáncer Cérvico Uterino (PAP)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "Papanicolau",
      required: true,
      icon: "fas fa-flask",
    },
    {
      name: "Observaciones_PAP",
      label: "Obs. PAP",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_colon_SOMF",
      label: "Cáncer Colon (SOMF)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "SOMF",
      required: true,
      icon: "fas fa-poop",
    }, // Icono simbólico
    {
      name: "Observaciones_Cancer_colon_SOMF",
      label: "Obs. Cáncer Colon (SOMF)",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_colon_Colonoscopia",
      label: "Cáncer Colon (Colonoscopia)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "VCC",
      required: true,
      icon: "fas fa-colon-sign",
    }, // Icono simbólico
    {
      name: "Observaciones_Colonoscopia",
      label: "Obs. Colonoscopia",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_mama_Mamografia",
      label: "Cáncer Mama (Mamografía)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "Mamografia",
      required: true,
      icon: "fas fa-x-ray",
    },
    {
      name: "Observaciones_Mamografia",
      label: "Obs. Mamografía",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Cancer_mama_Eco_mamaria",
      label: "Cáncer Mama (Eco mamaria)",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "Eco mamaria",
      required: true,
      icon: "fas fa-x-ray",
    },
    {
      name: "Observaciones_Eco_mamaria",
      label: "Obs. Ecografía Mamaria",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "ERC",
      label: "ERC",
      type: "select",
      options: ["Normal", "Pendiente", "No se realiza", "Patologico"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-kidneys",
    },
    {
      name: "Observaciones_ECG",
      label: "Obs. ECG",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "EPOC",
      label: "EPOC",
      type: "select",
      options: ["Se verifica", "No se verifica", "No se realiza"],
      hasStudyButton: true,
      studyType: "Espirometria",
      required: true,
      icon: "fas fa-lungs",
    },
    {
      name: "Observaciones_EPOC",
      label: "Obs. EPOC",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Aneurisma_aorta",
      label: "Aneurisma Aorta",
      type: "select",
      options: ["Se verifica", "No se verifica", "No se realiza"],
      hasStudyButton: true,
      studyType: "Ecografia",
      required: true,
      icon: "fas fa-heart",
    },
    {
      name: "Observaciones_Aneurisma_aorta",
      label: "Obs. Aneurisma Aorta",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Osteoporosis",
      label: "Osteoporosis",
      type: "select",
      options: ["Se verifica", "No se verifica", "No se realiza"],
      hasStudyButton: true,
      studyType: "Densitometria",
      required: true,
      icon: "fas fa-bone",
    },
    {
      name: "Observaciones_Osteoporosis",
      label: "Obs. Osteoporosis",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Estratificacion_riesgo_CV",
      label: "Estratificación Riesgo CV",
      type: "select",
      options: ["Alto", "Bajo", "Medio", "Muy Alto"],
      required: true,
      icon: "fas fa-chart-line",
    },
    {
      name: "Observaciones_Riesgo_CV",
      label: "Obs. Riesgo CV",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Aspirina",
      label: "Aspirina",
      type: "select",
      options: ["Indicado", "No indicado"],
      required: true,
      icon: "fas fa-prescription-bottle-alt",
    },
    {
      name: "Observaciones_Aspirina",
      label: "Obs. Aspirina",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Inmunizaciones",
      label: "Inmunizaciones",
      type: "select",
      options: ["Completo", "Incompleto"],
      hasStudyButton: true,
      studyType: "Enfermeria",
      required: true,
      icon: "fas fa-syringe",
    },
    {
      name: "Observaciones_Inmunizaciones",
      label: "Obs. Inmunizaciones",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "VDRL",
      label: "VDRL",
      type: "select",
      options: ["Negativo", "Positivo", "No aplica", "Pendiente"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-vial",
    },
    {
      name: "Observaciones_VDRL",
      label: "Obs. VDRL",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Prostata_PSA",
      label: "Próstata (PSA)",
      type: "select",
      options: ["Normal", "Pendiente", "No aplica", "Patologico"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-male",
    },
    {
      name: "Observaciones_PSA",
      label: "Obs. PSA",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Chagas",
      label: "Chagas",
      type: "select",
      options: ["Negativo", "Positivo", "No aplica", "Pendiente"],
      hasStudyButton: true,
      studyType: "Laboratorio",
      required: true,
      icon: "fas fa-bug",
    }, // Icono simbólico
    {
      name: "Observaciones_Chagas",
      label: "Obs. Chagas",
      type: "textarea",
      required: false,
      icon: "fas fa-comment",
    },
    {
      name: "Fecha_cierre_DP",
      label: "Fecha Cierre DP",
      type: "date",
      required: true,
      icon: "fas fa-calendar-alt",
    },
  ];

  // ── Mapeo: campo del formulario → columna(s) de practicas_historicas ──
  // Un campo puede agrupar varias determinaciones (ej. "Dislipemias" junta
  // colesterol total, HDL, LDL y triglicéridos).
  const CAMPO_A_COLUMNAS_LAB = {
    ITS: ["hiv", "vdrl"], // Categoría redundante, referenciada a HIV+VDRL por ahora
    Hepatitis_B: ["hepatitis_b_antigeno", "hepatitis_b_anti_core"],
    Hepatitis_C: ["hepatitis_c"],
    VIH: ["hiv"],
    Dislipemias: [
      "colesterol_total",
      "colesterol_hdl",
      "colesterol_ldl",
      "trigliceridos",
    ],
    Diabetes: ["glucemia", "hemoglobina_glicosilada"],
    Cancer_cervico_uterino_HPV: [
      "hpv_genotipo_16",
      "hpv_genotipo_18",
      "hpv_otros",
    ],
    ERC: [
      "creatinina",
      "indice_filtrado_glomerular",
      "microalbuminuria",
      "proteinuria",
      "clearence_creatinina",
      "rac_albumina_creatinina",
    ],
    VDRL: ["vdrl"],
    Prostata_PSA: ["psa"],
    Chagas: ["chagas_hai", "chagas_eclia"],
  };

  // Dado un field.name y field.studyType, decide si hay algo cargado para
  // ese campo y devuelve el/los link(s) de PDF correctos: prioriza el PDF
  // individual de la práctica puntual si existe, y si no, cae al PDF
  // general de laboratorio (el de la carga masiva por IA).
  function resolverEstadoEstudio(fieldName, studyType) {
    if (studyType === "SOMF") {
      const somf = window._estudioSomfPaciente;
      return {
        tieneAlgo: !!(somf && (somf.enlace_pdf || somf.resultado_texto)),
        links: somf && somf.enlace_pdf ? [somf.enlace_pdf] : [],
      };
    }

    const estudios = window._estudiosPaciente || [];

    if (studyType === "Laboratorio") {
      const registrosLab = estudios.filter((s) => s.TipoEstudio === "Laboratorio");
      if (registrosLab.length === 0) return { tieneAlgo: false, links: [] };

      const columnas = CAMPO_A_COLUMNAS_LAB[fieldName] || [];
      const linksIndividuales = [];
      let tieneResultadoEspecifico = false;

      registrosLab.forEach((reg) => {
        const mapaIndividual = reg.LinkPdfPorPractica || {};
        const valoresPorColumna = reg.ResultadosPorColumna || {};

        columnas.forEach((col) => {
          if (mapaIndividual[col]) linksIndividuales.push(mapaIndividual[col]);
          // Solo cuenta si la columna PROPIA de este campo tiene valor —
          // no alcanza con que la fila tenga otros estudios cargados.
          if (valoresPorColumna[col]) tieneResultadoEspecifico = true;
        });
      });

      if (linksIndividuales.length > 0) {
        return { tieneAlgo: true, links: linksIndividuales };
      }
      // Sin PDF individual: si este campo específico tiene resultado
      // (cargado en la carga masiva general), usar el PDF general.
      if (tieneResultadoEspecifico) {
        const linkGeneral = registrosLab[0]?.LinksPDF || [];
        return { tieneAlgo: true, links: linkGeneral };
      }
      return { tieneAlgo: false, links: [] };
    }

    // Resto de categorías (Mamografia, Odontologia, VCC, Enfermeria, etc.)
    const registro = estudios.find((s) => s.TipoEstudio === studyType);
    if (!registro) return { tieneAlgo: false, links: [] };
    const links = registro.LinksPDF || (registro.LinkPDF ? [registro.LinkPDF] : []);

    // Enfermería no tiene Resultado/LinkPDF genérico — sus datos viven en
    // ResultadosEnfermeria (altura, peso, presión, etc.). Si cualquiera de
    // esos campos tiene contenido, consideramos que sí hay algo cargado.
    let tieneResultadoEspecifico = !!registro.Resultado;
    if (registro.ResultadosEnfermeria) {
      tieneResultadoEspecifico =
        tieneResultadoEspecifico ||
        Object.values(registro.ResultadosEnfermeria).some((v) => v && v !== "");
    }

    return {
      tieneAlgo: !!(links.length > 0 || tieneResultadoEspecifico),
      links,
    };
  }

  // Función para generar los pasos del formulario
  function generateFormSteps() {
    formStepsContainer.innerHTML = ""; // Limpiar contenido previo
    formSteps = []; // Resetear los pasos
    let stepDiv;
    let fieldCounter = 0;

    fieldsConfig.forEach((field) => {
      if (fieldCounter % 2 === 0) {
        // Cada 2 campos, crear un nuevo paso
        stepDiv = document.createElement("div");
        stepDiv.className =
          "form-step grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white rounded-lg shadow-inner border border-blue-100 hidden"; // Inicialmente ocultos
        formStepsContainer.appendChild(stepDiv);
        formSteps.push(stepDiv);
      }

      const fieldContainer = document.createElement("div");
      fieldContainer.className = "mb-4";

      const label = document.createElement("label");
      label.htmlFor = field.name;
      label.className =
        "block text-gray-700 text-sm font-bold mb-2 flex items-center";
      if (field.icon) {
        const icon = document.createElement("i");
        icon.className = `${field.icon} mr-2 text-blue-600`;
        label.appendChild(icon);
      }
      label.appendChild(document.createTextNode(field.label + ":"));

      let inputElement;
      const inputClasses =
        "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

      if (field.type === "select") {
        inputElement = document.createElement("select");
        inputElement.className = inputClasses;
        inputElement.id = field.name;
        inputElement.name = field.name;
        inputElement.required = field.required !== false;

        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Seleccione";
        defaultOption.disabled = true;
        defaultOption.selected = true;
        inputElement.appendChild(defaultOption);

        field.options.forEach((optionText) => {
          const option = document.createElement("option");
          option.value = optionText;
          option.textContent = optionText;
          inputElement.appendChild(option);
        });

        inputElement.addEventListener("change", () =>
          verificarDiscrepanciaEnVivo(inputElement),
        );
      } else if (field.type === "textarea") {
        inputElement = document.createElement("textarea");
        inputElement.className = `${inputClasses} h-20 resize-y`;
        inputElement.id = field.name;
        inputElement.name = field.name;
        inputElement.required = field.required !== false;
      } else {
        // type 'text' o 'date' o 'number'
        inputElement = document.createElement("input");
        inputElement.type = field.type;
        inputElement.className = inputClasses;
        inputElement.id = field.name;
        inputElement.name = field.name;
        inputElement.required = field.required !== false;
      }

      // Setear la fecha actual para el campo 'Fecha_cierre_dp' al generarse
      if (field.name === "Fecha_cierre_DP") {
        const today = new Date();
        const formattedDate =
          today.getFullYear() +
          "-" +
          String(today.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(today.getDate()).padStart(2, "0");
        inputElement.value = formattedDate;
      }

      fieldContainer.appendChild(label);

      // Alertas contextuales por campo
      const alertasDelCampo = (window._datosPaciente?.alertas || []).filter(
        (a) => a.campo === field.name,
      );
      if (alertasDelCampo.length > 0) {
        const alertaBox = document.createElement("div");
        alertaBox.style.cssText =
          "margin-bottom:6px; border-radius:6px; overflow:hidden;";
        alertasDelCampo.forEach((a) => {
          const linea = document.createElement("div");
          const esUrgente = a.tipo === "URGENTE";
          const esRiesgo = a.tipo === "RIESGO";
          linea.style.cssText = `
                        padding: 6px 10px;
                        font-size: 12px;
                        font-weight: 500;
                        border-left: 3px solid ${esUrgente ? "#dc2626" : esRiesgo ? "#d97706" : "#0448a2"};
                        background: ${esUrgente ? "#fef2f2" : esRiesgo ? "#fffbeb" : "#eff6ff"};
                        color: ${esUrgente ? "#991b1b" : esRiesgo ? "#92400e" : "#1e40af"};
                        margin-bottom: 2px;
                    `;
          linea.textContent = a.mensaje;
          alertaBox.appendChild(linea);
        });
        fieldContainer.appendChild(alertaBox);
      }

      if (field.hasStudyButton) {
        const inputGroup = document.createElement("div");
        inputGroup.className = "flex items-center";
        inputGroup.appendChild(inputElement);

        const estado = resolverEstadoEstudio(field.name, field.studyType);

        const studyButton = document.createElement("button");
        studyButton.className = estado.tieneAlgo
          ? "bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-r ml-2 focus:outline-none focus:shadow-outline flex-shrink-0 text-sm"
          : "bg-gray-300 hover:bg-gray-400 text-gray-600 font-bold py-2 px-4 rounded-r ml-2 focus:outline-none focus:shadow-outline flex-shrink-0 text-sm";
        studyButton.innerHTML = estado.tieneAlgo
          ? `<i class="fas fa-check-circle mr-1"></i>Ver Estudio`
          : `<i class="fas fa-search mr-1"></i>Ver Estudio`;
        studyButton.title = estado.tieneAlgo
          ? `Hay estudio cargado para ${field.label}`
          : `Sin estudios cargados para ${field.label}`;
        studyButton.dataset.studyType = field.studyType;
        studyButton.dataset.fieldName = field.name;
        studyButton.addEventListener("click", (e) => {
          e.preventDefault(); // Prevenir envío del formulario
          if (!estado.tieneAlgo) {
            alert(`No hay estudios cargados todavía para ${field.label}.`);
            return;
          }
          if (currentPatientData && currentPatientData.DNI) {
            mostrarEstudiosModal(
              currentPatientData.DNI,
              studyButton.dataset.studyType,
              studyButton.dataset.fieldName,
            );
          } else {
            alert("DNI del paciente no disponible para ver estudios.");
          }
        });

        inputGroup.appendChild(studyButton);
        fieldContainer.appendChild(inputGroup);
      } else {
        fieldContainer.appendChild(inputElement);
      }

      stepDiv.appendChild(fieldContainer);
      fieldCounter++;
    });
    showStep(0); // Mostrar el primer paso al generar
  }

  // Función para mostrar un paso específico
  function showStep(stepIndex) {
    formSteps.forEach((step, index) => {
      step.classList.add("hidden");
      if (index === stepIndex) {
        step.classList.remove("hidden");
      }
    });

    currentStep = stepIndex;
    updateProgressBar();
    updateNavigationButtons();
  }

  // Función para actualizar la barra de progreso
  function updateProgressBar() {
    const progress = ((currentStep + 1) / formSteps.length) * 100;
    progressBar.style.width = `${progress}%`;
  }

  // Función para actualizar la visibilidad de los botones de navegación
  function updateNavigationButtons() {
    if (currentStep === 0) {
      prevStepBtn.classList.add("hidden");
    } else {
      prevStepBtn.classList.remove("hidden");
    }

    if (currentStep === formSteps.length - 1) {
      nextStepBtn.classList.add("hidden");
      guardarCierreBtn.classList.remove("hidden"); // Mostrar el botón Guardar en la última página
    } else {
      nextStepBtn.classList.remove("hidden");
      guardarCierreBtn.classList.add("hidden"); // Ocultar Guardar si no es la última página
    }
  }

  // Función para limpiar el formulario y resetear el estado
  function resetForm() {
    dniInput.value = "";
    // Asignar DNI a currentPatientData para el botón "Ver Estudio"
    currentPatientData = null;

    // Limpiar el aviso de cierre reciente, si estaba mostrado
    window._cierreBloqueadoAnual = null;
    window._valoresEsperadosLab = {};
    mostrarCartelBloqueoAnual(null);

    // Mostrar formulario de cierre
    cierreForm.classList.remove("hidden");
    // Habilitar edición de campos fijos
    pacienteApellidoInput.removeAttribute("readonly");
    pacienteNombreInput.removeAttribute("readonly");
    pacienteEdadInput.removeAttribute("readonly");
    sexoSelect.removeAttribute("disabled");

    // Generar y mostrar el primer paso del formulario dinámico
    generateFormSteps();

    patientInfoDisplay.classList.add("hidden");
    cierreForm.classList.add("hidden");
    formStepsContainer.innerHTML = ""; // Limpiar los pasos generados
    currentStep = 0;
    formSteps = [];
    updateProgressBar();

    // Restablecer el estado inicial de los campos fijos
    pacienteApellidoInput.setAttribute("readonly", true);
    console.log("pacienteApellidoInput:", pacienteApellidoInput);
    console.log("pacienteNombreInput:", pacienteNombreInput);
    pacienteNombreInput.setAttribute("readonly", true);
    pacienteEdadInput.setAttribute("readonly", true);
    sexoSelect.setAttribute("disabled", true);

    cargarDatosBtn.disabled = true; // Deshabilitar botón de carga hasta que se ingrese DNI
  }

  // --- LÓGICA DE EVENTOS ---

  // Event Listener para el DNI input: habilita el botón Cargar Datos
  dniInput.addEventListener("input", () => {
    if (dniInput.value.trim().length > 0) {
      cargarDatosBtn.disabled = false;
    } else {
      cargarDatosBtn.disabled = true;
      resetForm(); // Resetear el formulario si el DNI se borra
    }
  });
  cargarDatosBtn.addEventListener("click", async () => {
    console.log("Click en cargar datos - DNI:", dniInput.value);
    const dni = dniInput.value.trim();
    if (!dni) {
      alert("Por favor, ingrese un DNI para cargar los datos.");
      return;
    }

    cargarDatosBtn.disabled = true;
    cargarDatosBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin"></i> Cargando...';

    try {
      console.log("Llamando a /cargar-datos-paciente...");
      const response = await fetch("/cargar-datos-paciente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni }),
      });
      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("iapos esActivo:", data.iapos?.esActivo);
      console.log("iapos nombre:", data.iapos?.nombre);
      console.log("Data recibida:", data);
      if (!data.success) {
        alert("Error al cargar datos.");
        return;
      }

      // ── AVISO POR CIERRE RECIENTE (menos de 1 año) ──
      // A diferencia de antes: ahora se deja avanzar por todo el
      // formulario con un cartel rojo persistente, y el bloqueo real
      // ocurre recién al intentar guardar (ver más abajo, en el submit).
      window._cierreBloqueadoAnual = data.bloqueoCierreAnual?.bloqueado
        ? data.bloqueoCierreAnual
        : null;
      mostrarCartelBloqueoAnual(window._cierreBloqueadoAnual);

      // Valores esperados de laboratorio (para el cruce al momento de guardar)
      window._valoresEsperadosLab = data.valoresEsperadosLab || {};
      console.log(
        "valoresEsperadosLab recibidos:",
        JSON.stringify(window._valoresEsperadosLab, null, 2),
      );

      // Autocompletar desde IAPOS
      window._afiliadoInactivoConfirmado = false;
      if (data.iapos?.esActivo) {
        const nombreCompleto = data.iapos.nombre || "";
        const partes = nombreCompleto.split(",");
        pacienteApellidoInput.value = partes[0]?.trim() || "";
        console.log("pacienteApellidoInput:", pacienteApellidoInput);
        console.log("pacienteNombreInput:", pacienteNombreInput);
        pacienteNombreInput.value = partes[1]?.trim() || "";
        pacienteEdadInput.value = data.iapos.edad || "";
        if (sexoSelect) sexoSelect.value = data.iapos.sexo === "2" ? "F" : "M";
        patientInfoDisplay.classList.remove("hidden");
      } else if (data.iapos === null) {
        // No se pudo consultar el padrón de IAPOS (caído/timeout): no
        // sabemos si está activo o no. Se deja continuar con carga
        // manual, con aviso, para no frenar el trabajo por una falla
        // técnica ajena al paciente.
        alert(
          "⚠️ No se pudo verificar el estado del afiliado en IAPOS (padrón no respondió). Verificá manualmente antes de continuar.",
        );
      } else {
        // IAPOS respondió explícitamente que el afiliado NO está activo:
        // esto sí bloquea, no es un problema de conexión.
        window._afiliadoInactivoConfirmado = true;
        alert(
          "⛔ El afiliado no está activo en IAPOS. No se puede continuar con el cierre.",
        );
      }

      // Mostrar alertas clínicas
      if (data.alertas?.length > 0) {
        let alertasHTML =
          '<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:12px;margin:10px 0;">';
        alertasHTML +=
          '<p style="font-weight:bold;margin-bottom:8px;">⚠️ Alertas Clínicas:</p>';
        data.alertas.forEach((a) => {
          const color = a.tipo === "URGENTE" ? "#dc3545" : "#856404";
          alertasHTML += `<p style="color:${color};margin:4px 0;">${a.mensaje}</p>`;
        });
        alertasHTML += "</div>";

        // Insertamos las alertas antes del formulario
        const formContainer =
          document.querySelector(".form-container") ||
          document.querySelector("form") ||
          document.body;
        const alertasDiv = document.createElement("div");
        alertasDiv.id = "alertas-clinicas";
        alertasDiv.innerHTML = alertasHTML;

        // Evitar duplicados
        const existente = document.getElementById("alertas-clinicas");
        if (existente) existente.remove();

        dniInput.closest("div")?.after(alertasDiv) ||
          formContainer.prepend(alertasDiv);
      }

      // Guardar datos para uso posterior
      window._datosPaciente = data;

      // Precargar los estudios del paciente UNA SOLA VEZ, para poder
      // avisar visualmente en cada botón "Ver Estudio" si hay algo
      // cargado o no, sin que el médico tenga que abrir cada uno a ciegas.
      try {
        const respEstudios = await fetch("/obtener-estudios-paciente", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni }),
        });
        const dataEstudios = await respEstudios.json();
        window._estudiosPaciente = dataEstudios.success
          ? dataEstudios.estudios
          : [];
      } catch (e) {
        console.warn("No se pudieron precargar los estudios:", e.message);
        window._estudiosPaciente = [];
      }

      // Precargar también el resultado de SOMF (fuente separada)
      try {
        const respSomf = await fetch("/obtener-estudio-somf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni }),
        });
        const dataSomf = await respSomf.json();
        window._estudioSomfPaciente =
          dataSomf.success && dataSomf.estudios.length > 0
            ? dataSomf.estudios[0]
            : null;
      } catch (e) {
        console.warn("No se pudo precargar el estudio de SOMF:", e.message);
        window._estudioSomfPaciente = null;
      }
    } catch (e) {
      console.error("Error:", e);
      alert("Error de conexión al cargar datos.");
    } finally {
      cargarDatosBtn.disabled = false;
      cargarDatosBtn.innerHTML = '<i class="fas fa-search"></i> Cargar Datos';
    }

    // Asignar DNI a currentPatientData para el botón "Ver Estudio"
    currentPatientData = { DNI: dni };

    // Si IAPOS confirmó que el afiliado está inactivo, no se muestra el
    // formulario — a diferencia de una falla de conexión, que sí permite
    // continuar con carga manual.
    if (window._afiliadoInactivoConfirmado) {
      return;
    }

    // Mostrar campos fijos de paciente y el formulario de cierre
    patientInfoDisplay.classList.remove("hidden");
    cierreForm.classList.remove("hidden");

    // Habilitar edición de campos fijos
    pacienteApellidoInput.removeAttribute("readonly");
    console.log("pacienteApellidoInput:", pacienteApellidoInput);
    console.log("pacienteNombreInput:", pacienteNombreInput);
    pacienteNombreInput.removeAttribute("readonly");
    pacienteEdadInput.removeAttribute("readonly");
    sexoSelect.removeAttribute("disabled");

    // Generar y mostrar el primer paso del formulario dinámico
    generateFormSteps();
  });

  // Event Listeners para los botones de navegación del formulario multi-paso
  nextStepBtn.addEventListener("click", () => {
    // Validar campos de la página actual antes de avanzar
    const currentStepFields = formSteps[currentStep].querySelectorAll(
      "input, select, textarea",
    );
    let stepIsValid = true;
    currentStepFields.forEach((field) => {
      if (field.required && !field.value.trim()) {
        field.classList.add("border-red-500", "ring-red-500");
        stepIsValid = false;
      } else {
        field.classList.remove("border-red-500", "ring-red-500");
      }
    });

    if (!stepIsValid) {
      alert(
        "Por favor, complete todos los campos obligatorios antes de avanzar.",
      );
      return;
    }

    if (currentStep < formSteps.length - 1) {
      showStep(currentStep + 1);
    }
  });

  prevStepBtn.addEventListener("click", () => {
    if (currentStep > 0) {
      showStep(currentStep - 1);
    }
  });

  // Event Listener para el botón "Guardar Cierre"
  guardarCierreBtn.addEventListener("click", async (e) => {
    e.preventDefault(); // Prevenir el envío tradicional del formulario

    // Validar todos los campos del formulario (incluyendo el último paso)
    const allFormInputs = cierreForm.querySelectorAll(
      "input:not([readonly]), select:not([disabled]), textarea",
    );
    let allFieldsValid = true;
    const formData = {};

    // Recolectar datos de campos fijos de paciente
    formData["DNI"] = dniInput.value.trim();
    formData["Apellido"] = pacienteApellidoInput.value.trim();
    const prof = window.dpProfesional;
    formData["Profesional"] = prof
      ? `${prof.nombre} ${prof.apellido}`
      : "Desconocido";
    formData["id_sede_dp"] = prof?.id_sede_dp || null;
    formData["Nombre"] = pacienteNombreInput.value.trim();
    formData["Edad"] = pacienteEdadInput.value.trim();
    formData["Sexo"] = sexoSelect.value.trim();

    if (window._cierreBloqueadoAnual) {
      const b = window._cierreBloqueadoAnual;
      const fechaLegible = new Date(
        b.fechaUltimoCierre + "T00:00:00",
      ).toLocaleDateString("es-AR");
      alert(
        `⛔ No se puede guardar este cierre.\n\nEste paciente ya tiene un Día Preventivo cerrado el ${fechaLegible}. Todavía faltan ${b.diasRestantes} días para cumplir el año.`,
      );
      resetForm();
      return;
    }

    // Recolectar datos de campos dinámicos y validar
    allFormInputs.forEach((input) => {
      if (input.required && !input.value.trim()) {
        allFieldsValid = false;
        input.classList.add("border-red-500", "ring-red-500"); // Resaltar campos vacíos
      } else {
        input.classList.remove("border-red-500", "ring-red-500");
      }
      formData[input.name] = input.value.trim();
    });

    if (!allFieldsValid) {
      alert(
        "Por favor, complete todos los campos obligatorios del formulario.",
      );
      return;
    }

    // ── CRUCE CON VALORES REALES DE LABORATORIO ──
    // (red de seguridad: la mayoría de los avisos ya se mostraron en vivo,
    // al elegir cada valor — acá solo se confirma que quedó todo prolijo)
    const esperados = window._valoresEsperadosLab || {};
    const discrepanciasConfirmadas = [];
    for (const campo of Object.keys(esperados)) {
      const valorMedico = (formData[campo] || "").trim();
      const { esperado, valorLabCrudo } = esperados[campo];
      if (!valorMedico || valorMedico === esperado) continue;

      const nombreObs = `Observaciones_${campo}`;
      const inputObs = cierreForm.querySelector(`[name="${nombreObs}"]`);
      const selectEl = cierreForm.querySelector(`[name="${campo}"]`);
      const yaConfirmadoEnVivo = selectEl?.dataset.discrepanciaConfirmada === "true";

      if (!yaConfirmadoEnVivo) {
        const confirma = confirm(
          `⚠️ El valor que ingresaste en "${campo.replace(/_/g, " ")}" es "${valorMedico}", pero el laboratorio dice "${valorLabCrudo}" (esperado: "${esperado}").\n\n¿Confirmás que querés guardar este valor de todos modos?`,
        );
        if (!confirma) {
          guardarCierreBtn.disabled = false;
          guardarCierreBtn.textContent = "Guardar Cierre";
          if (inputObs) inputObs.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }

      const observacionActual = (formData[nombreObs] || "").trim();
      if (!observacionActual) {
        alert(
          `Antes de continuar, tenés que explicar en "Obs. ${campo.replace(/_/g, " ")}" por qué el valor difiere del laboratorio.`,
        );
        if (inputObs) {
          inputObs.classList.add("border-red-500", "ring-red-500");
          inputObs.scrollIntoView({ behavior: "smooth", block: "center" });
          inputObs.focus();
        }
        return;
      }

      discrepanciasConfirmadas.push({
        campo,
        valorMedico,
        valorLab: valorLabCrudo,
        observacion: observacionActual,
      });
    }
    formData.discrepanciasConfirmadas = discrepanciasConfirmadas;

    guardarCierreBtn.disabled = true;
    guardarCierreBtn.textContent = "Guardando...";

    try {
      const response = await fetch("/api/cierre/guardar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        resetForm(); // Resetear el formulario y volver al estado inicial
      } else {
        alert(`Error al guardar: ${result.error}`);
      }
    } catch (error) {
      console.error("Error al guardar el formulario de cierre:", error);
      alert("Ocurrió un error al guardar el formulario. Intente nuevamente.");
    } finally {
      guardarCierreBtn.disabled = false;
      guardarCierreBtn.innerHTML =
        '<i class="fas fa-save mr-2"></i>Guardar Cierre';
    }
  });

  // Event Listener para el botón "Cancelar"
  cancelarCierreBtn.addEventListener("click", () => {
    if (
      confirm(
        "¿Está seguro de que desea cancelar? Se perderán los cambios no guardados.",
      )
    ) {
      resetForm(); // Volver al estado inicial
    }
  });
  // --- FUNCIÓN GLOBAL PARA MOSTRAR ESTUDIOS EN UN MODAL ---
  // Esta función será llamada por los botones "Ver Estudio"
  async function mostrarEstudiosModal(dni, studyType, fieldName) {
    if (!dni) {
      alert("DNI del paciente no disponible para ver estudios.");
      return;
    }

    modalDNI.textContent = `DNI: ${dni} - Tipo: ${studyType}`;
    estudiosModalContent.innerHTML =
      '<p class="text-center text-gray-500">Cargando estudios...</p>';
    estudiosModal.classList.remove("hidden"); // Mostrar el modal

    // Laboratorio: mostrar solo el/los PDF que corresponden al campo
    // específico que se clickeó, priorizando el individual sobre el general.
    if (studyType === "Laboratorio" && fieldName) {
      estudiosModalContent.innerHTML = "";
      const registrosLab = (window._estudiosPaciente || []).filter(
        (s) => s.TipoEstudio === "Laboratorio",
      );

      if (registrosLab.length === 0) {
        estudiosModalContent.innerHTML =
          '<p class="text-center text-gray-500">No se encontraron estudios de laboratorio para este paciente.</p>';
        return;
      }

      const columnas = CAMPO_A_COLUMNAS_LAB[fieldName] || [];

      registrosLab.forEach((reg) => {
        // El link correcto es el propio de ESTE registro (reg), no el del
        // primero de la lista: individual si existe para alguna columna
        // de este campo, y si no, el PDF general de ESTE mismo registro.
        const mapaIndividual = reg.LinkPdfPorPractica || {};
        const linksIndividuales = columnas
          .map((col) => mapaIndividual[col])
          .filter(Boolean);
        const linksDeEsteRegistro =
          linksIndividuales.length > 0
            ? linksIndividuales
            : reg.LinksPDF || (reg.LinkPDF ? [reg.LinkPDF] : []);

        const card = document.createElement("div");
        card.className =
          "bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 mb-4";
        let html = `<h4 class="font-bold text-blue-700 mb-2">Laboratorio - Fecha: ${reg.Fecha || "N/A"}</h4>`;
        html += `<p><strong>Prestador:</strong> ${reg.Prestador || "N/A"}</p>`;
        if (columnas.length > 0) {
          html += `<p class="mt-2"><strong>Resultados relacionados:</strong></p><ul class="list-disc list-inside">`;
          const valoresPorColumna = reg.ResultadosPorColumna || {};
          const labelsPorColumna = {
            glucemia: "Glucemia",
            creatinina: "Creatinina",
            indice_filtrado_glomerular: "Índice Filtrado Glomerular",
            colesterol_total: "Colesterol Total",
            colesterol_hdl: "Colesterol HDL",
            colesterol_ldl: "Colesterol LDL",
            trigliceridos: "Triglicéridos",
            hiv: "HIV",
            somf: "SOMF",
            hepatitis_b_antigeno: "Hepatitis B Antígeno Superficie",
            hepatitis_c: "Hepatitis C",
            hepatitis_b_anti_core: "Hepatitis B Anti Core",
            hpv_genotipo_16: "HPV Genotipo 16",
            hpv_genotipo_18: "HPV Genotipo 18",
            hpv_otros: "HPV Otros Genotipos Alto Riesgo",
            vdrl: "VDRL",
            psa: "PSA",
            chagas_hai: "Chagas HAI",
            chagas_eclia: "Chagas ECLIA",
            hemoglobina_glicosilada: "Hemoglobina Glicosilada",
            microalbuminuria: "Microalbuminuria",
            proteinuria: "Proteinuria",
            clearence_creatinina: "Clearence Creatinina",
          };
          let algunResultado = false;
          columnas.forEach((col) => {
            const valor = valoresPorColumna[col];
            if (valor) {
              algunResultado = true;
              html += `<li>${labelsPorColumna[col] || col}: ${valor}</li>`;
            }
          });
          if (!algunResultado) {
            html += `<li class="text-gray-400">Sin resultado cargado todavía</li>`;
          }
          html += `</ul>`;
        }
        card.innerHTML = html;

        if (linksDeEsteRegistro.length > 0) {
          const linksBox = document.createElement("div");
          linksBox.className = "mt-2 flex flex-wrap gap-2";
          linksDeEsteRegistro.forEach((link, i) => {
            linksBox.innerHTML += `<a href="${link}" target="_blank" class="bg-green-400 hover:bg-green-500 text-gray-900 font-bold py-1 px-2 rounded inline-block"><i class="fas fa-file-pdf mr-1"></i> Ver PDF${linksDeEsteRegistro.length > 1 ? " " + (i + 1) : ""}</a>`;
          });
          card.appendChild(linksBox);
        }

        estudiosModalContent.appendChild(card);
      });
      return;
    }

    // SOMF tiene su propia fuente (Supabase), separada del resto de Laboratorio (Sheets)
    if (studyType === "SOMF") {
      try {
        const respSomf = await fetch("/obtener-estudio-somf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dni }),
        });
        const dataSomf = await respSomf.json();
        estudiosModalContent.innerHTML = "";

        if (dataSomf.success && dataSomf.estudios.length > 0) {
          dataSomf.estudios.forEach((e) => {
            const card = document.createElement("div");
            card.className =
              "bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 mb-4";
            const fecha = e.fecha_carga
              ? new Date(e.fecha_carga).toLocaleDateString("es-AR")
              : "N/A";
            let html = `<h4 class="font-bold text-blue-700 mb-2">SOMF - Fecha: ${fecha}</h4>`;
            html += `<p><strong>Prestador:</strong> ${e.nombre_prestador || "N/A"}</p>`;
            if (e.resultado_texto) {
              html += `<p><strong>Resultado:</strong> ${e.resultado_texto}</p>`;
            }
            if (e.enlace_pdf) {
              html += `<p class="mt-2"><a href="${e.enlace_pdf}" target="_blank" class="bg-green-400 hover:bg-green-500 text-gray-900 font-bold py-1 px-2 rounded inline-block"><i class="fas fa-file-pdf mr-1"></i> Ver PDF</a></p>`;
            }
            card.innerHTML = html;
            estudiosModalContent.appendChild(card);
          });
        } else {
          estudiosModalContent.innerHTML =
            '<p class="text-center text-gray-500">No se encontraron resultados de SOMF para este paciente.</p>';
        }
      } catch (e) {
        estudiosModalContent.innerHTML =
          '<p class="text-center text-red-500">Error al cargar el resultado de SOMF.</p>';
      }
      return;
    }

    try {
      const response = await fetch("/obtener-estudios-paciente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dni: dni }),
      });
      const data = await response.json();

      estudiosModalContent.innerHTML = ""; // Limpiar el contenido de carga

      if (data.success && data.estudios.length > 0) {
        const filteredStudies = data.estudios.filter(
          (s) =>
            s.TipoEstudio === studyType ||
            (studyType === "Laboratorio" &&
              s.TipoEstudio === "LaboratorioIndividual"),
        );

        if (filteredStudies.length > 0) {
          filteredStudies.forEach((estudio) => {
            const estudioCard = document.createElement("div");
            estudioCard.className =
              "bg-blue-50 p-4 rounded-lg shadow-sm border border-blue-200 mb-4";

            let contentHtml = `<h4 class="font-bold text-blue-700 mb-2">${estudio.TipoEstudio} - Fecha: ${estudio.Fecha || "N/A"}</h4>`;
            contentHtml += `<p><strong>Prestador:</strong> ${estudio.Prestador || "N/A"}</p>`;

            // LÓGICA UNIFICADA PARA RESULTADOS DETALLADOS
            const resultados =
              estudio.ResultadosLaboratorio || estudio.ResultadosEnfermeria;

            if (resultados) {
              const esIndividual =
                estudio.TipoEstudio === "LaboratorioIndividual";
              const tituloResultados = esIndividual
                ? "Resultado individual de Laboratorio"
                : estudio.TipoEstudio === "Laboratorio"
                  ? "Resultados de Laboratorio"
                  : "Resultados de Enfermería";
              contentHtml += `<p class="font-semibold mt-2">${tituloResultados}:</p>`;
              contentHtml += `<ul class="list-disc list-inside ml-4">`;

              for (const key in resultados) {
                let value = resultados[key];
                if (!value || String(value).trim() === "") {
                  continue;
                }

                // Manejo de enlaces PDF dentro de los resultados detallados
                if (
                  (key === "Agudeza_Visual_PDF" ||
                    key === "Espirometria_PDF") &&
                  value !== "N/A"
                ) {
                  const label = key
                    .replace(/_/g, " ")
                    .replace("PDF", "")
                    .trim();
                  contentHtml += `<li><strong>${label}:</strong> <a href="${value}" target="_blank" class="text-blue-600 hover:underline"><i class="fas fa-file-pdf mr-1"></i>Ver Informe</a></li>`;
                }

                // Manejo especial para IMC (cálculo)
                else if (key === "Peso") {
                  const alturaCm = parseFloat(resultados.Altura);
                  const pesoKg = parseFloat(value);

                  if (!isNaN(alturaCm) && !isNaN(pesoKg) && alturaCm > 0) {
                    const imc = (pesoKg / (alturaCm / 100) ** 2).toFixed(2);
                    contentHtml += `<li><strong>IMC:</strong> ${imc}</li>`;
                  }
                  contentHtml += `<li><strong>Peso:</strong> ${value} kg</li>`;
                }
                // Ignorar el campo Altura para evitar duplicados en la lista cuando se calcula el IMC
                else if (key === "Altura") {
                  contentHtml += `<li><strong>Altura:</strong> ${value} cm</li>`;
                } else {
                  const label = key.replace(/_/g, " ");
                  contentHtml += `<li><strong>${label}:</strong> ${value}</li>`;
                }
              }
              contentHtml += `</ul>`;

              // Maneja el LinkPDF del estudio, que ahora está en el objeto 'estudio'
              if (estudio.LinkPDF && estudio.LinkPDF.trim() !== "") {
                contentHtml += `<p class="mt-2"><a href="${estudio.LinkPDF}" target="_blank" class="bg-green-400 hover:bg-green-500 text-gray-900 font-bold py-1 px-2 rounded inline-block"><i class="fas fa-file-pdf mr-1"></i> Ver PDF</a></p>`;
              }
            } else if (estudio.LinkPDF) {
              // Lógica para estudios con un solo PDF (ej. Mamografía)
              contentHtml += `<p class="mt-2"><a href="${estudio.LinkPDF}" target="_blank" class="text-blue-600 hover:underline"><i class="fas fa-file-pdf mr-1"></i>Ver PDF</a></p>`;
            } else {
              // Lógica para el resto de los estudios (ej. Odontologia)
              contentHtml += `<p><strong>Resultado:</strong> ${estudio.Resultado || "N/A"}</p>`;
              if (estudio.Observaciones) {
                contentHtml += `<p><strong>Observaciones:</strong> ${estudio.Observaciones}</p>`;
              }
            }

            estudioCard.innerHTML = contentHtml;
            estudiosModalContent.appendChild(estudioCard);
          });
        } else {
          estudiosModalContent.innerHTML = `<p class="text-center text-gray-600">No se encontraron estudios de tipo "${studyType}" para este DNI.</p>`;
        }
        estudiosModalContent.style.maxHeight = "60vh";
        estudiosModalContent.style.overflowY = "auto";
      } else {
        estudiosModalContent.innerHTML = `<p class="text-center text-gray-600">${data.message || "No se encontraron estudios para este DNI."}</p>`;
      }
    } catch (error) {
      console.error("Error al obtener estudios para el modal:", error);
      estudiosModalContent.innerHTML = `<p class="text-center text-red-600">Error al cargar los estudios. Intente nuevamente.</p>`;
    }
  }
  // Eventos para cerrar el modal
  closeModalBtn.addEventListener("click", () => {
    estudiosModal.classList.add("hidden");
  });

  modalCloseButtonBottom.addEventListener("click", () => {
    estudiosModal.classList.add("hidden");
  });

  // Cerrar modal al hacer clic fuera de él (opcional)
  estudiosModal.addEventListener("click", (e) => {
    if (e.target === estudiosModal) {
      estudiosModal.classList.add("hidden");
    }
  });
  function cerrarSesionGlobal() {
    if (!confirm("¿Cerrar sesión?")) return;
    localStorage.removeItem("dpToken");
    localStorage.removeItem("dpProfesional");
    window.location.href = "https://acceso.diapreventivoiapos.com";
  }

  // Asegurarse de que la función mostrarEstudiosModal esté disponible globalmente (opcional si ya está ahí)
  // window.mostrarEstudiosModal = mostrarEstudiosModal; // Descomentar si realmente necesitas que sea global para otras partes del código
});