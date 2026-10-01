const crypto = require('crypto');

const GLOBAL_SECRET = process.env.TOKEN_SECRET || 'clave-maestra-global';
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000; // Aprox 6 meses en milisegundos

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { project, exp } = JSON.parse(event.body);

        if (!project || !exp) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Faltan datos obligatorios' }) };
        }

        const duration = exp - Date.now();
        const isLongTerm = duration > SIX_MONTHS_MS;

        let secretToUse = GLOBAL_SECRET;

        // Si es de larga duración, aplicamos la doble contraseña combinándola con la del proyecto
        if (isLongTerm) {
            const sanitizedProj = project.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
            const longTermEnvVar = `TOKEN_SECRET_${sanitizedProj}_LARGO`;
            const projectLongSecret = process.env[longTermEnvVar];

            if (!projectLongSecret) {
                return { 
                    statusCode: 400, 
                    body: JSON.stringify({ error: `Falta configurar la variable de entorno ${longTermEnvVar} en Netlify para este proyecto de larga duración.` }) 
                };
            }

            // Combinamos la clave global y la específica del proyecto largo
            secretToUse = `${GLOBAL_SECRET}_${projectLongSecret}`;
        }

        const payload = { project, exp, longTerm: isLongTerm };
        const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');

        // Generamos la firma criptográfica con la(s) clave(s) correspondiente(s)
        const signature = crypto
            .createHmac('sha256', secretToUse)
            .update(payloadBase64)
            .digest('base64url');

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