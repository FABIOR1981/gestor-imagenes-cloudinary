const crypto = require('crypto');

// Acepta los mismos nombres de variables que ya usaba consultar-metadatos.js
function credenciales() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;

    if ((!apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
        const u = new URL(process.env.CLOUDINARY_URL.replace(/^cloudinary:\/\//, 'https://'));
        cloudName = cloudName || u.hostname;
        apiKey = apiKey || decodeURIComponent(u.username);
        apiSecret = apiSecret || decodeURIComponent(u.password);
    }
    cloudName = cloudName || 'p0qlmlor'; // nombre público de tu cloud (ya está en el JS del sitio)

    if (!apiKey || !apiSecret) {
        throw new Error('Faltan CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en Netlify');
    }
    return { cloudName, apiKey, apiSecret };
}

// Firma de Cloudinary: parámetros ordenados "k=v&k=v" + secret, SHA-1
function firmar(params, apiSecret) {
    const base = Object.keys(params)
        .filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '')
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
    return crypto.createHash('sha1').update(base + apiSecret).digest('hex');
}

// API de subida/edición firmada (rename, context, tags)
async function llamarApiFirmada(ruta, params) {
    const { cloudName, apiKey, apiSecret } = credenciales();
    const todos = { ...params, timestamp: Math.floor(Date.now() / 1000) };
    const cuerpo = new URLSearchParams();
    Object.entries(todos).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') cuerpo.append(k, String(v));
    });
    cuerpo.append('api_key', apiKey);
    cuerpo.append('signature', firmar(todos, apiSecret));

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${ruta}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: cuerpo
    });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error?.message || 'Error de Cloudinary');
    return datos;
}

// Admin API (listar, borrar) con autenticación básica
async function llamarApiAdmin(metodo, ruta, consulta) {
    const { cloudName, apiKey, apiSecret } = credenciales();
    const qs = consulta ? `?${consulta.toString()}` : '';
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}${ruta}${qs}`, {
        method: metodo,
        headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` }
    });
    const datos = await res.json();
    if (!res.ok) throw new Error(datos.error?.message || 'Error de Cloudinary');
    return datos;
}

module.exports = { credenciales, firmar, llamarApiFirmada, llamarApiAdmin };
