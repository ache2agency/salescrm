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

### 2. Roles y permisos

- **Admin**:
  - Ve todos los leads.
  - Puede reasignar leads a cualquier vendedor.
  - Puede eliminar leads.
  - Ve todas las citas en la agenda (según RLS en Supabase).
- **Vendedor**:
  - Ve solo leads asignados a él.
  - Ve solo sus citas (según RLS).

La lógica de roles se basa en el campo `rol` en `profiles` y/o metadatos de usuario en Supabase (`raw_user_meta_data.role`).

### 3. Funcionalidades principales implementadas

- **CRM de leads (`app/crm.jsx`)**:
  - Vistas: KANBAN, LISTA y AGENDA.
  - Kanban por etapas (`nuevo`, `contactado`, `en_proceso`, `ganado`, `perdido`).
  - Filtros por vendedor, búsqueda, drag & drop de etapas.
  - Modal de detalle de lead con reasignación (admin) y botón para agendar cita.

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
    - Si el usuario responde “SÍ”, envía link de agendado.
    - Si el mensaje parece una pregunta sobre Windsor, usa RAG (`/api/rag/query`) para responder con contexto.
  - Envío saliente: `app/api/whatsapp/send/route.ts`
    - Permite enviar mensajes de WhatsApp programáticamente usando Twilio.

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

### 7. Cómo seguir usando este archivo

- **Cada nueva funcionalidad grande**: agregar un bloque corto aquí (qué hace, en qué archivos vive).
- **Cambios en tablas de Supabase**: anotar nuevas tablas, columnas o funciones SQL.
- **Flujos importantes de negocio** (por ejemplo, “nuevo lead desde WhatsApp” o “secuencia de correos desde página pública”): describirlos en 3–5 bullets.

Con esto, cualquier persona (incluyéndote tú en unas semanas) puede entender rápido qué hace el proyecto y por dónde empezar.

