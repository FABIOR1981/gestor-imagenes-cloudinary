const { validarEnlace, responder } = require('./utilidades/tokens');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });

    try {
        const { token, clave } = JSON.parse(event.body || '{}');
        const r = validarEnlace(token, clave);

        if (!r.ok) {
            return responder(r.status, r.requiereClave
                ? { valida: false, requiereClave: true }
                : { valida: false, error: r.error });
        }

        const { proyecto, permisos, exp } = r.carga;
        return responder(200, { valida: true, proyecto, permisos, exp });
    } catch (err) {
        return responder(500, { valida: false, error: 'Error al verificar el enlace' });
    }
};
