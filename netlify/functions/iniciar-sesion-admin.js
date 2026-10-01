const crypto = require('crypto');
const { crearToken, responder } = require('./utilidades/tokens');

const DURACION_SESION_MS = 2 * 60 * 60 * 1000; // 2 horas
const espera = ms => new Promise(r => setTimeout(r, ms));

function claveCorrecta(clave) {
    // ADMIN_PASSWORD_HASH = scrypt$<sal>$<hash>  (se genera con herramientas/generar-hash-admin.js)
    const guardado = process.env.ADMIN_PASSWORD_HASH || '';
    const [algoritmo, sal, hashHex] = guardado.split('$');
    if (algoritmo !== 'scrypt' || !sal || !hashHex) return false;
    const esperado = Buffer.from(hashHex, 'hex');
    const calculado = crypto.scryptSync(clave, sal, esperado.length);
    return crypto.timingSafeEqual(esperado, calculado);
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });

    try {
        const { clave } = JSON.parse(event.body || '{}');
        if (typeof clave !== 'string' || !clave || clave.length > 200) {
            return responder(400, { error: 'Falta la contraseña' });
        }

        if (!claveCorrecta(clave)) {
            await espera(800); // frena la fuerza bruta básica
            return responder(401, { error: 'Contraseña incorrecta' });
        }

        const exp = Date.now() + DURACION_SESION_MS;
        const sesion = crearToken({ t: 'admin', exp });
        return responder(200, { sesion, exp });
    } catch (err) {
        return responder(500, { error: 'Error interno al iniciar sesión' });
    }
};
