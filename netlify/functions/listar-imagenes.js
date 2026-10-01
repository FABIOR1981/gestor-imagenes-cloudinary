const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { llamarApiAdmin } = require('./utilidades/cloudinary');
const { leerCuerpo, normalizarCarpeta, mapearRecurso } = require('./utilidades/imagenes');

// Permiso requerido: "listar" (o "alta" si se piden solo sugerencias de metadatos)
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
    try {
        const cuerpo = leerCuerpo(event);
        if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });

        const aut = await autorizar(event, cuerpo, cuerpo.sugerencias ? 'alta' : 'listar');
        if (aut.error) return aut.error;

        let prefijo = `${aut.proyecto}/`;
        if (cuerpo.carpeta) {
            const carpeta = normalizarCarpeta(cuerpo.carpeta, aut.definicion);
            if (!carpeta) return responder(400, { error: 'Carpeta inválida para este proyecto' });
            prefijo = `${aut.proyecto}/${carpeta}/`;
        }

        const consulta = (cursor) => {
            const p = new URLSearchParams({
                type: 'upload', prefix: prefijo, max_results: cuerpo.sugerencias ? '500' : '100',
                context: 'true', tags: 'true', metadata: 'true'
            });
            if (cursor) p.set('next_cursor', cursor);
            return p;
        };

        // Modo sugerencias: recorre todas las páginas y devuelve etiquetas/valores existentes (reemplaza consultar-metadatos)
        if (cuerpo.sugerencias) {
            const campos = {};
            let cursor = '';
            do {
                const datos = await llamarApiAdmin('GET', '/resources/image/upload', consulta(cursor));
                (datos.resources || []).forEach(r => {
                    const custom = r.context?.custom || {};
                    Object.entries(custom).forEach(([nombre, valor]) => {
                        if (['alt', 'caption'].includes(nombre.toLowerCase()) || valor === '') return;
                        (campos[nombre] = campos[nombre] || new Set()).add(String(valor));
                    });
                });
                cursor = datos.next_cursor || '';
            } while (cursor);

            const lista = Object.entries(campos)
                .map(([name, valores]) => ({ name, values: [...valores].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) }))
                .sort((a, b) => a.name.localeCompare(b.name, 'es'));
            return responder(200, { fields: lista });
        }

        const datos = await llamarApiAdmin('GET', '/resources/image/upload', consulta(cuerpo.cursor));
        return responder(200, {
            imagenes: (datos.resources || []).map(mapearRecurso),
            siguiente: datos.next_cursor || null
        });
    } catch (err) {
        console.error('listar-imagenes:', err.message);
        return responder(500, { error: 'Error interno al listar imágenes' });
    }
};
