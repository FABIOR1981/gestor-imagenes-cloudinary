const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { llamarApiFirmada } = require('./utilidades/cloudinary');
const {
    leerCuerpo, normalizarCarpeta, normalizarNombre, etiquetaDe, idPermitido, construirContexto
} = require('./utilidades/imagenes');

// Permiso requerido: "modificar". Cambia título/descripción/metadatos, renombra y/o mueve de carpeta.
// Si se envía titulo, descripcion o metadatos, el context completo se reemplaza: el front debe mandar los tres.
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
    try {
        const cuerpo = leerCuerpo(event);
        if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });

        const aut = await autorizar(event, cuerpo, 'modificar');
        if (aut.error) return aut.error;

        const idActual = cuerpo.public_id;
        if (!idPermitido(idActual, aut.proyecto)) {
            return responder(403, { error: 'La imagen no pertenece a este proyecto' });
        }

        const resto = idActual.slice(aut.proyecto.length + 1);
        const corte = resto.lastIndexOf('/');
        const carpetaActual = corte >= 0 ? resto.slice(0, corte) : '';
        const nombreActual = corte >= 0 ? resto.slice(corte + 1) : resto;

        const carpetaNueva = cuerpo.carpeta !== undefined ? normalizarCarpeta(cuerpo.carpeta, aut.definicion) : carpetaActual;
        if (!carpetaNueva) return responder(400, { error: 'Carpeta destino inválida para este proyecto' });
        const nombreNuevo = cuerpo.nombre !== undefined ? normalizarNombre(cuerpo.nombre) : nombreActual;
        if (!nombreNuevo) return responder(400, { error: 'Nombre inválido' });

        const actualizarContexto = ['titulo', 'descripcion', 'metadatos'].some(k => cuerpo[k] !== undefined);
        const ctx = actualizarContexto ? construirContexto(cuerpo) : null;
        if (ctx && ctx.error) return responder(400, { error: ctx.error });

        let idFinal = idActual;
        const idDestino = `${aut.proyecto}/${carpetaNueva}/${nombreNuevo}`;

        // 1) Renombrar / mover (nunca pisa una imagen existente)
        if (idDestino !== idActual) {
            await llamarApiFirmada('image/rename', {
                from_public_id: idActual, to_public_id: idDestino, overwrite: 'false', type: 'upload'
            });
            idFinal = idDestino;

            // Si cambió de carpeta, el tag de carpeta (que usan los sitios) también cambia
            if (carpetaNueva !== carpetaActual) {
                if (carpetaActual) {
                    await llamarApiFirmada('image/tags', {
                        command: 'remove', tag: etiquetaDe(aut.proyecto, carpetaActual), public_ids: idFinal, type: 'upload'
                    });
                }
                await llamarApiFirmada('image/tags', {
                    command: 'add', tag: etiquetaDe(aut.proyecto, carpetaNueva), public_ids: idFinal, type: 'upload'
                });
            }
        }

        // 2) Reemplazar context completo
        if (ctx) {
            await llamarApiFirmada('image/context', { command: 'remove_all', public_ids: idFinal, type: 'upload' });
            if (ctx.texto) {
                await llamarApiFirmada('image/context', {
                    command: 'add', public_ids: idFinal, context: ctx.texto, type: 'upload'
                });
            }
        }

        return responder(200, { ok: true, public_id: idFinal });
    } catch (err) {
        console.error('modificar-imagen:', err.message);
        return responder(500, { error: 'Error interno al modificar la imagen' });
    }
};
