const express = require('express');
const crypto = require('crypto');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8085;

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Capa de seguridad: solo acepta llamadas de otros microservicios (cabecera X-Internal-Key).
// Si INTERNAL_API_KEY no esta definida (desarrollo local) no se exige.
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';
function requireInternalKey(req, res, next) {
    if (!INTERNAL_API_KEY) return next();
    const provided = Buffer.from(req.get('X-Internal-Key') || '');
    const expected = Buffer.from(INTERNAL_API_KEY);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        return res.status(401).json({ success: false, message: 'Acceso solo a traves del gateway' });
    }
    return next();
}

// Ultimo codigo QR pendiente (para vincular el telefono desde el panel ADMIN en la nube)
let lastQr = null;

// Estado del cliente de WhatsApp
let isReady = false;

// Inicializar cliente de WhatsApp con persistencia de sesión
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: process.env.WWEBJS_DATA_PATH || './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Mostrar código QR en la consola al iniciar por primera vez
client.on('qr', (qr) => {
    lastQr = qr;
    console.log('--- ESCANEA ESTE CÓDIGO QR EN WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    lastQr = null;
    console.log('✅ Cliente de WhatsApp listo y conectado.');
});

client.on('authenticated', () => {
    console.log('🔒 Sesión de WhatsApp autenticada correctamente.');
});

client.on('auth_failure', (msg) => {
    isReady = false;
    console.error('Error de autenticacion en WhatsApp.');
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.log('⚠️ WhatsApp se desconectó:', reason);
});

// Una sesion invalida (LOGOUT) o un fallo de Chromium no debe tumbar la API HTTP:
// el servicio sigue respondiendo /health con OFFLINE hasta que se escanee un QR nuevo.
if (typeof process.on === 'function') {
    process.on('unhandledRejection', () => {
        isReady = false;
        console.error('Cliente de WhatsApp no disponible; se requiere nueva vinculacion por QR.');
    });
}

Promise.resolve(client.initialize()).catch(() => {
    isReady = false;
    console.error('No se pudo inicializar el cliente de WhatsApp.');
});

// Endpoint de verificación de salud (Health check)
app.get('/health', (req, res) => {
    // Siempre 200 para que el orquestador no reinicie el contenedor mientras se escanea el QR
    res.json({
        status: isReady ? 'ONLINE' : 'OFFLINE',
        service: 'whatsapp-service'
    });
});

// Estado y QR pendiente (via gateway, solo ADMIN): GET /api/whatsapp/estado
app.get('/api/whatsapp/estado', requireInternalKey, (req, res) => {
    res.json({ conectado: isReady, qrPendiente: lastQr });
});

// Endpoint para enviar mensajes de texto
app.post('/api/whatsapp/send', requireInternalKey, async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            message: 'El servicio de WhatsApp aún no está listo o autenticado.'
        });
    }

    const { phone, message } = req.body || {};

    if (typeof phone !== 'string' || typeof message !== 'string' || !phone.trim() || !message.trim() || message.length > 1000) {
        return res.status(400).json({
            success: false,
            message: 'Se requieren los campos "phone" y "message".'
        });
    }

    try {
        // Formatear el número (Ejemplo Perú: 51912345678@c.us)
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (formattedPhone.length < 10 || formattedPhone.length > 15) {
            return res.status(400).json({ success: false, message: 'Telefono internacional no valido.' });
        }
        if (!formattedPhone.endsWith('@c.us')) {
            formattedPhone = `${formattedPhone}@c.us`;
        }

        await client.sendMessage(formattedPhone, message);

        return res.status(200).json({
            success: true,
            message: 'Mensaje enviado con éxito.',
            to: phone
        });
    } catch (error) {
        // Provider exceptions may include message bodies (including OTP).
        console.error('No se pudo confirmar el envio de WhatsApp.');
        return res.status(500).json({
            success: false,
            message: 'Error al enviar el mensaje de WhatsApp.'
        });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Microservicio WhatsApp corriendo en el puerto ${PORT}`);
});
