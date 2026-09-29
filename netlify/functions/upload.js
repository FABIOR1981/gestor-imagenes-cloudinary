const fetch = require('node-fetch'); // O usar fetch nativo si estás en Node 18+

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const data = JSON.parse(event.body);
        const { image, token } = data; // 'image' puede ser el Base64 y 'token' lo que uses para validar si el enlace es válido

        // TODO: Aquí agregas tu validación del enlace temporal o token.
        // Si el enlace está vencido, retornas un error inmediatamente:
        // if (!esTokenValido(token)) {
        //     return { statusCode: 401, body: JSON.stringify({ error: 'El enlace ha expirado.' }) };
        // }

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

        // Petición segura a Cloudinary desde el backend de Netlify
        const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                file: image,
                upload_preset: uploadPreset
            })
        });

        const result = await cloudinaryResponse.json();

        if (!cloudinaryResponse.ok) {
            throw new Error(result.error?.message || 'Error al subir a Cloudinary');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ url: result.secure_url })
        };

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};