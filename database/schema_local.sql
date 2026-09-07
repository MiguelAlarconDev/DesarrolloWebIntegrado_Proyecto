-- ============================================================================
-- BASE DE DATOS LOCAL: cursos_db (PostgreSQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Limpiar tablas en orden de dependencias
DROP TABLE IF EXISTS notificaciones CASCADE;
DROP TABLE IF EXISTS comprobantes CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;
DROP TABLE IF EXISTS cursos CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

-- 1. TABLA: USUARIOS (auth-service - RF-01, RF-02, RF-03)
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

-- 2. TABLA: CURSOS (Virtuales y presenciales)
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

-- 3. TABLA: PEDIDOS / MATRÍCULAS
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

-- 4. TABLA: COMPROBANTES (pedidos-service / billing - RF-15)
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

-- 5. TABLA: NOTIFICACIONES (WhatsApp y Correo)
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

-- ============================================================================
-- DATOS INICIALES DE PRUEBA (SEED DATA)
-- ============================================================================

-- Usuarios (password: '123456')
INSERT INTO usuarios (id, dni, nombres, apellidos, correo, whatsapp, password_hash, rol, is_2fa_enabled)
VALUES 
('a0000000-0000-0000-0000-000000000001', '10000001', 'Admin', 'General', 'admin@cursos.com', '+51999111222', '123456', 'ADMIN', TRUE),
('a0000000-0000-0000-0000-000000000002', '20000002', 'Roberto', 'Docente', 'docente@cursos.com', '+51999333444', '123456', 'DOCENTE', TRUE),
('a0000000-0000-0000-0000-000000000003', '30000003', 'Carlos', 'Estudiante', 'estudiante@cursos.com', '+51999555666', '123456', 'ESTUDIANTE', FALSE);

-- Cursos virtuales y presenciales
INSERT INTO cursos (id, titulo, descripcion, docente_id, fecha_inicio, fecha_fin, horario, modalidad, aforo_maximo, aforo_disponible, precio, enlace_clase, direccion_clase, aula, estado)
VALUES
('b0000000-0000-0000-0000-000000000001', 'Desarrollo Web Integrado con Spring Boot', 'Aprende microservicios y arquitectura en Java.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days', NOW() + INTERVAL '30 days', 'Lun y Mie 19:00 - 22:00', 'VIRTUAL', 30, 30, 150.00, 'https://meet.google.com/abc-defg-hij', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000002', 'Arquitectura Cloud en Java', 'Fundamentos de servicios distribuidos.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '5 days', NOW() + INTERVAL '35 days', 'Mar y Jue 20:00 - 22:00', 'VIRTUAL', 25, 25, 180.00, 'https://zoom.us/j/9876543210', NULL, NULL, 'PUBLICADO'),
('b0000000-0000-0000-0000-000000000003', 'Taller Presencial de Java y Microservicios', 'Practica en laboratorio con acompanamiento del docente.', 'a0000000-0000-0000-0000-000000000002', NOW() + INTERVAL '7 days', NOW() + INTERVAL '28 days', 'Sab 09:00 - 13:00', 'PRESENCIAL', 20, 20, 220.00, NULL, 'Av. Universitaria 1234, Lima', 'Laboratorio 204', 'PUBLICADO');
