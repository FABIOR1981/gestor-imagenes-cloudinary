const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { credenciales, firmar } = require('./utilidades/cloudinary');
const { leerCuerpo, normalizarCarpeta, normalizarNombre, etiquetaDe, construirContexto } = require('./utilidades/imagenes');

// Permiso requerido: "alta". El navegador sube directo a Cloudinary con ESTOS parámetros firmados;
// si cambia carpeta, nombre, tags o context, la firma deja de valer.
exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
    try {
        const cuerpo = leerCuerpo(event);
        if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });

        const aut = await autorizar(event, cuerpo, 'alta');
        if (aut.error) return aut.error;

        const carpeta = normalizarCarpeta(cuerpo.carpeta, aut.definicion);
        if (!carpeta) return responder(400, { error: 'Carpeta destino inválida para este proyecto' });
        const nombre = normalizarNombre(cuerpo.nombre);
        if (!nombre) return responder(400, { error: 'Nombre de archivo inválido' });
        const ctx = construirContexto(cuerpo);
        if (ctx.error) return responder(400, { error: ctx.error });

        const { cloudName, apiKey, apiSecret } = credenciales();
        const parametros = {
            folder: `${aut.proyecto}/${carpeta}`,
            public_id: nombre,
            tags: etiquetaDe(aut.proyecto, carpeta),
            overwrite: 'false', // nunca pisar una imagen existente
            timestamp: Math.floor(Date.now() / 1000)
        };
        if (ctx.texto) parametros.context = ctx.texto;

        return responder(200, { cloudName, apiKey, parametros, firma: firmar(parametros, apiSecret) });
    } catch (err) {
        console.error('firmar-subida:', err.message);
        return responder(500, { error: 'Error interno al firmar la subida' });
    }
};
