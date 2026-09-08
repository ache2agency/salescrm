-- Marca manual compartida entre asesores. Usa las políticas RLS existentes.
-- Abrir, responder o cambiar la etapa no retira esta marca.
alter table public.whatsapp_conversaciones
  add column if not exists seguimiento_manual boolean not null default false;

comment on column public.whatsapp_conversaciones.seguimiento_manual is
  'Pendiente manual de seguimiento del asesor, independiente de lectura, fase y stage.';
