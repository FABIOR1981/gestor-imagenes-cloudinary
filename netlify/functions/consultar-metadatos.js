const crypto = require('crypto');

const GLOBAL_SECRET = process.env.TOKEN_SECRET || 'clave-maestra-global';

function getCloudinaryCredentials() {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME || 'p0qlmlor';
    let apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;
    const cloudinaryUrl = process.env.CLOUDINARY_URL;

    if ((!apiKey || !apiSecret) && cloudinaryUrl) {
        const parsed = new URL(cloudinaryUrl.replace(/^cloudinary:\/\//, 'https://'));
        cloudName = parsed.hostname || cloudName;
        apiKey = parsed.username || apiKey;
        apiSecret = decodeURIComponent(parsed.password || apiSecret || '');
    }

    return { cloudName, apiKey, apiSecret };
}

function verifyToken(token, password) {
    if (!token || !token.includes('.')) return null;

    const [payloadBase64, receivedSignature] = token.split('.');
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (!payload.project || Date.now() > payload.exp) return null;

    let secretToUse = GLOBAL_SECRET;
    if (payload.longTerm) {
        if (!password) return null;
        secretToUse = `${GLOBAL_SECRET}_${password}`;
    }

    const expectedSignature = crypto
        .createHmac('sha256', secretToUse)
        .update(payloadBase64)
        .digest('base64url');

    return receivedSignature === expectedSignature ? payload : null;
}

function addMetadataValues(target, source) {
    if (!source || typeof source !== 'object') return;
    Object.entries(source).forEach(([name, value]) => {
        if (['alt', 'caption'].includes(name.toLowerCase())) return;
        if (!name || value === null || value === undefined || value === '') return;
        const values = Array.isArray(value) ? value : [value];
        if (!target[name]) target[name] = new Set();
        values.forEach(item => target[name].add(String(item)));
    });
}

export async function handler(event) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { cloudName, apiKey, apiSecret } = getCloudinaryCredentials();
    if (!apiKey || !apiSecret) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Faltan las credenciales privadas de Cloudinary en Netlify.' }) };
    }

    try {
        const { token, password, category } = JSON.parse(event.body || '{}');
        const payload = verifyToken(token, password);
        if (!payload) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Acceso no autorizado.' }) };
        }

        const safeCategory = String(category || '').trim().replace(/^\/+|\/+$/g, '');
        if (!safeCategory || safeCategory.includes('..') || safeCategory.includes('\\')) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Carpeta destino inválida.' }) };
        }

        const folderPath = `${payload.project}/${safeCategory}`;
        const metadata = {};
        let nextCursor = '';

        do {
            const params = new URLSearchParams({
                type: 'upload',
                prefix: folderPath + '/',
                max_results: '500',
                context: 'true',
                metadata: 'true'
            });
            if (nextCursor) params.set('next_cursor', nextCursor);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?${params}`, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
                }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || 'No se pudieron consultar los recursos.');

            (data.resources || []).forEach(resource => {
                addMetadataValues(metadata, resource.context?.custom);
                addMetadataValues(metadata, resource.metadata);
            });
            nextCursor = data.next_cursor || '';
        } while (nextCursor);

        const fields = Object.entries(metadata)
            .map(([name, values]) => ({ name, values: [...values].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) }))
            .sort((a, b) => a.name.localeCompare(b.name, 'es'));

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Error al consultar los metadatos de la carpeta.' }) };
    }
}