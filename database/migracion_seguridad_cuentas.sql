-- Columnas para el bloqueo de cuenta por intentos fallidos y el limite de intentos de 2FA.
-- Idempotente: se puede ejecutar varias veces. Necesaria en bases creadas antes de esta version
-- (por ejemplo la de Supabase). Hibernate tambien las crea si JPA_DDL_AUTO=update.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos INTEGER DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_2fa INTEGER DEFAULT 0;
