-- Libro de calificaciones (0-20) y control de asistencias por sesion (cursos-service).
-- Idempotente. Ejecutar en la BD existente (p. ej. Supabase) antes de usar estas funciones:
--   psql -v ON_ERROR_STOP=1 -f database/migracion_notas_asistencias.sql
BEGIN;

CREATE TABLE IF NOT EXISTS calificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    ec1 DOUBLE PRECISION DEFAULT 0 CHECK (ec1 BETWEEN 0 AND 20),
    ec2 DOUBLE PRECISION DEFAULT 0 CHECK (ec2 BETWEEN 0 AND 20),
    proyecto_final DOUBLE PRECISION DEFAULT 0 CHECK (proyecto_final BETWEEN 0 AND 20),
    promedio_final DOUBLE PRECISION DEFAULT 0 CHECK (promedio_final BETWEEN 0 AND 20),
    condicion VARCHAR(30) DEFAULT 'EN_CURSO',
    feedback TEXT,
    actualizado_por UUID,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_calificacion_curso_estudiante UNIQUE (curso_id, estudiante_id)
);

CREATE TABLE IF NOT EXISTS asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    numero_sesion INTEGER NOT NULL CHECK (numero_sesion > 0),
    fecha_sesion VARCHAR(20) NOT NULL,
    tema_sesion VARCHAR(255),
    estado VARCHAR(5) NOT NULL CHECK (estado IN ('P', 'T', 'FJ', 'F')),
    observaciones TEXT,
    registrado_por UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_asistencia_curso_estudiante_sesion UNIQUE (curso_id, estudiante_id, numero_sesion)
);

CREATE INDEX IF NOT EXISTS idx_calificaciones_curso ON calificaciones(curso_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_curso_sesion ON asistencias(curso_id, numero_sesion);

COMMIT;
