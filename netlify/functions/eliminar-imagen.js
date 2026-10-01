const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { llamarApiAdmin } = require('./utilidades/cloudinary');
const { leerCuerpo, idPermitido } = require('./utilidades/imagenes');

// Permiso requerido: "eliminar". Recibe { public_ids: [...] } (hasta 50). Todas deben ser del proyecto.
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
    try {
        const cuerpo = leerCuerpo(event);
        if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });

        const aut = await autorizar(event, cuerpo, 'eliminar');
        if (aut.error) return aut.error;

        const ids = Array.isArray(cuerpo.public_ids) ? cuerpo.public_ids : [];
        if (!ids.length || ids.length > 50) return responder(400, { error: 'Indicá entre 1 y 50 imágenes' });
        if (!ids.every(id => idPermitido(id, aut.proyecto))) {
            return responder(403, { error: 'Alguna imagen no pertenece a este proyecto' });
        }

        const consulta = new URLSearchParams({ invalidate: 'true' }); // limpia también la caché del CDN
        ids.forEach(id => consulta.append('public_ids[]', id));
        const datos = await llamarApiAdmin('DELETE', '/resources/image/upload', consulta);

        return responder(200, { ok: true, resultado: datos.deleted || {} });
    } catch (err) {
        console.error('eliminar-imagen:', err.message);
        return responder(500, { error: 'Error interno al eliminar' });
    }
};
