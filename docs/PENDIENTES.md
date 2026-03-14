# Pendientes – INFOSALES CRM

Documento para anotar lo que queda por hacer y los errores a resolver. Actualizar al cerrar cada sesión.

---

## Pendiente (próxima sesión)

### 1. ~~Flujo del bot WhatsApp por fases~~ (hecho)
- Implementado en `app/api/whatsapp/webhook/route.ts`: saludo → datos (nombre/email) → info_programa (elige programa) → seguimiento (dudas/agendar) → cerrado o perdido. Se actualiza `fase` y lead (stage, nombre, email, curso).

### 2. Separar oferta educativa (clase prueba vs otros)
- **Descripción:** Solo **idiomas niños y adultos** tienen clase prueba; el resto de ofertas no. Hay que diferenciar en el bot: según el programa elegido, ofrecer clase prueba, llamada o inscripción.
- **Estado:** No implementado. No hay catálogo de programas ni flag “tiene_clase_prueba” ni lógica que cambie el CTA según programa.
- **Acción:** Definir en BD o config qué programas tienen clase prueba; en el flujo del bot, según programa, enviar link de agendado (clase prueba) u otra acción (llamada/inscripción).

### 3. Relación pipeline CRM vs fase WhatsApp
- **Descripción:** Ya existe pipeline en el CRM (etapas de lead). Se definió un `fase` aparte para la conversación WhatsApp. Falta decidir si se sincronizan (ej. al pasar a “agendar” en WhatsApp actualizar stage del lead) o se mantienen separados.
- **Acción:** Definir regla (sync o no) y, si aplica, actualizar lead desde el webhook cuando la conversación avance (ej. fase `cerrado` → lead a etapa correspondiente).

*(Items 4 y 5 resueltos: RLS y envío desde panel ya funcionan.)*

### 4. ~~RLS para vendedores~~ (hecho)
- ~~**Descripción:** Los vendedores pueden **ver** conversaciones de sus leads (SELECT por RLS). Para que “Tomar control” y “Volver a BOT” funcionen, deben poder **actualizar** `modo_humano` y `tomado_por` en las conversaciones de sus leads.
- **Estado:** Probablemente solo admin tiene UPDATE en `whatsapp_conversaciones`. Si un vendedor pulsa “Tomar control” y falla, revisar políticas RLS.
- **Acción:** Añadir política UPDATE en `whatsapp_conversaciones` para vendedores sobre filas cuyo `lead_id` está asignado a ellos (y, si aplica, política INSERT en `whatsapp_mensajes` para rol `agente`).

### 5. Errores a corregir (panel CONVERSACIONES)
- **No se puede contestar al usuario desde el panel de conversaciones:** el cuadro de respuesta y el botón “Enviar” no están enviando el mensaje al usuario por WhatsApp (revisar llamada a `/api/whatsapp/send`, formato del número `to`, o permisos).
- **El botón “Tomar control” no funciona:** al pulsarlo no cambia el modo a humano o falla (revisar UPDATE a `whatsapp_conversaciones`, RLS, y que existan columnas `modo_humano`, `tomado_por`).
- **El botón “Volver a BOT” no funciona:** al pulsarlo no devuelve la conversación al bot (revisar mismo UPDATE y RLS que “Tomar control”).

---

## Hecho (referencia rápida)

- Memoria del bot: contexto del lead (nombre, email, curso, stage, notas) se envía a RAG en cada mensaje.
- Modo humano: “Tomar control” / “Volver a BOT” y cuadro para responder como vendedor en la vista CONVERSACIONES.
- CONVERSACIONES visible para todos (admin y vendedores); lista con fallback si faltan columnas `modo_humano`, `fase`, `tomado_por`.
- Flows por palabra clave (FLOWS en CRM): reglas con match, respuesta fija o RAG; guardado en `whatsapp_flows`.
- Campo `fase` y columnas `modo_humano`, `tomado_por` en `whatsapp_conversaciones`; RLS para vendedores (UPDATE/INSERT). Envío desde panel y llegada de mensajes a WhatsApp funcionando.
- Flujo por fases en webhook: saludo → datos (pide nombre/correo, actualiza lead) → info_programa (elige programa, oferta) → seguimiento (dudas vía RAG, agendar link) → cerrado/perdido; sync con stage del lead.

---

*Última actualización: sesión actual.*
