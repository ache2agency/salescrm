# Pendientes – Windsor CRM

Documento para anotar lo que queda por hacer y los errores a resolver. Actualizar al cerrar cada sesión.

---

## Pendiente (próxima sesión)

### **Técnico / Producto**
- [ ] Ejecutar Fase 1 y Fase 2 de `docs/IMPLEMENTACION_ESCUELA.md`
- [ ] Revisar manualmente el CRM con `docs/CRM_QA_CHECKLIST.md`
- [ ] Probar bot GPT-4o en producción con conversaciones reales y ajustar system prompt en `askGPT()` si es necesario
- [ ] Cargar contenido real de programas en la `BASE` (RAG): costos, horarios, niveles, proceso de inscripción
- [ ] Terminar de definir y cargar el prompt maestro del bot desde la pestaña `BOT` en el CRM
- [ ] Diseñar la evolución de `FLOWS` a un constructor visual tipo canvas
- [ ] Validar en uso real la sincronía completa `lead.stage` ↔ `whatsapp_conversaciones.fase`
- [ ] Integrar al CRM el envío de template inicial para leads `walkin` cuando la template de Twilio ya esté aprobada
- [ ] Terminar activación de Meta Cloud API en producción
- [ ] Correr migración de `lead_activities` en Supabase y validar que el historial persista entre sesiones
- [ ] Afinar el guardado de notas del lead para registrar un solo evento al guardar/blurear, no por cada tecla
- [ ] Seguir limpiando `app/crm.jsx` moviendo helpers/lógica compartida a `lib/` o hooks

---

## Pendientes Marketing

### **Inmediato (Esta semana)**
- [ ] Configurar IDs reales de analytics (GA4, Meta Pixel, Hotjar)
- [ ] Lanzar primera campaña de LinkedIn Ads ($200)
- [ ] Setup email sequences en Resend
- [ ] Agendar primeras 5 demos con prospects
- [ ] Testear landing page con tráfico real

### **Corto Plazo (Próximo mes)**
- [ ] Escalar campañas a $1,000/mes
- [ ] Crear primer case study real
- [ ] Lanzar webinar mensual
- [ ] Optimizar landing page basado en datos
- [ ] Implementar programa de referidos

### **Mediano Plazo (Próximos 3 meses)**
- [ ] Expandir a Colombia y Argentina
- [ ] Crear mobile app (iOS/Android)
- [ ] Implementar advanced reporting
- [ ] Alcanzar $10,000 MRR
- [ ] Certificaciones SOC 2

---

## Pendientes Técnicos

- **Secuencia de la plática:** ver `docs/FLUJO_BOT_WHATSAPP.md` (fases, mensajes del bot, qué espera en cada paso y sincronía con el CRM).
- **Twilio productivo:** ya no se usa sandbox; el número oficial `+5217474785589` está activo en producción.
- **Migración a Meta:** el código ya acepta `WHATSAPP_PROVIDER=meta` y el webhook soporta verificación `GET` + eventos de mensajes de WhatsApp Cloud API.
- **QA operativo:** usar `npm run crm:check` antes de cerrar cambios importantes.
- **Ruta de implementacion:** seguir `docs/IMPLEMENTACION_ESCUELA.md` para preparar el despliegue real en la escuela.

---

## Hecho (referencia rápida)

- **Flujo del bot WhatsApp por fases:** saludo → programa → correo → info_enviada → dudas → accion → cerrado/perdido. Se actualiza `fase` y lead (stage, nombre, email, curso).
- **Twilio productivo activo:** sender oficial `Instituto Windsor` en línea con webhook apuntando a `https://crm.windsor.edu.mx/api/whatsapp/webhook`.
- **Separar oferta educativa:** Solo programas de *idiomas* (niños/adultos) ofrecen clase de prueba; el resto ofrece llamada o inscripción. Config en webhook (`tieneClasePrueba`) y CTA distinto según programa (link agendar vs contacto).
- **Sync pipeline CRM ↔ fase WhatsApp:** Al avanzar en WhatsApp se actualiza el stage del lead y al mover etapas en CRM también se empuja una fase coherente a la conversación ligada.
- **RLS y panel CONVERSACIONES:** Contestar, Tomar control y Volver a BOT funcionando (variables Twilio en Vercel; modo humano = el bot no responde hasta "Volver a BOT").
- Memoria del bot: contexto del lead se envía a RAG en cada mensaje.
- Modo humano: "Tomar control" / "Volver a BOT" y cuadro para responder como vendedor en la vista CONVERSACIONES.
- Flows por palabra clave (FLOWS en CRM): reglas con match, respuesta fija o RAG; guardado en `whatsapp_flows`.
- Configuración BOT en CRM: nueva pestaña `BOT` para centralizar identidad y comportamiento del bot en `whatsapp_flows.config.bot_prompt`, sin reemplazar todavía el flujo actual.
- LAB BOT en CRM: simulador conversacional para escenarios `ads` y `walkin`, conectado a la `BASE` por RAG para probar respuestas sin afectar producción.
- LAB BOT mejorado: ya consulta la `BASE`, muestra respuestas con mejor estructura y valida mejor correos mal capturados como programa, pero todavía queda pendiente el cambio fluido entre ofertas dentro del mismo chat.
- Campo `fase` y columnas `modo_humano`, `tomado_por` en `whatsapp_conversaciones`.
- Vista de conversaciones mejorada: búsqueda, filtros, badges, lead ligado y responsable.
- Modal del lead mejorado: siguiente paso, última actividad y timeline.
- Envío directo desde modal del lead: botón `Enviar información` por API de WhatsApp, sin depender de WhatsApp Web.
- Timeline comercial persistente: nueva tabla `lead_activities` y registro de etapas, reasignación, citas y respuestas del agente.
- Agenda mejorada: validación de fecha, status operativos y paso automático a `propuesta`.
- Refactor inicial del CRM: conversaciones, agenda, lead modal, kanban, lista y modales extraídos a `components/crm/`.
- Scripts de soporte: `npm run whatsapp:check`, `npm run crm:check`.
- Checklist operativa: `docs/CRM_QA_CHECKLIST.md`.
- Compatibilidad dual de WhatsApp: envío y webhook soportan `Twilio` y `Meta Cloud API` vía `WHATSAPP_PROVIDER`.

---

*Última actualización (2026-03-27): Bot reescrito con GPT-4o (lenguaje natural), agenda pública con horarios reales y bloques fijos, AgendaPanel con vista calendario, stages alineados al tipo de cita. Foco siguiente: cargar contenido real en BASE y validar bot en producción.*
