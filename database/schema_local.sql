-- ============================================================================
-- BASE DE DATOS ESTÁNDAR: cursos_db (PostgreSQL 15+)
-- Proyecto: Sistema Integrado de Gestión de Cursos y Matrículas
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. LIMPIEZA DE ESTRUCTURA PREVIA (EN ORDEN DE DEPENDENCIAS)
-- ----------------------------------------------------------------------------
DROP VIEW IF EXISTS v_matriculas_detalle CASCADE;
DROP VIEW IF EXISTS v_reporte_cursos CASCADE;
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS comprobantes CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- ----------------------------------------------------------------------------
-- 2. TABLA: USUARIOS (Módulo de Autenticación, Roles y Seguridad)
-- ----------------------------------------------------------------------------
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni VARCHAR(15) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    correo VARCHAR(150) UNIQUE NOT NULL,
    whatsapp VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL CHECK (rol IN ('ADMIN', 'DOCENTE', 'ESTUDIANTE')),
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    codigo_2fa VARCHAR(10),
    codigo_2fa_expira_en TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 3. TABLA: CURSOS (Catálogo Académico Virtual y Presencial)
-- ----------------------------------------------------------------------------
CREATE TABLE cursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    docente_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fecha_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    horario VARCHAR(100) NOT NULL,
    modalidad VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL' CHECK (modalidad IN ('VIRTUAL', 'PRESENCIAL')),
    aforo_maximo INT NOT NULL CHECK (aforo_maximo > 0),
    aforo_disponible INT NOT NULL CHECK (aforo_disponible >= 0),
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    enlace_clase VARCHAR(500),
    direccion_clase VARCHAR(300),
    aula VARCHAR(100),
    estado VARCHAR(20) DEFAULT 'PUBLICADO' CHECK (estado IN ('BORRADOR', 'PUBLICADO', 'FINALIZADO')),
    CHECK (
        (modalidad = 'VIRTUAL' AND enlace_clase IS NOT NULL AND direccion_clase IS NULL)
        OR
        (modalidad = 'PRESENCIAL' AND direccion_clase IS NOT NULL)
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. TABLA: PEDIDOS / MATRÍCULAS (Módulo de Compras, Pagos y Reservas)
-- ----------------------------------------------------------------------------
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_orden VARCHAR(30) UNIQUE NOT NULL,
    estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    curso_id UUID NOT NULL REFERENCES cursos(id) ON DELETE RESTRICT,
    monto NUMERIC(10, 2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'REGISTRADO' 
        CHECK (estado IN ('REGISTRADO', 'PENDIENTE_PAGO', 'PAGADO', 'CONFIRMADO', 'CANCELADO')),
    mp_preference_id VARCHAR(100),
    mp_payment_id VARCHAR(100),
    reserva_expira_en TIMESTAMP WITH TIME ZONE,
    fecha_registro TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. TABLA: COMPROBANTES (Facturación Electrónica Estándar SUNAT B001/F001)
-- ----------------------------------------------------------------------------
CREATE TABLE comprobantes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID UNIQUE NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    serie VARCHAR(5) NOT NULL,
    numero_correlativo INT NOT NULL,
    tipo_comprobante VARCHAR(20) NOT NULL CHECK (tipo_comprobante IN ('BOLETA', 'FACTURA')),
    monto_subtotal NUMERIC(10, 2) NOT NULL,
    monto_igv NUMERIC(10, 2) NOT NULL,
    monto_total NUMERIC(10, 2) NOT NULL,
    ruc_cliente VARCHAR(11),
    razon_social VARCHAR(200),
    pdf_url VARCHAR(500),
    estado_email VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado_email IN ('PENDIENTE', 'ENVIADO', 'FALLIDO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(serie, numero_correlativo)
);

-- ----------------------------------------------------------------------------
-- 6. TABLA: NOTIFICACIONES (Alertas de Matrícula por WhatsApp y Email)
-- ----------------------------------------------------------------------------
CREATE TABLE notificaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
    canal VARCHAR(20) NOT NULL CHECK (canal IN ('WHATSAPP', 'EMAIL')),
    destinatario VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('BIENVENIDA', 'RECORDATORIO_24H', 'REINTENTO_MANUAL')),
    mensaje TEXT NOT NULL,
    estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ENVIADO', 'FALLIDO', 'EN_DLQ')),
    intentos INT DEFAULT 0,
    ultimo_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 7. ÍNDICES DE ALTO RENDIMIENTO (FOREIGN KEYS Y CONSULTAS FRECUENTES)
-- ----------------------------------------------------------------------------
CREATE INDEX idx_pedidos_estudiante ON pedidos(estudiante_id);
CREATE INDEX idx_pedidos_curso ON pedidos(curso_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_fecha_registro ON pedidos(fecha_registro DESC);

CREATE INDEX idx_cursos_docente ON cursos(docente_id);
CREATE INDEX idx_cursos_estado ON cursos(estado);
CREATE INDEX idx_cursos_modalidad ON cursos(modalidad);

CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_is_active ON usuarios(is_active);

CREATE INDEX idx_comprobantes_pedido ON comprobantes(pedido_id);
CREATE INDEX idx_comprobantes_serie_num ON comprobantes(serie, numero_correlativo);

CREATE INDEX idx_notificaciones_pedido ON notificaciones(pedido_id);
CREATE INDEX idx_notificaciones_estado ON notificaciones(estado);

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS Y FUNCIONES DE INTEGRIDAD
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pedidos_actualizar_fecha ON pedidos;
CREATE TRIGGER trg_pedidos_actualizar_fecha
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION fn_actualizar_fecha_modificacion();

-- ----------------------------------------------------------------------------
-- 9. VISTAS ESTÁNDAR PARA REPORTES Y CONSULTAS RÁPIDAS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_matriculas_detalle AS
SELECT 
    p.id AS pedido_id,
    p.codigo_orden,
    p.monto,
    p.estado AS estado_pedido,
    p.fecha_registro AS fecha_matricula,
    u.id AS estudiante_id,
    u.nombres AS estudiante_nombres,
    u.apellidos AS estudiante_apellidos,
    CONCAT(u.nombres, ' ', u.apellidos) AS estudiante_nombre_completo,
    u.dni AS estudiante_dni,
    u.correo AS estudiante_correo,
    u.whatsapp AS estudiante_whatsapp,
    c.id AS curso_id,
    c.titulo AS curso_titulo,
    c.modalidad AS curso_modalidad,
    c.horario AS curso_horario,
    c.aula AS curso_aula,
    c.enlace_clase,
    c.direccion_clase,
    d.id AS docente_id,
    CONCAT(d.nombres, ' ', d.apellidos) AS docente_nombre_completo,
    d.correo AS docente_correo,
    comp.serie AS comprobante_serie,
    comp.numero_correlativo AS comprobante_correlativo,
    CONCAT(comp.serie, '-', LPAD(comp.numero_correlativo::text, 6, '0')) AS comprobante_codigo,
    comp.tipo_comprobante,
    comp.monto_subtotal,
    comp.monto_igv,
    comp.monto_total
FROM pedidos p
JOIN usuarios u ON p.estudiante_id = u.id
JOIN cursos c ON p.curso_id = c.id
JOIN usuarios d ON c.docente_id = d.id
LEFT JOIN comprobantes comp ON comp.pedido_id = p.id;

CREATE OR REPLACE VIEW v_reporte_cursos AS
SELECT 
    c.id AS curso_id,
    c.titulo,
    c.modalidad,
    c.precio,
    c.aforo_maximo,
    c.aforo_disponible,
    (c.aforo_maximo - c.aforo_disponible) AS vacantes_ocupadas,
    ROUND(((c.aforo_maximo - c.aforo_disponible)::numeric / c.aforo_maximo::numeric) * 100, 1) AS porcentaje_ocupacion,
    CONCAT(d.nombres, ' ', d.apellidos) AS docente_nombre,
    d.correo AS docente_correo,
    COALESCE(SUM(p.monto) FILTER (WHERE p.estado = 'PAGADO'), 0.00) AS total_recaudado
FROM cursos c
JOIN usuarios d ON c.docente_id = d.id
LEFT JOIN pedidos p ON p.curso_id = c.id AND p.estado = 'PAGADO'
GROUP BY c.id, c.titulo, c.modalidad, c.precio, c.aforo_maximo, c.aforo_disponible, d.nombres, d.apellidos, d.correo;

-- ----------------------------------------------------------------------------
-- 10. DATOS INICIALES ESTÁNDAR (SEED DATA REALISTA)
-- ----------------------------------------------------------------------------

-- Usuarios de Gestión (Admin y Docentes)
INSERT INTO usuarios (id, dni, nombres, apellidos, correo, whatsapp, password_hash, rol, is_2fa_enabled)
VALUES 
('a0000000-0000-0000-0000-000000000001', '10000001', 'Admin', 'General', 'admin@cursos.com', '+51999111222', '123456', 'ADMIN', TRUE),
('a0000000-0000-0000-0000-000000000002', '20000002', 'Roberto', 'Docente', 'docente@cursos.com', '+51999333444', '123456', 'DOCENTE', TRUE),
('a0000000-0000-0000-0000-000000000003', '30000003', 'Carlos', 'Alarcón', 'estudiante@cursos.com', '+51999555666', '123456', 'ESTUDIANTE', FALSE);

-- Estudiantes Reales Adicionales
INSERT INTO usuarios (id, dni, nombres, apellidos, correo, whatsapp, password_hash, rol, is_active)
VALUES
('c1000000-0000-0000-0000-000000000001', '72481930', 'Luciana Valeria', 'Morales Quispe', 'lmorales@pucp.edu.pe', '+51984210355', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000002', '71928374', 'Mateo Alejandro', 'Huamán Flores', 'mateo.huaman@uni.pe', '+51975412890', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000003', '73819204', 'Camila Alejandra', 'Vargas Mendoza', 'camila.vargas@utp.edu.pe', '+51963258741', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000004', '70582914', 'Diego Alonso', 'Salazar Paredes', 'diego.salazar@unmsm.edu.pe', '+51951753951', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000005', '74102938', 'Valeria Sofía', 'Castro Benítez', 'valeria.castro@upc.pe', '+51942852174', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000006', '75920184', 'Rodrigo Sebastián', 'Espinoza Torres', 'rodrigo.espinoza@gmail.com', '+51936985214', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000007', '76192830', 'Andrea Jimena', 'Navarro Ramos', 'andrea.navarro@outlook.com', '+51925874136', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000008', '77291048', 'Gabriel Eduardo', 'Rivas Castillo', 'gabriel.rivas@hotmail.com', '+51914785236', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000009', '78392015', 'Claudia María', 'Mendoza Ríos', 'claudia.mendoza@gmail.com', '+51998521470', '123456', 'ESTUDIANTE', true),
('c1000000-0000-0000-0000-000000000010', '79482016', 'Renzo Martín', 'Chávez Gómez', 'renzo.chavez@gmail.com', '+51987412589', '123456', 'ESTUDIANTE', true);

-- Cursos en Catálogo
INSERT INTO cursos (id, titulo, descripcion, docente_id, fecha_inicio, fecha_fin, horario, modalidad, aforo_maximo, aforo_disponible, precio, enlace_clase, direccion_clase, aula, estado)
VALUES
('b0000000-0000-0000-0000-000000000001', 'Desarrollo Web Integrado con Spring Boot', 'Aprende arquitectura hexagonal, seguridad JWT, JPA y microservicios en Java.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days', NOW() + INTERVAL '30 days', 'Lun y Mie 19:00 - 22:00', 'VIRTUAL', 30, 15, 150.00, 'https://meet.google.com/abc-defg-hij', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000002', 'Arquitectura Cloud en Java', 'Diseño de aplicaciones distribuidas con Spring Cloud, resiliencia y Docker.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days', NOW() + INTERVAL '35 days', 'Mar y Jue 20:00 - 22:00', 'VIRTUAL', 25, 20, 180.00, 'https://zoom.us/j/9876543210', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000003', 'Taller Presencial de Java y Microservicios', 'Práctica en laboratorio con desarrollo de casos empresariales de alta concurrencia.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '7 days', NOW() + INTERVAL '28 days', 'Sab 09:00 - 13:00', 'PRESENCIAL', 20, 16, 220.00, NULL, 'Av. Universitaria 1234, Lima', 'Laboratorio 204', 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000004', 'DevOps, Docker & Kubernetes para Desarrolladores', 'Automatización de despliegues, pipelines CI/CD y orquestación de contenedores.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days', NOW() + INTERVAL '32 days', 'Vie 19:00 - 22:00 y Sab 15:00 - 18:00', 'VIRTUAL', 25, 21, 190.00, 'https://meet.google.com/devops-k8s-live', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000005', 'Frontend Moderno con React, Next.js y TypeScript', 'Desarrollo de interfaces reactivas, renderizado SSR, gestión de estado y REST.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '4 days', NOW() + INTERVAL '34 days', 'Lun y Mie 20:00 - 22:30', 'VIRTUAL', 30, 25, 160.00, 'https://zoom.us/j/1234567890', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000006', 'Taller Presencial de Ciberseguridad y Ethical Hacking', 'Laboratorio práctico de auditoría de seguridad, defensa y ethical hacking.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '6 days', NOW() + INTERVAL '27 days', 'Dom 09:00 - 14:00', 'PRESENCIAL', 20, 16, 240.00, NULL, 'Av. Universitaria 1234, Lima', 'Laboratorio de Ciberseguridad 301', 'PUBLICADO');


-- ----------------------------------------------------------------------------
-- 11. MATRÍCULAS Y COMPROBANTES DE PAGO INICIALES (37 REGISTROS)
-- ----------------------------------------------------------------------------
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000101', 'ORD-20261000101', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 150.00, 'PAGADO', 'MP-REAL-000101', '2026-10-18 10:15:00', '2026-10-18 10:15:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000101', 'd1000000-0000-0000-0000-000000000101', 'B001', 2002, 'BOLETA', 127.12, 22.88, 150.00, '2026-10-18 10:15:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000102', 'ORD-20261000102', 'c1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 160.00, 'PAGADO', 'MP-REAL-000102', '2026-10-19 14:20:00', '2026-10-19 14:20:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000102', 'd1000000-0000-0000-0000-000000000102', 'B001', 2003, 'BOLETA', 135.59, 24.41, 160.00, '2026-10-19 14:20:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000103', 'ORD-20261000103', 'c1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 150.00, 'PAGADO', 'MP-REAL-000103', '2026-10-18 11:30:00', '2026-10-18 11:30:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000103', 'd1000000-0000-0000-0000-000000000103', 'B001', 2004, 'BOLETA', 127.12, 22.88, 150.00, '2026-10-18 11:30:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000104', 'ORD-20261000104', 'c1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 190.00, 'PAGADO', 'MP-REAL-000104', '2026-10-20 09:45:00', '2026-10-20 09:45:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000104', 'd1000000-0000-0000-0000-000000000104', 'B001', 2005, 'BOLETA', 161.02, 28.98, 190.00, '2026-10-20 09:45:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000105', 'ORD-20261000105', 'c1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 180.00, 'PAGADO', 'MP-REAL-000105', '2026-10-21 16:10:00', '2026-10-21 16:10:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000105', 'd1000000-0000-0000-0000-000000000105', 'B001', 2006, 'BOLETA', 152.54, 27.46, 180.00, '2026-10-21 16:10:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000106', 'ORD-20261000106', 'c1000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 160.00, 'PAGADO', 'MP-REAL-000106', '2026-10-22 11:00:00', '2026-10-22 11:00:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000106', 'd1000000-0000-0000-0000-000000000106', 'B001', 2007, 'BOLETA', 135.59, 24.41, 160.00, '2026-10-22 11:00:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000107', 'ORD-20261000107', 'c1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000003', 220.00, 'PAGADO', 'MP-REAL-000107', '2026-10-22 17:40:00', '2026-10-22 17:40:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000107', 'd1000000-0000-0000-0000-000000000107', 'B001', 2008, 'BOLETA', 186.44, 33.56, 220.00, '2026-10-22 17:40:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000108', 'ORD-20261000108', 'c1000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000006', 240.00, 'PAGADO', 'MP-REAL-000108', '2026-10-23 15:30:00', '2026-10-23 15:30:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000108', 'd1000000-0000-0000-0000-000000000108', 'B001', 2009, 'BOLETA', 203.39, 36.61, 240.00, '2026-10-23 15:30:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000109', 'ORD-20261000109', 'c1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 150.00, 'PAGADO', 'MP-REAL-000109', '2026-10-23 08:20:00', '2026-10-23 08:20:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000109', 'd1000000-0000-0000-0000-000000000109', 'B001', 2010, 'BOLETA', 127.12, 22.88, 150.00, '2026-10-23 08:20:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000110', 'ORD-20261000110', 'c1000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 180.00, 'PAGADO', 'MP-REAL-000110', '2026-10-23 18:00:00', '2026-10-23 18:00:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000110', 'd1000000-0000-0000-0000-000000000110', 'B001', 2011, 'BOLETA', 152.54, 27.46, 180.00, '2026-10-23 18:00:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000111', 'ORD-20261000111', 'c1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000004', 190.00, 'PAGADO', 'MP-REAL-000111', '2026-10-23 12:15:00', '2026-10-23 12:15:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000111', 'd1000000-0000-0000-0000-000000000111', 'B001', 2012, 'BOLETA', 161.02, 28.98, 190.00, '2026-10-23 12:15:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000112', 'ORD-20261000112', 'c1000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000006', 240.00, 'PAGADO', 'MP-REAL-000112', '2026-10-24 09:30:00', '2026-10-24 09:30:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000112', 'd1000000-0000-0000-0000-000000000112', 'B001', 2013, 'BOLETA', 203.39, 36.61, 240.00, '2026-10-24 09:30:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000113', 'ORD-20261000113', 'c1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 220.00, 'PAGADO', 'MP-REAL-000113', '2026-10-24 10:05:00', '2026-10-24 10:05:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000113', 'd1000000-0000-0000-0000-000000000113', 'B001', 2014, 'BOLETA', 186.44, 33.56, 220.00, '2026-10-24 10:05:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000114', 'ORD-20261000114', 'c1000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000005', 160.00, 'PAGADO', 'MP-REAL-000114', '2026-10-24 10:45:00', '2026-10-24 10:45:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000114', 'd1000000-0000-0000-0000-000000000114', 'B001', 2015, 'BOLETA', 135.59, 24.41, 160.00, '2026-10-24 10:45:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000115', 'ORD-20261000115', 'c1000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 180.00, 'PAGADO', 'MP-REAL-000115', '2026-10-23 20:30:00', '2026-10-23 20:30:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000115', 'd1000000-0000-0000-0000-000000000115', 'B001', 2016, 'BOLETA', 152.54, 27.46, 180.00, '2026-10-23 20:30:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000116', 'ORD-20261000116', 'c1000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000004', 190.00, 'PAGADO', 'MP-REAL-000116', '2026-10-24 11:00:00', '2026-10-24 11:00:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000116', 'd1000000-0000-0000-0000-000000000116', 'B001', 2017, 'BOLETA', 161.02, 28.98, 190.00, '2026-10-24 11:00:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000117', 'ORD-20261000117', 'c1000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000001', 150.00, 'PAGADO', 'MP-REAL-000117', '2026-10-24 08:50:00', '2026-10-24 08:50:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000117', 'd1000000-0000-0000-0000-000000000117', 'B001', 2018, 'BOLETA', 127.12, 22.88, 150.00, '2026-10-24 08:50:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000118', 'ORD-20261000118', 'c1000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000005', 160.00, 'PAGADO', 'MP-REAL-000118', '2026-10-24 11:20:00', '2026-10-24 11:20:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000118', 'd1000000-0000-0000-0000-000000000118', 'B001', 2019, 'BOLETA', 135.59, 24.41, 160.00, '2026-10-24 11:20:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000119', 'ORD-20261000119', 'c1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000003', 220.00, 'PAGADO', 'MP-REAL-000119', '2026-10-24 09:10:00', '2026-10-24 09:10:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000119', 'd1000000-0000-0000-0000-000000000119', 'B001', 2020, 'BOLETA', 186.44, 33.56, 220.00, '2026-10-24 09:10:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
INSERT INTO pedidos (id, codigo_orden, estudiante_id, curso_id, monto, estado, mp_payment_id, fecha_registro, fecha_actualizacion)
        VALUES ('d1000000-0000-0000-0000-000000000120', 'ORD-20261000120', 'c1000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000006', 240.00, 'PAGADO', 'MP-REAL-000120', '2026-10-24 11:15:00', '2026-10-24 11:15:00')
        ON CONFLICT (id) DO UPDATE SET
            estado = 'PAGADO',
            fecha_registro = EXCLUDED.fecha_registro;
INSERT INTO comprobantes (id, pedido_id, serie, numero_correlativo, tipo_comprobante, monto_subtotal, monto_igv, monto_total, created_at)
        VALUES ('e1000000-0000-0000-0000-000000000120', 'd1000000-0000-0000-0000-000000000120', 'B001', 2021, 'BOLETA', 203.39, 36.61, 240.00, '2026-10-24 11:15:00')
        ON CONFLICT (pedido_id) DO UPDATE SET
            numero_correlativo = EXCLUDED.numero_correlativo,
            monto_total = EXCLUDED.monto_total;
UPDATE cursos c
SET aforo_disponible = GREATEST(0, c.aforo_maximo - (
    SELECT COUNT(*) FROM pedidos p WHERE p.curso_id = c.id AND p.estado = 'PAGADO'
));