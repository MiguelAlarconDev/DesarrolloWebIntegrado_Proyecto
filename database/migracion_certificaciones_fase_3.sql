-- Fase 3: emision de certificados academicos. MANUAL, despues de Aula Fase A, E2 y
-- Certificaciones Fase 2. Nunca se ejecuta automaticamente en Supabase.
-- No es idempotente por diseno: un segundo intento falla dentro de la transaccion sin cambios.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE public.certificados_academicos (
 id UUID PRIMARY KEY,
 codigo VARCHAR(32) NOT NULL UNIQUE CHECK (codigo ~ '^DWI-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$'),
 curso_id UUID NOT NULL REFERENCES public.cursos(id) ON DELETE RESTRICT,
 estudiante_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 aprobacion_id UUID NOT NULL REFERENCES public.aprobaciones_academicas(id) ON DELETE RESTRICT,
 -- Decision APROBADO concreta (fila inmutable del historial) sobre la que se emite.
 historial_id UUID NOT NULL REFERENCES public.aprobaciones_historial(id) ON DELETE RESTRICT,
 revision_academica BIGINT NOT NULL CHECK (revision_academica >= 0),
 evidencia_hash VARCHAR(64) NOT NULL CHECK (evidencia_hash ~ '^[0-9a-f]{64}$'),
 estudiante_nombre VARCHAR(300) NOT NULL CHECK (length(btrim(estudiante_nombre)) > 0),
 curso_titulo VARCHAR(300) NOT NULL CHECK (length(btrim(curso_titulo)) > 0),
 emitido_por UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 idempotencia UUID NOT NULL,
 fecha_emision TIMESTAMPTZ NOT NULL,
 object_key VARCHAR(500) NOT NULL UNIQUE CHECK (object_key LIKE 'certificados/%'),
 pdf_sha256 VARCHAR(64) NOT NULL CHECK (pdf_sha256 ~ '^[0-9a-f]{64}$'),
 tamano_bytes BIGINT NOT NULL CHECK (tamano_bytes BETWEEN 1 AND 10485760),
 estado VARCHAR(20) NOT NULL CHECK (estado IN ('PENDIENTE','EMITIDO','FALLIDO')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 version BIGINT NOT NULL DEFAULT 0 CHECK (version >= 0),
 UNIQUE (emitido_por, idempotencia)
);
-- Un solo certificado activo (en curso o emitido) por curso y estudiante: evita duplicados
-- incluso ante emisiones concurrentes o SQL directo.
CREATE UNIQUE INDEX certificados_activo_unico ON public.certificados_academicos(curso_id, estudiante_id)
 WHERE estado IN ('PENDIENTE','EMITIDO');
CREATE INDEX certificados_estudiante_idx ON public.certificados_academicos(estudiante_id, estado, fecha_emision);
CREATE INDEX certificados_fecha_idx ON public.certificados_academicos(created_at, id);

-- Solo se permite PENDIENTE -> EMITIDO | FALLIDO; el resto de columnas es inmutable.
CREATE FUNCTION public.proteger_certificado_academico() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 IF TG_OP = 'UPDATE' AND OLD.estado = 'PENDIENTE' AND NEW.estado IN ('EMITIDO','FALLIDO')
    AND (to_jsonb(NEW) - 'estado' - 'actualizado_en' - 'version') = (to_jsonb(OLD) - 'estado' - 'actualizado_en' - 'version') THEN
  RETURN NEW;
 END IF;
 RAISE EXCEPTION 'Certificado academico inmutable o transicion no permitida' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER certificado_academico_inmutable BEFORE UPDATE OR DELETE
 ON public.certificados_academicos FOR EACH ROW EXECUTE FUNCTION public.proteger_certificado_academico();
CREATE TRIGGER certificado_academico_no_truncate BEFORE TRUNCATE
 ON public.certificados_academicos FOR EACH STATEMENT EXECUTE FUNCTION public.proteger_certificado_academico();

-- Historial de eventos de emision (inmutable).
CREATE TABLE public.certificados_eventos (
 id UUID PRIMARY KEY,
 certificado_id UUID NOT NULL REFERENCES public.certificados_academicos(id) ON DELETE RESTRICT,
 evento VARCHAR(30) NOT NULL CHECK (evento IN ('EMISION_INICIADA','EMITIDO','FALLIDO')),
 actor UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
 detalle VARCHAR(500),
 fecha TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX certificados_eventos_cert_idx ON public.certificados_eventos(certificado_id, fecha, id);
CREATE FUNCTION public.proteger_evento_certificado() RETURNS trigger
 LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
 RAISE EXCEPTION 'El historial de certificados es inmutable' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER certificado_evento_inmutable BEFORE UPDATE OR DELETE
 ON public.certificados_eventos FOR EACH ROW EXECUTE FUNCTION public.proteger_evento_certificado();
CREATE TRIGGER certificado_evento_no_truncate BEFORE TRUNCATE
 ON public.certificados_eventos FOR EACH STATEMENT EXECUTE FUNCTION public.proteger_evento_certificado();

-- RLS sin politicas y privilegios revocados: solo el backend (propietario) accede.
ALTER TABLE public.certificados_academicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.certificados_academicos, public.certificados_eventos FROM PUBLIC;
REVOKE ALL ON FUNCTION public.proteger_certificado_academico(), public.proteger_evento_certificado() FROM PUBLIC;
DO $$
DECLARE r TEXT;
BEGIN
 FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
   EXECUTE format('REVOKE ALL ON public.certificados_academicos, public.certificados_eventos FROM %I', r);
   EXECUTE format('REVOKE ALL ON FUNCTION public.proteger_certificado_academico(), public.proteger_evento_certificado() FROM %I', r);
  END IF;
 END LOOP;
END $$;
COMMIT;
