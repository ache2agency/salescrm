-- Extensión necesaria para vectores (si aún no está habilitada)
-- create extension if not exists vector;

-- Tabla de documentos para RAG
create table if not exists public.documentos (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  contenido text not null,
  embedding vector(1536) not null,
  created_at timestamptz default now()
);

-- Función de búsqueda vectorial
create or replace function public.match_documents(
  query_embedding vector(1536),
  match_count int default 3
)
returns table(id uuid, contenido text, similarity float)
language plpgsql
as $$
begin
  return query
  select
    documentos.id,
    documentos.contenido,
    1 - (documentos.embedding <=> query_embedding) as similarity
  from documentos
  order by documentos.embedding <=> query_embedding
  limit match_count;
end;
$$;

