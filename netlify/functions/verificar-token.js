const crypto = require('crypto');

const GLOBAL_SECRET = process.env.TOKEN_SECRET || 'clave-maestra-global';

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

        // Decodificamos el payload para ver los metadatos del enlace
        const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));

        // Validamos si ya expiró por fecha
        if (Date.now() > payload.exp) {
            return { statusCode: 401, body: JSON.stringify({ valid: false, error: 'El enlace ha caducado' }) };
        }

        let secretToUse = GLOBAL_SECRET;

        // Si el token indica que es de larga duración, exigimos y combinamos la clave específica
        if (payload.longTerm) {
            const sanitizedProj = payload.project.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const longTermEnvVar = `TOKEN_SECRET_${sanitizedProj}_LARGO`;
            const projectLongSecret = process.env[longTermEnvVar];

            if (!projectLongSecret) {
                return { statusCode: 401, body: JSON.zIndex, body: JSON.stringify({ valid: false, error: 'Falta la clave de larga duración en el servidor' }) };
            }

            secretToUse = `${GLOBAL_SECRET}_${projectLongSecret}`;
        }

        // Recalculamos la firma matemática en el servidor
        const expectedSignature = crypto
            .createHmac('sha256', secretToUse)
            .update(payloadBase64)
            .digest('base64url');

        if (receivedSignature !== expectedSignature) {
            return { statusCode: 401, body: JSON.stringify({ valid: false, error: 'Firma inválida o alterada' }) };
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