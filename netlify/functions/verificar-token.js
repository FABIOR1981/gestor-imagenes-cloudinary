const crypto = require('crypto');

const SECRET_KEY = process.env.TOKEN_SECRET || 'clave-secreta-super-segura-cambiar-en-produccion';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { token } = JSON.parse(event.body);

        if (!token || !token.includes('.')) {
            return { statusCode: 400, body: JSON.stringify({ valid: false, error: 'Token mal formado' }) };
        }

        const [payloadBase64, receivedSignature] = token.split('.');

        // Recalculamos la firma en el servidor con la misma clave secreta
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(payloadBase64)
            .digest('base64url');

        // Validamos que la firma coincida matemáticamente (evita manipulaciones)
        if (receivedSignature !== expectedSignature) {
            return { statusCode: 401, body: JSON.stringify({ valid: false, error: 'Firma inválida o alterada' }) };
        }

        // Decodificamos el payload
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

        // Verificamos si ya expiró la fecha
        if (Date.now() > payload.exp) {
            return { statusCode: 401, body: JSON.stringify({ valid: false, error: 'El enlace ha caducado' }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valid: true, project: payload.project, exp: payload.exp })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ valid: false, error: 'Error al procesar la verificación' }) };
    }
}