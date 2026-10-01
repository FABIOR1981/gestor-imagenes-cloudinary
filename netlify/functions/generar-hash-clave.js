const crypto = require('crypto');
const { sesionAdmin, responder } = require('./utilidades/tokens');

// Solo admin. Convierte una contraseña nueva en el valor para la variable ADMIN_PASSWORD_HASH de Netlify
// (mismo formato que herramientas/generar-hash-admin.js). No guarda ni registra la contraseña.
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
    try {
        if (!sesionAdmin(event)) return responder(401, { error: 'Sesión de administrador requerida' });

        let cuerpo;
        try { cuerpo = JSON.parse(event.body || '{}'); } catch { return responder(400, { error: 'El cuerpo debe ser JSON válido' }); }
        const { clave } = cuerpo;
        if (typeof clave !== 'string' || clave.length < 12 || clave.length > 200) {
            return responder(400, { error: 'La contraseña debe tener entre 12 y 200 caracteres' });
        }

        const sal = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
        return responder(200, { valor: `scrypt$${sal}$${hash}` });
    } catch (err) {
        console.error('generar-hash-clave:', err.message);
        return responder(500, { error: 'Error interno al generar el valor' });
    }
};
