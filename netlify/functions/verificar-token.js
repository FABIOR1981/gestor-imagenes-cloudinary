const crypto = require('crypto');

const GLOBAL_SECRET = process.env.TOKEN_SECRET || 'clave-maestra-global';

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { token, password } = JSON.parse(event.body);

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

        // Si el token indica que es de larga duración, manejamos la doble verificación
        if (payload.longTerm) {
            const sanitizedProj = payload.project.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const longTermEnvVar = `TOKEN_SECRET_${sanitizedProj}_LARGO`;
            const projectLongSecret = process.env[longTermEnvVar];

            if (!projectLongSecret) {
                return { statusCode: 500, body: JSON.stringify({ valid: false, error: `Falta configurar la variable ${longTermEnvVar} en Netlify.` }) };
            }

            // Si el cliente todavía no mandó la contraseña desde el modal
            if (!password) {
                return { 
                    statusCode: 401, 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ valid: false, requiresPassword: true }) 
                };
            }

            // Combinamos la clave global con la contraseña ingresada para verificar si coincide con la del proyecto
            secretToUse = `${GLOBAL_SECRET}_${password}`;
        }

        // Recalculamos la firma matemática en el servidor
        const expectedSignature = crypto
            .createHmac('sha256', secretToUse)
            .update(payloadBase64)
            .digest('base64url');

        if (receivedSignature !== expectedSignature) {
            return { 
                statusCode: 401, 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ valid: false, error: payload.longTerm ? 'Contraseña incorrecta.' : 'Firma inválida o alterada' }) 
            };
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