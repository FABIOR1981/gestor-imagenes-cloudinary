// Uso (en tu PC, no en Netlify):  node herramientas/generar-hash-admin.js "tu contraseña de admin"
// Copiá el resultado a la variable ADMIN_PASSWORD_HASH en Netlify.
const crypto = require('crypto');

const clave = process.argv[2];
if (!clave || clave.length < 12) {
    console.error('Uso: node herramientas/generar-hash-admin.js "contraseña de al menos 12 caracteres"');
    process.exit(1);
}

const sal = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
console.log(`scrypt$${sal}$${hash}`);
