# Inventario completo del repositorio

## Árbol de directorios

```text
gestor-imagenes-cloudinary/
├── admin.html
├── galeria.html
├── index.html
├── proyectos.json
├── readme.md
├── seguridad.html
├── subir-cliente.html
├── subir.html
├── css/
│   └── styles.css
├── herramientas/
│   └── generar-hash-admin.js
├── js/
│   ├── acceso.js
│   ├── admin.js
│   ├── dashboard.js
│   ├── galeria.js
│   ├── seguridad.js
│   └── subir.js
└── netlify/
	└── functions/
		├── eliminar-imagen.js
		├── firmar-subida.js
		├── generar-enlace.js
		├── generar-hash-clave.js
		├── iniciar-sesion-admin.js
		├── listar-imagenes.js
		├── modificar-imagen.js
		├── verificar-enlace.js
		└── utilidades/
			├── autorizacion.js
			├── cloudinary.js
			├── imagenes.js
			└── tokens.js
```

## admin.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Administrar imágenes | Upload Hub</title>
	<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="css/styles.css">
</head>
<body class="min-h-screen p-4 md:p-8">

	<!-- Aplicación -->
	<div id="app" class="hidden max-w-6xl mx-auto p-4">
		<header class="flex flex-wrap items-center gap-3 mb-4">
			<h1 class="text-xl font-bold mr-auto">🖼️ Administrar imágenes</h1>
			<a href="index.html" class="text-sm underline">Generador de enlaces</a>
			<button id="btnSalir" type="button" class="text-sm border rounded px-3 py-1.5 bg-white">Cerrar sesión</button>
		</header>

		<section class="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
			<label class="text-sm">Proyecto<br>
				<select id="selProyecto" class="border rounded px-3 py-2 w-auto min-w-48"></select>
			</label>
			<label class="text-sm">Carpeta<br>
				<select id="selCarpeta" class="border rounded px-3 py-2 w-auto min-w-40"></select>
			</label>
			<button id="btnRecargar" type="button" class="border rounded px-3 py-2 bg-white">↻ Recargar</button>
			<button id="btnSubir" type="button" class="rounded px-3 py-2 bg-emerald-600 text-white">⬆ Subir imágenes</button>
			<button id="btnBorrarSel" type="button" class="hidden rounded px-3 py-2 bg-red-600 text-white">🗑 Eliminar seleccionadas (<span id="contSel">0</span>)</button>
		</section>

		<p id="estado" class="text-sm text-slate-500 mb-3"></p>
		<section id="grilla" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></section>
		<div class="text-center mt-5"><button id="btnMas" type="button" class="hidden border rounded px-4 py-2 bg-white">Cargar más</button></div>
	</div>

	<!-- Edición -->
	<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<form id="formEditar" class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
			<h2 class="text-lg font-bold">Editar imagen</h2>
			<img id="editVista" alt="" class="w-full h-44 object-contain bg-slate-100 rounded">
			<div class="grid grid-cols-2 gap-3">
				<label class="text-sm">Nombre (sin extensión)
					<input id="editNombre" class="border rounded px-3 py-2 w-full" required maxlength="100">
				</label>
				<label class="text-sm">Carpeta
					<input id="editCarpeta" list="listaCarpetas" class="border rounded px-3 py-2 w-full" required>
					<datalist id="listaCarpetas"></datalist>
				</label>
			</div>
			<label class="text-sm block">Título
				<input id="editTitulo" class="border rounded px-3 py-2 w-full" maxlength="300">
			</label>
			<label class="text-sm block">Descripción
				<textarea id="editDescripcion" rows="2" class="border rounded px-3 py-2 w-full" maxlength="1000"></textarea>
			</label>
			<div>
				<p class="text-sm font-semibold mb-1">Metadatos</p>
				<div id="editMetadatos" class="space-y-2"></div>
				<button id="btnAgregarMeta" type="button" class="text-sm mt-2 underline">＋ Agregar metadato</button>
			</div>
			<p id="errorEditar" class="text-sm text-red-600"></p>
			<div class="flex justify-end gap-2 pt-2">
				<button id="btnCancelar" type="button" class="border rounded px-4 py-2">Cancelar</button>
				<button id="btnGuardar" type="submit" class="rounded px-4 py-2 bg-slate-900 text-white">Guardar</button>
			</div>
		</form>
	</div>

	<script src="js/acceso.js"></script>
	<script src="js/admin.js"></script>
</body>
</html>
```

## js/acceso.js

```javascript
const Acceso = (() => {
	const ESTILOS = `.acceso-tarjeta { width: 100%; max-width: 400px; margin: 48px auto 20px; padding: 32px 28px; text-align: center; border-top: 4px solid var(--primary-color, #2563EB); box-sizing: border-box; } .acceso-tarjeta h1 { font-size: 1.4rem; font-weight: 700; margin: 0 0 10px; } .acceso-tarjeta form { display: flex; flex-direction: column; gap: 14px; } .acceso-tarjeta input[type="password"] { width: 100%; box-sizing: border-box; padding: 12px 14px; font-size: 1rem; text-align: center; } .acceso-tarjeta .acceso-error { margin: 0; color: #DC2626; } .acceso-tarjeta.hidden, .acceso-tarjeta .acceso-error.hidden { display: none !important; }`;
	function inyectarEstilos() { if (document.getElementById('acceso-estilos')) return; const estilo = document.createElement('style'); estilo.id = 'acceso-estilos'; estilo.textContent = ESTILOS; document.head.appendChild(estilo); }
	const CLAVE_SESION = 'gestor_sesion_admin'; const PREFIJO_CLAVE_ENLACE = 'gestor_clave_enlace_';
	const sesionAdmin = { leer() { try { const s = JSON.parse(sessionStorage.getItem(CLAVE_SESION)); if (s && s.exp > Date.now()) return s; } catch {} sessionStorage.removeItem(CLAVE_SESION); return null; }, guardar(datos) { sessionStorage.setItem(CLAVE_SESION, JSON.stringify(datos)); }, borrar() { sessionStorage.removeItem(CLAVE_SESION); } };
	const claveDe = token => PREFIJO_CLAVE_ENLACE + String(token).slice(-24);
	function leerClave(token) { try { return sessionStorage.getItem(claveDe(token)) || ''; } catch { return ''; } }
	function guardarClave(token, clave) { try { sessionStorage.setItem(claveDe(token), clave); } catch {} }
	function tarjeta({ icono = '🔐', titulo, texto, placeholder, boton, recortar = false, alEnviar }) { inyectarEstilos(); const el = document.createElement('div'); el.className = 'card acceso-tarjeta hidden'; el.innerHTML = `<div class="icono-estado"></div><h1></h1><p class="acceso-texto"></p><form><input type="password" autocomplete="current-password" required><button type="submit" class="btn-primary"></button><p class="acceso-error hidden"></p></form>`; el.querySelector('.icono-estado').textContent = icono; el.querySelector('h1').textContent = titulo; el.querySelector('.acceso-texto').textContent = texto; const form = el.querySelector('form'), entrada = el.querySelector('input'), enviar = el.querySelector('button'), error = el.querySelector('.acceso-error'); entrada.placeholder = placeholder; enviar.textContent = boton; const api = { mostrar(aviso) { el.classList.remove('hidden'); if (aviso) api.mostrarError(aviso); else error.classList.add('hidden'); entrada.focus(); }, ocultar() { el.classList.add('hidden'); }, mostrarError(mensaje) { error.textContent = mensaje; error.classList.remove('hidden'); } }; form.addEventListener('submit', async e => { e.preventDefault(); error.classList.add('hidden'); enviar.disabled = true; try { await alEnviar(recortar ? entrada.value.trim() : entrada.value); entrada.value = ''; } catch (err) { api.mostrarError(err.message || 'No se pudo verificar la contraseña.'); } finally { enviar.disabled = false; } }); document.body.appendChild(el); return api; }
	function loginAdmin(alEntrar) { const t = tarjeta({ titulo: 'Acceso de administrador', texto: 'Ingresá la contraseña de administrador para continuar.', placeholder: 'Contraseña de administrador', boton: '🔓 Ingresar', alEnviar: async clave => { const res = await fetch('/.netlify/functions/iniciar-sesion-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave }) }); const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'No se pudo iniciar sesión'); sesionAdmin.guardar({ sesion: data.sesion, exp: data.exp }); t.ocultar(); await alEntrar(); } }); return t; }
	return { sesionAdmin, leerClave, guardarClave, tarjeta, loginAdmin };
})();
```

## js/dashboard.js

```javascript
document.addEventListener('DOMContentLoaded', async () => {
	const FUNCIONES = '/.netlify/functions'; const panel = document.getElementById('panelGenerador'); const navAdmin = document.getElementById('navAdmin'); const logoutBtn = document.getElementById('logoutBtn'); const form = document.getElementById('linkGeneratorForm'); const projectSelect = document.getElementById('projectSelect'); const modeSelect = document.getElementById('modeSelect'); const expirationInput = document.getElementById('expirationDate'); const resultContainer = document.getElementById('resultContainer'); const resultadoVacio = document.getElementById('resultadoVacio'); const resultadoListo = document.getElementById('resultadoListo'); const resumenEnlace = document.getElementById('resumenEnlace'); const generatedLinkInput = document.getElementById('generatedLink'); const copyBtn = document.getElementById('copyBtn'); const copyStatus = document.getElementById('copyStatus'); const avisoLargo = document.getElementById('avisoLargo'); const checks = [...document.querySelectorAll('input[name="permisos"]')]; let proyectosData = [];
	const login = Acceso.loginAdmin(async () => { mostrarPanel(true); await cargarProyectos(); });
	function mostrarPanel(si) { panel.classList.toggle('hidden', !si); navAdmin.classList.toggle('hidden', !si); if (si) login.ocultar(); else login.mostrar(); }
	function sesionVencida() { Acceso.sesionAdmin.borrar(); panel.classList.add('hidden'); navAdmin.classList.add('hidden'); login.mostrar('La sesión venció. Ingresá de nuevo.'); }
	logoutBtn.addEventListener('click', () => { Acceso.sesionAdmin.borrar(); mostrarPanel(false); });
	function aplicarPermisosPorDefecto() { const proj = proyectosData.find(p => p.id === projectSelect.value); const defecto = (proj && proj.permisosCliente) || ['alta']; checks.forEach(c => { c.checked = defecto.includes(c.value); }); }
	async function cargarProyectos() { try { const response = await fetch('proyectos.json'); if (!response.ok) throw new Error(); proyectosData = (await response.json()).proyectos || []; } catch { proyectosData = []; } projectSelect.innerHTML = '<option value="">-- Selecciona un proyecto --</option>'; proyectosData.forEach(proj => { const opt = document.createElement('option'); opt.value = proj.id; opt.textContent = proj.nombre; projectSelect.appendChild(opt); }); aplicarPermisosPorDefecto(); }
	projectSelect.addEventListener('change', aplicarPermisosPorDefecto); modeSelect.addEventListener('change', () => { if (modeSelect.value === 'galeria') checks.forEach(c => { if (c.value === 'listar') c.checked = true; }); });
	const ahora = new Date(), en24h = new Date(ahora.getTime() + 24 * 60 * 60 * 1000); ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset()); en24h.setMinutes(en24h.getMinutes() - en24h.getTimezoneOffset()); expirationInput.min = ahora.toISOString().slice(0, 16); expirationInput.value = en24h.toISOString().slice(0, 16);
	form.addEventListener('submit', async e => { e.preventDefault(); const sesion = Acceso.sesionAdmin.leer(); if (!sesion) return sesionVencida(); const proyecto = projectSelect.value; if (!proyecto) return; const permisos = checks.filter(c => c.checked).map(c => c.value); if (!permisos.length) return alert('Elegí al menos un permiso.'); try { const res = await fetch(`${FUNCIONES}/generar-enlace`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.sesion}` }, body: JSON.stringify({ proyecto, permisos, exp: new Date(expirationInput.value).getTime() }) }); const data = await res.json(); if (res.status === 401) return sesionVencida(); if (!res.ok) throw new Error(data.error || 'Error al generar el enlace'); const paginas = { admin: 'subir.html', cliente: 'subir-cliente.html', galeria: 'galeria.html' }; generatedLinkInput.value = `${window.location.origin}/${paginas[modeSelect.value]}?token=${encodeURIComponent(data.token)}&modo=${encodeURIComponent(modeSelect.value === 'galeria' ? 'cliente' : modeSelect.value)}`; resultadoVacio.classList.add('hidden'); resultadoListo.classList.remove('hidden'); resumenEnlace.textContent = `${projectSelect.options[projectSelect.selectedIndex].textContent} · vence ${new Date(data.exp).toLocaleString('es-UY')}`; avisoLargo.classList.toggle('hidden', !data.larga); } catch (err) { alert('Hubo un error al generar el enlace: ' + err.message); } });
	copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(generatedLinkInput.value); copyStatus.textContent = '¡Enlace copiado al portapapeles!'; } catch { copyStatus.textContent = 'Error al copiar.'; } });
	Acceso.sesionAdmin.leer() ? (mostrarPanel(true), await cargarProyectos()) : mostrarPanel(false);
});
```

## js/seguridad.js

```javascript
document.addEventListener('DOMContentLoaded', () => {
	const $ = id => document.getElementById(id); const app = $('app'); let proyectos = [];
	const login = Acceso.loginAdmin(() => iniciar());
	function mostrar(logueado) { app.classList.toggle('hidden', !logueado); if (logueado) login.ocultar(); else login.mostrar(); }
	function sesionVencida() { Acceso.sesionAdmin.borrar(); app.classList.add('hidden'); login.mostrar('La sesión venció. Ingresá de nuevo.'); }
	async function copiar(texto, boton) { const original = boton.textContent; try { await navigator.clipboard.writeText(texto); boton.textContent = '¡Copiado!'; } catch { boton.textContent = 'No se pudo copiar'; } setTimeout(() => { boton.textContent = original; }, 2000); }
	const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'; function claveAleatoria(largo = 16) { const salida = []; const limite = 256 - (256 % ALFABETO.length); while (salida.length < largo) { const bytes = new Uint8Array(32); crypto.getRandomValues(bytes); for (const b of bytes) if (b < limite && salida.length < largo) salida.push(ALFABETO[b % ALFABETO.length]); } return salida.join(''); }
	const secretoBase64Url = (bytes = 48) => { const datos = new Uint8Array(bytes); crypto.getRandomValues(datos); let texto = ''; datos.forEach(b => { texto += String.fromCharCode(b); }); return btoa(texto).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }; const nombreVariable = id => `TOKEN_SECRET_${String(id).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_LARGO`;
	$('btnHash').addEventListener('click', async () => { $('errorHash').textContent = ''; const clave = $('claveNueva').value; if (clave.length < 12) return $('errorHash').textContent = 'Usá al menos 12 caracteres.'; if (clave !== $('claveRepetida').value) return $('errorHash').textContent = 'Las dos contraseñas no coinciden.'; const sesion = Acceso.sesionAdmin.leer(); if (!sesion) return sesionVencida(); const res = await fetch('/.netlify/functions/generar-hash-clave', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.sesion}` }, body: JSON.stringify({ clave }) }); const data = await res.json(); if (res.status === 401) return sesionVencida(); if (!res.ok) return $('errorHash').textContent = data.error; $('valorHash').value = data.valor; $('resultadoHash').classList.remove('hidden'); });
	$('btnCopiarHash').addEventListener('click', e => copiar($('valorHash').value, e.currentTarget)); $('btnSecreto').addEventListener('click', () => { $('valorSecreto').value = secretoBase64Url(); $('resultadoSecreto').classList.remove('hidden'); }); $('btnCopiarSecreto').addEventListener('click', e => copiar($('valorSecreto').value, e.currentTarget)); $('selProyecto').addEventListener('change', () => { $('nombreVariable').value = nombreVariable($('selProyecto').value); }); $('btnAleatoria').addEventListener('click', () => { $('claveLarga').value = claveAleatoria(); }); $('btnCopiarNombre').addEventListener('click', e => copiar($('nombreVariable').value, e.currentTarget)); $('btnCopiarClaveLarga').addEventListener('click', e => copiar($('claveLarga').value, e.currentTarget));
	async function iniciar() { mostrar(true); try { proyectos = (await (await fetch('proyectos.json')).json()).proyectos || []; } catch { proyectos = []; } $('selProyecto').innerHTML = proyectos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join(''); $('nombreVariable').value = nombreVariable($('selProyecto').value); }
	Acceso.sesionAdmin.leer() ? iniciar() : mostrar(false);
});
```

## netlify/functions/utilidades/autorizacion.js

```javascript
const { sesionAdmin, validarEnlace, cargarProyectos, responder } = require('./tokens');
async function autorizar(event, cuerpo, permisoRequerido) {
	const proyectos = await cargarProyectos(event);
	if (sesionAdmin(event)) {
		const definicion = proyectos.find(p => p.id === cuerpo.proyecto);
		if (!definicion) return { error: responder(400, { error: 'Proyecto inexistente' }) };
		return { rol: 'admin', proyecto: definicion.id, definicion };
	}
	if (cuerpo.token) {
		const r = validarEnlace(cuerpo.token, cuerpo.clave);
		if (!r.ok) return { error: responder(r.status, r.requiereClave ? { requiereClave: true } : { error: r.error }) };
		if (!r.carga.permisos.includes(permisoRequerido)) return { error: responder(403, { error: 'Este enlace no tiene permiso para esa acción' }) };
		const definicion = proyectos.find(p => p.id === r.carga.proyecto);
		if (!definicion) return { error: responder(400, { error: 'Proyecto inexistente' }) };
		return { rol: 'enlace', proyecto: definicion.id, definicion };
	}
	return { error: responder(401, { error: 'No autorizado' }) };
}
module.exports = { autorizar };
```

## netlify/functions/utilidades/cloudinary.js

```javascript
const crypto = require('crypto');
function credenciales() {
	let cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
	let apiKey = process.env.CLOUDINARY_API_KEY || process.env.API_KEY;
	let apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.API_SECRET;
	if ((!apiKey || !apiSecret) && process.env.CLOUDINARY_URL) { const u = new URL(process.env.CLOUDINARY_URL.replace(/^cloudinary:\/\//, 'https://')); cloudName = cloudName || u.hostname; apiKey = apiKey || decodeURIComponent(u.username); apiSecret = apiSecret || decodeURIComponent(u.password); }
	cloudName = cloudName || 'p0qlmlor';
	if (!apiKey || !apiSecret) throw new Error('Faltan CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET en Netlify');
	return { cloudName, apiKey, apiSecret };
}
function firmar(params, apiSecret) { const base = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null && params[k] !== '').sort().map(k => `${k}=${params[k]}`).join('&'); return crypto.createHash('sha1').update(base + apiSecret).digest('hex'); }
async function llamarApiFirmada(ruta, params) { const { cloudName, apiKey, apiSecret } = credenciales(); const todos = { ...params, timestamp: Math.floor(Date.now() / 1000) }; const cuerpo = new URLSearchParams(); Object.entries(todos).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') cuerpo.append(k, String(v)); }); cuerpo.append('api_key', apiKey); cuerpo.append('signature', firmar(todos, apiSecret)); const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: cuerpo }); const datos = await res.json(); if (!res.ok) throw new Error(datos.error?.message || 'Error de Cloudinary'); return datos; }
async function llamarApiAdmin(metodo, ruta, consulta) { const { cloudName, apiKey, apiSecret } = credenciales(); const qs = consulta ? `?${consulta.toString()}` : ''; const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}${ruta}${qs}`, { method: metodo, headers: { Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}` } }); const datos = await res.json(); if (!res.ok) throw new Error(datos.error?.message || 'Error de Cloudinary'); return datos; }
module.exports = { credenciales, firmar, llamarApiFirmada, llamarApiAdmin };
```

## netlify/functions/utilidades/imagenes.js

```javascript
const PATRON_SEGMENTO = /^[A-Za-z0-9_\-ñáéíóúÑÁÉÍÓÚ ]{1,60}$/;
const RESERVADOS = ['caption', 'alt'];
function leerCuerpo(event) { try { const c = JSON.parse(event.body || '{}'); return c && typeof c === 'object' ? c : null; } catch { return null; } }
function normalizarCarpeta(carpeta, definicion) { const limpia = String(carpeta || '').trim().replace(/^\/+|\/+$/g, ''); if (!limpia) return null; const segmentos = limpia.split('/'); if (segmentos.length > 3 || !segmentos.every(s => PATRON_SEGMENTO.test(s))) return null; if (definicion.soloCarpetasDefinidas === true && !(definicion.carpetas || []).some(c => c.value === segmentos[0])) return null; return limpia; }
function normalizarNombre(nombre) { const limpio = String(nombre || '').trim().replace(/[^A-Za-z0-9_\-ñáéíóúÑÁÉÍÓÚ ]/g, '_').slice(0, 100); return limpio || null; }
function etiquetaDe(proyecto, carpeta) { return `${proyecto.replace(/\//g, '_')}_${carpeta}`; }
function idPermitido(publicId, proyecto) { return typeof publicId === 'string' && publicId.startsWith(`${proyecto}/`) && !publicId.includes('..'); }
const valorLimpio = (v, max) => String(v ?? '').replace(/[|=\\\r\n]/g, ' ').trim().slice(0, max);
function construirContexto({ titulo, descripcion, metadatos }) { const partes = []; const t = valorLimpio(titulo, 300); const d = valorLimpio(descripcion, 1000); if (t) partes.push(`caption=${t}`); if (d) partes.push(`alt=${d}`); if (metadatos !== undefined && !Array.isArray(metadatos)) return { error: 'metadatos debe ser una lista' }; const lista = metadatos || []; if (lista.length > 20) return { error: 'Máximo 20 metadatos por imagen' }; for (const m of lista) { const nombre = String(m?.name ?? '').replace(/[|=\\]/g, '_').trim().slice(0, 40); const valor = valorLimpio(m?.value, 200); if (!nombre || !valor) continue; if (RESERVADOS.includes(nombre.toLowerCase())) return { error: `"${nombre}" es un nombre reservado` }; partes.push(`${nombre}=${valor}`); } return { texto: partes.join('|') }; }
function mapearRecurso(r) { const custom = r.context?.custom || {}; const { caption, alt, ...metadatos } = custom; const idx = r.public_id.lastIndexOf('/'); return { public_id: r.public_id, carpeta: idx >= 0 ? r.public_id.slice(0, idx) : '', url: r.secure_url, formato: r.format, bytes: r.bytes, ancho: r.width, alto: r.height, creado: r.created_at, tags: r.tags || [], titulo: caption || '', descripcion: alt || '', metadatos: Object.entries(metadatos).map(([name, value]) => ({ name, value: String(value) })) }; }
module.exports = { leerCuerpo, normalizarCarpeta, normalizarNombre, etiquetaDe, idPermitido, construirContexto, mapearRecurso };
```

## netlify/functions/utilidades/tokens.js

```javascript
const crypto = require('crypto');
const SEIS_MESES_MS = 6 * 30 * 24 * 60 * 60 * 1000;
const CINCO_ANIOS_MS = 5 * 365 * 24 * 60 * 60 * 1000;
const PERMISOS_VALIDOS = ['alta', 'listar', 'modificar', 'eliminar'];
function obtenerSecreto() { const secreto = process.env.TOKEN_SECRET; if (!secreto || secreto.length < 32) throw new Error('TOKEN_SECRET no está configurado o tiene menos de 32 caracteres'); return secreto; }
function firmar(cargaB64) { return crypto.createHmac('sha256', obtenerSecreto()).update(cargaB64).digest('base64url'); }
function resumen(texto) { return crypto.createHash('sha256').update(String(texto)).digest(); }
function iguales(a, b) { return crypto.timingSafeEqual(resumen(a), resumen(b)); }
function crearToken(carga) { const cargaB64 = Buffer.from(JSON.stringify(carga)).toString('base64url'); return `${cargaB64}.${firmar(cargaB64)}`; }
function verificarToken(token, tipoEsperado) { if (typeof token !== 'string') return null; const partes = token.split('.'); if (partes.length !== 2) return null; const [cargaB64, firma] = partes; if (!iguales(firma, firmar(cargaB64))) return null; let carga; try { carga = JSON.parse(Buffer.from(cargaB64, 'base64url').toString('utf8')); } catch { return null; } if (!carga || carga.t !== tipoEsperado || typeof carga.exp !== 'number' || Date.now() > carga.exp) return null; return carga; }
function nombreVariableClaveLarga(proyecto) { return `TOKEN_SECRET_${String(proyecto).replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_LARGO`; }
function claveLargaValida(proyecto, claveIngresada) { const esperada = process.env[nombreVariableClaveLarga(proyecto)]; return !!esperada && !!claveIngresada && iguales(claveIngresada, esperada); }
function validarEnlace(token, clave) { const carga = verificarToken(token, 'enlace'); if (!carga) return { ok: false, status: 401, error: 'Enlace inválido o vencido' }; if (carga.larga) { if (!clave) return { ok: false, status: 401, requiereClave: true }; if (!claveLargaValida(carga.proyecto, clave)) return { ok: false, status: 401, error: 'Contraseña incorrecta' }; } return { ok: true, carga }; }
function sesionAdmin(event) { const cabecera = (event.headers && (event.headers.authorization || event.headers.Authorization)) || ''; const m = cabecera.match(/^Bearer (.+)$/); return m ? verificarToken(m[1], 'admin') : null; }
async function cargarProyectos(event) { const base = process.env.DEPLOY_URL || process.env.URL || `https://${event.headers.host}`; const res = await fetch(`${base}/proyectos.json`); if (!res.ok) throw new Error('No se pudo leer proyectos.json'); const datos = await res.json(); return datos.proyectos || []; }
function responder(statusCode, cuerpo) { return { statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(cuerpo) }; }
module.exports = { SEIS_MESES_MS, CINCO_ANIOS_MS, PERMISOS_VALIDOS, crearToken, verificarToken, validarEnlace, nombreVariableClaveLarga, sesionAdmin, cargarProyectos, responder };
```

## netlify/functions/iniciar-sesion-admin.js

```javascript
const crypto = require('crypto');
const { crearToken, responder } = require('./utilidades/tokens');
const DURACION_SESION_MS = 2 * 60 * 60 * 1000;
const espera = ms => new Promise(r => setTimeout(r, ms));
function claveCorrecta(clave) {
	const guardado = process.env.ADMIN_PASSWORD_HASH || '';
	const [algoritmo, sal, hashHex] = guardado.split('$');
	if (algoritmo !== 'scrypt' || !sal || !hashHex) return false;
	const esperado = Buffer.from(hashHex, 'hex');
	const calculado = crypto.scryptSync(clave, sal, esperado.length);
	return crypto.timingSafeEqual(esperado, calculado);
}
exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		let cuerpo;
		try { cuerpo = JSON.parse(event.body || '{}'); } catch { return responder(400, { error: 'El cuerpo debe ser JSON válido' }); }
		const { clave } = cuerpo;
		if (typeof clave !== 'string' || !clave || clave.length > 200) return responder(400, { error: 'Falta la contraseña' });
		if (!claveCorrecta(clave)) { await espera(800); return responder(401, { error: 'Contraseña incorrecta' }); }
		const exp = Date.now() + DURACION_SESION_MS;
		return responder(200, { sesion: crearToken({ t: 'admin', exp }), exp });
	} catch (err) {
		console.error('iniciar-sesion-admin:', err.message);
		return responder(500, { error: 'Error interno al iniciar sesión' });
	}
};
```

## netlify/functions/generar-enlace.js

```javascript
const crypto = require('crypto');
const { SEIS_MESES_MS, CINCO_ANIOS_MS, PERMISOS_VALIDOS, crearToken, nombreVariableClaveLarga, sesionAdmin, cargarProyectos, responder } = require('./utilidades/tokens');
exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		if (!sesionAdmin(event)) return responder(401, { error: 'Sesión de administrador requerida' });
		const { proyecto, exp, permisos } = JSON.parse(event.body || '{}');
		const ahora = Date.now();
		if (typeof exp !== 'number' || exp < ahora + 60000 || exp > ahora + CINCO_ANIOS_MS) return responder(400, { error: 'Vencimiento inválido (mínimo 1 minuto, máximo 5 años)' });
		const proyectos = await cargarProyectos(event);
		const definicion = proyectos.find(p => p.id === proyecto);
		if (!definicion) return responder(400, { error: 'Proyecto inexistente en proyectos.json' });
		const solicitados = Array.isArray(permisos) ? permisos : (definicion.permisosCliente || ['alta']);
		const permisosFinales = [...new Set(solicitados)];
		if (!permisosFinales.length || permisosFinales.some(p => !PERMISOS_VALIDOS.includes(p))) return responder(400, { error: `Permisos inválidos. Válidos: ${PERMISOS_VALIDOS.join(', ')}` });
		const larga = exp - ahora > SEIS_MESES_MS;
		if (larga && !process.env[nombreVariableClaveLarga(proyecto)]) return responder(400, { error: `Falta configurar la variable ${nombreVariableClaveLarga(proyecto)} en Netlify` });
		const token = crearToken({ t: 'enlace', id: crypto.randomUUID(), proyecto, permisos: permisosFinales, larga, exp });
		return responder(200, { token, exp, larga, permisos: permisosFinales });
	} catch (err) { return responder(500, { error: 'Error interno al generar el enlace' }); }
};
```

## netlify/functions/listar-imagenes.js

```javascript
const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { llamarApiAdmin } = require('./utilidades/cloudinary');
const { leerCuerpo, normalizarCarpeta, mapearRecurso } = require('./utilidades/imagenes');
exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		const cuerpo = leerCuerpo(event);
		if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });
		const aut = await autorizar(event, cuerpo, cuerpo.sugerencias ? 'alta' : 'listar');
		if (aut.error) return aut.error;
		let prefijo = `${aut.proyecto}/`;
		if (cuerpo.carpeta) { const carpeta = normalizarCarpeta(cuerpo.carpeta, aut.definicion); if (!carpeta) return responder(400, { error: 'Carpeta inválida para este proyecto' }); prefijo = `${aut.proyecto}/${carpeta}/`; }
		const consulta = cursor => { const p = new URLSearchParams({ type: 'upload', prefix: prefijo, max_results: cuerpo.sugerencias ? '500' : '100', context: 'true', tags: 'true', metadata: 'true' }); if (cursor) p.set('next_cursor', cursor); return p; };
		if (cuerpo.sugerencias) { const campos = {}; let cursor = ''; do { const datos = await llamarApiAdmin('GET', '/resources/image/upload', consulta(cursor)); (datos.resources || []).forEach(r => Object.entries(r.context?.custom || {}).forEach(([nombre, valor]) => { if (!['alt', 'caption'].includes(nombre.toLowerCase()) && valor !== '') (campos[nombre] = campos[nombre] || new Set()).add(String(valor)); })); cursor = datos.next_cursor || ''; } while (cursor); const lista = Object.entries(campos).map(([name, valores]) => ({ name, values: [...valores].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })) })).sort((a, b) => a.name.localeCompare(b.name, 'es')); return responder(200, { fields: lista }); }
		const datos = await llamarApiAdmin('GET', '/resources/image/upload', consulta(cuerpo.cursor));
		return responder(200, { imagenes: (datos.resources || []).map(mapearRecurso), siguiente: datos.next_cursor || null });
	} catch (err) { console.error('listar-imagenes:', err.message); return responder(500, { error: 'Error interno al listar imágenes' }); }
};
```

## netlify/functions/modificar-imagen.js

```javascript
const { responder } = require('./utilidades/tokens');
const { autorizar } = require('./utilidades/autorizacion');
const { llamarApiFirmada } = require('./utilidades/cloudinary');
const { leerCuerpo, normalizarCarpeta, normalizarNombre, etiquetaDe, idPermitido, construirContexto } = require('./utilidades/imagenes');
exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		const cuerpo = leerCuerpo(event); if (!cuerpo) return responder(400, { error: 'El cuerpo debe ser JSON válido' });
		const aut = await autorizar(event, cuerpo, 'modificar'); if (aut.error) return aut.error;
		const idActual = cuerpo.public_id; if (!idPermitido(idActual, aut.proyecto)) return responder(403, { error: 'La imagen no pertenece a este proyecto' });
		const resto = idActual.slice(aut.proyecto.length + 1); const corte = resto.lastIndexOf('/'); const carpetaActual = corte >= 0 ? resto.slice(0, corte) : ''; const nombreActual = corte >= 0 ? resto.slice(corte + 1) : resto;
		const carpetaNueva = cuerpo.carpeta !== undefined ? normalizarCarpeta(cuerpo.carpeta, aut.definicion) : carpetaActual; if (!carpetaNueva) return responder(400, { error: 'Carpeta destino inválida para este proyecto' });
		const nombreNuevo = cuerpo.nombre !== undefined ? normalizarNombre(cuerpo.nombre) : nombreActual; if (!nombreNuevo) return responder(400, { error: 'Nombre inválido' });
		const actualizarContexto = ['titulo', 'descripcion', 'metadatos'].some(k => cuerpo[k] !== undefined); const ctx = actualizarContexto ? construirContexto(cuerpo) : null; if (ctx && ctx.error) return responder(400, { error: ctx.error });
		let idFinal = idActual; const idDestino = `${aut.proyecto}/${carpetaNueva}/${nombreNuevo}`;
		if (idDestino !== idActual) { await llamarApiFirmada('image/rename', { from_public_id: idActual, to_public_id: idDestino, overwrite: 'false', type: 'upload' }); idFinal = idDestino; if (carpetaNueva !== carpetaActual) { if (carpetaActual) await llamarApiFirmada('image/tags', { command: 'remove', tag: etiquetaDe(aut.proyecto, carpetaActual), public_ids: idFinal, type: 'upload' }); await llamarApiFirmada('image/tags', { command: 'add', tag: etiquetaDe(aut.proyecto, carpetaNueva), public_ids: idFinal, type: 'upload' }); } }
		if (ctx) { await llamarApiFirmada('image/context', { command: 'remove_all', public_ids: idFinal, type: 'upload' }); if (ctx.texto) await llamarApiFirmada('image/context', { command: 'add', public_ids: idFinal, context: ctx.texto, type: 'upload' }); }
		return responder(200, { ok: true, public_id: idFinal });
	} catch (err) { console.error('modificar-imagen:', err.message); return responder(500, { error: 'Error interno al modificar la imagen' }); }
};
```

## netlify/functions/eliminar-imagen.js

```javascript
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

		const consulta = new URLSearchParams({ invalidate: 'true' });
		ids.forEach(id => consulta.append('public_ids[]', id));
		const datos = await llamarApiAdmin('DELETE', '/resources/image/upload', consulta);

		return responder(200, { ok: true, resultado: datos.deleted || {} });
	} catch (err) {
		console.error('eliminar-imagen:', err.message);
		return responder(500, { error: 'Error interno al eliminar' });
	}
};
```

## netlify/functions/firmar-subida.js

```javascript
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
		const parametros = { folder: `${aut.proyecto}/${carpeta}`, public_id: nombre, tags: etiquetaDe(aut.proyecto, carpeta), overwrite: 'false', timestamp: Math.floor(Date.now() / 1000) };
		if (ctx.texto) parametros.context = ctx.texto;
		return responder(200, { cloudName, apiKey, parametros, firma: firmar(parametros, apiSecret) });
	} catch (err) {
		console.error('firmar-subida:', err.message);
		return responder(500, { error: 'Error interno al firmar la subida' });
	}
};
```

## netlify/functions/generar-hash-clave.js

```javascript
const crypto = require('crypto');
const { sesionAdmin, responder } = require('./utilidades/tokens');

// Solo admin. Convierte una contraseña nueva en el valor para ADMIN_PASSWORD_HASH.
exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		if (!sesionAdmin(event)) return responder(401, { error: 'Sesión de administrador requerida' });
		let cuerpo;
		try { cuerpo = JSON.parse(event.body || '{}'); } catch { return responder(400, { error: 'El cuerpo debe ser JSON válido' }); }
		const { clave } = cuerpo;
		if (typeof clave !== 'string' || clave.length < 12 || clave.length > 200) return responder(400, { error: 'La contraseña debe tener entre 12 y 200 caracteres' });
		const sal = crypto.randomBytes(16).toString('hex');
		const hash = crypto.scryptSync(clave, sal, 64).toString('hex');
		return responder(200, { valor: `scrypt$${sal}$${hash}` });
	} catch (err) {
		console.error('generar-hash-clave:', err.message);
		return responder(500, { error: 'Error interno al generar el valor' });
	}
};
```

## netlify/functions/verificar-enlace.js

```javascript
const { validarEnlace, responder } = require('./utilidades/tokens');

exports.handler = async (event) => {
	if (event.httpMethod !== 'POST') return responder(405, { error: 'Método no permitido' });
	try {
		const { token, clave } = JSON.parse(event.body || '{}');
		const r = validarEnlace(token, clave);
		if (!r.ok) return responder(r.status, r.requiereClave ? { valida: false, requiereClave: true } : { valida: false, error: r.error });
		const { proyecto, permisos, exp } = r.carga;
		return responder(200, { valida: true, proyecto, permisos, exp });
	} catch (err) {
		return responder(500, { valida: false, error: 'Error al verificar el enlace' });
	}
};
```

## herramientas/generar-hash-admin.js

```javascript
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
```

## proyectos.json

```json
{
	"proyectos": [
		{
			"id": "monarca",
			"nombre": "Residencial Monarca",
			"permisosCliente": [
				"alta",
				"listar", 
				"modificar", 
				"eliminar"
        
			],
			"soloCarpetasDefinidas": true,
			"carpetas": [
				{
					"value": "galeria",
					"label": "Galería"
				},
				{
					"value": "instalaciones",
					"label": "Instalaciones"
				}
			]
		},
		{
			"id": "enBlanco/residencial",
			"nombre": "Marca Blanca - Residencial",
			"permisosCliente": [
				"alta"
			],
			"carpetas": [
				{
					"value": "galeria",
					"label": "Galería"
				},
				{
					"value": "instalaciones",
					"label": "Instalaciones"
				},
				{
					"value": "personal",
					"label": "Personal"
				}
			]
		},
		{
			"id": "patriciaBertoche",
			"nombre": "patriciaBertoche",
			"permisosCliente": [
				"alta"
			],
			"carpetas": [
				{
					"value": "galeria",
					"label": "Galería"
				},
				{
					"value": "instalaciones",
					"label": "Instalaciones"
				},
				{
					"value": "imagenes",
					"label": "Imagenes"
				},
				{
					"value": "personal",
					"label": "Personal"
				}
			]
		},
		{
			"id": "pruebas",
			"nombre": "Pruebas (borrar luego)",
			"permisosCliente": [
				"alta"
			],
			"carpetas": [
				{
					"value": "ensayos",
					"label": "Ensayos"
				}
			]
		}
	]
}
```

## galeria.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Mis imágenes | Upload Hub</title>
	<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="css/styles.css">
</head>
<body class="min-h-screen p-4 md:p-8">

	<p id="estadoCarga" class="text-center text-slate-500 mt-24">Validando acceso…</p>

	<div id="estadoError" class="hidden max-w-md mx-auto mt-24 bg-white p-6 rounded-xl shadow text-center">
		<p class="text-3xl mb-2">⛔</p>
		<p id="mensajeError" class="text-slate-700">Enlace inválido o vencido.</p>
	</div>

	<div id="app" class="hidden max-w-6xl mx-auto p-4">
		<header class="flex flex-wrap items-center gap-3 mb-4">
			<div class="mr-auto">
				<h1 class="text-xl font-bold">🖼️ <span id="nombreProyecto"></span></h1>
				<p class="text-xs text-slate-500">Enlace activo hasta <span id="fechaVence"></span></p>
			</div>
			<a id="enlaceSubir" href="#" class="hidden rounded px-3 py-2 bg-emerald-600 text-white text-sm">⬆ Subir imágenes</a>
		</header>

		<p id="avisoSinPermiso" class="hidden bg-amber-50 text-amber-800 rounded-lg p-3 text-sm mb-4">Este enlace no permite ver las imágenes.</p>

		<section id="barraControles" class="bg-white rounded-xl shadow p-4 mb-4 flex flex-wrap gap-3 items-end">
			<label class="text-sm">Carpeta<br>
				<select id="selCarpeta" class="border rounded px-3 py-2 w-auto min-w-40"></select>
			</label>
			<button id="btnRecargar" type="button" class="border rounded px-3 py-2 bg-white">↻ Recargar</button>
			<button id="btnBorrarSel" type="button" class="hidden rounded px-3 py-2 bg-red-600 text-white">🗑 Eliminar seleccionadas (<span id="contSel">0</span>)</button>
		</section>

		<p id="estado" class="text-sm text-slate-500 mb-3"></p>
		<section id="grilla" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></section>
		<div class="text-center mt-5"><button id="btnMas" type="button" class="hidden border rounded px-4 py-2 bg-white">Cargar más</button></div>
	</div>

	<!-- Edición -->
	<div id="modal" class="hidden fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
		<form id="formEditar" class="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-3">
			<h2 class="text-lg font-bold">Editar imagen</h2>
			<img id="editVista" alt="" class="w-full h-44 object-contain bg-slate-100 rounded">
			<div class="grid grid-cols-2 gap-3">
				<label class="text-sm">Nombre (sin extensión)
					<input id="editNombre" class="border rounded px-3 py-2 w-full" required maxlength="100">
				</label>
				<label class="text-sm">Carpeta
					<input id="editCarpeta" list="listaCarpetas" class="border rounded px-3 py-2 w-full" required>
					<datalist id="listaCarpetas"></datalist>
				</label>
			</div>
			<label class="text-sm block">Título
				<input id="editTitulo" class="border rounded px-3 py-2 w-full" maxlength="300">
			</label>
			<label class="text-sm block">Descripción
				<textarea id="editDescripcion" rows="2" class="border rounded px-3 py-2 w-full" maxlength="1000"></textarea>
			</label>
			<div>
				<p class="text-sm font-semibold mb-1">Metadatos</p>
				<div id="editMetadatos" class="space-y-2"></div>
				<button id="btnAgregarMeta" type="button" class="text-sm mt-2 underline">＋ Agregar metadato</button>
			</div>
			<p id="errorEditar" class="text-sm text-red-600"></p>
			<div class="flex justify-end gap-2 pt-2">
				<button id="btnCancelar" type="button" class="border rounded px-4 py-2">Cancelar</button>
				<button id="btnGuardar" type="submit" class="rounded px-4 py-2 bg-slate-900 text-white">Guardar</button>
			</div>
		</form>
	</div>

	<script src="js/acceso.js"></script>
	<script src="js/galeria.js"></script>
</body>
</html>
```

## seguridad.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Claves y seguridad | Upload Hub</title>
	<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="css/styles.css">
</head>
<body class="min-h-screen p-4 md:p-8">
	<div id="app" class="hidden max-w-2xl mx-auto space-y-4">
		<header class="flex flex-wrap items-center gap-3">
			<h1 class="text-xl font-bold mr-auto">🔑 Claves y seguridad</h1>
			<a href="index.html" class="text-sm underline">Generador de enlaces</a>
			<a href="admin.html" class="text-sm underline">Administrar imágenes</a>
		</header>
		<p class="text-sm bg-blue-50 text-blue-900 rounded-lg p-3">Esta página <b>genera</b> los valores, pero no cambia nada sola: copiá cada valor en Netlify → Site configuration → Environment variables y después volvé a desplegar (Deploys → Trigger deploy). Nada de lo que se genera acá se guarda.</p>
		<section class="bg-white rounded-xl shadow p-5 space-y-3">
			<h2 class="font-bold">Contraseña de administrador</h2>
			<p class="text-sm text-slate-500">Variable: <code>ADMIN_PASSWORD_HASH</code>. Escribí la contraseña nueva (mínimo 12 caracteres) y se genera el valor cifrado para pegar en Netlify. Hasta que lo cambies y redespliegues, sigue valiendo la contraseña actual.</p>
			<input type="password" id="claveNueva" placeholder="Contraseña nueva" autocomplete="new-password" class="border rounded px-3 py-2 w-full">
			<input type="password" id="claveRepetida" placeholder="Repetí la contraseña nueva" autocomplete="new-password" class="border rounded px-3 py-2 w-full">
			<p id="errorHash" class="text-sm text-red-600"></p>
			<button type="button" id="btnHash" class="btn-primary">Generar valor</button>
			<div id="resultadoHash" class="hidden space-y-2"><textarea id="valorHash" rows="3" readonly class="border rounded px-3 py-2 w-full font-mono text-xs"></textarea><button type="button" id="btnCopiarHash" class="btn-secondary py-2">📋 Copiar</button></div>
		</section>
		<section class="bg-white rounded-xl shadow p-5 space-y-3">
			<h2 class="font-bold">Clave de firma de enlaces y sesiones</h2>
			<p class="text-sm text-slate-500">Variable: <code>TOKEN_SECRET</code>. Genera una clave aleatoria de 64 caracteres. <b>Al cambiarla se invalidan todos los enlaces ya entregados y tu sesión actual.</b></p>
			<button type="button" id="btnSecreto" class="btn-primary">Generar clave aleatoria</button>
			<div id="resultadoSecreto" class="hidden space-y-2"><textarea id="valorSecreto" rows="2" readonly class="border rounded px-3 py-2 w-full font-mono text-xs"></textarea><button type="button" id="btnCopiarSecreto" class="btn-secondary py-2">📋 Copiar</button></div>
		</section>
		<section class="bg-white rounded-xl shadow p-5 space-y-3">
			<h2 class="font-bold">Contraseña de enlaces largos de un proyecto</h2>
			<p class="text-sm text-slate-500">Es la contraseña que tendrá que escribir quien abra un enlace de más de 6 meses. <b>Al cambiarla dejan de funcionar los enlaces largos de ese proyecto.</b> Se la pasás al cliente por otro medio.</p>
			<label class="text-sm block">Proyecto<select id="selProyecto" class="border rounded px-3 py-2 w-full"></select></label>
			<label class="text-sm block">Nombre de la variable en Netlify<div class="flex gap-2"><input type="text" id="nombreVariable" readonly class="border rounded px-3 py-2 w-full font-mono text-xs"><button type="button" id="btnCopiarNombre" class="btn-secondary py-2">📋</button></div></label>
			<label class="text-sm block">Contraseña (escribila vos o generá una)<div class="flex gap-2"><input type="text" id="claveLarga" autocomplete="off" class="border rounded px-3 py-2 w-full font-mono text-sm"><button type="button" id="btnAleatoria" class="btn-secondary py-2 whitespace-nowrap">🎲 Generar</button><button type="button" id="btnCopiarClaveLarga" class="btn-secondary py-2">📋</button></div></label>
		</section>
	</div>
	<script src="js/acceso.js"></script>
	<script src="js/seguridad.js"></script>
</body>
</html>
```

## subir-cliente.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Cargar imágenes | Gestor</title>
	<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="css/styles.css">
</head>
<body class="cliente-page min-h-screen p-4 md:p-8">
	<div class="max-w-5xl mx-auto">
		<div id="loadingState" class="text-center py-24"><div class="spinner"></div><p class="text-base font-medium animate-pulse" style="color: var(--text-muted);">Validando acceso seguro...</p></div>
		<div id="errorState" class="card max-w-md mx-auto text-center hidden mt-12 p-8 shadow-xl" style="border-top: 4px solid #EF4444;"><div class="icono-estado">🔒</div><h1 class="text-2xl font-bold mb-3" style="color: #EF4444;">Enlace no válido o caducado</h1><p id="errorMessage" style="color: var(--text-muted); font-size: 0.95rem;">Por seguridad, solicita un enlace nuevo al administrador.</p></div>
		<div id="mainInterface" class="hidden">
			<header class="cliente-header mb-6 card p-5 md:p-6 shadow-sm">
				<div class="cliente-info"><span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 inline-block mb-2">Portal seguro</span><h1 class="text-2xl md:text-3xl font-bold tracking-tight" style="color: var(--text-main);">Carga tus imágenes</h1><p class="text-sm mt-1" style="color: var(--text-muted);">Proyecto: <strong id="displayProjectName" class="capitalize" style="color: var(--text-main);"></strong></p><p class="text-xs mt-1 font-medium" style="color: #D97706;">Válido hasta: <span id="displayExpDate"></span></p><div class="mt-5 max-w-xs"><label for="globalCategory" class="paso-label text-xs font-semibold block mb-1" style="color: var(--text-muted);"><span class="numero-paso">1</span> Carpeta destino</label><select id="globalCategory" class="border rounded px-2.5 py-2 text-xs focus-ring w-full bg-slate-50 font-medium"></select></div></div>
				<div class="cliente-upload-panel"><h2 class="paso-titulo"><span class="numero-paso">2</span> Elige tus imágenes</h2><label for="fileInput" class="cliente-file-picker border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group hover:border-blue-600 hover:bg-blue-50/20 text-center" style="border-color: var(--border-color);"><div class="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><span class="text-2xl">▧</span></div><span class="text-sm md:text-base font-semibold" style="color: var(--text-main);">Toca aquí para elegir tus imágenes</span><span class="text-xs mt-1" style="color: var(--text-muted);">Puedes elegir varias a la vez</span><input type="file" id="fileInput" multiple accept="image/*" class="hidden"></label><div id="batchActions" class="hidden mt-3 flex justify-between items-center gap-3 p-0"><div class="flex items-center gap-2"><span class="numero-paso">4</span><span id="counterText" class="text-sm font-bold" style="color: var(--text-main);">0 imágenes cargadas</span></div><button id="uploadAllBtn" class="btn-primary flex-1 sm:flex-none py-2.5 px-5 text-xs md:text-sm">Subir todas</button></div></div>
			</header>
			<h2 id="cardsStepTitle" class="paso-titulo hidden"><span class="numero-paso">3</span> Revisa tus imágenes</h2>
			<div id="cardsContainer" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div>
		</div>
	</div>
	<script src="js/acceso.js"></script>
	<script src="js/subir.js"></script>
</body>
</html>
```

	## index.html

	```html
	<!DOCTYPE html>
	<html lang="es">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Dashboard | Upload Hub</title>
		<link rel="stylesheet" href="css/styles.css">
		<style>
			body { padding-block: clamp(12px, 3vh, 28px); }
			.dashboard-container { max-width: 980px; }
			.dashboard-container > header.cabecera { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; text-align: left; margin-bottom: 16px; }
			.cabecera .hero-icono { margin: 0; width: 46px; height: 46px; font-size: 22px; border-radius: 14px; flex: none; }
			.dashboard-container > header.cabecera h1 { font-size: 1.35rem; margin: 0 0 2px; }
			.dashboard-container > header.cabecera p { font-size: .85rem; margin: 0; }
			#navAdmin { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
			.nav-boton { display: inline-flex; align-items: center; padding: 9px 14px; border-radius: 12px; border: none; background: #EEF2FF; color: #4338CA; font-size: .85rem; font-weight: 600; text-decoration: none; cursor: pointer; }
			.nav-boton:hover { background: #E0E7FF; }
			.rejilla { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 18px; align-items: stretch; }
			.rejilla > .card { margin-bottom: 0; }
			@media (max-width: 820px) { .rejilla { grid-template-columns: 1fr; } }
			.form-card { padding: 22px 24px; }
			.form-card .form-group { margin-bottom: 14px; }
			.form-card .form-group label { margin-bottom: 7px; font-size: .88rem; }
			.form-card select, .form-card input[type="datetime-local"] { padding: 9px 12px; font-size: .9rem; }
			.form-card .btn-primary { padding: 12px 16px; margin-top: 4px; }
			.fila-dos { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
			@media (max-width: 520px) { .fila-dos { grid-template-columns: 1fr; } }
			.form-card .ayuda { margin-top: 6px; }
			.grupo-permisos { display: flex; flex-wrap: wrap; gap: 8px 22px; }
			.form-group .grupo-permisos label { margin: 0; font-size: .92rem; font-weight: 500; cursor: pointer; }
			.grupo-permisos input[type="checkbox"] { width: 17px; height: 17px; margin: 0; cursor: pointer; }
			.tarjeta-enlace { display: flex; flex-direction: column; justify-content: center; transition: opacity .16s ease, transform .16s ease; }
			.tarjeta-enlace.saliendo { opacity: 0; transform: translateY(8px) scale(.99); }
			.tarjeta-enlace.nuevo { animation: destello .9s ease; }
			@keyframes destello { 0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, .55); } 60% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); } 100% { box-shadow: var(--sombra); } }
			@media (prefers-reduced-motion: reduce) { .tarjeta-enlace { transition: none; } .tarjeta-enlace.nuevo { animation: none; } }
			.resultado-vacio { text-align: center; color: var(--text-muted); }
			.resultado-vacio p { margin: 0 0 4px; }
			.resumen { font-size: .85rem; margin: 0 0 12px; }
			.tarjeta-enlace textarea { width: 100%; resize: none; background: #F8FAFC; font-size: .8rem; line-height: 1.35; font-family: ui-monospace, Menlo, Consolas, monospace; word-break: break-all; }
			.fila-copiar { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
			.fila-copiar .btn-secondary { padding: 10px 18px; white-space: nowrap; }
			.fila-copiar .status-msg { margin: 0; min-height: 0; text-align: left; }
		</style>
	</head>
	<body>
		<main class="dashboard-container">
			<header class="cabecera">
				<div class="hero-icono">🔗</div>
				<div><h1>Generador de Enlaces</h1><p>Crea links de subida temporales para tus clientes.</p></div>
				<nav id="navAdmin" class="hidden"><a href="admin.html" class="nav-boton">🖼️ Imágenes</a><a href="seguridad.html" class="nav-boton">🔑 Claves</a><button type="button" id="logoutBtn" class="nav-boton">Salir</button></nav>
			</header>
			<div id="panelGenerador" class="hidden rejilla">
				<section class="card form-card"><form id="linkGeneratorForm">
					<div class="fila-dos"><div class="form-group"><label for="projectSelect"><span class="numero-paso">1</span> ¿Para qué proyecto?</label><select id="projectSelect" name="projectSelect" required><option value="">Cargando proyectos...</option></select></div><div class="form-group"><label for="modeSelect"><span class="numero-paso">2</span> ¿Qué pantalla verá?</label><select id="modeSelect" name="modeSelect" required><option value="admin">Carga completa</option><option value="cliente">Carga simplificada</option><option value="galeria">Galería de imágenes</option></select></div></div>
					<div class="form-group"><label title="Los permisos los valida el servidor. Por proyecto se preseleccionan los de proyectos.json."><span class="numero-paso">3</span> ¿Qué podrá hacer?</label><div id="permisosGrupo" class="grupo-permisos"><label><input type="checkbox" name="permisos" value="alta"> Subir</label><label><input type="checkbox" name="permisos" value="listar"> Ver</label><label><input type="checkbox" name="permisos" value="modificar"> Modificar</label><label><input type="checkbox" name="permisos" value="eliminar"> Eliminar</label></div></div>
					<div class="form-group"><label for="expirationDate"><span class="numero-paso">4</span> ¿Hasta cuándo estará activo?</label><input type="datetime-local" id="expirationDate" name="expirationDate" required><p class="ayuda">Por defecto 24 horas. Más de 6 meses: el enlace pide contraseña.</p></div>
					<button type="submit" class="btn-primary">✨ Generar enlace</button>
				</form></section>
				<section id="resultContainer" class="card tarjeta-enlace"><div id="resultadoVacio" class="resultado-vacio"><div class="icono-estado">🔗</div><p><strong>Tu enlace aparecerá acá</strong></p><p class="ayuda">Completá el formulario y tocá «Generar enlace».</p></div><div id="resultadoListo" class="hidden"><h2>✅ ¡Enlace listo!</h2><p id="resumenEnlace" class="resumen"></p><textarea id="generatedLink" rows="5" readonly></textarea><div class="fila-copiar"><button type="button" id="copyBtn" class="btn-secondary">📋 Copiar enlace</button><span id="copyStatus" class="status-msg"></span></div><p id="avisoLargo" class="ayuda hidden"></p></div></section>
			</div>
		</main>
		<script src="js/acceso.js"></script>
		<script src="js/dashboard.js"></script>
	</body>
	</html>
	```

	## subir.html

	```html
	<!DOCTYPE html>
	<html lang="es">
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Subir Archivos | Gestor de Imágenes</title>
		<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
		<link rel="stylesheet" href="css/styles.css">
	</head>
	<body class="min-h-screen p-4 md:p-8">
		<div class="max-w-7xl mx-auto">
			<div id="loadingState" class="text-center py-24"><div class="spinner"></div><p class="text-base font-medium animate-pulse" style="color: var(--text-muted);">Validando acceso seguro...</p></div>
			<div id="errorState" class="card max-w-md mx-auto text-center hidden mt-12 p-8 shadow-xl" style="border-top: 4px solid #EF4444;"><div class="icono-estado">🔒</div><h1 class="text-2xl font-bold mb-3" style="color: #EF4444;">Enlace no válido o caducado</h1><p id="errorMessage" style="color: var(--text-muted); font-size: 0.95rem;">Por seguridad, los enlaces de subida tienen una fecha límite estricta. Solicita uno nuevo al administrador.</p></div>
			<div id="mainInterface" class="hidden"><header class="mb-6 card p-5 md:p-6 shadow-sm"><div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"><div><span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 inline-block mb-2">🔒 Portal seguro</span><h1 class="text-2xl md:text-3xl font-bold tracking-tight" style="color: var(--text-main);">Sube tus imágenes</h1><p class="text-sm mt-1" style="color: var(--text-muted);">Proyecto: <strong id="displayProjectName" class="capitalize" style="color: var(--text-main);"></strong></p><p class="text-xs mt-1 font-medium" style="color: #D97706;">Válido hasta: <span id="displayExpDate"></span></p></div><div class="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-end gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100"><div><label for="globalCategory" class="text-xs font-semibold block mb-1" style="color: var(--text-muted);">Carpeta destino</label><select id="globalCategory" class="border rounded px-2.5 py-2 text-xs focus-ring w-full bg-slate-50 font-medium"></select></div><div><label for="globalMaxWidth" class="text-xs font-semibold block mb-1" style="color: var(--text-muted);">Ancho Máx.</label><select id="globalMaxWidth" class="border rounded px-2.5 py-2 text-xs focus-ring w-full bg-slate-50 font-medium"><option value="800">800 px (Liviana)</option><option value="1200" selected>1200 px (Estándar)</option><option value="1600">1600 px (Intermedia)</option><option value="1920">1920 px (Alta / HD)</option><option value="0">Original</option></select></div><div><label for="globalQuality" class="text-xs font-semibold block mb-1" style="color: var(--text-muted);">Compresión (<span id="globalQualityVal">80</span>%)</label><input type="range" id="globalQuality" min="0.1" max="1.0" step="0.05" value="0.8" class="w-full accent-blue-600 cursor-pointer h-8"></div><div class="col-span-2 sm:col-span-1"><label for="globalTitle" class="text-xs font-semibold block mb-1" style="color: var(--text-muted);">Título global</label><input type="text" id="globalTitle" placeholder="Ej.: Actividad 2026" class="border rounded px-2.5 py-2 text-xs focus-ring w-full bg-slate-50"></div><div class="flex items-center gap-2 col-span-2 sm:col-span-3 lg:col-span-auto pt-2 lg:pt-0"><input type="checkbox" id="globalKeepOriginal" checked class="w-4 h-4 cursor-pointer accent-blue-600"><label for="globalKeepOriginal" class="text-xs cursor-pointer font-medium" style="color: var(--text-main);">Respetar nombre original</label></div></div></div></header><div class="mb-8"><h2 class="paso-titulo"><span class="numero-paso">1</span> Elige tus imágenes</h2><label for="fileInput" class="card border-2 border-dashed p-6 md:p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 group hover:border-blue-600 hover:bg-blue-50/20 text-center" style="border-color: var(--border-color);"><div class="w-14 h-14 mb-3 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform"><span class="text-2xl">▧</span></div><span class="text-sm md:text-base font-semibold" style="color: var(--text-main);">Toca aquí para elegir tus imágenes</span><span class="text-xs mt-1" style="color: var(--text-muted);">Puedes elegir varias a la vez · PNG, JPG o WEBP</span><input type="file" id="fileInput" multiple accept="image/*" class="hidden"></label></div><div id="batchActions" class="card hidden mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 shadow-md bg-white border-l-4 border-l-blue-600"><span id="counterText" class="text-sm font-bold" style="color: var(--text-main);">0 imágenes cargadas</span><div class="flex flex-wrap gap-2.5 w-full sm:w-auto justify-end"><button id="uploadAllBtn" class="btn-primary flex-1 sm:flex-none py-2.5 px-5 text-xs md:text-sm">🚀 Subir todas a Cloudinary</button><button id="downloadAllBtn" class="btn-secondary flex-1 sm:flex-none py-2.5 px-4 text-xs md:text-sm">📥 Descargar .WebP</button></div></div><div id="cardsContainer" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"></div></div>
		</div>
		<script src="js/acceso.js"></script>
		<script src="js/subir.js"></script>
	</body>
	</html>
	```