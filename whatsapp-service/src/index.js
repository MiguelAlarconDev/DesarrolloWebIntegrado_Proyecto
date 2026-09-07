const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8085;

app.use(express.json());

// Estado del cliente de WhatsApp
let isReady = false;

// Inicializar cliente de WhatsApp con persistencia de sesión
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
        headless: true,
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
    console.log('--- ESCANEA ESTE CÓDIGO QR EN WHATSAPP ---');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    isReady = true;
    console.log('✅ Cliente de WhatsApp listo y conectado.');
});

client.on('authenticated', () => {
    console.log('🔒 Sesión de WhatsApp autenticada correctamente.');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Error de autenticación en WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    isReady = false;
    console.log('⚠️ WhatsApp se desconectó:', reason);
});

client.initialize();

// Endpoint de verificación de salud (Health check)
app.get('/health', (req, res) => {
    res.json({
        status: isReady ? 'ONLINE' : 'OFFLINE',
        service: 'whatsapp-service'
    });
});

// Endpoint para enviar mensajes de texto
app.post('/api/whatsapp/send', async (req, res) => {
    if (!isReady) {
        return res.status(503).json({
            success: false,
            message: 'El servicio de WhatsApp aún no está listo o autenticado.'
        });
    }

    const { phone, message } = req.body;

    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            message: 'Se requieren los campos "phone" y "message".'
        });
    }

    try {
        // Formatear el número (Ejemplo Perú: 51912345678@c.us)
        let formattedPhone = phone.replace(/[^0-9]/g, '');
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
        console.error('Error al enviar mensaje:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al enviar el mensaje de WhatsApp.',
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Microservicio WhatsApp corriendo en el puerto ${PORT}`);
});