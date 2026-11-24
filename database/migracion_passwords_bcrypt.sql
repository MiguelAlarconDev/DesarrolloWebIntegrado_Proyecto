-- =====================================================================================
-- Migracion unica: contrasenas legacy en texto plano -> BCrypt (compatible con Spring
-- BCryptPasswordEncoder, prefijo $2a$, coste 10).
--
--  * Idempotente: solo toca filas cuyo password_hash NO tiene formato BCrypt.
--  * Transaccional: si cualquier verificacion falla, RAISE EXCEPTION -> ROLLBACK completo.
--  * No modifica usuarios, roles, matriculas ni ninguna otra columna.
--  * Requiere la extension pgcrypto (en Supabase vive en el esquema "extensions").
--
-- Ejecucion (psql):  psql -v ON_ERROR_STOP=1 -f database/migracion_passwords_bcrypt.sql
-- Hacer un respaldo de (id, password_hash) ANTES de ejecutar.
-- =====================================================================================
\set ON_ERROR_STOP on

BEGIN;

SET LOCAL search_path = public, extensions;

-- 1. Copia temporal (solo dentro de esta transaccion) de las filas a migrar.
CREATE TEMP TABLE _pw_legacy ON COMMIT DROP AS
SELECT id, password_hash AS legacy
FROM usuarios
WHERE password_hash IS NOT NULL
  AND password_hash !~ '^\$2[aby]\$[0-9]{2}\$.{53}$';

-- 2. Conversion.
UPDATE usuarios u
SET password_hash = crypt(l.legacy, gen_salt('bf', 10))
FROM _pw_legacy l
WHERE u.id = l.id;

-- 3. Verificaciones; cualquier fallo aborta y revierte todo.
DO $$
DECLARE
    migradas      integer;
    pendientes    integer;
    no_coinciden  integer;
BEGIN
    SELECT count(*) INTO migradas FROM _pw_legacy;

    SELECT count(*) INTO pendientes
    FROM usuarios
    WHERE password_hash IS NULL OR password_hash !~ '^\$2[aby]\$[0-9]{2}\$.{53}$';

    SELECT count(*) INTO no_coinciden
    FROM usuarios u JOIN _pw_legacy l ON l.id = u.id
    WHERE crypt(l.legacy, u.password_hash) <> u.password_hash;

    IF pendientes > 0 THEN
        RAISE EXCEPTION 'Quedan % contrasenas sin formato BCrypt; se revierte.', pendientes;
    END IF;
    IF no_coinciden > 0 THEN
        RAISE EXCEPTION '% hashes no verifican contra su contrasena original; se revierte.', no_coinciden;
    END IF;

    RAISE NOTICE 'Migracion verificada: % contrasena(s) convertida(s) a BCrypt.', migradas;
END $$;

COMMIT;
