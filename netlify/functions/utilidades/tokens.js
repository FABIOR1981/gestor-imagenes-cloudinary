const crypto = require('crypto');

const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const CINCO_ANIOS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const PERMISOS_VALIDOS = ['alta', 'listar', 'modificar', 'eliminar'];

function obtenerSecreto() {
    const secreto = process.env.TOKEN_SECRET;
    if (!secreto || secreto.length < 32) {
        throw new Error('TOKEN_SECRET no está configurado o tiene menos de 32 caracteres');
    }
    return secreto;
}

function firmar(cargaB64) {
    return crypto.createHmac('sha256', obtenerSecreto()).update(cargaB64).digest('base64url');
}

function resumen(texto) {
    return crypto.createHash('sha256').update(String(texto)).digest();
}

// Comparación en tiempo constante (compara resúmenes, así no filtra el largo)
function iguales(a, b) {
    return crypto.timingSafeEqual(resumen(a), resumen(b));
}

function crearToken(carga) {
    const cargaB64 = Buffer.from(JSON.stringify(carga)).toString('base64url');
    return `${cargaB64}.${firmar(cargaB64)}`;
}

// tipoEsperado: 'admin' | 'enlace'. Un token de un tipo nunca sirve como el otro.
function verificarToken(token, tipoEsperado) {
    if (typeof token !== 'string') return null;
    const partes = token.split('.');
    if (partes.length !== 2) return null;
    const [cargaB64, firma] = partes;
    if (!iguales(firma, firmar(cargaB64))) return null;

    let carga;
    try {
        carga = JSON.parse(Buffer.from(cargaB64, 'base64url').toString('utf8'));
    } catch {
        return null;
    }
    if (!carga || carga.t !== tipoEsperado) return null;
    if (typeof carga.exp !== 'number' || Date.now() > carga.exp) return null;
    return carga;
}

// Misma convención que ya tenés en Netlify: TOKEN_SECRET_ENBLANCO_RESIDENCIAL_LARGO
function nombreVariableClaveLarga(proyecto) {
    return `TOKEN_SECRET_${String(proyecto).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_LARGO`;
}

function claveLargaValida(proyecto, claveIngresada) {
    const esperada = process.env[nombreVariableClaveLarga(proyecto)];
    if (!esperada || !claveIngresada) return false;
    return iguales(claveIngresada, esperada);
}

// Para usar en TODAS las funciones que reciben un enlace de cliente
function validarEnlace(token, clave) {
    const carga = verificarToken(token, 'enlace');
    if (!carga) return { ok: false, status: 401, error: 'Enlace inválido o vencido' };
    if (carga.larga) {
        if (!clave) return { ok: false, status: 401, requiereClave: true };
        if (!claveLargaValida(carga.proyecto, clave)) {
            return { ok: false, status: 401, error: 'Contraseña incorrecta' };
        }
    }
    return { ok: true, carga };
}

function sesionAdmin(event) {
    const cabecera = (event.headers && (event.headers.authorization || event.headers.Authorization)) || '';
    const m = cabecera.match(/^Bearer (.+)$/);
    return m ? verificarToken(m[1], 'admin') : null;
}

async function cargarProyectos(event) {
    const base = process.env.DEPLOY_URL || process.env.URL || `https://${event.headers.host}`;
    const res = await fetch(`${base}/proyectos.json`);
    if (!res.ok) throw new Error('No se pudo leer proyectos.json');
    const datos = await res.json();
    return datos.proyectos || [];
}

function responder(statusCode, cuerpo) {
    return {
        statusCode,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        body: JSON.stringify(cuerpo)
    };
}

module.exports = {
    SEIS_MESES_MS,
    CINCO_ANIOS_MS,
    PERMISOS_VALIDOS,
    crearToken,
    verificarToken,
    validarEnlace,
    nombreVariableClaveLarga,
    sesionAdmin,
    cargarProyectos,
    responder
};
