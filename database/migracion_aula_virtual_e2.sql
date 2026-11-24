-- E.2: MANUAL, after migracion_aula_virtual_fase_a.sql. Never auto-executed.
BEGIN;
SET LOCAL lock_timeout = '5s';
CREATE TABLE public.aula_tareas (
 id UUID PRIMARY KEY,
 modulo_id UUID NOT NULL REFERENCES public.curso_modulos(id) ON DELETE RESTRICT,
 titulo VARCHAR(200) NOT NULL CHECK (length(btrim(titulo)) BETWEEN 1 AND 200),
 consigna TEXT NOT NULL CHECK (length(btrim(consigna)) BETWEEN 1 AND 20000),
 fecha_limite TIMESTAMPTZ NOT NULL,
 tipo_entrega VARCHAR(10) NOT NULL CHECK (tipo_entrega IN ('TEXTO','ARCHIVO','AMBOS')),
 creado_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0)
);
CREATE INDEX aula_tareas_modulo_idx ON public.aula_tareas(modulo_id,created_at,id);
CREATE TABLE public.aula_entregas (
 id UUID PRIMARY KEY,
 tarea_id UUID NOT NULL REFERENCES public.aula_tareas(id) ON DELETE RESTRICT,
 estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 texto TEXT CHECK (texto IS NULL OR length(btrim(texto)) BETWEEN 1 AND 20000),
 estado VARCHAR(20) NOT NULL DEFAULT 'ENVIO_PENDIENTE' CHECK (estado IN ('ENVIO_PENDIENTE','ENTREGADA','CALIFICADA')),
 entregada_en TIMESTAMPTZ,
 nota NUMERIC(4,2) CHECK (nota BETWEEN 0 AND 20),
 retroalimentacion TEXT CHECK (retroalimentacion IS NULL OR length(btrim(retroalimentacion)) BETWEEN 1 AND 20000),
 calificado_por UUID REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 calificada_en TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
 UNIQUE(tarea_id,estudiante_id),
 CHECK ((estado='ENVIO_PENDIENTE' AND entregada_en IS NULL) OR (estado IN ('ENTREGADA','CALIFICADA') AND entregada_en IS NOT NULL)),
 CHECK ((estado='CALIFICADA' AND nota IS NOT NULL AND retroalimentacion IS NOT NULL AND calificado_por IS NOT NULL AND calificada_en IS NOT NULL)
     OR (estado <> 'CALIFICADA' AND nota IS NULL AND retroalimentacion IS NULL AND calificado_por IS NULL AND calificada_en IS NULL))
);
CREATE INDEX aula_entregas_estudiante_idx ON public.aula_entregas(estudiante_id,tarea_id);
CREATE TABLE public.aula_entrega_archivos (
 id UUID PRIMARY KEY,
 entrega_id UUID NOT NULL UNIQUE REFERENCES public.aula_entregas(id) ON DELETE RESTRICT,
 object_key VARCHAR(500) NOT NULL UNIQUE CHECK(length(btrim(object_key)) > 0),
 nombre_original VARCHAR(255) NOT NULL CHECK(length(btrim(nombre_original)) > 0),
 mime_type VARCHAR(100) NOT NULL,
 tamano_bytes BIGINT NOT NULL CHECK(tamano_bytes BETWEEN 1 AND 10485760),
 tipo VARCHAR(10) NOT NULL CHECK(tipo IN ('PDF','DOCX','PPTX','ZIP')),
 estado VARCHAR(30) NOT NULL DEFAULT 'PENDIENTE' CHECK(estado IN ('PENDIENTE','ACTIVO','ELIMINACION_PENDIENTE')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 version BIGINT NOT NULL DEFAULT 0 CHECK(version >= 0),
 CHECK ((tipo='PDF' AND mime_type='application/pdf')
 OR (tipo='DOCX' AND mime_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document')
 OR (tipo='PPTX' AND mime_type='application/vnd.openxmlformats-officedocument.presentationml.presentation')
 OR (tipo='ZIP' AND mime_type='application/zip'))
);
ALTER TABLE public.aula_tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aula_entrega_archivos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.aula_tareas,public.aula_entregas,public.aula_entrega_archivos FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
  REVOKE ALL ON public.aula_tareas,public.aula_entregas,public.aula_entrega_archivos FROM anon;
 END IF;
 IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
  REVOKE ALL ON public.aula_tareas,public.aula_entregas,public.aula_entrega_archivos FROM authenticated;
 END IF;
END $$;
COMMIT;
