## CONTEXTO DEL PROYECTO INFOSALES CRM

Este documento resume, en alto nivel, lo que se ha ido construyendo y cómo está organizado el proyecto. La idea es irlo actualizando cada día de trabajo.

### 1. Arquitectura general

- **Framework**: Next.js (App Router).
- **Backend / BaaS**: Supabase (auth, base de datos, RLS, funciones RPC).
- **UI principal**: `app/crm.jsx` (CRM de leads).
- **Base de datos principal**:
  - Tabla `leads`: gestión de leads y pipeline de ventas.
  - Tabla `profiles`: perfiles de usuario (nombre, rol).
  - Tabla `citas`: agenda de citas (clases de prueba / reuniones).
  - Tabla `email_sequences`: secuencias automáticas de email.
  - Tabla `documentos`: base vectorial para RAG.
  - Tablas WhatsApp: `whatsapp_conversaciones` (incl. `fase`, `modo_humano`, `tomado_por`), `whatsapp_mensajes` (rol: usuario | bot | agente), `whatsapp_flows` (config con reglas por palabra clave).

### 2. Roles y permisos

- **Admin**:
  - Ve todos los leads.
  - Puede reasignar leads a cualquier vendedor.
  - Puede eliminar leads.
  - Ve todas las citas en la agenda (según RLS en Supabase).
  - Ve y edita la pestaña **FLOWS** (reglas del bot WhatsApp).
  - Ve todas las conversaciones de WhatsApp en **CONVERSACIONES**.
- **Vendedor**:
  - Ve solo leads asignados a él.
  - Ve solo sus citas (según RLS).
  - Ve en **CONVERSACIONES** solo las conversaciones de WhatsApp ligadas a sus leads (según RLS).

La lógica de roles se basa en el campo `rol` en `profiles` y/o metadatos de usuario en Supabase (`raw_user_meta_data.role`).

### 3. Funcionalidades principales implementadas

- **CRM de leads (`app/crm.jsx`)**:
  - Vistas: KANBAN, LISTA, AGENDA, CONVERSACIONES y (solo admin) BASE y FLOWS.
  - Kanban por etapas (`nuevo`, `contactado`, `en_proceso`, `ganado`, `perdido`).
  - Filtros por vendedor, búsqueda, drag & drop de etapas.
  - Modal de detalle de lead con reasignación (admin) y botón para agendar cita.

- **Conversaciones WhatsApp (vista CONVERSACIONES en `app/crm.jsx`)**:
  - Visible para todos los usuarios autenticados (admin ve todas; vendedor solo las de sus leads).
  - Lista de conversaciones con estado, último mensaje y modo (BOT / humano).
  - Al seleccionar una: historial de mensajes (usuario, bot, agente) y detalle (Fase, Modo).
  - **Tomar control** / **Volver a BOT**: alternan `modo_humano` y `tomado_por` en `whatsapp_conversaciones`.
  - Cuadro para responder como vendedor (envío vía `/api/whatsapp/send` y registro en `whatsapp_mensajes` como rol `agente`).
  - Carga de conversaciones con fallback si en BD faltan columnas `modo_humano`, `fase`, `tomado_por`.

- **Flows WhatsApp (vista FLOWS, solo admin)**:
  - Editor en tabla: palabra clave (match), acción (texto fijo o RAG), texto de respuesta.
  - Guardado en `whatsapp_flows` (campo `config` con array `rules`). El webhook aplica la primera regla que coincida antes de RAG.

- **Agenda interna (vista AGENDA en `app/crm.jsx`)**:
  - Lista de citas (tabla `citas`).
  - Botón para crear nuevas citas ligadas a leads y vendedores.

- **Página pública de agendado (`app/agendar/[vendedor]/page.jsx`)**:
  - Pública (sin login).
  - URL por vendedor: `/agendar/hola@windsor.edu.mx`.
  - Paso a paso:
    1. Lee el vendedor desde la tabla `profiles` por email.
    2. Muestra calendario mensual y horarios (9:00–18:00, cada 30 min).
    3. Formulario de prospecto (nombre, email, WhatsApp, notas).
    4. Al confirmar:
       - Crea lead en `leads` con `stage: "interesado"` y asignado al vendedor.
       - Crea cita en `citas` con status `confirmada`.
       - Llama a `/api/emails/sequence` para iniciar secuencia de correos.

### 4. Integraciones externas

- **OpenAI (Chatbot CRM y RAG)**:
  - Variable: `OPENAI_API_KEY` en `.env.local`.
  - **Chat de CRM**:
    - Endpoint: `app/api/chat/route.ts`.
    - Modelo: `gpt-4o`.
    - Prompt de sistema: asistente experto en ventas para INFOSALES.
    - Recibe `messages` y `leads` para dar recomendaciones sobre el pipeline.
  - **RAG**:
    - Tabla `documentos` con columna `embedding` (`vector(1536)`).
    - SQL función `match_documents(query_embedding vector(1536), match_count int)` para buscar por similitud.
    - Endpoint de carga: `app/api/rag/upload/route.ts`
      - Recibe texto largo (`contenido`), lo trocea en chunks de ~500 palabras.
      - Genera embeddings con `text-embedding-ada-002`.
      - Inserta `contenido` + `embedding` (como string en formato vector de PostgreSQL).
    - Endpoint de consulta: `app/api/rag/query/route.ts`
      - Genera embedding de la pregunta.
      - Llama a `match_documents` vía RPC.
      - Concatena contexto y pregunta, responde con `gpt-4o`.

- **Resend (secuencias de email)**:
  - Variables: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.
  - SQL tabla: `email_sequences` (una fila por correo programado).
  - Endpoint: `app/api/emails/sequence/route.ts`
    - Recibe `lead_id`, `email`, `nombre`.
    - Crea 7 registros para días 1, 7, 14, 21, 28, 35, 42.
    - Envía el correo del día 1 inmediatamente (si hay API key).
  - Endpoint: `app/api/emails/send-pending/route.ts`
    - Calcula qué correos tocan “hoy” según `created_at + dia_envio`.
    - Envía pendientes y marca `enviado = true`.

- **Twilio WhatsApp**:
  - Variables: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`.
  - Webhook entrante: `app/api/whatsapp/webhook/route.ts`
    - Crea leads automáticamente con el número de WhatsApp.
    - **Modo humano**: si la conversación tiene `modo_humano = true`, solo registra el mensaje y no responde (el vendedor contesta desde el CRM).
    - **Memoria del bot**: antes de RAG, construye un resumen del lead (nombre, email, curso, stage, notas) y lo incluye en la pregunta a RAG para respuestas contextuales.
    - **Reglas por palabra clave**: lee el flow activo de `whatsapp_flows`; si el mensaje coincide con una regla, responde texto fijo o dispara RAG según la regla. Si no hay match, sigue con la lógica fija (“SÍ” → link de agendado) y luego RAG.
    - Si el usuario responde “SÍ”, envía link de agendado.
    - Para el resto de mensajes usa RAG (`/api/rag/query`) con el contexto del lead.
    - Registra cada mensaje entrante y respuesta del bot en `whatsapp_mensajes`.
    - Usa `createServiceRoleClient()` (no `createClient()`) para bypassear RLS — el webhook no tiene sesión de usuario.
  - Envío saliente: `app/api/whatsapp/send/route.ts`
    - Permite enviar mensajes de WhatsApp programáticamente (usado por el panel CONVERSACIONES para respuestas del vendedor).
  - **Logging de conversaciones**:
    - Tabla `whatsapp_conversaciones`: una fila por número (`whatsapp`, `lead_id`, `estado`, `ultimo_mensaje_at`, `fase`, `modo_humano`, `tomado_por`). `fase`: saludo | datos | info_programa | seguimiento | cerrado | perdido | otro.
    - Tabla `whatsapp_mensajes`: historial (`conversacion_id`, `rol: 'usuario'|'bot'|'agente'`, `contenido`, `raw_payload`). Rol `agente` = mensaje enviado por un vendedor desde el CRM.
    - Tabla `whatsapp_flows`: flujo activo con `config.rules` (match, answer, use_rag). El CRM guarda/edita desde la vista FLOWS.
    - RLS: admin acceso total vía `public.es_admin()`; vendedor SELECT solo conversaciones de sus leads. UPDATE en `whatsapp_conversaciones` para vendedores puede faltar (ver `docs/PENDIENTES.md`).
    - El INSERT desde el webhook funciona con service role (no con anon key).
  - Vista en CRM: pestaña **CONVERSACIONES** (lista, detalle, tomar control / volver a BOT, responder); pestaña **FLOWS** (solo admin) para editar reglas.

### 5. Autenticación y Supabase

- Cliente servidor (`utils/supabase/server.ts`):
  - Usa `@supabase/ssr` y `cookies` de Next.
  - `setAll` es `no-op` para evitar errores de modificación de cookies en Server Components.
- Cliente cliente (`@/utils/supabase/client`):
  - Usado en componentes client-side como `app/crm.jsx` y `app/agendar/[vendedor]/page.jsx`.

### 6. Detalles de configuración importantes

- `.env.local` típico:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (solo backend, nunca exponer en frontend)
  - `OPENAI_API_KEY`
  - `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
  - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`

- RLS (Row Level Security) clave:
  - `profiles`: política de lectura pública para página `/agendar/[vendedor]`.
  - `citas`: políticas separadas para admin (todas las citas) y vendedores (solo las suyas).
  - `email_sequences`: política “Admin acceso total”.
  - `whatsapp_conversaciones` / `whatsapp_mensajes`: admin acceso total; vendedor SELECT solo conversaciones de sus leads. INSERTs desde el webhook usan service role. Para "Tomar control", "Volver a BOT" y envío desde el panel por vendedores, puede faltar UPDATE en `whatsapp_conversaciones` e INSERT en `whatsapp_mensajes` (rol agente); ver `docs/PENDIENTES.md`.

- **Regla importante**: cualquier endpoint de API que reciba requests externos sin sesión (ej. webhooks de Twilio) debe usar `createServiceRoleClient()` de `utils/supabase/server.ts`, nunca `createClient()`. De lo contrario los inserts fallan silenciosamente por RLS.

- **Pendientes y errores**: ver `docs/PENDIENTES.md` para tareas pendientes (flujo por fases, oferta educativa clase prueba vs otros, RLS vendedores, sincronía pipeline/fase) y errores a corregir en el panel CONVERSACIONES (responder al usuario, botones Tomar control / Volver a BOT).

### 7. Cómo seguir usando este archivo

- **Cada nueva funcionalidad grande**: agregar un bloque corto aquí (qué hace, en qué archivos vive).
- **Cambios en tablas de Supabase**: anotar nuevas tablas, columnas o funciones SQL.
- **Flujos importantes de negocio** (por ejemplo, “nuevo lead desde WhatsApp” o “secuencia de correos desde página pública”): describirlos en 3–5 bullets.

Con esto, cualquier persona (incluyéndote tú en unas semanas) puede entender rápido qué hace el proyecto y por dónde empezar.

*Última actualización: sesión con flujos WhatsApp por palabra clave, memoria del bot (leadSummary en RAG), modo humano (Tomar control / Volver a BOT), vista CONVERSACIONES y FLOWS en el CRM; pendientes y errores en `docs/PENDIENTES.md`.*

