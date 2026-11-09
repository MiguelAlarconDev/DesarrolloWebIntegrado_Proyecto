package com.cursos.aula.tareas;

/**
 * Coordinacion transaccional por curso para TODOS los escritores academicos.
 *
 * Orden de bloqueo uniforme (evita deadlocks):
 *   1. fila de curso_revision_academica (este SQL, siempre la primera sentencia que bloquea)
 *   2. tarea (FOR UPDATE)
 *   3. entrega / archivo
 * Las decisiones academicas y la verificacion de emision toman solo el paso 1 y luego leen.
 * La revision la incrementan triggers de PostgreSQL ante cualquier cambio de tareas o
 * entregas (tambien SQL directo); aqui solo se adquiere el bloqueo sin incrementar.
 * Los cursos distintos no se bloquean entre si.
 */
public final class CoordinacionAcademica {
    private CoordinacionAcademica() {}

    /** Bloquea (creandola si falta) la fila de revision del curso y devuelve la revision vigente. */
    public static final String BLOQUEAR_CURSO = """
        INSERT INTO public.curso_revision_academica(curso_id, revision) VALUES (:curso, 0)
        ON CONFLICT (curso_id) DO UPDATE SET revision = public.curso_revision_academica.revision
        RETURNING revision
        """;

    /** Lectura sin bloqueo; un curso sin cambios registrados tiene revision 0. */
    public static final String REVISION_ACTUAL = """
        SELECT coalesce((SELECT revision FROM public.curso_revision_academica WHERE curso_id = :curso), 0)
        """;
}
