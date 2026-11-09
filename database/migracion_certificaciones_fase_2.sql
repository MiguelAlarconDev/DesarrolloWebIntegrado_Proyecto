-- Manual, after Aula Fase A and E2. Never run automatically on Supabase.
-- Not idempotent by design: a second run fails inside the transaction and changes nothing.
BEGIN;
SET LOCAL lock_timeout = '5s';

-- ---------------------------------------------------------------------------
-- Monotonic academic revision per course. Every relevant change to tasks or
-- submissions (including grades) increments it, also for direct SQL writers.
-- Application writers lock this row FIRST (course -> task -> submission), so
-- coordination is per course instead of table-wide.
-- ---------------------------------------------------------------------------
CREATE TABLE public.curso_revision_academica (
 curso_id UUID PRIMARY KEY REFERENCES public.cursos(id) ON DELETE RESTRICT,
 revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0)
);

CREATE FUNCTION public.revision_academica_monotonica() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND NEW.curso_id = OLD.curso_id AND NEW.revision >= OLD.revision THEN
  RETURN NEW;
 END IF;
 RAISE EXCEPTION 'La revision academica es monotonica y no puede reducirse ni eliminarse' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER revision_academica_monotonica BEFORE UPDATE OR DELETE
 ON public.curso_revision_academica FOR EACH ROW EXECUTE FUNCTION public.revision_academica_monotonica();
CREATE TRIGGER revision_academica_no_truncate BEFORE TRUNCATE
 ON public.curso_revision_academica FOR EACH STATEMENT EXECUTE FUNCTION public.revision_academica_monotonica();

CREATE FUNCTION public.incrementar_revision_academica(p_curso UUID) RETURNS void
 LANGUAGE sql SET search_path = pg_catalog AS $$
 INSERT INTO public.curso_revision_academica(curso_id, revision) VALUES (p_curso, 1)
 ON CONFLICT (curso_id) DO UPDATE SET revision = public.curso_revision_academica.revision + 1;
$$;

CREATE FUNCTION public.revision_por_tarea() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE c UUID;
BEGIN
 IF TG_OP <> 'INSERT' THEN
  SELECT m.curso_id INTO c FROM public.curso_modulos m WHERE m.id = OLD.modulo_id;
  IF c IS NOT NULL THEN PERFORM public.incrementar_revision_academica(c); END IF;
 END IF;
 IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.modulo_id IS DISTINCT FROM OLD.modulo_id) THEN
  SELECT m.curso_id INTO c FROM public.curso_modulos m WHERE m.id = NEW.modulo_id;
  IF c IS NOT NULL THEN PERFORM public.incrementar_revision_academica(c); END IF;
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER revision_academica_tareas AFTER INSERT OR UPDATE OR DELETE
 ON public.aula_tareas FOR EACH ROW EXECUTE FUNCTION public.revision_por_tarea();

CREATE FUNCTION public.revision_por_entrega() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
DECLARE c UUID;
BEGIN
 IF TG_OP <> 'INSERT' THEN
  SELECT m.curso_id INTO c FROM public.aula_tareas t JOIN public.curso_modulos m ON m.id = t.modulo_id WHERE t.id = OLD.tarea_id;
  IF c IS NOT NULL THEN PERFORM public.incrementar_revision_academica(c); END IF;
 END IF;
 IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW.tarea_id IS DISTINCT FROM OLD.tarea_id) THEN
  SELECT m.curso_id INTO c FROM public.aula_tareas t JOIN public.curso_modulos m ON m.id = t.modulo_id WHERE t.id = NEW.tarea_id;
  IF c IS NOT NULL THEN PERFORM public.incrementar_revision_academica(c); END IF;
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER revision_academica_entregas AFTER INSERT OR UPDATE OR DELETE
 ON public.aula_entregas FOR EACH ROW EXECUTE FUNCTION public.revision_por_entrega();

-- ---------------------------------------------------------------------------
-- Academic decisions and immutable history.
-- ---------------------------------------------------------------------------
CREATE TABLE public.aprobaciones_academicas (
 id UUID PRIMARY KEY,
 curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
 estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 version BIGINT NOT NULL CHECK (version >= 0),
 UNIQUE(curso_id, estudiante_id)
);
CREATE TABLE public.aprobaciones_historial (
 id UUID PRIMARY KEY,
 aprobacion_id UUID NOT NULL REFERENCES public.aprobaciones_academicas(id) ON DELETE RESTRICT,
 version BIGINT NOT NULL CHECK (version >= 0),
 docente_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 decision VARCHAR(20) NOT NULL CHECK (decision IN ('APROBADO','NO_APROBADO','REVOCADO')),
 justificacion TEXT NOT NULL CHECK (length(btrim(justificacion)) BETWEEN 1 AND 20000),
 fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 -- Display copy (includes explanatory texts); NOT part of the hash.
 evidencia JSONB NOT NULL CHECK (jsonb_typeof(evidencia) = 'object'),
 -- Canonical, versioned evidence; the hash is verified by PostgreSQL itself.
 revision_academica BIGINT NOT NULL CHECK (revision_academica >= 0),
 evidencia_canonica TEXT NOT NULL CHECK (evidencia_canonica LIKE '{"esquema":"evidencia-academica/v2",%'),
 evidencia_hash VARCHAR(64) NOT NULL CHECK (evidencia_hash ~ '^[0-9a-f]{64}$'),
 idempotencia UUID NOT NULL,
 solicitud_hash VARCHAR(64) NOT NULL CHECK (solicitud_hash ~ '^[0-9a-f]{64}$'),
 UNIQUE(aprobacion_id,version),
 UNIQUE(docente_id,idempotencia),
 CONSTRAINT evidencia_hash_canonico CHECK (evidencia_hash = encode(sha256(convert_to(evidencia_canonica, 'UTF8')), 'hex'))
);
-- The current revision must exist at commit, including initial creation.
ALTER TABLE public.aprobaciones_academicas ADD CONSTRAINT aprobacion_revision_fk
 FOREIGN KEY(id,version) REFERENCES public.aprobaciones_historial(aprobacion_id,version)
 DEFERRABLE INITIALLY DEFERRED;
CREATE FUNCTION public.proteger_historial_academico() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'El historial academico es inmutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER historial_academico_inmutable BEFORE UPDATE OR DELETE
 ON public.aprobaciones_historial FOR EACH ROW EXECUTE FUNCTION public.proteger_historial_academico();
CREATE TRIGGER historial_academico_no_truncate BEFORE TRUNCATE
 ON public.aprobaciones_historial FOR EACH STATEMENT EXECUTE FUNCTION public.proteger_historial_academico();

-- ---------------------------------------------------------------------------
-- RLS and privileges: backend-only (table owner). No public policies.
-- Supabase grants default privileges to anon/authenticated on new objects:
-- revoke them explicitly (tables and functions).
-- ---------------------------------------------------------------------------
ALTER TABLE public.curso_revision_academica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobaciones_academicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aprobaciones_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.curso_revision_academica,public.aprobaciones_academicas,public.aprobaciones_historial FROM PUBLIC;
REVOKE ALL ON FUNCTION public.incrementar_revision_academica(UUID), public.revision_por_tarea(),
 public.revision_por_entrega(), public.revision_academica_monotonica(), public.proteger_historial_academico() FROM PUBLIC;
DO $$
DECLARE r TEXT;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
   EXECUTE format('REVOKE ALL ON public.curso_revision_academica, public.aprobaciones_academicas, public.aprobaciones_historial FROM %I', r);
   EXECUTE format('REVOKE ALL ON FUNCTION public.incrementar_revision_academica(UUID), public.revision_por_tarea(), public.revision_por_entrega(), public.revision_academica_monotonica(), public.proteger_historial_academico() FROM %I', r);
  END IF;
 END LOOP;
END $$;
COMMIT;
