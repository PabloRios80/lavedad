// ============================================================================
// avisoPortal.js — Aviso automático de acceso al Portal del Afiliado
// ----------------------------------------------------------------------------
// Se dispara cuando el médico cierra el Día Preventivo. Antes de avisar, revisa
// el cierre con reglas de seguridad; si algo no cuadra, lo RETIENE para que un
// humano lo resuelva. El email nunca lleva datos clínicos.
//
// Modo (variable AVISO_PORTAL_MODO):
//   apagado     -> no hace nada (default)
//   simulacion  -> decide y registra qué haría, sin crear claves ni mandar mails
//   activo      -> crea la clave provisoria y envía el email
// ============================================================================
const crypto = require("crypto");
const axios = require("axios");
const bcrypt = require("bcryptjs");

const MAX_INTENTOS = 3;
const MODO = () => (process.env.AVISO_PORTAL_MODO || "apagado").toLowerCase();
const PORTAL_URL = () =>
  process.env.PORTAL_URL || "https://portal.diapreventivoiapos.com/";
const EXCLUIDOS = () =>
  (process.env.AVISO_DNI_EXCLUIDOS || "12884070")
    .split(",")
    .map((s) => normDni(s))
    .filter(Boolean);

// ── Utilidades ──────────────────────────────────────────────────────────────
function normDni(d) {
  return String(d || "").replace(/\D/g, "").replace(/^0+/, "");
}
function variantesDni(d) {
  const s = String(d || "").trim();
  const n = normDni(s);
  return [...new Set([s, n, n.padStart(8, "0"), n.padStart(7, "0")])].filter(Boolean);
}
function hoyAR() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}
function norm(v) {
  return String(v == null ? "" : v)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
function escHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const VACIOS = new Set(["", "-", "no aplica", "no se realiza", "null"]);
const esVacio = (v) => VACIOS.has(norm(v));
const esPositivo = (v) => /^(positivo|reactivo|patologico|detectable|alterado|anormal)/.test(norm(v));
const esNegativo = (v) => /^(negativo|normal|no reactivo|no detectable)/.test(norm(v));
const esPendiente = (v) => norm(v).startsWith("pendiente");

// [columna del resultado, columna de la observación del médico, nombre]
const SENSIBLES = [
  ["vih", "obs_vih", "VIH"],
  ["hepatitis_b", "obs_hepatitis_b", "Hepatitis B"],
  ["hepatitis_c", "obs_hepatitis_c", "Hepatitis C"],
  ["its", "obs_its", "ITS"],
  ["vdrl", "obs_vdrl", "VDRL"],
  ["chagas", "obs_chagas", "Chagas"],
];
const HALLAZGOS = [
  ["cancer_cervico_hpv", "obs_hpv", "HPV"],
  ["cancer_cervico_pap", "obs_pap", "PAP"],
  ["somf", "obs_somf", "SOMF"],
  ["cancer_mama_mamografia", "obs_mamografia", "Mamografía"],
  ["cancer_mama_eco_mamaria", "obs_eco_mamaria", "Eco mamaria"],
  ["cancer_colon_colonoscopia", "obs_colonoscopia", "Colonoscopía"],
  ["prostata_psa", "obs_psa", "PSA"],
  ["erc", "obs_erc", "ERC"],
  ["osteoporosis", "obs_osteoporosis", "Osteoporosis"],
  ["aneurisma_aorta", "obs_aneurisma_aorta", "Aneurisma de aorta"],
];
const CLINICOS_EXTRA = [
  "presion_arterial", "imc", "diabetes", "dislipemias", "tabaco",
  "actividad_fisica", "alimentacion_saludable", "depresion", "agudeza_visual",
];

const NEGACION = /\b(no|sin|descart\w*|ausencia de|ni)\s+(\w+\s+){0,2}(positiv\w*|reactiv\w*|patolog\w*|alterad\w*|anormal\w*)/g;
const PALABRAS_POSITIVAS = /(positiv|reactiv|patolog|alterad|anormal)/;
const PALABRAS_NORMALES = /\b(normal|negativ|sin hallazgos|descart)/;
const GROSERIAS = /\b(mierda|puta|puto|pelotud\w*|boludo\w*|idiota|carajo|forro|hdp|conchudo\w*|imbecil)\b/;
const PLACEHOLDER = /^(prueba|test|asdf+|xxx+|\.+|-+|ok ok|aaa+)$/;

// ── Revisión del cierre ─────────────────────────────────────────────────────
// Devuelve { ok, manual: [...], reevaluable: [...] }
//  manual       -> requiere que una persona lo resuelva (no se reintenta solo)
//  reevaluable  -> se vuelve a evaluar solo más tarde (ej. estudio pendiente)
function evaluarCierre(f) {
  const manual = [];
  const reevaluable = [];
  const todos = [...SENSIBLES, ...HALLAZGOS];

  // 1) Positivos sensibles: se entregan con contención, no por email automático.
  for (const [campo, , nombre] of SENSIBLES) {
    if (esPositivo(f[campo])) manual.push(`${nombre} positivo: entregar el resultado con contención del equipo`);
  }

  // 2) Hallazgo patológico sin indicación escrita por el médico.
  for (const [campo, obsCampo, nombre] of HALLAZGOS) {
    if (esPositivo(f[campo]) && norm(f[obsCampo]).length < 10) {
      manual.push(`${nombre} patológico sin indicación del médico`);
    }
  }

  // 3) Contradicción entre el valor y la observación.
  for (const [campo, obsCampo, nombre] of todos) {
    const obs = norm(f[obsCampo]);
    if (!obs) continue;
    if (esNegativo(f[campo])) {
      const sinNeg = obs.replace(NEGACION, " ");
      if (PALABRAS_POSITIVAS.test(sinNeg)) manual.push(`${nombre}: el valor es normal/negativo pero la observación sugiere un hallazgo`);
    } else if (esPositivo(f[campo]) && PALABRAS_NORMALES.test(obs)) {
      manual.push(`${nombre}: el valor es positivo/patológico pero la observación dice normal/negativo`);
    }
  }

  // 4) Estudios pendientes -> se reevalúa solo.
  for (const [campo, , nombre] of todos) {
    if (esPendiente(f[campo])) reevaluable.push(`${nombre} pendiente`);
  }

  // 5) Incoherencias de sexo.
  const sexo = norm(f.sexo);
  const esM = sexo.startsWith("m");
  const esF = sexo.startsWith("f");
  if (!esM && !esF) manual.push("Sexo sin dato o no interpretable");
  const ginecologicos = ["cancer_cervico_hpv", "cancer_cervico_pap", "cancer_mama_mamografia", "cancer_mama_eco_mamaria"];
  if (esM && ginecologicos.some((c) => !esVacio(f[c]) && !esPendiente(f[c]))) {
    manual.push("Estudio ginecológico/mamario cargado a un paciente masculino: revisar el sexo");
  }
  if (esF && !esVacio(f.prostata_psa) && !esPendiente(f.prostata_psa)) {
    manual.push("PSA cargado a una paciente femenina: revisar el sexo");
  }

  // 6) Texto sospechoso en observaciones.
  for (const [k, v] of Object.entries(f)) {
    if (!k.startsWith("obs_") || !v) continue;
    const t = norm(v);
    if (GROSERIAS.test(t) || PLACEHOLDER.test(t)) {
      manual.push(`Texto sospechoso en ${k}`);
      break;
    }
  }

  // 7) Cierre casi vacío.
  const cargados = [...todos.map((x) => x[0]), ...CLINICOS_EXTRA].filter((c) => !esVacio(f[c]));
  if (cargados.length < 5) manual.push(`Cierre con muy pocos datos clínicos (${cargados.length})`);

  // 8) Menores: el aviso va al responsable, no se manda automático.
  const edad = parseInt(f.edad, 10);
  if (!Number.isNaN(edad) && edad < 18) manual.push("Menor de edad: avisar al responsable");

  return { ok: manual.length === 0 && reevaluable.length === 0, manual, reevaluable };
}

// ── Datos de contacto ───────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function buscarEmail(supabase, dni) {
  const vars = variantesDni(dni);
  const fuentes = ["contactos_afiliados", "historial_hoja_de_vida", "afiliados", "tablero_dia", "turnos"];
  for (const tabla of fuentes) {
    try {
      const { data } = await supabase.from(tabla).select("email").in("dni", vars).not("email", "is", null).limit(5);
      const ok = (data || []).map((r) => String(r.email || "").trim().toLowerCase()).find((e) => EMAIL_RE.test(e));
      if (ok) return ok;
    } catch (e) {
      /* si una fuente falla, probamos la siguiente */
    }
  }
  return null;
}

async function buscarNombre(supabase, dni) {
  try {
    const { data } = await supabase.from("afiliados").select("nombre").in("dni", variantesDni(dni)).limit(1);
    const n = data && data[0] && String(data[0].nombre || "").trim();
    if (n) return n.split(/\s+/)[0].charAt(0).toUpperCase() + n.split(/\s+/)[0].slice(1).toLowerCase();
  } catch (e) { /* sin nombre: saludo genérico */ }
  return null;
}

async function ultimaFilaCierre(supabase, dni) {
  const { data, error } = await supabase
    .from("historial_dia_preventivo")
    .select("*")
    .in("dni", variantesDni(dni))
    .eq("estado_registro", "activo")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data && data[0] ? data[0] : null;
}

// ── Email ───────────────────────────────────────────────────────────────────
function armarEmail({ nombre, dni, password }) {
  const saludo = nombre ? `Hola ${escHtml(nombre)},` : "Hola,";
  const url = PORTAL_URL();
  const bloqueClave = password
    ? `<p style="margin:16px 0;padding:14px;background:#f3f4f6;border-radius:8px;font-size:16px">
         <b>Usuario (DNI):</b> ${escHtml(dni)}<br><b>Clave provisoria:</b> <span style="font-family:monospace;font-size:18px">${escHtml(password)}</span></p>
       <p>Por tu seguridad, al ingresar te recomendamos cambiarla desde el botón <b>"Cambiar Clave"</b>.</p>`
    : `<p style="margin:16px 0;padding:14px;background:#f3f4f6;border-radius:8px;font-size:16px">
         Ingresá con tu <b>DNI</b> y la clave que ya tenés. Si no la recordás, escribinos y te generamos una nueva.</p>`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1f2937;line-height:1.5">
    <h2 style="color:#1e40af">Tu Portal Personal de Salud ya está disponible</h2>
    <p>${saludo}</p>
    <p>Tu equipo de salud finalizó tu <b>Día Preventivo IAPOS</b>. Ya podés ver tus resultados y las recomendaciones de tu médico en tu portal personal.</p>
    ${bloqueClave}
    <p><a href="${url}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ingresar a mi portal</a></p>
    <p style="font-size:13px;color:#6b7280">Este mensaje no incluye resultados: tu información de salud solo se muestra al ingresar con tu clave. Si no esperabas este mensaje, ignoralo.</p>
    <p style="font-size:13px;color:#6b7280">Programa Día Preventivo IAPOS</p></div>`;
  const text = `${saludo.replace(/&[^;]+;/g, "")}\n\nTu equipo de salud finalizó tu Día Preventivo IAPOS. Ya podés ver tus resultados y recomendaciones en tu portal personal: ${url}\n\n` +
    (password ? `Usuario (DNI): ${dni}\nClave provisoria: ${password}\nTe recomendamos cambiarla al ingresar.\n\n` : `Ingresá con tu DNI y la clave que ya tenés. Si no la recordás, escribinos.\n\n`) +
    `Este mensaje no incluye resultados. Programa Día Preventivo IAPOS.`;
  return { subject: "Tu Portal Personal de Salud ya está disponible - Día Preventivo IAPOS", html, text };
}

async function enviarEmail({ to, subject, html, text, idem }) {
  if (!process.env.RESEND_API_KEY || !process.env.AVISO_FROM) {
    throw new Error("Faltan RESEND_API_KEY o AVISO_FROM");
  }
  await axios.post(
    "https://api.resend.com/emails",
    { from: process.env.AVISO_FROM, to: [to], subject, html, text },
    { headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Idempotency-Key": idem }, timeout: 15000 },
  );
}

// ── Proceso de un aviso ─────────────────────────────────────────────────────
const enProceso = new Set();

async function marcar(supabase, id, campos) {
  const { error } = await supabase.from("avisos_portal").update(campos).eq("id", id);
  if (error) console.error("Aviso portal: no se pudo actualizar el aviso", id, error.message);
}

async function procesarAviso(supabase, aviso, opts = {}) {
  const modo = MODO();
  if (modo === "apagado" || enProceso.has(aviso.id)) return;
  enProceso.add(aviso.id);
  try {
    if (EXCLUIDOS().includes(normDni(aviso.dni))) {
      return await marcar(supabase, aviso.id, { estado: "retenido", motivo_retencion: "DNI de prueba (excluido)" });
    }

    const fila = await ultimaFilaCierre(supabase, aviso.dni);
    if (!fila) {
      return await marcar(supabase, aviso.id, { estado: "retenido", motivo_retencion: "PENDIENTE: no se encontró el cierre en el historial" });
    }

    const ev = evaluarCierre(fila);
    if (!ev.ok) {
      const motivo = [...ev.manual, ...ev.reevaluable.map((m) => `PENDIENTE: ${m}`)].join(" | ");
      return await marcar(supabase, aviso.id, { estado: "retenido", motivo_retencion: motivo });
    }

    const email = await buscarEmail(supabase, aviso.dni);
    if (!email) return await marcar(supabase, aviso.id, { estado: "sin_email", motivo_retencion: null });

    // Credenciales: si ya tiene cuenta propia no se toca; si es una provisoria
    // nuestra que nunca se usó, se regenera (por si un envío anterior falló).
    const usuario = normDni(aviso.dni);
    const { data: acc } = await supabase
      .from("accesos_portal").select("dni,origen,provisoria,ultimo_login").eq("dni", usuario).maybeSingle();
    const regenerable = acc && acc.provisoria && acc.origen === "cierre_auto" && !acc.ultimo_login;

    let password = null;
    if (!acc || regenerable) password = `IAPOS-${crypto.randomInt(100000, 1000000)}`;

    if (modo === "simulacion") {
      return await marcar(supabase, aviso.id, {
        estado: "simulado", email,
        motivo_retencion: `SIMULACIÓN: enviaría ${password ? "aviso con clave nueva" : "aviso sin clave (ya tiene acceso)"} a ${email}`,
      });
    }

    if (password) {
      const { error } = await supabase.from("accesos_portal").upsert(
        { dni: usuario, password_hash: await bcrypt.hash(password, 10), rol: "user", provisoria: true, origen: "cierre_auto" },
        { onConflict: "dni" },
      );
      if (error) throw new Error("No se pudo guardar la clave: " + error.message);
    }

    const nombre = opts.nombre || (await buscarNombre(supabase, aviso.dni));
    const mail = armarEmail({ nombre, dni: fila.dni || aviso.dni, password });
    try {
      await enviarEmail({ to: email, ...mail, idem: `aviso-${aviso.id}-${aviso.intentos}` });
      await marcar(supabase, aviso.id, {
        estado: "enviado", email, enviado_en: new Date().toISOString(),
        intentos: aviso.intentos + 1, error_detalle: null, motivo_retencion: null,
      });
      console.log(`📧 Aviso de portal enviado (DNI ${aviso.dni})`);
    } catch (e) {
      const det = e.response && e.response.data ? JSON.stringify(e.response.data) : e.message;
      await marcar(supabase, aviso.id, { estado: "error", email, intentos: aviso.intentos + 1, error_detalle: String(det).slice(0, 300) });
      console.error(`Aviso portal: fallo el envío (DNI ${aviso.dni}):`, String(det).slice(0, 200));
    }
  } catch (e) {
    console.error("Aviso portal: error procesando", aviso.id, e.message);
    await marcar(supabase, aviso.id, { estado: "error", intentos: (aviso.intentos || 0) + 1, error_detalle: String(e.message).slice(0, 300) });
  } finally {
    enProceso.delete(aviso.id);
  }
}

// ── API pública ─────────────────────────────────────────────────────────────
// Se llama justo después de guardar el cierre. Nunca debe romper el cierre.
async function programarAvisoPortal(supabase, { dni, nombre }) {
  if (MODO() === "apagado") return;
  const dniStr = String(dni || "").trim();
  if (!dniStr) return;
  const { data, error } = await supabase
    .from("avisos_portal")
    .upsert({ dni: dniStr, cierre_ref: `${normDni(dniStr)}_${hoyAR()}` }, { onConflict: "dni,cierre_ref", ignoreDuplicates: true })
    .select();
  if (error) throw error;
  if (!data || data.length === 0) return; // ya existía un aviso para este cierre
  await procesarAviso(supabase, data[0], { nombre });
}

// Barrido periódico: reintenta errores y reevalúa los retenidos "pendientes".
async function procesarPendientes(supabase) {
  if (MODO() === "apagado") return { procesados: 0 };
  let n = 0;
  const { data: reint } = await supabase
    .from("avisos_portal").select("*").in("estado", ["pendiente", "error"]).lt("intentos", MAX_INTENTOS)
    .order("actualizado_en", { ascending: true }).limit(25);
  for (const a of reint || []) { await procesarAviso(supabase, a); n++; }

  const desde = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString();
  const { data: ret } = await supabase
    .from("avisos_portal").select("*").eq("estado", "retenido").ilike("motivo_retencion", "%PENDIENTE:%")
    .gte("creado_en", desde).order("actualizado_en", { ascending: true }).limit(25);
  for (const a of ret || []) { await procesarAviso(supabase, a); n++; }
  return { procesados: n };
}

module.exports = { programarAvisoPortal, procesarPendientes, evaluarCierre, armarEmail };