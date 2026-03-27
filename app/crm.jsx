"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import AgendaPanel from "@/components/crm/AgendaPanel";
import ConversationsPanel from "@/components/crm/ConversationsPanel";
import KanbanBoard from "@/components/crm/KanbanBoard";
import LeadsTable from "@/components/crm/LeadsTable";
import LeadDetailModal from "@/components/crm/LeadDetailModal";
import NewAppointmentModal from "@/components/crm/NewAppointmentModal";
import NewLeadModal from "@/components/crm/NewLeadModal";
const supabase = createClient();

const STAGES = [
  { id: "primer_contacto", label: "📞 Primer contacto", color: "#4A90D9", bg: "#1a2a3a" },
  { id: "examen_ubicacion", label: "📝 Examen de ubicación", color: "#E8A838", bg: "#2a1f0a" },
  { id: "clase_muestra", label: "🎓 Clase muestra", color: "#E85D38", bg: "#2a1210" },
  { id: "segundo_contacto", label: "🔁 Segundo contacto", color: "#9B59B6", bg: "#1e1228" },
  { id: "promocion_enviada", label: "🏷️ Promoción enviada", color: "#C76D2B", bg: "#2b1a0f" },
  { id: "tercer_contacto", label: "📲 Tercer contacto", color: "#6D8CFF", bg: "#151d35" },
  { id: "inscripcion_pendiente", label: "📋 Inscripción pendiente", color: "#F4D35E", bg: "#2b2612" },
  { id: "inscrito", label: "✅ Inscrito", color: "#27AE60", bg: "#0d2018" },
  { id: "perdido", label: "❌ Perdido", color: "#555", bg: "#1a1a1a" },
  { id: "archivado", label: "📦 Archivado", color: "#888", bg: "#141414" },
];

const LEGACY_STAGE_MAP = {
  nuevo: "primer_contacto",
  contactado: "primer_contacto",
  interesado: "segundo_contacto",
  propuesta: "inscripcion_pendiente",
  cerrado: "inscrito",
};

const CURSOS = ["Inglés para niños", "Inglés para adultos", "Licenciaturas", "Maestrías", "Diplomados"];
const formatPeso = (v) => `$${Number(v).toLocaleString("es-MX")}`;

const WA_TEMPLATES = {
  primer_contacto: (nombre, curso) => `Hola ${nombre}. Gracias por tu interés en *${curso}* en Instituto Windsor. Con gusto te orientamos sobre el siguiente paso.`,
  examen_ubicacion: (nombre, curso) => `Hola ${nombre}. Te doy seguimiento con tu proceso de *${curso}*. Si quieres, avanzamos con tu examen de ubicación.`,
  clase_muestra: (nombre, curso) => `Hola ${nombre}. Seguimos atentos con tu proceso de *${curso}*. Si te parece, avanzamos con tu clase muestra.`,
  segundo_contacto: (nombre, curso) => `Hola ${nombre}. Te doy seguimiento sobre *${curso}*. Si quieres, te ayudo a resolver dudas y avanzar.`,
  promocion_enviada: (nombre, curso) => `${nombre}, ya te compartimos la promoción vigente para *${curso}*. Si deseas, te apoyo con el siguiente paso.`,
  tercer_contacto: (nombre, curso) => `Hola ${nombre}. Retomo tu proceso de *${curso}* para saber si aún te interesa avanzar con Instituto Windsor.`,
  inscripcion_pendiente: (nombre, curso) => `${nombre}, tu proceso de *${curso}* está listo para inscripción. Si deseas, te ayudo a cerrarlo hoy mismo.`,
  inscrito: (nombre, curso) => `¡Felicidades ${nombre}! Tu inscripción en *${curso}* quedó confirmada con Instituto Windsor.`,
};

const normalizeStage = (stage) => LEGACY_STAGE_MAP[stage] || stage || "primer_contacto";
const AGENDAR_LINK = "https://crm.windsor.edu.mx/agendar/hola@windsor.edu.mx";

const getInfoTemplateForLead = (lead) => {
  const nombre = lead?.nombre?.split(" ")[0] || "Hola";
  const curso = String(lead?.curso || "").toLowerCase();

  if (curso.includes("niños")) {
    return `Hola ${nombre}. Gracias por tu interés en *Inglés para niños* en Instituto Windsor. Te comparto información general: trabajamos por niveles, con acompañamiento cercano y un enfoque práctico para desarrollar comprensión y conversación. Si deseas, con gusto te apoyamos con *examen de ubicación* y *clase muestra*.`;
  }

  if (curso.includes("adultos") || curso.includes("ingles")) {
    return `Hola ${nombre}. Gracias por tu interés en *Inglés para adultos* en Instituto Windsor. Te comparto información general: avance por niveles, enfoque conversacional y práctica constante para usar el idioma en contextos reales. Si deseas, con gusto te apoyamos con *examen de ubicación* y *clase muestra*.`;
  }

  if (curso.includes("licenciatura")) {
    return `Hola ${nombre}. Gracias por tu interés en *Licenciaturas* en Instituto Windsor. Con gusto te compartimos información general sobre el proceso de admisión, orientación académica y acompañamiento para ayudarte a elegir la mejor opción. Si deseas, podemos continuar con *promoción vigente* e *inscripción*.`;
  }

  if (curso.includes("maestr")) {
    return `Hola ${nombre}. Gracias por tu interés en *Maestrías* en Instituto Windsor. Con gusto te compartimos información general sobre admisión, orientación académica y acompañamiento para revisar la opción que mejor se ajuste a tu perfil. Si deseas, podemos continuar con *promoción vigente* e *inscripción*.`;
  }

  if (curso.includes("diplomado")) {
    return `Hola ${nombre}. Gracias por tu interés en *Diplomados* en Instituto Windsor. Con gusto te compartimos información general sobre nuestras opciones de formación práctica y actualización profesional. Si deseas, podemos continuar con *promoción vigente* e *inscripción*.`;
  }

  return `Hola ${nombre}. Gracias por tu interés en Instituto Windsor. Con gusto te compartimos información general del programa que nos solicitaste. Si deseas, también podemos ayudarte con el siguiente paso desde aquí: ${AGENDAR_LINK}`;
};

const getLabProgramInfo = (programa = "") => {
  const program = String(programa || "").toLowerCase();

  if (program.includes("cursos de inglés") || program.includes("cursos de ingles")) {
    return "Para *Cursos de inglés*, Instituto Windsor ofrece opciones para niños y para adultos, con modalidad presencial y en línea según el programa. Si quieres, también puedo decirte cuál de las dos opciones se ajusta mejor a tu caso.";
  }

  if (program.includes("niños")) {
    return "Para *Inglés para niños*, trabajamos por niveles, con acompañamiento cercano y enfoque práctico. El siguiente paso ideal es *examen de ubicación* y después *clase muestra*.";
  }

  if (program.includes("adultos")) {
    return "Para *Inglés para adultos*, manejamos avance por niveles, práctica conversacional y seguimiento cercano. El siguiente paso ideal es *examen de ubicación* y después *clase muestra*.";
  }

  if (program.includes("bachiller")) {
    return "Para *Bachillerato*, te orientamos sobre admisión, plan académico y proceso de inscripción. El siguiente paso ideal es resolver dudas y avanzar con tu proceso.";
  }

  if (program.includes("licenci")) {
    return "Para *Licenciaturas*, te orientamos sobre admisión, plan académico, promoción vigente y proceso de inscripción. El siguiente paso ideal es revisar dudas y avanzar con tu proceso.";
  }

  if (program.includes("maestr")) {
    return "Para *Maestrías*, te orientamos sobre admisión, perfil de ingreso, promoción vigente y proceso de inscripción. El siguiente paso ideal es revisar dudas y avanzar con tu proceso.";
  }

  if (program.includes("diplom")) {
    return "Para *Diplomados*, te orientamos sobre contenido, modalidad, promoción vigente y proceso de inscripción. El siguiente paso ideal es revisar dudas y avanzar con tu proceso.";
  }

  return "Puedo compartirte información general del programa y ayudarte a avanzar con el siguiente paso en tu proceso.";
};

const normalizeLabProgram = (programa = "") => {
  const program = String(programa || "").trim().toLowerCase();

  if (!program) return "";
  if (
    program.includes("cursos de inglés") ||
    program.includes("cursos de ingles") ||
    program.includes("curso de inglés") ||
    program.includes("curso de ingles") ||
    program === "ingles" ||
    program === "inglés"
  ) {
    return "Cursos de inglés";
  }
  if (program.includes("niñ")) return "Inglés para niños";
  if (program.includes("adult")) return "Inglés para adultos";
  if (program.includes("bach")) return "Bachillerato";
  if (program.includes("lic")) return "Licenciaturas";
  if (program.includes("maestr")) return "Maestrías";
  if (program.includes("dipl")) return "Diplomados";

  return programa;
};

const isLabEmail = (value = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

const normalizeLabText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const isGenericEnglishCoursesRequest = (value = "") => {
  const text = normalizeLabText(value);

  if (!text) return false;

  const mentionsEnglishCourses =
    text.includes("curso de ingles") ||
    text.includes("cursos de ingles") ||
    text === "ingles" ||
    text === "curso de ingles" ||
    text === "cursos de ingles";

  const refersToDegreeInEnglish =
    text.includes("licenciatura en ingles") ||
    text.includes("maestria en ingles") ||
    text.includes("diplomado en ingles");

  return mentionsEnglishCourses && !refersToDegreeInEnglish;
};

const LAB_PROGRAM_OPTIONS = [
  "Cursos de inglés",
  "Inglés para niños",
  "Inglés para adultos",
  "Bachillerato",
  "Licenciaturas",
  "Maestrías",
  "Diplomados",
  "Psicología",
  "Administración Turística",
  "Relaciones Públicas y Mercadotecnia",
];

const isKnownLabProgram = (programa = "") => LAB_PROGRAM_OPTIONS.includes(normalizeLabProgram(programa));

const isEnglishCourseProgram = (programa = "") => {
  const normalized = normalizeLabProgram(programa);
  return normalized === "Cursos de inglés" || normalized === "Inglés para niños" || normalized === "Inglés para adultos";
};

const extractLabProgramFromMessage = (value = "") => {
  const text = normalizeLabText(value);

  if (!text) return null;

  if (
    text.includes("psico") ||
    text.includes("psicologia") ||
    text.includes("lic en psico") ||
    text.includes("licenciatura en psicologia")
  ) {
    return "Psicología";
  }

  if (
    text.includes("turis") ||
    text.includes("admin turistica") ||
    text.includes("administracion turistica") ||
    text.includes("lic en turismo")
  ) {
    return "Administración Turística";
  }

  if (
    text.includes("relaciones publicas") ||
    text.includes("relaciones publicas y mercadotecnia") ||
    text.includes("mercadotec") ||
    text.includes("rp y merca")
  ) {
    return "Relaciones Públicas y Mercadotecnia";
  }

  if (text.includes("ingles para ninos") || text.includes("curso de ingles para ninos") || text.includes("ninos")) {
    return "Inglés para niños";
  }

  if (text.includes("ingles para adultos") || text.includes("curso de ingles para adultos") || text.includes("adultos")) {
    return "Inglés para adultos";
  }

  if (text.includes("bach")) return "Bachillerato";
  if (text.includes("maestr")) return "Maestrías";
  if (text.includes("diplom")) return "Diplomados";
  if (text.includes("lics") || text.includes("licenciaturas") || /\blic\b/.test(text)) return "Licenciaturas";

  return null;
};

const isBroadAcademicFamily = (programa = "") => {
  const normalized = normalizeLabProgram(programa);
  return ["Licenciaturas", "Maestrías", "Diplomados"].includes(normalized);
};

const getLabProgramCTA = (programa = "") => {
  const normalized = normalizeLabProgram(programa);

  if (isEnglishCourseProgram(normalized)) {
    if (normalized === "Cursos de inglés") {
      return "Si quieres, ahora dime si te interesa *Inglés para niños* o *Inglés para adultos* y te comparto solo esa opción.";
    }
    return "Si quieres, el siguiente paso es ayudarte a agendar tu *clase muestra*.";
  }

  if (isBroadAcademicFamily(normalized)) {
    return `Si quieres, ahora dime cuál ${normalized.toLowerCase().slice(0, -1)} te interesa y te comparto solo la información de esa opción.`;
  }

  if (normalized === "Bachillerato") {
    return "Si quieres, también puedo ayudarte con *costos*, *horarios* o con el *siguiente paso* de tu proceso.";
  }

  return "Si quieres, también puedo ayudarte con el *siguiente paso* de tu proceso.";
};

const getLabInvalidProgramReply = () =>
  "No identifiqué esa oferta educativa dentro de Instituto Windsor. Las opciones que manejo en esta simulación son:\n\n• Inglés para niños\n• Inglés para adultos\n• Bachillerato\n• Licenciaturas\n• Maestrías\n• Diplomados";

const buildLabKnowledgeQuestion = (programa = "", intent = "general") => {
  const program = normalizeLabProgram(programa) || "el programa";

  if (intent === "catalogo") {
    return `Comparte únicamente la oferta educativa disponible dentro de ${program} en Instituto Windsor. No des costos, horarios ni información detallada. Solo enumera las opciones y termina preguntando cuál le interesa al prospecto. Si el contexto no contiene información de ${program}, dilo claramente.`;
  }

  if (intent === "costos") {
    return `Comparte únicamente la información disponible sobre costos, colegiaturas, pagos o promociones de ${program} en Instituto Windsor. Si no hay costos exactos, resume lo que sí exista. Si el contexto no contiene información de ${program}, dilo claramente.`;
  }

  if (intent === "horarios") {
    return `Comparte únicamente la información disponible sobre horarios, días, turnos, modalidad o duración de ${program} en Instituto Windsor. Si no hay horarios exactos, resume lo que sí exista. Si el contexto no contiene información de ${program}, dilo claramente.`;
  }

  return `Comparte la información general más relevante de ${program} en Instituto Windsor, incluyendo lo más útil para un prospecto que acaba de pedir informes. Si el contexto no contiene información específica de ${program}, dilo claramente y no respondas con otra oferta.`;
};

const labProgramMatchesAnswer = (programa = "", answer = "") => {
  const normalizedProgram = normalizeLabProgram(programa).toLowerCase();
  const normalizedAnswer = String(answer || "").toLowerCase();

  if (!normalizedProgram || !normalizedAnswer) return false;

  if (normalizedProgram === "inglés para niños") {
    return normalizedAnswer.includes("niñ");
  }

  if (normalizedProgram === "inglés para adultos") {
    return normalizedAnswer.includes("adult");
  }

  if (normalizedProgram === "bachillerato") {
    return normalizedAnswer.includes("bachiller");
  }

  if (normalizedProgram === "licenciaturas") {
    return normalizedAnswer.includes("licenci");
  }

  if (normalizedProgram === "maestrías") {
    return normalizedAnswer.includes("maestr");
  }

  if (normalizedProgram === "diplomados") {
    return normalizedAnswer.includes("diplom");
  }

  if (normalizedProgram === "psicología") {
    return normalizedAnswer.includes("psicolog");
  }

  if (normalizedProgram === "administración turística") {
    return normalizedAnswer.includes("turist");
  }

  if (normalizedProgram === "relaciones públicas y mercadotecnia") {
    return normalizedAnswer.includes("mercadotec") || normalizedAnswer.includes("relaciones públicas") || normalizedAnswer.includes("relaciones publicas");
  }

  return normalizedAnswer.includes(normalizedProgram);
};

const getLabNoSpecificInfoReply = (programa = "") =>
  `No encontré información específica sobre *${programa}* dentro de la BASE actual. Si quieres, puedo mostrarte primero el catálogo general o revisar otra oferta educativa.`;

const getLabOfferSwitchReply = (programa = "") => {
  const normalized = normalizeLabProgram(programa);

  if (isBroadAcademicFamily(normalized)) {
    return `Claro. Puedo cambiar de tema y ayudarte con *${normalized}*. Primero te comparto solo las opciones disponibles dentro de esa oferta y tú me dices cuál te interesa.`;
  }

  return `Claro. Cambio el tema de la conversación y ahora te comparto información sobre *${normalized}*.`;
};

const getLabEnglishFamilyReply = () =>
  "Claro. También puedo ayudarte con *Cursos de inglés*. Primero te comparto la información general y, si quieres, después me dices si te interesa:\n\n• *Inglés para niños*\n• *Inglés para adultos*";

const formatLabKnowledgeAnswer = (answer = "") => {
  let formatted = String(answer || "").trim();

  if (!formatted) return "";

  formatted = formatted
    .replace(/^Por supuesto,\s*/i, "")
    .replace(/^Claro\.\s*/i, "")
    .replace(/^Aquí tienes\s*/i, "")
    .replace(/\s+\-\s+\*\*/g, "\n\n**")
    .replace(/\*\*(.+?):\*\*/g, "\n\n**$1:**")
    .replace(/\s+\-\s+/g, "\n• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return formatted;
};

const buildLabBotReply = ({ scenario, state, message }) => {
  const text = String(message || "").trim();
  const lower = text.toLowerCase();
  const genericEnglishRequest = isGenericEnglishCoursesRequest(text);
  const nextState = { ...state };
  const detectedProgram = extractLabProgramFromMessage(text);
  const activeProgram = detectedProgram || state.programa;
  let reply = "";

  if (scenario === "walkin") {
    if (genericEnglishRequest) {
      nextState.programa = "Cursos de inglés";
      nextState.fase = "seguimiento";
      nextState.nextStep = "Compartir información general de cursos de inglés y luego precisar niños o adultos";
      reply = getLabEnglishFamilyReply();
      return {
        reply,
        nextState,
        queryPrompt: buildLabKnowledgeQuestion("Cursos de inglés", "general"),
        fallbackReply: `${getLabEnglishFamilyReply()}\n\n${getLabProgramInfo("Cursos de inglés")}\n\n${getLabProgramCTA("Cursos de inglés")}`,
      };
    }

    if (detectedProgram && detectedProgram !== state.programa) {
      nextState.programa = detectedProgram;
      nextState.nextStep = "Resolver información del nuevo programa";
    }

    if (state.fase === "saludo") {
      reply = `Hola ${state.nombre || ""}, soy el asistente de admisiones de Instituto Windsor. Ya tengo registrado tu interés en *${state.programa || "el programa"}*. Si te parece bien, puedo compartirte por aquí la información inicial y ayudarte con el siguiente paso.`;
      nextState.fase = "confirmacion_info";
      nextState.nextStep = "Esperar confirmación para compartir información";
      return { reply, nextState };
    }

    if (state.fase === "confirmacion_info") {
      if (/si|sí|claro|ok|dale|perfecto|va|me parece|informaci[oó]n|info/.test(lower)) {
        reply = `Perfecto. Te comparto la información inicial de *${activeProgram || "tu programa"}*...`;
        nextState.fase = "seguimiento";
        nextState.nextStep = "Resolver costos, horarios o siguiente paso";
        return {
          reply,
          nextState,
          queryPrompt: buildLabKnowledgeQuestion(activeProgram, isBroadAcademicFamily(activeProgram) ? "catalogo" : "general"),
          fallbackReply: `Te comparto la información inicial de *${activeProgram || "tu programa"}*: ${getLabProgramInfo(activeProgram)} Si quieres, después de esto también puedo ayudarte con *costos*, *horarios* o con el *siguiente paso*.`,
        };
      }

      reply = `Claro. Cuando quieras, puedo compartirte por aquí la información inicial de *${state.programa || "tu programa"}* y ayudarte a continuar con el proceso.`;
      nextState.nextStep = "Esperar confirmación para compartir información";
      return { reply, nextState };
    }

    if (/precio|costo|colegiatura|horario|duracion|duración|\?/.test(lower)) {
      const intent = /precio|costo|colegiatura/.test(lower) ? "costos" : "horarios";
      reply = `Con gusto. Déjame revisar la información de *${activeProgram || "tu programa"}*...`;
      nextState.nextStep = "Seguir resolviendo costos, horarios o dudas";
      return {
        reply,
        nextState,
        queryPrompt: buildLabKnowledgeQuestion(activeProgram, intent),
        fallbackReply: `Con gusto puedo ayudarte con esa duda sobre *${activeProgram || "tu programa"}*. ${getLabProgramInfo(activeProgram)}`,
      };
    }

    if (/informaci[oó]n|info|detalles/.test(lower)) {
      reply = `Claro. Déjame revisar la información de *${activeProgram || "tu programa"}*...`;
      nextState.nextStep = "Resolver costos, horarios o siguiente paso";
      return {
        reply,
        nextState,
        queryPrompt: buildLabKnowledgeQuestion(activeProgram, isBroadAcademicFamily(activeProgram) ? "catalogo" : "general"),
        fallbackReply: `Sobre *${activeProgram || "tu programa"}*: ${getLabProgramInfo(activeProgram)} Si quieres, también puedo ayudarte con *costos*, *horarios* o con el *siguiente paso*.`,
      };
    }

    reply = `Perfecto. Retomo tu proceso de *${activeProgram || "tu programa"}* en Instituto Windsor. Si quieres, te apoyo con *costos*, *horarios* o con el *siguiente paso* de tu proceso.`;
    nextState.nextStep = "Resolver costos, horarios o llevar al siguiente paso";
    return { reply, nextState };
  }

  if (!state.nombre) {
    nextState.nombre = text;
    nextState.fase = "programa";
    nextState.nextStep = "Capturar programa";
    reply = `Mucho gusto, ${text.split(/\s+/)[0]}. ¿Qué programa te interesa? En Instituto Windsor contamos con *Inglés para niños*, *Inglés para adultos*, *Bachillerato*, *Licenciaturas*, *Maestrías* y *Diplomados*.`;
    return { reply, nextState };
  }

  if (!state.programa) {
    if (genericEnglishRequest) {
      nextState.programa = "Cursos de inglés";
      nextState.fase = "correo";
      nextState.nextStep = "Capturar correo para cursos de inglés";
      reply = "Perfecto. Para continuar con *Cursos de inglés*, ¿me compartes tu correo, por favor?";
      return { reply, nextState };
    }

    if (isLabEmail(text)) {
      nextState.fase = "programa";
      nextState.nextStep = "Capturar programa correctamente";
      reply = "Todavía no me compartes el programa de interés. Antes del correo, dime por favor qué te interesa: *Inglés para niños*, *Inglés para adultos*, *Bachillerato*, *Licenciaturas*, *Maestrías* o *Diplomados*.";
      return { reply, nextState };
    }

    const normalizedProgram = detectedProgram || normalizeLabProgram(text);
    if (!isKnownLabProgram(normalizedProgram)) {
      nextState.fase = "programa";
      nextState.nextStep = "Validar oferta educativa";
      reply = getLabInvalidProgramReply();
      return { reply, nextState };
    }

    nextState.programa = normalizedProgram;
    nextState.fase = "correo";
    nextState.nextStep = "Capturar correo";
    reply = `Perfecto. Para continuar con *${normalizedProgram}*, ¿me compartes tu correo, por favor?`;
    return { reply, nextState };
  }

  if (!state.email) {
    if (genericEnglishRequest) {
      nextState.programa = "Cursos de inglés";
      nextState.nextStep = "Compartir información general de cursos de inglés";
    }

    if (detectedProgram && detectedProgram !== state.programa) {
      nextState.programa = detectedProgram;
      nextState.nextStep = "Resolver información del nuevo programa";
    }
    nextState.email = text;
    nextState.fase = "seguimiento";
    nextState.nextStep = "Resolver costos, horarios o siguiente paso";
    reply = `Gracias, ${state.nombre}. Déjame revisar la información inicial de *${activeProgram}*...`;
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion(activeProgram, isBroadAcademicFamily(activeProgram) ? "catalogo" : "general"),
      fallbackReply: `Te comparto la información inicial de *${activeProgram}*: ${getLabProgramInfo(activeProgram)} Si quieres, ahora mismo puedo ayudarte con *costos*, *horarios* o con el *siguiente paso*. ¿Qué te interesa revisar primero?`,
    };
  }

  if (genericEnglishRequest) {
    nextState.programa = "Cursos de inglés";
    nextState.fase = "seguimiento";
    nextState.nextStep = "Compartir información general de cursos de inglés y luego precisar niños o adultos";
    reply = getLabEnglishFamilyReply();
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion("Cursos de inglés", "general"),
      fallbackReply: `${getLabEnglishFamilyReply()}\n\n${getLabProgramInfo("Cursos de inglés")}\n\n${getLabProgramCTA("Cursos de inglés")}`,
    };
  }

  if (detectedProgram && detectedProgram !== state.programa) {
    nextState.programa = detectedProgram;
    nextState.fase = "seguimiento";
    nextState.nextStep = "Resolver información del nuevo programa";
    reply = getLabOfferSwitchReply(detectedProgram);
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion(detectedProgram, isBroadAcademicFamily(detectedProgram) ? "catalogo" : "general"),
      fallbackReply: `Sobre *${detectedProgram}*: ${getLabProgramInfo(detectedProgram)} ${getLabProgramCTA(detectedProgram)}`,
    };
  }

  if (/informaci[oó]n|info|detalles|cu[eé]ntame m[aá]s|dame la informaci[oó]n/.test(lower)) {
    nextState.fase = "accion";
    nextState.nextStep = "Resolver costos, horarios o llevar al siguiente paso";
    reply = `Claro. Déjame revisar la información de *${activeProgram}*...`;
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion(activeProgram, isBroadAcademicFamily(activeProgram) ? "catalogo" : "general"),
      fallbackReply: `Sobre *${activeProgram}*: ${getLabProgramInfo(activeProgram)} Si quieres, después de esto también puedo ayudarte con *costos*, *horarios* o con el *siguiente paso*.`,
    };
  }

  if (/precio|precios|costo|costos|colegiatura/.test(lower)) {
    nextState.fase = "accion";
    nextState.nextStep = "Explicar costos o seguir proceso";
    reply = `Claro. Déjame revisar los costos de *${activeProgram}*...`;
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion(activeProgram, "costos"),
      fallbackReply: `Aquí el bot debería responder con los costos vigentes de *${activeProgram}*. Si no hay costos exactos, al menos debería responder con la información inicial disponible y ayudarte a avanzar con el siguiente paso.`,
    };
  }

  if (/horario|horarios|dias|días|turno/.test(lower)) {
    nextState.fase = "accion";
    nextState.nextStep = "Explicar horarios o seguir proceso";
    reply = `Claro. Déjame revisar los horarios de *${activeProgram}*...`;
    return {
      reply,
      nextState,
      queryPrompt: buildLabKnowledgeQuestion(activeProgram, "horarios"),
      fallbackReply: `Aquí el bot debería responder con los horarios disponibles de *${activeProgram}*. Si no hay horarios exactos, al menos debería responder con la información inicial disponible y ayudarte a avanzar con el siguiente paso.`,
    };
  }

  if (/si|sí|quiero|ok|dale|perfecto/.test(lower)) {
    nextState.fase = "accion";
    nextState.nextStep = "Ofrecer siguiente paso";
    reply = `Perfecto. Para *${activeProgram}*, puedo ayudarte con *costos*, *horarios* o con el *siguiente paso* de tu proceso en Instituto Windsor.`;
    return { reply, nextState };
  }

  reply = `Entendido. En esta simulación, el bot ya tiene contexto suficiente para seguir con información de *${activeProgram}*, responder *costos* o *horarios*, o llevarte al siguiente paso según el pipeline.`;
  nextState.nextStep = "Seguir conversación con información útil";
  return { reply, nextState };
};

export default function CRM() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("kanban");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCitaForm, setShowCitaForm] = useState(false);
  const [leadTimeline, setLeadTimeline] = useState([]);
  const [leadTimelineLoading, setLeadTimelineLoading] = useState(false);
  const [filterVendedor, setFilterVendedor] = useState("Todos");
  const [search, setSearch] = useState("");
  const [dragId, setDragId] = useState(null);
  const [toast, setToast] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [newLead, setNewLead] = useState({ nombre: "", email: "", whatsapp: "", curso: CURSOS[0], valor: "", notas: "", asignado_a: "" });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hola, soy tu asistente comercial de Instituto Windsor. Cuéntame sobre tus prospectos y te doy recomendaciones concretas para dar mejor seguimiento.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [citas, setCitas] = useState([]);
  const [nuevaCita, setNuevaCita] = useState({
    lead_id: "",
    fecha: "",
    hora: "",
    tipo: "asesoria",
    duracion: 30,
    notas: "",
  });
  const [documentos, setDocumentos] = useState([]);
  const [ragUploading, setRagUploading] = useState(false);
  const [ragTexto, setRagTexto] = useState("");
  const [ragTitulo, setRagTitulo] = useState("");
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [editingDoc, setEditingDoc] = useState(null);
  const [editTexto, setEditTexto] = useState("");
  const [whatsConvs, setWhatsConvs] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [convSearch, setConvSearch] = useState("");
  const [convModeFilter, setConvModeFilter] = useState("todos");
  const [convPhaseFilter, setConvPhaseFilter] = useState("todas");
  const [editTitulo, setEditTitulo] = useState("");
  const [flowRules, setFlowRules] = useState([]);
  const [flowLoading, setFlowLoading] = useState(false);
  const [flowSaving, setFlowSaving] = useState(false);
  const [flowId, setFlowId] = useState(null);
  const [botPrompt, setBotPrompt] = useState("");
  const [botLoading, setBotLoading] = useState(false);
  const [botSaving, setBotSaving] = useState(false);
  const [agentMessage, setAgentMessage] = useState("");
  const [sendingAgent, setSendingAgent] = useState(false);
  const [sendingInfoLeadId, setSendingInfoLeadId] = useState(null);
  const [leadInfoDraft, setLeadInfoDraft] = useState("");
  const [labScenario, setLabScenario] = useState("ads");
  const [labStarted, setLabStarted] = useState(false);
  const [labMessages, setLabMessages] = useState([]);
  const [labInput, setLabInput] = useState("");
  const [labSending, setLabSending] = useState(false);
  const [labWalkinData, setLabWalkinData] = useState({
    nombre: "",
    email: "",
    programa: CURSOS[0],
    whatsapp: "",
  });
  const [labState, setLabState] = useState({
    origen: "ads",
    nombre: "",
    email: "",
    programa: "",
    fase: "saludo",
    nextStep: "Pedir nombre",
  });

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logLeadActivity = async ({
    leadId,
    eventType,
    title,
    detail = "",
    meta = {},
  }) => {
    if (!leadId || !eventType || !title) return null;
    try {
      const res = await fetch("/api/leads/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: leadId,
          event_type: eventType,
          title,
          detail,
          meta,
        }),
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      return data?.activity || null;
    } catch {
      return null;
    }
  };

  const buildActivityTimelineItem = (activity) => {
    const toneMap = {
      stage_changed: "#E8A838",
      lead_assigned: "#8ac0ff",
      notes_updated: "#c58cff",
      appointment_created: "#ffb15c",
      appointment_status_changed: "#72d99a",
      agent_reply_sent: "#c58cff",
      lead_created: "#5fd18c",
    };

    return {
      id: activity.id,
      title: activity.title,
      detail: activity.detail,
      date: activity.created_at,
      tone: toneMap[activity.event_type] || "#777",
      source: "activity",
    };
  };

  const loadDocumentos = async () => {
    const { data } = await supabase.from("documentos").select("id, titulo, contenido, created_at").order("created_at", { ascending: false });
    setDocumentos(data || []);
  };

  const uploadTexto = async () => {
    if (!ragTexto.trim()) return;
    setRagUploading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min

      const res = await fetch("/api/rag/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ contenido: ragTexto, titulo: ragTitulo }),
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast((data?.error || "Error al indexar") + (data?.detail ? ": " + data.detail : " (HTTP " + res.status + ")"), "error");
        return;
      }

      if (data.ok) {
        showToast(`Indexado: ${data.chunks_indexed} fragmentos`);
        setRagTexto("");
        setRagTitulo("");
        loadDocumentos();
      } else {
        showToast(data.error || "Error al indexar", "error");
      }
    } catch (e) {
      const msg =
        e?.name === "AbortError"
          ? "Indexación tardó demasiado (timeout). Intenta con menos texto."
          : "Error de red indexando. Reintenta."
      showToast(msg, "error");
    } finally {
      setRagUploading(false);
    }
  };

  const deleteDocumento = async (id) => {
    await supabase.from("documentos").delete().eq("id", id);
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
    showToast("Documento eliminado");
  };

  const saveDocumento = async (id) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min

      const res = await fetch("/api/rag/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ contenido: editTexto, titulo: editTitulo }),
      });

      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data?.error || "Error al guardar (HTTP " + res.status + ")", "error");
        return;
      }

      if (data.ok) {
        await supabase.from("documentos").delete().eq("id", id);
        setEditingDoc(null);
        showToast("Documento actualizado");
        loadDocumentos();
      } else {
        showToast(data.error || "Error al guardar", "error");
      }
    } catch (e) {
      const msg =
        e?.name === "AbortError"
          ? "Guardado tardó demasiado (timeout). Intenta con menos texto."
          : "Error de red guardando. Reintenta."
      showToast(msg, "error");
    }
  };

  const isAdmin = currentProfile?.rol === "admin";

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (!selectedLead?.id) {
      setLeadTimeline([]);
      setLeadTimelineLoading(false);
      return;
    }

    let cancelled = false;

    const fetchLeadTimeline = async () => {
      setLeadTimelineLoading(true);
      try {
        const { data: activityRows } = await supabase
          .from("lead_activities")
          .select("id, event_type, title, detail, meta, created_at")
          .eq("lead_id", selectedLead.id)
          .order("created_at", { ascending: false })
          .limit(8);

        const persistedTimeline = (activityRows || []).map(buildActivityTimelineItem);
        const { data: conv } = await supabase
          .from("whatsapp_conversaciones")
          .select("id, fase, estado, ultimo_mensaje_at, modo_humano")
          .eq("lead_id", selectedLead.id)
          .order("ultimo_mensaje_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const timeline = [...persistedTimeline];

        if (conv) {
          timeline.push({
            id: `conv-${conv.id}`,
            title: `Conversacion en fase ${getPhaseLabel(conv.fase)}`,
            detail: `${conv.modo_humano ? "Tomada por humano" : "Atendida por bot"} · Estado ${conv.estado || "abierta"}`,
            date: conv.ultimo_mensaje_at,
            tone: conv.estado === "cerrada" ? "#72d99a" : "#E8A838",
          });

          const { data: messages } = await supabase
            .from("whatsapp_mensajes")
            .select("id, rol, contenido, created_at")
            .eq("conversacion_id", conv.id)
            .order("created_at", { ascending: false })
            .limit(4);

          (messages || []).forEach((message) => {
            timeline.push({
              id: message.id,
              title: message.rol === "usuario" ? "Mensaje del prospecto" : message.rol === "agente" ? "Respuesta del vendedor" : "Mensaje del bot",
              detail: message.contenido,
              date: message.created_at,
              tone: message.rol === "usuario" ? "#8ac0ff" : message.rol === "agente" ? "#c58cff" : "#5fd18c",
            });
          });
        }

        const leadCitas = citas
          .filter((cita) => cita.lead_id === selectedLead.id)
          .sort((a, b) => `${b.fecha} ${b.hora}`.localeCompare(`${a.fecha} ${a.hora}`))
          .slice(0, 3)
          .map((cita) => ({
            id: `cita-${cita.id}`,
            title: `Cita ${cita.status || "pendiente"}`,
            detail: `${cita.tipo === "clase_prueba" ? "Clase muestra" : cita.tipo === "asesoria" ? "Asesoría" : cita.tipo === "examen_ubicacion" ? "Examen de ubicación" : "Inscripción"} · ${cita.fecha} ${cita.hora?.slice(0, 5) || ""}`,
            date: `${cita.fecha}T${cita.hora || "00:00:00"}`,
            tone: "#ffb15c",
          }));

        if (!cancelled) {
          setLeadTimeline(
            [...timeline, ...leadCitas]
              .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
              .slice(0, 10)
          );
        }
      } finally {
        if (!cancelled) setLeadTimelineLoading(false);
      }
    };

    fetchLeadTimeline();

    return () => {
      cancelled = true;
    };
  }, [selectedLead?.id, citas]);

  useEffect(() => {
    if (!selectedLead?.id) {
      setLeadInfoDraft("");
      return;
    }
    setLeadInfoDraft(getInfoTemplateForLead(selectedLead));
  }, [selectedLead?.id, selectedLead?.curso]);

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUser(user);

    // Cargar o crear perfil
    let { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (!profile) {
      const { data: newProfile } = await supabase.from("profiles")
        .insert([{ id: user.id, email: user.email, nombre: user.email.split("@")[0], rol: "vendedor" }])
        .select().single();
      profile = newProfile;
    }
    setCurrentProfile(profile);

    // Cargar lista de vendedores (todos los perfiles)
    const { data: allProfiles } = await supabase.from("profiles").select("*");
    setVendedores(allProfiles || []);

    // Preseleccionar el usuario actual como asignado
    setNewLead(prev => ({ ...prev, asignado_a: user.id }));

    fetchLeads(user.id, profile?.rol === "admin");
    fetchCitas(user.id, profile?.rol === "admin");
  };

  const fetchLeads = async (userId, admin) => {
    setLoading(true);
    let query = supabase.from("leads").select("*").order("created_at", { ascending: false });
    // Vendedores solo ven sus leads asignados
    if (!admin) {
      query = query.eq("asignado_a", userId);
    }
    const { data, error } = await query;
    if (error) showToast("Error cargando leads", "error");
    else setLeads(data || []);
    setLoading(false);
  };

  const fetchCitas = async (userId, admin) => {
    let query = supabase
      .from("citas")
      .select("*, leads(nombre, email, whatsapp, curso, notas)")
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });

    if (!admin) {
      query = query.eq("vendedor_id", userId);
    }

    const { data, error } = await query;
    if (error) {
      showToast("Error cargando citas", "error");
    } else {
      setCitas(data || []);
    }
  };

  const fetchWhatsConvs = async () => {
    let { data, error } = await supabase
      .from("whatsapp_conversaciones")
      .select("id, whatsapp, lead_id, estado, ultimo_mensaje_at, modo_humano, tomado_por, fase")
      .order("ultimo_mensaje_at", { ascending: false });
    if (error) {
      const fallback = await supabase
        .from("whatsapp_conversaciones")
        .select("id, whatsapp, lead_id, estado, ultimo_mensaje_at")
        .order("ultimo_mensaje_at", { ascending: false });
      if (fallback.error) {
        showToast("Error cargando conversaciones de WhatsApp", "error");
        return;
      }
      data = fallback.data;
    }
    setWhatsConvs(data || []);
  };

  const fetchConvMessages = async (convId) => {
    setConvMessages([]);
    const { data, error } = await supabase
      .from("whatsapp_mensajes")
      .select("id, rol, contenido, created_at")
      .eq("conversacion_id", convId)
      .order("created_at", { ascending: true });
    if (error) {
      showToast("Error cargando mensajes de WhatsApp", "error");
    } else {
      setConvMessages(data || []);
    }
  };

  const loadWhatsappFlow = async () => {
    setFlowLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_flows")
        .select("id, config")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        showToast("Error cargando flow de WhatsApp", "error");
        return;
      }

      setFlowId(data?.id || null);
      const cfg = data?.config && typeof data.config === "object" ? data.config : { rules: [] };
      const rules = Array.isArray(cfg.rules) ? cfg.rules : [];
      if (rules.length) {
        setFlowRules(
          rules.map((r) => ({
            match: r.match || "",
            type: r.use_rag || r.type === "rag" ? "rag" : "fixed",
            answer: r.answer || r.response || "",
          }))
        );
      } else {
        setFlowRules([
          {
            match: "hola",
            type: "fixed",
            answer:
              "¡Hola! 👋 Soy el asistente de Instituto Windsor. ¿Te interesa conocer nuestros programas educativos? Responde SÍ para más información.",
          },
          {
            match: "precio",
            type: "rag",
            answer: "",
          },
        ]);
      }
    } catch {
      showToast("Error cargando flow de WhatsApp", "error");
    } finally {
      setFlowLoading(false);
    }
  };

  const loadBotConfig = async () => {
    if (!isAdmin) return;
    setBotLoading(true);
    try {
      const { data, error } = await supabase
        .from("whatsapp_flows")
        .select("id, config")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        showToast("Error cargando configuración del bot", "error");
        return;
      }

      setFlowId(data?.id || null);
      const cfg = data?.config && typeof data.config === "object" ? data.config : {};
      setBotPrompt(typeof cfg.bot_prompt === "string" ? cfg.bot_prompt : "");
    } catch {
      showToast("Error cargando configuración del bot", "error");
    } finally {
      setBotLoading(false);
    }
  };

  const saveWhatsappFlow = async () => {
    if (!isAdmin) return;

    const cleanedRules = flowRules
      .map((r) => ({
        match: (r.match || "").trim().toLowerCase(),
        type: r.type === "rag" ? "rag" : "fixed",
        answer: (r.answer || "").trim(),
      }))
      .filter((r) => r.match);

    if (!cleanedRules.length) {
      showToast("Agrega al menos una regla con palabra clave", "error");
      return;
    }

    const config = {
      rules: cleanedRules.map((r) => ({
        match: r.match,
        answer: r.type === "fixed" ? r.answer : undefined,
        use_rag: r.type === "rag",
      })),
    };

    setFlowSaving(true);
    try {
      if (flowId) {
        const { error } = await supabase
          .from("whatsapp_flows")
          .update({ config })
          .eq("id", flowId);

        if (error) {
          showToast("Error guardando flow de WhatsApp", "error");
        } else {
          showToast("Flow de WhatsApp guardado");
        }
      } else {
        const { data, error } = await supabase
          .from("whatsapp_flows")
          .insert([
            {
              nombre: "Flow principal WhatsApp",
              descripcion: "Reglas básicas para el bot de WhatsApp",
              activo: true,
              config,
            },
          ])
          .select("id")
          .single();

        if (error) {
          showToast("Error guardando flow de WhatsApp", "error");
        } else {
          setFlowId(data?.id || null);
          showToast("Flow de WhatsApp guardado");
        }
      }
    } catch {
      showToast("Error guardando flow de WhatsApp", "error");
    } finally {
      setFlowSaving(false);
    }
  };

  const saveBotConfig = async () => {
    if (!isAdmin) return;

    const prompt = (botPrompt || "").trim();
    if (!prompt) {
      showToast("Escribe la identidad y comportamiento del bot antes de guardar", "error");
      return;
    }

    setBotSaving(true);
    try {
      const { data: activeFlow, error: loadError } = await supabase
        .from("whatsapp_flows")
        .select("id, config")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (loadError) {
        showToast("Error cargando la configuración actual del bot", "error");
        return;
      }

      const currentConfig =
        activeFlow?.config && typeof activeFlow.config === "object"
          ? activeFlow.config
          : {};

      const nextConfig = {
        ...currentConfig,
        bot_prompt: prompt,
      };

      if (activeFlow?.id) {
        const { error } = await supabase
          .from("whatsapp_flows")
          .update({ config: nextConfig })
          .eq("id", activeFlow.id);

        if (error) {
          showToast("Error guardando la configuración del bot", "error");
          return;
        }

        setFlowId(activeFlow.id);
      } else {
        const { data, error } = await supabase
          .from("whatsapp_flows")
          .insert([
            {
              nombre: "Flow principal WhatsApp",
              descripcion: "Configuración principal del bot de WhatsApp",
              activo: true,
              config: {
                rules: [],
                bot_prompt: prompt,
              },
            },
          ])
          .select("id")
          .single();

        if (error) {
          showToast("Error guardando la configuración del bot", "error");
          return;
        }

        setFlowId(data?.id || null);
      }

      showToast("Configuración del bot guardada");
    } catch {
      showToast("Error guardando la configuración del bot", "error");
    } finally {
      setBotSaving(false);
    }
  };

  const setHumanMode = async (conv, enabled) => {
    if (!conv) return;
    const { error } = await supabase
      .from("whatsapp_conversaciones")
      .update({
        modo_humano: enabled,
        tomado_por: enabled ? currentUser?.id || null : null,
      })
      .eq("id", conv.id);
    if (error) {
      showToast(error.message || "Error cambiando modo de conversación. ¿Ejecutaste el SQL de RLS en Supabase?", "error");
      return;
    }
    setSelectedConv((prev) => (prev && prev.id === conv.id ? { ...prev, modo_humano: enabled, tomado_por: enabled ? currentUser?.id || null : null } : prev));
    setWhatsConvs((prev) =>
      prev.map((c) =>
        c.id === conv.id ? { ...c, modo_humano: enabled, tomado_por: enabled ? currentUser?.id || null : null } : c
      )
    );
    showToast(enabled ? "Ahora la conversación está en modo HUMANO" : "La conversación volvió al BOT");
  };

  /** Si estamos en una conv en modo humano y el usuario va a salir, pide confirmar. Aceptar = pasar a BOT y ejecutar callback; Cancelar = no hacer nada. */
  const confirmReturnToBotIfNeeded = async (thenDo) => {
    if (view !== "convs" || !selectedConv?.modo_humano) {
      thenDo();
      return;
    }
    const ok = window.confirm("Al salir, la conversación pasará a modo BOT y el bot volverá a responder. ¿Aceptar o Cancelar?");
    if (!ok) return;
    await setHumanMode(selectedConv, false);
    thenDo();
  };

  const sendAgentReply = async () => {
    if (!selectedConv || !agentMessage.trim()) return;
    setSendingAgent(true);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: selectedConv.whatsapp, body: agentMessage }),
      });
      if (!res.ok) {
        let errMsg = "Error enviando mensaje de WhatsApp";
        try {
          const data = await res.json();
          if (data?.detail) errMsg = data.detail;
          else if (data?.error) errMsg = data.error;
        } catch {}
        showToast(errMsg, "error");
        return;
      }

      const now = new Date().toISOString();
      const msgToShow = { id: `local-${now}`, rol: "agente", contenido: agentMessage, created_at: now };

      // Siempre mostrar el mensaje en el chat cuando Twilio acepta el envío
      setConvMessages((prev) => [...prev, msgToShow]);
      setSelectedConv((prev) =>
        prev ? { ...prev, ultimo_mensaje_at: now, modo_humano: true, tomado_por: currentUser?.id || null } : prev
      );
      setWhatsConvs((prev) =>
        prev.map((c) =>
          c.id === selectedConv.id
            ? { ...c, ultimo_mensaje_at: now, modo_humano: true, tomado_por: currentUser?.id || null }
            : c
        )
      );
      setAgentMessage("");
      showToast("Mensaje enviado. Si no llega a WhatsApp, el número debe haber iniciado chat con el bot (sandbox).");

      // Guardar en historial (no bloquea la UI)
      const { error } = await supabase.from("whatsapp_mensajes").insert([
        {
          conversacion_id: selectedConv.id,
          rol: "agente",
          contenido: agentMessage,
        },
      ]);
      if (error) {
        showToast("No se pudo guardar en el historial", "error");
      } else {
        await supabase
          .from("whatsapp_conversaciones")
          .update({ ultimo_mensaje_at: now, modo_humano: true, tomado_por: currentUser?.id || null })
          .eq("id", selectedConv.id);
        await logLeadActivity({
          leadId: selectedConv.lead_id,
          eventType: "agent_reply_sent",
          title: "Respuesta enviada por vendedor",
          detail: agentMessage,
          meta: { conversacion_id: selectedConv.id, whatsapp: selectedConv.whatsapp },
        });
      }
    } catch (e) {
      showToast(e?.message || "Error enviando mensaje de WhatsApp", "error");
    } finally {
      setSendingAgent(false);
    }
  };

  const sendLeadInformation = async (lead) => {
    if (!lead?.id || !lead?.whatsapp) {
      showToast("Este lead no tiene un WhatsApp registrado", "error");
      return;
    }

    const existingConversation = whatsConvs.find(
      (conv) => conv.lead_id === lead.id || conv.whatsapp === lead.whatsapp
    );

    if (!existingConversation) {
      showToast("Este lead aún no ha iniciado chat. Para un primer mensaje por WhatsApp necesitas una template aprobada.", "error");
      return;
    }

    const message = (leadInfoDraft || "").trim();
    if (!message) {
      showToast("Escribe el mensaje que deseas enviar", "error");
      return;
    }

    setSendingInfoLeadId(lead.id);
    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lead.whatsapp,
          body: message,
          leadId: lead.id,
          agentUserId: currentUser?.id || null,
          fase: "seguimiento",
        }),
      });

      if (!res.ok) {
        let errMsg = "Error enviando información por WhatsApp";
        try {
          const data = await res.json();
          if (data?.detail) errMsg = data.detail;
          else if (data?.error) errMsg = data.error;
        } catch {}
        showToast(errMsg, "error");
        return;
      }

      const responseData = await res.json().catch(() => ({}));

      await logLeadActivity({
        leadId: lead.id,
        eventType: "agent_reply_sent",
        title: "Información enviada por WhatsApp",
        detail: message,
        meta: { whatsapp: lead.whatsapp, source: "lead_detail", provider_status: responseData?.status || null },
      });

      const now = new Date().toISOString();
      setWhatsConvs((prev) => {
        const existing = prev.find((conv) => conv.lead_id === lead.id || conv.whatsapp === lead.whatsapp);
        if (!existing) return prev;
        return prev.map((conv) =>
          conv.id === existing.id
            ? {
                ...conv,
                lead_id: lead.id,
                ultimo_mensaje_at: now,
                modo_humano: true,
                tomado_por: currentUser?.id || null,
                fase: "seguimiento",
                estado: "abierta",
              }
            : conv
        );
      });

      showToast("Mensaje aceptado por WhatsApp. Si no llega, revisa la ventana activa de 24 horas o usa template.");
    } catch (e) {
      showToast(e?.message || "Error enviando información por WhatsApp", "error");
    } finally {
      setSendingInfoLeadId(null);
    }
  };

  const filteredLeads = leads.filter(l => {
    const matchV = filterVendedor === "Todos" || l.asignado_a === filterVendedor;
    const matchS = l.nombre.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return matchV && matchS;
  });

  const conversationPhaseOptions = ["todas", ...Array.from(new Set(whatsConvs.map((c) => c.fase).filter(Boolean)))];
  const filteredWhatsConvs = whatsConvs.filter((conv) => {
    const searchValue = convSearch.trim().toLowerCase();
    const matchesSearch =
      !searchValue ||
      conv.whatsapp?.toLowerCase().includes(searchValue) ||
      leads.find((lead) => lead.id === conv.lead_id)?.nombre?.toLowerCase().includes(searchValue) ||
      leads.find((lead) => lead.id === conv.lead_id)?.email?.toLowerCase().includes(searchValue);
    const matchesMode =
      convModeFilter === "todos" ||
      (convModeFilter === "humano" ? !!conv.modo_humano : !conv.modo_humano);
    const matchesPhase =
      convPhaseFilter === "todas" || (conv.fase || "—") === convPhaseFilter;
    return matchesSearch && matchesMode && matchesPhase;
  });

  const selectedConvLead = leads.find((lead) => lead.id === selectedConv?.lead_id) || null;
  const selectedConvOwner = vendedores.find((v) => v.id === selectedConv?.tomado_por) || null;
  const selectedLeadAssigned = vendedores.find((v) => v.id === selectedConvLead?.asignado_a) || null;

  const getPhaseLabel = (fase) => {
    const labels = {
      saludo: "Saludo",
      programa: "Programa",
      correo: "Correo",
      info_enviada: "Info enviada",
      dudas: "Dudas",
      accion: "Acción",
      seguimiento: "Seguimiento",
      cerrado: "Cerrado",
      perdido: "Perdido",
    };
    return labels[fase] || fase || "Sin fase";
  };

  const getModeLabel = (conv) => conv?.modo_humano ? "Humano" : "Bot";

  const getConversationBadgeStyle = (type, value) => {
    if (type === "mode") {
      return value
        ? { background: "#E8A83822", color: "#E8A838", border: "1px solid #E8A83844" }
        : { background: "#1f2c1f", color: "#7ddc8b", border: "1px solid #2d5a35" };
    }

    if (type === "phase") {
      const palette = {
        saludo: ["#1f2836", "#7db4ff", "#2f4d75"],
        programa: ["#2f2412", "#E8A838", "#654b16"],
        correo: ["#1d2530", "#8ac0ff", "#2f4d75"],
        info_enviada: ["#1a3024", "#5fd18c", "#25553b"],
        dudas: ["#2e1f35", "#c58cff", "#5f3370"],
        accion: ["#302318", "#ffb15c", "#6e4520"],
        seguimiento: ["#2a2620", "#f4d35e", "#6b5b1c"],
        cerrado: ["#16281f", "#72d99a", "#24593d"],
        perdido: ["#2c1d1d", "#ff8b8b", "#6d3434"],
      };
      const [bg, color, border] = palette[value] || ["#1a1a1a", "#aaa", "#333"];
      return { background: bg, color, border: `1px solid ${border}` };
    }

    return { background: "#1a1a1a", color: "#aaa", border: "1px solid #333" };
  };

  const getLeadNextStep = (lead) => {
    const currentStage = normalizeStage(lead?.stage);
    const relatedConv = whatsConvs.find((conv) => conv.lead_id === lead?.id);
    const upcomingCita = citas
      .filter((cita) => cita.lead_id === lead?.id)
      .sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0];

    if (upcomingCita) {
      return `Confirmar ${upcomingCita.tipo === "clase_prueba" ? "clase muestra" : upcomingCita.tipo === "asesoria" ? "asesoría" : upcomingCita.tipo === "examen_ubicacion" ? "examen de ubicación" : "proceso de inscripción"} del ${upcomingCita.fecha} a las ${upcomingCita.hora?.slice(0, 5) || "hora pendiente"}.`;
    }
    if (relatedConv?.fase === "dudas") return "Responder dudas y llevar al prospecto al siguiente paso.";
    if (relatedConv?.fase === "accion" || relatedConv?.fase === "seguimiento") return "Cerrar con CTA claro: asesoría, examen de ubicación o inscripción.";
    if (currentStage === "primer_contacto") return "Hacer primer contacto y confirmar interés real.";
    if (currentStage === "examen_ubicacion") return "Invitar o confirmar examen de ubicación.";
    if (currentStage === "clase_muestra") return "Agendar o confirmar clase muestra.";
    if (currentStage === "segundo_contacto") return "Dar segundo seguimiento y resolver dudas pendientes.";
    if (currentStage === "promocion_enviada") return "Confirmar recepción de la promoción y medir interés.";
    if (currentStage === "tercer_contacto") return "Hacer último seguimiento comercial antes de archivar.";
    if (currentStage === "inscripcion_pendiente") return "Cerrar inscripción y acompañar el proceso administrativo.";
    if (currentStage === "inscrito") return "Mantener seguimiento post-inscripción.";
    if (currentStage === "perdido") return "Revisar si conviene reactivar más adelante.";
    if (currentStage === "archivado") return "Lead archivado; reactivar solo si vuelve a mostrar interés.";
    return "Actualizar siguiente paso comercial.";
  };

  const getCitaStatusStyle = (status) => {
    const map = {
      pendiente: { background: "#2a2620", color: "#f4d35e", border: "1px solid #6b5b1c" },
      confirmada: { background: "#1a3024", color: "#72d99a", border: "1px solid #24593d" },
      completada: { background: "#1f2836", color: "#8ac0ff", border: "1px solid #2f4d75" },
      cancelada: { background: "#2c1d1d", color: "#ff8b8b", border: "1px solid #6d3434" },
    };
    return map[status] || { background: "#1a1a1a", color: "#aaa", border: "1px solid #333" };
  };

  const getConversationPhaseForStage = (stage) => {
    const map = {
      primer_contacto: "saludo",
      examen_ubicacion: "accion",
      clase_muestra: "accion",
      segundo_contacto: "seguimiento",
      promocion_enviada: "seguimiento",
      tercer_contacto: "seguimiento",
      inscripcion_pendiente: "accion",
      inscrito: "cerrado",
      perdido: "perdido",
      archivado: "seguimiento",
    };
    return map[normalizeStage(stage)] || null;
  };

  const byStage = (stageId) => filteredLeads.filter((l) => normalizeStage(l.stage) === stageId);

  const moveStage = async (leadId, newStage) => {
    const lead = leads.find((item) => item.id === leadId);
    const previousStage = normalizeStage(lead?.stage);
    const { error } = await supabase.from("leads").update({ stage: newStage }).eq("id", leadId);
    if (error) return showToast("Error actualizando", "error");

    const nextFase = getConversationPhaseForStage(newStage);
    if (nextFase) {
      const nextEstado = ["cerrado", "perdido"].includes(nextFase) ? "cerrada" : "abierta";
      await supabase
        .from("whatsapp_conversaciones")
        .update({ fase: nextFase, estado: nextEstado })
        .eq("lead_id", leadId);

      setWhatsConvs((prev) =>
        prev.map((conv) =>
          conv.lead_id === leadId ? { ...conv, fase: nextFase, estado: nextEstado } : conv
        )
      );

      setSelectedConv((prev) =>
        prev && prev.lead_id === leadId ? { ...prev, fase: nextFase, estado: nextEstado } : prev
      );
    }

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage } : l));
    await logLeadActivity({
      leadId,
      eventType: "stage_changed",
      title: "Etapa actualizada",
      detail: `${STAGES.find((s) => s.id === previousStage)?.label || previousStage || "Sin etapa"} -> ${STAGES.find((s) => s.id === newStage)?.label || newStage}`,
      meta: { from: previousStage || null, to: newStage },
    });
    showToast("Lead movido a " + STAGES.find(s => s.id === newStage)?.label);
  };

  const handleDrop = (stageId) => {
    if (dragId) { moveStage(dragId, stageId); setDragId(null); }
  };

  const addLead = async () => {
    if (!newLead.nombre || !newLead.email) return showToast("Nombre y email son requeridos", "error");
    const lead = {
      ...newLead,
      stage: "primer_contacto",
      fecha: new Date().toISOString().slice(0, 10),
      valor: Number(newLead.valor) || 0,
      user_id: currentUser.id,
      asignado_a: newLead.asignado_a || currentUser.id,
    };
    const { data, error } = await supabase.from("leads").insert([lead]).select();
    if (error) return showToast("Error agregando lead", "error");
    setLeads(prev => [data[0], ...prev]);
    await logLeadActivity({
      leadId: data[0].id,
      eventType: "lead_created",
      title: "Lead creado manualmente",
      detail: `${data[0].nombre} · ${data[0].curso}`,
      meta: { source: "crm_manual" },
    });
    setShowForm(false);
    setNewLead({ nombre: "", email: "", whatsapp: "", curso: CURSOS[0], valor: "", notas: "", asignado_a: currentUser.id });
    showToast("Lead agregado ✓");
  };

  const deleteLead = async (id) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) return showToast("Error eliminando", "error");
    setLeads(prev => prev.filter(l => l.id !== id));
    setSelectedLead(null);
    showToast("Lead eliminado");
  };

  const updateNotas = async (id, notas) => {
    await supabase.from("leads").update({ notas }).eq("id", id);
    setLeads(prev => prev.map(l => l.id === id ? { ...l, notas } : l));
  };

  const reasignarLead = async (leadId, nuevoAsignadoId) => {
    const { error } = await supabase.from("leads").update({ asignado_a: nuevoAsignadoId }).eq("id", leadId);
    if (error) return showToast("Error reasignando", "error");
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, asignado_a: nuevoAsignadoId } : l));
    setSelectedLead(prev => ({ ...prev, asignado_a: nuevoAsignadoId }));
    const nombre = vendedores.find(v => v.id === nuevoAsignadoId)?.nombre || "vendedor";
    await logLeadActivity({
      leadId,
      eventType: "lead_assigned",
      title: "Lead reasignado",
      detail: `Asignado a ${nombre}`,
      meta: { asignado_a: nuevoAsignadoId || null },
    });
    showToast(`Lead reasignado a ${nombre} ✓`);
  };

  const getNombreVendedor = (id) => vendedores.find(v => v.id === id)?.nombre || vendedores.find(v => v.id === id)?.email?.split("@")[0] || "—";

  const totalRevenue = leads.filter((l) => normalizeStage(l.stage) === "inscrito").reduce((a, b) => a + b.valor, 0);
  const pipelineValue = leads.filter((l) => !["inscrito", "perdido", "archivado"].includes(normalizeStage(l.stage))).reduce((a, b) => a + b.valor, 0);
  const convRate = leads.length ? Math.round((leads.filter((l) => normalizeStage(l.stage) === "inscrito").length / leads.length) * 100) : 0;

  const openWA = (lead) => {
    const template = WA_TEMPLATES[normalizeStage(lead.stage)] || WA_TEMPLATES["primer_contacto"];
    const msg = encodeURIComponent(template(lead.nombre.split(" ")[0], lead.curso));
    const num = lead.whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/${num}?text=${msg}`, "_blank");
  };

  const guardarCita = async () => {
    if (!nuevaCita.lead_id || !nuevaCita.fecha || !nuevaCita.hora) {
      return showToast("Lead, fecha y hora son obligatorios", "error");
    }

    const citaDateTime = new Date(`${nuevaCita.fecha}T${nuevaCita.hora}`);
    if (Number.isNaN(citaDateTime.getTime())) {
      return showToast("La fecha u hora de la cita no es válida", "error");
    }
    if (citaDateTime.getTime() < Date.now() - 60 * 1000) {
      return showToast("No puedes agendar una cita en el pasado", "error");
    }

    const lead = leads.find((l) => l.id === nuevaCita.lead_id);
    if (!lead || !currentUser) {
      return showToast("Lead o usuario no válido", "error");
    }

    const titulo = `${nuevaCita.tipo === "clase_prueba" ? "Clase muestra" : nuevaCita.tipo === "asesoria" ? "Asesoría" : nuevaCita.tipo === "examen_ubicacion" ? "Examen de ubicación" : "Inscripción"} con ${lead.nombre}`;

    const { data, error } = await supabase
      .from("citas")
      .insert([
        {
          lead_id: nuevaCita.lead_id,
          vendedor_id: currentUser.id,
          titulo,
          fecha: nuevaCita.fecha,
          hora: nuevaCita.hora,
          duracion: nuevaCita.duracion,
          tipo: nuevaCita.tipo,
          notas: nuevaCita.notas,
          status: "pendiente",
        },
      ])
      .select();

    if (error) {
      showToast("Error guardando la cita", "error");
      return;
    }

    const stageForTipo = {
      clase_prueba: "clase_muestra",
      examen_ubicacion: "examen_ubicacion",
      inscripcion: "inscripcion_pendiente",
      asesoria: "segundo_contacto",
    };
    const newStage = stageForTipo[nuevaCita.tipo] || "segundo_contacto";

    await supabase.from("leads").update({ stage: newStage }).eq("id", lead.id);
    setCitas((prev) => [...prev, data[0]]);
    setLeads((prev) => prev.map((item) => item.id === lead.id ? { ...item, stage: newStage } : item));
    setSelectedLead((prev) => prev && prev.id === lead.id ? { ...prev, stage: newStage } : prev);
    await logLeadActivity({
      leadId: lead.id,
      eventType: "appointment_created",
      title: "Cita agendada",
      detail: `${titulo} · ${nuevaCita.fecha} ${nuevaCita.hora}`,
      meta: { cita_id: data[0].id, status: "pendiente", tipo: nuevaCita.tipo },
    });
    await logLeadActivity({
      leadId: lead.id,
      eventType: "stage_changed",
      title: "Etapa actualizada",
      detail: `${STAGES.find((s) => s.id === normalizeStage(lead.stage))?.label || normalizeStage(lead.stage)} -> ${STAGES.find((s) => s.id === newStage)?.label || newStage}`,
      meta: { from: normalizeStage(lead.stage), to: newStage, reason: "appointment_created" },
    });
    setShowCitaForm(false);
    setNuevaCita({
      lead_id: "",
      fecha: "",
      hora: "",
      tipo: "asesoria",
      duracion: 30,
      notas: "",
    });
    showToast("Cita agendada ✓");
  };

  const updateCitaStatus = async (citaId, status) => {
    const { error } = await supabase.from("citas").update({ status }).eq("id", citaId);
    if (error) {
      showToast("Error actualizando estado de cita", "error");
      return;
    }
    const cita = citas.find((item) => item.id === citaId);
    setCitas((prev) => prev.map((cita) => cita.id === citaId ? { ...cita, status } : cita));
    if (cita?.lead_id) {
      await logLeadActivity({
        leadId: cita.lead_id,
        eventType: "appointment_status_changed",
        title: "Estado de cita actualizado",
        detail: `La cita ${cita.titulo || citaId} ahora esta ${status}`,
        meta: { cita_id: citaId, status },
      });
    }
    showToast(`Cita marcada como ${status}`);
  };

  const leadsForAI = leads.map((l) => {
    const vendedor = vendedores.find((v) => v.id === l.asignado_a);
    const asignadoNombre =
      vendedor?.nombre || vendedor?.email?.split("@")[0] || null;

    return {
      id: l.id,
      nombre: l.nombre,
      email: l.email,
      curso: l.curso,
      stage: l.stage,
      valor: l.valor,
      asignado_id: l.asignado_a || null,
      asignado_nombre: asignadoNombre,
      fecha: l.fecha,
    };
  });

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const newMessages = [
      ...chatMessages,
      { role: "user", content: chatInput.trim() },
    ];
    setChatMessages(newMessages);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, leads: leadsForAI }),
      });

      if (!res.ok) {
        showToast("Error hablando con el asistente de ventas", "error");
        setChatLoading(false);
        return;
      }

      const data = await res.json();
      const reply = data?.reply?.content || "No pude generar una respuesta.";

      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      showToast("Error de red con el asistente", "error");
    } finally {
      setChatLoading(false);
    }
  };

  const startLabSimulation = () => {
    const initialState =
      labScenario === "walkin"
        ? {
            origen: "walkin",
            nombre: labWalkinData.nombre,
            email: labWalkinData.email,
            programa: labWalkinData.programa,
            fase: "saludo",
            nextStep: "Retomar el interés ya capturado",
          }
        : {
            origen: "ads",
            nombre: "",
            email: "",
            programa: "",
            fase: "saludo",
            nextStep: "Pedir nombre",
          };

    const openingMessage =
      labScenario === "walkin"
        ? `Hola ${labWalkinData.nombre || ""}, soy el asistente de admisiones de Instituto Windsor. Ya tengo registrado tu interés en *${labWalkinData.programa || "el programa"}*. Con gusto puedo ayudarte con el siguiente paso o resolver tus dudas por este medio.`
        : "Hola, gracias por comunicarte con Instituto Windsor. ¿Me compartes tu nombre, por favor?";

    setLabState(initialState);
    setLabMessages([{ role: "assistant", content: openingMessage }]);
    setLabInput("");
    setLabStarted(true);
  };

  const sendLabMessage = async () => {
    if (!labInput.trim() || labSending) return;
    const userMessage = labInput.trim();
    setLabSending(true);
    const result = buildLabBotReply({
      scenario: labScenario,
      state: labState,
      message: userMessage,
    });

    const nextMessages = [...labMessages, { role: "user", content: userMessage }];
    setLabMessages(nextMessages);
    setLabState(result.nextState);
    setLabInput("");

    let finalReply = result.reply;

    if (result.queryPrompt) {
      try {
        const res = await fetch("/api/rag/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: result.queryPrompt }),
        });

        const data = await res.json().catch(() => ({}));
        const answer = data?.answer || "";
        const activeProgram = result.nextState.programa || labState.programa || "tu programa";
        const cta = `\n\n${getLabProgramCTA(activeProgram)}`;

        if (
          res.ok &&
          answer &&
          !/^No encontr[eé] informaci[oó]n relevante\.?$/i.test(answer.trim()) &&
          labProgramMatchesAnswer(activeProgram, answer)
        ) {
          finalReply = `Claro. Esto es lo que encontré sobre *${activeProgram}*:\n\n${formatLabKnowledgeAnswer(answer)}${cta}`;
        } else if (res.ok && answer && !labProgramMatchesAnswer(activeProgram, answer)) {
          finalReply = getLabNoSpecificInfoReply(activeProgram);
        } else if (result.fallbackReply) {
          finalReply = result.fallbackReply;
        }
      } catch {
        if (result.fallbackReply) {
          finalReply = result.fallbackReply;
        }
      }
    }

    setLabMessages([...nextMessages, { role: "assistant", content: finalReply }]);
    setLabSending(false);
  };

  const resetLabSimulation = () => {
    setLabStarted(false);
    setLabMessages([]);
    setLabInput("");
    setLabSending(false);
    setLabState({
      origen: labScenario,
      nombre: "",
      email: "",
      programa: "",
      fase: "saludo",
      nextStep: labScenario === "walkin" ? "Cargar contexto inicial" : "Pedir nombre",
    });
  };

  return (
    <div style={{ fontFamily: "'DM Mono', 'Courier New', monospace", background: "#0e0e0e", minHeight: "100vh", color: "#e0e0e0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Bebas+Neue&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #1a1a1a; }
        ::-webkit-scrollbar-thumb { background: #E8A838; border-radius: 2px; }
        .card { background: #161616; border: 1px solid #2a2a2a; border-radius: 8px; transition: all 0.2s; cursor: grab; }
        .card:hover { border-color: #E8A838; transform: translateY(-2px); box-shadow: 0 4px 20px rgba(232,168,56,0.15); }
        .card:active { cursor: grabbing; }
        .btn { border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 500; transition: all 0.15s; }
        .btn-primary { background: #E8A838; color: #0e0e0e; padding: 8px 16px; }
        .btn-primary:hover { background: #f5b840; }
        .btn-ghost { background: transparent; color: #888; padding: 6px 12px; border: 1px solid #333; }
        .btn-ghost:hover { border-color: #E8A838; color: #E8A838; }
        .btn-wa { background: #25D366; color: white; padding: 5px 10px; }
        .btn-wa:hover { background: #20b858; }
        .input { background: #1e1e1e; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-family: inherit; font-size: 13px; padding: 8px 12px; width: 100%; outline: none; transition: border 0.2s; }
        .input:focus { border-color: #E8A838; }
        .select { appearance: none; background: #1e1e1e; border: 1px solid #333; border-radius: 6px; color: #e0e0e0; font-family: inherit; font-size: 13px; padding: 8px 12px; width: 100%; outline: none; cursor: pointer; }
        .select:focus { border-color: #E8A838; }
        .tag { display: inline-block; border-radius: 4px; font-size: 10px; font-weight: 500; padding: 2px 7px; letter-spacing: 0.5px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal { background: #161616; border: 1px solid #333; border-radius: 12px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; }
        .toast { position: fixed; bottom: 24px; right: 24px; z-index: 999; padding: 12px 20px; border-radius: 8px; font-size: 13px; animation: slideUp 0.3s ease; }
        @keyframes slideUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        .col-drop { min-height: 80px; border-radius: 6px; transition: background 0.2s; }
        .col-drop.drag-over { background: rgba(232,168,56,0.05); border: 1px dashed #E8A838; }
        .stat-card { background: #161616; border: 1px solid #2a2a2a; border-radius: 10px; padding: 20px; }
        .nav-btn { background: transparent; border: none; cursor: pointer; font-family: inherit; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; padding: 8px 16px; border-radius: 6px; transition: all 0.15s; }
        .nav-btn.active { background: #E8A838; color: #0e0e0e; font-weight: 500; }
        .nav-btn:not(.active) { color: #666; }
        .nav-btn:not(.active):hover { color: #E8A838; }
        textarea { resize: vertical; min-height: 60px; }
        .loading { display: flex; align-items: center; justify-content: center; height: 200px; font-size: 14px; color: #555; }
        .admin-badge { background: #E8A83822; color: #E8A838; border: 1px solid #E8A83844; border-radius: 4px; font-size: 10px; padding: 2px 8px; letter-spacing: 1px; }
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e1e1e", padding: "0 24px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 3, color: "#E8A838" }}>WINDSOR CRM</span>
            <span style={{ fontSize: 11, color: "#555", letterSpacing: 2 }}>CRM v1.0</span>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className={`nav-btn ${view === "kanban" ? "active" : ""}`} onClick={() => confirmReturnToBotIfNeeded(() => setView("kanban"))}>KANBAN</button>
            <button className={`nav-btn ${view === "lista" ? "active" : ""}`} onClick={() => confirmReturnToBotIfNeeded(() => setView("lista"))}>LISTA</button>
            <button className={`nav-btn ${view === "agenda" ? "active" : ""}`} onClick={() => confirmReturnToBotIfNeeded(() => setView("agenda"))}>AGENDA</button>
            <button
              className={`nav-btn ${view === "convs" ? "active" : ""}`}
              onClick={() => confirmReturnToBotIfNeeded(() => {
                setView("convs");
                fetchWhatsConvs();
                setSelectedConv(null);
                setConvMessages([]);
              })}
            >
              CONVERSACIONES
            </button>
            {isAdmin && (
              <>
                <button
                  className={`nav-btn ${view === "base" ? "active" : ""}`}
                  onClick={() => confirmReturnToBotIfNeeded(() => { setView("base"); loadDocumentos(); })}
                >
                  BASE
                </button>
                <button
                  className={`nav-btn ${view === "bot" ? "active" : ""}`}
                  onClick={() => confirmReturnToBotIfNeeded(() => { setView("bot"); loadBotConfig(); })}
                >
                  BOT
                </button>
                <button
                  className={`nav-btn ${view === "lab" ? "active" : ""}`}
                  onClick={() => confirmReturnToBotIfNeeded(() => { setView("lab"); resetLabSimulation(); })}
                >
                  LAB BOT
                </button>
                <button
                  className={`nav-btn ${view === "flows" ? "active" : ""}`}
                  onClick={() => confirmReturnToBotIfNeeded(() => { setView("flows"); loadWhatsappFlow(); })}
                >
                  FLOWS
                </button>
              </>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, color: "#555" }}>{currentProfile?.email || currentUser?.email}</span>
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ NUEVO LEAD</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px" }}>
        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
          {[
            { label: "PIPELINE TOTAL", value: formatPeso(pipelineValue), sub: `${filteredLeads.filter((l) => !["inscrito","perdido","archivado"].includes(normalizeStage(l.stage))).length} leads activos`, color: "#4A90D9" },
            { label: "INSCRITOS", value: formatPeso(totalRevenue), sub: `${leads.filter((l) => normalizeStage(l.stage) === "inscrito").length} cierres`, color: "#27AE60" },
            { label: "TASA DE CIERRE", value: `${convRate}%`, sub: `de ${leads.length} leads totales`, color: "#E8A838" },
            { label: "LEADS HOY", value: leads.filter(l => l.fecha === new Date().toISOString().slice(0,10)).length, sub: "nuevos ingresos", color: "#E85D38" },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "center" }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="🔍  Buscar lead..." value={search} onChange={e => setSearch(e.target.value)} />
          {isAdmin && (
            <select className="select" style={{ maxWidth: 200 }} value={filterVendedor} onChange={e => setFilterVendedor(e.target.value)}>
              <option value="Todos">Todos los vendedores</option>
              {vendedores.map(v => <option key={v.id} value={v.id}>{v.nombre || v.email}</option>)}
            </select>
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>{filteredLeads.length} leads mostrados</div>
        </div>

        {loading && <div className="loading">Cargando leads...</div>}

        {/* KANBAN */}
        {!loading && view === "kanban" && (
          <KanbanBoard
            STAGES={STAGES}
            byStage={byStage}
            formatPeso={formatPeso}
            dragId={dragId}
            setDragId={setDragId}
            handleDrop={handleDrop}
            setSelectedLead={setSelectedLead}
            getNombreVendedor={getNombreVendedor}
          />
        )}

        {/* LISTA */}
        {!loading && view === "lista" && (
          <LeadsTable
            filteredLeads={filteredLeads}
            STAGES={STAGES}
            normalizeStage={normalizeStage}
            setSelectedLead={setSelectedLead}
            formatPeso={formatPeso}
            getNombreVendedor={getNombreVendedor}
            openWA={openWA}
          />
        )}

        {/* BASE DE CONOCIMIENTO */}
        {view === "base" && isAdmin && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>BASE DE CONOCIMIENTO</div>
              <div style={{ fontSize: 11, color: "#777" }}>Sube PDFs para que el bot de WhatsApp pueda responder preguntas</div>
            </div>

            {/* Upload */}
            <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                type="text"
                placeholder="Título del documento (ej: Cursos Windsor)"
                value={ragTitulo}
                onChange={(e) => setRagTitulo(e.target.value)}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e0e0e0", fontSize: 12 }}
              />
              <textarea
                placeholder="Pega aquí el texto del documento..."
                value={ragTexto}
                onChange={(e) => setRagTexto(e.target.value)}
                rows={8}
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 12px", color: "#e0e0e0", fontSize: 12, resize: "vertical", fontFamily: "inherit" }}
              />
              <button
                className="btn btn-primary"
                onClick={uploadTexto}
                disabled={ragUploading || !ragTexto.trim()}
              >
                {ragUploading ? "Indexando..." : "Indexar texto"}
              </button>
            </div>

            {/* Lista de documentos */}
            {documentos.length === 0 ? (
              <div style={{ padding: 20, borderRadius: 8, border: "1px dashed #333", textAlign: "center", color: "#555", fontSize: 12 }}>
                No hay documentos indexados todavía.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {documentos.map((doc) => (
                  <div key={doc.id} style={{ borderRadius: 8, border: "1px solid #2a2a2a", fontSize: 12, overflow: "hidden" }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", cursor: "pointer" }}
                      onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                    >
                      <div>
                        <div style={{ color: "#e0e0e0", marginBottom: 2 }}>{doc.titulo || "Sin título"}</div>
                        <div style={{ color: "#555", fontSize: 11 }}>{doc.contenido?.slice(0, 80)}...</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ color: "#555", fontSize: 16 }}>{expandedDoc === doc.id ? "▲" : "▼"}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingDoc(doc.id); setEditTitulo(doc.titulo || ""); setEditTexto(doc.contenido || ""); setExpandedDoc(doc.id); }}
                          style={{ background: "none", border: "1px solid #444", borderRadius: 4, color: "#aaa", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                        >editar</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteDocumento(doc.id); }}
                          style={{ background: "none", border: "none", color: "#E85D38", cursor: "pointer", fontSize: 18, lineHeight: 1 }}
                        >×</button>
                      </div>
                    </div>
                    {expandedDoc === doc.id && (
                      <div style={{ padding: "10px 14px", borderTop: "1px solid #2a2a2a" }}>
                        {editingDoc === doc.id ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <input
                              value={editTitulo}
                              onChange={(e) => setEditTitulo(e.target.value)}
                              style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#e0e0e0", fontSize: 12 }}
                            />
                            <textarea
                              value={editTexto}
                              onChange={(e) => setEditTexto(e.target.value)}
                              rows={10}
                              style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#e0e0e0", fontSize: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                            />
                            <div style={{ display: "flex", gap: 8 }}>
                              <button className="btn btn-primary" onClick={() => saveDocumento(doc.id)}>Guardar y re-indexar</button>
                              <button className="btn" onClick={() => setEditingDoc(null)} style={{ background: "#1a1a1a", border: "1px solid #333", color: "#aaa", borderRadius: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: "#aaa", fontSize: 11, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{doc.contenido}</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONFIGURACIÓN DEL BOT */}
        {view === "bot" && isAdmin && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>CONFIGURACIÓN DEL BOT</div>
              <div style={{ fontSize: 11, color: "#777" }}>
                Aquí defines la identidad y la forma en que debe comportarse el bot. Esta configuración se guarda desde el CRM y, por ahora, no reemplaza el flujo actual en producción.
              </div>
            </div>

            <div style={{ marginBottom: 12, fontSize: 11, color: "#555", lineHeight: 1.6 }}>
              Sugerencia: describe quién es el bot, cuál es su objetivo, cómo debe hablar, qué debe evitar y cuándo debe escalar a un asesor humano.
            </div>

            <textarea
              value={botPrompt}
              onChange={(e) => setBotPrompt(e.target.value)}
              placeholder={`Eres el asistente de admisiones de Instituto Windsor por WhatsApp. Debes hablar de forma amable, clara, breve e institucional. Tu objetivo es orientar al prospecto, identificar su interés y llevarlo al siguiente paso. No inventes información. Si no sabes algo, dilo con honestidad y ofrece apoyo humano. Si el usuario pide asesor, deja la conversación lista para seguimiento.`}
              rows={14}
              style={{
                width: "100%",
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: 8,
                padding: "12px 14px",
                color: "#e0e0e0",
                fontSize: 12,
                lineHeight: 1.7,
                resize: "vertical",
                marginBottom: 14,
              }}
            />

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-primary"
                onClick={saveBotConfig}
                disabled={botSaving}
              >
                {botSaving ? "Guardando..." : "Guardar configuración del bot"}
              </button>
              {(botLoading || flowLoading) && (
                <div style={{ fontSize: 11, color: "#777" }}>
                  Cargando configuración...
                </div>
              )}
            </div>
          </div>
        )}

        {view === "lab" && isAdmin && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>LAB BOT</div>
              <div style={{ fontSize: 11, color: "#777" }}>
                Simula cómo se comportaría el bot según el escenario del lead, sin afectar el bot productivo.
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: 16 }}>
              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>ESCENARIO</div>
                <select
                  className="select"
                  value={labScenario}
                  onChange={(e) => {
                    setLabScenario(e.target.value);
                    setLabStarted(false);
                    setLabMessages([]);
                    setLabInput("");
                  }}
                  style={{ marginBottom: 14 }}
                >
                  <option value="ads">Ads</option>
                  <option value="walkin">Walk-in</option>
                </select>

                {labScenario === "walkin" && (
                  <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    <input
                      className="input"
                      placeholder="Nombre"
                      value={labWalkinData.nombre}
                      onChange={(e) => setLabWalkinData((prev) => ({ ...prev, nombre: e.target.value }))}
                    />
                    <input
                      className="input"
                      placeholder="Correo"
                      value={labWalkinData.email}
                      onChange={(e) => setLabWalkinData((prev) => ({ ...prev, email: e.target.value }))}
                    />
                    <select
                      className="select"
                      value={labWalkinData.programa}
                      onChange={(e) => setLabWalkinData((prev) => ({ ...prev, programa: e.target.value }))}
                    >
                      {CURSOS.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input
                      className="input"
                      placeholder="WhatsApp (opcional)"
                      value={labWalkinData.whatsapp}
                      onChange={(e) => setLabWalkinData((prev) => ({ ...prev, whatsapp: e.target.value }))}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                  <button className="btn btn-primary" onClick={startLabSimulation}>
                    {labStarted ? "Reiniciar simulación" : "Iniciar simulación"}
                  </button>
                  {labStarted && (
                    <button className="btn btn-ghost" onClick={resetLabSimulation}>
                      Limpiar
                    </button>
                  )}
                </div>

                <div style={{ background: "#0f0f0f", border: "1px solid #222", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: "#999", marginBottom: 8 }}>ESTADO DEL LEAD</div>
                  <div style={{ fontSize: 12, color: "#ddd", lineHeight: 1.8 }}>
                    <div><strong>Origen:</strong> {labState.origen || labScenario}</div>
                    <div><strong>Nombre:</strong> {labState.nombre || "—"}</div>
                    <div><strong>Correo:</strong> {labState.email || "—"}</div>
                    <div><strong>Programa:</strong> {labState.programa || "—"}</div>
                    <div><strong>Fase:</strong> {labState.fase || "—"}</div>
                    <div><strong>Siguiente paso:</strong> {labState.nextStep || "—"}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16, display: "flex", flexDirection: "column", minHeight: 480 }}>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 12 }}>CHAT DE PRUEBA</div>
                <div style={{ flex: 1, background: "#0c0c0c", border: "1px solid #1f1f1f", borderRadius: 8, padding: 12, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
                  {!labStarted && (
                    <div style={{ fontSize: 12, color: "#666" }}>
                      Selecciona un escenario y empieza la simulación para probar cómo hablaría el bot.
                    </div>
                  )}
                  {labMessages.map((msg, idx) => (
                    <div
                      key={`${msg.role}-${idx}`}
                      style={{
                        alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                        background: msg.role === "user" ? "#1f2e4d" : "#1a2f1f",
                        color: "#e8e8e8",
                        border: `1px solid ${msg.role === "user" ? "#3f68b5" : "#2d5a35"}`,
                        borderRadius: 10,
                        padding: "10px 12px",
                        maxWidth: "82%",
                        fontSize: 12,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {msg.content}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    placeholder={labStarted ? "Escribe como si fueras el prospecto..." : "Inicia primero la simulación"}
                    value={labInput}
                    onChange={(e) => setLabInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !labSending) {
                        e.preventDefault();
                        sendLabMessage();
                      }
                    }}
                    disabled={!labStarted || labSending}
                  />
                  <button className="btn btn-primary" onClick={sendLabMessage} disabled={!labStarted || labSending}>
                    {labSending ? "Consultando..." : "Enviar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FLOWS WHATSAPP */}
        {view === "flows" && isAdmin && (
          <div style={{ background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, padding: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#e0e0e0", marginBottom: 4 }}>FLOWS WHATSAPP</div>
              <div style={{ fontSize: 11, color: "#777" }}>
                Define reglas simples por palabra clave. El bot aplica la primera que coincida antes de usar RAG.
              </div>
            </div>
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "#111", border: "1px solid #2a2a2a", fontSize: 11, color: "#777", lineHeight: 1.6 }}>
              Próximo paso: esta sección evolucionará a un constructor visual del flujo conversacional, tipo canvas, sin quitar la configuración actual por palabra clave.
            </div>
            <div style={{ fontSize: 11, color: "#555", marginBottom: 8 }}>
              Ejemplo: si el mensaje contiene <code>hola</code>, responde un texto fijo. Si contiene <code>precio</code>, usa la base RAG.
            </div>
            <div style={{ border: "1px solid #2a2a2a", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 3fr", background: "#111", fontSize: 11, color: "#777" }}>
                <div style={{ padding: "8px 10px", borderRight: "1px solid #2a2a2a" }}>PALABRA CLAVE CONTIENE</div>
                <div style={{ padding: "8px 10px", borderRight: "1px solid #2a2a2a" }}>ACCIÓN</div>
                <div style={{ padding: "8px 10px" }}>RESPUESTA (si es texto fijo)</div>
              </div>
              {flowRules.length === 0 ? (
                <div style={{ padding: 12, fontSize: 12, color: "#555" }}>
                  No hay reglas aún. Agrega una con el botón de abajo.
                </div>
              ) : (
                flowRules.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1.2fr 3fr",
                      borderTop: "1px solid #2a2a2a",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ padding: "8px 10px", borderRight: "1px solid #2a2a2a" }}>
                      <input
                        value={rule.match}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFlowRules((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, match: v } : r))
                          );
                        }}
                        placeholder="ej. hola"
                        style={{
                          width: "100%",
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 4,
                          padding: "6px 8px",
                          color: "#e0e0e0",
                          fontSize: 12,
                        }}
                      />
                    </div>
                    <div style={{ padding: "8px 10px", borderRight: "1px solid #2a2a2a" }}>
                      <select
                        value={rule.type === "rag" ? "rag" : "fixed"}
                        onChange={(e) => {
                          const v = e.target.value;
                          setFlowRules((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, type: v === "rag" ? "rag" : "fixed" } : r
                            )
                          );
                        }}
                        style={{
                          width: "100%",
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 4,
                          padding: "6px 8px",
                          color: "#e0e0e0",
                          fontSize: 12,
                        }}
                      >
                        <option value="fixed">Responder texto fijo</option>
                        <option value="rag">Usar RAG (base de conocimiento)</option>
                      </select>
                    </div>
                    <div style={{ padding: "8px 10px", display: "flex", gap: 6, alignItems: "flex-start" }}>
                      {rule.type !== "rag" ? (
                        <textarea
                          value={rule.answer}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFlowRules((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, answer: v } : r))
                            );
                          }}
                          rows={2}
                          placeholder="Texto que enviará el bot"
                          style={{
                            flex: 1,
                            background: "#1a1a1a",
                            border: "1px solid #333",
                            borderRadius: 4,
                            padding: "6px 8px",
                            color: "#e0e0e0",
                            fontSize: 12,
                            resize: "vertical",
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 11, color: "#777" }}>
                          El bot buscará respuesta en la base RAG.
                        </div>
                      )}
                      <button
                        onClick={() =>
                          setFlowRules((prev) => prev.filter((_, i) => i !== idx))
                        }
                        style={{
                          background: "none",
                          border: "none",
                          color: "#E85D38",
                          cursor: "pointer",
                          fontSize: 16,
                          lineHeight: 1,
                        }}
                        title="Eliminar regla"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                className="btn"
                style={{
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  color: "#e0e0e0",
                  borderRadius: 6,
                  padding: "6px 12px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
                onClick={() =>
                  setFlowRules((prev) => [
                    ...prev,
                    { match: "", type: "fixed", answer: "" },
                  ])
                }
              >
                + Agregar regla
              </button>
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center" }}>
              <button
                className="btn btn-primary"
                onClick={saveWhatsappFlow}
                disabled={flowSaving}
              >
                {flowSaving ? "Guardando..." : "Guardar flow"}
              </button>
              {flowLoading && (
                <div style={{ fontSize: 11, color: "#777" }}>
                  Cargando flow...
                </div>
              )}
            </div>
          </div>
        )}

        {/* CONVERSACIONES WHATSAPP */}
        {view === "convs" && (
          <ConversationsPanel
            filteredWhatsConvs={filteredWhatsConvs}
            convSearch={convSearch}
            setConvSearch={setConvSearch}
            convModeFilter={convModeFilter}
            setConvModeFilter={setConvModeFilter}
            convPhaseFilter={convPhaseFilter}
            setConvPhaseFilter={setConvPhaseFilter}
            conversationPhaseOptions={conversationPhaseOptions}
            getPhaseLabel={getPhaseLabel}
            selectedConv={selectedConv}
            setSelectedConv={setSelectedConv}
            confirmReturnToBotIfNeeded={confirmReturnToBotIfNeeded}
            fetchConvMessages={fetchConvMessages}
            setAgentMessage={setAgentMessage}
            leads={leads}
            vendedores={vendedores}
            getConversationBadgeStyle={getConversationBadgeStyle}
            getModeLabel={getModeLabel}
            selectedConvLead={selectedConvLead}
            selectedConvOwner={selectedConvOwner}
            selectedLeadAssigned={selectedLeadAssigned}
            setHumanMode={setHumanMode}
            convMessages={convMessages}
            agentMessage={agentMessage}
            sendAgentReply={sendAgentReply}
            sendingAgent={sendingAgent}
          />
        )}

        {/* AGENDA */}
        {!loading && view === "agenda" && (
          <AgendaPanel
            citas={citas}
            setShowCitaForm={setShowCitaForm}
            getCitaStatusStyle={getCitaStatusStyle}
            updateCitaStatus={updateCitaStatus}
          />
        )}
      </div>

      {/* MODAL DETALLE LEAD */}
      {selectedLead && (() => {
        const lead = leads.find(l => l.id === selectedLead.id) || selectedLead;
        const stage = STAGES.find(s => s.id === normalizeStage(lead.stage));
        return (
          <LeadDetailModal
            lead={lead}
            stage={stage}
            isAdmin={isAdmin}
            vendedores={vendedores}
            getNombreVendedor={getNombreVendedor}
            reasignarLead={reasignarLead}
            STAGES={STAGES}
            moveStage={moveStage}
            setSelectedLead={setSelectedLead}
            updateNotas={updateNotas}
            WA_TEMPLATES={WA_TEMPLATES}
            openWA={openWA}
            sendLeadInformation={sendLeadInformation}
            sendingInfoLeadId={sendingInfoLeadId}
            leadInfoDraft={leadInfoDraft}
            setLeadInfoDraft={setLeadInfoDraft}
            hasActiveConversation={!!whatsConvs.find((conv) => conv.lead_id === lead.id || conv.whatsapp === lead.whatsapp)}
            getLeadNextStep={getLeadNextStep}
            leadTimelineLoading={leadTimelineLoading}
            leadTimeline={leadTimeline}
            setShowCitaForm={setShowCitaForm}
            setNuevaCita={setNuevaCita}
            deleteLead={deleteLead}
          />
        );
      })()}

      <NewLeadModal
        showForm={showForm}
        setShowForm={setShowForm}
        newLead={newLead}
        setNewLead={setNewLead}
        CURSOS={CURSOS}
        vendedores={vendedores}
        addLead={addLead}
      />

      <NewAppointmentModal
        showCitaForm={showCitaForm}
        setShowCitaForm={setShowCitaForm}
        nuevaCita={nuevaCita}
        setNuevaCita={setNuevaCita}
        leads={leads}
        guardarCita={guardarCita}
      />

      {/* CHATBOT IA */}
      <button
        onClick={() => setChatOpen((v) => !v)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 900,
          width: 52,
          height: 52,
          borderRadius: "50%",
          border: "none",
          background: "#E8A838",
          color: "#0e0e0e",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          cursor: "pointer",
          fontSize: 22,
        }}
        aria-label="Abrir asistente de ventas"
      >
        💬
      </button>

      {chatOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 360,
            maxHeight: 520,
            background: "#0e0e0e",
            borderRadius: 12,
            border: "1px solid #2a2a2a",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            zIndex: 901,
          }}
        >
          <div
            style={{
              padding: "10px 14px",
              borderBottom: "1px solid #2a2a2a",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#111",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: "#E8A838",
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                }}
              >
                Asistente Windsor
              </div>
              <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                IA enfocada en admisiones y seguimiento de prospectos
              </div>
            </div>
            <button
              className="btn-ghost"
              style={{ border: "none", background: "transparent", color: "#777" }}
              onClick={() => setChatOpen(false)}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              padding: "10px 12px",
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {chatMessages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background:
                    m.role === "user" ? "#E8A838" : "rgba(255,255,255,0.03)",
                  color: m.role === "user" ? "#0e0e0e" : "#e0e0e0",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: 12,
                  lineHeight: 1.5,
                  border:
                    m.role === "user"
                      ? "none"
                      : "1px solid rgba(255,255,255,0.05)",
                }}
              >
                {m.content}
              </div>
            ))}
            {chatLoading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  fontSize: 11,
                  color: "#777",
                }}
              >
                Pensando recomendaciones...
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1px solid #2a2a2a",
              padding: "8px 10px",
              background: "#111",
              display: "flex",
              gap: 6,
            }}
          >
            <input
              className="input"
              style={{ fontSize: 12, padding: "8px 10px" }}
              placeholder="Pregúntame cómo avanzar tus leads..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendChat();
                }
              }}
            />
            <button
              className="btn btn-primary"
              style={{ padding: "0 14px", fontSize: 12, whiteSpace: "nowrap" }}
              onClick={sendChat}
              disabled={chatLoading}
            >
              {chatLoading ? "Enviando..." : "Enviar"}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast" style={{ background: toast.type === "error" ? "#2a0d0d" : "#0d2018", border: `1px solid ${toast.type === "error" ? "#E85D38" : "#27AE60"}44`, color: toast.type === "error" ? "#E85D38" : "#27AE60" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
