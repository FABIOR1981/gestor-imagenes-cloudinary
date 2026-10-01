const { sesionAdmin, validarEnlace, cargarProyectos, responder } = require('./tokens');

// Devuelve { proyecto, definicion, rol } o { error } (respuesta HTTP lista para retornar).
// - Admin (header Authorization: Bearer <sesion>): puede todo, en el proyecto indicado en el cuerpo.
// - Enlace (cuerpo.token [+ cuerpo.clave]): solo su proyecto y solo los permisos que lleva el token.
async function autorizar(event, cuerpo, permisoRequerido) {
    const proyectos = await cargarProyectos(event);

    if (sesionAdmin(event)) {
        const definicion = proyectos.find(p => p.id === cuerpo.proyecto);
        if (!definicion) return { error: responder(400, { error: 'Proyecto inexistente' }) };
        return { rol: 'admin', proyecto: definicion.id, definicion };
    }

    if (cuerpo.token) {
        const r = validarEnlace(cuerpo.token, cuerpo.clave);
        if (!r.ok) {
            return { error: responder(r.status, r.requiereClave ? { requiereClave: true } : { error: r.error }) };
        }
        if (!r.carga.permisos.includes(permisoRequerido)) {
            return { error: responder(403, { error: 'Este enlace no tiene permiso para esa acción' }) };
        }
        const definicion = proyectos.find(p => p.id === r.carga.proyecto);
        if (!definicion) return { error: responder(400, { error: 'Proyecto inexistente' }) };
        return { rol: 'enlace', proyecto: definicion.id, definicion };
    }

    return { error: responder(401, { error: 'No autorizado' }) };
}

module.exports = { autorizar };
