const crypto = require('crypto');

// Usamos una clave secreta interna del servidor (Netlify la lee de sus variables de entorno)
const SECRET_KEY = process.env.TOKEN_SECRET || 'clave-secreta-super-segura-cambiar-en-produccion';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { project, exp } = JSON.parse(event.body);

        if (!project || !exp) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos obligatorios' }) };
        }

        // Estructura de datos que viaja en el token
        const payload = { project, exp };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

        // Generamos una firma HMAC-SHA256 inalterable
        const signature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(payloadBase64)
            .digest('base64url');

        // El token final une los datos + un punto + la firma criptográfica
        const token = `${payloadBase64}.${signature}`;

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error interno al generar el token' }) };
    }
}