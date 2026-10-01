const crypto = require('crypto');
const {
    SEIS_MESES_MS, CINCO_ANIOS_MS, PERMISOS_VALIDOS,
    crearToken, nombreVariableClaveLarga, sesionAdmin, cargarProyectos, responder
} = require('./utilidades/tokens');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });

    try {
        // Solo el administrador con sesión vigente puede generar enlaces
        if (!sesionAdmin(event)) return responder(401, { error: 'Sesión de administrador requerida' });

        const { proyecto, exp, permisos } = JSON.parse(event.body || '{}');
        const ahora = Date.now();

        if (typeof exp !== 'number' || exp < ahora + 60 * 1000 || exp > ahora + CINCO_ANIOS_MS) {
            return responder(400, { error: 'Vencimiento inválido (mínimo 1 minuto, máximo 5 años)' });
        }

        const proyectos = await cargarProyectos(event);
        const definicion = proyectos.find(p => p.id === proyecto);
        if (!definicion) return responder(400, { error: 'Proyecto inexistente en proyectos.json' });

        // Permisos del enlace: los pedidos, o los que define proyectos.json (permisosCliente), o solo "alta"
        const solicitados = Array.isArray(permisos) ? permisos : (definicion.permisosCliente || ['alta']);
        const permisosFinales = [...new Set(solicitados)];
        if (!permisosFinales.length || permisosFinales.some(p => !PERMISOS_VALIDOS.includes(p))) {
            return responder(400, { error: `Permisos inválidos. Válidos: ${PERMISOS_VALIDOS.join(', ')}` });
        }

        // Enlaces de más de 6 meses: exigen contraseña, guardada en la variable de Netlify del proyecto
        const larga = exp - ahora > SEIS_MESES_MS;
        if (larga) {
            const variable = nombreVariableClaveLarga(proyecto);
            if (!process.env[variable]) {
                return responder(400, { error: `Falta configurar la variable ${variable} en Netlify` });
            }
        }

        const token = crearToken({
            t: 'enlace',
            id: crypto.randomUUID(),
            proyecto,
            permisos: permisosFinales,
            larga,
            exp
        });

        return responder(200, { token, exp, larga, permisos: permisosFinales });
    } catch (err) {
        return responder(500, { error: 'Error interno al generar el enlace' });
    }
};
