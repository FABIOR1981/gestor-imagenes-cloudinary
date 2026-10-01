const PATRON_SEGMENTO = /^[A-Za-z0-9_\-ñáéíóúÑÁÉÍÓÚ ]{1,60}$/;
const RESERVADOS = ['caption', 'alt'];

function leerCuerpo(event) {
    try {
        const c = JSON.parse(event.body || '{}');
        return c && typeof c === 'object' ? c : null;
    } catch {
        return null;
    }
}

// Valida la carpeta (hasta 3 niveles, solo caracteres seguros). Por defecto se pueden crear carpetas nuevas
// dentro del proyecto, como hace el selector "+ Nueva carpeta"; si un proyecto tiene
// "soloCarpetasDefinidas": true en proyectos.json, solo valen las carpetas listadas allí.
function normalizarCarpeta(carpeta, definicion) {
    const limpia = String(carpeta || '').trim().replace(/^\/+|\/+$/g, '');
    if (!limpia) return null;
    const segmentos = limpia.split('/');
    if (segmentos.length > 3) return null;
    if (!segmentos.every(s => PATRON_SEGMENTO.test(s))) return null;
    if (definicion.soloCarpetasDefinidas === true && !(definicion.carpetas || []).some(c => c.value === segmentos[0])) return null;
    return limpia;
}

// Nombre sin extensión; los caracteres raros se reemplazan por "_"
function normalizarNombre(nombre) {
    const limpio = String(nombre || '').trim().replace(/[^A-Za-z0-9_\-ñáéíóúÑÁÉÍÓÚ ]/g, '_').slice(0, 100);
    return limpio || null;
}

function etiquetaDe(proyecto, carpeta) {
    return `${proyecto.replace(/\//g, '_')}_${carpeta}`; // misma regla que el front actual
}

function idPermitido(publicId, proyecto) {
    return typeof publicId === 'string' && publicId.startsWith(`${proyecto}/`) && !publicId.includes('..');
}

const valorLimpio = (v, max) => String(v ?? '').replace(/[|=\\\r\n]/g, ' ').trim().slice(0, max);

// Arma el "context" de Cloudinary: caption=Título|alt=Descripción|etiqueta=valor
function construirContexto({ titulo, descripcion, metadatos }) {
    const partes = [];
    const t = valorLimpio(titulo, 300);
    const d = valorLimpio(descripcion, 1000);
    if (t) partes.push(`caption=${t}`);
    if (d) partes.push(`alt=${d}`);

    if (metadatos !== undefined && !Array.isArray(metadatos)) return { error: 'metadatos debe ser una lista' };
    const lista = metadatos || [];
    if (lista.length > 20) return { error: 'Máximo 20 metadatos por imagen' };

    for (const m of lista) {
        const nombre = String(m?.name ?? '').replace(/[|=\\]/g, '_').trim().slice(0, 40);
        const valor = valorLimpio(m?.value, 200);
        if (!nombre || !valor) continue;
        if (RESERVADOS.includes(nombre.toLowerCase())) return { error: `"${nombre}" es un nombre reservado` };
        partes.push(`${nombre}=${valor}`);
    }
    return { texto: partes.join('|') };
}

function mapearRecurso(r) {
    const custom = r.context?.custom || {};
    const { caption, alt, ...metadatos } = custom;
    const idx = r.public_id.lastIndexOf('/');
    return {
        public_id: r.public_id,
        carpeta: idx >= 0 ? r.public_id.slice(0, idx) : '',
        url: r.secure_url,
        formato: r.format,
        bytes: r.bytes,
        ancho: r.width,
        alto: r.height,
        creado: r.created_at,
        tags: r.tags || [],
        titulo: caption || '',
        descripcion: alt || '',
        metadatos: Object.entries(metadatos).map(([name, value]) => ({ name, value: String(value) }))
    };
}

module.exports = {
    leerCuerpo, normalizarCarpeta, normalizarNombre, etiquetaDe,
    idPermitido, construirContexto, mapearRecurso
};
